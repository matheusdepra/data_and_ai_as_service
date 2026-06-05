from __future__ import annotations

import json
import uuid
from urllib.parse import urlparse

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import bigquery
from google.cloud import firestore
from google.cloud import run_v2
from google.cloud import storage

from . import auth, naming
from .identity_client import resolve_me
from .metadata import IngestionRecord, MetadataStore
from .overview_semantic import merge_semantic, normalize_patch
from .read_model import FirestoreReadModel
from .settings import load_settings


settings = load_settings()

app = FastAPI(title="Dativerso Ingestion API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key", "If-Match"],
)

gcs = storage.Client()
bq = bigquery.Client()
fs = firestore.Client()
jobs = run_v2.JobsClient()
meta = MetadataStore(bq_client=bq, dataset_id=settings.bq_meta_dataset)
read_model = FirestoreReadModel(client=fs)


@app.get("/healthz")
def healthz():
    return {"ok": True}


def _resolve_tenant_id(request: Request) -> str:
    return _resolve_actor(request)["tenant_id"]


def _resolve_actor(request: Request) -> dict[str, str]:
    if settings.identity_api_base_url:
        try:
            me = resolve_me(settings, request)
        except HTTPException as exc:
            _log_event(
                stage="authz",
                status="identity_resolution_failed",
                identity_api_base_url=settings.identity_api_base_url,
                detail=str(exc.detail),
                status_code=exc.status_code,
                request_id=request.headers.get("x-cloud-trace-context") or request.headers.get("x-request-id") or "",
            )
            raise
        tenant_id_raw = str(me.get("tenant_id") or "")
        if not tenant_id_raw.strip():
            _log_event(
                stage="authz",
                status="identity_resolution_failed",
                identity_api_base_url=settings.identity_api_base_url,
                detail="tenant not resolved",
                status_code=403,
                request_id=request.headers.get("x-cloud-trace-context") or request.headers.get("x-request-id") or "",
            )
            raise HTTPException(status_code=403, detail="tenant not resolved")
        return {
            "tenant_id": naming.normalize_tenant_id(tenant_id_raw),
            "sub": str(me.get("sub") or ""),
            "email": str(me.get("email") or ""),
            "role": str(me.get("role") or ""),
            "type": "user",
        }
    else:
        gateway_claims = auth.get_gateway_claims(request)
        if gateway_claims is not None:
            claims = gateway_claims
        else:
            token = auth.get_bearer_token(request)
            claims = auth.get_claims(settings, token)
        try:
            tenant_id_raw = auth.get_tenant_id(settings, claims)
        except HTTPException as exc:
            _log_event(
                stage="authz",
                status="tenant_claim_resolution_failed",
                auth_mode=settings.auth_mode,
                auth_tenant_claim=settings.auth_tenant_claim,
                detail=str(exc.detail),
                status_code=exc.status_code,
                request_id=request.headers.get("x-cloud-trace-context") or request.headers.get("x-request-id") or "",
            )
            raise
        return {
            "tenant_id": naming.normalize_tenant_id(tenant_id_raw),
            "sub": str(claims.get("sub") or ""),
            "email": str(claims.get("email") or ""),
            "role": str(claims.get("role") or claims.get("user_role") or ""),
            "type": "user",
        }


def _require_overview_semantic_editor(request: Request) -> dict[str, str]:
    actor = _resolve_actor(request)
    if actor["role"] not in {"admin", "editor"}:
        raise HTTPException(status_code=403, detail="overview semantic edit requires admin or editor role")
    return actor


def _log_event(**payload: object) -> None:
    print(json.dumps(payload))


def _resolve_overview_bq_table(*, detail: dict[str, object] | None, fs_detail: dict[str, object] | None) -> str | None:
    if detail is not None:
        for artifact in reversed(detail.get("artifacts", [])):  # type: ignore[arg-type]
            if artifact.get("layer") == "silver" and artifact.get("bq_table"):  # type: ignore[union-attr]
                return str(artifact["bq_table"])  # type: ignore[index]
    if fs_detail:
        technical_summary = fs_detail.get("technical_summary") or {}
        if isinstance(technical_summary, dict) and technical_summary.get("bq_table"):
            return str(technical_summary["bq_table"])
        artifacts_summary = fs_detail.get("artifacts_summary") or {}
        if isinstance(artifacts_summary, dict) and artifacts_summary.get("silver"):
            return str(artifacts_summary["silver"])
    return None


def _merge_ingestion_projection(ingestion: dict[str, object], fs_detail: dict[str, object]) -> dict[str, object]:
    merged = dict(ingestion)
    for key in (
        "stage",
        "collection_slug",
        "file",
        "artifacts_summary",
        "last_error",
        "overview_status",
        "overview_started_at",
        "overview_ready_at",
        "overview_error",
        "technical_summary",
    ):
        if key in fs_detail:
            merged[key] = fs_detail[key]
    return merged


def _log_ingestion_access_mismatch(*, request: Request, tenant_id: str, ingestion_id: str, surface: str) -> None:
    owner_tenant_id = None
    try:
        owner_tenant_id = meta.find_ingestion_tenant(ingestion_id=ingestion_id)
    except Exception as exc:
        owner_tenant_id = f"lookup_error:{exc.__class__.__name__}"

    _log_event(
        stage="authz",
        status="ingestion_lookup_mismatch",
        surface=surface,
        tenant_id=tenant_id,
        ingestion_id=ingestion_id,
        owner_tenant_id=owner_tenant_id,
        request_id=request.headers.get("x-cloud-trace-context") or request.headers.get("x-request-id") or "",
    )


def _is_running_ingestion(*, detail: dict[str, object] | None, fs_detail: dict[str, object] | None) -> bool:
    statuses: set[str] = set()
    if detail and isinstance(detail.get("ingestion"), dict):
        statuses.add(str(detail["ingestion"].get("status") or ""))
    if fs_detail:
        statuses.add(str(fs_detail.get("status") or ""))
        statuses.add(str(fs_detail.get("overview_status") or ""))
    return any(status.endswith("_running") or status == "running" for status in statuses if status)


def _collect_gcs_uris(*, detail: dict[str, object] | None, fs_detail: dict[str, object] | None) -> list[str]:
    uris: set[str] = set()
    if detail and isinstance(detail.get("ingestion"), dict):
        landed = detail["ingestion"].get("landed_gcs_uri")
        if landed:
            uris.add(str(landed))
    if detail:
        for artifact in detail.get("artifacts", []):  # type: ignore[arg-type]
            if artifact.get("gcs_uri"):  # type: ignore[union-attr]
                uris.add(str(artifact["gcs_uri"]))  # type: ignore[index]
    if fs_detail:
        file_info = fs_detail.get("file") or {}
        if isinstance(file_info, dict) and file_info.get("gcs_uri"):
            uris.add(str(file_info["gcs_uri"]))
        artifacts_summary = fs_detail.get("artifacts_summary") or {}
        if isinstance(artifacts_summary, dict):
            for value in artifacts_summary.values():
                if isinstance(value, str) and value.startswith("gs://"):
                    uris.add(value)
    return sorted(uris)


def _collect_bq_tables(*, detail: dict[str, object] | None, fs_detail: dict[str, object] | None) -> list[str]:
    tables: set[str] = set()
    if detail:
        for artifact in detail.get("artifacts", []):  # type: ignore[arg-type]
            if artifact.get("bq_table"):  # type: ignore[union-attr]
                tables.add(str(artifact["bq_table"]))  # type: ignore[index]
    if fs_detail:
        technical_summary = fs_detail.get("technical_summary") or {}
        if isinstance(technical_summary, dict) and technical_summary.get("bq_table"):
            tables.add(str(technical_summary["bq_table"]))
        artifacts_summary = fs_detail.get("artifacts_summary") or {}
        if isinstance(artifacts_summary, dict):
            for value in artifacts_summary.values():
                if isinstance(value, str) and "." in value and not value.startswith("gs://"):
                    tables.add(value)
    return sorted(tables)


def _delete_gcs_uri(uri: str) -> None:
    parsed = urlparse(uri)
    if parsed.scheme != "gs" or not parsed.netloc or not parsed.path:
        return
    blob = gcs.bucket(parsed.netloc).blob(parsed.path.lstrip("/"))
    blob.delete(if_generation_match=None)


@app.post("/v1/files")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    source: str | None = Form(default=None),
    dataset: str | None = Form(default=None),
):
    tenant_id = _resolve_tenant_id(request)
    source_norm = naming.normalize_source(source)
    dataset_norm = naming.normalize_dataset(dataset)

    if not settings.gcs_landing_bucket:
        return JSONResponse(status_code=500, content={"error": "GCS_LANDING_BUCKET is required"})

    ingestion_id = str(uuid.uuid4())
    ingestion_date = naming.ingestion_date_utc()
    object_name = naming.build_landing_object_name(
        tenant_id=tenant_id,
        source=source_norm,
        dataset=dataset_norm,
        ingestion_date=ingestion_date,
        ingestion_id=ingestion_id,
        original_filename=file.filename or "file",
    )

    bucket = gcs.bucket(settings.gcs_landing_bucket)
    blob = bucket.blob(object_name)

    # UploadFile.file is a file-like object; upload_from_file will stream it.
    # We intentionally avoid buffering the full payload in memory.
    file.file.seek(0)
    blob.upload_from_file(file.file, content_type=file.content_type)

    gcs_uri = f"gs://{settings.gcs_landing_bucket}/{object_name}"

    # Record metadata for UI/ops (best-effort; failure here should surface clearly).
    rec = IngestionRecord(
        tenant_id=tenant_id,
        ingestion_id=ingestion_id,
        status="landed",
        source=source_norm,
        dataset=dataset_norm,
        landed_gcs_uri=gcs_uri,
        original_filename=file.filename or "file",
        content_type=file.content_type,
        size_bytes=blob.size,
        checksum_sha256=None,  # TODO: compute on upload for stronger integrity checks
    )
    meta.upsert_landed(rec)
    meta.insert_artifact(
        tenant_id=tenant_id,
        ingestion_id=ingestion_id,
        layer="landing",
        artifact_id=str(blob.generation or ""),
        gcs_uri=gcs_uri,
    )
    read_model.upsert_collection_stub(tenant_id=tenant_id, slug=dataset_norm)
    read_model.record_landed_ingestion(
        tenant_id=tenant_id,
        ingestion_id=ingestion_id,
        source=source_norm,
        collection_slug=dataset_norm,
        gcs_uri=gcs_uri,
        file_name=file.filename or "file",
        content_type=file.content_type,
        size_bytes=blob.size,
    )
    _log_event(
        tenant_id=tenant_id,
        ingestion_id=ingestion_id,
        collection_slug=dataset_norm,
        stage="landing",
        status="landed",
        file_name=file.filename or "file",
        gcs_uri=gcs_uri,
        request_id=request.headers.get("x-cloud-trace-context") or request.headers.get("x-request-id") or "",
    )

    return {
        "tenant_id": tenant_id,
        "ingestion_id": ingestion_id,
        "status": "landed",
        "gcs_uri_landing": gcs_uri,
    }


@app.get("/v1/ingestions")
def list_ingestions(request: Request, limit: int = 20, collection: str | None = None, status: str | None = None):
    tenant_id = _resolve_tenant_id(request)
    safe_limit = max(1, min(limit, 100))
    collection_slug = naming.normalize_dataset(collection) if collection else None
    return {
        "items": read_model.list_ingestions(
            tenant_id=tenant_id,
            limit=safe_limit,
            collection_slug=collection_slug,
            status=status,
        ),
        "limit": safe_limit,
    }


@app.get("/v1/ingestions/{ingestion_id}")
def get_ingestion(request: Request, ingestion_id: str):
    tenant_id = _resolve_tenant_id(request)

    detail = meta.get_ingestion_detail(tenant_id=tenant_id, ingestion_id=ingestion_id)
    fs_detail = read_model.get_ingestion(tenant_id=tenant_id, ingestion_id=ingestion_id)
    if detail is None:
        if fs_detail is None:
            _log_ingestion_access_mismatch(request=request, tenant_id=tenant_id, ingestion_id=ingestion_id, surface="detail")
            return JSONResponse(status_code=404, content={"error": "not_found"})
        return {"ingestion": fs_detail, "artifacts": [], "errors": []}
    if fs_detail is not None:
        detail["ingestion"] = _merge_ingestion_projection(detail["ingestion"], fs_detail)
        detail["read_model"] = fs_detail
    return detail


@app.delete("/v1/ingestions/{ingestion_id}")
def delete_ingestion(request: Request, ingestion_id: str):
    actor = _resolve_actor(request)
    tenant_id = actor["tenant_id"]

    detail = meta.get_ingestion_detail(tenant_id=tenant_id, ingestion_id=ingestion_id)
    fs_detail = read_model.get_ingestion(tenant_id=tenant_id, ingestion_id=ingestion_id)
    if detail is None and fs_detail is None:
        return JSONResponse(status_code=404, content={"error": "not_found"})

    if _is_running_ingestion(detail=detail, fs_detail=fs_detail):
        raise HTTPException(status_code=409, detail="ingestion is still running and cannot be deleted yet")

    gcs_uris = _collect_gcs_uris(detail=detail, fs_detail=fs_detail)
    bq_tables = _collect_bq_tables(detail=detail, fs_detail=fs_detail)

    deleted_gcs_uris: list[str] = []
    for uri in gcs_uris:
        try:
            _delete_gcs_uri(uri)
            deleted_gcs_uris.append(uri)
        except Exception:
            # Metadata cleanup remains the source of truth even if an artifact is already gone.
            pass

    deleted_bq_tables: list[str] = []
    for table_id in bq_tables:
        try:
            bq.delete_table(table_id, not_found_ok=True)
            deleted_bq_tables.append(table_id)
        except Exception:
            pass

    meta.delete_ingestion_records(tenant_id=tenant_id, ingestion_id=ingestion_id)
    read_model.delete_ingestion(tenant_id=tenant_id, ingestion_id=ingestion_id)

    _log_event(
        tenant_id=tenant_id,
        ingestion_id=ingestion_id,
        stage="ingestion",
        status="deleted",
        deleted_gcs_uris=deleted_gcs_uris,
        deleted_bq_tables=deleted_bq_tables,
        actor_sub=actor.get("sub") or "",
        actor_email=actor.get("email") or "",
    )
    return {
        "ok": True,
        "ingestion_id": ingestion_id,
        "deleted": {
            "gcs_uris": deleted_gcs_uris,
            "bq_tables": deleted_bq_tables,
            "metadata": True,
            "read_model": True,
        },
    }


@app.get("/v1/ingestions/{ingestion_id}/overview")
def get_ingestion_overview(request: Request, ingestion_id: str):
    tenant_id = _resolve_tenant_id(request)
    overview = read_model.get_overview(tenant_id=tenant_id, ingestion_id=ingestion_id)
    if overview is None:
        _log_ingestion_access_mismatch(request=request, tenant_id=tenant_id, ingestion_id=ingestion_id, surface="overview")
        return JSONResponse(status_code=404, content={"error": "not_found"})
    return overview


@app.get("/v1/ingestions/{ingestion_id}/overview/semantic")
def get_ingestion_overview_semantic(request: Request, ingestion_id: str):
    tenant_id = _resolve_tenant_id(request)
    overview = read_model.get_overview(tenant_id=tenant_id, ingestion_id=ingestion_id)
    if overview is None:
        return JSONResponse(status_code=404, content={"error": "not_found"})

    semantic = read_model.get_overview_semantic(tenant_id=tenant_id, ingestion_id=ingestion_id) or {
        "tenant_id": tenant_id,
        "ingestion_id": ingestion_id,
    }
    semantic.setdefault("base_version", _semantic_base_version(overview))
    semantic.setdefault("updated_at", None)
    semantic.setdefault("updated_by", None)
    semantic.setdefault("reason", None)
    semantic.setdefault("semantic", {})
    return semantic


@app.post("/v1/ingestions/{ingestion_id}/overview/semantic/preview")
async def preview_ingestion_overview_semantic(request: Request, ingestion_id: str):
    actor = _require_overview_semantic_editor(request)
    tenant_id = actor["tenant_id"]
    overview = read_model.get_overview(tenant_id=tenant_id, ingestion_id=ingestion_id)
    if overview is None:
        return JSONResponse(status_code=404, content={"error": "not_found"})

    payload = await request.json()
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="invalid JSON body")
    patch_raw = payload.get("patch")
    normalized_patch, invalid_paths = normalize_patch(patch_raw)
    if normalized_patch is None or invalid_paths:
        return JSONResponse(
            status_code=400,
            content={
                "error": "invalid_patch",
                "message": "Patch contains fields outside the allowed semantic scope.",
                "invalid_paths": invalid_paths,
            },
        )

    current = read_model.get_overview_semantic(tenant_id=tenant_id, ingestion_id=ingestion_id) or {}
    current_semantic = current.get("semantic") if isinstance(current.get("semantic"), dict) else {}
    preview_semantic = merge_semantic(current_semantic, normalized_patch)
    return {
        "tenant_id": tenant_id,
        "ingestion_id": ingestion_id,
        "base_version": _semantic_base_version(overview),
        "semantic": preview_semantic,
        "patch": normalized_patch,
        "persisted": False,
    }


@app.patch("/v1/ingestions/{ingestion_id}/overview/semantic")
async def patch_ingestion_overview_semantic(request: Request, ingestion_id: str):
    actor = _require_overview_semantic_editor(request)
    tenant_id = actor["tenant_id"]
    overview = read_model.get_overview(tenant_id=tenant_id, ingestion_id=ingestion_id)
    if overview is None:
        return JSONResponse(status_code=404, content={"error": "not_found"})

    payload = await request.json()
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="invalid JSON body")

    patch_raw = payload.get("patch")
    reason_raw = payload.get("reason")
    if not isinstance(reason_raw, str) or not reason_raw.strip():
        raise HTTPException(status_code=400, detail="reason is required")

    normalized_patch, invalid_paths = normalize_patch(patch_raw)
    if normalized_patch is None or invalid_paths:
        return JSONResponse(
            status_code=400,
            content={
                "error": "invalid_patch",
                "message": "Patch contains fields outside the allowed semantic scope.",
                "invalid_paths": invalid_paths,
            },
        )

    current = read_model.get_overview_semantic(tenant_id=tenant_id, ingestion_id=ingestion_id) or {}
    current_base_version = str(current.get("base_version") or _semantic_base_version(overview) or "")
    if_match = (request.headers.get("if-match") or request.headers.get("If-Match") or "").strip()
    if if_match and current_base_version and if_match != current_base_version:
        return JSONResponse(
            status_code=409,
            content={
                "error": "version_conflict",
                "message": "Semantic overview changed since the client loaded it.",
                "current_version": current_base_version,
            },
        )

    current_semantic = current.get("semantic") if isinstance(current.get("semantic"), dict) else {}
    next_semantic = merge_semantic(current_semantic, normalized_patch)
    base_version = _semantic_base_version(overview)
    updated_by = {
        "sub": actor["sub"],
        "email": actor["email"],
        "type": actor["type"],
    }
    reason = reason_raw.strip()
    read_model.store_overview_semantic(
        tenant_id=tenant_id,
        ingestion_id=ingestion_id,
        base_version=base_version,
        reason=reason,
        semantic=next_semantic,
        patch=normalized_patch,
        updated_by=updated_by,
    )
    _log_event(
        tenant_id=tenant_id,
        ingestion_id=ingestion_id,
        stage="overview_semantic",
        status="updated",
        actor_sub=actor["sub"],
        actor_email=actor["email"],
        reason=reason,
        request_id=request.headers.get("x-cloud-trace-context") or request.headers.get("x-request-id") or "",
    )
    return {
        "ok": True,
        "tenant_id": tenant_id,
        "ingestion_id": ingestion_id,
        "base_version": base_version,
        "updated_by": updated_by,
        "reason": reason,
        "semantic": next_semantic,
    }


@app.post("/v1/ingestions/{ingestion_id}/overview/run")
def run_ingestion_overview(request: Request, ingestion_id: str):
    tenant_id = _resolve_tenant_id(request)
    if not settings.overviewify_job_name:
        return JSONResponse(status_code=500, content={"error": "OVERVIEWIFY_JOB_NAME is required"})

    detail = meta.get_ingestion_detail(tenant_id=tenant_id, ingestion_id=ingestion_id)
    fs_detail = read_model.get_ingestion(tenant_id=tenant_id, ingestion_id=ingestion_id)
    if detail is None and fs_detail is None:
        return JSONResponse(status_code=404, content={"error": "not_found"})

    status = ""
    dataset = "default"
    source = "upload"
    file_name = "dataset.csv"
    if detail is not None:
        status = str(detail.get("ingestion", {}).get("status") or "")
        dataset = str(detail.get("ingestion", {}).get("dataset") or dataset)
        source = str(detail.get("ingestion", {}).get("source") or source)
        file_name = str(detail.get("ingestion", {}).get("original_filename") or file_name)
    elif fs_detail is not None:
        status = str(fs_detail.get("status") or "")
        dataset = str(fs_detail.get("dataset") or dataset)
        source = str(fs_detail.get("source") or source)
        file_name = str((fs_detail.get("file") or {}).get("name") or file_name)

    if status != "silver_ready":
        raise HTTPException(status_code=409, detail="overview requires silver_ready ingestion")

    if fs_detail and fs_detail.get("overview_status") == "running":
        return {"ok": True, "ingestion_id": ingestion_id, "status": "running", "triggered": False}

    bq_table = _resolve_overview_bq_table(detail=detail, fs_detail=fs_detail)
    if not bq_table:
        raise HTTPException(status_code=409, detail="silver artifact not found for overview")

    read_model.update_overview_status(
        tenant_id=tenant_id,
        ingestion_id=ingestion_id,
        status="pending",
        message="Análise do overview enfileirada manualmente.",
    )
    override = run_v2.RunJobRequest.Overrides(
        container_overrides=[
            run_v2.RunJobRequest.Overrides.ContainerOverride(
                env=[
                    run_v2.EnvVar(name="DV_TENANT_ID", value=tenant_id),
                    run_v2.EnvVar(name="DV_INGESTION_ID", value=ingestion_id),
                    run_v2.EnvVar(name="DV_BQ_TABLE", value=bq_table),
                    run_v2.EnvVar(name="DV_DATASET", value=dataset),
                    run_v2.EnvVar(name="DV_SOURCE", value=source),
                    run_v2.EnvVar(name="DV_FILE_NAME", value=file_name),
                ]
            )
        ]
    )
    op = jobs.run_job(request=run_v2.RunJobRequest(name=settings.overviewify_job_name, overrides=override))
    op_name = None
    try:
        op_name = op.operation.name  # type: ignore[attr-defined]
    except Exception:
        op_name = getattr(op, "name", None) or None

    _log_event(
        tenant_id=tenant_id,
        ingestion_id=ingestion_id,
        collection_slug=dataset,
        stage="overview",
        status="pending",
        bq_table=bq_table,
        request_id=request.headers.get("x-cloud-trace-context") or request.headers.get("x-request-id") or "",
    )
    return {"ok": True, "ingestion_id": ingestion_id, "status": "pending", "triggered": True, "operation_name": op_name}


def _semantic_base_version(overview: dict[str, object]) -> str | None:
    overview_payload = overview.get("overview") if isinstance(overview, dict) else None
    if isinstance(overview_payload, dict) and overview_payload.get("generated_at"):
        return str(overview_payload["generated_at"])
    ready_at = overview.get("ready_at") if isinstance(overview, dict) else None
    if ready_at:
        return str(ready_at)
    started_at = overview.get("started_at") if isinstance(overview, dict) else None
    if started_at:
        return str(started_at)
    return None

from __future__ import annotations

import json
import uuid

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
from .read_model import FirestoreReadModel
from .settings import load_settings


settings = load_settings()

app = FastAPI(title="Dativerso Ingestion API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key"],
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
    if settings.identity_api_base_url:
        me = resolve_me(settings, request)
        tenant_id_raw = str(me.get("tenant_id") or "")
        if not tenant_id_raw.strip():
            raise HTTPException(status_code=403, detail="tenant not resolved")
    else:
        gateway_claims = auth.get_gateway_claims(request)
        if gateway_claims is not None:
            claims = gateway_claims
        else:
            token = auth.get_bearer_token(request)
            claims = auth.get_claims(settings, token)
        tenant_id_raw = auth.get_tenant_id(settings, claims)
    return naming.normalize_tenant_id(tenant_id_raw)


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
            return JSONResponse(status_code=404, content={"error": "not_found"})
        return {"ingestion": fs_detail, "artifacts": [], "errors": []}
    if fs_detail is not None:
        detail["ingestion"] = _merge_ingestion_projection(detail["ingestion"], fs_detail)
        detail["read_model"] = fs_detail
    return detail


@app.get("/v1/ingestions/{ingestion_id}/overview")
def get_ingestion_overview(request: Request, ingestion_id: str):
    tenant_id = _resolve_tenant_id(request)
    overview = read_model.get_overview(tenant_id=tenant_id, ingestion_id=ingestion_id)
    if overview is None:
        return JSONResponse(status_code=404, content={"error": "not_found"})
    return overview


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

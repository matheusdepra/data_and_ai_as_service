from __future__ import annotations

import uuid

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from google.cloud import bigquery
from google.cloud import storage

from . import auth, naming
from .identity_client import resolve_me
from .metadata import IngestionRecord, MetadataStore
from .settings import load_settings


settings = load_settings()

app = FastAPI(title="Dativerso Ingestion API", version="0.1.0")

gcs = storage.Client()
bq = bigquery.Client()
meta = MetadataStore(bq_client=bq, dataset_id=settings.bq_meta_dataset)


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.post("/v1/files")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    source: str | None = Form(default=None),
    dataset: str | None = Form(default=None),
):
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

    tenant_id = naming.normalize_tenant_id(tenant_id_raw)
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

    return {
        "tenant_id": tenant_id,
        "ingestion_id": ingestion_id,
        "status": "landed",
        "gcs_uri_landing": gcs_uri,
    }


@app.get("/v1/ingestions/{ingestion_id}")
def get_ingestion(request: Request, ingestion_id: str):
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
    tenant_id = naming.normalize_tenant_id(tenant_id_raw)

    detail = meta.get_ingestion_detail(tenant_id=tenant_id, ingestion_id=ingestion_id)
    if detail is None:
        return JSONResponse(status_code=404, content={"error": "not_found"})
    return detail

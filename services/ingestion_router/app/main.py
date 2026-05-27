from __future__ import annotations

import json
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from google.cloud import bigquery
from google.cloud import run_v2
from google.api_core import exceptions as gexc

from .metadata import MetadataStore
from .parsing import parse_cloudevent, parse_ingestion_from_object_name, parse_storage_finalize
from .settings import load_settings


settings = load_settings()
app = FastAPI(title="Dativerso Ingestion Router", version="0.1.0")

logger = logging.getLogger("dativerso.ingestion_router")
logging.basicConfig(level=logging.INFO)

bq = bigquery.Client()
meta = MetadataStore(bq_client=bq, dataset_id=settings.bq_meta_dataset)
jobs = run_v2.JobsClient()


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.post("/")
async def handle_event(request: Request):
    payload = await request.json()
    headers = {k.lower(): v for k, v in request.headers.items()}

    try:
        ce_type, data = parse_cloudevent(payload, headers)
        # Eventarc may deliver events in CloudEvents mode or in GCS_NOTIFICATION mode.
        # If we can't read the CloudEvent type, but the payload looks like a GCS object event,
        # treat it as a finalize event (we still validate object name prefix below).
        if ce_type is None and isinstance(payload.get("bucket"), str) and isinstance(payload.get("name"), str):
            ce_type = "google.cloud.storage.object.v1.finalized"
            data = payload

        if ce_type != "google.cloud.storage.object.v1.finalized":
            logger.info("Ignored event: unsupported type=%s keys=%s", ce_type, sorted(payload.keys()))
            # Ignore unknown events (still 2xx to prevent retries).
            return {"ignored": True, "reason": "unsupported event type", "type": ce_type}

        ev = parse_storage_finalize(data, payload)
        if not ev.name.startswith("landing/"):
            logger.info("Ignored event: not landing object name=%s", ev.name)
            return {"ignored": True, "reason": "not a landing object", "name": ev.name}

        tenant_id, ingestion_id = parse_ingestion_from_object_name(ev.name)
        if not tenant_id or not ingestion_id:
            logger.warning("Ignored event: cannot parse tenant/ingestion from name=%s", ev.name)
            # If this happens, naming convention drifted; keep event for inspection.
            return JSONResponse(
                status_code=202,
                content={"ignored": True, "reason": "cannot parse tenant/ingestion", "name": ev.name},
            )

        if not settings.bronzeify_job_name:
            return JSONResponse(status_code=500, content={"error": "BRONZEIFY_JOB_NAME is required"})

        logger.info("Triggering bronzeify tenant_id=%s ingestion_id=%s object=%s", tenant_id, ingestion_id, ev.name)
        # Update status first; if this fails we want Eventarc to retry (5xx).
        meta.update_status(
            tenant_id=tenant_id,
            ingestion_id=ingestion_id,
            status="bronze_running",
            timestamp_field="bronze_started_at",
        )

        override = run_v2.RunJobRequest.Overrides(
            container_overrides=[
                run_v2.RunJobRequest.Overrides.ContainerOverride(
                    env=[
                        run_v2.EnvVar(name="DV_TENANT_ID", value=tenant_id),
                        run_v2.EnvVar(name="DV_INGESTION_ID", value=ingestion_id),
                        run_v2.EnvVar(name="DV_GCS_BUCKET", value=ev.bucket),
                        run_v2.EnvVar(name="DV_GCS_OBJECT", value=ev.name),
                        run_v2.EnvVar(name="DV_GCS_GENERATION", value=ev.generation or ""),
                    ]
                )
            ]
        )

        op = jobs.run_job(request=run_v2.RunJobRequest(name=settings.bronzeify_job_name, overrides=override))

        # Do not return protobuf/Operation objects; FastAPI can't JSON-encode them reliably.
        op_name = None
        try:
            op_name = op.operation.name  # type: ignore[attr-defined]
        except Exception:
            op_name = getattr(op, "name", None) or None

        return {
            "ok": True,
            "tenant_id": tenant_id,
            "ingestion_id": ingestion_id,
            "bronze_job_operation_name": op_name,
        }
    except (gexc.Forbidden, gexc.PermissionDenied, gexc.Unauthenticated) as e:
        # Treat IAM/auth issues as retryable: once fixed, Eventarc retries can succeed.
        logger.exception("Retryable auth/IAM failure: %s", str(e))
        return JSONResponse(status_code=500, content={"ok": False, "retryable": True, "error": str(e)})
    except gexc.GoogleAPICallError as e:
        # Transient Google API failures should be retried by Eventarc.
        logger.exception("Retryable Google API failure: %s", str(e))
        return JSONResponse(status_code=500, content={"ok": False, "retryable": True, "error": str(e)})
    except Exception as e:
        logger.exception("Failed to handle event. headers=%s payload=%s", {k: headers[k] for k in sorted(headers) if k.startswith("ce-")}, json.dumps(payload)[:2000])
        # Unknown bug: return 500 so we don't silently drop events.
        return JSONResponse(status_code=500, content={"ok": False, "retryable": True, "error": str(e)})

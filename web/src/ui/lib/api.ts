export type IngestionDetail = {
  ingestion: {
    tenant_id: string;
    ingestion_id: string;
    status: string;
    source?: string | null;
    dataset?: string | null;
    landed_gcs_uri?: string | null;
    original_filename?: string | null;
    content_type?: string | null;
    size_bytes?: number | null;
    received_at?: string | null;
    landed_at?: string | null;
    bronze_started_at?: string | null;
    bronze_ready_at?: string | null;
    silver_started_at?: string | null;
    silver_ready_at?: string | null;
    updated_at?: string | null;
  };
  artifacts: Array<{
    layer: string;
    artifact_id: string;
    gcs_uri?: string | null;
    bq_table?: string | null;
    created_at?: string | null;
  }>;
  errors: Array<{
    stage?: string | null;
    reason_code?: string | null;
    message?: string | null;
    details_json?: string | null;
    created_at?: string | null;
  }>;
};

export type UploadResponse = {
  tenant_id: string;
  ingestion_id: string;
  status: string;
  gcs_uri_landing: string;
};

export type MeResponse = {
  sub: string;
  email: string;
  tenant_id: string;
  role: string;
};

function baseUrl(): string {
  const v =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    (import.meta.env.VITE_INGESTION_API_BASE_URL as string | undefined);
  if (!v) throw new Error("Missing VITE_API_BASE_URL (ou VITE_INGESTION_API_BASE_URL)");
  return v.replace(/\/$/, "");
}

function authHeaders(jwt: string): HeadersInit {
  const headers: Record<string, string> = {};
  const apiKey = (import.meta.env.VITE_API_KEY as string | undefined)?.trim();
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  }
  return headers;
}

async function json<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return JSON.parse(text) as T;
}

export async function uploadFile(args: { jwt: string; file: File; source: string; dataset: string }): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", args.file);
  form.append("source", args.source);
  form.append("dataset", args.dataset);

  const res = await fetch(`${baseUrl()}/v1/files`, {
    method: "POST",
    headers: authHeaders(args.jwt),
    body: form,
  });
  return json<UploadResponse>(res);
}

export async function getMe(args: { jwt: string }): Promise<MeResponse> {
  const res = await fetch(`${baseUrl()}/v1/me`, {
    method: "GET",
    headers: authHeaders(args.jwt),
  });
  return json<MeResponse>(res);
}

export async function getIngestionDetail(args: { jwt: string; ingestionId: string }): Promise<IngestionDetail> {
  const res = await fetch(`${baseUrl()}/v1/ingestions/${encodeURIComponent(args.ingestionId)}`, {
    method: "GET",
    headers: authHeaders(args.jwt),
  });
  return json<IngestionDetail>(res);
}

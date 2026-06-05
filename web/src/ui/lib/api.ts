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
    stage?: string | null;
    collection_slug?: string | null;
    overview_status?: string | null;
    overview_started_at?: string | null;
    overview_ready_at?: string | null;
    overview_error?: { reason_code?: string | null; message?: string | null } | null;
    technical_summary?: {
      row_count?: number | null;
      bq_table?: string | null;
      schema_original?: Array<{ name: string; type: string }>;
      schema_normalized?: Array<{
        original_name: string;
        normalized_name: string;
        source_type: string;
        inferred_type: string;
        total_rows?: number | null;
        non_null_count?: number | null;
        blank_count?: number | null;
        distinct_count?: number | null;
        cast_success_count?: number | null;
        cast_success_rate?: number | null;
        warnings?: string[];
      }>;
      column_mappings?: Array<{ original_name: string; normalized_name: string }>;
      cast_report?: Array<{
        normalized_name: string;
        inferred_type: string;
        cast_success_rate: number;
        cast_success_count?: number | null;
        non_null_count?: number | null;
        warnings?: string[];
      }>;
      normalization_warnings?: string[];
    } | null;
    file?: {
      name?: string | null;
      content_type?: string | null;
      size_bytes?: number | null;
      gcs_uri?: string | null;
    } | null;
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
  read_model?: Record<string, unknown>;
};

export type IngestionListItem = {
  tenant_id: string;
  ingestion_id: string;
  status: string;
  stage?: string | null;
  source?: string | null;
  dataset?: string | null;
  collection_slug?: string | null;
  updated_at?: string | null;
  overview_status?: string | null;
  overview_started_at?: string | null;
  overview_ready_at?: string | null;
  overview_error?: { reason_code?: string | null; message?: string | null } | null;
  technical_summary?: IngestionDetail["ingestion"]["technical_summary"];
  file?: {
    name?: string | null;
    content_type?: string | null;
    size_bytes?: number | null;
    gcs_uri?: string | null;
  } | null;
  artifacts_summary?: Record<string, string>;
  last_error?: { reason_code?: string | null; message?: string | null } | null;
};

export type IngestionListResponse = {
  items: IngestionListItem[];
  limit: number;
};

export type DeleteIngestionResponse = {
  ok: boolean;
  ingestion_id: string;
  deleted: {
    gcs_uris: string[];
    bq_tables: string[];
    metadata: boolean;
    read_model: boolean;
  };
};

export type IngestionOverviewResponse = {
  tenant_id: string;
  ingestion_id: string;
  status: "pending" | "running" | "ready" | "failed";
  started_at?: string | null;
  ready_at?: string | null;
  error?: { reason_code?: string | null; message?: string | null } | null;
  overview?: {
    generated_at?: string | null;
    dataset_header?: {
      name: string;
      status: string;
      classification: string;
      tags: string[];
      updated_at?: string | null;
    };
    ai_understanding?: {
      summary: string;
      confidence: number;
    };
    summary?: {
      rows?: number | null;
      columns?: number | null;
      size_bytes?: number | null;
      language?: string | null;
      created_date?: string | null;
    };
    schema?: {
      columns: Array<{
        original_name: string;
        normalized_name: string;
        source_type: string;
        inferred_type: string;
        warnings?: string[];
        cast_success_rate?: number | null;
        non_null_count?: number | null;
        total_rows?: number | null;
      }>;
      mappings?: Array<{ original_name: string; normalized_name: string }>;
      warnings?: string[];
    };
    preview_rows?: Array<Record<string, unknown>>;
    quality?: {
      overall_score: number;
      completeness: number;
      uniqueness: number;
      validity: number;
      consistency: number;
      timeliness: number;
    };
    business_description?: {
      business_area: string;
      domain: string;
      data_type: string;
      typical_usage: string[];
    };
    terms?: string[];
    relationships?: Array<{
      ingestion_id: string;
      collection_slug: string;
      dataset_name: string;
      confidence: number;
      shared_columns: string[];
    }>;
  } | null;
};

export type IngestionOverviewSemantic = Partial<NonNullable<IngestionOverviewResponse["overview"]>>;

export type IngestionOverviewSemanticResponse = {
  tenant_id: string;
  ingestion_id: string;
  base_version?: string | null;
  updated_at?: string | null;
  updated_by?: Record<string, unknown> | null;
  reason?: string | null;
  semantic?: IngestionOverviewSemantic;
};

export type OverviewChatResponse = {
  session_id: string;
  answer: string;
  used_prompt_key: string;
  used_context_sources: string[];
  metadata: Record<string, unknown>;
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

function aiAssistantBaseUrl(): string {
  const v = (import.meta.env.VITE_AI_ASSISTANT_API_BASE_URL as string | undefined)?.trim();
  if (!v) throw new Error("Missing VITE_AI_ASSISTANT_API_BASE_URL");
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

export async function getIngestions(args: {
  jwt: string;
  limit?: number;
  collection?: string;
  status?: string;
}): Promise<IngestionListResponse> {
  const params = new URLSearchParams();
  if (args.limit) params.set("limit", String(args.limit));
  if (args.collection) params.set("collection", args.collection);
  if (args.status) params.set("status", args.status);
  const query = params.toString();
  const res = await fetch(`${baseUrl()}/v1/ingestions${query ? `?${query}` : ""}`, {
    method: "GET",
    headers: authHeaders(args.jwt),
  });
  return json<IngestionListResponse>(res);
}

export async function deleteIngestion(args: { jwt: string; ingestionId: string }): Promise<DeleteIngestionResponse> {
  const res = await fetch(`${baseUrl()}/v1/ingestions/${encodeURIComponent(args.ingestionId)}`, {
    method: "DELETE",
    headers: authHeaders(args.jwt),
  });
  return json<DeleteIngestionResponse>(res);
}

export async function getIngestionOverview(args: { jwt: string; ingestionId: string }): Promise<IngestionOverviewResponse> {
  const res = await fetch(`${baseUrl()}/v1/ingestions/${encodeURIComponent(args.ingestionId)}/overview`, {
    method: "GET",
    headers: authHeaders(args.jwt),
  });
  return json<IngestionOverviewResponse>(res);
}

export async function getIngestionOverviewSemantic(args: {
  jwt: string;
  ingestionId: string;
}): Promise<IngestionOverviewSemanticResponse> {
  const res = await fetch(`${baseUrl()}/v1/ingestions/${encodeURIComponent(args.ingestionId)}/overview/semantic`, {
    method: "GET",
    headers: authHeaders(args.jwt),
  });
  return json<IngestionOverviewSemanticResponse>(res);
}

export async function runIngestionOverview(args: { jwt: string; ingestionId: string }): Promise<{ ok: boolean; status: string }> {
  const res = await fetch(`${baseUrl()}/v1/ingestions/${encodeURIComponent(args.ingestionId)}/overview/run`, {
    method: "POST",
    headers: authHeaders(args.jwt),
  });
  return json<{ ok: boolean; status: string }>(res);
}

export async function sendOverviewCopilotMessage(args: {
  jwt: string;
  sessionId: string;
  ingestionId: string;
  message: string;
}): Promise<OverviewChatResponse> {
  const headers = authHeaders(args.jwt) as Record<string, string>;
  const aiApiKey = (import.meta.env.VITE_AI_ASSISTANT_API_KEY as string | undefined)?.trim();
  if (aiApiKey) {
    headers["x-api-key"] = aiApiKey;
  }
  const res = await fetch(`${aiAssistantBaseUrl()}/api/v1/chat/messages`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: args.sessionId,
      message: args.message,
      agent_key: "dataset_overview",
      scope: {
        screen: "dataset_overview",
        ingestion_id: args.ingestionId,
      },
      context: {},
    }),
  });
  return json<OverviewChatResponse>(res);
}

export async function sendDatasetCopilotMessage(args: {
  jwt: string;
  sessionId: string;
  ingestionId: string;
  message: string;
}): Promise<OverviewChatResponse> {
  const headers = authHeaders(args.jwt) as Record<string, string>;
  const aiApiKey = (import.meta.env.VITE_AI_ASSISTANT_API_KEY as string | undefined)?.trim();
  if (aiApiKey) {
    headers["x-api-key"] = aiApiKey;
  }
  const res = await fetch(`${aiAssistantBaseUrl()}/api/v1/chat/messages`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: args.sessionId,
      message: args.message,
      agent_key: "dataset_copilot",
      scope: {
        screen: "dataset_copilot",
        ingestion_id: args.ingestionId,
      },
      context: {},
    }),
  });
  return json<OverviewChatResponse>(res);
}

import express from "express";
import admin from "firebase-admin";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const FIREBASE_PROJECT_ID = (process.env.FIREBASE_PROJECT_ID || "").trim();
if (!FIREBASE_PROJECT_ID) {
  throw new Error("FIREBASE_PROJECT_ID is required");
}

const FRONTEND_BASE_URL = (process.env.FRONTEND_BASE_URL || "").trim().replace(/\/+$/, "");
const PORT = Number.parseInt(process.env.PORT || "8080", 10);

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,X-API-Key");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  return next();
});

app.use(express.json({ limit: "1mb" }));

function authHeader(req) {
  // When fronted by API Gateway, the original client token may be forwarded here while
  // Authorization is overwritten for service-to-service auth to Cloud Run.
  const v = req.get("X-Forwarded-Authorization") || req.get("x-forwarded-authorization") || req.get("Authorization") || req.get("authorization") || "";
  if (!v.toLowerCase().startsWith("bearer ")) return null;
  return v.slice("bearer ".length).trim();
}

function decodeGatewayUserinfo(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  try {
    const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    const decoded = Buffer.from(normalized + padding, "base64").toString("utf8");
    const payload = JSON.parse(decoded);
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "default";
}

function tsToIso(value) {
  if (!value) return null;
  return value?.toDate ? value.toDate().toISOString() : String(value);
}

function collectionResponse(doc) {
  const d = doc.data() || {};
  return {
    slug: String(d.slug || doc.id),
    display_name: String(d.display_name || d.slug || doc.id),
    description: String(d.description || ""),
    created_at: tsToIso(d.created_at),
    updated_at: tsToIso(d.updated_at),
    last_ingestion_at: tsToIso(d.last_ingestion_at),
    ingestions_count: Number(d.ingestions_count || 0),
    created_by: String(d.created_by || ""),
  };
}

async function requireAuth(req, res, next) {
  const userinfo = decodeGatewayUserinfo(
    req.get("X-Apigateway-Api-Userinfo") || req.get("x-apigateway-api-userinfo")
  );
  if (userinfo) {
    const sub = userinfo.sub || userinfo.user_id;
    const email = userinfo.email;
    if (!sub || !email) return res.status(401).json({ detail: "missing gateway claims" });
    req.user = { sub: String(sub), email: normalizeEmail(email) };
    return next();
  }

  const token = authHeader(req);
  if (!token) return res.status(401).json({ detail: "missing Authorization header" });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const sub = decoded.sub || decoded.uid;
    const email = decoded.email;
    if (!sub || !email) return res.status(401).json({ detail: "missing claims" });
    req.user = { sub: String(sub), email: normalizeEmail(email) };
    next();
  } catch (e) {
    return res.status(401).json({ detail: "invalid token" });
  }
}

async function resolveMembershipOrAutoAcceptInvite(sub, email) {
  const membershipRef = db.collection("memberships").doc(sub);
  const membershipSnap = await membershipRef.get();
  if (membershipSnap.exists) {
    const m = membershipSnap.data() || {};
    return {
      tenant_id: String(m.tenant_id || ""),
      role: String(m.role || ""),
    };
  }

  // Auto-accept: lookup pending invite by email.
  const idxRef = db.collection("invite_index_by_email").doc(email);
  const idxSnap = await idxRef.get();
  if (!idxSnap.exists) return null;
  const idx = idxSnap.data() || {};
  const inviteId = String(idx.invite_id || "");
  if (!inviteId) return null;

  const inviteRef = db.collection("invites").doc(inviteId);
  const inviteSnap = await inviteRef.get();
  if (!inviteSnap.exists) {
    await idxRef.delete();
    return null;
  }

  const inv = inviteSnap.data() || {};
  if (String(inv.status || "") !== "pending") {
    await idxRef.delete();
    return null;
  }

  const expiresAt = inv.expires_at?.toDate ? inv.expires_at.toDate() : inv.expires_at;
  if (expiresAt instanceof Date && expiresAt.getTime() < Date.now()) {
    await inviteRef.set({ status: "expired" }, { merge: true });
    await idxRef.delete();
    return null;
  }

  const tenantId = String(inv.tenant_id || "");
  const role = String(inv.role || "");
  if (!tenantId || !role) return null;

  const now = admin.firestore.Timestamp.now();

  // Transaction: accept invite + create membership + clear index (best-effort atomicity).
  await db.runTransaction(async (tx) => {
    const freshInvite = await tx.get(inviteRef);
    if (!freshInvite.exists) return;
    const data = freshInvite.data() || {};
    if (String(data.status || "") !== "pending") return;

    tx.set(
      inviteRef,
      { status: "accepted", accepted_at: now, accepted_by: sub },
      { merge: true }
    );
    tx.set(
      membershipRef,
      {
        tenant_id: tenantId,
        sub,
        email,
        role,
        created_at: now,
        updated_at: now,
      },
      { merge: true }
    );
    tx.delete(idxRef);
  });

  return { tenant_id: tenantId, role };
}

async function requireCtx(req, res, next) {
  const { sub, email } = req.user;
  const m = await resolveMembershipOrAutoAcceptInvite(sub, email);
  if (!m || !m.tenant_id || !m.role) {
    return res.status(403).json({ detail: "no membership (invite required)" });
  }
  req.ctx = { sub, email, tenant_id: m.tenant_id, role: m.role };
  next();
}

function requireAdmin(req, res, next) {
  if (req.ctx?.role !== "admin") return res.status(403).json({ detail: "admin role required" });
  next();
}

app.get("/healthz", (req, res) => res.json({ ok: true }));

app.get("/v1/me", requireAuth, requireCtx, (req, res) => {
  res.json({
    sub: req.ctx.sub,
    email: req.ctx.email,
    tenant_id: req.ctx.tenant_id,
    role: req.ctx.role,
  });
});

const CollectionCreateSchema = z.object({
  slug: z.string().min(1).max(80).optional(),
  display_name: z.string().min(1).max(160),
  description: z.string().max(1000).optional().default(""),
});

app.get("/v1/collections", requireAuth, requireCtx, async (req, res) => {
  const snaps = await db
    .collection("tenants")
    .doc(req.ctx.tenant_id)
    .collection("collections")
    .orderBy("updated_at", "desc")
    .limit(100)
    .get();
  res.json({ items: snaps.docs.map(collectionResponse) });
});

app.post("/v1/collections", requireAuth, requireCtx, async (req, res) => {
  const parsed = CollectionCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ detail: "invalid body" });

  const slug = slugify(parsed.data.slug || parsed.data.display_name);
  const ref = db.collection("tenants").doc(req.ctx.tenant_id).collection("collections").doc(slug);
  const now = admin.firestore.Timestamp.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const base = {
      slug,
      display_name: parsed.data.display_name,
      description: parsed.data.description || "",
      updated_at: now,
      created_by: req.ctx.sub,
    };
    if (snap.exists) {
      tx.set(ref, base, { merge: true });
    } else {
      tx.set(ref, { ...base, created_at: now, last_ingestion_at: null, ingestions_count: 0 });
    }
  });

  const updated = await ref.get();
  console.log(JSON.stringify({ tenant_id: req.ctx.tenant_id, collection_slug: slug, stage: "collections", status: "upserted", request_id: req.get("x-cloud-trace-context") || "" }));
  res.status(201).json(collectionResponse(updated));
});

const InviteCreateSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "viewer"]),
});

app.post("/v1/invites", requireAuth, requireCtx, requireAdmin, async (req, res) => {
  const parsed = InviteCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ detail: "invalid body" });

  const email = normalizeEmail(parsed.data.email);
  const role = parsed.data.role;

  const tenantId = req.ctx.tenant_id;
  const tenantSnap = await db.collection("tenants").doc(tenantId).get();
  if (!tenantSnap.exists) return res.status(403).json({ detail: "tenant not found" });

  const inviteId = randomUUID();
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const inviteRef = db.collection("invites").doc(inviteId);
  await inviteRef.set({
    invite_id: inviteId,
    tenant_id: tenantId,
    email,
    role,
    status: "pending",
    created_by: req.ctx.sub,
    created_at: now,
    expires_at: expiresAt,
    accepted_at: null,
    revoked_at: null,
  });

  await db
    .collection("invite_index_by_email")
    .doc(email)
    .set({ invite_id: inviteId, tenant_id: tenantId, role, expires_at: expiresAt }, { merge: true });

  const loginUrl = FRONTEND_BASE_URL ? `${FRONTEND_BASE_URL}/login` : "";
  res.json({
    invite_id: inviteId,
    tenant_id: tenantId,
    email,
    role,
    status: "pending",
    created_by: req.ctx.sub,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    accepted_at: null,
    revoked_at: null,
    login_url: loginUrl,
  });
});

app.get("/v1/invites", requireAuth, requireCtx, requireAdmin, async (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  if (status && !["pending", "accepted", "revoked", "expired"].includes(status)) {
    return res.status(422).json({ detail: "invalid status filter" });
  }

  const snaps = await db
    .collection("invites")
    .where("tenant_id", "==", req.ctx.tenant_id)
    .limit(100)
    .get();

  const loginUrl = FRONTEND_BASE_URL ? `${FRONTEND_BASE_URL}/login` : "";
  const out = [];
  for (const doc of snaps.docs) {
    const d = doc.data() || {};
    if (status && String(d.status || "") !== status) continue;
    out.push({
      invite_id: String(d.invite_id || doc.id),
      tenant_id: String(d.tenant_id || ""),
      email: String(d.email || ""),
      role: String(d.role || ""),
      status: String(d.status || ""),
      created_by: String(d.created_by || ""),
      created_at: d.created_at?.toDate ? d.created_at.toDate().toISOString() : null,
      expires_at: d.expires_at?.toDate ? d.expires_at.toDate().toISOString() : null,
      accepted_at: d.accepted_at?.toDate ? d.accepted_at.toDate().toISOString() : null,
      revoked_at: d.revoked_at?.toDate ? d.revoked_at.toDate().toISOString() : null,
      login_url: loginUrl,
    });
  }
  res.json(out);
});

// Accept both:
// - POST /v1/invites/{invite_id}:revoke
// - POST /v1/invites/{invite_id}/revoke
app.post(
  /^\/v1\/invites\/([^/]+)(?::revoke|\/revoke)$/,
  requireAuth,
  requireCtx,
  requireAdmin,
  async (req, res) => {
  const inviteId = String(req.params?.[0] || "");
  if (!inviteId) return res.status(404).json({ error: "not_found" });

  const inviteRef = db.collection("invites").doc(inviteId);
  const snap = await inviteRef.get();
  if (!snap.exists) return res.status(404).json({ error: "not_found" });

  const d = snap.data() || {};
  if (String(d.tenant_id || "") !== req.ctx.tenant_id) return res.status(403).json({ detail: "forbidden" });

  if (String(d.status || "") === "pending") {
    const now = admin.firestore.Timestamp.now();
    await inviteRef.set(
      { status: "revoked", revoked_at: now, revoked_by: req.ctx.sub },
      { merge: true }
    );
    const email = normalizeEmail(String(d.email || ""));
    const idxRef = db.collection("invite_index_by_email").doc(email);
    const idxSnap = await idxRef.get();
    if (idxSnap.exists && String((idxSnap.data() || {}).invite_id || "") === inviteId) {
      await idxRef.delete();
    }
  }

  const updated = await inviteRef.get();
  const u = updated.data() || {};
  const loginUrl = FRONTEND_BASE_URL ? `${FRONTEND_BASE_URL}/login` : "";
  res.json({
    invite_id: String(u.invite_id || inviteId),
    tenant_id: String(u.tenant_id || ""),
    email: String(u.email || ""),
    role: String(u.role || ""),
    status: String(u.status || ""),
    created_by: String(u.created_by || ""),
    created_at: u.created_at?.toDate ? u.created_at.toDate().toISOString() : null,
    expires_at: u.expires_at?.toDate ? u.expires_at.toDate().toISOString() : null,
    accepted_at: u.accepted_at?.toDate ? u.accepted_at.toDate().toISOString() : null,
    revoked_at: u.revoked_at?.toDate ? u.revoked_at.toDate().toISOString() : null,
    login_url: loginUrl,
  });
  }
);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`identity-api listening on :${PORT}`);
});

const cloudbase = require("@cloudbase/node-sdk");

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV,
});

const db = app.database();
const COLLECTION = "expert_review_submissions";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://zudazhuang.github.io",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event.body) return {};
  const text = event.isBase64Encoded
    ? Buffer.from(event.body, "base64").toString("utf8")
    : event.body;
  return JSON.parse(text || "{}");
}

function normalizePayload(payload) {
  if (payload && payload.b && payload.r) return payload;
  const bg = payload.background || {};
  return {
    d: payload.draft_id || "",
    b: {
      v: bg.voter_id || bg.voterId || "",
      a: bg.affiliation || "",
      e: bg.education || "",
      m: bg.architecture_major || bg.architectureMajor || "",
      f: bg.frontline_design || bg.frontlineDesign || "",
      y: bg.design_years || bg.designYears || "",
      t: bg.tool_familiarity || bg.toolFamiliarity || "",
      n: (bg.note || "").slice(0, 160),
    },
    r: payload.rankings || "",
    s: payload.submitted_at || bg.submitted_at || new Date().toISOString(),
  };
}

function compactFromDoc(doc) {
  return {
    id: doc._id,
    d: doc.d || "",
    b: doc.b || {},
    r: doc.r || "",
    s: doc.s || "",
    created_at: doc.created_at || "",
    source: "cloudbase",
  };
}

async function listSubmissions() {
  const result = await db.collection(COLLECTION).orderBy("created_at", "asc").limit(1000).get();
  return response(200, {
    ok: true,
    submissions: (result.data || []).map(compactFromDoc),
    drafts: [],
  });
}

async function createSubmission(event) {
  const payload = normalizePayload(parseBody(event));
  if (!payload.b || !payload.b.v) return response(400, { ok: false, error: "missing voter_id" });
  if (!payload.r || payload.r.length !== 240 || payload.r.includes("_")) {
    return response(400, { ok: false, error: "incomplete rankings" });
  }
  const doc = {
    d: payload.d || "",
    b: payload.b,
    r: payload.r,
    s: payload.s || new Date().toISOString(),
    created_at: new Date().toISOString(),
    user_agent: event.headers?.["user-agent"] || event.headers?.["User-Agent"] || "",
  };
  const result = await db.collection(COLLECTION).add(doc);
  return response(200, { ok: true, id: result.id });
}

exports.main = async (event) => {
  const method = event.httpMethod || event.requestContext?.http?.method || "GET";
  if (method === "OPTIONS") return response(200, { ok: true });
  if (method === "POST") return createSubmission(event);
  return listSubmissions();
};

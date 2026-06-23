const SUBMIT_ENDPOINT = window.EXPERT_REVIEW_SUBMIT_ENDPOINT || "";
const SUBMIT_MODE = window.EXPERT_REVIEW_SUBMIT_MODE || "no-cors";
const PRIMARY_BACKEND = window.EXPERT_REVIEW_PRIMARY_BACKEND || {};
const REST_BACKEND = window.EXPERT_REVIEW_BACKEND || {};
const STORAGE_KEY = "cbd_expert_review_draft_v2";
const DRAFT_ID_KEY = "cbd_expert_review_draft_id";
const BACKGROUND_FIELD_IDS = [
  "voterId",
  "affiliation",
  "education",
  "architectureMajor",
  "frontlineDesign",
  "designYears",
  "toolFamiliarity",
  "note",
];

const cases = [
  ["01", "A形框架茶室"],
  ["02", "山地游客中心"],
  ["03", "庭院社区中心"],
  ["04", "河畔咖啡馆"],
  ["05", "黑盒剧场"],
  ["06", "船屋亭廊"],
  ["07", "山坡旅馆"],
  ["08", "植物温室"],
];

const casePrompts = {
  "01": "一个干净的湖边A形框架茶室的建筑3D模型。强调陡峭的坡屋顶、温暖的木质内饰、玻璃端墙和一个安静的水边露台。使用克制的现代体量、清晰的建筑构件、一个简洁的场地基座和一个水面。",
  "02": "一个干净的山地游客中心建筑3D模型。强调顺应坡地的错层体量、清晰的主入口、面向景观的玻璃界面、观景平台、坡道或台阶组织，以及简洁的地形基座。使用现代建筑语言、清晰构件和可读的公共到达空间。",
  "03": "一个干净的庭院式社区中心建筑3D模型。强调围合庭院、清晰的公共入口、连续的廊下空间、面向内院的玻璃界面、低矮现代体量和简洁的场地基座。建筑应表现出社区公共性、空间可达性和清晰的屋顶层级。",
  "04": "一个干净的河畔咖啡馆建筑3D模型。强调面向水面的开放立面、轻薄屋顶或雨棚、沿河露台、清晰柱网、透明用餐空间和简洁的岸线场地。使用克制现代体量、清楚的结构构件和安静的水边氛围。",
  "05": "一个干净的小型黑盒剧场及前厅建筑3D模型。强调封闭深色的演出体量、低矮透明的前厅、清晰主入口、前场台阶或坡道、屋顶天窗、辅助体量和简洁场地基座。建筑应体现剧场的内向性与入口公共性的对比。",
  "06": "一个干净的水边船屋亭廊建筑3D模型。强调开放的停船或下水空间、轻质屋顶、透明栏杆、临水平台、细柱支撑、坡道或码头连接，以及清晰的水面与岸线基座。建筑应体现轻盈、开放和可到达的水边活动属性。",
  "07": "一个干净的山坡旅馆建筑3D模型。强调顺坡布置的客房单元、层层退台、面向景观的露台、连续步道或入口平台、清晰屋顶层级、植被与坡地边界。建筑应体现山地住宿的组团关系、地形适应和景观朝向。",
  "08": "一个干净的植物温室及教育中心建筑3D模型。强调透明温室主体、可读的拱形或坡屋顶框架、植物展示空间、访客流线、附属教学或服务空间、简洁基座和清晰结构构件。建筑应体现温室的透明性、教育功能和轻质建构特征。",
};

const dimensions = [
  ["functionality", "功能适配"],
  ["build_quality", "建构合规"],
  ["impact", "形式表现"],
];

const groups = [
  {
    id: "group1",
    name: "对比组一",
    figure: "组一",
    candidates: [
      ["A", "方案A"],
      ["B", "方案B"],
      ["C", "方案C"],
      ["D", "方案D"],
      ["E", "方案E"],
    ],
  },
  {
    id: "group2",
    name: "对比组二",
    figure: "组二",
    candidates: [
      ["A", "方案A"],
      ["B", "方案B"],
      ["C", "方案C"],
      ["D", "方案D"],
      ["E", "方案E"],
    ],
  },
];

const state = {};
let csvBlobUrl = "";
let latestJson = "";
let draftSaveTimer = 0;
let cloudDraftSaveTimer = 0;
let currentDraftId = "";
let creatingDraft = null;

function keyOf(groupId, caseId, dimId) {
  return `${groupId}|${caseId}|${dimId}`;
}

function questionKeys() {
  const keys = [];
  for (const group of groups) {
    for (const [caseId] of cases) {
      for (const [dimId] of dimensions) {
        keys.push(keyOf(group.id, caseId, dimId));
      }
    }
  }
  return keys;
}

function encodeRankings() {
  return questionKeys()
    .map((qKey) => (state[qKey] || []).join("").padEnd(5, "_").slice(0, 5))
    .join("");
}

function decodeRankings(code = "") {
  const decoded = {};
  questionKeys().forEach((qKey, index) => {
    decoded[qKey] = code
      .slice(index * 5, index * 5 + 5)
      .split("")
      .filter((item) => item && item !== "_");
  });
  return decoded;
}

function candidateLabel(group, code) {
  const item = group.candidates.find(([candidateCode]) => candidateCode === code);
  return item ? item[1] : code;
}

function backendReady() {
  return Boolean(REST_BACKEND.baseUrl && (REST_BACKEND.type === "crudcrud" || REST_BACKEND.indexId));
}

function primaryBackendReady() {
  return Boolean(PRIMARY_BACKEND.type === "google_apps_script" && PRIMARY_BACKEND.submitUrl);
}

function objectUrl(id) {
  return `${REST_BACKEND.baseUrl.replace(/\/$/, "")}/${id}`;
}

async function backendCreate(name, data) {
  const response = await fetch(REST_BACKEND.baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, data }),
  });
  if (!response.ok) throw new Error(`后台创建失败：${response.status}`);
  return response.json();
}

async function backendGet(id) {
  const response = await fetch(objectUrl(id), { cache: "no-store" });
  if (!response.ok) throw new Error(`后台读取失败：${response.status}`);
  return response.json();
}

async function backendPut(id, name, data) {
  const response = await fetch(objectUrl(id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, data }),
  });
  if (!response.ok) throw new Error(`后台更新失败：${response.status}`);
  return response.json();
}

function crudUrl(collection, id = "") {
  return `${REST_BACKEND.baseUrl.replace(/\/$/, "")}/${collection}${id ? `/${id}` : ""}`;
}

async function crudCreate(collection, data) {
  const response = await fetch(crudUrl(collection), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`后台创建失败：${response.status}`);
  return response.json();
}

async function crudGet(collection, id) {
  const response = await fetch(crudUrl(collection, id), { cache: "no-store" });
  if (!response.ok) throw new Error(`后台读取失败：${response.status}`);
  return response.json();
}

async function crudPut(collection, id, data) {
  const response = await fetch(crudUrl(collection, id), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`后台更新失败：${response.status}`);
}

async function crudList(collection) {
  const response = await fetch(crudUrl(collection), { cache: "no-store" });
  if (!response.ok) throw new Error(`后台读取失败：${response.status}`);
  return response.json();
}

async function crudDelete(collection, id) {
  const response = await fetch(crudUrl(collection, id), { method: "DELETE" });
  if (!response.ok) throw new Error(`后台删除失败：${response.status}`);
}

function voterKey(value) {
  return String(value || "").trim().toLowerCase();
}

function buildSurvey() {
  const root = document.querySelector("#survey");
  root.innerHTML = "";
  for (const group of groups) {
    const section = document.createElement("section");
    section.className = "group";
    section.innerHTML = `
      <div class="group-title">
        <h3>${group.name}</h3>
          <span class="score-note">匿名候选方案A-E</span>
      </div>
    `;
    for (const [caseId, caseName] of cases) {
      const card = document.createElement("article");
      card.className = "case-card";
      card.innerHTML = `
        <div class="case-title">
          <h3>${caseId} ${caseName}</h3>
          <span class="score-note">候选：方案A / 方案B / 方案C / 方案D / 方案E</span>
        </div>
        <p class="case-prompt"><strong>任务提示词：</strong>${casePrompts[caseId]}</p>
        <figure class="case-figure">
          <a href="assets/cases/${group.id}_${caseId}.jpg" target="_blank" rel="noreferrer">
            <picture>
              <source media="(max-width: 700px)" srcset="assets/cases_mobile/${group.id}_${caseId}.jpg" />
              <img src="assets/cases/${group.id}_${caseId}.jpg" alt="${group.name} ${caseId} ${caseName} comparison" loading="lazy" />
            </picture>
          </a>
          <figcaption>${group.name} / ${caseId} ${caseName}：请根据上方匿名候选图完成下方三个维度排序。</figcaption>
        </figure>
        <div class="ranking-table-wrap">
          <table class="ranking-table">
            <thead>
              <tr>
                <th>名次</th>
                ${dimensions.map(([, dimName]) => `<th>${dimName}</th>`).join("")}
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
        <div class="dimension-statuses"></div>
      `;
      const tbody = card.querySelector("tbody");
      const statuses = card.querySelector(".dimension-statuses");
      for (let rank = 1; rank <= group.candidates.length; rank += 1) {
        const row = document.createElement("tr");
        row.innerHTML = `<th>第${rank}名<br><span>${6 - rank}分</span></th>`;
        for (const [dimId, dimName] of dimensions) {
          const qKey = keyOf(group.id, caseId, dimId);
          const select = document.createElement("select");
          select.dataset.key = qKey;
          select.dataset.rank = String(rank);
          select.setAttribute("aria-label", `${caseId} ${caseName} ${dimName} 第${rank}名`);
          select.innerHTML = [
            `<option value="">请选择</option>`,
            ...group.candidates.map(([code, name]) => `<option value="${code}">${name}</option>`),
          ].join("");
          select.addEventListener("change", () => updateOrderFromSelects(qKey));
          const cell = document.createElement("td");
          cell.append(select);
          row.append(cell);
        }
        tbody.append(row);
      }
      for (const [dimId, dimName] of dimensions) {
        const qKey = keyOf(group.id, caseId, dimId);
        const question = document.createElement("div");
        question.className = "question";
        question.dataset.key = qKey;
        state[qKey] = [];
        question.innerHTML = `
          <strong>${dimName}</strong>
          <span class="rank-row" aria-live="polite">尚未选择</span>
          <span class="mini-actions">
            <button class="muted clear" type="button">清空</button>
          </span>
        `;
        question.querySelector(".clear").addEventListener("click", () => {
          for (const select of document.querySelectorAll(`select[data-key="${qKey}"]`)) {
            select.value = "";
          }
          state[qKey] = [];
          renderQuestion(qKey);
          queueDraftSave();
        });
        statuses.append(question);
      }
      section.append(card);
    }
    root.append(section);
  }
}

function updateOrderFromSelects(qKey) {
  state[qKey] = Array.from(document.querySelectorAll(`select[data-key="${qKey}"]`))
    .map((select) => select.value)
    .filter(Boolean);
  renderQuestion(qKey);
  queueDraftSave();
}

function renderQuestion(qKey) {
  const question = document.querySelector(`.question[data-key="${qKey}"]`);
  if (!question) return;
  const [groupId] = qKey.split("|");
  const group = groups.find((item) => item.id === groupId);
  const order = state[qKey];
  const hasDuplicate = new Set(order).size !== order.length;
  const isPartial = order.length > 0 && order.length < group.candidates.length;
  question.classList.toggle("invalid", hasDuplicate || isPartial);
  for (const select of document.querySelectorAll(`select[data-key="${qKey}"]`)) {
    for (const option of select.options) {
      if (!option.value) {
        option.disabled = false;
        continue;
      }
      option.disabled = order.includes(option.value) && option.value !== select.value;
    }
  }
  const rankRow = question.querySelector(".rank-row");
  if (!order.length) {
    rankRow.innerHTML = `<span class="score-note">尚未选择</span>`;
    return;
  }
  if (hasDuplicate) {
    rankRow.innerHTML = `<span class="rank-warning">同一维度内候选方案不能重复，请修改。</span>`;
  } else if (order.length === group.candidates.length) {
    rankRow.innerHTML = `<span class="rank-done">已完成</span>`;
  } else {
    rankRow.innerHTML = `<span class="score-note">已选择 ${order.length}/5</span>`;
  }
}

function getBackground() {
  return {
    voter_id: document.querySelector("#voterId").value.trim(),
    education: document.querySelector("#education").value,
    architecture_major: document.querySelector("#architectureMajor").value,
    frontline_design: document.querySelector("#frontlineDesign").value,
    design_years: document.querySelector("#designYears").value,
    tool_familiarity: document.querySelector("#toolFamiliarity").value,
    affiliation: document.querySelector("#affiliation").value.trim(),
    note: document.querySelector("#note").value.trim(),
    submitted_at: new Date().toISOString(),
  };
}

function getBackgroundDraft() {
  const draft = {};
  for (const id of BACKGROUND_FIELD_IDS) {
    draft[id] = document.querySelector(`#${id}`)?.value || "";
  }
  return draft;
}

function getDraftStorageKey() {
  return currentDraftId ? `${STORAGE_KEY}_${currentDraftId}` : STORAGE_KEY;
}

function compactDraft() {
  return {
    draft_id: currentDraftId,
    background: getBackgroundDraft(),
    rankings: encodeRankings(),
    saved_at: new Date().toISOString(),
  };
}

function compactForBackend(draft) {
  const bg = draft.background || {};
  return {
    d: draft.draft_id || "",
    b: {
      v: bg.voterId || bg.voter_id || "",
      a: bg.affiliation || "",
      e: bg.education || "",
      m: bg.architectureMajor || bg.architecture_major || "",
      f: bg.frontlineDesign || bg.frontline_design || "",
      y: bg.designYears || bg.design_years || "",
      t: bg.toolFamiliarity || bg.tool_familiarity || "",
      n: (bg.note || "").slice(0, 160),
    },
    r: typeof draft.rankings === "string" ? draft.rankings : encodeRankings(),
    s: draft.saved_at || draft.submitted_at || new Date().toISOString(),
  };
}

function expandBackendPayload(data) {
  if (!data || !data.b) return data;
  return {
    draft_id: data.d || "",
    background: {
      voterId: data.b.v || "",
      voter_id: data.b.v || "",
      affiliation: data.b.a || "",
      education: data.b.e || "",
      architectureMajor: data.b.m || "",
      architecture_major: data.b.m || "",
      frontlineDesign: data.b.f || "",
      frontline_design: data.b.f || "",
      designYears: data.b.y || "",
      design_years: data.b.y || "",
      toolFamiliarity: data.b.t || "",
      tool_familiarity: data.b.t || "",
      note: data.b.n || "",
      submitted_at: data.s || "",
    },
    rankings: data.r || "",
    saved_at: data.s || "",
    submitted_at: data.s || "",
  };
}

function saveDraft(showMessage = false) {
  const payload = compactDraft();
  try {
    localStorage.setItem(getDraftStorageKey(), JSON.stringify(payload));
  } catch {
    if (showMessage) {
      document.querySelector("#status").textContent = "当前浏览器无法暂存进度，请勿关闭页面。";
    }
    return;
  }
  if (showMessage) {
    const status = document.querySelector("#status");
    status.textContent = `已暂存进度。同一设备、同一浏览器再次打开页面时会自动恢复。`;
    saveCloudDraft().then(() => {
      if (currentDraftId) {
        status.textContent = `已暂存进度。同一设备、同一浏览器再次打开页面时会自动恢复。`;
      }
    }).catch(() => {
      status.textContent = `已在本机暂存进度。云端暂存失败时，请不要清理浏览器数据。`;
    });
  }
}

function queueDraftSave() {
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => saveDraft(false), 250);
}

function queueCloudDraftSave() {
  clearTimeout(cloudDraftSaveTimer);
  cloudDraftSaveTimer = setTimeout(() => {}, 1200);
}

async function saveCloudDraft() {
  if (!backendReady()) return;
  await ensureCloudDraft();
  if (!currentDraftId) return;
  try {
    if (REST_BACKEND.type === "crudcrud") {
      await crudPut("drafts", currentDraftId, compactForBackend(compactDraft()));
    } else {
      await backendPut(currentDraftId, "cbd-expert-review-draft", compactForBackend(compactDraft()));
    }
  } catch {
    // Local autosave still protects the current browser session.
  }
}

function setDraftId(id) {
  if (!id) return;
  currentDraftId = id;
  try {
    localStorage.setItem(DRAFT_ID_KEY, id);
  } catch {}
  const url = new URL(window.location.href);
  if (url.searchParams.get("draft") !== id) {
    url.searchParams.set("draft", id);
    window.history.replaceState(null, "", url.toString());
  }
}

async function ensureCloudDraft() {
  if (!backendReady()) return "";
  if (currentDraftId) return currentDraftId;
  if (creatingDraft) return creatingDraft;
  const createDraft = REST_BACKEND.type === "crudcrud"
    ? crudCreate("drafts", compactForBackend(compactDraft())).then((created) => ({ id: created._id }))
    : backendCreate("cbd-expert-review-draft", compactForBackend(compactDraft()));
  creatingDraft = createDraft
    .then((created) => {
      setDraftId(created.id);
      return created.id;
    })
    .finally(() => {
      creatingDraft = null;
    });
  return creatingDraft;
}

function applyDraft(draft, sourceLabel = "") {
  if (!draft) return;
  draft = expandBackendPayload(draft);
  for (const [id, value] of Object.entries(draft.background || {})) {
    const field = document.querySelector(`#${id}`);
    if (field) field.value = value;
  }
  const rankings = typeof draft.rankings === "string" ? decodeRankings(draft.rankings) : draft.rankings || {};
  for (const [qKey, order] of Object.entries(rankings)) {
    if (!Array.isArray(order)) continue;
    state[qKey] = order.filter(Boolean);
    const selects = Array.from(document.querySelectorAll(`select[data-key="${qKey}"]`));
    selects.forEach((select, index) => {
      select.value = state[qKey][index] || "";
    });
    renderQuestion(qKey);
  }
  const status = document.querySelector("#status");
  if (draft.saved_at) {
    const savedAt = new Date(draft.saved_at);
    status.textContent = `已恢复${sourceLabel}暂存进度：${savedAt.toLocaleString()}`;
  }
}

function restoreLocalDraft() {
  let raw = "";
  try {
    raw = localStorage.getItem(getDraftStorageKey()) || localStorage.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  let draft;
  try {
    draft = JSON.parse(raw);
  } catch {
    return;
  }
  applyDraft(draft, "本机");
}

async function restoreCloudDraft() {
  if (!backendReady() || !currentDraftId) return;
  try {
    if (REST_BACKEND.type === "crudcrud") {
      const object = await crudGet("drafts", currentDraftId);
      applyDraft(object, "云端");
    } else {
      const object = await backendGet(currentDraftId);
      applyDraft(object.data, "云端");
    }
  } catch {}
}

async function initDraft() {
  const urlDraft = new URL(window.location.href).searchParams.get("draft");
  let storedDraft = "";
  try {
    storedDraft = localStorage.getItem(DRAFT_ID_KEY) || "";
  } catch {}
  if (urlDraft || storedDraft) setDraftId(urlDraft || storedDraft);
  restoreLocalDraft();
  if (currentDraftId) {
    await restoreCloudDraft();
  }
}

function bindDraftEvents() {
  for (const id of BACKGROUND_FIELD_IDS) {
    const field = document.querySelector(`#${id}`);
    field?.addEventListener("input", queueDraftSave);
    field?.addEventListener("change", queueDraftSave);
  }
  document.querySelector("#saveDraftBtn").addEventListener("click", () => saveDraft(true));
  window.addEventListener("pagehide", () => saveDraft(false));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveDraft(false);
  });
}

function validateForm() {
  const bg = getBackground();
  const missingBg = Object.entries(bg)
    .filter(([key, value]) => ["voter_id", "education", "architecture_major", "frontline_design", "design_years", "tool_familiarity"].includes(key) && !value)
    .map(([key]) => key);
  const missingQuestions = [];
  for (const group of groups) {
    for (const [caseId, caseName] of cases) {
      for (const [dimId, dimName] of dimensions) {
        const qKey = keyOf(group.id, caseId, dimId);
        if (state[qKey].length !== group.candidates.length) {
          missingQuestions.push(`${group.name} / ${caseId}${caseName} / ${dimName}`);
          document.querySelector(`.question[data-key="${qKey}"]`)?.classList.add("invalid");
        }
      }
    }
  }
  return { bg, missingBg, missingQuestions };
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildRecords(bg) {
  const records = [];
  for (const group of groups) {
    for (const [caseId, caseName] of cases) {
      for (const [dimId, dimName] of dimensions) {
        const qKey = keyOf(group.id, caseId, dimId);
        state[qKey].forEach((code, index) => {
          const method = group.candidates.find(([candidateCode]) => candidateCode === code)?.[1] || code;
          records.push({
            ...bg,
            comparison_group: group.name,
            group_id: group.id,
            case_id: caseId,
            case_name: caseName,
            dimension_id: dimId,
            dimension: dimName,
            rank: index + 1,
            score: 5 - index,
            candidate_code: code,
            method,
          });
        });
      }
    }
  }
  return records;
}

function buildCompactSubmission(bg) {
  return {
    draft_id: currentDraftId,
    background: bg,
    rankings: encodeRankings(),
    submitted_at: bg.submitted_at,
    source_url: window.location.href,
  };
}

function toCsv(records) {
  const headers = [
    "voter_id",
    "affiliation",
    "education",
    "architecture_major",
    "frontline_design",
    "design_years",
    "tool_familiarity",
    "note",
    "submitted_at",
    "comparison_group",
    "group_id",
    "case_id",
    "case_name",
    "dimension_id",
    "dimension",
    "rank",
    "score",
    "candidate_code",
    "method",
  ];
  return [headers.join(","), ...records.map((record) => headers.map((header) => csvEscape(record[header])).join(","))].join("\n");
}

async function submitToRestBackend(compactSubmission, recordCount) {
  if (!backendReady()) throw new Error("未配置后台回收接口，当前结果尚未进入后台数据表。");
  if (REST_BACKEND.type === "crudcrud") {
    const created = await crudCreate("submissions", compactForBackend({
      ...compactSubmission,
      saved_at: compactSubmission.submitted_at,
    }));
    return `已提交到后台数据表，后台记录ID：${created._id}`;
  }
  const created = await backendCreate("cbd-expert-review-submission", compactForBackend({
    ...compactSubmission,
    saved_at: compactSubmission.submitted_at,
  }));
  const indexObject = await backendGet(REST_BACKEND.indexId);
  const indexData = indexObject.data || {};
  const maxIds = REST_BACKEND.maxIdsPerPage || 18;
  let pages = Array.isArray(indexData.pages) ? indexData.pages : [];
  if (!pages.length) {
    const page = await backendCreate("cbd-expert-review-index-page", { ids: [] });
    pages = [page.id];
    indexData.pages = pages;
    await backendPut(REST_BACKEND.indexId, indexObject.name || "cbd-expert-review-index-v2", indexData);
  }
  const lastPageId = pages[pages.length - 1];
  const pageObject = await backendGet(lastPageId);
  const pageData = pageObject.data || {};
  const ids = Array.isArray(pageData.ids) ? pageData.ids : [];
  if (ids.length >= maxIds) {
    const newPage = await backendCreate("cbd-expert-review-index-page", { ids: [created.id] });
    pages.push(newPage.id);
    indexData.pages = pages;
    indexData.updated_at = new Date().toISOString();
    await backendPut(REST_BACKEND.indexId, indexObject.name || "cbd-expert-review-index-v2", indexData);
  } else {
    ids.push(created.id);
    await backendPut(lastPageId, pageObject.name || "cbd-expert-review-index-page", { ids });
  }
  return `已提交到后台数据表，后台记录ID：${created.id}`;
}

async function cleanupLegacyDrafts(compactSubmission) {
  if (!backendReady() || REST_BACKEND.type !== "crudcrud") return;
  const submitted = compactForBackend(compactSubmission);
  const submittedVoter = voterKey(submitted.b?.v);
  if (!submittedVoter && !currentDraftId) return;
  const drafts = await crudList("drafts");
  const targets = drafts.filter((draft) => {
    const draftVoter = voterKey(draft.b?.v);
    return draft._id === currentDraftId || (submittedVoter && draftVoter === submittedVoter);
  });
  await Promise.allSettled(targets.map((draft) => crudDelete("drafts", draft._id)));
  try {
    if (currentDraftId && targets.some((draft) => draft._id === currentDraftId)) {
      localStorage.removeItem(DRAFT_ID_KEY);
      localStorage.removeItem(getDraftStorageKey());
      currentDraftId = "";
    }
  } catch {}
}

async function submitToPrimaryBackend(compactSubmission) {
  if (!primaryBackendReady()) throw new Error("未配置长期后台。");
  if (PRIMARY_BACKEND.type !== "google_apps_script") throw new Error("长期后台类型暂不支持。");
  await fetch(PRIMARY_BACKEND.submitUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(compactForBackend({
      ...compactSubmission,
      saved_at: compactSubmission.submitted_at,
    })),
  });
  return "已提交到长期后台数据表。";
}

async function trySubmit(payload, compactSubmission) {
  if (primaryBackendReady()) {
    try {
      const message = await submitToPrimaryBackend(compactSubmission);
      cleanupLegacyDrafts(compactSubmission).catch(() => {});
      return message;
    } catch (error) {
      if (!backendReady()) throw error;
    }
  }
  if (backendReady()) {
    const message = await submitToRestBackend(compactSubmission, payload.records.length);
    cleanupLegacyDrafts(compactSubmission).catch(() => {});
    return message;
  }
  if (!SUBMIT_ENDPOINT) return "未配置后台回收接口，当前结果尚未进入后台数据表。";
  if (SUBMIT_MODE === "no-cors") {
    await fetch(SUBMIT_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    return "已发送到后台回收接口，并生成本地备份结果。";
  }
  const response = await fetch(SUBMIT_ENDPOINT, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`在线提交失败：${response.status}`);
  return "已提交到后台数据表，并生成本地备份结果。";
}

async function generateOutput() {
  const status = document.querySelector("#status");
  const output = document.querySelector("#output");
  const { bg, missingBg, missingQuestions } = validateForm();
  if (missingBg.length || missingQuestions.length) {
    status.textContent = `请先补全表单。\n背景信息缺失：${missingBg.length ? missingBg.join(", ") : "无"}\n未完成排序题：${missingQuestions.length}题`;
    if (missingQuestions.length) status.textContent += `\n首个未完成：${missingQuestions[0]}`;
    return;
  }
  const records = buildRecords(bg);
  const csv = toCsv(records);
  const compactSubmission = buildCompactSubmission(bg);
  const payload = { background: bg, records };
  latestJson = JSON.stringify(payload, null, 2);
  output.value = latestJson;
  if (csvBlobUrl) URL.revokeObjectURL(csvBlobUrl);
  csvBlobUrl = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const filename = `expert_review_${bg.voter_id || "anonymous"}_${new Date().toISOString().slice(0, 10)}.csv`;
  const downloadBtn = document.querySelector("#downloadBtn");
  downloadBtn.disabled = false;
  downloadBtn.onclick = () => {
    const link = document.createElement("a");
    link.href = csvBlobUrl;
    link.download = filename;
    link.click();
  };
  const copyBtn = document.querySelector("#copyBtn");
  copyBtn.disabled = false;
  copyBtn.onclick = async () => {
    await navigator.clipboard.writeText(latestJson);
    status.textContent = "JSON结果已复制。";
  };
  const mailBtn = document.querySelector("#mailBtn");
  mailBtn.classList.remove("disabled");
  mailBtn.setAttribute("aria-disabled", "false");
  mailBtn.href = `mailto:?subject=${encodeURIComponent("专家评审结果")}&body=${encodeURIComponent(latestJson.slice(0, 18000))}`;
  try {
    const submitMsg = await trySubmit(payload, compactSubmission);
    status.textContent = `${submitMsg}\n共生成 ${records.length} 条评分记录。`;
  } catch (error) {
    status.textContent = `${error.message}\n共生成 ${records.length} 条评分记录。后台提交未成功，请下载CSV或复制JSON作为备份。`;
  }
}

document.querySelector("#generateBtn").addEventListener("click", generateOutput);
buildSurvey();
bindDraftEvents();
initDraft();

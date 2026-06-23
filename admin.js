const BACKEND = window.EXPERT_REVIEW_BACKEND || {};

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

const dimensions = [
  ["functionality", "功能适配"],
  ["build_quality", "建构合规"],
  ["impact", "形式表现"],
];

const groups = [
  ["group1", "对比组一"],
  ["group2", "对比组二"],
];

let loadedSubmissions = [];
let loadedRecords = [];
let loadedDrafts = [];

function objectUrl(id) {
  return `${BACKEND.baseUrl.replace(/\/$/, "")}/${id}`;
}

async function backendGet(id) {
  const response = await fetch(objectUrl(id), { cache: "no-store" });
  if (!response.ok) throw new Error(`后台读取失败：${response.status}`);
  return response.json();
}

function crudUrl(collection) {
  return `${BACKEND.baseUrl.replace(/\/$/, "")}/${collection}`;
}

async function crudList(collection) {
  const response = await fetch(crudUrl(collection), { cache: "no-store" });
  if (!response.ok) throw new Error(`后台读取失败：${response.status}`);
  return response.json();
}

function keyOf(groupId, caseId, dimId) {
  return `${groupId}|${caseId}|${dimId}`;
}

function questionKeys() {
  const keys = [];
  for (const [groupId] of groups) {
    for (const [caseId] of cases) {
      for (const [dimId] of dimensions) {
        keys.push(keyOf(groupId, caseId, dimId));
      }
    }
  }
  return keys;
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

function normalizeSubmission(data) {
  if (!data || !data.b) return data || {};
  return {
    draft_id: data.d || "",
    background: {
      voter_id: data.b.v || "",
      affiliation: data.b.a || "",
      education: data.b.e || "",
      architecture_major: data.b.m || "",
      frontline_design: data.b.f || "",
      design_years: data.b.y || "",
      tool_familiarity: data.b.t || "",
      note: data.b.n || "",
      submitted_at: data.s || "",
    },
    rankings: data.r || "",
    submitted_at: data.s || "",
  };
}

function expandRecords(submission) {
  const bg = submission.background || {};
  const rankings = typeof submission.rankings === "string" ? decodeRankings(submission.rankings) : submission.rankings || {};
  const records = [];
  for (const [groupId, groupName] of groups) {
    for (const [caseId, caseName] of cases) {
      for (const [dimId, dimName] of dimensions) {
        const order = rankings[keyOf(groupId, caseId, dimId)] || [];
        order.forEach((code, index) => {
          records.push({
            voter_id: bg.voter_id || "",
            affiliation: bg.affiliation || "",
            education: bg.education || "",
            architecture_major: bg.architecture_major || "",
            frontline_design: bg.frontline_design || "",
            design_years: bg.design_years || "",
            tool_familiarity: bg.tool_familiarity || "",
            note: bg.note || "",
            submitted_at: submission.submitted_at || bg.submitted_at || "",
            comparison_group: groupName,
            group_id: groupId,
            case_id: caseId,
            case_name: caseName,
            dimension_id: dimId,
            dimension: dimName,
            rank: index + 1,
            score: 5 - index,
            candidate_code: code,
            method: `方案${code}`,
            backend_id: submission.backend_id || "",
            draft_id: submission.draft_id || "",
          });
        });
      }
    }
  }
  return records;
}

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
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
    "backend_id",
    "draft_id",
  ];
  return [headers.join(","), ...records.map((record) => headers.map((header) => csvEscape(record[header])).join(","))].join("\n");
}

function downloadText(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function renderRows(ids, submissions) {
  const tbody = document.querySelector("#submissionRows");
  tbody.innerHTML = "";
  submissions.forEach((submission, index) => {
    const bg = submission.background || {};
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${bg.voter_id || ""}</td>
      <td>${bg.affiliation || ""}</td>
      <td>${bg.education || ""}</td>
      <td>${bg.architecture_major || ""}</td>
      <td>${bg.frontline_design || ""}</td>
      <td>${submission.submitted_at || ""}</td>
      <td>${submission.backend_id || ids[index] || ""}</td>
    `;
    tbody.append(row);
  });
}

function draftProgress(draft) {
  const rankings = typeof draft.rankings === "string" ? draft.rankings : draft.r || "";
  if (!rankings) return { completed: 0, total: questionKeys().length };
  let completed = 0;
  const total = questionKeys().length;
  for (let index = 0; index < total; index += 1) {
    const chunk = rankings.slice(index * 5, index * 5 + 5);
    if (chunk.length === 5 && !chunk.includes("_")) completed += 1;
  }
  return { completed, total };
}

function renderDraftRows(drafts) {
  const tbody = document.querySelector("#draftRows");
  if (!tbody) return;
  tbody.innerHTML = "";
  drafts.forEach((draft, index) => {
    const normalized = normalizeSubmission(draft);
    const bg = normalized.background || {};
    const progress = draftProgress(normalized);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${bg.voter_id || ""}</td>
      <td>${bg.affiliation || ""}</td>
      <td>${bg.education || ""}</td>
      <td>${progress.completed}/${progress.total}</td>
      <td>${normalized.submitted_at || ""}</td>
      <td>${draft._id || ""}</td>
    `;
    tbody.append(row);
  });
}

async function refreshData() {
  const status = document.querySelector("#adminStatus");
  const output = document.querySelector("#adminOutput");
  if (!BACKEND.baseUrl || !BACKEND.indexId) {
    if (BACKEND.type === "crudcrud" && BACKEND.baseUrl) {
      status.textContent = "正在读取后台数据...";
      const [list, drafts] = await Promise.all([
        crudList("submissions").catch(() => []),
        crudList("drafts").catch(() => []),
      ]);
      const submissions = list.map((item) => ({ ...normalizeSubmission(item), backend_id: item._id }));
      loadedDrafts = drafts;
      loadedSubmissions = submissions;
      loadedRecords = submissions.flatMap(expandRecords);
      renderRows(submissions.map((item) => item.backend_id), submissions);
      renderDraftRows(drafts);
      output.value = JSON.stringify({ submissions, drafts }, null, 2);
      document.querySelector("#downloadCsvBtn").disabled = !loadedRecords.length;
      document.querySelector("#downloadJsonBtn").disabled = !loadedSubmissions.length;
      status.textContent = `已读取 ${loadedSubmissions.length} 份正式答卷，展开为 ${loadedRecords.length} 条评分记录；另有 ${loadedDrafts.length} 条暂存记录。`;
      return;
    }
    status.textContent = "未配置后台索引。";
    return;
  }
  status.textContent = "正在读取后台数据...";
  const indexObject = await backendGet(BACKEND.indexId);
  const pages = indexObject.data?.pages || [];
  const ids = [];
  for (const pageId of pages) {
    const page = await backendGet(pageId);
    ids.push(...(page.data?.ids || []));
  }
  const submissions = [];
  for (const id of ids) {
    const object = await backendGet(id);
    submissions.push({ ...normalizeSubmission(object.data), backend_id: id });
  }
  loadedSubmissions = submissions;
  loadedRecords = submissions.flatMap(expandRecords);
  renderRows(ids, submissions);
  output.value = JSON.stringify({ index: indexObject.data, ids, submissions }, null, 2);
  document.querySelector("#downloadCsvBtn").disabled = !loadedRecords.length;
  document.querySelector("#downloadJsonBtn").disabled = !loadedSubmissions.length;
  status.textContent = `已读取 ${loadedSubmissions.length} 份答卷，展开为 ${loadedRecords.length} 条评分记录。`;
}

document.querySelector("#refreshBtn").addEventListener("click", () => {
  refreshData().catch((error) => {
    document.querySelector("#adminStatus").textContent = error.message;
  });
});

document.querySelector("#downloadCsvBtn").addEventListener("click", () => {
  downloadText(`expert_review_records_${new Date().toISOString().slice(0, 10)}.csv`, "\ufeff" + toCsv(loadedRecords), "text/csv;charset=utf-8");
});

document.querySelector("#downloadJsonBtn").addEventListener("click", () => {
  downloadText(`expert_review_submissions_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(loadedSubmissions, null, 2), "application/json;charset=utf-8");
});

refreshData().catch((error) => {
  document.querySelector("#adminStatus").textContent = error.message;
});

const SUBMIT_ENDPOINT = "";

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

function keyOf(groupId, caseId, dimId) {
  return `${groupId}|${caseId}|${dimId}`;
}

function candidateLabel(group, code) {
  const item = group.candidates.find(([candidateCode]) => candidateCode === code);
  return item ? item[1] : code;
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
        <figure class="case-figure">
          <a href="assets/cases/${group.id}_${caseId}.jpg" target="_blank" rel="noreferrer">
            <img src="assets/cases/${group.id}_${caseId}.jpg" alt="${group.name} ${caseId} ${caseName} comparison" loading="lazy" />
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

function toCsv(records) {
  const headers = [
    "voter_id",
    "education",
    "architecture_major",
    "frontline_design",
    "design_years",
    "tool_familiarity",
    "affiliation",
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

async function trySubmit(payload) {
  if (!SUBMIT_ENDPOINT) return "未配置在线回收接口，已生成本地导出结果。";
  const response = await fetch(SUBMIT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`在线提交失败：${response.status}`);
  return "已在线提交，并生成本地备份结果。";
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
    const submitMsg = await trySubmit(payload);
    status.textContent = `${submitMsg}\n共生成 ${records.length} 条评分记录。请下载CSV并发送给研究者，或复制JSON。`;
  } catch (error) {
    status.textContent = `${error.message}\n共生成 ${records.length} 条评分记录。请下载CSV并发送给研究者，或复制JSON。`;
  }
}

document.querySelector("#generateBtn").addEventListener("click", generateOutput);
buildSurvey();

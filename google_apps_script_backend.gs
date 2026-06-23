const SHEET_NAME = 'submissions';

function ensureSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  const headers = [
    'id',
    'created_at',
    'submitted_at',
    'draft_id',
    'voter_id',
    'affiliation',
    'education',
    'architecture_major',
    'frontline_design',
    'design_years',
    'tool_familiarity',
    'note',
    'rankings',
    'payload_json',
  ];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function parsePayload_(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  const payload = JSON.parse(raw);
  if (payload && payload.b && payload.r) return payload;
  const bg = payload.background || {};
  return {
    d: payload.draft_id || '',
    b: {
      v: bg.voter_id || bg.voterId || '',
      a: bg.affiliation || '',
      e: bg.education || '',
      m: bg.architecture_major || bg.architectureMajor || '',
      f: bg.frontline_design || bg.frontlineDesign || '',
      y: bg.design_years || bg.designYears || '',
      t: bg.tool_familiarity || bg.toolFamiliarity || '',
      n: (bg.note || '').slice(0, 160),
    },
    r: payload.rankings || '',
    s: payload.submitted_at || bg.submitted_at || new Date().toISOString(),
  };
}

function compactFromRow_(row) {
  return {
    id: row[0],
    d: row[3],
    b: {
      v: row[4],
      a: row[5],
      e: row[6],
      m: row[7],
      f: row[8],
      y: row[9],
      t: row[10],
      n: row[11],
    },
    r: row[12],
    s: row[2],
    created_at: row[1],
  };
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const payload = parsePayload_(e);
    const bg = payload.b || {};
    const id = Utilities.getUuid();
    const createdAt = new Date().toISOString();
    const sheet = ensureSheet_();
    sheet.appendRow([
      id,
      createdAt,
      payload.s || createdAt,
      payload.d || '',
      bg.v || '',
      bg.a || '',
      bg.e || '',
      bg.m || '',
      bg.f || '',
      bg.y || '',
      bg.t || '',
      bg.n || '',
      payload.r || '',
      JSON.stringify(payload),
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, id }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const callback = e && e.parameter ? e.parameter.callback : '';
  const sheet = ensureSheet_();
  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1).filter(row => row[0]);
  const data = {
    ok: true,
    submissions: rows.map(compactFromRow_),
    drafts: [],
  };
  const json = JSON.stringify(data);
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

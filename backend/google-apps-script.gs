const SHEET_NAME = "expert_review_records";

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const sheet = getSheet_();
  const rows = payload.records.map((record) => [
    payload.background.voter_id,
    payload.background.affiliation,
    payload.background.education,
    payload.background.architecture_major,
    payload.background.frontline_design,
    payload.background.design_years,
    payload.background.tool_familiarity,
    payload.background.note,
    payload.background.submitted_at,
    record.comparison_group,
    record.group_id,
    record.case_id,
    record.case_name,
    record.dimension_id,
    record.dimension,
    record.rank,
    record.score,
    record.candidate_code,
    record.method,
  ]);
  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, rows: rows.length }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
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
    ]);
  }
  return sheet;
}

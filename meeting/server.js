const express = require('express');
const multer  = require('multer');
const ExcelJS = require('exceljs');
const XLSX    = require('xlsx');
const path    = require('path');

const app    = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(path.join(__dirname, 'public')));

// ── 색상 정의 (ExcelJS ARGB) ─────────────────────────────────────────────────
const C = {
  red:           'FFF28E86',  // 빨강    (#F28E86) : LG=0, 경쟁사>0
  darkerYellow:  'FFF1C232',  // 더진한노랑 (#F1C232) : 0 < LG < 13.25
  darkYellow:    'FFFFD966',  // 진한노랑  (#FFD966) : 13.25 ≤ LG < 25.5
  yellow:        'FFFFE599',  // 노랑    (#FFE599) : 25.5 ≤ LG < 37.75
  lightYellow:   'FFFFF2CC',  // 연한노랑  (#FFF2CC) : 37.75 ≤ LG < 50
  lighterYellow: 'FFFFFDE8',  // 더연한노랑 (#FFFDE8) : LG ≥ 50
  green:         'FFD9EAD3',  // 연한초록  (#D9EAD3) : LG ≥ 경쟁사
  gray:          'FFD9D9D9',  // 회색    (#D9D9D9) : LG=0, 경쟁사=0
  white:         'FFFFFFFF',  // 흰색           : 값 없음
};

function getColor(lg, comp) {
  if (lg === null || lg === undefined || comp === null || comp === undefined)
    return C.white;

  lg   = Number(lg)   || 0;
  comp = Number(comp) || 0;

  if (lg === 0 && comp === 0) return C.gray;
  if (lg === 0 && comp  >  0) return C.red;
  if (lg >= comp)             return C.green;

  // LG < 경쟁사 구간별
  if (lg <  13.25) return C.darkerYellow;
  if (lg <  25.5)  return C.darkYellow;
  if (lg <  37.75) return C.yellow;
  if (lg <  50)    return C.lightYellow;
  return C.lighterYellow; // lg >= 50
}

// ── 파일 처리 엔드포인트 ────────────────────────────────────────────────────
app.post('/process', upload.single('file'), async (req, res) => {
  try {
    // 1) xlsx로 원본 읽기 (메모리 버퍼에서 직접 읽기)
    const xlsxWb  = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet   = xlsxWb.Sheets[xlsxWb.SheetNames[0]];
    const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    const maxCols = Math.max(...allRows.map(r => (r || []).length));
    const pad = r => { const a = [...(r || [])]; while (a.length < maxCols) a.push(null); return a; };

    // 2) 헤더 2행 + 데이터 3행 그룹
    const hdr1     = pad(allRows[0]);
    const hdr2     = pad(allRows[1]);
    const dataRows = allRows.slice(2);

    const DATA_COL = 4; // 국가값 시작 컬럼(0-based)

    const groups = [];
    for (let i = 0; i < dataRows.length; i += 3) {
      groups.push({
        gapRow: pad(dataRows[i]),
        maxRow: pad(dataRows[i + 1]),
        lgRow:  pad(dataRows[i + 2]),
      });
    }

    // 3) ExcelJS로 결과 작성
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Heatmap');

    const borderAll = {
      top:    { style: 'thin', color: { argb: 'FFB0B0B0' } },
      bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      left:   { style: 'thin', color: { argb: 'FFB0B0B0' } },
      right:  { style: 'thin', color: { argb: 'FFB0B0B0' } },
    };

    const fillSolid = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

    // 헤더 행
    [hdr1, hdr2].forEach((rowData, idx) => {
      const r = ws.addRow(rowData);
      r.font = { bold: true, size: 10 };
      r.eachCell({ includeEmpty: true }, cell => {
        cell.fill   = fillSolid('FF4472C4');
        cell.font   = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        cell.border = borderAll;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      });
    });

    // 데이터 행 (Visibility Gap 행만)
    groups.forEach(({ gapRow, maxRow, lgRow }, groupIdx) => {
      const displayVals = gapRow.map((val, idx) => {
        if (idx < DATA_COL) return val;
        if (val === null || val === undefined) return '-';
        if (typeof val === 'number') return Math.round(val * 100) / 100;
        return val;
      });

      const r = ws.addRow(displayVals);
      r.height = 18;

      r.eachCell({ includeEmpty: true }, (cell, colNum) => {
        const idx = colNum - 1; // 0-based

        if (idx < DATA_COL) {
          // 레이블 셀 — 흰 배경
          cell.fill = fillSolid('FFFFFFFF');
          cell.font = { bold: idx === 0 || idx === 1, size: 10 };
        } else {
          const rawVal = gapRow[idx];
          let color;

          if (rawVal === null || rawVal === undefined) {
            color = C.white;
          } else {
            color = getColor(lgRow[idx], maxRow[idx]);
          }

          cell.fill = fillSolid(color);
          cell.font = { size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }

        cell.border = borderAll;
      });
    });

    // 열 너비
    ws.getColumn(1).width = 14;
    ws.getColumn(2).width = 14;
    ws.getColumn(3).width = 28;
    ws.getColumn(4).width = 24;
    for (let c = 5; c <= maxCols; c++) ws.getColumn(c).width = 11;

    // 상단 2행 고정
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

    // 4) 응답
    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',
      'attachment; filename="heatmap_result.xlsx"');

    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// 로컬 실행용 (Vercel 환경에서는 module.exports로 처리)
if (process.env.VERCEL !== '1') {
  const PORT = 3002;
  app.listen(PORT, () =>
    console.log(`\n✅  Heatmap 서버 실행 중 → http://localhost:${PORT}\n`)
  );
}

module.exports = app;

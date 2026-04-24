const express = require('express');
const multer  = require('multer');
const ExcelJS = require('exceljs');
const XLSX    = require('xlsx');
const path    = require('path');

const app    = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.static(path.join(__dirname, 'public')));

// ── 색상 정의 (ExcelJS ARGB) ─────────────────────────────────────────────────
const DEFAULT_C = {
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

function hexToArgb(hex) {
  return 'FF' + hex.replace('#', '').toUpperCase();
}

function getColor(lg, comp, C) {
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
    // 커스텀 색상 병합 (프론트에서 JSON 문자열로 전달)
    const C = { ...DEFAULT_C };
    if (req.body && req.body.colors) {
      try {
        const customHex = JSON.parse(req.body.colors);
        for (const [key, hex] of Object.entries(customHex)) {
          if (key in C) C[key] = hexToArgb(hex);
        }
      } catch {}
    }
    // 1) xlsx로 원본 읽기 (메모리 버퍼에서 직접 읽기)
    const xlsxWb  = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet   = xlsxWb.Sheets[xlsxWb.SheetNames[0]];
    const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    const maxCols = Math.max(...allRows.map(r => (r || []).length));
    const pad = r => { const a = [...(r || [])]; while (a.length < maxCols) a.push(null); return a; };

    // 2) 헤더 2행 + 행 타입별 분류 (col[3] 기준)
    const hdr1     = pad(allRows[0]);
    const hdr2     = pad(allRows[1]);
    const dataRows = allRows.slice(2);

    // 라벨 열을 동적으로 찾아 행 타입과 데이터 시작 컬럼을 함께 반환
    function detectRow(row) {
      for (let col = 2; col <= Math.min(5, row.length - 1); col++) {
        const v = String(row[col] || '').toLowerCase();
        if (v.includes('gap'))                        return { type: 'gap', dataCol: col + 1 };
        if (v.includes('max'))                        return { type: 'max', dataCol: col + 1 };
        if (v.includes('lg') || v.includes('평균'))   return { type: 'lg',  dataCol: col + 1 };
      }
      return { type: 'other', dataCol: 4 };
    }

    const typedRows = dataRows.map((r, i) => {
      const row = pad(r);
      const { type, dataCol } = detectRow(row);
      return { type, row, absIdx: i, dataCol };
    });

    const gapEntries = typedRows.filter(t => t.type === 'gap');
    const groups = gapEntries.map((gapEntry, i) => {
      const nextGapAbsIdx = i + 1 < gapEntries.length ? gapEntries[i + 1].absIdx : Infinity;
      const inRange = t => t.absIdx > gapEntry.absIdx && t.absIdx < nextGapAbsIdx;
      const maxEntry = typedRows.find(t => t.type === 'max' && inRange(t));
      const lgEntry  = typedRows.find(t => t.type === 'lg'  && inRange(t));
      return {
        gapRow:  gapEntry.row,
        maxRow:  maxEntry ? maxEntry.row : pad([]),
        lgRow:   lgEntry  ? lgEntry.row  : pad([]),
        dataCol: gapEntry.dataCol,
      };
    });

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
    [hdr1, hdr2].forEach(rowData => {
      const r = ws.addRow(rowData);
      for (let colNum = 1; colNum <= maxCols; colNum++) {
        const cell = r.getCell(colNum);
        cell.fill      = fillSolid('FF4472C4');
        cell.font      = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        cell.border    = borderAll;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }
    });

    // 데이터 행 (Visibility Gap 행만)
    groups.forEach(({ gapRow, maxRow, lgRow, dataCol }) => {
      const displayVals = gapRow.map((val, idx) => {
        if (idx < dataCol) return val;
        if (val === null || val === undefined) return '-';
        if (typeof val === 'number') return Math.round(val * 100) / 100;
        return val;
      });

      const r = ws.addRow(displayVals);
      r.height = 18;

      for (let colNum = 1; colNum <= maxCols; colNum++) {
        const cell = r.getCell(colNum);
        const idx  = colNum - 1; // 0-based

        if (idx < dataCol) {
          cell.fill = fillSolid('FFFFFFFF');
          cell.font = { bold: idx === 0 || idx === 1, size: 10 };
        } else {
          const rawVal = gapRow[idx];
          const color  = (rawVal === null || rawVal === undefined)
            ? C.white
            : getColor(lgRow[idx], maxRow[idx], C);

          cell.fill      = fillSolid(color);
          cell.font      = { size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }

        cell.border = borderAll;
      }
    });

    // 열 너비
    ws.getColumn(1).width = 14;
    ws.getColumn(2).width = 14;
    ws.getColumn(3).width = 28;
    ws.getColumn(4).width = 24;
    for (let c = 5; c <= maxCols; c++) ws.getColumn(c).width = 11;

    // 상단 2행 고정
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 2 }];

    // 4) 응답 (Vercel 서버리스 환경: 스트리밍 대신 버퍼로 한 번에 전송)
    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',
      'attachment; filename="heatmap_result.xlsx"');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ── 디버그 엔드포인트 ────────────────────────────────────────────────────────
app.post('/debug', upload.single('file'), async (req, res) => {
  try {
    const xlsxWb  = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet   = xlsxWb.Sheets[xlsxWb.SheetNames[0]];
    const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

    const maxCols = Math.max(...allRows.map(r => (r || []).length));
    const pad = r => { const a = [...(r || [])]; while (a.length < maxCols) a.push(null); return a; };

    function detectRow(row) {
      for (let col = 2; col <= Math.min(5, row.length - 1); col++) {
        const v = String(row[col] || '').toLowerCase();
        if (v.includes('gap'))                      return { type: 'gap', dataCol: col + 1, labelCol: col };
        if (v.includes('max'))                      return { type: 'max', dataCol: col + 1, labelCol: col };
        if (v.includes('lg') || v.includes('평균')) return { type: 'lg',  dataCol: col + 1, labelCol: col };
      }
      return { type: 'other', dataCol: 4, labelCol: -1 };
    }

    const preview = allRows.slice(0, 10).map((r, i) => {
      const row = pad(r);
      const { type, dataCol, labelCol } = detectRow(row);
      return {
        rowIndex: i,
        type,
        labelCol,
        dataCol,
        cols_0_to_6: row.slice(0, 7),
      };
    });

    const dataRows = allRows.slice(2);
    const typedRows = dataRows.map((r, i) => {
      const row = pad(r);
      const { type, dataCol } = detectRow(row);
      return { type, absIdx: i, dataCol, col2: row[2], col3: row[3], col4: row[4] };
    });
    const gapCount = typedRows.filter(t => t.type === 'gap').length;
    const maxCount = typedRows.filter(t => t.type === 'max').length;
    const lgCount  = typedRows.filter(t => t.type === 'lg').length;

    res.json({
      totalRows: allRows.length,
      maxCols,
      first10Rows: preview,
      typedSummary: { gap: gapCount, max: maxCount, lg: lgCount, other: typedRows.length - gapCount - maxCount - lgCount },
      first5TypedRows: typedRows.slice(0, 5),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

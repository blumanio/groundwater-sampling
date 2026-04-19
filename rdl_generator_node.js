/**
 * rdl_generator_node.js — ACR di Reggiani Albertino S.P.A.
 * Genera RdL Excel in Node.js puro (ExcelJS) — funziona su Vercel/serverless.
 * 
 * Installa: npm install exceljs
 * 
 * Uso: const { generateRdl } = require('./rdl_generator_node');
 *      const buffer = await generateRdl(data, assetsDir);
 */

const ExcelJS = require('exceljs');
const path    = require('path');
const fs      = require('fs');

// ── Colori ────────────────────────────────────────────────────────────────────
const GRAY_FILL   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC0C0C0' } };
const YELLOW_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCC00' } };

// ── Border helpers ────────────────────────────────────────────────────────────
const _BM = { 0: null, 1: { style: 'hair' }, 2: { style: 'thin' }, 7: { style: 'hair' } };

function B(l=0, r=0, t=0, b=0) {
    const border = {};
    if (_BM[l]) border.left   = _BM[l];
    if (_BM[r]) border.right  = _BM[r];
    if (_BM[t]) border.top    = _BM[t];
    if (_BM[b]) border.bottom = _BM[b];
    return border;
}

// ── Cell setter ───────────────────────────────────────────────────────────────
function sc(ws, r, c, v, opts = {}) {
    const cell = ws.getCell(r, c);
    cell.value = v !== undefined ? v : null;
    cell.font = { name: 'Arial', bold: opts.bold || false, size: opts.sz || 10 };
    cell.alignment = {
        horizontal: opts.h || 'general',
        vertical:   'middle',
        wrapText:   opts.wrap || false,
    };
    cell.border = B(opts.bl||0, opts.br||0, opts.bt||0, opts.bb||0);
    if (opts.fill) cell.fill = opts.fill;
}

// ── Merge + set ───────────────────────────────────────────────────────────────
function M(ws, r1, r2, c1, c2, v, opts = {}) {
    ws.mergeCells(r1, c1, r2, c2);
    sc(ws, r1, c1, v, opts);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function generateRdl(data, assetsDir) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Rdl', {
        pageSetup: { orientation: 'landscape', paperSize: 9 }
    });

    // Column widths
    const widths = [9.9, 27.1, 13.4, 13.6, 31.0, 10.6, 21.4, 18.6, 24.1, 25.9];
    widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    // Row heights
    ws.getRow(1).height = 35.2;
    ws.getRow(2).height = 30.8;
    for (let r = 3; r <= 51; r++) ws.getRow(r).height = 14.2;

    const comm = data.committente || 'ENI  REWIND';

    // ── R1-R2: Testata ────────────────────────────────────────────────────────
    M(ws,1,2,1,2, '', { bl:2,br:2,bt:2,bb:2 });
    M(ws,1,2,3,4, `COMMITTENTE:\n${comm}`, { sz:8,h:'center',wrap:true,bl:2,br:2,bt:2,bb:2 });
    sc(ws,1,5, 'Contratto:', { bold:true,sz:8,h:'center',wrap:true,bl:2,br:2,bt:2,bb:2 });
    M(ws,1,1,6,7, data.data_str||'', { bold:true,sz:11,h:'center',bl:2,br:2,bt:2,bb:2 });
    M(ws,1,2,8,9, `${data.cantiere||''}\n${data.commessa||''}`, { bold:true,sz:8,h:'left',wrap:true,bl:2,br:2,bt:2,bb:2 });
    sc(ws,1,10, 'RAPPORTO GIORNALIERO DEI LAVORI', { sz:8,h:'center',bl:2,br:2,bt:2,bb:2 });
    sc(ws,2,5, `Ordine Di Lavoro n.:\n${data.ordine_lavoro||''}`, { bold:true,sz:8,h:'center',wrap:true,bl:2,br:2,bt:2,bb:2 });
    M(ws,2,2,6,7, `condizioni metereologiche: ${data.meteo||'sereno'}`, { bold:true,sz:8,h:'center',wrap:true,bl:2,br:2,bt:2,bb:2 });
    sc(ws,2,10, `n. ${data.n_rdl||'1'}`, { bold:true,sz:11,h:'right',bl:2,br:2,bt:2,bb:2 });

    // ── R3: DESCRIZIONE LAVORI — GRIGIO ───────────────────────────────────────
    sc(ws,3,1, 'DESCRIZIONE LAVORI', { bold:true,sz:9,h:'left',bl:2,br:0,bt:2,bb:2,fill:GRAY_FILL });
    for (let c=2;c<=9;c++) sc(ws,3,c,'',{ bl:0,br:0,bt:2,bb:2,fill:GRAY_FILL });
    sc(ws,3,10,'',{ bl:2,br:2,bt:2,bb:2,fill:GRAY_FILL });

    // ── R4-R16: Descrizione ───────────────────────────────────────────────────
    const desc = data.descrizione_lavori || [];
    for (let i=0;i<13;i++) {
        const r=4+i, txt=desc[i]||'';
        M(ws,r,r,1,9, txt, { sz:11,h:'left',bl:2,br:1,bt:7,bb:7 });
        sc(ws,r,10,'',{ bl:1,br:2,bt:7,bb:7 });
    }

    // ── R17: FORNITURA / NOLEGGIO — GRIGIO ───────────────────────────────────
    M(ws,17,17,1,5,'FORNITURA   MATERIALI   IN   OPERA',{ bold:true,sz:9,h:'center',bl:2,br:2,bt:2,bb:2,fill:GRAY_FILL });
    M(ws,17,17,6,10,'NOLEGGIO  MEZZI  E  ATTREZZATURE  DA  CANTIERE',{ bold:true,sz:9,h:'center',bl:2,br:2,bt:2,bb:2,fill:GRAY_FILL });

    // R18: headers
    [[1,'art.'],[2,'descrizione'],[3,'unità di mis.'],[4,'quantità'],[5,'impiego']].forEach(([c,l]) =>
        sc(ws,18,c,l,{ sz:8,h:'center',bl:c===1?2:1,br:c===5?2:1,bt:2,bb:1 }));
    sc(ws,18,6,'art.',{ sz:8,h:'center',bl:0,br:1,bt:2,bb:1 });
    M(ws,18,18,7,8,'descrizione',{ sz:8,h:'center',bl:1,br:1,bt:2,bb:1 });
    sc(ws,18,9,'ore',{ sz:8,h:'center',bl:1,br:1,bt:2,bb:1 });
    sc(ws,18,10,'impiego',{ sz:8,h:'center',bl:1,br:2,bt:2,bb:1 });

    // R19-R25: noleggio + materiali opera
    const noleggio  = data.noleggio || [];
    const matOpera  = data.materiali_opera || [];
    for (let i=0;i<7;i++) {
        const r=19+i;
        const m=matOpera[i]||{}, n=noleggio[i]||{};
        sc(ws,r,1,m.art||'',{ sz:10,bl:2,br:1,bt:7,bb:7 });
        sc(ws,r,2,m.descrizione||'',{ sz:10,bl:1,br:1,bt:7,bb:7 });
        sc(ws,r,3,m.unita||'',{ sz:10,bl:1,br:1,bt:7,bb:7 });
        sc(ws,r,4,m.quantita||'',{ sz:10,h:'center',bl:1,br:1,bt:7,bb:7 });
        sc(ws,r,5,m.impiego||'',{ sz:10,bl:1,br:2,bt:7,bb:7 });
        sc(ws,r,6,'',{ sz:10,bl:0,br:1,bt:7,bb:7 });
        M(ws,r,r,7,8,n.descrizione||'',{ sz:10,h:'left',bl:1,br:1,bt:7,bb:7 });
        sc(ws,r,9,String(n.ore||''),{ sz:10,h:'center',bl:1,br:1,bt:7,bb:7 });
        sc(ws,r,10,n.impiego||'',{ sz:10,bl:1,br:2,bt:7,bb:7 });
    }

    // ── R26: FORNITURA PIE' OPERA — GRIGIO ────────────────────────────────────
    M(ws,26,26,1,5,"FORNITURA   MATERIALI   A  PIE'  OPERA",{ bold:true,sz:9,h:'center',bl:2,br:2,bt:2,bb:2,fill:GRAY_FILL });
    for (let c=6;c<=10;c++) sc(ws,26,c,'',{ bl:c===6?0:1,br:c===10?2:1,bt:7,bb:7 });
    [[1,'art.'],[2,'descrizione'],[3,'unità di mis.'],[4,'quantità'],[5,'impiego']].forEach(([c,l]) =>
        sc(ws,27,c,l,{ sz:8,h:'center',bl:c===1?2:1,br:c===5?2:1,bt:2,bb:1 }));
    for (let c=6;c<=10;c++) sc(ws,27,c,'',{ bl:c===6?0:1,br:c===10?2:1,bt:7,bb:7 });

    const matPiedi = data.materiali_piedi || [];
    for (let i=0;i<6;i++) {
        const r=28+i, m=matPiedi[i]||{};
        sc(ws,r,1,m.art||'',{ sz:10,bl:2,br:1,bt:7,bb:7 });
        sc(ws,r,2,m.descrizione||'',{ sz:10,bl:1,br:1,bt:7,bb:7 });
        sc(ws,r,3,m.unita||'',{ sz:10,bl:1,br:1,bt:7,bb:7 });
        sc(ws,r,4,m.quantita||'',{ sz:10,h:'center',bl:1,br:1,bt:7,bb:7 });
        sc(ws,r,5,m.impiego||'',{ sz:10,bl:1,br:2,bt:7,bb:7 });
    }

    // ── R29: NOTE LAVORI — GIALLO ─────────────────────────────────────────────
    M(ws,29,29,6,10,'NOTE LAVORI',{ bold:true,sz:8,h:'left',bl:2,br:2,bt:2,bb:2,fill:YELLOW_FILL });
    M(ws,30,33,6,10,data.note_lavori||'',{ sz:10,h:'left',wrap:true,bl:2,br:2,bt:0,bb:2 });

    // ── R34: LAVORI A MISURA — GRIGIO ─────────────────────────────────────────
    M(ws,34,34,1,5,'LAVORI A MISURA',{ bold:true,sz:9,h:'center',bl:2,br:2,bt:2,bb:2,fill:GRAY_FILL });
    M(ws,34,36,6,10,'',{ bl:2,br:2,bt:7,bb:7 });
    [[1,'art.'],[2,'descrizione'],[3,'unità di mis.'],[4,'quantità'],[5,'impiego']].forEach(([c,l]) =>
        sc(ws,35,c,l,{ sz:8,h:'center',bl:c===1?2:1,br:c===5?2:1,bt:2,bb:1 }));

    const lavMis = data.lavori_misura || [];
    for (let i=0;i<3;i++) {
        const r=36+i, m=lavMis[i]||{};
        sc(ws,r,1,m.art||'',{ sz:8,bl:2,br:1,bt:7,bb:7 });
        sc(ws,r,2,m.descrizione||'',{ sz:8,bl:1,br:1,bt:7,bb:7 });
        sc(ws,r,3,m.unita||'',{ sz:8,bl:1,br:1,bt:7,bb:7 });
        sc(ws,r,4,m.quantita||'',{ sz:8,h:'center',bl:1,br:1,bt:7,bb:7 });
        sc(ws,r,5,m.impiego||'',{ sz:10,bl:1,br:2,bt:7,bb:7 });
    }

    // ── R39: NOTE SICUREZZA — GIALLO ──────────────────────────────────────────
    M(ws,39,39,6,10,'NOTE SICUREZZA',{ bold:true,sz:8,h:'left',bl:2,br:2,bt:2,bb:2,fill:YELLOW_FILL });
    for (const r of [37,38]) M(ws,r,r,6,10,'',{ bl:2,br:2,bt:7,bb:7 });
    M(ws,40,41,6,10,data.note_sicurezza||'',{ sz:10,h:'left',wrap:true,bl:2,br:2,bt:7,bb:7 });

    // ── R42: MANODOPERA — GRIGIO ──────────────────────────────────────────────
    M(ws,42,42,1,5,'PRESTAZIONI DI MANODOPERA IN ECONOMIA',{ bold:true,sz:9,h:'center',bl:2,br:2,bt:2,bb:2,fill:GRAY_FILL });
    M(ws,42,42,6,10,'',{ bl:2,br:2,bt:7,bb:7,fill:GRAY_FILL });
    M(ws,43,43,1,2,'nominativo',{ sz:8,h:'center',bl:2,br:1,bt:2,bb:1 });
    sc(ws,43,3,'qualifica',{ sz:8,h:'center',bl:0,br:1,bt:2,bb:1 });
    sc(ws,43,4,'ore',{ sz:8,h:'center',bl:1,br:1,bt:2,bb:1 });
    sc(ws,43,5,'Impiego',{ sz:8,h:'center',bl:1,br:2,bt:2,bb:1 });
    M(ws,43,43,6,10,'',{ bl:2,br:2,bt:7,bb:7 });

    const mano = data.manodopera || [];
    for (let i=0;i<3;i++) {
        const r=44+i, m=mano[i]||{};
        M(ws,r,r,1,2,m.nominativo||'',{ sz:9,h:'center',bl:2,br:0,bt:i===0?1:7,bb:7 });
        sc(ws,r,3,m.qualifica||'',{ sz:8,h:'center',bl:0,br:1,bt:7,bb:7 });
        sc(ws,r,4,m.ore||'',{ sz:11,h:'center',bl:1,br:1,bt:7,bb:7 });
        sc(ws,r,5,m.impiego||'',{ sz:10,h:'left',bl:1,br:2,bt:0,bb:7 });
        M(ws,r,r,6,10,'',{ bl:2,br:2,bt:7,bb:r===46?2:7 });
    }

    // ── R47-R49: Firma ────────────────────────────────────────────────────────
    M(ws,47,49,6,7,' Committente',{ sz:10,h:'center',bl:2,br:0,bt:2,bb:2 });
    M(ws,47,47,8,10,'Contrattista',{ sz:10,h:'left',bl:1,br:1,bt:2,bb:0 });
    for (const r of [48,49]) M(ws,r,r,8,10,'',{ bold:true,sz:8,h:'center',bl:1,br:1,bt:0,bb:2 });
    for (let r=47;r<=49;r++) {
        M(ws,r,r,1,2,'',{ sz:9,h:'center',bl:2,br:1,bt:7,bb:r<49?7:2 });
        sc(ws,r,3,'',{ sz:8,bl:0,br:1,bt:7,bb:r<49?7:2 });
        sc(ws,r,4,'',{ sz:11,bl:1,br:1,bt:7,bb:r<49?7:2 });
        sc(ws,r,5,'',{ sz:10,bl:1,br:2,bt:0,bb:r<49?7:2 });
    }

    // ── Immagini (opzionale) ──────────────────────────────────────────────────
    if (assetsDir) {
        const logos = [
            { file: 'logo_eni.png',       row: 1, col: 1, w: 55, h: 50 },
            { file: 'logo_acr_strip.jpg', row: 2, col: 1, w: 170, h: 35 },
        ];
        for (const logo of logos) {
            const p = path.join(assetsDir, logo.file);
            if (fs.existsSync(p)) {
                try {
                    const ext  = logo.file.split('.').pop().toLowerCase();
                    const imgId = wb.addImage({ filename: p, extension: ext });
                    ws.addImage(imgId, {
                        tl: { col: logo.col - 1, row: logo.row - 1 },
                        ext: { width: logo.w, height: logo.h },
                    });
                } catch(e) { console.warn('Image skip:', e.message); }
            }
        }
    }

    // ── Output come Buffer ────────────────────────────────────────────────────
    return await wb.xlsx.writeBuffer();
}

module.exports = { generateRdl };
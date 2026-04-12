// app/api/rdl/generate/route.ts
// This API route loads the original .xls template, clears data cells,
// fills in new data, and returns the styled XLSX file.
//
// Requirements: npm install exceljs
// Place the original template at: public/templates/RdL_template.xlsx
// (convert from .xls to .xlsx first using LibreOffice or Excel)

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import path from "path";
import fs from "fs";

// ─── Cell map: which cells contain dynamic data ────────────────────────────────
// These are the cells we clear and refill. Everything else (borders, fills,
// fonts, logos, merged cells) is preserved from the template.

const HEADER_CELLS = {
    data: "F1",           // "Data: DD/MM/YYYY\n"
    cantiere: "H1",       // "Cantiere: XXX\n"
    codiceCommessa: "E2",  // "Codice commessa:\nXXXXXXX"
    meteo: "F2",           // "Condizioni metereologiche: XXX\n"
};

// Descrizione lavori: rows 4-11, column A (merged A:I per row)
const DESCRIZIONE_ROWS = [4, 5, 6, 7, 8, 9, 10, 11];

// Left table: Fornitura/materiali columns A-E, rows 14-20
// Right table: Noleggio attrezzature columns F-J, rows 14-20
const TABLE_ROWS_MATERIALI = [14, 15, 16, 17, 18, 19, 20];
const MATERIALI_COLS = { art: "A", descrizione: "B", unitaMis: "C", quantita: "D", impiego: "E" };
const ATTREZZATURE_COLS = { art: "F", descrizione: "G", ore: "I", impiego: "J" };

// Fornitura materiali a piè d'opera: row 23, cols A-E
const FORNITURA_ROW = 23;

// Note lavori in economia: rows 25-28, cols F-J (merged)
const NOTE_ROWS = [25, 26, 27, 28];

// Lavori a misura: rows 31-33, cols A-E
const MISURA_ROWS = [31, 32, 33];

// Sicurezza: rows 35-36, cols F-J (merged)
const SICUREZZA_ROWS = [35, 36];

// Manodopera: rows 39-44, cols A-E
const MANODOPERA_START_ROW = 39;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Load the template
        const templatePath = path.join(process.cwd(), "public", "templates", "RdL_template.xlsx");

        if (!fs.existsSync(templatePath)) {
            return NextResponse.json(
                { error: "Template file not found. Place RdL_template.xlsx in public/templates/" },
                { status: 500 }
            );
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(templatePath);
        const sheet = workbook.getWorksheet("Rdl") || workbook.getWorksheet(1);

        if (!sheet) {
            return NextResponse.json({ error: "Sheet 'Rdl' not found in template" }, { status: 500 });
        }

        // ── Fill header cells ──────────────────────────────────────────────────────
        const setCell = (ref: string, value: string) => {
            const cell = sheet.getCell(ref);
            cell.value = value;
            // Style is preserved from template
        };

        setCell(HEADER_CELLS.data, `Data: ${body.data}\n               `);
        setCell(HEADER_CELLS.cantiere, `Cantiere: ${body.cantiere}\n`);
        setCell(HEADER_CELLS.codiceCommessa, `Codice commessa: \n${body.codiceCommessa || ""}`);
        setCell(HEADER_CELLS.meteo, `Condizioni metereologiche: ${body.meteo}\n`);

        // ── Fill Descrizione Lavori (rows 4-11, col A) ─────────────────────────────
        const descrizioni: string[] = body.descrizioniLavori || [];
        for (let i = 0; i < DESCRIZIONE_ROWS.length; i++) {
            const row = DESCRIZIONE_ROWS[i];
            setCell(`A${row}`, descrizioni[i] || "");
        }

        // ── Fill Materiali table (left side, rows 14-20) ───────────────────────────
        const materiali: any[] = body.materiali || [];
        for (let i = 0; i < TABLE_ROWS_MATERIALI.length; i++) {
            const row = TABLE_ROWS_MATERIALI[i];
            const item = materiali[i];
            setCell(`${MATERIALI_COLS.art}${row}`, item?.art || "");
            setCell(`${MATERIALI_COLS.descrizione}${row}`, item?.descrizione || "");
            setCell(`${MATERIALI_COLS.unitaMis}${row}`, item?.unitaMis || "");
            setCell(`${MATERIALI_COLS.quantita}${row}`, item?.quantita || "");
            setCell(`${MATERIALI_COLS.impiego}${row}`, item?.impiego || "");
        }

        // ── Fill Attrezzature table (right side, rows 14-20) ───────────────────────
        const attrezzature: any[] = body.attrezzature || [];
        for (let i = 0; i < TABLE_ROWS_MATERIALI.length; i++) {
            const row = TABLE_ROWS_MATERIALI[i];
            const item = attrezzature[i];
            setCell(`${ATTREZZATURE_COLS.art}${row}`, item?.art || "");
            setCell(`${ATTREZZATURE_COLS.descrizione}${row}`, item?.descrizione || "");
            setCell(`${ATTREZZATURE_COLS.ore}${row}`, item?.ore || "");
            setCell(`${ATTREZZATURE_COLS.impiego}${row}`, item?.impiego || "");
        }

        // ── Fill Note Lavori in Economia (rows 25-28, col F merged) ────────────────
        setCell(`F${NOTE_ROWS[0]}`, body.noteLavoriEconomia || "");
        for (let i = 1; i < NOTE_ROWS.length; i++) {
            setCell(`F${NOTE_ROWS[i]}`, "");
        }

        // ── Fill Lavori a Misura (rows 31-33, cols A-E) ────────────────────────────
        const lavoriMisura: any[] = body.lavoriMisura || [];
        for (let i = 0; i < MISURA_ROWS.length; i++) {
            const row = MISURA_ROWS[i];
            const item = lavoriMisura[i];
            setCell(`A${row}`, item?.art || "");
            setCell(`B${row}`, item?.descrizione || "");
            setCell(`C${row}`, item?.unitaMis || "");
            setCell(`D${row}`, item?.quantita || "");
            setCell(`E${row}`, item?.impiego || "");
        }

        // ── Fill Sicurezza (rows 35-36, col F merged) ──────────────────────────────
        setCell(`F${SICUREZZA_ROWS[0]}`, body.sicurezza || "");
        for (let i = 1; i < SICUREZZA_ROWS.length; i++) {
            setCell(`F${SICUREZZA_ROWS[i]}`, "");
        }

        // ── Fill Manodopera (starting row 39, cols A-E) ────────────────────────────
        const workers: any[] = body.workers || [];
        // Clear existing worker rows (39-44)
        for (let r = MANODOPERA_START_ROW; r <= 44; r++) {
            setCell(`A${r}`, "");
            setCell(`C${r}`, "");
            setCell(`D${r}`, "");
            setCell(`E${r}`, "");
        }
        // Fill workers
        for (let i = 0; i < Math.min(workers.length, 6); i++) {
            const row = MANODOPERA_START_ROW + i;
            const w = workers[i];
            setCell(`A${row}`, w?.nominativo || "");
            setCell(`C${row}`, w?.qualifica || "");
            setCell(`D${row}`, w?.ore || "");
            setCell(`E${row}`, w?.impiego || "");
        }

        // ── Generate the file ──────────────────────────────────────────────────────
        const buffer = await workbook.xlsx.writeBuffer();

        // Generate filename
        const dateStr = (body.data || "").replace(/\//g, "_");
        const cantiereStr = (body.cantiere || "report")
            .replace(/\s+/g, "_")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        const filename = `RdL_${cantiereStr}_${dateStr}.xlsx`;

        return new NextResponse(buffer as ArrayBuffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error("RdL generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate report", details: error.message },
            { status: 500 }
        );
    }
}
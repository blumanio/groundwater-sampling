import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";

// ═══════════════════════════════════════════════════════════════════════
// BONIFICA PRO v2 — Complete Remediation Site Management
// ═══════════════════════════════════════════════════════════════════════

// ─── AQA TEMPLATES ───────────────────────────────────────────────────
const AQA_TEMPLATES = {
  "Idrocarburi (PV/Distributori)": [
    { key: "benzene", label: "Benzene", unit: "mg/kg", limA: 0.1, limB: 2 },
    { key: "toluene", label: "Toluene", unit: "mg/kg", limA: 0.5, limB: 50 },
    { key: "etilbenzene", label: "Etilbenzene", unit: "mg/kg", limA: 0.5, limB: 50 },
    { key: "xileni", label: "Xileni", unit: "mg/kg", limA: 0.5, limB: 50 },
    { key: "stirene", label: "Stirene", unit: "mg/kg", limA: 0.5, limB: 50 },
    { key: "sommArom", label: "Σ Aromatici", unit: "mg/kg", limA: 1, limB: 100 },
    { key: "mtbe", label: "MTBE", unit: "mg/kg", limA: 10, limB: 250 },
    { key: "etbe", label: "ETBE", unit: "mg/kg", limA: 10, limB: 250 },
    { key: "hcLt12", label: "HC C<12", unit: "mg/kg", limA: 10, limB: 250 },
    { key: "hcGt12", label: "HC C>12", unit: "mg/kg", limA: 50, limB: 750 },
    { key: "pbTetra", label: "Pb Tetraetile", unit: "mg/kg", limA: 0.01, limB: 0.068 },
  ],
  "Metalli Pesanti": [
    { key: "as", label: "Arsenico", unit: "mg/kg", limA: 20, limB: 50 },
    { key: "cd", label: "Cadmio", unit: "mg/kg", limA: 2, limB: 15 },
    { key: "cr_tot", label: "Cromo tot.", unit: "mg/kg", limA: 150, limB: 800 },
    { key: "cr_vi", label: "Cromo VI", unit: "mg/kg", limA: 2, limB: 15 },
    { key: "hg", label: "Mercurio", unit: "mg/kg", limA: 1, limB: 5 },
    { key: "ni", label: "Nichel", unit: "mg/kg", limA: 120, limB: 500 },
    { key: "pb", label: "Piombo", unit: "mg/kg", limA: 100, limB: 1000 },
    { key: "cu", label: "Rame", unit: "mg/kg", limA: 120, limB: 600 },
    { key: "zn", label: "Zinco", unit: "mg/kg", limA: 150, limB: 1500 },
  ],
  "Solventi Clorurati": [
    { key: "pce", label: "PCE", unit: "mg/kg", limA: 0.5, limB: 20 },
    { key: "tce", label: "TCE", unit: "mg/kg", limA: 1, limB: 10 },
    { key: "dcm", label: "DCM", unit: "mg/kg", limA: 0.1, limB: 5 },
    { key: "vcm", label: "Cloruro Vinile", unit: "mg/kg", limA: 0.01, limB: 0.5 },
    { key: "12dce", label: "1,2-DCE", unit: "mg/kg", limA: 0.2, limB: 5 },
  ],
  "IPA (Policiclici Aromatici)": [
    { key: "bap", label: "Benzo(a)pirene", unit: "mg/kg", limA: 0.1, limB: 10 },
    { key: "baa", label: "Benzo(a)antracene", unit: "mg/kg", limA: 0.5, limB: 10 },
    { key: "bbf", label: "Benzo(b)fluorantene", unit: "mg/kg", limA: 0.5, limB: 10 },
    { key: "pyr", label: "Pirene", unit: "mg/kg", limA: 5, limB: 50 },
    { key: "naftalene", label: "Naftalene", unit: "mg/kg", limA: 5, limB: 50 },
    { key: "summIPA", label: "Σ IPA", unit: "mg/kg", limA: 10, limB: 100 },
  ],
};

const SOIL_TYPES = [
  "Terreno di riporto", "Riporto con inerti", "Riporto misto a rifiuti",
  "Sabbia", "Sabbia fine", "Sabbia media", "Sabbia limosa", "Sabbia ghiaiosa",
  "Limo", "Limo sabbioso", "Limo argilloso",
  "Argilla", "Argilla limosa", "Argilla sabbiosa",
  "Ghiaia", "Ghiaia sabbiosa", "Tout-venant",
  "Terreno vegetale", "Asfalto", "Calcestruzzo", "Sottofondo"
];

const SOIL_COLORS = {
  "Marrone": "#8B6914", "Marrone scuro": "#5C4033", "Marrone chiaro": "#C4A35A", "Marrone rossastro": "#8B4513",
  "Grigio": "#808080", "Grigio scuro": "#505050", "Grigio chiaro": "#B0B0B0", "Grigio verdastro": "#6B7E6B",
  "Nero": "#333", "Giallastro": "#C8B560", "Beige": "#D2B48C", "Rossastro": "#A0522D", "Biancastro": "#E8E0D0"
};

// ─── CER CODES for common remediation waste ──────────────────────────
const CER_CODES = [
  { code: "17.05.03*", desc: "Terra e rocce contenenti sostanze pericolose", hp: "HP4,HP5,HP6,HP7,HP14", adr: "Classe 9" },
  { code: "17.05.04", desc: "Terra e rocce non pericolose", hp: "-", adr: "Non ADR" },
  { code: "17.05.05*", desc: "Fanghi di dragaggio contenenti sostanze pericolose", hp: "HP4,HP14", adr: "Classe 9" },
  { code: "17.05.06", desc: "Fanghi di dragaggio non pericolosi", hp: "-", adr: "Non ADR" },
  { code: "17.01.01", desc: "Cemento", hp: "-", adr: "Non ADR" },
  { code: "17.01.07", desc: "Miscugli di cemento, mattoni, mattonelle", hp: "-", adr: "Non ADR" },
  { code: "17.09.03*", desc: "Rifiuti misti C&D contenenti sostanze pericolose", hp: "HP4,HP5,HP7", adr: "Classe 9" },
  { code: "17.09.04", desc: "Rifiuti misti C&D non pericolosi", hp: "-", adr: "Non ADR" },
  { code: "16.07.08*", desc: "Rifiuti contenenti olio minerale", hp: "HP3,HP7,HP14", adr: "Classe 3" },
  { code: "13.05.02*", desc: "Fanghi da separatori olio/acqua", hp: "HP3,HP14", adr: "Classe 3" },
];

const ADR_CLASSES = {
  "Classe 3": { label: "Liquidi infiammabili", un: "UN 3082/3077", placards: "Rombo bianco-rosso", kit: "Guanti nitrile, occhiali, tuta Tyvek" },
  "Classe 6.1": { label: "Materie tossiche", un: "UN 2811/2810", placards: "Rombo bianco con teschio", kit: "Maschera FFP3, tuta cat.III, guanti doppi" },
  "Classe 8": { label: "Materie corrosive", un: "UN 3264", placards: "Rombo bianco-nero mani", kit: "Guanti acido, visiera, stivali chimici" },
  "Classe 9": { label: "Materie pericolose diverse", un: "UN 3077 (solido) / UN 3082 (liquido)", placards: "Rombo bianco strisce verticali", kit: "Guanti nitrile, tuta standard" },
  "Non ADR": { label: "Non soggetto a normativa ADR", un: "-", placards: "Nessuno richiesto", kit: "DPI standard cantiere" },
};

// ─── STYLES ──────────────────────────────────────────────────────────
const C = {
  bg: "#0c1018", surface: "rgba(255,255,255,0.025)", border: "rgba(255,255,255,0.06)",
  accent: "#0ea5e9", green: "#10b981", red: "#ef4444", amber: "#f59e0b", purple: "#8b5cf6",
  muted: "rgba(255,255,255,0.4)", text: "#e2e8f0",
  font: "'Outfit', system-ui", mono: "'DM Mono', monospace",
};
const inp = (w) => ({
  background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, color: "#fff",
  borderRadius: 6, padding: "7px 10px", fontSize: 12, fontFamily: C.mono,
  width: w || "100%", boxSizing: "border-box", outline: "none"
});
const btn = (color = C.accent, small) => ({
  background: `${color}18`, border: `1px solid ${color}35`, color, borderRadius: 7,
  padding: small ? "4px 10px" : "8px 16px", cursor: "pointer", fontSize: small ? 10 : 12,
  fontFamily: C.mono, fontWeight: 600, whiteSpace: "nowrap"
});
const tag = (color) => ({
  display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px",
  borderRadius: 5, fontSize: 10, fontFamily: C.mono,
  background: `${color}15`, border: `1px solid ${color}30`, color
});
const lbl = { fontSize: 9, color: C.muted, fontFamily: C.mono, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3, display: "block" };
const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 };

function genId() { return Math.random().toString(36).substr(2, 8); }

// ─── EXCEL PARSER ────────────────────────────────────────────────────
function parseExcelAnalyses(data, contaminants) {
  try {
    const wb = XLSX.read(data, { type: "array", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    if (rows.length < 3) return { error: "File troppo corto" };

    // Find header row - look for "Punto" or "Campione" or first row with text
    let headerIdx = 0;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const row = rows[i].map(c => String(c).toLowerCase());
      if (row.some(c => c.includes("punto") || c.includes("campion") || c.includes("prelievo"))) {
        headerIdx = i; break;
      }
    }
    const headers = rows[headerIdx].map(h => String(h).toLowerCase().trim());

    // Skip limit row if present
    let dataStart = headerIdx + 1;
    const firstDataRow = rows[dataStart];
    if (firstDataRow && String(firstDataRow[0]).toLowerCase().includes("d.")) dataStart++;

    // Map columns
    const pointCol = headers.findIndex(h => h.includes("punto") || h.includes("prelievo") || h.includes("campion"));
    const dateCol = headers.findIndex(h => h.includes("data"));
    const depthCol = headers.findIndex(h => h.includes("campionamento") && h.includes("m") || h.includes("profon") || h.includes("(m)"));

    // Map contaminant columns
    const contMap = {};
    contaminants.forEach(cont => {
      const idx = headers.findIndex(h => {
        const cl = cont.label.toLowerCase();
        const parts = cl.split(/[\s()]/);
        return parts.some(p => p.length > 2 && h.includes(p));
      });
      if (idx >= 0) contMap[cont.key] = idx;
    });

    const parseVal = (v) => {
      if (v === null || v === undefined || v === "") return null;
      const s = String(v).trim();
      if (s.startsWith("<") || s.startsWith("&lt;")) return 0;
      const n = parseFloat(s.replace(",", "."));
      return isNaN(n) ? null : n;
    };

    const points = {};
    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i];
      if (!row[pointCol]) continue;
      const name = String(row[pointCol]).trim();
      const date = dateCol >= 0 && row[dateCol] ? (row[dateCol] instanceof Date ? row[dateCol].toISOString().split("T")[0] : String(row[dateCol])) : "";
      const depth = depthCol >= 0 ? String(row[depthCol] || "") : "";

      const values = {};
      let hasAny = false;
      Object.entries(contMap).forEach(([key, col]) => {
        const v = parseVal(row[col]);
        values[key] = v;
        if (v !== null && v > 0) hasAny = true;
      });

      if (!points[name]) points[name] = { name, samples: [] };
      points[name].samples.push({ id: genId(), depth, date, values, type: "Fondo scavo", odor: "", description: "" });
    }

    return { points: Object.values(points), contMap, headersMapped: Object.keys(contMap).length };
  } catch (e) {
    return { error: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// TAB: MAPPA CON OVERLAY
// ═══════════════════════════════════════════════════════════════════════
function MapTab({ project, points, setPoints, selectedId, setSelectedId }) {
  const mapContainerRef = useRef(null);
  const [dragTarget, setDragTarget] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef(null);

  // Unplaced points (imported but not on map yet)
  const unplacedPoints = points.filter(p => p.mapX === undefined || p.mapX === null);
  const placedPoints = points.filter(p => p.mapX !== undefined && p.mapX !== null);

  const handleMapDrop = (e) => {
    e.preventDefault();
    if (!dragTarget || !mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    // Adjust for zoom/pan
    const ax = (x - pan.x) / zoom;
    const ay = (y - pan.y) / zoom;

    setPoints(prev => prev.map(p => p.id === dragTarget ? { ...p, mapX: Math.max(0, Math.min(100, ax)), mapY: Math.max(0, Math.min(100, ay)) } : p));
    setDragTarget(null);
  };

  const handleMouseDown = (e) => {
    if (e.button === 1 || e.button === 2 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const getPointColor = (pt) => {
    const useA = project.limitColumn === "A";
    let worst = "none";
    for (const s of pt.samples) {
      for (const c of project.contaminants) {
        const v = s.values?.[c.key];
        if (v !== null && v !== undefined && v > 0) {
          const lim = useA ? c.limA : c.limB;
          if (v > lim) return C.red;
          if (v > lim * 0.5) worst = "warn";
        }
      }
    }
    if (pt.samples.length === 0) return "rgba(255,255,255,0.35)";
    return worst === "warn" ? C.amber : C.green;
  };

  return (
    <div style={{ display: "flex", gap: 12, height: "100%" }}>
      {/* Map area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!project.mapImage ? (
          <label style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            border: `2px dashed ${C.border}`, borderRadius: 12, cursor: "pointer", background: C.surface,
            minHeight: 400
          }}>
            <input type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => {
                const f = e.target.files[0]; if (!f) return;
                const r = new FileReader();
                r.onload = ev => project.onSetMap(ev.target.result, f.name);
                r.readAsDataURL(f);
              }} />
            <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.2 }}>🗺️</div>
            <div style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>Carica Planimetria Scavo</div>
            <div style={{ color: C.muted, fontSize: 11, marginTop: 6, fontFamily: C.mono, textAlign: "center", maxWidth: 300 }}>
              JPG o PNG — esporta dal CAD o usa la mappa di progetto. <br />I punti verranno trascinati sopra.
            </div>
          </label>
        ) : (
          <div ref={mapContainerRef}
            onDrop={handleMapDrop} onDragOver={e => e.preventDefault()}
            style={{
              position: "relative", flex: 1, borderRadius: 10, overflow: "hidden",
              border: `1px solid ${C.border}`, background: "#080c12", minHeight: 400,
              cursor: dragTarget ? "copy" : "default"
            }}>
            {/* The map image */}
            <img src={project.mapImage} alt="Planimetria"
              style={{ width: "100%", display: "block", userSelect: "none", pointerEvents: "none" }} draggable={false} />

            {/* Placed points overlay */}
            {placedPoints.map(pt => {
              const color = getPointColor(pt);
              const isSelected = selectedId === pt.id;
              const isHovered = hoveredPoint === pt.id;
              return (
                <div key={pt.id}
                  onMouseEnter={() => setHoveredPoint(pt.id)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onClick={() => setSelectedId(pt.id)}
                  draggable onDragStart={() => setDragTarget(pt.id)}
                  style={{
                    position: "absolute", left: `${pt.mapX}%`, top: `${pt.mapY}%`,
                    transform: "translate(-50%,-50%)", cursor: "grab", zIndex: isSelected ? 10 : 2
                  }}>
                  {/* Pulse for non-conforme */}
                  {color === C.red && <div style={{
                    position: "absolute", inset: -6, borderRadius: "50%",
                    border: `1.5px solid ${C.red}50`, animation: "pulse 2s infinite"
                  }} />}
                  <div style={{
                    width: isSelected ? 16 : 11, height: isSelected ? 16 : 11, borderRadius: "50%",
                    background: color, boxShadow: `0 0 ${isSelected ? 14 : 6}px ${color}60`,
                    border: isSelected ? "2px solid #fff" : "1.5px solid rgba(255,255,255,0.25)",
                    transition: "all 0.15s"
                  }} />
                  <div style={{
                    position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                    marginTop: 3, fontSize: 8, color: "#fff", fontFamily: C.mono, fontWeight: 600,
                    whiteSpace: "nowrap", textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)",
                    opacity: isSelected || isHovered ? 1 : 0.7
                  }}>
                    {pt.name}
                  </div>
                  {/* Hover tooltip */}
                  {isHovered && pt.samples.length > 0 && (
                    <div style={{
                      position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                      marginBottom: 8, background: "rgba(0,0,0,0.9)", border: `1px solid ${C.border}`,
                      borderRadius: 8, padding: "8px 10px", minWidth: 160, zIndex: 20, fontSize: 10
                    }}>
                      <div style={{ fontFamily: C.mono, fontWeight: 700, marginBottom: 4, color }}>{pt.name}</div>
                      <div style={{ color: C.muted, fontFamily: C.mono, fontSize: 9 }}>
                        {pt.samples.length} campioni · {pt.samples[0]?.date || ""}
                      </div>
                      {pt.samples.slice(0, 2).map((s, i) => {
                        const exceeded = project.contaminants.filter(c => {
                          const v = s.values?.[c.key];
                          return v > (project.limitColumn === "A" ? c.limA : c.limB);
                        });
                        return exceeded.length > 0 ? (
                          <div key={i} style={{ color: C.red, fontSize: 9, marginTop: 2 }}>
                            ⚠ {exceeded.map(c => `${c.label}=${s.values[c.key]}`).join(", ")}
                          </div>
                        ) : <div key={i} style={{ color: C.green, fontSize: 9, marginTop: 2 }}>✓ {s.depth}m conforme</div>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Legend */}
            <div style={{
              position: "absolute", bottom: 8, left: 8, display: "flex", gap: 10,
              background: "rgba(0,0,0,0.7)", padding: "6px 12px", borderRadius: 6
            }}>
              {[{ c: C.green, l: "Conforme" }, { c: C.amber, l: ">50% limite" }, { c: C.red, l: "Superamento" }, { c: "rgba(255,255,255,0.35)", l: "No dati" }].map(({ c, l }) => (
                <span key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, color: C.muted }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, display: "inline-block" }} />
                  {l}
                </span>
              ))}
            </div>

            {/* Change map button */}
            <label style={{
              position: "absolute", top: 8, right: 8, ...btn("rgba(255,255,255,0.4)", true),
              background: "rgba(0,0,0,0.6)", cursor: "pointer"
            }}>
              📁 Cambia mappa
              <input type="file" accept="image/*" style={{ display: "none" }}
                onChange={e => {
                  const f = e.target.files[0]; if (!f) return;
                  const r = new FileReader();
                  r.onload = ev => project.onSetMap(ev.target.result, f.name);
                  r.readAsDataURL(f);
                }} />
            </label>
          </div>
        )}
      </div>

      {/* Right sidebar: unplaced points queue */}
      {unplacedPoints.length > 0 && (
        <div style={{ width: 180, display: "flex", flexDirection: "column" }}>
          <div style={{ ...lbl, marginBottom: 8, color: C.amber }}>
            ⚠ PUNTI DA POSIZIONARE ({unplacedPoints.length})
          </div>
          <div style={{ fontSize: 9, color: C.muted, marginBottom: 8 }}>
            Trascina ogni punto sulla mappa
          </div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
            {unplacedPoints.map(pt => {
              const color = getPointColor(pt);
              return (
                <div key={pt.id} draggable
                  onDragStart={() => setDragTarget(pt.id)}
                  style={{
                    ...card, padding: "8px 10px", marginBottom: 0, cursor: "grab",
                    borderLeft: `3px solid ${color}`, display: "flex", alignItems: "center", gap: 8
                  }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, fontFamily: C.mono }}>{pt.name}</div>
                    <div style={{ fontSize: 9, color: C.muted }}>{pt.samples.length} camp.</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:.7;transform:scale(1.7)}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB: PUNTO DETTAGLIO
// ═══════════════════════════════════════════════════════════════════════
function PointTab({ point, updatePoint, project, deletePoint }) {
  if (!point) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, color: C.muted }}>
      <div style={{ fontSize: 48, opacity: 0.15, marginBottom: 12 }}>📍</div>
      <div style={{ fontSize: 14 }}>Seleziona un punto dalla sidebar</div>
    </div>
  );

  const useA = project.limitColumn === "A";
  const exc = point.excavation || { w: 4, l: 6, d: 3, deepenings: [], retreats: [] };

  const addSample = () => {
    const vals = {}; project.contaminants.forEach(c => vals[c.key] = null);
    updatePoint({ ...point, samples: [...point.samples, { id: genId(), type: "Fondo scavo", depth: "", depthFrom: "", depthTo: "", date: new Date().toISOString().split("T")[0], description: "", odor: "", values: vals }] });
  };

  const updateSample = (si, field, val) => {
    const s = [...point.samples]; s[si] = { ...s[si], [field]: val };
    updatePoint({ ...point, samples: s });
  };

  const updateVal = (si, key, val) => {
    const s = [...point.samples];
    s[si] = { ...s[si], values: { ...s[si].values, [key]: val === "" ? null : parseFloat(val) || 0 } };
    updatePoint({ ...point, samples: s });
  };

  const removeSample = (si) => updatePoint({ ...point, samples: point.samples.filter((_, i) => i !== si) });

  // Stratigraphy
  const addLayer = () => {
    const layers = point.stratigraphy || [];
    const last = layers.length > 0 ? layers[layers.length - 1].to : 0;
    updatePoint({ ...point, stratigraphy: [...layers, { from: last, to: last + 1, type: "", color: "Marrone", desc: "", humidity: "", consistency: "" }] });
  };

  const updateLayer = (i, f, v) => {
    const ls = [...(point.stratigraphy || [])]; ls[i] = { ...ls[i], [f]: f === "from" || f === "to" ? parseFloat(v) || 0 : v };
    updatePoint({ ...point, stratigraphy: ls });
  };

  // Excavation
  const updateExc = (f, v) => updatePoint({ ...point, excavation: { ...exc, [f]: parseFloat(v) || 0 } });

  const addDeepening = () => updatePoint({ ...point, excavation: { ...exc, deepenings: [...(exc.deepenings || []), { w: exc.w, l: exc.l, newD: exc.d + 0.5, reason: "Campione fondo non conforme" }] } });
  const addRetreat = () => updatePoint({ ...point, excavation: { ...exc, retreats: [...(exc.retreats || []), { side: "E", dist: 1, l: exc.l, d: exc.d, reason: "Campione parete non conforme" }] } });

  const updateDeep = (i, f, v) => {
    const d = [...(exc.deepenings || [])]; d[i] = { ...d[i], [f]: typeof v === "string" && isNaN(v) ? v : parseFloat(v) || 0 };
    updatePoint({ ...point, excavation: { ...exc, deepenings: d } });
  };
  const updateRet = (i, f, v) => {
    const r = [...(exc.retreats || [])]; r[i] = { ...r[i], [f]: typeof v === "string" && isNaN(v) ? v : parseFloat(v) || 0 };
    updatePoint({ ...point, excavation: { ...exc, retreats: r } });
  };

  // Volume calc
  const origVol = (exc.w || 0) * (exc.l || 0) * (exc.d || 0);
  const deepVol = (exc.deepenings || []).reduce((s, d) => {
    const extraD = (d.newD || 0) - (exc.d || 0);
    return s + (d.w || 0) * (d.l || 0) * extraD;
  }, 0);
  const retVol = (exc.retreats || []).reduce((s, r) => s + (r.dist || 0) * (r.l || 0) * (r.d || 0), 0);
  const totalVol = origVol + deepVol + retVol;

  // SVG Section
  const svgW = 420, svgH = 250, m = { t: 25, r: 45, b: 25, l: 45 };
  const pW = svgW - m.l - m.r, pH = svgH - m.t - m.b;
  const maxD = Math.max(exc.d || 3, ...(exc.deepenings || []).map(d => d.newD || 0), 5);
  const maxW = Math.max((exc.w || 4) + (exc.retreats || []).reduce((s, r) => s + r.dist, 0) * 2, 10);
  const toX = v => m.l + (v / maxW) * pW, toY = v => m.t + (v / maxD) * pH;
  const oX = (maxW - (exc.w || 4)) / 2;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: getPointColor2(point, project), boxShadow: `0 0 8px ${getPointColor2(point, project)}50` }} />
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{point.name}</h2>
          <span style={{ ...tag(point.samples.length > 0 ? C.green : C.muted) }}>{point.samples.length} campioni</span>
        </div>
        <button onClick={() => deletePoint(point.id)} style={btn(C.red, true)}>Elimina punto</button>
      </div>

      {/* ── CAMPIONI ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ ...lbl, margin: 0, fontSize: 11 }}>🧪 CAMPIONI</span>
          <button onClick={addSample} style={btn(C.green, true)}>+ Campione</button>
        </div>
        {point.samples.map((s, si) => (
          <div key={s.id} style={{ marginBottom: 14, padding: 12, background: "rgba(0,0,0,0.25)", borderRadius: 8, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
              <select style={{ ...inp(110), fontSize: 10 }} value={s.type} onChange={e => updateSample(si, "type", e.target.value)}>
                {["Fondo scavo", "Parete N", "Parete S", "Parete E", "Parete W", "Cumulo", "Top soil"].map(t => <option key={t}>{t}</option>)}
              </select>
              <input style={{ ...inp(55), fontSize: 10 }} placeholder="Da m" value={s.depthFrom || ""} onChange={e => updateSample(si, "depthFrom", e.target.value)} />
              <span style={{ color: C.muted, fontSize: 10 }}>→</span>
              <input style={{ ...inp(55), fontSize: 10 }} placeholder="A m" value={s.depthTo || ""} onChange={e => updateSample(si, "depthTo", e.target.value)} />
              <input style={{ ...inp(110), fontSize: 10 }} type="date" value={s.date} onChange={e => updateSample(si, "date", e.target.value)} />
              <select style={{ ...inp(120), fontSize: 10 }} value={s.odor || ""} onChange={e => updateSample(si, "odor", e.target.value)}>
                <option value="">— Odore —</option>
                {["Nessuno", "Lieve HC", "Forte HC", "Solventi", "Organico"].map(o => <option key={o}>{o}</option>)}
              </select>
              <button onClick={() => removeSample(si)} style={{ ...btn(C.red, true), marginLeft: "auto" }}>✕</button>
            </div>
            <input style={{ ...inp(), fontSize: 10, marginBottom: 8 }} value={s.description || ""} onChange={e => updateSample(si, "description", e.target.value)}
              placeholder="Descrizione: es. sabbia limosa marrone scuro, satura di HC, odore pungente" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {project.contaminants.map(c => {
                const v = s.values?.[c.key]; const lim = useA ? c.limA : c.limB;
                const ratio = v !== null && v !== undefined && v > 0 ? v / lim : 0;
                const ec = ratio > 1 ? C.red : ratio > 0.5 ? C.amber : v > 0 ? C.green : null;
                return (
                  <div key={c.key} style={{
                    display: "flex", alignItems: "center", gap: 3, padding: "3px 6px", borderRadius: 5,
                    background: ec ? `${ec}12` : "transparent", border: `1px solid ${ec ? `${ec}30` : C.border}`,
                    fontSize: 10, fontFamily: C.mono
                  }}>
                    <span style={{ color: C.muted, fontSize: 8 }}>{c.label.substring(0, 10)}:</span>
                    <input type="number" step="0.001" value={v ?? ""} placeholder="<LOQ"
                      onChange={e => updateVal(si, c.key, e.target.value)}
                      style={{ background: "transparent", border: "none", color: ec || C.muted, width: 55, fontSize: 10, fontFamily: C.mono, outline: "none", padding: 0 }} />
                    {ratio > 1 && <span style={{ fontSize: 7, color: C.red }}>⚠{(ratio).toFixed(1)}x</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── STRATIGRAFIA ── */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ ...lbl, margin: 0, fontSize: 11 }}>📋 STRATIGRAFIA</span>
          <button onClick={addLayer} style={btn(C.purple, true)}>+ Strato</button>
        </div>
        {(point.stratigraphy || []).map((ly, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
            <div style={{ width: 20, height: 20, borderRadius: 4, background: SOIL_COLORS[ly.color] || "#808080", border: `1px solid ${C.border}`, flexShrink: 0 }} />
            <input style={{ ...inp(50), fontSize: 10, padding: "4px 6px" }} type="number" step="0.1" value={ly.from} onChange={e => updateLayer(i, "from", e.target.value)} />
            <span style={{ color: C.muted, fontSize: 9 }}>→</span>
            <input style={{ ...inp(50), fontSize: 10, padding: "4px 6px" }} type="number" step="0.1" value={ly.to} onChange={e => updateLayer(i, "to", e.target.value)} />
            <select style={{ ...inp(130), fontSize: 10, padding: "4px 6px" }} value={ly.type} onChange={e => updateLayer(i, "type", e.target.value)}>
              <option value="">— Litologia —</option>
              {SOIL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <select style={{ ...inp(100), fontSize: 10, padding: "4px 6px" }} value={ly.color} onChange={e => updateLayer(i, "color", e.target.value)}>
              {Object.keys(SOIL_COLORS).map(c => <option key={c}>{c}</option>)}
            </select>
            <input style={{ ...inp(), fontSize: 10, padding: "4px 6px" }} value={ly.desc || ""} onChange={e => updateLayer(i, "desc", e.target.value)} placeholder="umidità, consistenza, odore, inclusioni..." />
            <button onClick={() => updatePoint({ ...point, stratigraphy: (point.stratigraphy || []).filter((_, j) => j !== i) })} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 14 }}>×</button>
          </div>
        ))}
      </div>

      {/* ── GEOMETRIA SCAVO + SEZIONE SVG ── */}
      <div style={card}>
        <span style={{ ...lbl, marginBottom: 10, display: "block", fontSize: 11 }}>📐 GEOMETRIA E VOLUMI</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div><label style={lbl}>Larghezza m</label><input style={inp()} type="number" step="0.5" value={exc.w || ""} onChange={e => updateExc("w", e.target.value)} /></div>
          <div><label style={lbl}>Lunghezza m</label><input style={inp()} type="number" step="0.5" value={exc.l || ""} onChange={e => updateExc("l", e.target.value)} /></div>
          <div><label style={lbl}>Profondità m</label><input style={inp()} type="number" step="0.5" value={exc.d || ""} onChange={e => updateExc("d", e.target.value)} /></div>
        </div>

        {/* SVG cross section */}
        <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width: "100%", background: "rgba(0,0,0,0.3)", borderRadius: 8, marginBottom: 12 }}>
          {/* Ground */}
          <line x1={m.l - 10} y1={toY(0)} x2={svgW - m.r + 10} y2={toY(0)} stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} strokeDasharray="4,3" />
          <text x={m.l - 8} y={toY(0) + 4} fill={C.muted} fontSize={8} textAnchor="end" fontFamily={C.mono}>0m</text>
          {[1, 2, 3, 4, 5].filter(d => d <= maxD).map(d => (
            <g key={d}>
              <line x1={m.l} y1={toY(d)} x2={svgW - m.r} y2={toY(d)} stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
              <text x={m.l - 8} y={toY(d) + 4} fill={C.muted} fontSize={8} textAnchor="end" fontFamily={C.mono}>{d}m</text>
            </g>
          ))}
          {/* Strat column */}
          {(point.stratigraphy || []).map((ly, i) => (
            <g key={`st${i}`}>
              <rect x={svgW - m.r + 6} y={toY(ly.from)} width={28} height={toY(ly.to) - toY(ly.from)}
                fill={SOIL_COLORS[ly.color] || "#808080"} opacity={0.65} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} rx={2} />
              <text x={svgW - m.r + 20} y={(toY(ly.from) + toY(ly.to)) / 2 + 3} fill="white" fontSize={6} textAnchor="middle" fontFamily={C.mono}>
                {(ly.type || "").substring(0, 6)}
              </text>
            </g>
          ))}
          {/* Original exc */}
          <rect x={toX(oX)} y={toY(0)} width={toX(oX + (exc.w || 4)) - toX(oX)} height={toY(exc.d || 3) - toY(0)}
            fill={`${C.accent}18`} stroke={C.accent} strokeWidth={1.5} rx={2} />
          <text x={(toX(oX) + toX(oX + (exc.w || 4))) / 2} y={(toY(0) + toY(exc.d || 3)) / 2 + 4}
            fill="white" fontSize={9} textAnchor="middle" fontFamily={C.mono}>{origVol.toFixed(0)}m³</text>
          {/* Deepenings */}
          {(exc.deepenings || []).map((d, i) => {
            const dOff = oX + ((exc.w || 4) - (d.w || exc.w || 4)) / 2;
            return <g key={`dp${i}`}>
              <rect x={toX(dOff)} y={toY(exc.d || 3)} width={toX(dOff + (d.w || exc.w || 4)) - toX(dOff)} height={toY(d.newD || exc.d + 0.5) - toY(exc.d || 3)}
                fill={`${C.red}20`} stroke={C.red} strokeWidth={1.5} strokeDasharray="4,2" rx={2} />
              <text x={(toX(dOff) + toX(dOff + (d.w || exc.w || 4))) / 2} y={(toY(exc.d || 3) + toY(d.newD || 0)) / 2 + 4}
                fill={C.red} fontSize={8} textAnchor="middle" fontFamily={C.mono}>
                +{((d.w || exc.w) * (d.l || exc.l) * ((d.newD || 0) - (exc.d || 0))).toFixed(0)}m³
              </text>
            </g>;
          })}
          {/* Retreats */}
          {(exc.retreats || []).map((r, i) => {
            const rx = r.side === "W" ? toX(oX - (r.dist || 1)) : r.side === "E" ? toX(oX + (exc.w || 4)) : toX(oX);
            const rw = r.side === "E" || r.side === "W" ? toX(oX + (r.dist || 1)) - toX(oX) : toX(oX + (exc.w || 4)) - toX(oX);
            return <g key={`rt${i}`}>
              <rect x={rx} y={toY(0)} width={rw} height={toY(r.d || exc.d || 3) - toY(0)}
                fill={`${C.amber}18`} stroke={C.amber} strokeWidth={1.5} strokeDasharray="4,2" rx={2} />
              <text x={rx + rw / 2} y={toY((r.d || exc.d || 3) / 2) + 4}
                fill={C.amber} fontSize={8} textAnchor="middle" fontFamily={C.mono}>
                +{((r.dist || 0) * (r.l || exc.l || 0) * (r.d || exc.d || 0)).toFixed(0)}m³
              </text>
            </g>;
          })}
          {/* Samples */}
          {point.samples.map((s, i) => {
            const d = parseFloat(s.depthTo || s.depthFrom || s.depth) || exc.d * 0.7;
            const cx = toX(oX + (exc.w || 4) / 2) + (i - point.samples.length / 2) * 18;
            const exceeded = project.contaminants.some(c => s.values?.[c.key] > (useA ? c.limA : c.limB));
            return <circle key={i} cx={cx} cy={toY(d)} r={4.5} fill={exceeded ? C.red : C.green} stroke="white" strokeWidth={1} opacity={0.85} />;
          })}
          <text x={svgW - m.r + 20} y={m.t - 8} fill={C.muted} fontSize={7} textAnchor="middle" fontFamily={C.mono}>STRAT.</text>
        </svg>

        {/* Deepening/retreat controls */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button onClick={addDeepening} style={btn(C.red, true)}>⬇ + Approfondimento</button>
          <button onClick={addRetreat} style={btn(C.amber, true)}>↔ + Arretramento</button>
        </div>
        {(exc.deepenings || []).map((d, i) => (
          <div key={`de${i}`} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
            <span style={{ ...tag(C.red) }}>Approf.{i + 1}</span>
            <input style={{ ...inp(60), fontSize: 10 }} type="number" step="0.5" value={d.w} onChange={e => updateDeep(i, "w", e.target.value)} placeholder="L" />
            <input style={{ ...inp(60), fontSize: 10 }} type="number" step="0.5" value={d.l} onChange={e => updateDeep(i, "l", e.target.value)} placeholder="Lung" />
            <input style={{ ...inp(60), fontSize: 10 }} type="number" step="0.5" value={d.newD} onChange={e => updateDeep(i, "newD", e.target.value)} placeholder="Prof" />
            <input style={{ ...inp(), fontSize: 10 }} value={d.reason || ""} onChange={e => updateDeep(i, "reason", e.target.value)} placeholder="Motivo" />
            <button onClick={() => updatePoint({ ...point, excavation: { ...exc, deepenings: exc.deepenings.filter((_, j) => j !== i) } })} style={{ background: "none", border: "none", color: C.red, cursor: "pointer" }}>×</button>
          </div>
        ))}
        {(exc.retreats || []).map((r, i) => (
          <div key={`re${i}`} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "center" }}>
            <span style={{ ...tag(C.amber) }}>Arretr.{i + 1}</span>
            <select style={{ ...inp(55), fontSize: 10 }} value={r.side} onChange={e => updateRet(i, "side", e.target.value)}>
              {["N", "S", "E", "W"].map(s => <option key={s}>{s}</option>)}
            </select>
            <input style={{ ...inp(55), fontSize: 10 }} type="number" step="0.5" value={r.dist} onChange={e => updateRet(i, "dist", e.target.value)} placeholder="Dist." />
            <input style={{ ...inp(55), fontSize: 10 }} type="number" step="0.5" value={r.l} onChange={e => updateRet(i, "l", e.target.value)} placeholder="Lung." />
            <input style={{ ...inp(55), fontSize: 10 }} type="number" step="0.5" value={r.d} onChange={e => updateRet(i, "d", e.target.value)} placeholder="Prof." />
            <input style={{ ...inp(), fontSize: 10 }} value={r.reason || ""} onChange={e => updateRet(i, "reason", e.target.value)} placeholder="Motivo" />
            <button onClick={() => updatePoint({ ...point, excavation: { ...exc, retreats: exc.retreats.filter((_, j) => j !== i) } })} style={{ background: "none", border: "none", color: C.red, cursor: "pointer" }}>×</button>
          </div>
        ))}

        {/* Volume summary */}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <span style={tag(C.accent)}>Scavo: <strong>{origVol.toFixed(0)}m³</strong></span>
          {deepVol > 0 && <span style={tag(C.red)}>Approf: <strong>+{deepVol.toFixed(0)}m³</strong></span>}
          {retVol > 0 && <span style={tag(C.amber)}>Arretr: <strong>+{retVol.toFixed(0)}m³</strong></span>}
          <span style={{ ...tag("#fff"), fontWeight: 700, fontSize: 12 }}>TOTALE: {totalVol.toFixed(0)}m³ ≈ {(totalVol * 1.7).toFixed(0)}t</span>
        </div>
      </div>
    </div>
  );
}

function getPointColor2(pt, project) {
  const useA = project.limitColumn === "A";
  for (const s of (pt.samples || [])) {
    for (const c of project.contaminants) {
      const v = s.values?.[c.key];
      if (v > (useA ? c.limA : c.limB)) return C.red;
    }
  }
  return pt.samples?.length > 0 ? C.green : "rgba(255,255,255,0.35)";
}

// ═══════════════════════════════════════════════════════════════════════
// TAB: GESTIONE RIFIUTI (ADR, FIR, CER)
// ═══════════════════════════════════════════════════════════════════════
function WasteTab({ project, points }) {
  const [selectedCer, setSelectedCer] = useState(null);
  const [expandedSection, setExpandedSection] = useState("cer");

  const totalVol = points.reduce((s, p) => {
    const e = p.excavation || {};
    let v = (e.w || 0) * (e.l || 0) * (e.d || 0);
    (e.deepenings || []).forEach(d => v += (d.w || 0) * (d.l || 0) * ((d.newD || 0) - (e.d || 0)));
    (e.retreats || []).forEach(r => v += (r.dist || 0) * (r.l || 0) * (r.d || 0));
    return s + v;
  }, 0);

  const ncPoints = points.filter(p => {
    const useA = project.limitColumn === "A";
    return p.samples?.some(s => project.contaminants.some(c => (s.values?.[c.key] || 0) > (useA ? c.limA : c.limB)));
  });

  const sections = [
    { id: "cer", icon: "🏷️", title: "Classificazione CER" },
    { id: "fir", icon: "📋", title: "Formulari (FIR)" },
    { id: "adr", icon: "🚛", title: "Trasporto ADR" },
    { id: "deposito", icon: "📦", title: "Deposito Temporaneo" },
    { id: "guide", icon: "📖", title: "Guida Pratica D.Lgs 152/06" },
  ];

  return (
    <div>
      {/* Section tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setExpandedSection(s.id)} style={{
            ...btn(expandedSection === s.id ? C.accent : "rgba(255,255,255,0.3)", true),
            background: expandedSection === s.id ? `${C.accent}20` : "transparent", fontSize: 11
          }}>
            {s.icon} {s.title}
          </button>
        ))}
      </div>

      {/* SUMMARY BAR */}
      <div style={{ ...card, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div><span style={lbl}>Volume totale scavo</span><div style={{ fontSize: 20, fontWeight: 700, color: C.accent, fontFamily: C.mono }}>{totalVol.toFixed(0)} m³</div></div>
        <div><span style={lbl}>Peso stimato (γ=1.7)</span><div style={{ fontSize: 20, fontWeight: 700, color: C.amber, fontFamily: C.mono }}>{(totalVol * 1.7).toFixed(0)} t</div></div>
        <div><span style={lbl}>Punti non conformi</span><div style={{ fontSize: 20, fontWeight: 700, color: C.red, fontFamily: C.mono }}>{ncPoints.length}</div></div>
        <div><span style={lbl}>N° viaggi (30t)</span><div style={{ fontSize: 20, fontWeight: 700, color: C.purple, fontFamily: C.mono }}>~{Math.ceil(totalVol * 1.7 / 30)}</div></div>
      </div>

      {/* ── CER CLASSIFICATION ── */}
      {expandedSection === "cer" && (
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px", color: C.text }}>Classificazione CER — Codici più comuni bonifica</h3>
          <p style={{ fontSize: 11, color: C.muted, margin: "0 0 12px", lineHeight: 1.5 }}>
            La classificazione CER segue la Decisione 2000/532/CE. I codici con asterisco (*) indicano rifiuti pericolosi.
            La caratterizzazione analitica determina se il rifiuto è pericoloso (HP) secondo Reg. UE 1357/2014.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {CER_CODES.map(cer => (
              <div key={cer.code} onClick={() => setSelectedCer(selectedCer === cer.code ? null : cer.code)}
                style={{
                  padding: 12, borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                  background: selectedCer === cer.code ? `${cer.code.includes("*") ? C.red : C.green}10` : "rgba(0,0,0,0.2)",
                  border: `1px solid ${selectedCer === cer.code ? (cer.code.includes("*") ? C.red : C.green) + "30" : C.border}`
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      fontFamily: C.mono, fontWeight: 700, fontSize: 13,
                      color: cer.code.includes("*") ? C.red : C.green
                    }}>{cer.code}</span>
                    <span style={{ fontSize: 12, color: C.text }}>{cer.desc}</span>
                  </div>
                  <span style={tag(cer.adr === "Non ADR" ? C.green : C.amber)}>{cer.adr}</span>
                </div>
                {selectedCer === cer.code && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 11 }}>
                      <div>
                        <span style={lbl}>Caratteristiche di Pericolo (HP)</span>
                        <div style={{ color: cer.hp === "-" ? C.green : C.amber, fontFamily: C.mono, marginTop: 2 }}>{cer.hp}</div>
                      </div>
                      <div>
                        <span style={lbl}>Classificazione ADR</span>
                        <div style={{ color: C.text, fontFamily: C.mono, marginTop: 2 }}>{ADR_CLASSES[cer.adr]?.label || cer.adr}</div>
                      </div>
                      <div>
                        <span style={lbl}>Codice ONU</span>
                        <div style={{ color: C.text, fontFamily: C.mono, marginTop: 2 }}>{ADR_CLASSES[cer.adr]?.un || "-"}</div>
                      </div>
                      <div>
                        <span style={lbl}>DPI Richiesti</span>
                        <div style={{ color: C.text, fontFamily: C.mono, marginTop: 2 }}>{ADR_CLASSES[cer.adr]?.kit || "Standard"}</div>
                      </div>
                    </div>
                    {cer.code.includes("*") && (
                      <div style={{ marginTop: 10, padding: 10, borderRadius: 6, background: `${C.red}08`, border: `1px solid ${C.red}20`, fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
                        <strong style={{ color: C.red }}>⚠ Rifiuto Pericoloso</strong> — Richiede: formulario FIR in 4 copie, trasportatore iscritto Albo Gestori Ambientali cat. 5,
                        consulente ADR (se &gt;1000 punti/anno), etichettatura ADR sul mezzo, registro carico/scarico vidimato dalla CCIAA.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FIR ── */}
      {expandedSection === "fir" && (
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: C.text }}>📋 Formulario di Identificazione Rifiuto (FIR)</h3>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
            <div style={{ ...card, background: `${C.accent}08`, borderColor: `${C.accent}20` }}>
              <strong style={{ color: C.accent }}>Obbligo di legge:</strong> Art. 193 D.Lgs. 152/06 — Il formulario accompagna ogni trasporto di rifiuti.
              Va compilato in <strong style={{ color: "#fff" }}>4 copie</strong>: 1ª al produttore, 2ª al trasportatore, 3ª al destinatario, 4ª torna al produttore entro 3 mesi.
            </div>

            <div style={{ marginTop: 12 }}>
              <strong style={{ color: "#fff" }}>Compilazione FIR — Campi obbligatori:</strong>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
              {[
                { field: "Produttore", desc: "Ragione sociale, CF/PIVA, sede legale, N° iscrizione Albo (se applicabile)" },
                { field: "Trasportatore", desc: "Iscrizione Albo Gestori Ambientali — verificare categoria e scadenza autorizzazione" },
                { field: "Destinatario", desc: "Impianto di destino — verificare autorizzazione per CER specifico + capacità residua" },
                { field: "Rifiuto", desc: "CER, descrizione, stato fisico (solido/liquido/fangoso), HP, quantità (kg o litri)" },
                { field: "N° Colli/Container", desc: "Tipo imballo (cassone, big bag, cisterna), n° colli, tipo mezzo (motrice+rimorchio)" },
                { field: "Percorso", desc: "Tragitto previsto (indicare se diverso dal più breve). Intermediario se presente" },
              ].map(({ field, desc }) => (
                <div key={field} style={{ padding: 8, borderRadius: 6, background: "rgba(0,0,0,0.2)", border: `1px solid ${C.border}` }}>
                  <strong style={{ color: "#fff", fontSize: 11 }}>{field}</strong>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{desc}</div>
                </div>
              ))}
            </div>

            <div style={{ ...card, marginTop: 12, background: `${C.amber}08`, borderColor: `${C.amber}20` }}>
              <strong style={{ color: C.amber }}>⚠ Errori comuni da evitare:</strong>
              <div style={{ marginTop: 6, fontSize: 11, color: C.muted }}>
                • Non confondere peso STIMATO con peso EFFETTIVO (la prima e quarta copia devono combaciare con peso a destino)<br />
                • La 4ª copia deve tornare entro 3 mesi — se non arriva, <strong style={{ color: "#fff" }}>comunicazione alla Provincia entro 3 gg</strong><br />
                • Formulari pre-vidimati dalla CCIAA o gestiti tramite ViViFIR (sistema telematico)<br />
                • Il RENTRI (Registro Elettronico Nazionale) è obbligatorio dal 2025 per produttori &gt;10 dipendenti
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ADR ── */}
      {expandedSection === "adr" && (
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: C.text }}>🚛 Trasporto ADR — Guida Pratica</h3>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
            <div style={{ ...card, background: `${C.red}08`, borderColor: `${C.red}20` }}>
              <strong style={{ color: C.red }}>Quando si applica l'ADR?</strong> L'accordo ADR (European Agreement on Dangerous Goods by Road) si applica a tutti i trasporti stradali di merci pericolose, inclusi i rifiuti pericolosi (CER con *).
            </div>

            <div style={{ marginTop: 12 }}>
              <strong style={{ color: "#fff" }}>Classi ADR più comuni in bonifica:</strong>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {Object.entries(ADR_CLASSES).filter(([k]) => k !== "Non ADR").map(([cls, info]) => (
                <div key={cls} style={{ padding: 10, borderRadius: 8, background: "rgba(0,0,0,0.2)", border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, color: C.amber, fontFamily: C.mono }}>{cls}</span>
                    <span style={{ color: C.text, fontSize: 11 }}>{info.label}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 8, fontSize: 10 }}>
                    <div><span style={lbl}>Codice ONU</span><div style={{ color: "#fff", fontFamily: C.mono }}>{info.un}</div></div>
                    <div><span style={lbl}>Placards</span><div style={{ color: "#fff" }}>{info.placards}</div></div>
                    <div><span style={lbl}>DPI Kit</span><div style={{ color: "#fff" }}>{info.kit}</div></div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...card, marginTop: 12, background: `${C.purple}08`, borderColor: `${C.purple}20` }}>
              <strong style={{ color: C.purple }}>📄 Documenti obbligatori a bordo mezzo:</strong>
              <div style={{ marginTop: 6, fontSize: 11, color: C.muted }}>
                • Documento di trasporto ADR (DDT merci pericolose)<br />
                • Formulario FIR<br />
                • Patente ADR del conducente (CFP — rinnovo ogni 5 anni)<br />
                • Istruzioni scritte di sicurezza (scheda in 4 lingue)<br />
                • Kit DPI di emergenza<br />
                • Estintore omologato (min. 6kg polvere per veicoli &gt;3.5t)<br />
                • Segnaletica: pannelli arancioni 40×30cm + placards classe ADR
              </div>
            </div>

            <div style={{ ...card, marginTop: 12, background: `${C.green}08`, borderColor: `${C.green}20` }}>
              <strong style={{ color: C.green }}>✓ Esenzioni utili (ADR 1.1.3.6):</strong>
              <div style={{ marginTop: 6, fontSize: 11, color: C.muted }}>
                Per quantità limitate per unità di trasporto (es. Classe 9: max 1000 kg/viaggio in esenzione parziale),
                sono richiesti solo: DDT con dicitura ADR, estintore, formazione base conducente. No CFP, no pannelli arancioni.
                <br /><strong style={{ color: "#fff" }}>Attenzione:</strong> l'esenzione si perde se si superano le soglie o si trasportano più classi insieme.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DEPOSITO TEMPORANEO ── */}
      {expandedSection === "deposito" && (
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: C.text }}>📦 Deposito Temporaneo — Art. 185-bis D.Lgs. 152/06</h3>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
            <div style={{ ...card, background: `${C.accent}08`, borderColor: `${C.accent}20` }}>
              <strong style={{ color: C.accent }}>Definizione:</strong> Il deposito temporaneo è il raggruppamento dei rifiuti nel luogo di produzione,
              effettuato <strong style={{ color: "#fff" }}>prima della raccolta</strong>, alle condizioni previste dall'art. 185-bis.
              Non richiede autorizzazione se rispettati i limiti.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              <div style={{ padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.2)", border: `1px solid ${C.border}` }}>
                <strong style={{ color: C.amber }}>Opzione A — Temporale</strong>
                <div style={{ fontSize: 11, marginTop: 6 }}>
                  Avvio al recupero/smaltimento con <strong style={{ color: "#fff" }}>cadenza almeno trimestrale</strong>,
                  indipendentemente dalle quantità in deposito.
                  <br /><br />
                  <span style={{ color: C.green }}>✓ Consigliato per cantieri con produzione continua</span>
                </div>
              </div>
              <div style={{ padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.2)", border: `1px solid ${C.border}` }}>
                <strong style={{ color: C.amber }}>Opzione B — Quantitativa</strong>
                <div style={{ fontSize: 11, marginTop: 6 }}>
                  Avvio quando il deposito raggiunge <strong style={{ color: "#fff" }}>30 m³</strong> (di cui max 10 m³ pericolosi).
                  In ogni caso, avvio entro <strong style={{ color: "#fff" }}>1 anno dalla produzione</strong>.
                  <br /><br />
                  <span style={{ color: C.green }}>✓ Consigliato per cantieri di breve durata</span>
                </div>
              </div>
            </div>

            <div style={{ ...card, marginTop: 12, background: `${C.red}08`, borderColor: `${C.red}20` }}>
              <strong style={{ color: C.red }}>⚠ Condizioni OBBLIGATORIE (violazione = sanzione penale):</strong>
              <div style={{ marginTop: 6, fontSize: 11 }}>
                • Rifiuti pericolosi e non pericolosi <strong style={{ color: "#fff" }}>separati per CER</strong><br />
                • Recipienti/container <strong style={{ color: "#fff" }}>etichettati</strong> con CER + HP + data inizio deposito<br />
                • Area <strong style={{ color: "#fff" }}>impermeabilizzata</strong> con bacino di contenimento per liquidi<br />
                • Tenuta <strong style={{ color: "#fff" }}>registro cronologico</strong> carico/scarico<br />
                • No miscelazione rifiuti con CER diversi (Art. 187)<br />
                • Quantità max per i pericolosi: <strong style={{ color: "#fff" }}>10 m³</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── GUIDA D.Lgs 152/06 ── */}
      {expandedSection === "guide" && (
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: C.text }}>📖 D.Lgs. 152/2006 — Guida per il Geologo di Cantiere</h3>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>

            <div style={{ ...card, background: `${C.accent}08`, borderColor: `${C.accent}20` }}>
              <strong style={{ color: C.accent, fontSize: 13 }}>Parte IV — Titolo V: Bonifica di Siti Contaminati</strong>
              <div style={{ marginTop: 6, fontSize: 11 }}>
                È il cuore normativo del nostro lavoro. Definisce il percorso: <strong style={{ color: "#fff" }}>Evento di contaminazione → Comunicazione →
                  MISE → Caratterizzazione → Analisi di Rischio → Progetto Operativo → Bonifica → Collaudo</strong>
              </div>
            </div>

            {[
              {
                art: "Art. 242 — Procedura operativa",
                text: "Obbligo di comunicazione entro 24h dall'evento. Il responsabile attiva le MISE (Messa In Sicurezza di Emergenza). Entro 30 gg presenta il Piano di Caratterizzazione alla Regione/Provincia. Se i valori superano le CSC (All.5 Tab.1), si procede con l'Analisi di Rischio sito-specifica.",
                why: "Questo è il motivo per cui facciamo i campionamenti: verificare se le concentrazioni superano le CSC e se serve procedere con l'AdR."
              },
              {
                art: "Art. 240 — Definizioni chiave",
                text: "CSC = Concentrazioni Soglia di Contaminazione (All.5 Tab.1 — i nostri limiti Col.A e Col.B). CSR = Concentrazioni Soglia di Rischio (calcolate con l'AdR). Sito contaminato = superamento CSR. Sito potenzialmente contaminato = superamento CSC.",
                why: "Il superamento di Col.B non significa automaticamente che il sito è contaminato — significa che è POTENZIALMENTE contaminato e serve l'AdR."
              },
              {
                art: "Allegato 5, Tabella 1 — I nostri limiti",
                text: "Colonna A = siti ad uso verde pubblico/residenziale (limiti più restrittivi). Colonna B = siti ad uso commerciale/industriale. I limiti si applicano alla matrice suolo e sono espressi in mg/kg s.s. Il campionamento deve essere rappresentativo secondo i protocolli APAT/ISPRA.",
                why: "Ogni campione che prelevi viene confrontato con questa tabella. La scelta tra Col.A e Col.B dipende dalla destinazione d'uso del sito nel PRG/PGT."
              },
              {
                art: "Art. 243 — Acque sotterranee",
                text: "Se la contaminazione interessa la falda, i limiti sono quelli dell'All.5 Tab.2 (in µg/L). Il monitoraggio delle acque sotterranee è obbligatorio durante e dopo la bonifica, con frequenza almeno trimestrale.",
                why: "Spesso lo scavo arriva alla falda — in quel caso i campioni di acqua vanno prelevati e analizzati secondo Tab.2."
              },
              {
                art: "Art. 249 — Siti di interesse nazionale (SIN)",
                text: "Per i SIN, la competenza è del MASE (ex MATTM). Le conferenze dei servizi sono più complesse, i tempi più lunghi. ENI REWIND gestisce molti SIN.",
                why: "Se lavori su un SIN, il procedimento è diverso e le approvazioni passano per il Ministero."
              },
              {
                art: "Art. 184-bis — Sottoprodotti / Terre e Rocce",
                text: "Le terre e rocce da scavo NON contaminate possono essere gestite come sottoprodotti (DPR 120/2017) se rispettano le CSC e sono riutilizzate tal quali. Altrimenti sono rifiuti (CER 17.05.04 o 17.05.03*).",
                why: "In bonifica, il terreno scavato da zone non conformi è SEMPRE rifiuto. Il terreno da zone conformi può essere riutilizzato se hai il piano di utilizzo approvato."
              },
              {
                art: "Art. 186 — Gestione terre e rocce (abrogato/sostituito)",
                text: "Ora regolato dal DPR 120/2017. Il piano di utilizzo deve essere presentato 90 gg prima dell'inizio lavori e include caratterizzazione, volumetrie, e sito di destino.",
                why: "Per il terreno pulito che esci dal cantiere e vuoi riutilizzare, serve il piano DPR 120."
              },
            ].map(({ art, text, why }, i) => (
              <div key={i} style={{ ...card, marginTop: i === 0 ? 12 : 0, background: "rgba(0,0,0,0.2)" }}>
                <strong style={{ color: "#fff", fontSize: 12 }}>{art}</strong>
                <div style={{ marginTop: 6, fontSize: 11, color: C.muted }}>{text}</div>
                <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: `${C.green}08`, border: `1px solid ${C.green}15`, fontSize: 11 }}>
                  <strong style={{ color: C.green }}>💡 Perché ti serve in cantiere:</strong> {why}
                </div>
              </div>
            ))}

            <div style={{ ...card, marginTop: 12, background: `${C.purple}08`, borderColor: `${C.purple}20` }}>
              <strong style={{ color: C.purple }}>🔗 Normativa correlata essenziale:</strong>
              <div style={{ marginTop: 8, fontSize: 11, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { n: "DPR 120/2017", d: "Terre e rocce da scavo" },
                  { n: "Reg. UE 1357/2014", d: "Classificazione HP rifiuti" },
                  { n: "D.M. 05/02/1998", d: "Recupero rifiuti non pericolosi" },
                  { n: "D.Lgs. 36/2003", d: "Discariche" },
                  { n: "ADR 2023", d: "Trasporto merci pericolose" },
                  { n: "D.Lgs. 81/2008", d: "Sicurezza cantiere (PSC/POS)" },
                ].map(({ n, d }) => (
                  <div key={n} style={{ padding: 6, borderRadius: 4, background: "rgba(0,0,0,0.2)", border: `1px solid ${C.border}` }}>
                    <strong style={{ color: "#fff" }}>{n}</strong><br />
                    <span style={{ color: C.muted, fontSize: 10 }}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════
export default function BonificaProV2() {
  const [project, setProject] = useState({
    name: "", client: "", location: "", limitColumn: "B",
    aqaTemplate: "Idrocarburi (PV/Distributori)",
    contaminants: AQA_TEMPLATES["Idrocarburi (PV/Distributori)"],
    mapImage: null, mapFileName: "",
    onSetMap: (img, name) => setProject(p => ({ ...p, mapImage: img, mapFileName: name }))
  });
  const [points, setPoints] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("config");
  const [importResult, setImportResult] = useState(null);

  const selectedPoint = points.find(p => p.id === selectedId);

  // Excel import handler
  const handleExcelImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = parseExcelAnalyses(new Uint8Array(ev.target.result), project.contaminants);
      if (result.error) { setImportResult({ error: result.error }); return; }
      // Merge imported points
      const newPoints = result.points.map(ip => ({
        id: genId(), name: ip.name, samples: ip.samples,
        stratigraphy: [], excavation: { w: 4, l: 6, d: 3, deepenings: [], retreats: [] },
        mapX: undefined, mapY: undefined // unplaced
      }));
      setPoints(prev => [...prev, ...newPoints]);
      setImportResult({ count: newPoints.length, samples: newPoints.reduce((s, p) => s + p.samples.length, 0), mapped: result.headersMapped });
      setActiveTab("map");
    };
    reader.readAsArrayBuffer(file);
  };

  const updatePoint = (up) => setPoints(prev => prev.map(p => p.id === up.id ? up : p));
  const deletePoint = (id) => { setPoints(prev => prev.filter(p => p.id !== id)); if (selectedId === id) setSelectedId(null); };

  // Add point manually
  const [newName, setNewName] = useState("");
  const addManualPoint = () => {
    if (!newName.trim()) return;
    const np = { id: genId(), name: newName.trim(), samples: [], stratigraphy: [], excavation: { w: 4, l: 6, d: 3, deepenings: [], retreats: [] }, mapX: undefined, mapY: undefined };
    setPoints(prev => [...prev, np]); setSelectedId(np.id); setNewName("");
  };

  const tabs = [
    { id: "config", icon: "⚙", label: "Progetto" },
    { id: "map", icon: "🗺", label: "Mappa" },
    { id: "point", icon: "📍", label: "Punto" },
    { id: "section", icon: "📐", label: "Sezione" },
    { id: "waste", icon: "🚛", label: "Rifiuti & Legge" },
  ];

  // Stats
  const totalSamples = points.reduce((s, p) => s + p.samples.length, 0);
  const ncCount = points.filter(p => getPointColor2(p, project) === C.red).length;
  const useA = project.limitColumn === "A";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.text, fontFamily: C.font }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* ── LEFT SIDEBAR ── */}
      <div style={{ width: 200, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", background: "rgba(0,0,0,0.15)" }}>
        {/* Brand */}
        <div style={{ padding: "16px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg,${C.accent},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🔬</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: -0.5 }}>Bonifica Pro</div>
              <div style={{ fontSize: 8, color: C.muted, fontFamily: C.mono }}>v2.0 — Template</div>
            </div>
          </div>
        </div>

        {/* Nav tabs */}
        <div style={{ padding: "8px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
              borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontFamily: C.font,
              background: activeTab === t.id ? `${C.accent}15` : "transparent",
              color: activeTab === t.id ? C.accent : C.muted, textAlign: "left", fontWeight: activeTab === t.id ? 600 : 400
            }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Import Excel */}
        <div style={{ padding: "8px 10px", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <label style={{ ...btn(C.green, true), display: "flex", alignItems: "center", justifyContent: "center", gap: 4, cursor: "pointer", width: "100%", textAlign: "center" }}>
            📊 Importa Excel
            <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={handleExcelImport} />
          </label>
          {importResult && (
            <div style={{ fontSize: 9, marginTop: 6, fontFamily: C.mono, color: importResult.error ? C.red : C.green }}>
              {importResult.error || `✓ ${importResult.count} punti, ${importResult.samples} campioni, ${importResult.mapped} parametri mappati`}
            </div>
          )}
        </div>

        {/* Add manual point */}
        <div style={{ padding: "8px 10px" }}>
          <div style={{ display: "flex", gap: 4 }}>
            <input style={{ ...inp(), fontSize: 10, padding: "5px 8px" }} value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addManualPoint()} placeholder="Nome punto..." />
            <button onClick={addManualPoint} style={{ ...btn(C.accent, true), padding: "5px 8px" }}>+</button>
          </div>
        </div>

        {/* Point list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 6px" }}>
          <div style={{ ...lbl, padding: "0 6px", marginBottom: 4 }}>PUNTI ({points.length})</div>
          {points.map(pt => {
            const col = getPointColor2(pt, project);
            return (
              <div key={pt.id} onClick={() => { setSelectedId(pt.id); if (activeTab !== "map") setActiveTab("point"); }}
                style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                  background: selectedId === pt.id ? "rgba(255,255,255,0.06)" : "transparent",
                  marginBottom: 1, fontSize: 11, fontFamily: C.mono
                }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: col, flexShrink: 0, boxShadow: `0 0 4px ${col}50` }} />
                <span style={{
                  flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  color: selectedId === pt.id ? "#fff" : C.muted
                }}>{pt.name}</span>
                <span style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>{pt.samples.length}</span>
                {pt.mapX === undefined && <span style={{ fontSize: 7, color: C.amber }}>⊘</span>}
              </div>
            );
          })}
        </div>

        {/* Footer stats */}
        <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, fontSize: 9, fontFamily: C.mono, color: C.muted }}>
          {points.length}pt · {totalSamples}camp · <span style={{ color: ncCount > 0 ? C.red : C.green }}>{ncCount}NC</span> · Col.{project.limitColumn}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto", maxHeight: "100vh" }}>

        {activeTab === "config" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 16px", letterSpacing: -0.5 }}>⚙ Configurazione Progetto</h2>
            <div style={card}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div><label style={lbl}>Nome Progetto</label><input style={inp()} value={project.name} onChange={e => setProject(p => ({ ...p, name: e.target.value }))} placeholder="es. PV12555 — San Donato Milanese" /></div>
                <div><label style={lbl}>Committente</label><input style={inp()} value={project.client} onChange={e => setProject(p => ({ ...p, client: e.target.value }))} placeholder="es. ENI REWIND S.p.A." /></div>
                <div><label style={lbl}>Località</label><input style={inp()} value={project.location} onChange={e => setProject(p => ({ ...p, location: e.target.value }))} placeholder="es. San Donato Milanese (MI)" /></div>
                <div><label style={lbl}>Limiti di Riferimento</label>
                  <select style={inp()} value={project.limitColumn} onChange={e => setProject(p => ({ ...p, limitColumn: e.target.value }))}>
                    <option value="B">Colonna B — Commerciale/Industriale</option>
                    <option value="A">Colonna A — Residenziale/Verde</option>
                  </select>
                </div>
              </div>

              <label style={lbl}>Set Analitico (AQA)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4, marginBottom: 10 }}>
                {Object.keys(AQA_TEMPLATES).map(name => (
                  <button key={name} onClick={() => setProject(p => ({ ...p, aqaTemplate: name, contaminants: AQA_TEMPLATES[name] }))}
                    style={{
                      ...btn(project.aqaTemplate === name ? C.accent : "rgba(255,255,255,0.25)", true),
                      background: project.aqaTemplate === name ? `${C.accent}20` : "transparent"
                    }}>{name}</button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: C.muted, fontFamily: C.mono }}>
                ✓ {project.contaminants.length} parametri caricati — {project.contaminants.map(c => c.label).join(", ")}
              </div>
            </div>

            {/* Quick start guide */}
            <div style={card}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px" }}>🚀 Come iniziare</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { step: "1", title: "Importa dati", desc: "Carica il file Excel del laboratorio mobile. I punti vengono creati automaticamente." },
                  { step: "2", title: "Posiziona sulla mappa", desc: "Carica la planimetria e trascina i punti dalla coda alla posizione corretta." },
                  { step: "3", title: "Gestisci scavo", desc: "Per ogni punto sporco: definisci geometria, aggiungi approfondimenti/arretramenti, calcola volumi." },
                ].map(({ step, title, desc }) => (
                  <div key={step} style={{ padding: 12, borderRadius: 8, background: "rgba(0,0,0,0.2)", border: `1px solid ${C.border}` }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${C.accent}20`, color: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{step}</div>
                    <strong style={{ color: "#fff", fontSize: 12 }}>{title}</strong>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "map" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 16px", letterSpacing: -0.5 }}>🗺 Mappa Sito</h2>
            <MapTab project={{ ...project, onSetMap: (img, name) => setProject(p => ({ ...p, mapImage: img, mapFileName: name })) }}
              points={points} setPoints={setPoints} selectedId={selectedId} setSelectedId={setSelectedId} />
          </div>
        )}

        {activeTab === "point" && (
          <PointTab point={selectedPoint} updatePoint={updatePoint} project={project} deletePoint={deletePoint} />
        )}

        {activeTab === "section" && selectedPoint && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 16px", letterSpacing: -0.5 }}>📐 Sezione — {selectedPoint.name}</h2>
            <PointTab point={selectedPoint} updatePoint={updatePoint} project={project} deletePoint={deletePoint} />
          </div>
        )}
        {activeTab === "section" && !selectedPoint && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 400, color: C.muted }}>
            <div style={{ fontSize: 48, opacity: 0.15, marginBottom: 12 }}>📐</div>
            Seleziona un punto dalla sidebar
          </div>
        )}

        {activeTab === "waste" && <WasteTab project={project} points={points} />}
      </div>
    </div>
  );
}
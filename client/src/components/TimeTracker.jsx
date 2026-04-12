import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";

// ════════════════════════════════════════════
//  GIORNALE DI CANTIERE — Daily Field Journal
// ════════════════════════════════════════════

const LS_KEY = "fieldjournal_v2";
const today = () => new Date().toISOString().split("T")[0];
const weekday = (d) => new Date(d + "T12:00:00").toLocaleDateString("it-IT", { weekday: "short" });
const fmtDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
const fmtDateFull = (d) => new Date(d + "T12:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

function calcHours(start, end, pausa) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (pausa) mins -= 60;
  return Math.max(0, mins / 60);
}

function fmtHours(h) {
  if (!h || h <= 0) return "—";
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function getWeekNumber(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d - jan1) / 86400000);
  return Math.ceil((days + jan1.getDay() + 1) / 7);
}

function getMonday(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
}

// ── Persistent storage ──
function loadData() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
}
function saveData(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

// ════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════

export default function TimeTracker({ commesse = [] }) {
  // data shape: { "2025-04-12": { activities: [...], note: "" }, ... }
  const [data, setData] = useState(() => loadData());
  const [selectedDate, setSelectedDate] = useState(today());
  const [view, setView] = useState("day"); // day | week | month
  const [siteSearch, setSiteSearch] = useState("");
  const [showSiteDropdown, setShowSiteDropdown] = useState(-1);
  const dropdownRef = useRef(null);

  // Persist on change
  useEffect(() => { saveData(data); }, [data]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSiteDropdown(-1);
        setSiteSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, []);

  // Current day data
  const dayData = data[selectedDate] || { activities: [], note: "" };

  const updateDay = useCallback((dateKey, updater) => {
    setData((prev) => {
      const existing = prev[dateKey] || { activities: [], note: "" };
      const updated = updater(existing);
      return { ...prev, [dateKey]: updated };
    });
  }, []);

  // ── Activity CRUD ──
  const addActivity = () => {
    updateDay(selectedDate, (d) => ({
      ...d,
      activities: [
        ...d.activities,
        { id: Date.now(), site: "", siteCustom: "", start: "08:00", end: "17:00", pausa: true, desc: "" },
      ],
    }));
  };

  const updateActivity = (id, field, value) => {
    updateDay(selectedDate, (d) => ({
      ...d,
      activities: d.activities.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    }));
  };

  const removeActivity = (id) => {
    updateDay(selectedDate, (d) => ({
      ...d,
      activities: d.activities.filter((a) => a.id !== id),
    }));
  };

  const updateNote = (val) => {
    updateDay(selectedDate, (d) => ({ ...d, note: val }));
  };

  // ── Site search ──
  const filteredSites = useMemo(() => {
    if (!siteSearch.trim()) return commesse.slice(0, 15);
    const q = siteSearch.toLowerCase();
    return commesse.filter((c) =>
      `${c.CodiceProgettoSAP} ${c.Descrizione}`.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [siteSearch, commesse]);

  const getSiteName = useCallback((activity) => {
    if (activity.siteCustom) return activity.siteCustom;
    if (activity.site) {
      const c = commesse.find((x) => x.CodiceProgettoSAP === activity.site);
      if (c) {
        const parts = c.Descrizione.split("-").map((s) => s.trim());
        return parts.length >= 3 ? `${parts[1]} — ${parts.slice(2).join(" ")}` : c.Descrizione;
      }
      return activity.site;
    }
    return "";
  }, [commesse]);

  // ── Day total ──
  const dayTotal = dayData.activities.reduce((sum, a) => sum + calcHours(a.start, a.end, a.pausa), 0);

  // ── Navigate dates ──
  const navDate = (offset) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  // ── Week data ──
  const weekData = useMemo(() => {
    const monday = getMonday(selectedDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday + "T12:00:00");
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      const dd = data[key] || { activities: [], note: "" };
      const hours = dd.activities.reduce((s, a) => s + calcHours(a.start, a.end, a.pausa), 0);
      const sites = dd.activities.map((a) => getSiteName(a)).filter(Boolean);
      const descs = dd.activities.map((a) => a.desc).filter(Boolean);
      days.push({ date: key, hours, sites, descs, note: dd.note, count: dd.activities.length });
    }
    return days;
  }, [selectedDate, data, getSiteName]);

  const weekTotal = weekData.reduce((s, d) => s + d.hours, 0);

  // ── Month data ──
  const monthData = useMemo(() => {
    const ym = selectedDate.slice(0, 7);
    const daysInMonth = new Date(parseInt(ym.slice(0, 4)), parseInt(ym.slice(5, 7)), 0).getDate();
    const weeks = {};
    for (let i = 1; i <= daysInMonth; i++) {
      const key = `${ym}-${String(i).padStart(2, "0")}`;
      const dd = data[key] || { activities: [], note: "" };
      const hours = dd.activities.reduce((s, a) => s + calcHours(a.start, a.end, a.pausa), 0);
      const wk = getWeekNumber(key);
      if (!weeks[wk]) weeks[wk] = { days: [], total: 0 };
      const sites = dd.activities.map((a) => getSiteName(a)).filter(Boolean);
      const descs = dd.activities.map((a) => a.desc).filter(Boolean);
      weeks[wk].days.push({ date: key, hours, sites, descs, note: dd.note });
      weeks[wk].total += hours;
    }
    return weeks;
  }, [selectedDate, data, getSiteName]);

  const monthTotal = Object.values(monthData).reduce((s, w) => s + w.total, 0);

  // ── Export ──
  const exportCSV = (scope) => {
    let rows = [["Data", "Giorno", "Sito", "Inizio", "Fine", "Pausa", "Ore", "Attività", "Note giorno"]];
    const addDay = (key) => {
      const dd = data[key] || { activities: [], note: "" };
      if (dd.activities.length === 0) return;
      dd.activities.forEach((a) => {
        rows.push([
          key, weekday(key), getSiteName(a) || "—", a.start, a.end,
          a.pausa ? "Sì" : "No", calcHours(a.start, a.end, a.pausa).toFixed(2),
          a.desc || "—", dd.note || ""
        ]);
      });
    };

    if (scope === "week") {
      weekData.forEach((d) => addDay(d.date));
    } else {
      const ym = selectedDate.slice(0, 7);
      const daysInMonth = new Date(parseInt(ym.slice(0, 4)), parseInt(ym.slice(5, 7)), 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) addDay(`${ym}-${String(i).padStart(2, "0")}`);
    }

    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `giornale-${scope}-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fj">
      <style>{STYLES}</style>

      {/* ── Header ── */}
      <div className="fj-hdr">
        <div className="fj-hdr-top">
          <h1>Giornale di Cantiere</h1>
        </div>
        <div className="fj-tabs">
          {["day", "week", "month"].map((v) => (
            <button key={v} className={`fj-tab${view === v ? " on" : ""}`} onClick={() => setView(v)}>
              {v === "day" ? "Giorno" : v === "week" ? "Settimana" : "Mese"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Day View ── */}
      {view === "day" && (
        <div className="fj-body">
          {/* Date nav */}
          <div className="fj-datenav">
            <button className="fj-nav-btn" onClick={() => navDate(-1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="fj-dateinfo">
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="fj-datepick" />
              <div className="fj-datefull">{fmtDateFull(selectedDate)}</div>
            </div>
            <button className="fj-nav-btn" onClick={() => navDate(1)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>

          {/* Day total */}
          <div className="fj-daytotal">
            <span className="fj-daytotal-label">Totale giornata</span>
            <span className="fj-daytotal-val">{fmtHours(dayTotal)}</span>
          </div>

          {/* Activities */}
          <div className="fj-activities">
            {dayData.activities.length === 0 && (
              <div className="fj-empty">
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <p>Nessuna attività registrata</p>
                <p className="sub">Aggiungi la prima attività della giornata</p>
              </div>
            )}

            {dayData.activities.map((a, idx) => (
              <div className="fj-act" key={a.id}>
                <div className="fj-act-head">
                  <span className="fj-act-num">#{idx + 1}</span>
                  <span className="fj-act-hrs">{fmtHours(calcHours(a.start, a.end, a.pausa))}</span>
                  <button className="fj-act-del" onClick={() => removeActivity(a.id)} title="Elimina">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Site selector */}
                <div className="fj-field" ref={showSiteDropdown === idx ? dropdownRef : null}>
                  <label>Sito / Commessa</label>
                  <div className="fj-site-wrap">
                    <input
                      type="text"
                      placeholder="Cerca commessa o scrivi sito..."
                      value={
                        showSiteDropdown === idx
                          ? siteSearch
                          : getSiteName(a) || ""
                      }
                      onChange={(e) => {
                        setSiteSearch(e.target.value);
                        setShowSiteDropdown(idx);
                        // If typing custom, clear the commessa link
                        updateActivity(a.id, "siteCustom", e.target.value);
                        updateActivity(a.id, "site", "");
                      }}
                      onFocus={() => {
                        setShowSiteDropdown(idx);
                        setSiteSearch("");
                      }}
                      className="fj-input"
                    />
                    {showSiteDropdown === idx && filteredSites.length > 0 && (
                      <div className="fj-dropdown">
                        {filteredSites.map((c) => (
                          <button
                            key={c.CodiceProgettoSAP}
                            className="fj-drop-item"
                            onClick={() => {
                              updateActivity(a.id, "site", c.CodiceProgettoSAP);
                              updateActivity(a.id, "siteCustom", "");
                              setShowSiteDropdown(-1);
                              setSiteSearch("");
                            }}
                          >
                            <span className="fj-drop-code">{c.CodiceProgettoSAP}</span>
                            <span className="fj-drop-desc">{c.Descrizione}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Time row */}
                <div className="fj-timerow">
                  <div className="fj-field fj-time-field">
                    <label>Inizio</label>
                    <input type="time" value={a.start} onChange={(e) => updateActivity(a.id, "start", e.target.value)} className="fj-input fj-input-time" />
                  </div>
                  <div className="fj-field fj-time-field">
                    <label>Fine</label>
                    <input type="time" value={a.end} onChange={(e) => updateActivity(a.id, "end", e.target.value)} className="fj-input fj-input-time" />
                  </div>
                  <div className="fj-field fj-pause-field">
                    <label>Pausa</label>
                    <button
                      className={`fj-pause-btn${a.pausa ? " on" : ""}`}
                      onClick={() => updateActivity(a.id, "pausa", !a.pausa)}
                    >
                      {a.pausa ? "1h" : "No"}
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div className="fj-field">
                  <label>Attività svolta</label>
                  <textarea
                    value={a.desc}
                    onChange={(e) => updateActivity(a.id, "desc", e.target.value)}
                    placeholder="es. Installazione piezometri S1-S4, campionamento acque..."
                    className="fj-input fj-textarea"
                    rows={2}
                  />
                </div>
              </div>
            ))}

            {/* Add activity */}
            <button className="fj-add" onClick={addActivity}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
              Aggiungi attività
            </button>
          </div>

          {/* Day note */}
          <div className="fj-daynote">
            <label>Note giornata</label>
            <textarea
              value={dayData.note}
              onChange={(e) => updateNote(e.target.value)}
              placeholder="Condizioni meteo, problemi riscontrati, materiali usati..."
              className="fj-input fj-textarea"
              rows={3}
            />
          </div>
        </div>
      )}

      {/* ── Week View ── */}
      {view === "week" && (
        <div className="fj-body">
          <div className="fj-datenav">
            <button className="fj-nav-btn" onClick={() => navDate(-7)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="fj-dateinfo">
              <div className="fj-datefull">Settimana {getWeekNumber(selectedDate)} — {fmtDate(weekData[0]?.date)} → {fmtDate(weekData[6]?.date)}</div>
            </div>
            <button className="fj-nav-btn" onClick={() => navDate(7)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>

          <div className="fj-daytotal">
            <span className="fj-daytotal-label">Totale settimana</span>
            <span className="fj-daytotal-val">{fmtHours(weekTotal)}</span>
          </div>

          <div className="fj-week-table">
            <div className="fj-wtable-hdr">
              <span>Giorno</span><span>Ore</span><span>Siti</span><span>Attività</span>
            </div>
            {weekData.map((d) => (
              <div
                key={d.date}
                className={`fj-wtable-row${d.date === today() ? " today" : ""}${d.count === 0 ? " empty" : ""}`}
                onClick={() => { setSelectedDate(d.date); setView("day"); }}
              >
                <div className="fj-wday">
                  <span className="fj-wday-name">{weekday(d.date)}</span>
                  <span className="fj-wday-num">{d.date.slice(8)}</span>
                </div>
                <div className="fj-whours">{d.hours > 0 ? fmtHours(d.hours) : "—"}</div>
                <div className="fj-wsites">{d.sites.length > 0 ? d.sites.join(", ") : "—"}</div>
                <div className="fj-wdesc">{d.descs.length > 0 ? d.descs.join("; ") : "—"}</div>
              </div>
            ))}
          </div>

          <button className="fj-export" onClick={() => exportCSV("week")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Esporta Settimana CSV
          </button>
        </div>
      )}

      {/* ── Month View ── */}
      {view === "month" && (
        <div className="fj-body">
          <div className="fj-datenav">
            <button className="fj-nav-btn" onClick={() => {
              const d = new Date(selectedDate + "T12:00:00");
              d.setMonth(d.getMonth() - 1);
              setSelectedDate(d.toISOString().split("T")[0]);
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div className="fj-dateinfo">
              <div className="fj-datefull">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
              </div>
            </div>
            <button className="fj-nav-btn" onClick={() => {
              const d = new Date(selectedDate + "T12:00:00");
              d.setMonth(d.getMonth() + 1);
              setSelectedDate(d.toISOString().split("T")[0]);
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>

          <div className="fj-daytotal">
            <span className="fj-daytotal-label">Totale mese</span>
            <span className="fj-daytotal-val">{fmtHours(monthTotal)}</span>
          </div>

          {Object.entries(monthData).sort(([a], [b]) => a - b).map(([wk, wData]) => (
            <div key={wk} className="fj-month-week">
              <div className="fj-mweek-hdr">
                <span>Settimana {wk}</span>
                <span className="fj-mweek-tot">{fmtHours(wData.total)}</span>
              </div>
              {wData.days.filter((d) => d.hours > 0).map((d) => (
                <div
                  key={d.date}
                  className="fj-mday"
                  onClick={() => { setSelectedDate(d.date); setView("day"); }}
                >
                  <div className="fj-mday-date">
                    <span className="fj-mday-wd">{weekday(d.date)}</span>
                    <span>{fmtDate(d.date)}</span>
                  </div>
                  <div className="fj-mday-hrs">{fmtHours(d.hours)}</div>
                  <div className="fj-mday-info">
                    {d.sites.length > 0 && <span className="fj-mday-sites">{d.sites.join(", ")}</span>}
                    {d.descs.length > 0 && <span className="fj-mday-desc">{d.descs.join("; ")}</span>}
                  </div>
                </div>
              ))}
              {wData.days.every((d) => d.hours === 0) && (
                <div className="fj-mday-empty">Nessuna attività</div>
              )}
            </div>
          ))}

          <button className="fj-export" onClick={() => exportCSV("month")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
            Esporta Mese CSV
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════
//  STYLES
// ════════════════════
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&display=swap');

.fj {
  min-height: 100vh;
  background: #f5f4f1;
  font-family: 'DM Sans', -apple-system, sans-serif;
  -webkit-tap-highlight-color: transparent;
  -webkit-font-smoothing: antialiased;
  padding-bottom: 40px;
}

/* ── Header ── */
.fj-hdr { background: #1a1a1a; padding: 16px 16px 0; }
.fj-hdr h1 { font-size: 18px; font-weight: 700; color: #fff; letter-spacing: -0.3px; margin-bottom: 14px; }
.fj-tabs { display: flex; gap: 0; }
.fj-tab {
  flex: 1; padding: 10px 0; font-size: 13px; font-weight: 600;
  color: rgba(255,255,255,0.5); background: none; border: none;
  border-bottom: 2px solid transparent; cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  font-family: 'DM Sans', sans-serif;
}
.fj-tab.on { color: #fff; border-bottom-color: #e8b940; }
.fj-tab:active { color: rgba(255,255,255,0.8); }

/* ── Body ── */
.fj-body { padding: 0 12px; }

/* ── Date nav ── */
.fj-datenav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 0 8px; gap: 8px;
}
.fj-nav-btn {
  background: #fff; border: 1px solid #e5e2dc; border-radius: 10px;
  width: 40px; height: 40px; display: flex; align-items: center;
  justify-content: center; cursor: pointer; color: #1a1a1a; flex-shrink: 0;
}
.fj-nav-btn:active { background: #f0efec; }
.fj-dateinfo { flex: 1; text-align: center; }
.fj-datepick {
  font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 500;
  color: #1a1a1a; background: none; border: none; text-align: center;
  cursor: pointer; padding: 2px 0;
}
.fj-datefull {
  font-size: 13px; color: #8a847e; margin-top: 2px; text-transform: capitalize;
}

/* ── Day total ── */
.fj-daytotal {
  display: flex; justify-content: space-between; align-items: center;
  background: #1a1a1a; border-radius: 10px; padding: 14px 16px;
  margin: 8px 0 16px;
}
.fj-daytotal-label { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.6); }
.fj-daytotal-val {
  font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 600;
  color: #e8b940; letter-spacing: -0.5px;
}

/* ── Activities ── */
.fj-activities { margin-bottom: 16px; }
.fj-empty { text-align: center; padding: 40px 20px; color: #b0aaa4; }
.fj-empty p { font-size: 14px; }
.fj-empty .sub { font-size: 12px; margin-top: 2px; }

.fj-act {
  background: #fff; border: 1px solid #e8e5e0; border-radius: 12px;
  padding: 14px; margin-bottom: 10px;
}
.fj-act-head {
  display: flex; align-items: center; margin-bottom: 12px;
}
.fj-act-num {
  font-family: 'IBM Plex Mono', monospace; font-size: 12px; font-weight: 600;
  color: #b0aaa4; background: #f5f4f1; padding: 2px 8px; border-radius: 6px;
}
.fj-act-hrs {
  margin-left: auto; font-family: 'IBM Plex Mono', monospace; font-size: 14px;
  font-weight: 600; color: #1a1a1a;
}
.fj-act-del {
  margin-left: 10px; background: none; border: none; color: #ccc;
  cursor: pointer; padding: 4px; display: flex; border-radius: 6px;
}
.fj-act-del:active { color: #e74c3c; background: #fef2f2; }

/* ── Fields ── */
.fj-field { margin-bottom: 10px; position: relative; }
.fj-field label {
  display: block; font-size: 11px; font-weight: 600; color: #8a847e;
  text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;
}
.fj-input {
  width: 100%; padding: 10px 12px; font-family: 'DM Sans', sans-serif;
  font-size: 14px; color: #1a1a1a; background: #fafaf8;
  border: 1px solid #e8e5e0; border-radius: 8px; outline: none;
  transition: border-color 0.15s;
}
.fj-input:focus { border-color: #1a1a1a; background: #fff; }
.fj-input::placeholder { color: #c5c0ba; }
.fj-input-time { text-align: center; font-family: 'IBM Plex Mono', monospace; font-weight: 500; }
.fj-textarea { resize: vertical; min-height: 48px; line-height: 1.5; }

/* ── Time row ── */
.fj-timerow { display: flex; gap: 8px; align-items: flex-end; }
.fj-time-field { flex: 1; }
.fj-pause-field { width: 60px; flex-shrink: 0; }
.fj-pause-btn {
  width: 100%; padding: 10px 0; font-family: 'IBM Plex Mono', monospace;
  font-size: 13px; font-weight: 600; border: 1px solid #e8e5e0;
  border-radius: 8px; cursor: pointer; text-align: center;
  background: #fafaf8; color: #b0aaa4; transition: all 0.15s;
}
.fj-pause-btn.on { background: #1a1a1a; color: #e8b940; border-color: #1a1a1a; }
.fj-pause-btn:active { transform: scale(0.96); }

/* ── Site dropdown ── */
.fj-site-wrap { position: relative; }
.fj-dropdown {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 50;
  background: #fff; border: 1px solid #e5e2dc; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.1); max-height: 220px;
  overflow-y: auto; margin-top: 4px;
}
.fj-drop-item {
  display: block; width: 100%; text-align: left; padding: 10px 12px;
  border: none; background: none; cursor: pointer; border-bottom: 1px solid #f5f4f1;
  font-family: 'DM Sans', sans-serif;
}
.fj-drop-item:last-child { border-bottom: none; }
.fj-drop-item:active { background: #f5f4f1; }
.fj-drop-code {
  display: block; font-family: 'IBM Plex Mono', monospace; font-size: 12px;
  font-weight: 600; color: #c23616; margin-bottom: 2px;
}
.fj-drop-desc {
  display: block; font-size: 12px; color: #8a847e; line-height: 1.3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── Add button ── */
.fj-add {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px; background: none; border: 1px dashed #d5d0ca;
  border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 14px;
  font-weight: 600; color: #8a847e; cursor: pointer; margin-top: 4px;
}
.fj-add:active { background: #f0efec; border-style: solid; }

/* ── Day note ── */
.fj-daynote {
  background: #fff; border: 1px solid #e8e5e0; border-radius: 12px;
  padding: 14px; margin-bottom: 20px;
}
.fj-daynote label {
  display: block; font-size: 11px; font-weight: 600; color: #8a847e;
  text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;
}

/* ── Week table ── */
.fj-week-table { margin-bottom: 16px; }
.fj-wtable-hdr {
  display: grid; grid-template-columns: 60px 50px 1fr 1fr;
  padding: 8px 12px; font-size: 11px; font-weight: 600; color: #b0aaa4;
  text-transform: uppercase; letter-spacing: 0.5px;
}
.fj-wtable-row {
  display: grid; grid-template-columns: 60px 50px 1fr 1fr;
  padding: 12px; background: #fff; border: 1px solid #e8e5e0;
  border-radius: 10px; margin-bottom: 6px; align-items: center;
  cursor: pointer; transition: border-color 0.15s;
}
.fj-wtable-row:active { background: #fafaf8; }
.fj-wtable-row.today { border-color: #1a1a1a; border-width: 2px; }
.fj-wtable-row.empty { opacity: 0.5; }
.fj-wday { text-align: center; }
.fj-wday-name {
  display: block; font-size: 11px; font-weight: 600; color: #8a847e;
  text-transform: uppercase;
}
.fj-wday-num { font-family: 'IBM Plex Mono', monospace; font-size: 16px; font-weight: 600; color: #1a1a1a; }
.fj-whours {
  font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 600;
  color: #1a1a1a; text-align: center;
}
.fj-wsites { font-size: 12px; color: #8a847e; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 4px; }
.fj-wdesc { font-size: 12px; color: #b0aaa4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 4px; }

/* ── Export button ── */
.fj-export {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px; background: #1a1a1a; color: #fff;
  border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif;
  font-size: 14px; font-weight: 600; cursor: pointer; margin: 16px 0;
}
.fj-export:active { background: #333; }

/* ── Month view ── */
.fj-month-week {
  background: #fff; border: 1px solid #e8e5e0; border-radius: 12px;
  margin-bottom: 10px; overflow: hidden;
}
.fj-mweek-hdr {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; background: #fafaf8; border-bottom: 1px solid #f0eeea;
  font-size: 13px; font-weight: 600; color: #1a1a1a;
}
.fj-mweek-tot {
  font-family: 'IBM Plex Mono', monospace; font-size: 14px; color: #e8b940;
}
.fj-mday {
  display: flex; align-items: center; padding: 10px 14px; gap: 12px;
  border-bottom: 1px solid #f5f4f1; cursor: pointer;
}
.fj-mday:last-child { border-bottom: none; }
.fj-mday:active { background: #fafaf8; }
.fj-mday-date { width: 64px; flex-shrink: 0; }
.fj-mday-wd {
  display: block; font-size: 10px; font-weight: 600; color: #b0aaa4;
  text-transform: uppercase;
}
.fj-mday-date span:last-child { font-size: 12px; color: #8a847e; }
.fj-mday-hrs {
  font-family: 'IBM Plex Mono', monospace; font-size: 13px; font-weight: 600;
  color: #1a1a1a; width: 48px; flex-shrink: 0;
}
.fj-mday-info { flex: 1; min-width: 0; }
.fj-mday-sites {
  display: block; font-size: 12px; color: #1a1a1a; font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.fj-mday-desc {
  display: block; font-size: 11px; color: #b0aaa4;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.fj-mday-empty {
  padding: 12px 14px; font-size: 12px; color: #ccc; text-align: center;
}
`;
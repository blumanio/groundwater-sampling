import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";

// ── Search ──
function search(commesse, raw) {
  const q = raw.trim().toLowerCase();
  if (!q) return commesse;
  const tokens = q.split(/\s+/);
  const hits = [];
  for (let k = 0; k < commesse.length; k++) {
    const c = commesse[k];
    const hay = `${c.CodiceProgettoSAP} ${c.Descrizione}`.toLowerCase();
    const pos = hay.indexOf(q);
    if (pos !== -1) {
      hits.push({ c, s: pos === 0 ? 3 : 2 });
    } else {
      let all = true;
      for (let t = 0; t < tokens.length; t++) {
        if (hay.indexOf(tokens[t]) === -1) { all = false; break; }
      }
      if (all) hits.push({ c, s: 1 });
    }
  }
  hits.sort((a, b) => b.s - a.s);
  return hits.map((h) => h.c);
}

function useDebounce(value, ms) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return d;
}

function parseLoc(desc) {
  if (!desc) return { cliente: "—", location: "" };
  const p = desc.split("-").map((s) => s.trim());
  if (p.length >= 3) return { cliente: p[1], location: p.slice(2).join(" - ") };
  if (p.length === 2) return { cliente: p[0], location: p[1] };
  return { cliente: desc, location: "" };
}

function mapsUrl(loc) {
  return loc ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc)}` : null;
}

function Hl({ text, q }) {
  if (!q || !text) return text || "";
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return <>{text.slice(0, idx)}<mark className="tc-hl">{text.slice(idx, idx + q.length)}</mark>{text.slice(idx + q.length)}</>;
}

const PAGE_SIZE = 30;

const Card = React.memo(function Card({ c, query, expandedId, setExpandedId, copiedCode, onCopy }) {
  const { cliente, location } = parseLoc(c.Descrizione);
  const id = c._id || c.CodiceProgettoSAP;
  const isOpen = expandedId === id;
  const maps = mapsUrl(location);
  const isCopied = copiedCode === c.CodiceProgettoSAP;

  return (
    <div className="tc-card">
      <div className="tc-card-main" onClick={() => setExpandedId(isOpen ? null : id)}>
        <div className="tc-card-body">
          <div className="tc-codice"><Hl text={c.CodiceProgettoSAP} q={query} /></div>
          <div className="tc-cliente"><Hl text={cliente} q={query} /></div>
          {location && (
            <div className="tc-loc">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <Hl text={location} q={query} />
            </div>
          )}
        </div>
        <div className={`tc-chev${isOpen ? " open" : ""}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
        </div>
      </div>
      {isOpen && (
        <div className="tc-exp">
          <div className="tc-exp-desc">{c.Descrizione}</div>
          <div className="tc-acts">
            <button className={`tc-btn tc-btn-cp${isCopied ? " ok" : ""}`} onClick={(e) => { e.stopPropagation(); onCopy(c.CodiceProgettoSAP); }}>
              {isCopied ? (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>Copiato!</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M10.5 5.5V3.5a1.5 1.5 0 00-1.5-1.5H3.5A1.5 1.5 0 002 3.5V9a1.5 1.5 0 001.5 1.5h2" /></svg>Copia Codice</>
              )}
            </button>
            {maps && (
              <a href={maps} target="_blank" rel="noopener noreferrer" className="tc-btn tc-btn-map" onClick={(e) => e.stopPropagation()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>
                Indicazioni
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// ════════════════════════
//  MAIN COMPONENT
// ════════════════════════
export default function TrovaCommessa({ commesse = [] }) {
  const [raw, setRaw] = useState("");
  const query = useDebounce(raw, 80);
  const [copiedCode, setCopiedCode] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setVisibleCount(PAGE_SIZE); setExpandedId(null); }, [query]);

  // Split commesse: primary (20C1880) vs rest
  const primary = useMemo(() =>
    commesse.filter(c => c.CodiceProgettoSAP && c.CodiceProgettoSAP.startsWith("20C1880")),
    [commesse]
  );
  // eslint-disable-next-line
  const rest = useMemo(() =>
    commesse.filter(c => !c.CodiceProgettoSAP || !c.CodiceProgettoSAP.startsWith("20C1880")),
    [commesse]
  );

  // Active dataset based on toggle
  const dataset = useMemo(() => showAll ? commesse : primary, [showAll, commesse, primary]);

  // Search
  const results = useMemo(() => search(dataset, query), [dataset, query]);
  const visible = useMemo(() => results.slice(0, visibleCount), [results, visibleCount]);
  const hasMore = visibleCount < results.length;

  const handleCopy = useCallback((code) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  }, []);

  const handleSetExpanded = useCallback((id) => setExpandedId(id), []);

  return (
    <div className="tc-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        .tc-root {
          min-height: 100vh; background: #f5f4f1; font-family: 'DM Sans', -apple-system, sans-serif;
          -webkit-tap-highlight-color: transparent; -webkit-font-smoothing: antialiased;
        }
        .tc-hdr { background: #c23616; padding: 16px 16px 52px; }
        .tc-hdr-row { display: flex; align-items: center; justify-content: space-between; }
        .tc-hdr h1 { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
        .tc-hdr-badge {
          font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 600;
          color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.15);
          padding: 2px 10px; border-radius: 20px;
        }
        .tc-hdr p { font-size: 13px; color: rgba(255,255,255,0.65); margin-top: 2px; }

        .tc-search-wrap { margin: -32px 12px 0; position: relative; z-index: 10; }
        .tc-search {
          display: flex; align-items: center; background: #fff; border: 2px solid #e5e2dc;
          border-radius: 14px; padding: 0 14px; height: 52px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08); transition: border-color 0.15s;
        }
        .tc-search:focus-within { border-color: #c23616; box-shadow: 0 4px 20px rgba(194,54,22,0.13); }
        .tc-search input {
          flex: 1; border: none; outline: none; font-family: 'DM Sans', sans-serif;
          font-size: 16px; font-weight: 500; color: #1a1a1a; background: none; margin-left: 10px;
        }
        .tc-search input::placeholder { color: #b0aaa4; font-weight: 400; }
        .tc-x {
          background: none; border: none; color: #b0aaa4; cursor: pointer; padding: 6px;
          display: flex; border-radius: 50%; min-width: 30px; min-height: 30px;
          align-items: center; justify-content: center;
        }
        .tc-x:active { background: #f0efec; }

        .tc-meta {
          font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #b0aaa4;
          padding: 14px 16px 6px; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .tc-list { padding: 0 12px 120px; }

        .tc-card {
          background: #fff; border: 1px solid #e8e5e0; border-radius: 12px;
          margin-bottom: 8px; overflow: hidden;
        }
        .tc-card-main {
          display: flex; align-items: center; padding: 14px 12px; cursor: pointer; min-height: 64px;
        }
        .tc-card-body { flex: 1; min-width: 0; }
        .tc-codice {
          font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 700;
          color: #c23616; letter-spacing: -0.3px; margin-bottom: 3px;
        }
        .tc-cliente {
          font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 1px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .tc-loc {
          font-size: 12px; color: #8a847e; white-space: nowrap; overflow: hidden;
          text-overflow: ellipsis; display: flex; align-items: center; gap: 4px;
        }
        .tc-loc svg { flex-shrink: 0; }
        .tc-chev {
          flex-shrink: 0; margin-left: 8px; color: #ccc; transition: transform 0.2s;
          display: flex; align-items: center;
        }
        .tc-chev.open { transform: rotate(180deg); }

        .tc-exp { border-top: 1px solid #f0eeea; padding: 0 12px 12px; }
        .tc-exp-desc {
          font-size: 12px; color: #8a847e; line-height: 1.4; padding: 10px 0 12px;
          border-bottom: 1px solid #f0eeea; margin-bottom: 10px;
        }
        .tc-acts { display: flex; gap: 8px; }
        .tc-btn {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          padding: 12px 8px; border-radius: 10px; border: none; cursor: pointer;
          min-height: 48px; text-decoration: none;
        }
        .tc-btn:active { transform: scale(0.97); }
        .tc-btn-cp { background: #f5f4f1; color: #1a1a1a; border: 1px solid #e5e2dc; }
        .tc-btn-cp:active { background: #eeedea; }
        .tc-btn-cp.ok { background: #f0fdf4; border-color: #86efac; color: #16a34a; }
        .tc-btn-map { background: #1a73e8; color: #fff; }
        .tc-btn-map:active { background: #1557b0; }

        .tc-hl { background: #fde68a; border-radius: 2px; padding: 0 1px; }

        .tc-empty { text-align: center; padding: 60px 20px; color: #b0aaa4; }
        .tc-empty p { font-size: 14px; }
        .tc-empty .sub { font-size: 12px; margin-top: 4px; }

        .tc-more {
          display: block; width: 100%; padding: 14px; margin-top: 4px;
          background: none; border: 1px dashed #d5d0ca; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
          color: #8a847e; cursor: pointer; text-align: center;
        }
        .tc-more:active { background: #eeedea; }

        /* ── Toggle ── */
        .tc-toggle-wrap {
          display: flex; padding: 12px 12px 0; gap: 0;
        }
        .tc-toggle {
          flex: 1; padding: 10px 0; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 600; border: 1px solid #e5e2dc;
          cursor: pointer; text-align: center; background: #fff; color: #8a847e;
          transition: all 0.15s;
        }
        .tc-toggle:first-child { border-radius: 10px 0 0 10px; }
        .tc-toggle:last-child { border-radius: 0 10px 10px 0; border-left: none; }
        .tc-toggle.on {
          background: #1a1a1a; color: #fff; border-color: #1a1a1a;
        }
        .tc-toggle .tc-toggle-count {
          font-family: 'JetBrains Mono', monospace; font-size: 11px;
          opacity: 0.6; margin-left: 4px;
        }
      `}</style>

      {/* Header */}
      <div className="tc-hdr">
        <div className="tc-hdr-row">
          <h1>Trova Commessa</h1>
          <span className="tc-hdr-badge">{dataset.length}</span>
        </div>
        <p>Cerca per codice SAP o descrizione</p>
      </div>

      {/* Search */}
      <div className="tc-search-wrap">
        <div className="tc-search">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b0aaa4" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
            <circle cx="10.5" cy="10.5" r="7" /><path d="M15.5 15.5L21 21" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="es. 20C1880, ENI, Torino..."
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {raw && (
            <button className="tc-x" onClick={() => { setRaw(""); inputRef.current?.focus(); }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Toggle: 20C1880 vs All */}
      <div className="tc-toggle-wrap">
        <button className={`tc-toggle${!showAll ? " on" : ""}`} onClick={() => setShowAll(false)}>
          20C1880<span className="tc-toggle-count">{primary.length}</span>
        </button>
        <button className={`tc-toggle${showAll ? " on" : ""}`} onClick={() => setShowAll(true)}>
          Tutte<span className="tc-toggle-count">{commesse.length}</span>
        </button>
      </div>

      {/* Meta */}
      <div className="tc-meta">
        {query.trim()
          ? `${results.length} risultat${results.length === 1 ? "o" : "i"}`
          : showAll ? "Tutte le commesse" : "Commesse 20C1880"}
      </div>

      {/* List */}
      <div className="tc-list">
        {dataset.length === 0 ? (
          <div className="tc-empty">
            <div style={{ fontSize: 36, marginBottom: 10 }}>⏳</div>
            <p>Caricamento...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="tc-empty">
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
            <p>Nessuna commessa trovata</p>
            <p className="sub">Prova con un altro termine{!showAll && " o carica tutte le commesse"}</p>
          </div>
        ) : (
          <>
            {visible.map((c) => (
              <Card
                key={c._id || c.CodiceProgettoSAP}
                c={c}
                query={query}
                expandedId={expandedId}
                setExpandedId={handleSetExpanded}
                copiedCode={copiedCode}
                onCopy={handleCopy}
              />
            ))}
            {hasMore && (
              <button className="tc-more" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
                Mostra altri {Math.min(PAGE_SIZE, results.length - visibleCount)} di {results.length - visibleCount}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
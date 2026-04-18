import React, { useState, useEffect, useCallback } from 'react';
import config from '../config';
import { getLoggedInUser } from '../utils/utils';

const API_URL = config.API_URL;

// ── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES = ['Pompa', 'Generatore', 'Campionatore', 'Multiparametro', 'GPS', 'Altro'];
const STATUSES = ['in magazzino', 'in uso', 'manutenzione', 'fuori servizio'];

const CATEGORY_ICONS = {
  Pompa: '💧', Generatore: '⚡', Campionatore: '🧪',
  Multiparametro: '📊', GPS: '📍', Altro: '🔧',
};

const STATUS_META = {
  'in magazzino': { dot: '#22c55e', label: 'Magazzino', bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  'in uso': { dot: '#f59e0b', label: 'In Uso', bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  'manutenzione': { dot: '#f97316', label: 'Manutenzione', bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
  'fuori servizio': { dot: '#ef4444', label: 'Fuori Servizio', bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
};

const EMPTY_EQ = { name: '', category: 'Pompa', serialNumber: '', notes: '', status: 'in magazzino' };

const todayStr = () => new Date().toISOString().split('T')[0];
const nowISO = () => new Date().toISOString();

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};
console.log("todayStr:", todayStr());
const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
};

// ── Helpers ────────────────────────────────────────────────────────────────
const isAdmin = (user) => user?.role === 'admin' || user?.role === 'magazziniere';

// ── Main Component ─────────────────────────────────────────────────────────
export default function Magazzino() {
  const loggedInUser = getLoggedInUser();
  console.log("Logged in user:", loggedInUser);
  const userIsAdmin = isAdmin(loggedInUser);

  // Tab: 'campo' | 'magazzino' | 'log'
  const [tab, setTab] = useState('campo');

  // ── Equipment state ──
  const [equipment, setEquipment] = useState([]);
  const [eqLoading, setEqLoading] = useState(true);
  const [eqError, setEqError] = useState(null);
  const [filterCat, setFilterCat] = useState('Tutti');
  const [filterStatus, setFilterStatus] = useState('Tutti');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Assignment modal ──
  const [assignModal, setAssignModal] = useState(null); // { eq }
  const [assignSite, setAssignSite] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  // ── Return modal ──
  const [returnModal, setReturnModal] = useState(null); // { eq }
  const [returnNotes, setReturnNotes] = useState('');
  const [returnCondition, setReturnCondition] = useState('ok'); // ok | manutenzione | fuori_servizio
  const [returnLoading, setReturnLoading] = useState(false);

  // ── Inventory CRUD (admin only) ──
  const [showEqModal, setShowEqModal] = useState(false);
  const [editingEq, setEditingEq] = useState(null);
  const [eqForm, setEqForm] = useState(EMPTY_EQ);
  const [eqSubmitting, setEqSubmitting] = useState(false);

  // ── Event Log ──
  const [eventLog, setEventLog] = useState([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logFilter, setLogFilter] = useState('tutti'); // tutti | miei
  const [logPage, setLogPage] = useState(1);
  const LOG_PAGE_SIZE = 20;

  // ── Fetch equipment ──
  const fetchEquipment = useCallback(async () => {
    setEqLoading(true);
    setEqError(null);
    try {
      const res = await fetch(`${API_URL}/equipment`);
      if (!res.ok) throw new Error(res.statusText);
      setEquipment(await res.json());
    } catch {
      setEqError('Errore nel caricamento degli strumenti.');
    } finally {
      setEqLoading(false);
    }
  }, []);

  useEffect(() => { fetchEquipment(); }, [fetchEquipment]);

  // ── Fetch event log ──
  const fetchLog = useCallback(async () => {
    setLogLoading(true);
    try {
      const res = await fetch(`${API_URL}/equipment/events`);
      if (!res.ok) throw new Error();
      setEventLog(await res.json());
    } catch {
      // silently fail, show empty
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'log') fetchLog();
  }, [tab, fetchLog]);

  // ── My assigned tools ──
  const myTools = equipment.filter(
    eq => eq.status === 'in uso' &&
      (eq.assignedTo === loggedInUser?.fullName || eq.assignedTo === loggedInUser?.email)
  );

  // ── Filtered equipment for lists ──
  const filteredEquipment = equipment.filter(eq => {
    const catMatch = filterCat === 'Tutti' || eq.category === filterCat;
    const statusMatch = filterStatus === 'Tutti' || eq.status === filterStatus;
    const searchMatch = !searchQuery ||
      eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (eq.serialNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (eq.assignedTo || '').toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && statusMatch && searchMatch;
  });

  // ── Assign tool to self ──
  const handleAssign = async () => {
    if (!assignSite.trim()) return;
    setAssignLoading(true);
    try {
      const res = await fetch(`${API_URL}/equipment/${assignModal.eq._id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedTo: loggedInUser?.fullName || loggedInUser?.email,
          assignedAt: nowISO(),
          site: assignSite,
          notes: assignNotes,
          status: 'in uso',
          eventType: 'prelievo',
          createdBy: loggedInUser?.fullName || '',
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setAssignModal(null);
      setAssignSite('');
      setAssignNotes('');
      fetchEquipment();
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  // ── Return tool ──
  const handleReturn = async () => {
    setReturnLoading(true);
    const newStatus = returnCondition === 'ok' ? 'in magazzino'
      : returnCondition === 'manutenzione' ? 'manutenzione'
        : 'fuori servizio';
    try {
      const res = await fetch(`${API_URL}/equipment/${returnModal.eq._id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnedAt: nowISO(),
          notes: returnNotes,
          condition: returnCondition,
          status: newStatus,
          eventType: 'riconsegna',
          createdBy: loggedInUser?.fullName || '',
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      setReturnModal(null);
      setReturnNotes('');
      setReturnCondition('ok');
      fetchEquipment();
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setReturnLoading(false);
    }
  };

  // ── Equipment CRUD (admin) ──
  const openNewEq = () => { setEditingEq(null); setEqForm(EMPTY_EQ); setShowEqModal(true); };
  const openEditEq = (eq) => {
    setEditingEq(eq);
    setEqForm({ name: eq.name, category: eq.category, serialNumber: eq.serialNumber || '', notes: eq.notes || '', status: eq.status });
    setShowEqModal(true);
  };
  const submitEqForm = async (e) => {
    e.preventDefault();
    setEqSubmitting(true);
    try {
      const url = editingEq ? `${API_URL}/equipment/${editingEq._id}` : `${API_URL}/equipment`;
      const method = editingEq ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(eqForm) });
      if (!res.ok) throw new Error((await res.json()).message);
      setShowEqModal(false);
      fetchEquipment();
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setEqSubmitting(false);
    }
  };
  const deleteEq = async (id) => {
    if (!window.confirm('Eliminare questo strumento e tutto il suo storico?')) return;
    try {
      const res = await fetch(`${API_URL}/equipment/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      fetchEquipment();
    } catch { alert("Errore durante l'eliminazione."); }
  };

  // ── Log filtered ──
  const filteredLog = eventLog.filter(ev => {
    if (logFilter === 'miei') return ev.createdBy === loggedInUser?.fullName;
    return true;
  });
  const pagedLog = filteredLog.slice(0, logPage * LOG_PAGE_SIZE);

  // ── Status counts ──
  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = equipment.filter(e => e.status === s).length;
    return acc;
  }, {});

  // ══════════════════════════════════════════════════════
  //  STYLES (inline CSS variables approach)
  // ══════════════════════════════════════════════════════
  const styles = {
    page: {
      maxWidth: 720,
      margin: '0 auto',
      padding: '16px 16px 120px',
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    },
  };

  const TAB_CONFIG = [
    { id: 'campo', label: '🧰 Campo', show: true },
    { id: 'magazzino', label: '📦 Magazzino', show: true },
    { id: 'log', label: '📋 Storico', show: userIsAdmin },
  ].filter(t => t.show);

  return (
    <div style={styles.page}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: -0.5 }}>
              📦 Magazzino
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>
              {loggedInUser?.fullName || 'Ospite'} · {fmtDate(new Date().toISOString())}
            </p>
          </div>
          {myTools.length > 0 && (
            <div style={{ background: '#fef3c7', border: '1.5px solid #fbbf24', borderRadius: 12, padding: '6px 14px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#92400e', margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>Con te</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: '#78350f', margin: 0 }}>{myTools.length}</p>
            </div>
          )}
        </div>

        {/* Status summary strip */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {STATUSES.map(s => {
            const m = STATUS_META[s];
            return (
              <div key={s} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: m.bg, border: `1.5px solid ${m.border}`,
                borderRadius: 20, padding: '4px 10px',
                fontSize: 12, fontWeight: 600, color: m.text, cursor: 'pointer',
                transition: 'transform 0.1s',
              }}
                onClick={() => { setFilterStatus(filterStatus === s ? 'Tutti' : s); setTab('magazzino'); }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.dot, flexShrink: 0 }} />
                {m.label} <span style={{ fontWeight: 800 }}>{counts[s] || 0}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 14, padding: 4, marginBottom: 20, gap: 4 }}>
        {TAB_CONFIG.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: '11px 8px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13, transition: 'all 0.2s', minHeight: 46,
            background: tab === t.id ? '#fff' : 'transparent',
            color: tab === t.id ? '#6366f1' : '#64748b',
            boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════ TAB: CAMPO ══════════ */}
      {tab === 'campo' && (
        <div>
          {/* My tools section */}
          {myTools.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <SectionLabel icon="🧰" text={`Tuoi strumenti (${myTools.length})`} color="#f59e0b" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {myTools.map(eq => (
                  <MyToolCard
                    key={eq._id} eq={eq}
                    onReturn={() => { setReturnModal({ eq }); setReturnNotes(''); setReturnCondition('ok'); }}
                  />
                ))}
              </div>
            </div>
          )}

          {myTools.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px 0 12px', color: '#94a3b8' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🧰</div>
              <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>Nessuno strumento assegnato</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Preleva dalla lista qui sotto.</p>
            </div>
          )}

          {/* Available to pick up */}
          <SectionLabel icon="✅" text="Disponibili in magazzino" color="#22c55e" />
          {eqLoading ? <LoadingState /> : eqError ? <ErrorState msg={eqError} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {equipment.filter(eq => eq.status === 'in magazzino').map(eq => (
                <AvailableToolCard key={eq._id} eq={eq}
                  onAssign={() => { setAssignModal({ eq }); setAssignSite(''); setAssignNotes(''); }}
                />
              ))}
              {equipment.filter(eq => eq.status === 'in magazzino').length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 14 }}>
                  Nessuno strumento disponibile al momento.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════ TAB: MAGAZZINO ══════════ */}
      {tab === 'magazzino' && (
        <div>
          {/* Search & filters */}
          <div style={{ marginBottom: 14 }}>
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="🔍 Cerca per nome, S/N, tecnico..."
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1.5px solid #e2e8f0', borderRadius: 12,
                padding: '11px 16px', fontSize: 14, color: '#1e293b',
                outline: 'none', background: '#fff', marginBottom: 10,
              }}
            />
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {['Tutti', ...CATEGORIES].map(c => (
                <FilterPill key={c} label={c} active={filterCat === c} onClick={() => setFilterCat(c)} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingTop: 8 }}>
              {['Tutti', ...STATUSES].map(s => (
                <FilterPill key={s} label={s === 'Tutti' ? 'Tutti gli stati' : STATUS_META[s].label}
                  active={filterStatus === s} onClick={() => setFilterStatus(s)} accent />
              ))}
            </div>
          </div>

          {userIsAdmin && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
              <button onClick={openNewEq} style={{
                background: '#6366f1', color: '#fff', border: 'none',
                padding: '11px 20px', borderRadius: 12, fontWeight: 700,
                fontSize: 14, cursor: 'pointer', minHeight: 48,
              }}>
                + Aggiungi strumento
              </button>
            </div>
          )}

          {eqLoading ? <LoadingState /> : eqError ? <ErrorState msg={eqError} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredEquipment.map(eq => (
                <InventoryCard
                  key={eq._id} eq={eq}
                  isAdmin={userIsAdmin}
                  currentUser={loggedInUser}
                  onEdit={() => openEditEq(eq)}
                  onDelete={() => deleteEq(eq._id)}
                  onAssign={() => { setAssignModal({ eq }); setAssignSite(''); setAssignNotes(''); }}
                  onReturn={() => { setReturnModal({ eq }); setReturnNotes(''); setReturnCondition('ok'); }}
                />
              ))}
              {filteredEquipment.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
                  <p style={{ fontWeight: 600, margin: 0 }}>Nessun risultato</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════ TAB: LOG (admin only) ══════════ */}
      {tab === 'log' && userIsAdmin && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[['tutti', '📋 Tutti gli eventi'], ['miei', '👤 Miei']].map(([id, label]) => (
              <button key={id} onClick={() => setLogFilter(id)} style={{
                padding: '9px 18px', borderRadius: 10, border: '1.5px solid',
                borderColor: logFilter === id ? '#6366f1' : '#e2e8f0',
                background: logFilter === id ? '#eef2ff' : '#fff',
                color: logFilter === id ? '#4f46e5' : '#64748b',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', minHeight: 42,
              }}>
                {label}
              </button>
            ))}
            <button onClick={fetchLog} style={{
              marginLeft: 'auto', padding: '9px 16px', borderRadius: 10,
              border: '1.5px solid #e2e8f0', background: '#fff',
              color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
              🔄 Aggiorna
            </button>
          </div>

          {logLoading ? <LoadingState /> : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pagedLog.map((ev, i) => <EventLogRow key={ev._id || i} ev={ev} />)}
              </div>
              {pagedLog.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <p style={{ fontWeight: 600, margin: 0 }}>Nessun evento registrato</p>
                </div>
              )}
              {pagedLog.length < filteredLog.length && (
                <button onClick={() => setLogPage(p => p + 1)} style={{
                  width: '100%', marginTop: 16, padding: '13px', borderRadius: 12,
                  border: '1.5px dashed #cbd5e1', background: 'transparent',
                  color: '#64748b', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}>
                  Mostra altri ({filteredLog.length - pagedLog.length} rimanenti)
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════ MODAL: Assign ══════════ */}
      {assignModal && (
        <BottomModal title={`Preleva: ${assignModal.eq.name}`} onClose={() => setAssignModal(null)}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 28 }}>{CATEGORY_ICONS[assignModal.eq.category] || '🔧'}</span>
              <div>
                <p style={{ fontWeight: 700, margin: 0, color: '#1e293b' }}>{assignModal.eq.name}</p>
                {assignModal.eq.serialNumber && (
                  <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#64748b', margin: '2px 0 0' }}>
                    S/N: {assignModal.eq.serialNumber}
                  </p>
                )}
              </div>
            </div>

            <Label>Tecnico</Label>
            <div style={{ padding: '12px 16px', background: '#eef2ff', borderRadius: 10, marginBottom: 12, fontWeight: 600, color: '#3730a3', fontSize: 14 }}>
              👤 {loggedInUser?.fullName || loggedInUser?.email}
            </div>

            <Label>Sito / Commessa *</Label>
            <input
              value={assignSite}
              onChange={e => setAssignSite(e.target.value)}
              placeholder="es. PV 12255 – San Donato Milanese"
              style={inputStyle}
              autoFocus
            />

            <Label>Note (opzionale)</Label>
            <textarea value={assignNotes} onChange={e => setAssignNotes(e.target.value)}
              rows={2} placeholder="Condizioni, osservazioni..." style={{ ...inputStyle, resize: 'vertical' }} />

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setAssignModal(null)} style={btnSecondary}>Annulla</button>
              <button
                onClick={handleAssign}
                disabled={assignLoading || !assignSite.trim()}
                style={{ ...btnPrimary, background: '#22c55e', opacity: (!assignSite.trim() || assignLoading) ? 0.5 : 1 }}
              >
                {assignLoading ? 'Prelievo...' : '✓ Preleva'}
              </button>
            </div>
          </div>
        </BottomModal>
      )}

      {/* ══════════ MODAL: Return ══════════ */}
      {returnModal && (
        <BottomModal title={`Riconsegna: ${returnModal.eq.name}`} onClose={() => setReturnModal(null)}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 28 }}>{CATEGORY_ICONS[returnModal.eq.category] || '🔧'}</span>
              <div>
                <p style={{ fontWeight: 700, margin: 0, color: '#1e293b' }}>{returnModal.eq.name}</p>
                <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                  In uso da: <strong>{returnModal.eq.assignedTo}</strong>
                </p>
                {returnModal.eq.assignedSite && (
                  <p style={{ fontSize: 12, color: '#64748b', margin: '1px 0 0' }}>
                    Sito: {returnModal.eq.assignedSite}
                  </p>
                )}
              </div>
            </div>

            <Label>Condizione al rientro *</Label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {[
                { id: 'ok', icon: '✅', label: 'Tutto OK', color: '#22c55e', bg: '#f0fdf4', border: '#86efac' },
                { id: 'manutenzione', icon: '🔧', label: 'Manutenzione', color: '#f97316', bg: '#fff7ed', border: '#fdba74' },
                { id: 'fuori_servizio', icon: '❌', label: 'Fuori Serv.', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
              ].map(opt => (
                <button key={opt.id} onClick={() => setReturnCondition(opt.id)} style={{
                  flex: 1, padding: '10px 6px', borderRadius: 10, border: `2px solid`,
                  borderColor: returnCondition === opt.id ? opt.color : '#e2e8f0',
                  background: returnCondition === opt.id ? opt.bg : '#fff',
                  color: returnCondition === opt.id ? opt.color : '#64748b',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer', textAlign: 'center',
                }}>
                  <div>{opt.icon}</div>
                  <div style={{ marginTop: 3 }}>{opt.label}</div>
                </button>
              ))}
            </div>

            <Label>Note (opzionale)</Label>
            <textarea value={returnNotes} onChange={e => setReturnNotes(e.target.value)}
              rows={2} placeholder="Problemi riscontrati, osservazioni..." style={{ ...inputStyle, resize: 'vertical' }} />

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button onClick={() => setReturnModal(null)} style={btnSecondary}>Annulla</button>
              <button onClick={handleReturn} disabled={returnLoading}
                style={{ ...btnPrimary, background: '#f97316', opacity: returnLoading ? 0.5 : 1 }}>
                {returnLoading ? 'Riconsegna...' : '↩ Riconsegna'}
              </button>
            </div>
          </div>
        </BottomModal>
      )}

      {/* ══════════ MODAL: Equipment CRUD (admin) ══════════ */}
      {showEqModal && (
        <BottomModal title={editingEq ? 'Modifica Strumento' : 'Nuovo Strumento'} onClose={() => setShowEqModal(false)}>
          <form onSubmit={submitEqForm}>
            <Label>Nome *</Label>
            <input value={eqForm.name} onChange={e => setEqForm(f => ({ ...f, name: e.target.value }))}
              required placeholder="es. Pompa Grundfos MP1" style={inputStyle} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '12px 0' }}>
              <div>
                <Label>Categoria</Label>
                <select value={eqForm.category} onChange={e => setEqForm(f => ({ ...f, category: e.target.value }))} style={inputStyle}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Stato</Label>
                <select value={eqForm.status} onChange={e => setEqForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <Label>N° Seriale</Label>
            <input value={eqForm.serialNumber} onChange={e => setEqForm(f => ({ ...f, serialNumber: e.target.value }))}
              placeholder="Opzionale" style={{ ...inputStyle, fontFamily: 'monospace', marginBottom: 12 }} />

            <Label>Note</Label>
            <textarea value={eqForm.notes} onChange={e => setEqForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Opzionale" style={{ ...inputStyle, resize: 'vertical' }} />

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button type="button" onClick={() => setShowEqModal(false)} style={btnSecondary}>Annulla</button>
              <button type="submit" disabled={eqSubmitting} style={{ ...btnPrimary, opacity: eqSubmitting ? 0.5 : 1 }}>
                {eqSubmitting ? 'Salvataggio...' : '✓ Salva'}
              </button>
            </div>
          </form>
        </BottomModal>
      )}
    </div>
  );
}

// ── Shared style tokens ──────────────────────────────────────────────────
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  border: '1.5px solid #e2e8f0', borderRadius: 10,
  padding: '11px 14px', fontSize: 14, color: '#1e293b',
  outline: 'none', background: '#fff', marginBottom: 4,
};
const btnPrimary = {
  flex: 1, padding: '13px', borderRadius: 12, border: 'none',
  background: '#6366f1', color: '#fff',
  fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 50,
};
const btnSecondary = {
  flex: 1, padding: '13px', borderRadius: 12,
  border: '1.5px solid #e2e8f0', background: '#f8fafc',
  color: '#475569', fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 50,
};

// ── Sub-components ───────────────────────────────────────────────────────

function Label({ children }) {
  return <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' }}>{children}</p>;
}

function SectionLabel({ icon, text, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
      <span>{icon}</span>
      <p style={{ fontWeight: 700, fontSize: 13, color: color || '#334155', textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>{text}</p>
    </div>
  );
}

function FilterPill({ label, active, onClick, accent }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
      borderColor: active ? (accent ? '#6366f1' : '#0ea5e9') : '#e2e8f0',
      background: active ? (accent ? '#eef2ff' : '#f0f9ff') : '#fff',
      color: active ? (accent ? '#4f46e5' : '#0369a1') : '#64748b',
      fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {label}
    </button>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META['in magazzino'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: m.bg, border: `1.5px solid ${m.border}`,
      borderRadius: 20, padding: '4px 10px',
      fontSize: 11, fontWeight: 700, color: m.text, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.dot }} />
      {m.label}
    </span>
  );
}

function LocationBadge({ eq }) {
  if (eq.status === 'in magazzino') {
    return <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>📦 In magazzino</span>;
  }
  if (eq.status === 'in uso' && eq.assignedTo) {
    return (
      <div>
        <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>👤 {eq.assignedTo}</span>
        {eq.assignedSite && (
          <span style={{ fontSize: 11, color: '#b45309', fontWeight: 500, display: 'block' }}>📍 {eq.assignedSite}</span>
        )}
        {eq.assignedAt && (
          <span style={{ fontSize: 10, color: '#d97706', fontFamily: 'monospace' }}>dal {new Date(eq.assignedAt).toLocaleDateString('it-IT')}</span>
        )}
      </div>
    );
  }
  if (eq.status === 'manutenzione') return <span style={{ fontSize: 12, color: '#c2410c', fontWeight: 600 }}>🔧 In manutenzione</span>;
  if (eq.status === 'fuori servizio') return <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>❌ Fuori servizio</span>;
  return null;
}

function MyToolCard({ eq, onReturn }) {
  const daysOut = eq.assignedAt
    ? Math.floor((Date.now() - new Date(eq.assignedAt)) / 86400000)
    : null;

  return (
    <div style={{
      background: '#fffbeb', border: '2px solid #fbbf24',
      borderRadius: 14, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>{CATEGORY_ICONS[eq.category] || '🔧'}</span>
          <div>
            <p style={{ fontWeight: 700, color: '#1e293b', margin: 0, fontSize: 15 }}>{eq.name}</p>
            {eq.serialNumber && (
              <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>S/N: {eq.serialNumber}</p>
            )}
            {eq.assignedSite && (
              <p style={{ fontSize: 12, color: '#b45309', margin: '4px 0 0', fontWeight: 600 }}>📍 {eq.assignedSite}</p>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {daysOut !== null && (
            <div style={{ background: daysOut > 7 ? '#fee2e2' : '#fef3c7', borderRadius: 8, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: daysOut > 7 ? '#dc2626' : '#92400e' }}>
              {daysOut === 0 ? 'Oggi' : `${daysOut}g`}
            </div>
          )}
        </div>
      </div>
      <button onClick={onReturn} style={{
        marginTop: 12, width: '100%', padding: '10px', borderRadius: 10,
        border: '1.5px solid #f97316', background: '#fff7ed',
        color: '#c2410c', fontWeight: 700, fontSize: 13, cursor: 'pointer', minHeight: 44,
      }}>
        ↩ Riconsegna al magazzino
      </button>
    </div>
  );
}

function AvailableToolCard({ eq, onAssign }) {
  return (
    <div style={{
      background: '#fff', border: '1.5px solid #e2e8f0',
      borderRadius: 14, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <span style={{ fontSize: 28, flexShrink: 0 }}>{CATEGORY_ICONS[eq.category] || '🔧'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, color: '#1e293b', margin: 0, fontSize: 15 }}>{eq.name}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>{eq.category}</span>
          {eq.serialNumber && (
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>S/N: {eq.serialNumber}</span>
          )}
        </div>
      </div>
      <button onClick={onAssign} style={{
        flexShrink: 0, padding: '10px 16px', borderRadius: 10,
        border: 'none', background: '#6366f1', color: '#fff',
        fontWeight: 700, fontSize: 13, cursor: 'pointer', minHeight: 44,
      }}>
        Preleva
      </button>
    </div>
  );
}

function InventoryCard({ eq, isAdmin, currentUser, onEdit, onDelete, onAssign, onReturn }) {
  const [expanded, setExpanded] = useState(false);
  const isMyTool = eq.assignedTo === currentUser?.fullName || eq.assignedTo === currentUser?.email;

  return (
    <div style={{
      background: '#fff', border: `1.5px solid ${eq.status === 'in uso' ? '#fde68a' : '#e2e8f0'}`,
      borderRadius: 14, overflow: 'hidden',
    }}>
      <div
        style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}
        onClick={() => setExpanded(e => !e)}
      >
        <span style={{ fontSize: 26, flexShrink: 0, marginTop: 1 }}>{CATEGORY_ICONS[eq.category] || '🔧'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontWeight: 700, color: '#1e293b', margin: 0, fontSize: 15 }}>{eq.name}</p>
            <StatusBadge status={eq.status} />
          </div>
          <div style={{ marginTop: 4 }}>
            <LocationBadge eq={eq} />
          </div>
          {eq.serialNumber && (
            <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>S/N: {eq.serialNumber}</p>
          )}
        </div>
        <span style={{ color: '#94a3b8', fontSize: 18, flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 16px', background: '#fafafa' }}>
          {eq.notes && (
            <p style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', margin: '0 0 12px' }}>📝 {eq.notes}</p>
          )}
          {eq.status === 'in uso' && eq.assignedAt && (
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px', fontFamily: 'monospace' }}>
              Prelevato il: {new Date(eq.assignedAt).toLocaleString('it-IT')}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {eq.status === 'in magazzino' && (
              <button onClick={onAssign} style={{
                padding: '9px 16px', borderRadius: 10, border: 'none',
                background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', minHeight: 42,
              }}>
                ✋ Preleva
              </button>
            )}
            {eq.status === 'in uso' && (isMyTool || isAdmin) && (
              <button onClick={onReturn} style={{
                padding: '9px 16px', borderRadius: 10, border: '1.5px solid #f97316',
                background: '#fff7ed', color: '#c2410c', fontWeight: 700, fontSize: 13, cursor: 'pointer', minHeight: 42,
              }}>
                ↩ Riconsegna
              </button>
            )}
            {isAdmin && (
              <>
                <button onClick={onEdit} style={{
                  padding: '9px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                  background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer', minHeight: 42,
                }}>
                  ✏️ Modifica
                </button>
                <button onClick={onDelete} style={{
                  padding: '9px 16px', borderRadius: 10, border: '1.5px solid #fecaca',
                  background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: 13, cursor: 'pointer', minHeight: 42,
                }}>
                  🗑
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EventLogRow({ ev }) {
  const typeConfig = {
    prelievo: { icon: '✋', color: '#6366f1', bg: '#eef2ff', label: 'Prelievo' },
    riconsegna: { icon: '↩', color: '#22c55e', bg: '#f0fdf4', label: 'Riconsegna' },
    manutenzione: { icon: '🔧', color: '#f97316', bg: '#fff7ed', label: 'Manutenzione' },
    modifica: { icon: '✏️', color: '#64748b', bg: '#f8fafc', label: 'Modifica' },
    default: { icon: '📋', color: '#64748b', bg: '#f8fafc', label: ev.eventType || 'Evento' },
  };
  const cfg = typeConfig[ev.eventType] || typeConfig.default;

  return (
    <div style={{
      background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: 12,
      padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: cfg.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {cfg.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: cfg.color }}>{cfg.label}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{ev.equipmentName || '—'}</span>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
          {ev.createdBy && <span>👤 {ev.createdBy}</span>}
          {ev.site && <span> · 📍 {ev.site}</span>}
          {ev.condition && ev.condition !== 'ok' && (
            <span style={{ color: '#ef4444', fontWeight: 600 }}> · ⚠️ {ev.condition}</span>
          )}
        </div>
        {ev.notes && (
          <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', margin: '3px 0 0' }}>{ev.notes}</p>
        )}
        <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#cbd5e1', margin: '4px 0 0' }}>
          {fmtDateTime(ev.createdAt || ev.timestamp)}
        </p>
      </div>
    </div>
  );
}

function BottomModal({ title, children, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      zIndex: 50, padding: '0 8px',
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 520, maxHeight: '92vh',
        overflowY: 'auto', padding: '20px 20px 36px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 800, fontSize: 17, color: '#1e293b', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{
            background: '#f1f5f9', border: 'none', borderRadius: '50%',
            width: 34, height: 34, fontSize: 18, cursor: 'pointer', color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
      <div style={{ fontSize: 32, marginBottom: 10, animation: 'pulse 1.5s infinite' }}>📦</div>
      <p style={{ fontWeight: 600 }}>Caricamento...</p>
    </div>
  );
}

function ErrorState({ msg }) {
  return <div style={{ textAlign: 'center', padding: '32px 0', color: '#ef4444', fontWeight: 600 }}>{msg}</div>;
}
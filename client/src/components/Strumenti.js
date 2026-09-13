import React, { useState, useEffect, useCallback, useMemo } from 'react';
import config from '../config';
import { getLoggedInUser } from '../utils/utils';
import {
    INSTRUMENT_TYPES,
    CALIBRATION_RESULTS,
    getGuide,
    getSpecFields,
} from '../utils/calibrationGuides';

const API_URL = config.API_URL;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const LEVEL_META = {
    'scaduto': { label: 'Scaduto', bg: '#fef2f2', text: '#991b1b', border: '#fecaca', dot: '#ef4444' },
    'in scadenza': { label: 'In scadenza', bg: '#fffbeb', text: '#92400e', border: '#fde68a', dot: '#f59e0b' },
    'valido': { label: 'Valido', bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', dot: '#22c55e' },
    'da pianificare': { label: 'Da pianificare', bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe', dot: '#3b82f6' },
    'non richiesto': { label: 'Non richiesto', bg: '#f8fafc', text: '#475569', border: '#e2e8f0', dot: '#94a3b8' },
};

const EMPTY_FORM = {
    name: '', brand: '', model: '', serialNumber: '',
    category: 'Multiparametro', instrumentType: 'multiparametrica',
    requiresCalibration: true,
    responsabile: '', responsabileEmail: '',
    calibrationIntervalDays: 365, fieldCheckIntervalDays: '',
    certificationExpiry: '', calibrationExpiry: '',
    specs: {}, notes: '',
};

const isAdmin = (user) => user?.role === 'admin' || user?.role === 'magazziniere';

const todayInput = () => new Date().toISOString().split('T')[0];

const toDateInput = (value) => (value ? new Date(value).toISOString().split('T')[0] : '');

const fmtDate = (value) => (value ? new Date(value).toLocaleDateString('it-IT') : '—');

const daysLabel = (days) => {
    if (days === null || days === undefined) return 'nessuna scadenza impostata';
    if (days < 0) return `scaduto da ${Math.abs(days)} g`;
    if (days === 0) return 'scade oggi';
    return `fra ${days} g`;
};

// ── Small presentational pieces ────────────────────────────────────────────
const StatusPill = ({ level, daysLeft }) => {
    const meta = LEVEL_META[level] || LEVEL_META['non richiesto'];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: meta.bg, border: `1.5px solid ${meta.border}`, color: meta.text,
            borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
            {meta.label}
            {daysLeft !== null && daysLeft !== undefined && (
                <span style={{ fontWeight: 600, opacity: 0.8 }}>· {daysLabel(daysLeft)}</span>
            )}
        </span>
    );
};

const SectionLabel = ({ icon, text, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 10px' }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: color || '#475569', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {text}
        </span>
    </div>
);

const Field = ({ label, hint, children }) => (
    <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 5 }}>
            {label}
        </label>
        {children}
        {hint && <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>{hint}</p>}
    </div>
);

const inputStyle = {
    width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 10,
    padding: '10px 12px', fontSize: 14, color: '#1e293b', outline: 'none', background: '#fff',
};

const btnPrimary = {
    background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10,
    padding: '11px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 44,
};

const btnGhost = {
    background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10,
    padding: '11px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', minHeight: 44,
};

const Modal = ({ title, onClose, children }) => (
    <div
        onClick={onClose}
        style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 100,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 0,
        }}
    >
        <div
            onClick={e => e.stopPropagation()}
            style={{
                background: '#fff', borderRadius: '18px 18px 0 0', width: '100%', maxWidth: 640,
                maxHeight: '92vh', overflowY: 'auto', padding: 20,
                paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1e293b', margin: 0 }}>{title}</h2>
                <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>
                    ×
                </button>
            </div>
            {children}
        </div>
    </div>
);

// ── Calibration wizard ─────────────────────────────────────────────────────
const CalibrationModal = ({ instrument, user, onClose, onSaved }) => {
    const guide = getGuide(instrument.instrumentType);
    const [procedureIndex, setProcedureIndex] = useState(0);
    const procedure = guide.procedures[procedureIndex];

    const [checkedSteps, setCheckedSteps] = useState([]);
    const [readings, setReadings] = useState({});
    const [performedAt, setPerformedAt] = useState(todayInput());
    const [result, setResult] = useState('conforme');
    const [provider, setProvider] = useState('');
    const [certificateNumber, setCertificateNumber] = useState('');
    const [certificateUrl, setCertificateUrl] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const isFieldCheck = procedure.type === 'verifica di campo' || procedure.type === 'bump test';

    // Scadenza proposta: data esecuzione + intervallo dello strumento.
    useEffect(() => {
        if (isFieldCheck) {
            setValidUntil('');
            return;
        }
        const interval = Number(instrument.calibrationIntervalDays) || guide.suggestedIntervalDays || 365;
        const base = performedAt ? new Date(performedAt) : new Date();
        setValidUntil(new Date(base.getTime() + interval * MS_PER_DAY).toISOString().split('T')[0]);
    }, [performedAt, procedureIndex, isFieldCheck, instrument.calibrationIntervalDays, guide.suggestedIntervalDays]);

    // Cambiando procedura le spunte e i valori della precedente non hanno più senso.
    useEffect(() => {
        setCheckedSteps([]);
        setReadings({});
    }, [procedureIndex]);

    const toggleStep = (index) => {
        setCheckedSteps(prev => (prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]));
    };

    const handleSubmit = async () => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/equipment/${instrument._id}/calibrations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: procedure.type,
                    performedAt,
                    performedBy: user?.fullName || user?.email || '',
                    provider: provider || undefined,
                    certificateNumber: certificateNumber || undefined,
                    certificateUrl: certificateUrl || undefined,
                    result,
                    validUntil: validUntil || undefined,
                    readings,
                    notes: notes || undefined,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).message || 'Errore durante il salvataggio');
            onSaved();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title={`Taratura — ${instrument.name}`} onClose={onClose}>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 14px' }}>{guide.label}</p>

            <Field label="Procedura">
                <select
                    value={procedureIndex}
                    onChange={e => setProcedureIndex(Number(e.target.value))}
                    style={inputStyle}
                >
                    {guide.procedures.map((p, i) => (
                        <option key={p.title} value={i}>{p.title}</option>
                    ))}
                </select>
            </Field>

            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', margin: '0 0 8px' }}>
                    Frequenza: {procedure.frequency}
                </p>

                <SectionLabel icon="🧪" text="Materiale necessario" />
                <ul style={{ margin: '0 0 14px', paddingLeft: 18, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                    {procedure.materials.map(m => <li key={m}>{m}</li>)}
                </ul>

                <SectionLabel icon="✅" text={`Procedura (${checkedSteps.length}/${procedure.steps.length})`} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {procedure.steps.map((step, i) => (
                        <label key={step} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', cursor: 'pointer', fontSize: 13, color: '#334155', lineHeight: 1.5 }}>
                            <input
                                type="checkbox"
                                checked={checkedSteps.includes(i)}
                                onChange={() => toggleStep(i)}
                                style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, accentColor: '#6366f1' }}
                            />
                            <span style={{ textDecoration: checkedSteps.includes(i) ? 'line-through' : 'none', opacity: checkedSteps.includes(i) ? 0.55 : 1 }}>
                                {step}
                            </span>
                        </label>
                    ))}
                </div>

                {procedure.acceptance && (
                    <p style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8, padding: '8px 10px', margin: '14px 0 0' }}>
                        <strong>Criterio di accettazione:</strong> {procedure.acceptance}
                    </p>
                )}
            </div>

            <SectionLabel icon="📝" text="Valori registrati" />
            {procedure.readings.map(r => (
                <Field key={r.key} label={`${r.label}${r.unit ? ` (${r.unit})` : ''}`} hint={r.hint}>
                    <input
                        type={r.type === 'number' ? 'number' : r.type === 'date' ? 'date' : 'text'}
                        value={readings[r.key] || ''}
                        placeholder={r.placeholder || ''}
                        onChange={e => setReadings(prev => ({ ...prev, [r.key]: e.target.value }))}
                        style={inputStyle}
                    />
                </Field>
            ))}

            <SectionLabel icon="📄" text="Esito" />
            <Field label="Data esecuzione">
                <input type="date" value={performedAt} onChange={e => setPerformedAt(e.target.value)} style={inputStyle} />
            </Field>

            <Field label="Esito">
                <select value={result} onChange={e => setResult(e.target.value)} style={inputStyle}>
                    {CALIBRATION_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </Field>

            {result === 'non conforme' && (
                <p style={{ fontSize: 12, color: '#991b1b', background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                    Lo strumento verrà messo <strong>fuori servizio</strong>. Le misure effettuate dall'ultima
                    taratura conforme vanno considerate sospette e verificate.
                </p>
            )}

            {procedure.type === 'certificazione' && (
                <>
                    <Field label="Laboratorio">
                        <input value={provider} onChange={e => setProvider(e.target.value)} style={inputStyle} placeholder="Es. laboratorio accreditato ACCREDIA" />
                    </Field>
                    <Field label="Numero certificato">
                        <input value={certificateNumber} onChange={e => setCertificateNumber(e.target.value)} style={inputStyle} />
                    </Field>
                    <Field label="Link al certificato (PDF)" hint="Incolla qui il link al file archiviato.">
                        <input value={certificateUrl} onChange={e => setCertificateUrl(e.target.value)} style={inputStyle} placeholder="https://..." />
                    </Field>
                </>
            )}

            {!isFieldCheck && (
                <Field label="Valida fino al" hint="Precompilata dall'intervallo di taratura dello strumento.">
                    <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} style={inputStyle} />
                </Field>
            )}

            <Field label="Note">
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>

            {error && (
                <p style={{ fontSize: 13, color: '#991b1b', background: '#fef2f2', borderRadius: 8, padding: '9px 12px', marginBottom: 12 }}>
                    {error}
                </p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{ ...btnGhost, flex: 1 }}>Annulla</button>
                <button onClick={handleSubmit} disabled={saving} style={{ ...btnPrimary, flex: 2, opacity: saving ? 0.6 : 1 }}>
                    {saving ? 'Salvataggio…' : 'Registra taratura'}
                </button>
            </div>
        </Modal>
    );
};

// ── Instrument create / edit ───────────────────────────────────────────────
const InstrumentModal = ({ initial, users, onClose, onSaved }) => {
    const [form, setForm] = useState(initial);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const specFields = getSpecFields(form.instrumentType);
    const editing = Boolean(initial._id);

    const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
    const setSpec = (key, value) => setForm(prev => ({ ...prev, specs: { ...prev.specs, [key]: value } }));

    const handleTypeChange = (instrumentType) => {
        const match = INSTRUMENT_TYPES.find(t => t.id === instrumentType);
        const guide = getGuide(instrumentType);
        setForm(prev => ({
            ...prev,
            instrumentType,
            category: match ? match.category : prev.category,
            calibrationIntervalDays: guide.suggestedIntervalDays || prev.calibrationIntervalDays,
            fieldCheckIntervalDays: guide.suggestedFieldCheckDays ?? '',
        }));
    };

    const handleResponsabile = (fullName) => {
        const match = users.find(u => u.fullName === fullName);
        setForm(prev => ({
            ...prev,
            responsabile: fullName,
            responsabileEmail: match ? match.email : '',
        }));
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) {
            setError('Il nome dello strumento è obbligatorio.');
            return;
        }
        setSaving(true);
        setError(null);

        // Solo i campi modificabili da questa schermata: `status`, `assignedTo`
        // e lo storico tarature restano gestiti dal Magazzino.
        const payload = {
            name: form.name.trim(),
            brand: form.brand || '',
            model: form.model || '',
            serialNumber: form.serialNumber || '',
            category: form.category,
            instrumentType: form.instrumentType,
            requiresCalibration: Boolean(form.requiresCalibration),
            responsabile: form.responsabile || null,
            responsabileEmail: form.responsabileEmail || null,
            calibrationIntervalDays: Number(form.calibrationIntervalDays) || 365,
            fieldCheckIntervalDays: form.fieldCheckIntervalDays === '' ? null : Number(form.fieldCheckIntervalDays),
            certificationExpiry: form.certificationExpiry || null,
            calibrationExpiry: form.calibrationExpiry || null,
            specs: form.specs || {},
            notes: form.notes || '',
        };

        try {
            const res = await fetch(
                editing ? `${API_URL}/equipment/${form._id}` : `${API_URL}/equipment`,
                {
                    method: editing ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                }
            );
            if (!res.ok) throw new Error((await res.json()).message || 'Errore durante il salvataggio');
            onSaved();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title={editing ? 'Modifica strumento' : 'Nuovo strumento'} onClose={onClose}>
            <SectionLabel icon="🏷️" text="Anagrafica" />

            <Field label="Nome *">
                <input value={form.name} onChange={e => set('name', e.target.value)} style={inputStyle} placeholder="Es. Multiparametrica campo 1" />
            </Field>

            <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                    <Field label="Marca">
                        <input value={form.brand} onChange={e => set('brand', e.target.value)} style={inputStyle} placeholder="Hanna" />
                    </Field>
                </div>
                <div style={{ flex: 1 }}>
                    <Field label="Modello">
                        <input value={form.model} onChange={e => set('model', e.target.value)} style={inputStyle} placeholder="HI9829" />
                    </Field>
                </div>
            </div>

            <Field label="Numero di serie">
                <input value={form.serialNumber} onChange={e => set('serialNumber', e.target.value)} style={inputStyle} />
            </Field>

            <Field label="Tipo strumento" hint="Determina le caratteristiche e la guida di taratura.">
                <select value={form.instrumentType} onChange={e => handleTypeChange(e.target.value)} style={inputStyle}>
                    {INSTRUMENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
                </select>
            </Field>

            <SectionLabel icon="⚙️" text="Caratteristiche tecniche" />
            {specFields.map(f => (
                <Field key={f.key} label={`${f.label}${f.unit ? ` (${f.unit})` : ''}`}>
                    <input
                        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                        value={form.specs?.[f.key] || ''}
                        placeholder={f.placeholder || ''}
                        onChange={e => setSpec(f.key, e.target.value)}
                        style={inputStyle}
                    />
                </Field>
            ))}

            <SectionLabel icon="📅" text="Taratura" />

            <label style={{ display: 'flex', gap: 9, alignItems: 'center', cursor: 'pointer', fontSize: 13, color: '#334155', marginBottom: 12 }}>
                <input
                    type="checkbox"
                    checked={Boolean(form.requiresCalibration)}
                    onChange={e => set('requiresCalibration', e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#6366f1' }}
                />
                Soggetto a taratura / certificazione
            </label>

            {form.requiresCalibration && (
                <>
                    <Field label="Responsabile" hint="Riceve gli avvisi di scadenza.">
                        <select value={form.responsabile || ''} onChange={e => handleResponsabile(e.target.value)} style={inputStyle}>
                            <option value="">— nessuno —</option>
                            {users.map(u => <option key={u._id || u.email} value={u.fullName}>{u.fullName || u.email}</option>)}
                        </select>
                    </Field>

                    {form.responsabileEmail && (
                        <p style={{ fontSize: 11, color: '#94a3b8', margin: '-8px 0 12px' }}>
                            Avvisi a: {form.responsabileEmail}
                        </p>
                    )}

                    <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                            <Field label="Scadenza certificazione">
                                <input type="date" value={form.certificationExpiry} onChange={e => set('certificationExpiry', e.target.value)} style={inputStyle} />
                            </Field>
                        </div>
                        <div style={{ flex: 1 }}>
                            <Field label="Scadenza taratura">
                                <input type="date" value={form.calibrationExpiry} onChange={e => set('calibrationExpiry', e.target.value)} style={inputStyle} />
                            </Field>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <div style={{ flex: 1 }}>
                            <Field label="Intervallo taratura (giorni)">
                                <input type="number" value={form.calibrationIntervalDays} onChange={e => set('calibrationIntervalDays', e.target.value)} style={inputStyle} />
                            </Field>
                        </div>
                        <div style={{ flex: 1 }}>
                            <Field label="Verifica di campo (giorni)" hint="Vuoto = non richiesta.">
                                <input type="number" value={form.fieldCheckIntervalDays} onChange={e => set('fieldCheckIntervalDays', e.target.value)} style={inputStyle} />
                            </Field>
                        </div>
                    </div>
                </>
            )}

            <Field label="Note">
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            </Field>

            {error && (
                <p style={{ fontSize: 13, color: '#991b1b', background: '#fef2f2', borderRadius: 8, padding: '9px 12px', marginBottom: 12 }}>
                    {error}
                </p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} style={{ ...btnGhost, flex: 1 }}>Annulla</button>
                <button onClick={handleSubmit} disabled={saving} style={{ ...btnPrimary, flex: 2, opacity: saving ? 0.6 : 1 }}>
                    {saving ? 'Salvataggio…' : 'Salva'}
                </button>
            </div>
        </Modal>
    );
};

// ── Instrument card ────────────────────────────────────────────────────────
const InstrumentCard = ({ instrument, expanded, onToggle, onCalibrate, onEdit, canEdit }) => {
    const status = instrument.calibrationStatus || { level: 'non richiesto', daysLeft: null };
    const meta = LEVEL_META[status.level] || LEVEL_META['non richiesto'];
    const typeMeta = INSTRUMENT_TYPES.find(t => t.id === instrument.instrumentType);
    const specFields = getSpecFields(instrument.instrumentType);
    const history = [...(instrument.calibrations || [])].sort(
        (a, b) => new Date(b.performedAt) - new Date(a.performedAt)
    );

    return (
        <div style={{
            background: '#fff', border: `1.5px solid ${expanded ? '#c7d2fe' : '#e2e8f0'}`,
            borderLeft: `4px solid ${meta.dot}`, borderRadius: 12, overflow: 'hidden',
        }}>
            <button
                onClick={onToggle}
                style={{
                    width: '100%', background: 'none', border: 'none', padding: 14,
                    cursor: 'pointer', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'flex-start',
                }}
            >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{typeMeta?.icon || '🔧'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: 0 }}>
                        {instrument.name}
                    </p>
                    <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 8px' }}>
                        {[instrument.brand, instrument.model].filter(Boolean).join(' ') || typeMeta?.label}
                        {instrument.serialNumber ? ` · S/N ${instrument.serialNumber}` : ''}
                    </p>
                    <StatusPill level={status.level} daysLeft={status.daysLeft} />
                </div>
                <span style={{ color: '#94a3b8', fontSize: 13, flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
            </button>

            {expanded && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: 10, margin: '14px 0' }}>
                        <button onClick={onCalibrate} style={{ ...btnPrimary, flex: 1, fontSize: 13 }}>
                            🧪 Esegui taratura
                        </button>
                        {canEdit && (
                            <button onClick={onEdit} style={{ ...btnGhost, flex: 1, fontSize: 13 }}>
                                ✏️ Modifica
                            </button>
                        )}
                    </div>

                    <SectionLabel icon="📅" text="Scadenze" />
                    <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.8, marginBottom: 14 }}>
                        <div>Certificazione: <strong>{fmtDate(instrument.certificationExpiry)}</strong></div>
                        <div>Taratura: <strong>{fmtDate(instrument.calibrationExpiry)}</strong></div>
                        {instrument.fieldCheckIntervalDays && (
                            <div>Ultima verifica di campo: <strong>{fmtDate(instrument.lastFieldCheckAt)}</strong></div>
                        )}
                        <div>Responsabile: <strong>{instrument.responsabile || '—'}</strong></div>
                        {instrument.assignedTo && <div>In uso da: <strong>{instrument.assignedTo}</strong></div>}
                    </div>

                    {specFields.some(f => instrument.specs?.[f.key]) && (
                        <>
                            <SectionLabel icon="⚙️" text="Caratteristiche" />
                            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.8, marginBottom: 14 }}>
                                {specFields.filter(f => instrument.specs?.[f.key]).map(f => (
                                    <div key={f.key}>
                                        {f.label}: <strong>{instrument.specs[f.key]}{f.unit ? ` ${f.unit}` : ''}</strong>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    <SectionLabel icon="📋" text={`Storico tarature (${history.length})`} />
                    {history.length === 0 ? (
                        <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Nessuna taratura registrata.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {history.slice(0, 6).map(rec => (
                                <div key={rec._id || rec.performedAt} style={{
                                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9, padding: '9px 11px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                                        <strong style={{ fontSize: 12, color: '#1e293b' }}>{rec.type}</strong>
                                        <span style={{
                                            fontSize: 11, fontWeight: 700,
                                            color: rec.result === 'non conforme' ? '#991b1b' : '#166534',
                                        }}>
                                            {rec.result}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0' }}>
                                        {fmtDate(rec.performedAt)}
                                        {rec.performedBy ? ` · ${rec.performedBy}` : ''}
                                        {rec.validUntil ? ` · valida fino al ${fmtDate(rec.validUntil)}` : ''}
                                    </p>
                                    {rec.certificateUrl && (
                                        <a href={rec.certificateUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>
                                            Apri certificato
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Guides tab ─────────────────────────────────────────────────────────────
const GuidesTab = () => {
    const [typeId, setTypeId] = useState('multiparametrica');
    const guide = getGuide(typeId);

    return (
        <div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 16 }}>
                {INSTRUMENT_TYPES.filter(t => t.id !== 'altro').map(t => (
                    <button
                        key={t.id}
                        onClick={() => setTypeId(t.id)}
                        style={{
                            border: `1.5px solid ${typeId === t.id ? '#6366f1' : '#e2e8f0'}`,
                            background: typeId === t.id ? '#eef2ff' : '#fff',
                            color: typeId === t.id ? '#4338ca' : '#64748b',
                            borderRadius: 20, padding: '7px 14px', fontSize: 13, fontWeight: 700,
                            cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                        }}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>{guide.label}</h3>
            {guide.note && (
                <p style={{ fontSize: 12, color: '#92400e', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 8, padding: '9px 12px', margin: '10px 0 18px' }}>
                    {guide.note}
                </p>
            )}

            {guide.procedures.map(p => (
                <div key={p.title} style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 14 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: '#1e293b', margin: '0 0 3px' }}>{p.title}</h4>
                    <p style={{ fontSize: 12, color: '#6366f1', fontWeight: 700, margin: '0 0 14px' }}>{p.frequency}</p>

                    <SectionLabel icon="🧪" text="Materiale" />
                    <ul style={{ margin: '0 0 14px', paddingLeft: 18, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
                        {p.materials.map(m => <li key={m}>{m}</li>)}
                    </ul>

                    <SectionLabel icon="📋" text="Passaggi" />
                    <ol style={{ margin: '0 0 14px', paddingLeft: 20, fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                        {p.steps.map(s => <li key={s}>{s}</li>)}
                    </ol>

                    {p.acceptance && (
                        <p style={{ fontSize: 12, color: '#166534', background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 8, padding: '9px 12px', margin: 0 }}>
                            <strong>Criterio di accettazione:</strong> {p.acceptance}
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
};

// ── Main component ─────────────────────────────────────────────────────────
export default function Strumenti() {
    const loggedInUser = getLoggedInUser();
    const canEdit = isAdmin(loggedInUser);

    const [tab, setTab] = useState('scadenzario');
    const [instruments, setInstruments] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [showAllEquipment, setShowAllEquipment] = useState(false);

    const [calibrationTarget, setCalibrationTarget] = useState(null);
    const [editTarget, setEditTarget] = useState(null);

    const fetchInstruments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/equipment/instruments?all=true`);
            if (!res.ok) throw new Error(res.statusText);
            setInstruments(await res.json());
        } catch {
            setError('Errore nel caricamento degli strumenti.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/users`);
            if (!res.ok) return;
            setUsers(await res.json());
        } catch {
            // La lista responsabili resta vuota: non blocca il resto della pagina.
        }
    }, []);

    useEffect(() => { fetchInstruments(); fetchUsers(); }, [fetchInstruments, fetchUsers]);

    const tracked = useMemo(
        () => instruments.filter(i => i.requiresCalibration),
        [instruments]
    );

    const counts = useMemo(() => {
        return tracked.reduce((acc, i) => {
            const level = i.calibrationStatus?.level || 'non richiesto';
            acc[level] = (acc[level] || 0) + 1;
            return acc;
        }, {});
    }, [tracked]);

    const needsAttention = useMemo(
        () => tracked
            .filter(i => ['scaduto', 'in scadenza', 'da pianificare'].includes(i.calibrationStatus?.level))
            .sort((a, b) => {
                const da = a.calibrationStatus?.daysLeft;
                const db = b.calibrationStatus?.daysLeft;
                if (da === null || da === undefined) return 1;
                if (db === null || db === undefined) return -1;
                return da - db;
            }),
        [tracked]
    );

    const listed = useMemo(() => {
        const base = showAllEquipment ? instruments : tracked;
        const q = search.trim().toLowerCase();
        if (!q) return base;
        return base.filter(i =>
            i.name.toLowerCase().includes(q) ||
            (i.brand || '').toLowerCase().includes(q) ||
            (i.model || '').toLowerCase().includes(q) ||
            (i.serialNumber || '').toLowerCase().includes(q)
        );
    }, [instruments, tracked, showAllEquipment, search]);

    const openEdit = (instrument) => {
        setEditTarget({
            ...EMPTY_FORM,
            ...instrument,
            specs: instrument.specs || {},
            responsabile: instrument.responsabile || '',
            responsabileEmail: instrument.responsabileEmail || '',
            fieldCheckIntervalDays: instrument.fieldCheckIntervalDays ?? '',
            certificationExpiry: toDateInput(instrument.certificationExpiry),
            calibrationExpiry: toDateInput(instrument.calibrationExpiry),
            notes: instrument.notes || '',
        });
    };

    const TABS = [
        { id: 'scadenzario', label: '⏰ Scadenzario' },
        { id: 'strumenti', label: '🔬 Strumenti' },
        { id: 'guide', label: '📖 Guide' },
    ];

    const renderCard = (instrument) => (
        <InstrumentCard
            key={instrument._id}
            instrument={instrument}
            expanded={expandedId === instrument._id}
            onToggle={() => setExpandedId(expandedId === instrument._id ? null : instrument._id)}
            onCalibrate={() => setCalibrationTarget(instrument)}
            onEdit={() => openEdit(instrument)}
            canEdit={canEdit}
        />
    );

    return (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 16px 120px', fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: -0.5 }}>
                        🔬 Strumenti
                    </h1>
                    <p style={{ fontSize: 13, color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>
                        Taratura e certificazione · {tracked.length} strumenti tracciati
                    </p>
                </div>
                {canEdit && (
                    <button onClick={() => setEditTarget({ ...EMPTY_FORM })} style={{ ...btnPrimary, padding: '10px 14px', fontSize: 13 }}>
                        + Nuovo
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 14, padding: 4, marginBottom: 20, gap: 4 }}>
                {TABS.map(t => (
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

            {error && (
                <p style={{ fontSize: 13, color: '#991b1b', background: '#fef2f2', borderRadius: 10, padding: '11px 14px', marginBottom: 14 }}>
                    {error}
                </p>
            )}

            {loading && tab !== 'guide' ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: '30px 0' }}>Caricamento…</p>
            ) : (
                <>
                    {tab === 'scadenzario' && (
                        <div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                                {['scaduto', 'in scadenza', 'valido', 'da pianificare'].map(level => {
                                    const meta = LEVEL_META[level];
                                    return (
                                        <div key={level} style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            background: meta.bg, border: `1.5px solid ${meta.border}`,
                                            borderRadius: 20, padding: '5px 12px',
                                            fontSize: 12, fontWeight: 600, color: meta.text,
                                        }}>
                                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dot }} />
                                            {meta.label} <span style={{ fontWeight: 800 }}>{counts[level] || 0}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {needsAttention.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                                    <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                                    <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>Nessuna scadenza imminente</p>
                                    <p style={{ fontSize: 13, marginTop: 4 }}>Tutti gli strumenti tracciati sono in regola.</p>
                                </div>
                            ) : (
                                <>
                                    <SectionLabel icon="⚠️" text={`Richiedono attenzione (${needsAttention.length})`} color="#b45309" />
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {needsAttention.map(renderCard)}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {tab === 'strumenti' && (
                        <div>
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="🔍 Cerca per nome, marca, modello, S/N…"
                                style={{ ...inputStyle, marginBottom: 10 }}
                            />

                            <label style={{ display: 'flex', gap: 9, alignItems: 'center', cursor: 'pointer', fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                                <input
                                    type="checkbox"
                                    checked={showAllEquipment}
                                    onChange={e => setShowAllEquipment(e.target.checked)}
                                    style={{ width: 16, height: 16, accentColor: '#6366f1' }}
                                />
                                Mostra anche le attrezzature non soggette a taratura
                            </label>

                            {listed.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>
                                    <div style={{ fontSize: 36, marginBottom: 8 }}>🔬</div>
                                    <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>Nessuno strumento</p>
                                    <p style={{ fontSize: 13, marginTop: 4 }}>
                                        {canEdit ? 'Aggiungine uno con il pulsante "Nuovo".' : 'Contatta il magazziniere per l\'inserimento.'}
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {listed.map(renderCard)}
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'guide' && <GuidesTab />}
                </>
            )}

            {calibrationTarget && (
                <CalibrationModal
                    instrument={calibrationTarget}
                    user={loggedInUser}
                    onClose={() => setCalibrationTarget(null)}
                    onSaved={() => { setCalibrationTarget(null); fetchInstruments(); }}
                />
            )}

            {editTarget && (
                <InstrumentModal
                    initial={editTarget}
                    users={users}
                    onClose={() => setEditTarget(null)}
                    onSaved={() => { setEditTarget(null); fetchInstruments(); }}
                />
            )}
        </div>
    );
}

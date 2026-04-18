// src/components/CommessePage.js
import React, { useState, useEffect, useCallback } from 'react';
import config from '../config';
import { getLoggedInUser } from '../utils/utils';

const API_URL = config.API_URL;

const EMPTY_FORM = { CodiceProgettoSAP: '', Descrizione: '' };

export default function CommessePage() {
    const loggedInUser = getLoggedInUser();
    const userIsAdmin  = loggedInUser?.role === 'admin' || loggedInUser?.role === 'magazziniere';

    const [commesse,    setCommesse]    = useState([]);
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState(null);
    const [search,      setSearch]      = useState('');
    const [showModal,   setShowModal]   = useState(false);
    const [editing,     setEditing]     = useState(null);
    const [form,        setForm]        = useState(EMPTY_FORM);
    const [saving,      setSaving]      = useState(false);
    const [formError,   setFormError]   = useState('');
    const [copyFeedback,setCopyFeedback]= useState(null);

    const fetchCommesse = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/commesse`);
            if (!res.ok) throw new Error('Errore caricamento');
            setCommesse(await res.json());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCommesse(); }, [fetchCommesse]);

    const filtered = commesse.filter(c =>
        !search ||
        c.CodiceProgettoSAP.toLowerCase().includes(search.toLowerCase()) ||
        c.Descrizione.toLowerCase().includes(search.toLowerCase())
    );

    const openNew = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setFormError('');
        setShowModal(true);
    };

    const openEdit = (c) => {
        setEditing(c);
        setForm({ CodiceProgettoSAP: c.CodiceProgettoSAP, Descrizione: c.Descrizione });
        setFormError('');
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        setSaving(true);
        try {
            const url    = editing ? `${API_URL}/commesse/${editing._id}` : `${API_URL}/commesse`;
            const method = editing ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.message || 'Errore salvataggio');
            }
            setShowModal(false);
            fetchCommesse();
        } catch (e) {
            setFormError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (c) => {
        if (!window.confirm(`Eliminare commessa ${c.CodiceProgettoSAP}?`)) return;
        try {
            const res = await fetch(`${API_URL}/commesse/${c._id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            fetchCommesse();
        } catch {
            alert('Errore eliminazione');
        }
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code).then(() => {
            setCopyFeedback(code);
            setTimeout(() => setCopyFeedback(null), 1500);
        });
    };

    return (
        <div style={{
            maxWidth: 760,
            margin: '0 auto',
            padding: '20px 16px 100px',
            fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        }}>
            {/* Header */}
            <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: -0.5 }}>
                            📋 Commesse
                        </h1>
                        <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0', fontWeight: 500 }}>
                            {commesse.length} commesse totali
                        </p>
                    </div>
                    {userIsAdmin && (
                        <button onClick={openNew} style={{
                            background: '#6366f1', color: '#fff', border: 'none',
                            padding: '11px 20px', borderRadius: 12,
                            fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 46,
                        }}>
                            + Aggiungi commessa
                        </button>
                    )}
                </div>

                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="🔍 Cerca codice SAP o descrizione..."
                    style={{
                        width: '100%', boxSizing: 'border-box', marginTop: 14,
                        border: '1.5px solid #e2e8f0', borderRadius: 12,
                        padding: '11px 16px', fontSize: 14, color: '#1e293b',
                        outline: 'none', background: '#fff',
                    }}
                />
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                    <p style={{ fontWeight: 600 }}>Caricamento...</p>
                </div>
            ) : error ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#ef4444', fontWeight: 600 }}>{error}</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filtered.map(c => (
                        <div key={c._id} style={{
                            background: '#fff',
                            border: '1.5px solid #f1f5f9',
                            borderRadius: 14,
                            padding: '14px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                        }}>
                            {/* Code badge */}
                            <button
                                onClick={() => copyCode(c.CodiceProgettoSAP)}
                                title="Copia codice"
                                style={{
                                    background: copyFeedback === c.CodiceProgettoSAP ? '#f0fdf4' : '#f8fafc',
                                    border: `1.5px solid ${copyFeedback === c.CodiceProgettoSAP ? '#86efac' : '#e2e8f0'}`,
                                    borderRadius: 10, padding: '8px 12px',
                                    fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                                    color: copyFeedback === c.CodiceProgettoSAP ? '#16a34a' : '#334155',
                                    cursor: 'pointer', flexShrink: 0, minWidth: 110, textAlign: 'center',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {copyFeedback === c.CodiceProgettoSAP ? '✓ Copiato!' : c.CodiceProgettoSAP}
                            </button>

                            {/* Description */}
                            <p style={{ flex: 1, margin: 0, fontSize: 14, color: '#1e293b', fontWeight: 500, minWidth: 0 }}>
                                {c.Descrizione}
                            </p>

                            {/* Admin actions */}
                            {userIsAdmin && (
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                    <button onClick={() => openEdit(c)} style={{
                                        padding: '7px 12px', borderRadius: 9,
                                        border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                        color: '#475569', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                                    }}>
                                        ✏️
                                    </button>
                                    <button onClick={() => handleDelete(c)} style={{
                                        padding: '7px 12px', borderRadius: 9,
                                        border: '1.5px solid #fecaca', background: '#fef2f2',
                                        color: '#dc2626', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                                    }}>
                                        🗑
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                            <p style={{ fontWeight: 600, margin: 0 }}>Nessuna commessa trovata</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, padding: '0 8px' }}
                    onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
                >
                    <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', padding: '24px 20px 40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', margin: 0 }}>
                                {editing ? 'Modifica Commessa' : 'Nuova Commessa'}
                            </h3>
                            <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 34, height: 34, fontSize: 18, cursor: 'pointer', color: '#64748b' }}>×</button>
                        </div>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <p style={labelSt}>Codice Progetto SAP *</p>
                                <input
                                    value={form.CodiceProgettoSAP}
                                    onChange={e => setForm(f => ({ ...f, CodiceProgettoSAP: e.target.value }))}
                                    required
                                    placeholder="es. 20C1880"
                                    style={{ ...inputSt, fontFamily: 'monospace', fontSize: 15, fontWeight: 700 }}
                                />
                            </div>

                            <div>
                                <p style={labelSt}>Descrizione *</p>
                                <input
                                    value={form.Descrizione}
                                    onChange={e => setForm(f => ({ ...f, Descrizione: e.target.value }))}
                                    required
                                    placeholder="es. ENI REWIND - San Donato Milanese"
                                    style={inputSt}
                                />
                            </div>

                            {formError && (
                                <p style={{ color: '#ef4444', fontSize: 13, fontWeight: 600, margin: 0 }}>⚠️ {formError}</p>
                            )}

                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button type="button" onClick={() => setShowModal(false)} style={btnSec}>Annulla</button>
                                <button type="submit" disabled={saving} style={{ ...btnPri, opacity: saving ? 0.5 : 1 }}>
                                    {saving ? 'Salvataggio...' : '✓ Salva'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const labelSt = { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' };
const inputSt  = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#0f172a', outline: 'none', background: '#fff' };
const btnPri   = { flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 50 };
const btnSec   = { flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 50 };
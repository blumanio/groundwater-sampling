// src/components/TeamPage.js
import React, { useState, useEffect, useCallback } from 'react';
import config from '../config';
import { getLoggedInUser } from '../utils/utils';

const API_URL = config.API_URL;

const ROLES = ['tecnico', 'magazziniere', 'admin'];

const ROLE_META = {
    tecnico: { label: 'Tecnico', color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
    magazziniere: { label: 'Magazziniere', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
    admin: { label: 'Admin', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
};

const EMPTY_USER = { email: '', fullName: '', role: 'tecnico', phone: '', note: '' };

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function avatarColor(name) {
    const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
    if (!name) return colors[0];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
}

export default function TeamPage() {
    const loggedInUser = getLoggedInUser();
    const userIsAdmin = loggedInUser?.role === 'admin';

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('tutti');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState(EMPTY_USER);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/users`);
            if (!res.ok) throw new Error('Errore nel caricamento');
            setUsers(await res.json());
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const filtered = users.filter(u => {
        const roleMatch = filterRole === 'tutti' || u.role === filterRole;
        const searchMatch = !search ||
            (u.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase());
        return roleMatch && searchMatch;
    });

    const openNew = () => {
        setEditingUser(null);
        setForm(EMPTY_USER);
        setFormError('');
        setShowModal(true);
    };

    const openEdit = (u) => {
        setEditingUser(u);
        setForm({
            email: u.email,
            fullName: u.fullName || '',
            role: u.role || 'tecnico',
            phone: u.phone || '',
            note: u.note || '',
        });
        setFormError('');
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormError('');
        setSaving(true);
        try {
            const url = editingUser ? `${API_URL}/users/${editingUser._id}` : `${API_URL}/users`;
            const method = editingUser ? 'PUT' : 'POST';
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
            fetchUsers();
        } catch (e) {
            setFormError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (u) => {
        if (!window.confirm(`Eliminare ${u.fullName || u.email}?`)) return;
        try {
            const res = await fetch(`${API_URL}/users/${u._id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            fetchUsers();
        } catch {
            alert('Errore eliminazione');
        }
    };

    const counts = ROLES.reduce((a, r) => ({ ...a, [r]: users.filter(u => u.role === r).length }), {});

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
                            👥 Team ACR
                        </h1>
                        <p style={{ fontSize: 13, color: '#64748b', margin: '3px 0 0', fontWeight: 500 }}>
                            {users.length} membri totali
                        </p>
                    </div>
                    {userIsAdmin && (
                        <button onClick={openNew} style={{
                            background: '#6366f1', color: '#fff', border: 'none',
                            padding: '11px 20px', borderRadius: 12,
                            fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 46,
                        }}>
                            + Aggiungi utente
                        </button>
                    )}
                </div>

                {/* Role pills */}
                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    {[['tutti', 'Tutti', users.length], ...ROLES.map(r => [r, ROLE_META[r].label, counts[r]])].map(([id, label, count]) => (
                        <button key={id} onClick={() => setFilterRole(id)} style={{
                            padding: '5px 14px', borderRadius: 20, border: '1.5px solid',
                            borderColor: filterRole === id ? '#6366f1' : '#e2e8f0',
                            background: filterRole === id ? '#eef2ff' : '#fff',
                            color: filterRole === id ? '#4f46e5' : '#64748b',
                            fontWeight: 700, fontSize: 12, cursor: 'pointer',
                        }}>
                            {label} <span style={{ fontWeight: 800 }}>{count}</span>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="🔍 Cerca nome o email..."
                    style={{
                        width: '100%', boxSizing: 'border-box', marginTop: 12,
                        border: '1.5px solid #e2e8f0', borderRadius: 12,
                        padding: '11px 16px', fontSize: 14, color: '#1e293b',
                        outline: 'none', background: '#fff',
                    }}
                />
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>👥</div>
                    <p style={{ fontWeight: 600 }}>Caricamento...</p>
                </div>
            ) : error ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#ef4444', fontWeight: 600 }}>{error}</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                    {filtered.map(u => {
                        const meta = ROLE_META[u.role] || ROLE_META.tecnico;
                        const color = avatarColor(u.fullName || u.email);
                        return (
                            <div key={u._id} style={{
                                background: '#fff',
                                border: '1.5px solid #f1f5f9',
                                borderRadius: 16,
                                padding: '18px 16px',
                                position: 'relative',
                                transition: 'box-shadow 0.2s',
                            }}>
                                {/* Role badge */}
                                <span style={{
                                    position: 'absolute', top: 14, right: 14,
                                    background: meta.bg, border: `1.5px solid ${meta.border}`,
                                    color: meta.color, fontSize: 10, fontWeight: 800,
                                    padding: '3px 9px', borderRadius: 20,
                                    textTransform: 'uppercase', letterSpacing: 0.5,
                                }}>
                                    {meta.label}
                                </span>

                                {/* Avatar + name */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <div style={{
                                        width: 48, height: 48, borderRadius: 14,
                                        background: color, flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 18, fontWeight: 800, color: '#fff',
                                        letterSpacing: -1,
                                    }}>
                                        {getInitials(u.fullName || u.email)}
                                    </div>
                                    <div style={{ minWidth: 0, paddingRight: 60 }}>
                                        <p style={{ fontWeight: 700, color: '#0f172a', margin: 0, fontSize: 15, lineHeight: 1.3 }}>
                                            {u.fullName || '—'}
                                        </p>
                                        <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {u.email}
                                        </p>
                                    </div>
                                </div>

                                {/* Extra fields */}
                                <div style={{ borderTop: '1px solid #f8fafc', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {u.phone && (
                                        <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
                                            📞 <a href={`tel:${u.phone}`} style={{ color: '#475569', textDecoration: 'none' }}>{u.phone}</a>
                                        </p>
                                    )}
                                    {u.note && (
                                        <p style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>📝 {u.note}</p>
                                    )}
                                    {!u.phone && !u.note && (
                                        <p style={{ fontSize: 12, color: '#cbd5e1', margin: 0 }}>—</p>
                                    )}
                                </div>

                                {/* Admin actions */}
                                {userIsAdmin && (
                                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                                        <button onClick={() => openEdit(u)} style={{
                                            flex: 1, padding: '8px', borderRadius: 9,
                                            border: '1.5px solid #e2e8f0', background: '#f8fafc',
                                            color: '#475569', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                                        }}>
                                            ✏️ Modifica
                                        </button>
                                        <button onClick={() => handleDelete(u)} style={{
                                            padding: '8px 12px', borderRadius: 9,
                                            border: '1.5px solid #fecaca', background: '#fef2f2',
                                            color: '#dc2626', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                                        }}>
                                            🗑
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {filtered.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                            <p style={{ fontWeight: 600 }}>Nessun utente trovato</p>
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
                                {editingUser ? 'Modifica Utente' : 'Nuovo Utente'}
                            </h3>
                            <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 34, height: 34, fontSize: 18, cursor: 'pointer', color: '#64748b' }}>×</button>
                        </div>

                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <Field label="Nome completo *">
                                <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                                    required placeholder="es. Mario Rossi" style={inputSt} />
                            </Field>

                            <Field label="Email *">
                                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                                    required type="email" placeholder="nome@acrreggiani.it"
                                    disabled={!!editingUser}
                                    style={{ ...inputSt, background: editingUser ? '#f8fafc' : '#fff', color: editingUser ? '#94a3b8' : '#0f172a' }} />
                                {editingUser && <p style={{ fontSize: 11, color: '#94a3b8', margin: '3px 0 0' }}>Email non modificabile</p>}
                            </Field>

                            <Field label="Ruolo">
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {ROLES.map(r => {
                                        const m = ROLE_META[r];
                                        return (
                                            <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))} style={{
                                                flex: 1, padding: '10px 6px', borderRadius: 10, border: '2px solid',
                                                borderColor: form.role === r ? m.color : '#e2e8f0',
                                                background: form.role === r ? m.bg : '#fff',
                                                color: form.role === r ? m.color : '#64748b',
                                                fontWeight: 700, fontSize: 12, cursor: 'pointer',
                                            }}>
                                                {m.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </Field>

                            <Field label="Telefono">
                                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                    type="tel" placeholder="+39 333 000 0000" style={inputSt} />
                            </Field>

                            <Field label="Note">
                                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                                    rows={2} placeholder="Specializzazioni, info..." style={{ ...inputSt, resize: 'vertical' }} />
                            </Field>

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

function Field({ label, children }) {
    return (
        <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' }}>{label}</p>
            {children}
        </div>
    );
}

const inputSt = {
    width: '100%', boxSizing: 'border-box',
    border: '1.5px solid #e2e8f0', borderRadius: 10,
    padding: '11px 14px', fontSize: 14, color: '#0f172a',
    outline: 'none', background: '#fff',
};
const btnPri = {
    flex: 1, padding: '13px', borderRadius: 12, border: 'none',
    background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 50,
};
const btnSec = {
    flex: 1, padding: '13px', borderRadius: 12,
    border: '1.5px solid #e2e8f0', background: '#f8fafc',
    color: '#475569', fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 50,
};
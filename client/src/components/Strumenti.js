import React, { useState, useEffect, useCallback } from 'react';
import config from '../config';
import { getLoggedInUser, USER_DATA } from '../utils/utils';

const API_URL = config.API_URL;

const CATEGORIES = ['Pompa', 'Generatore', 'Campionatore', 'Multiparametro', 'GPS', 'Altro'];
const STATUSES   = ['disponibile', 'in uso', 'manutenzione', 'fuori servizio'];

const CATEGORY_ICONS = {
    Pompa: '💧', Generatore: '⚡', Campionatore: '🧪',
    Multiparametro: '📊', GPS: '📍', Altro: '🔧',
};

const STATUS_BADGE = {
    'disponibile':    'bg-green-100 text-green-800 border-green-200',
    'in uso':         'bg-yellow-100 text-yellow-800 border-yellow-200',
    'manutenzione':   'bg-orange-100 text-orange-800 border-orange-200',
    'fuori servizio': 'bg-red-100 text-red-800 border-red-200',
};

const EMPTY_EQ = { name: '', category: 'Pompa', serialNumber: '', notes: '', status: 'disponibile' };

const todayStr = () => new Date().toISOString().split('T')[0];

const addDays = (dateStr, n) => {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
};

const fmtDate = (dateStr) =>
    new Date(dateStr + 'T12:00:00').toLocaleDateString('it-IT', {
        weekday: 'long', day: 'numeric', month: 'long',
    });

const emptyBk = (user) => ({
    date: todayStr(),
    equipmentId: '',
    technicianName: user?.fullName || '',
    site: '',
    notes: '',
});

export default function Strumenti() {
    const loggedInUser = getLoggedInUser();
    const [tab, setTab] = useState('inventario');

    // ── Equipment state ──
    const [equipment, setEquipment] = useState([]);
    const [eqLoading, setEqLoading] = useState(true);
    const [eqError, setEqError]     = useState(null);
    const [showEqModal, setShowEqModal] = useState(false);
    const [editingEq, setEditingEq]     = useState(null);
    const [eqForm, setEqForm]           = useState(EMPTY_EQ);
    const [eqSubmitting, setEqSubmitting] = useState(false);

    // ── Bookings state ──
    const [selectedDate, setSelectedDate] = useState(todayStr());
    const [bookings, setBookings]         = useState([]);
    const [adjBookings, setAdjBookings]   = useState([]);
    const [bkLoading, setBkLoading]       = useState(false);
    const [bkError, setBkError]           = useState(null);
    const [showBkModal, setShowBkModal]   = useState(false);
    const [bkForm, setBkForm]             = useState(() => emptyBk(loggedInUser));
    const [bkConflict, setBkConflict]     = useState(null);
    const [bkSubmitting, setBkSubmitting] = useState(false);
    const [bookedOnFormDate, setBookedOnFormDate] = useState([]);

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

    // ── Fetch bookings for selected date ±1 (for handover detection) ──
    const fetchBookings = useCallback(async (date) => {
        setBkLoading(true);
        setBkError(null);
        try {
            const from = addDays(date, -1);
            const to   = addDays(date,  1);
            const res  = await fetch(`${API_URL}/equipment/bookings?from=${from}&to=${to}`);
            if (!res.ok) throw new Error(res.statusText);
            const all = await res.json();
            setBookings(all.filter(b => b.date === date));
            setAdjBookings(all.filter(b => b.date !== date));
        } catch {
            setBkError('Errore nel caricamento delle prenotazioni.');
        } finally {
            setBkLoading(false);
        }
    }, []);

    useEffect(() => { fetchBookings(selectedDate); }, [fetchBookings, selectedDate]);

    // ── Refresh booked IDs when booking form date changes ──
    useEffect(() => {
        if (!bkForm.date) { setBookedOnFormDate([]); return; }
        fetch(`${API_URL}/equipment/bookings?date=${bkForm.date}`)
            .then(r => r.json())
            .then(data => setBookedOnFormDate(
                data.map(b => (b.equipmentId?._id || b.equipmentId))
            ))
            .catch(() => setBookedOnFormDate([]));
    }, [bkForm.date]);

    // Available equipment for booking form: status=disponibile AND not already booked that day
    const availableEquipment = equipment.filter(
        eq => eq.status === 'disponibile' && !bookedOnFormDate.includes(eq._id)
    );

    // Handover warning: same equipment booked on adjacent day by a DIFFERENT technician
    const hasHandoverWarning = (booking) => {
        const eqId = booking.equipmentId?._id || booking.equipmentId;
        return adjBookings.some(b => {
            const bId = b.equipmentId?._id || b.equipmentId;
            return bId === eqId && b.technicianName !== booking.technicianName;
        });
    };

    // ── Equipment CRUD ──
    const openNewEq = () => {
        setEditingEq(null);
        setEqForm(EMPTY_EQ);
        setShowEqModal(true);
    };

    const openEditEq = (eq) => {
        setEditingEq(eq);
        setEqForm({
            name: eq.name, category: eq.category,
            serialNumber: eq.serialNumber || '',
            notes: eq.notes || '', status: eq.status,
        });
        setShowEqModal(true);
    };

    const submitEqForm = async (e) => {
        e.preventDefault();
        setEqSubmitting(true);
        try {
            const url    = editingEq ? `${API_URL}/equipment/${editingEq._id}` : `${API_URL}/equipment`;
            const method = editingEq ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eqForm),
            });
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
        if (!window.confirm('Eliminare questo strumento e tutte le sue prenotazioni?')) return;
        try {
            const res = await fetch(`${API_URL}/equipment/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            fetchEquipment();
            fetchBookings(selectedDate);
        } catch {
            alert("Errore durante l'eliminazione.");
        }
    };

    // ── Booking CRUD ──
    const openNewBk = () => {
        setBkForm(emptyBk(loggedInUser));
        setBkConflict(null);
        setShowBkModal(true);
    };

    const submitBkForm = async (e) => {
        e.preventDefault();
        setBkConflict(null);
        setBkSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/equipment/bookings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...bkForm, createdBy: loggedInUser?.fullName || '' }),
            });
            if (res.status === 409) {
                setBkConflict(await res.json());
                return;
            }
            if (!res.ok) throw new Error((await res.json()).message);
            setShowBkModal(false);
            fetchBookings(selectedDate);
        } catch (err) {
            alert('Errore: ' + err.message);
        } finally {
            setBkSubmitting(false);
        }
    };

    const deleteBk = async (id) => {
        if (!window.confirm('Annullare questa prenotazione?')) return;
        try {
            const res = await fetch(`${API_URL}/equipment/bookings/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            fetchBookings(selectedDate);
        } catch {
            alert('Errore durante la cancellazione.');
        }
    };

    // ══════════════════════════════════════════════
    //  RENDER
    // ══════════════════════════════════════════════
    return (
        <div className="max-w-3xl mx-auto px-4 py-6 pb-28">

            {/* ── Tab bar ── */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                {[['inventario', '🔧 Inventario'], ['prenotazioni', '📅 Prenotazioni']].map(([id, label]) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-all min-h-[48px] ${
                            tab === id ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* ══════════════ TAB: INVENTARIO ══════════════ */}
            {tab === 'inventario' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-gray-800">Parco Strumenti</h2>
                        <button
                            onClick={openNewEq}
                            className="bg-indigo-500 text-white px-5 py-3 rounded-xl text-sm font-semibold active:bg-indigo-700 min-h-[48px]"
                        >
                            + Aggiungi
                        </button>
                    </div>

                    {eqLoading ? (
                        <div className="text-center py-16 text-gray-400">
                            <div className="text-3xl mb-3 animate-pulse">🔧</div>
                            <p>Caricamento...</p>
                        </div>
                    ) : eqError ? (
                        <div className="text-center py-16 text-red-500">{eqError}</div>
                    ) : equipment.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <div className="text-4xl mb-3">🔧</div>
                            <p className="font-medium">Nessuno strumento in inventario</p>
                            <p className="text-sm mt-1">Aggiungi il primo strumento per iniziare.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {equipment.map(eq => (
                                <div key={eq._id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <span className="text-3xl shrink-0">{CATEGORY_ICONS[eq.category] || '🔧'}</span>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-gray-900 truncate text-base">{eq.name}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {eq.category}
                                                    {eq.serialNumber ? ` · S/N: ${eq.serialNumber}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border shrink-0 ${STATUS_BADGE[eq.status]}`}>
                                            {eq.status}
                                        </span>
                                    </div>
                                    {eq.notes && (
                                        <p className="text-xs text-gray-500 mt-2 pl-12 italic">{eq.notes}</p>
                                    )}
                                    <div className="flex gap-2 mt-4 pl-12">
                                        <button
                                            onClick={() => openEditEq(eq)}
                                            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium active:bg-gray-200 min-h-[44px]"
                                        >
                                            ✏️ Modifica
                                        </button>
                                        <button
                                            onClick={() => deleteEq(eq._id)}
                                            className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium active:bg-red-100 min-h-[44px]"
                                        >
                                            🗑 Elimina
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════ TAB: PRENOTAZIONI ══════════════ */}
            {tab === 'prenotazioni' && (
                <div>
                    {/* Date navigator */}
                    <div className="flex items-center justify-between mb-5 bg-white rounded-xl shadow-sm p-3 border border-gray-100">
                        <button
                            onClick={() => setSelectedDate(d => addDays(d, -1))}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-100 active:bg-gray-200 text-2xl font-light"
                            aria-label="Giorno precedente"
                        >
                            ‹
                        </button>
                        <div className="text-center">
                            <p className="font-semibold text-gray-800 capitalize">{fmtDate(selectedDate)}</p>
                            {selectedDate !== todayStr() && (
                                <button
                                    onClick={() => setSelectedDate(todayStr())}
                                    className="text-xs text-indigo-500 font-medium mt-0.5 underline"
                                >
                                    Torna ad oggi
                                </button>
                            )}
                            {selectedDate === todayStr() && (
                                <p className="text-xs text-indigo-500 font-medium mt-0.5">Oggi</p>
                            )}
                        </div>
                        <button
                            onClick={() => setSelectedDate(d => addDays(d, 1))}
                            className="w-12 h-12 flex items-center justify-center rounded-xl bg-gray-100 active:bg-gray-200 text-2xl font-light"
                            aria-label="Giorno successivo"
                        >
                            ›
                        </button>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                            {bookings.length} prenotazion{bookings.length === 1 ? 'e' : 'i'}
                        </p>
                        <button
                            onClick={openNewBk}
                            className="bg-indigo-500 text-white px-5 py-3 rounded-xl text-sm font-semibold active:bg-indigo-700 min-h-[48px]"
                        >
                            + Prenota
                        </button>
                    </div>

                    {bkLoading ? (
                        <div className="text-center py-16 text-gray-400">
                            <div className="text-3xl mb-3 animate-pulse">📅</div>
                            <p>Caricamento...</p>
                        </div>
                    ) : bkError ? (
                        <div className="text-center py-16 text-red-500">{bkError}</div>
                    ) : bookings.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <div className="text-4xl mb-3">✅</div>
                            <p className="font-medium">Nessuna prenotazione</p>
                            <p className="text-sm mt-1">Tutti gli strumenti sono disponibili.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {bookings.map(bk => {
                                const eq      = bk.equipmentId;
                                const handover = hasHandoverWarning(bk);
                                return (
                                    <div
                                        key={bk._id}
                                        className={`bg-white rounded-xl shadow-sm p-4 border ${
                                            handover ? 'border-amber-300 bg-amber-50' : 'border-gray-100'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <span className="text-3xl shrink-0">{CATEGORY_ICONS[eq?.category] || '🔧'}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-semibold text-gray-900">{eq?.name || '—'}</p>
                                                    {handover && (
                                                        <span
                                                            className="text-amber-600 text-sm font-bold"
                                                            title="Consegna fisica richiesta tra tecnici"
                                                        >
                                                            ⚠️
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500">{eq?.category}</p>
                                            </div>
                                        </div>

                                        <div className="mt-3 space-y-1.5 text-sm pl-12">
                                            <p>
                                                <span className="text-gray-500">👤 Tecnico: </span>
                                                <span className="font-medium">{bk.technicianName}</span>
                                            </p>
                                            <p>
                                                <span className="text-gray-500">📍 Sito: </span>
                                                <span className="font-medium">{bk.site}</span>
                                            </p>
                                            {bk.notes && (
                                                <p>
                                                    <span className="text-gray-500">📝 Note: </span>
                                                    {bk.notes}
                                                </p>
                                            )}
                                        </div>

                                        {handover && (
                                            <div className="mt-3 p-3 bg-amber-100 rounded-xl text-xs text-amber-800 font-medium">
                                                ⚠️ Consegna fisica richiesta — strumento prenotato in giorni adiacenti da tecnici diversi
                                            </div>
                                        )}

                                        <button
                                            onClick={() => deleteBk(bk._id)}
                                            className="mt-4 w-full py-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium active:bg-red-100 min-h-[48px]"
                                        >
                                            🗑 Annulla prenotazione
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════ MODAL: Equipment Form ══════════════ */}
            {showEqModal && (
                <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
                        <div className="p-5">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-lg font-bold">
                                    {editingEq ? 'Modifica Strumento' : 'Nuovo Strumento'}
                                </h3>
                                <button onClick={() => setShowEqModal(false)} className="text-gray-400 text-2xl leading-none p-1">×</button>
                            </div>

                            <form onSubmit={submitEqForm} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome *</label>
                                    <input
                                        value={eqForm.name}
                                        onChange={e => setEqForm(f => ({ ...f, name: e.target.value }))}
                                        required
                                        placeholder="es. Pompa Grundfos MP1"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[48px]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoria</label>
                                        <select
                                            value={eqForm.category}
                                            onChange={e => setEqForm(f => ({ ...f, category: e.target.value }))}
                                            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[48px]"
                                        >
                                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Stato</label>
                                        <select
                                            value={eqForm.status}
                                            onChange={e => setEqForm(f => ({ ...f, status: e.target.value }))}
                                            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[48px]"
                                        >
                                            {STATUSES.map(s => <option key={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">N° Seriale</label>
                                    <input
                                        value={eqForm.serialNumber}
                                        onChange={e => setEqForm(f => ({ ...f, serialNumber: e.target.value }))}
                                        placeholder="Opzionale"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[48px]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Note</label>
                                    <textarea
                                        value={eqForm.notes}
                                        onChange={e => setEqForm(f => ({ ...f, notes: e.target.value }))}
                                        rows={2}
                                        placeholder="Opzionale"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowEqModal(false)}
                                        className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm min-h-[52px]"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={eqSubmitting}
                                        className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-semibold text-sm min-h-[52px] disabled:opacity-50 active:bg-indigo-700"
                                    >
                                        {eqSubmitting ? 'Salvataggio...' : '✓ Salva'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════ MODAL: Booking Form ══════════════ */}
            {showBkModal && (
                <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
                        <div className="p-5">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-lg font-bold">Prenota Strumento</h3>
                                <button onClick={() => setShowBkModal(false)} className="text-gray-400 text-2xl leading-none p-1">×</button>
                            </div>

                            <form onSubmit={submitBkForm} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Data *</label>
                                    <input
                                        type="date"
                                        value={bkForm.date}
                                        onChange={e => setBkForm(f => ({ ...f, date: e.target.value, equipmentId: '' }))}
                                        required
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[48px]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Strumento *</label>
                                    <select
                                        value={bkForm.equipmentId}
                                        onChange={e => setBkForm(f => ({ ...f, equipmentId: e.target.value }))}
                                        required
                                        className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[48px]"
                                    >
                                        <option value="">Seleziona strumento...</option>
                                        {availableEquipment.map(eq => (
                                            <option key={eq._id} value={eq._id}>
                                                {CATEGORY_ICONS[eq.category]} {eq.name}
                                                {eq.serialNumber ? ` (S/N: ${eq.serialNumber})` : ''}
                                            </option>
                                        ))}
                                        {availableEquipment.length === 0 && (
                                            <option disabled value="">Nessuno strumento disponibile per questa data</option>
                                        )}
                                    </select>
                                    {availableEquipment.length === 0 && (
                                        <p className="text-xs text-orange-600 mt-1">
                                            Tutti gli strumenti disponibili sono già prenotati per questa data.
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tecnico *</label>
                                    <select
                                        value={bkForm.technicianName}
                                        onChange={e => setBkForm(f => ({ ...f, technicianName: e.target.value }))}
                                        required
                                        className="w-full border border-gray-300 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[48px]"
                                    >
                                        <option value="">Seleziona tecnico...</option>
                                        {USER_DATA.map(u => (
                                            <option key={u.email} value={u.fullName}>{u.fullName}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Sito / Commessa *</label>
                                    <input
                                        value={bkForm.site}
                                        onChange={e => setBkForm(f => ({ ...f, site: e.target.value }))}
                                        required
                                        placeholder="es. Via Roma 1 – Sito Alfa"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[48px]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Note</label>
                                    <textarea
                                        value={bkForm.notes}
                                        onChange={e => setBkForm(f => ({ ...f, notes: e.target.value }))}
                                        rows={2}
                                        placeholder="Opzionale"
                                        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                    />
                                </div>

                                {/* Conflict error */}
                                {bkConflict && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                        <p className="font-bold text-red-700 text-sm mb-1">⚠️ Strumento già prenotato!</p>
                                        <p className="text-red-600 text-sm">{bkConflict.message}</p>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowBkModal(false)}
                                        className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm min-h-[52px]"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={bkSubmitting || availableEquipment.length === 0}
                                        className="flex-1 py-3 bg-indigo-500 text-white rounded-xl font-semibold text-sm min-h-[52px] disabled:opacity-50 active:bg-indigo-700"
                                    >
                                        {bkSubmitting ? 'Prenotazione...' : '✓ Prenota'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

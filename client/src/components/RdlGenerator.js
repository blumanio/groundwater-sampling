// src/components/RdlGenerator.js
// PERTACR — ACR di Reggiani Albertino S.P.A.
// All 8 official RDL activity presets from ALLEGATO E templates

import React, { useState, useEffect } from 'react';
import config from '../config';
import { getLoggedInUser } from '../utils/utils';

const API_URL = config.API_URL;

// ── Activity Presets ──────────────────────────────────────────────────────────
// Based on official templates from Drive folder: ALLEGATO E - modelli rdl
// Each preset mirrors the content of the corresponding XLS template file
const ACTIVITY_PRESETS = {

  // 1. RDL monitoraggio acque (NO imp).xls
  monitoraggio_acque_no_imp: {
    label: 'Monitoraggio Acque (NO imp.)',
    icon: '💧',
    color: '#3b82f6',
    show_pz: true,
    descrizione_lavori: [
      'Misura del livello piezometrico n.{n_pz} pz',
      'Spurgo acqua dai piezometri n.{n_pz} pz con pompa sommersa + batteria 12V oppure generatore e pompone',
      'Misura parametri chimico fisici acque (pH, Potenziale Redox, Conducibilità, O2, Temperatura) n.{n_pz} pz con sonda multiparametrica',
      'Campionamento in dinamico, previo spurgo, per analisi acque di falda - n.{n_pz} pz',
      'Misura speditiva di campo dei COV tramite PID - n.{n_pz} pz',
    ],
    noleggio: [
      { descrizione: 'sonda interfaccia', ore: '8', impiego: 'misura livello piezometrico' },
      { descrizione: 'pompa + batteria 12V oppure generatore e pompone', ore: '8', impiego: 'spurgo e campionamento' },
      { descrizione: 'sonda multiparametrica', ore: '8', impiego: 'misura parametri chim.-fis. acque' },
      { descrizione: 'PID', ore: '8', impiego: 'misura COV' },
      { descrizione: 'cartello lavori in corso', ore: '8', impiego: '' },
      { descrizione: 'cartello freccia direzionale', ore: '8', impiego: '' },
      { descrizione: 'birilli', ore: '8', impiego: '' },
    ],
    lavori_misura: [],
    note_sicurezza: 'DPI: guanti in nitrile, occhiali, tuta Tyvek. Segnalazione cantiere con cartelli e birilli.',
  },

  // 2. RDL monitoraggio acque (imp P&T).xls
  monitoraggio_acque_imp: {
    label: 'Monitoraggio Acque (imp. P&T)',
    icon: '⚙️',
    color: '#0ea5e9',
    show_pz: true,
    descrizione_lavori: [
      'Controllo impianto',
      'Rilievo fluidi {n_pz} n pz',
      'Misura portata in ingresso/uscita impianto',
      'Campionamento acque in ingresso e uscita impianto per analisi',
      'Verifica funzionamento pompe e strumentazione',
      'Misura del livello piezometrico n.{n_pz} pz',
      'Campionamento in dinamico, previo spurgo, per analisi acque di falda - n.{n_pz} pz',
    ],
    noleggio: [
      { descrizione: 'fiorino fiat', ore: '8', impiego: '' },
      { descrizione: 'freatimetro', ore: '8', impiego: '' },
      { descrizione: 'attrezzatura manuale', ore: '8', impiego: 'varie' },
      { descrizione: 'sonda multiparametrica', ore: '8', impiego: 'misura parametri chim.-fis. acque' },
    ],
    lavori_misura: [],
    note_sicurezza: 'DPI: guanti, occhiali, scarpe antinfortunistica. Verificare assenza gas prima di accesso pozzetti.',
  },

  // 3. RDL monitoraggio SGS.xls
  monitoraggio_sgs: {
    label: 'Monitoraggio SGS',
    icon: '🔬',
    color: '#10b981',
    show_pz: true,
    descrizione_lavori: [
      'Campionamento acque sotterranee per analisi SGS - n.{n_pz} pz',
      'Misura livello piezometrico n.{n_pz} pz',
      'Spurgo prolungato dai piezometri, n.{n_pz} pz',
      'Misura parametri chimico fisici in campo n.{n_pz} pz',
      'Compilazione schede di campionamento',
      'Gestione catena di custodia campioni (COC)',
    ],
    noleggio: [
      { descrizione: 'pompa peristaltica low-flow', ore: '8', impiego: 'campionamento low-flow' },
      { descrizione: 'sonda multiparametrica', ore: '8', impiego: 'misura parametri chim.-fis.' },
      { descrizione: 'freatimetro', ore: '8', impiego: 'misura livello' },
      { descrizione: 'fiorino fiat', ore: '8', impiego: '' },
      { descrizione: 'sonda interfaccia', ore: '8', impiego: 'misura livello piezometrico' },
    ],
    lavori_misura: [],
    note_sicurezza: 'DPI: guanti in nitrile, occhiali, tuta Tyvek. Gestione rifiuti: acqua di spurgo in fusti omologati.',
  },

  // 4. RDL spurgo piezometri.xls
  spurgo_piezometri: {
    label: 'Spurgo Piezometri',
    icon: '🚿',
    color: '#6366f1',
    show_pz: true,
    descrizione_lavori: [
      'Spurgo e sviluppo piezometri n.{n_pz} pz con pompa sommersa + batteria 12V oppure generatore e pompone',
      'Misura livello piezometrico pre/post spurgo n.{n_pz} pz',
      'Misura parametri chimico fisici stabilizzazione n.{n_pz} pz',
      'Smaltimento acqua di spurgo (fusti da 200L)',
    ],
    noleggio: [
      { descrizione: 'pompa + batteria 12V', ore: '8', impiego: 'spurgo piezometri' },
      { descrizione: 'freatimetro', ore: '8', impiego: 'misura livello' },
      { descrizione: 'sonda multiparametrica', ore: '8', impiego: 'stabilizzazione parametri' },
      { descrizione: 'fiorino fiat', ore: '8', impiego: '' },
      { descrizione: 'fusti da 200L', ore: '', impiego: 'raccolta acqua spurgo' },
      { descrizione: 'cartello lavori in corso', ore: '8', impiego: '' },
      { descrizione: 'birilli', ore: '8', impiego: '' },
    ],
    lavori_misura: [],
    note_sicurezza: 'DPI obbligatori. Acqua di spurgo classificata rifiuto speciale - gestire con formulario FIR.',
  },

  // 5. RDL monitoraggio impianto GAS (MPE, SVE, TPE).xls
  monitoraggio_gas: {
    label: 'Monitor. Impianto GAS (MPE/SVE/TPE)',
    icon: '🌫️',
    color: '#f59e0b',
    show_pz: false,
    descrizione_lavori: [
      'Controllo e monitoraggio impianto di estrazione gas (MPE/SVE/TPE)',
      'Verifica portata estrazione gas su punti di monitoraggio',
      'Misura pressione/depressione su punti di estrazione',
      'Campionamento gas da punti di monitoraggio per analisi',
      'Verifica funzionamento blower/pompa vuoto',
      'Lettura contalitri e strumentazione impianto',
    ],
    noleggio: [
      { descrizione: 'fiorino fiat', ore: '8', impiego: '' },
      { descrizione: 'gas analyser', ore: '8', impiego: 'misura gas in campo' },
      { descrizione: 'manometro', ore: '8', impiego: 'misura pressione' },
      { descrizione: 'attrezzatura manuale', ore: '8', impiego: 'varie' },
    ],
    lavori_misura: [],
    note_sicurezza: 'DPI: maschera con filtri per vapori organici, guanti, occhiali. Attenzione pericolo esplosione/incendio gas infiammabili.',
  },

  // 6. RDL prescavi.xls
  prescavi: {
    label: 'Prescavi',
    icon: '⛏️',
    color: '#a16207',
    show_pz: false,
    descrizione_lavori: [
      'Indagine prescavi per localizzazione sottoservizi',
      'Rilievo planimetrico con quote dei sottoservizi individuati',
      'Documentazione fotografica',
      'Ripristini superficiali',
    ],
    noleggio: [
      { descrizione: 'fiorino fiat', ore: '8', impiego: '' },
      { descrizione: 'attrezzatura manuale', ore: '8', impiego: 'prescavi' },
      { descrizione: 'rilevatore sottoservizi', ore: '8', impiego: 'localizzazione tubazioni' },
    ],
    lavori_misura: [
      { art: '', descrizione: 'Prescavo manuale', unita: 'mc', quantita: '', impiego: '' },
    ],
    note_sicurezza: 'DPI: casco, guanti, scarpe antinfortunistiche, indumenti ad alta visibilità. Segnalazione scavo aperto con recinzione e cartelli.',
  },

  // 7. RDL sondaggi.xls
  sondaggi: {
    label: 'Sondaggi e Piezometri',
    icon: '🗻',
    color: '#7c3aed',
    show_pz: true,
    descrizione_lavori: [
      'Esecuzione sondaggio a carotaggio continuo con perforatrice',
      'Descrizione stratigrafica campioni (log stratigrafico)',
      'Installazione piezometro n.{n_pz} con tubo forato e filtro',
      'Sviluppo e spurgo piezometro n.{n_pz}',
      'Ripristino superficiale',
      'Documentazione fotografica e compilazione schede',
    ],
    noleggio: [
      { descrizione: 'perforatrice', ore: '8', impiego: 'esecuzione sondaggio' },
      { descrizione: 'fiorino fiat', ore: '8', impiego: '' },
      { descrizione: 'pompa + batteria 12V', ore: '8', impiego: 'sviluppo piezometro' },
      { descrizione: 'attrezzatura manuale', ore: '8', impiego: 'varie' },
    ],
    lavori_misura: [
      { art: '', descrizione: 'Sondaggio a carotaggio', unita: 'm', quantita: '', impiego: '' },
      { art: '', descrizione: 'Installazione tubo piezometro DN 50', unita: 'm', quantita: '', impiego: '' },
    ],
    note_sicurezza: 'DPI: casco, guanti, scarpe antinfortunistiche. Gestire i detriti di perforazione come rifiuto speciale. Segnalare area di lavoro.',
  },

  // 8. RDL iniezioni.xls
  iniezioni: {
    label: 'Iniezioni',
    icon: '💉',
    color: '#dc2626',
    show_pz: false,
    descrizione_lavori: [
      'Esecuzione iniezioni di reagente in sito',
      'Misura portata e pressione di iniezione',
      'Verifica distribuzione reagente su punti di monitoraggio',
      'Campionamento acque post-iniezione',
      'Documentazione fotografica e compilazione schede',
    ],
    noleggio: [
      { descrizione: 'pompa dosagggio', ore: '8', impiego: 'iniezione reagente' },
      { descrizione: 'fiorino fiat', ore: '8', impiego: '' },
      { descrizione: 'sonda multiparametrica', ore: '8', impiego: 'monitoraggio acque' },
      { descrizione: 'manometro', ore: '8', impiego: 'controllo pressione' },
      { descrizione: 'attrezzatura manuale', ore: '8', impiego: 'varie' },
    ],
    lavori_misura: [
      { art: '', descrizione: 'Iniezione reagente', unita: 'lt', quantita: '', impiego: '' },
    ],
    note_sicurezza: 'DPI: guanti resistenti agli agenti chimici, occhiali, tuta Tyvek, mascherina. Scheda di sicurezza reagente sempre presente.',
  },

  // 9. RDL cartelli.xls
  cartelli: {
    label: 'Cartelli',
    icon: '🪧',
    color: '#f97316',
    show_pz: false,
    descrizione_lavori: [
      'Installazione cartellonistica di cantiere',
      'Cartello lavori in corso con dati cantiere',
      'Cartello freccia direzionale',
      'Verifica e ripristino segnaletica esistente',
    ],
    noleggio: [
      { descrizione: 'fiorino fiat', ore: '4', impiego: '' },
      { descrizione: 'cartello lavori in corso', ore: '', impiego: 'installazione' },
      { descrizione: 'cartello freccia direzionale', ore: '', impiego: 'installazione' },
      { descrizione: 'birilli', ore: '', impiego: 'delimitazione area' },
    ],
    lavori_misura: [],
    note_sicurezza: 'DPI: gilet ad alta visibilità, guanti, scarpe antinfortunistiche.',
  },

  // Custom
  custom: {
    label: 'Personalizzata',
    icon: '✏️',
    color: '#64748b',
    show_pz: false,
    descrizione_lavori: [],
    noleggio: [],
    lavori_misura: [],
    note_sicurezza: '',
  },
};

const METEO_OPTIONS = ['sereno', 'nuvoloso', 'pioggia', 'vento', 'neve'];

const DEFAULT_NOLEGGIO_OPTIONS = [
  'fiorino fiat', 'freatimetro', 'sonda interfaccia', 'sonda multiparametrica',
  'pompa + batteria 12V', 'pompa peristaltica low-flow', 'pompa dosaggio',
  'PID', 'gas analyser', 'aspiratore', 'perforatrice',
  'attrezzatura manuale', 'cartello lavori in corso', 'cartello freccia direzionale',
  'fusti da 200L', 'birilli', 'manometro', 'rilevatore sottoservizi',
];

function interpolate(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export default function RdlGenerator() {
  const loggedInUser = getLoggedInUser();

  const [step, setStep] = useState('activity');
  const [activity, setActivity] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const [nPz, setNPz] = useState(8);
  const [form, setForm] = useState({
    committente: 'ENI  REWIND',
    contratto: '2500040461',
    commessa: '',
    cantiere: '',
    ordine_lavoro: '',
    data_str: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.'),
    meteo: 'sereno',
    n_rdl: '1',
    note_lavori: '',
    note_sicurezza: '',
    presenza_arpa: '',
    presenza_delegato: '',
  });

  const [descLines, setDescLines] = useState([]);
  const [noleggio, setNoleggio] = useState([]);
  const [matOpera, setMatOpera] = useState([]);
  const [matPiedi, setMatPiedi] = useState([]);
  const [lavMisura, setLavMisura] = useState([]);
  const [manodopera, setManodopera] = useState([
    { nominativo: loggedInUser?.fullName || '', qualifica: 'geologo', ore: '8+viaggio', impiego: 'tecnico', enabled: true },
    { nominativo: '', qualifica: '', ore: '', impiego: '', enabled: false },
    { nominativo: '', qualifica: '', ore: '', impiego: '', enabled: false },
  ]);

  useEffect(() => {
    if (!activity) return;
    const preset = ACTIVITY_PRESETS[activity];
    if (!preset) return;
    const vars = { n_pz: nPz };
    setDescLines(preset.descrizione_lavori.map(t => ({ text: interpolate(t, vars), enabled: true })));
    setNoleggio(preset.noleggio.map(n => ({ ...n, enabled: true })));
    setLavMisura((preset.lavori_misura || []).map(l => ({ ...l, enabled: true })));
    setForm(f => ({ ...f, note_sicurezza: preset.note_sicurezza }));
    setMatOpera([]);
    setMatPiedi([]);
  }, [activity, nPz]);

  const setFormField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      // Build note lavori with ARPA/Delegato info
      let noteExtra = '';
      if (form.presenza_arpa) noteExtra += `\nPresente ARPA: ${form.presenza_arpa}`;
      if (form.presenza_delegato) noteExtra += `\nPresente Delegato Lavori ER: ${form.presenza_delegato}`;

      const payload = {
        ...form,
        note_lavori: (form.note_lavori + noteExtra).trim(),
        descrizione_lavori: descLines.filter(d => d.enabled).map(d => d.text),
        noleggio: noleggio.filter(n => n.enabled),
        materiali_opera: matOpera.filter(m => m.enabled),
        materiali_piedi: matPiedi.filter(m => m.enabled),
        lavori_misura: lavMisura.filter(l => l.enabled),
        manodopera: manodopera.filter(m => m.enabled && m.nominativo),
        activity_type: activity,
      };
      const res = await fetch(`${API_URL}/rdl/genera`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Errore generazione');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RDL_${form.commessa}_${form.data_str.replace(/\./g, '')}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Activity selector ──────────────────────────────────────────────────────
  if (step === 'activity') {
    return (
      <div style={pageStyle}>
        <Header title="📄 Genera RdL" subtitle="Rapporto Giornaliero dei Lavori — seleziona tipo attività" />
        <Section title="Tipo attività">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
            {Object.entries(ACTIVITY_PRESETS).map(([key, preset]) => (
              <button key={key} onClick={() => { setActivity(key); setStep('form'); }}
                style={{
                  background: '#fff',
                  color: '#1e293b',
                  border: `2px solid ${preset.color}`,
                  borderRadius: 14, padding: '14px 10px',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  textAlign: 'center', minHeight: 80,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = preset.color; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#1e293b'; }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{preset.icon}</div>
                {preset.label}
              </button>
            ))}
          </div>
        </Section>
      </div>
    );
  }

  const preset = ACTIVITY_PRESETS[activity];

  return (
    <div style={pageStyle}>
      <Header title="📄 Genera RdL" subtitle={`${preset.icon} ${preset.label}`} />

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button onClick={() => setStep('activity')} style={btnSec}>← Cambia attività</button>
        <button onClick={handleGenerate} disabled={generating}
          style={{ ...btnPri, background: preset.color, opacity: generating ? 0.5 : 1 }}>
          {generating ? '⏳ Generazione...' : '⬇️ Genera & Scarica XLS'}
        </button>
      </div>
      {error && <div style={errBox}>⚠️ {error}</div>}

      {/* ── TESTATA ────────────────────────────────────────────────────────── */}
      <Section title="📋 Testata documento">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Field label="Committente">
            <input value={form.committente} onChange={e => setFormField('committente', e.target.value)} style={inp} />
          </Field>
          <Field label="N° Contratto">
            <input value={form.contratto} onChange={e => setFormField('contratto', e.target.value)} style={inp} />
          </Field>
          <Field label="Cantiere / Sito *">
            <input value={form.cantiere} onChange={e => setFormField('cantiere', e.target.value)} style={inp} placeholder="es. Effrazione San Bonico" />
          </Field>
          <Field label="Codice Commessa *">
            <input value={form.commessa} onChange={e => setFormField('commessa', e.target.value)}
              style={{ ...inp, fontFamily: 'monospace', fontWeight: 700 }} placeholder="es. 20C1881834" />
          </Field>
          <Field label="Data *">
            <input value={form.data_str} onChange={e => setFormField('data_str', e.target.value)} style={inp} placeholder="17.04.2026" />
          </Field>
          <Field label="N° RdL">
            <input value={form.n_rdl} onChange={e => setFormField('n_rdl', e.target.value)} style={inp} />
          </Field>
          <Field label="Meteo">
            <select value={form.meteo} onChange={e => setFormField('meteo', e.target.value)} style={inp}>
              {METEO_OPTIONS.map(m => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Ordine Di Lavoro n.">
            <input value={form.ordine_lavoro} onChange={e => setFormField('ordine_lavoro', e.target.value)} style={inp} placeholder="opzionale" />
          </Field>
        </div>

        {preset.show_pz && (
          <div style={{ marginTop: 12 }}>
            <Field label="N° Piezometri">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input type="number" min={1} max={50} value={nPz}
                  onChange={e => setNPz(Number(e.target.value))}
                  style={{ ...inp, width: 80, textAlign: 'center', fontWeight: 700 }} />
                <span style={{ fontSize: 12, color: '#64748b' }}>→ aggiorna automaticamente le descrizioni</span>
              </div>
            </Field>
          </div>
        )}
      </Section>

      {/* ── DESCRIZIONE LAVORI ──────────────────────────────────────────────── */}
      <Section title="📝 Descrizione Lavori">
        {descLines.map((d, i) => (
          <ToggleRow key={i} enabled={d.enabled}
            onToggle={() => setDescLines(dl => dl.map((x,j) => j===i ? {...x, enabled: !x.enabled} : x))}
            onDelete={() => setDescLines(dl => dl.filter((_,j) => j!==i))}>
            <input value={d.text} onChange={e => setDescLines(dl => dl.map((x,j) => j===i ? {...x, text: e.target.value} : x))}
              style={{ ...inp, flex: 1, opacity: d.enabled ? 1 : 0.4 }} />
          </ToggleRow>
        ))}
        <button onClick={() => setDescLines(d => [...d, { text: '', enabled: true }])} style={addBtn}>+ Aggiungi riga</button>
      </Section>

      {/* ── NOLEGGIO ────────────────────────────────────────────────────────── */}
      <Section title="🚗 Noleggio Mezzi e Attrezzature">
        {noleggio.map((n, i) => (
          <ToggleRow key={i} enabled={n.enabled}
            onToggle={() => setNoleggio(d => d.map((x,j) => j===i ? {...x, enabled: !x.enabled} : x))}
            onDelete={() => setNoleggio(d => d.filter((_,j) => j!==i))}>
            <div style={{ display: 'flex', gap: 6, flex: 1, opacity: n.enabled ? 1 : 0.4, flexWrap: 'wrap' }}>
              <input value={n.descrizione}
                onChange={e => setNoleggio(d => d.map((x,j) => j===i ? {...x, descrizione: e.target.value} : x))}
                list="noleggio-opts" style={{ ...inp, flex: 2 }} placeholder="attrezzatura" />
              <datalist id="noleggio-opts">{DEFAULT_NOLEGGIO_OPTIONS.map(o => <option key={o} value={o} />)}</datalist>
              <input value={n.ore}
                onChange={e => setNoleggio(d => d.map((x,j) => j===i ? {...x, ore: e.target.value} : x))}
                style={{ ...inp, width: 60 }} placeholder="ore" />
              <input value={n.impiego}
                onChange={e => setNoleggio(d => d.map((x,j) => j===i ? {...x, impiego: e.target.value} : x))}
                style={{ ...inp, flex: 2 }} placeholder="impiego" />
            </div>
          </ToggleRow>
        ))}
        <button onClick={() => setNoleggio(d => [...d, { descrizione: '', ore: '8', impiego: '', enabled: true }])} style={addBtn}>+ Aggiungi</button>
      </Section>

      {/* ── MATERIALI IN OPERA ──────────────────────────────────────────────── */}
      <Section title="📦 Fornitura Materiali in Opera" collapsible initialOpen={false}>
        {matOpera.map((m, i) => (
          <ToggleRow key={i} enabled={m.enabled}
            onToggle={() => setMatOpera(d => d.map((x,j) => j===i ? {...x, enabled: !x.enabled} : x))}
            onDelete={() => setMatOpera(d => d.filter((_,j) => j!==i))}>
            <div style={{ display: 'flex', gap: 6, flex: 1, opacity: m.enabled ? 1 : 0.4, flexWrap: 'wrap' }}>
              <input value={m.art} onChange={e => setMatOpera(d => d.map((x,j) => j===i ? {...x, art: e.target.value} : x))}
                style={{ ...inp, width: 50 }} placeholder="art." />
              <input value={m.descrizione} onChange={e => setMatOpera(d => d.map((x,j) => j===i ? {...x, descrizione: e.target.value} : x))}
                style={{ ...inp, flex: 2 }} placeholder="descrizione" />
              <input value={m.unita} onChange={e => setMatOpera(d => d.map((x,j) => j===i ? {...x, unita: e.target.value} : x))}
                style={{ ...inp, width: 70 }} placeholder="u.m." />
              <input value={m.quantita} onChange={e => setMatOpera(d => d.map((x,j) => j===i ? {...x, quantita: e.target.value} : x))}
                style={{ ...inp, width: 60 }} placeholder="q.tà" />
              <input value={m.impiego} onChange={e => setMatOpera(d => d.map((x,j) => j===i ? {...x, impiego: e.target.value} : x))}
                style={{ ...inp, flex: 2 }} placeholder="impiego" />
            </div>
          </ToggleRow>
        ))}
        <button onClick={() => setMatOpera(d => [...d, { art: '', descrizione: '', unita: '', quantita: '', impiego: '', enabled: true }])} style={addBtn}>+ Aggiungi</button>
      </Section>

      {/* ── NOTE LAVORI ─────────────────────────────────────────────────────── */}
      <Section title="🟡 Note Lavori">
        <textarea value={form.note_lavori} onChange={e => setFormField('note_lavori', e.target.value)}
          rows={3} style={{ ...inp, resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
          placeholder="Note, osservazioni, anomalie riscontrate..." />

        <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <PresenzaToggle label="Presente ARPA?" field="presenza_arpa" form={form} setFormField={setFormField} />
          <PresenzaToggle label="Presente Delegato Lavori ER?" field="presenza_delegato" form={form} setFormField={setFormField} />
        </div>
      </Section>

      {/* ── LAVORI A MISURA ─────────────────────────────────────────────────── */}
      <Section title="📐 Lavori a Misura" collapsible initialOpen={lavMisura.length > 0}>
        {lavMisura.map((l, i) => (
          <ToggleRow key={i} enabled={l.enabled}
            onToggle={() => setLavMisura(d => d.map((x,j) => j===i ? {...x, enabled: !x.enabled} : x))}
            onDelete={() => setLavMisura(d => d.filter((_,j) => j!==i))}>
            <div style={{ display: 'flex', gap: 6, flex: 1, opacity: l.enabled ? 1 : 0.4, flexWrap: 'wrap' }}>
              <input value={l.art} onChange={e => setLavMisura(d => d.map((x,j) => j===i ? {...x, art: e.target.value} : x))}
                style={{ ...inp, width: 50 }} placeholder="art." />
              <input value={l.descrizione} onChange={e => setLavMisura(d => d.map((x,j) => j===i ? {...x, descrizione: e.target.value} : x))}
                style={{ ...inp, flex: 2 }} placeholder="descrizione" />
              <input value={l.unita} onChange={e => setLavMisura(d => d.map((x,j) => j===i ? {...x, unita: e.target.value} : x))}
                style={{ ...inp, width: 70 }} placeholder="u.m." />
              <input value={l.quantita} onChange={e => setLavMisura(d => d.map((x,j) => j===i ? {...x, quantita: e.target.value} : x))}
                style={{ ...inp, width: 60 }} placeholder="q.tà" />
              <input value={l.impiego} onChange={e => setLavMisura(d => d.map((x,j) => j===i ? {...x, impiego: e.target.value} : x))}
                style={{ ...inp, flex: 2 }} placeholder="impiego" />
            </div>
          </ToggleRow>
        ))}
        <button onClick={() => setLavMisura(d => [...d, { art: '', descrizione: '', unita: '', quantita: '', impiego: '', enabled: true }])} style={addBtn}>+ Aggiungi</button>
      </Section>

      {/* ── NOTE SICUREZZA ──────────────────────────────────────────────────── */}
      <Section title="⚠️ Note Sicurezza">
        <textarea value={form.note_sicurezza} onChange={e => setFormField('note_sicurezza', e.target.value)}
          rows={3} style={{ ...inp, resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
      </Section>

      {/* ── MANODOPERA ──────────────────────────────────────────────────────── */}
      <Section title="👷 Prestazioni di Manodopera">
        {manodopera.map((m, i) => (
          <ToggleRow key={i} enabled={m.enabled}
            onToggle={() => setManodopera(d => d.map((x,j) => j===i ? {...x, enabled: !x.enabled} : x))}>
            <div style={{ display: 'flex', gap: 8, flex: 1, opacity: m.enabled ? 1 : 0.4, flexWrap: 'wrap' }}>
              <input value={m.nominativo}
                onChange={e => setManodopera(d => d.map((x,j) => j===i ? {...x, nominativo: e.target.value} : x))}
                style={{ ...inp, flex: 2, minWidth: 140 }} placeholder="Nome Cognome" />
              <input value={m.qualifica}
                onChange={e => setManodopera(d => d.map((x,j) => j===i ? {...x, qualifica: e.target.value} : x))}
                style={{ ...inp, flex: 1 }} placeholder="qualifica" />
              <input value={m.ore}
                onChange={e => setManodopera(d => d.map((x,j) => j===i ? {...x, ore: e.target.value} : x))}
                style={{ ...inp, width: 90 }} placeholder="ore" />
              <input value={m.impiego}
                onChange={e => setManodopera(d => d.map((x,j) => j===i ? {...x, impiego: e.target.value} : x))}
                style={{ ...inp, flex: 1 }} placeholder="impiego" />
            </div>
          </ToggleRow>
        ))}
        <button onClick={() => setManodopera(d => [...d, { nominativo: '', qualifica: '', ore: '', impiego: '', enabled: true }])} style={addBtn}>+ Aggiungi</button>
      </Section>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
        <button onClick={handleGenerate} disabled={generating}
          style={{ ...btnPri, background: preset.color, width: '100%', fontSize: 16, padding: '16px', opacity: generating ? 0.5 : 1 }}>
          {generating ? '⏳ Generazione in corso...' : '⬇️ Genera RdL e Scarica Excel'}
        </button>
        {error && <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center', marginTop: 8 }}>⚠️ {error}</p>}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────
function Header({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 14, color: '#64748b', margin: '3px 0 0', fontWeight: 500 }}>{subtitle}</p>}
    </div>
  );
}

function Section({ title, info, children, collapsible = false, initialOpen = true }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div style={{ marginBottom: 16, background: '#fff', borderRadius: 14, border: '1.5px solid #f1f5f9', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', cursor: collapsible ? 'pointer' : 'default',
        background: '#f8fafc', borderBottom: open ? '1px solid #f1f5f9' : 'none',
      }} onClick={() => collapsible && setOpen(o => !o)}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</span>
          {info && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 8 }}>{info}</span>}
        </div>
        {collapsible && <span style={{ color: '#94a3b8', fontSize: 16 }}>{open ? '▲' : '▼'}</span>}
      </div>
      {open && <div style={{ padding: '14px 16px' }}>{children}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 5px' }}>{label}</p>
      {children}
    </div>
  );
}

function ToggleRow({ children, enabled, onToggle, onDelete }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <button onClick={onToggle} style={{
        width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: enabled ? '#22c55e' : '#cbd5e1', position: 'relative', transition: 'background 0.2s',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: enabled ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', display: 'block',
        }} />
      </button>
      {children}
      {onDelete && (
        <button onClick={onDelete} style={{
          padding: '4px 8px', borderRadius: 6, border: '1px solid #fecaca',
          background: '#fef2f2', color: '#dc2626', fontSize: 12, cursor: 'pointer', flexShrink: 0,
        }}>✕</button>
      )}
    </div>
  );
}

function PresenzaToggle({ label, field, form, setFormField }) {
  const val = form[field];
  return (
    <button onClick={() => setFormField(field, val === 'si' ? 'no' : val === 'no' ? '' : 'si')} style={{
      padding: '7px 14px', borderRadius: 10, border: '1.5px solid',
      borderColor: val === 'si' ? '#22c55e' : val === 'no' ? '#ef4444' : '#e2e8f0',
      background: val === 'si' ? '#f0fdf4' : val === 'no' ? '#fef2f2' : '#f8fafc',
      color: val === 'si' ? '#16a34a' : val === 'no' ? '#dc2626' : '#64748b',
      fontWeight: 700, fontSize: 12, cursor: 'pointer',
    }}>
      {label} {val === 'si' ? '✅ Sì' : val === 'no' ? '❌ No' : '—'}
    </button>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────────
const pageStyle = {
  maxWidth: 760, margin: '0 auto', padding: '20px 16px 100px',
  fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
};
const inp = {
  border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '9px 12px',
  fontSize: 13, color: '#0f172a', outline: 'none', background: '#fff',
  width: '100%', boxSizing: 'border-box',
};
const btnPri = {
  padding: '12px 20px', borderRadius: 12, border: 'none',
  background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 14,
  cursor: 'pointer', minHeight: 48,
};
const btnSec = {
  padding: '12px 20px', borderRadius: 12,
  border: '1.5px solid #e2e8f0', background: '#f8fafc',
  color: '#475569', fontWeight: 700, fontSize: 14, cursor: 'pointer', minHeight: 48,
};
const addBtn = {
  marginTop: 6, padding: '7px 14px', borderRadius: 8,
  border: '1.5px dashed #cbd5e1', background: 'transparent',
  color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer',
};
const errBox = {
  background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10,
  padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 12,
};
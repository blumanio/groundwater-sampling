// Anagrafica tipi strumento, caratteristiche tecniche e procedure di taratura.
// I "readings" di ogni procedura diventano i valori registrati nel record di
// taratura: servono a dimostrare la conformità e a seguire il degrado nel tempo.

export const INSTRUMENT_TYPES = [
    { id: 'multiparametrica', label: 'Multiparametrica', icon: '📊', category: 'Multiparametro' },
    { id: 'pid', label: 'PID', icon: '🌫️', category: 'PID' },
    { id: 'multigas', label: 'Multigas', icon: '☣️', category: 'Multigas' },
    { id: 'termometro', label: 'Termometro', icon: '🌡️', category: 'Termometro' },
    { id: 'freatimetro', label: 'Freatimetro', icon: '📏', category: 'Freatimetro' },
    { id: 'altro', label: 'Altro', icon: '🔧', category: 'Altro' },
];

export const CALIBRATION_TYPES = [
    { id: 'certificazione', label: 'Certificazione (lab esterno)' },
    { id: 'taratura interna', label: 'Taratura interna' },
    { id: 'verifica di campo', label: 'Verifica di campo' },
    { id: 'bump test', label: 'Bump test' },
];

export const CALIBRATION_RESULTS = ['conforme', 'conforme con riserva', 'non conforme'];

// ── Caratteristiche tecniche, diverse per ogni tipo di strumento ───────────
// (la lunghezza cavo ha senso per una sonda multiparametrica, non per un PID)
export const SPEC_FIELDS = {
    multiparametrica: [
        { key: 'cableLength', label: 'Lunghezza cavo', unit: 'm', type: 'number' },
        { key: 'probeDiameter', label: 'Diametro sonda', unit: 'mm', type: 'number' },
        { key: 'parameters', label: 'Parametri misurati', type: 'text', placeholder: 'pH, EC, DO, ORP, T, torbidità' },
        { key: 'phRange', label: 'Range pH', type: 'text', placeholder: '0 - 14' },
        { key: 'ecRange', label: 'Range conducibilità', unit: 'µS/cm', type: 'text', placeholder: '0 - 200.000' },
        { key: 'membraneChangedAt', label: 'Ultima sostituzione membrana', type: 'date' },
        { key: 'ipRating', label: 'Grado di protezione', type: 'text', placeholder: 'IP67' },
    ],
    pid: [
        { key: 'lampEv', label: 'Lampada', unit: 'eV', type: 'text', placeholder: '10.6' },
        { key: 'lampHours', label: 'Ore lampada', unit: 'h', type: 'number' },
        { key: 'detectionRange', label: 'Range di rilevazione', unit: 'ppm', type: 'text', placeholder: '0 - 5.000' },
        { key: 'resolution', label: 'Risoluzione', unit: 'ppm', type: 'text', placeholder: '0.1' },
        { key: 'correctionFactor', label: 'Fattore di correzione', type: 'text', placeholder: 'isobutilene = 1.0' },
        { key: 'pumpFlow', label: 'Portata pompa', unit: 'ml/min', type: 'number' },
    ],
    multigas: [
        { key: 'sensors', label: 'Sensori installati', type: 'text', placeholder: 'O2, LEL, CO, H2S' },
        { key: 'sensorO2Expiry', label: 'Scadenza sensore O2', type: 'date' },
        { key: 'sensorLelExpiry', label: 'Scadenza sensore LEL', type: 'date' },
        { key: 'sensorCoExpiry', label: 'Scadenza sensore CO', type: 'date' },
        { key: 'sensorH2sExpiry', label: 'Scadenza sensore H2S', type: 'date' },
        { key: 'gasCylinderLot', label: 'Lotto bombola gas campione', type: 'text' },
        // La bombola di gas campione scade: una taratura fatta con gas scaduto non è valida.
        { key: 'gasCylinderExpiry', label: 'Scadenza bombola gas', type: 'date' },
    ],
    termometro: [
        { key: 'measureRange', label: 'Range di misura', unit: '°C', type: 'text', placeholder: '-50 / +200' },
        { key: 'resolution', label: 'Risoluzione', unit: '°C', type: 'text', placeholder: '0.1' },
        { key: 'accuracy', label: 'Accuratezza dichiarata', unit: '°C', type: 'text', placeholder: '± 0.3' },
        { key: 'probeType', label: 'Tipo sonda', type: 'text', placeholder: 'Pt100 / termocoppia K' },
    ],
    freatimetro: [
        { key: 'cableLength', label: 'Lunghezza cavo', unit: 'm', type: 'number' },
        { key: 'graduation', label: 'Graduazione', unit: 'cm', type: 'text', placeholder: '1' },
        { key: 'probeDiameter', label: 'Diametro sonda', unit: 'mm', type: 'number' },
    ],
    altro: [
        { key: 'measureRange', label: 'Range di misura', type: 'text' },
        { key: 'resolution', label: 'Risoluzione', type: 'text' },
    ],
};

// ── Procedure di taratura ──────────────────────────────────────────────────
export const CALIBRATION_GUIDES = {
    multiparametrica: {
        label: 'Sonda multiparametrica (Hanna HI9829 / HI98194)',
        suggestedIntervalDays: 365,
        suggestedFieldCheckDays: 1,
        note: 'La sostituzione di membrana ed elettrolita del sensore DO è manutenzione, non taratura: va tracciata a parte.',
        procedures: [
            {
                type: 'verifica di campo',
                title: 'Taratura di campo pre-campagna',
                frequency: 'Prima di ogni giornata di campionamento',
                materials: [
                    'Tamponi pH 4.01 / 7.01 / 10.01 (entro la data di scadenza)',
                    'Soluzione conducibilità 1413 µS/cm (o 12.880 µS/cm per acque salmastre)',
                    'Soluzione zero DO e aria satura di umidità',
                    'Soluzione ORP Zobell o chinidrone',
                    'Acqua deionizzata e carta assorbente',
                ],
                steps: [
                    'Verificare che le soluzioni non siano scadute e annotarne il lotto.',
                    'Sciacquare i sensori con acqua deionizzata e tamponare senza strofinare il bulbo del pH.',
                    'pH: taratura a 3 punti, partendo da 7.01, poi 4.01 e 10.01. Attendere la stabilizzazione della lettura.',
                    'Leggere e annotare lo slope: fuori dal 85-105% l\'elettrodo va rigenerato o sostituito.',
                    'Conducibilità: taratura a 1 punto su 1413 µS/cm, immergendo la cella oltre i fori di sfiato.',
                    'Ossigeno disciolto: zero con soluzione apposita, poi 100% in aria satura (tappo umido).',
                    'ORP: verifica con soluzione Zobell, confrontare con il valore atteso alla temperatura letta.',
                    'Temperatura: confronto con termometro certificato, scarto atteso entro ± 0.5 °C.',
                    'Sciacquare, riporre la sonda con il cappuccio umido (mai a secco).',
                ],
                readings: [
                    { key: 'phSlope', label: 'Slope pH', unit: '%', type: 'number', hint: 'Accettabile 85 - 105%' },
                    { key: 'phOffset', label: 'Offset pH (mV)', unit: 'mV', type: 'number' },
                    { key: 'ecStandard', label: 'Standard EC usato', unit: 'µS/cm', type: 'text' },
                    { key: 'ecReading', label: 'Lettura EC', unit: 'µS/cm', type: 'number' },
                    { key: 'doSaturation', label: 'DO al 100%', unit: '%', type: 'number', hint: 'Atteso 95 - 105%' },
                    { key: 'orpReading', label: 'Lettura ORP', unit: 'mV', type: 'number' },
                    { key: 'tempDelta', label: 'Scarto temperatura', unit: '°C', type: 'number', hint: 'Atteso ± 0.5 °C' },
                    { key: 'solutionLot', label: 'Lotto soluzioni', type: 'text' },
                ],
                acceptance: 'Slope pH 85-105%, DO 95-105%, EC entro ± 2% dello standard, temperatura entro ± 0.5 °C.',
            },
            {
                type: 'certificazione',
                title: 'Certificazione annuale presso laboratorio',
                frequency: 'Annuale',
                materials: ['Strumento completo di sonda e cavo', 'Certificato precedente'],
                steps: [
                    'Prenotare il laboratorio con almeno 3-4 settimane di anticipo.',
                    'Annotare seriale, modello e configurazione sensori prima della spedizione.',
                    'Al rientro archiviare il PDF del certificato e aggiornare la data di scadenza.',
                    'Verificare che il certificato riporti la riferibilità dei campioni usati.',
                ],
                readings: [
                    { key: 'certificateNumber', label: 'Numero certificato', type: 'text' },
                    { key: 'uncertainty', label: 'Incertezza dichiarata', type: 'text' },
                ],
                acceptance: 'Certificato conforme con riferibilità dichiarata.',
            },
        ],
    },

    pid: {
        label: 'Fotoionizzatore PID (MiniRAE / ppbRAE / Tiger)',
        suggestedIntervalDays: 365,
        suggestedFieldCheckDays: 30,
        note: 'Il bump test pre-uso e la taratura span mensile sono due cose diverse: entrambe vanno registrate.',
        procedures: [
            {
                type: 'bump test',
                title: 'Bump test / verifica risposta',
                frequency: 'Prima di ogni utilizzo',
                materials: ['Gas campione isobutilene 100 ppm', 'Regolatore a portata fissa', 'Tubo di collegamento'],
                steps: [
                    'Verificare la carica della batteria e la pulizia del filtro di ingresso.',
                    'Controllare la data di scadenza della bombola di gas campione.',
                    'Accendere lo strumento e attendere il warm-up completo.',
                    'Applicare il gas campione per 30-60 secondi e leggere il valore stabilizzato.',
                    'Risposta entro ± 10% del valore nominale: strumento utilizzabile.',
                    'Se fuori tolleranza eseguire la taratura completa (zero + span).',
                ],
                readings: [
                    { key: 'spanGasPpm', label: 'Gas campione', unit: 'ppm', type: 'number' },
                    { key: 'reading', label: 'Lettura strumento', unit: 'ppm', type: 'number' },
                    { key: 'cylinderExpiry', label: 'Scadenza bombola', type: 'date' },
                ],
                acceptance: 'Lettura entro ± 10% del valore nominale del gas campione.',
            },
            {
                type: 'taratura interna',
                title: 'Taratura zero + span',
                frequency: 'Mensile o dopo un bump test fallito',
                materials: [
                    'Aria pulita o filtro a carbone attivo',
                    'Gas campione isobutilene 100 ppm',
                    'Kit pulizia lampada',
                ],
                steps: [
                    'Pulire la lampada e la camera di ionizzazione se le ore lampada sono elevate.',
                    'Eseguire lo zero con aria pulita o filtro a carbone attivo.',
                    'Eseguire lo span con isobutilene 100 ppm.',
                    'Impostare il fattore di correzione del composto bersaglio (isobutilene = 1.0).',
                    'Annotare le ore lampada: una lampada a fine vita dà letture basse e instabili.',
                    'Ricordare che umidità elevata e alte concentrazioni di metano falsano la lettura.',
                ],
                readings: [
                    { key: 'zeroReading', label: 'Lettura zero', unit: 'ppm', type: 'number' },
                    { key: 'spanGasPpm', label: 'Gas span', unit: 'ppm', type: 'number' },
                    { key: 'spanReading', label: 'Lettura span', unit: 'ppm', type: 'number' },
                    { key: 'lampHours', label: 'Ore lampada', unit: 'h', type: 'number' },
                    { key: 'correctionFactor', label: 'Fattore di correzione', type: 'text' },
                ],
                acceptance: 'Zero < 0.5 ppm e span entro ± 10% del nominale.',
            },
        ],
    },

    multigas: {
        label: 'Rilevatore multigas (MSA Altair 4X / Dräger X-am / BW)',
        suggestedIntervalDays: 180,
        suggestedFieldCheckDays: 1,
        note: 'Il bump test prima di ogni utilizzo è obbligatorio per gli ingressi in spazi confinati. I sensori hanno una scadenza propria, indipendente dalla taratura.',
        procedures: [
            {
                type: 'bump test',
                title: 'Bump test pre-utilizzo',
                frequency: 'Prima di ogni utilizzo (obbligatorio per spazi confinati)',
                materials: ['Bombola gas campione quadrigas', 'Regolatore', 'Stazione di bump test se disponibile'],
                steps: [
                    'Verificare carica batteria e integrità delle aperture dei sensori.',
                    'Controllare la data di scadenza della bombola: gas scaduto invalida la prova.',
                    'Accendere in aria pulita e attendere l\'autozero.',
                    'Applicare il gas campione e verificare che tutti gli allarmi si attivino.',
                    'Verificare la risposta di ciascun sensore entro le tolleranze del costruttore.',
                    'Se un sensore non risponde, eseguire la taratura completa o sostituirlo.',
                ],
                readings: [
                    { key: 'o2Reading', label: 'O2', unit: '%vol', type: 'number', hint: 'Atteso ~20.9% in aria' },
                    { key: 'lelReading', label: 'LEL', unit: '%LEL', type: 'number' },
                    { key: 'coReading', label: 'CO', unit: 'ppm', type: 'number' },
                    { key: 'h2sReading', label: 'H2S', unit: 'ppm', type: 'number' },
                    { key: 'alarmsOk', label: 'Allarmi acustici/visivi OK', type: 'text', placeholder: 'sì / no' },
                    { key: 'cylinderExpiry', label: 'Scadenza bombola', type: 'date' },
                ],
                acceptance: 'Tutti i sensori entro tolleranza costruttore e allarmi funzionanti.',
            },
            {
                type: 'taratura interna',
                title: 'Taratura completa (span calibration)',
                frequency: 'Ogni 6 mesi o dopo bump test fallito',
                materials: ['Bombola gas campione quadrigas certificata', 'Regolatore a portata fissa'],
                steps: [
                    'Eseguire l\'autozero in aria pulita certa.',
                    'Applicare il gas campione e avviare la procedura di span da menu.',
                    'Verificare l\'esito per ogni singolo sensore.',
                    'Annotare la scadenza di ciascun sensore: la sostituzione va pianificata a parte.',
                    'Registrare lotto e scadenza della bombola utilizzata.',
                ],
                readings: [
                    { key: 'o2Span', label: 'Span O2', unit: '%vol', type: 'number' },
                    { key: 'lelSpan', label: 'Span LEL', unit: '%LEL', type: 'number' },
                    { key: 'coSpan', label: 'Span CO', unit: 'ppm', type: 'number' },
                    { key: 'h2sSpan', label: 'Span H2S', unit: 'ppm', type: 'number' },
                    { key: 'cylinderLot', label: 'Lotto bombola', type: 'text' },
                    { key: 'cylinderExpiry', label: 'Scadenza bombola', type: 'date' },
                ],
                acceptance: 'Span superato per tutti i sensori installati.',
            },
        ],
    },

    termometro: {
        label: 'Termometro',
        suggestedIntervalDays: 365,
        suggestedFieldCheckDays: null,
        procedures: [
            {
                type: 'verifica di campo',
                title: 'Verifica al punto di ghiaccio',
                frequency: 'Trimestrale o al rientro da uso intensivo',
                materials: ['Ghiaccio tritato di acqua deionizzata', 'Contenitore Dewar o thermos', 'Termometro di riferimento certificato'],
                steps: [
                    'Preparare una miscela di ghiaccio tritato e acqua deionizzata.',
                    'Immergere la sonda evitando il contatto con le pareti del contenitore.',
                    'Attendere la stabilizzazione (almeno 3 minuti) e leggere il valore.',
                    'Confrontare con il valore atteso di 0.0 °C e con il riferimento certificato.',
                ],
                readings: [
                    { key: 'icePointReading', label: 'Lettura al punto di ghiaccio', unit: '°C', type: 'number' },
                    { key: 'referenceReading', label: 'Lettura riferimento', unit: '°C', type: 'number' },
                    { key: 'deviation', label: 'Scarto', unit: '°C', type: 'number' },
                ],
                acceptance: 'Scarto entro l\'accuratezza dichiarata dello strumento.',
            },
            {
                type: 'certificazione',
                title: 'Certificazione annuale per confronto',
                frequency: 'Annuale',
                materials: ['Strumento e sonda', 'Certificato precedente'],
                steps: [
                    'Inviare al laboratorio accreditato per taratura per confronto con campione riferibile.',
                    'Richiedere almeno 3 punti di taratura nel range di utilizzo.',
                    'Archiviare il certificato e aggiornare la scadenza.',
                ],
                readings: [
                    { key: 'certificateNumber', label: 'Numero certificato', type: 'text' },
                    { key: 'uncertainty', label: 'Incertezza dichiarata', unit: '°C', type: 'text' },
                ],
                acceptance: 'Certificato conforme con riferibilità dichiarata.',
            },
        ],
    },

    freatimetro: {
        label: 'Freatimetro / sonda di livello',
        suggestedIntervalDays: 730,
        suggestedFieldCheckDays: null,
        procedures: [
            {
                type: 'verifica di campo',
                title: 'Verifica della graduazione del cavo',
                frequency: 'Annuale o dopo riparazione del cavo',
                materials: ['Metro a nastro certificato', 'Superficie piana di riferimento'],
                steps: [
                    'Stendere il cavo su una superficie piana senza tensionarlo.',
                    'Confrontare la graduazione con un metro certificato a 1 m, 10 m e a fondo scala.',
                    'Verificare il funzionamento del segnale acustico e luminoso in acqua.',
                    'Controllare l\'assenza di giunzioni o allungamenti del cavo.',
                ],
                readings: [
                    { key: 'deviationAt10m', label: 'Scarto a 10 m', unit: 'cm', type: 'number' },
                    { key: 'deviationFullScale', label: 'Scarto a fondo scala', unit: 'cm', type: 'number' },
                    { key: 'signalOk', label: 'Segnale acustico OK', type: 'text', placeholder: 'sì / no' },
                ],
                acceptance: 'Scarto entro ± 1 cm ogni 10 m.',
            },
        ],
    },

    altro: {
        label: 'Altro strumento',
        suggestedIntervalDays: 365,
        suggestedFieldCheckDays: null,
        procedures: [
            {
                type: 'taratura interna',
                title: 'Taratura generica',
                frequency: 'Secondo manuale del costruttore',
                materials: ['Manuale del costruttore', 'Campioni di riferimento'],
                steps: [
                    'Seguire la procedura indicata dal manuale del costruttore.',
                    'Registrare i valori letti e l\'esito.',
                ],
                readings: [
                    { key: 'reading', label: 'Valore letto', type: 'text' },
                    { key: 'reference', label: 'Valore di riferimento', type: 'text' },
                ],
                acceptance: 'Secondo specifica del costruttore.',
            },
        ],
    },
};

export const getGuide = (instrumentType) => CALIBRATION_GUIDES[instrumentType] || CALIBRATION_GUIDES.altro;
export const getSpecFields = (instrumentType) => SPEC_FIELDS[instrumentType] || SPEC_FIELDS.altro;

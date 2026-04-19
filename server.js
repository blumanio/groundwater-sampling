require('dotenv').config(); // Loads .env file for local development

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { put } = require('@vercel/blob');

const app = express();
const PORT = process.env.PORT || 5000;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true })); // Standard middleware

// --- Multer Configuration for In-Memory Storage ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB database connection established successfully'))
    .catch(err => console.error('MongoDB connection error:', err));


// ============================================================================
// 1. SCHEMAS
// ============================================================================
const ScheduleDataSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    csvContent: { type: String, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
});

// models/User.js
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'magazziniere', 'tecnico'], default: 'tecnico' },
});

const settingSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true }
});

const commessaSchema = new mongoose.Schema({
    CodiceProgettoSAP: { type: String, required: true },
    Descrizione: { type: String, required: true },
}, { collection: 'commesse' }); // ← forza il nome esatto



const receiptSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    amount: { type: Number, required: true },
    text: { type: String },
    imageData: { type: String, required: true }, // Vercel Blob URL
    commessa: { type: commessaSchema },
    peoplePaidFor: { type: [String], default: [] }
});

const SiteSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    client: String,
    address: String,
    coordinates: { type: [Number], required: true }
});

const WasteLogSchema = new mongoose.Schema({
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
    dateGenerated: { type: Date, default: Date.now },
    wasteType: { type: String, enum: ['Contaminated Water', 'Contaminated Soil', 'Used Absorbents', 'Drilling Cuttings', 'Other'], required: true },
    description: { type: String, required: true },
    eerCode: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, enum: ['Liters', 'kg', 'Drums', 'm³'], required: true },
    storageLocation: { type: String },
    imageUrl: { type: String }, // Vercel Blob URL
    status: { type: String, enum: ['Stored On-Site', 'Awaiting Disposal', 'Transported Off-Site', 'Disposed'], default: 'Stored On-Site' },
});

const PiezometerSchema = new mongoose.Schema({
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true, index: true },
    name: { type: String, required: true },
    coordinates: { type: [Number], required: true },
    depth: Number
});

const SamplingEventSchema = new mongoose.Schema({
    piezometerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Piezometer', required: true, index: true },
    date: { type: Date, required: true, default: Date.now },
    measurements: {
        depthToWater: Number, ph: Number, conductivity: Number, temperature: Number,
        redoxPotential: Number, dissolvedOxygen: Number,
    },
    notes: String
});

// Aggiungi questi campi allo schema Equipment esistente:
const EquipmentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, enum: ['Pompa', 'Generatore', 'Campionatore', 'Multiparametro', 'GPS', 'Altro'], default: 'Altro' },
    serialNumber: { type: String },
    notes: { type: String },
    // ❌ vecchio enum — cambia 'disponibile' con 'in magazzino'
    status: {
        type: String,
        enum: ['in magazzino', 'in uso', 'manutenzione', 'fuori servizio'],
        default: 'in magazzino'
    },
    // ✅ NUOVI
    assignedTo: { type: String, default: null },
    assignedAt: { type: Date, default: null },
    assignedSite: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
});


const EventLogSchema = new mongoose.Schema({
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
    equipmentName: { type: String, required: true },
    eventType: { type: String, enum: ['prelievo', 'riconsegna', 'modifica', 'manutenzione'], required: true },
    createdBy: { type: String },
    site: { type: String },
    notes: { type: String },
    condition: { type: String },
}, { timestamps: true });


const EquipmentBookingSchema = new mongoose.Schema({
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
    technicianName: { type: String, required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    site: { type: String, required: true },
    notes: { type: String },
    createdBy: { type: String },
    createdAt: { type: Date, default: Date.now },
});
EquipmentBookingSchema.index({ equipmentId: 1, date: 1 });

// ============================================================================
// 2. MODELS (Serverless-Safe)
// ============================================================================
// This pattern checks if a model exists before compiling it, preventing errors in serverless environments.
const ScheduleData = mongoose.models.ScheduleData || mongoose.model('ScheduleData', ScheduleDataSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);
const Commessa = mongoose.models.Commessa || mongoose.model('Commessa', commessaSchema);
const Receipt = mongoose.models.Receipt || mongoose.model('Receipt', receiptSchema);
const WasteLog = mongoose.models.WasteLog || mongoose.model('WasteLog', WasteLogSchema);
const Site = mongoose.models.Site || mongoose.model('Site', SiteSchema);
const Piezometer = mongoose.models.Piezometer || mongoose.model('Piezometer', PiezometerSchema);
const SamplingEvent = mongoose.models.SamplingEvent || mongoose.model('SamplingEvent', SamplingEventSchema);
const Equipment = mongoose.models.Equipment || mongoose.model('Equipment', EquipmentSchema);
const EquipmentBooking = mongoose.models.EquipmentBooking || mongoose.model('EquipmentBooking', EquipmentBookingSchema);
const EventLog = mongoose.models.EventLog || mongoose.model('EventLog', EventLogSchema);


// ============================================================================
// 3. API ROUTES
// ============================================================================

// --- Auth Routes ---
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

        const approvedUser = await User.findOne({ email: email.toLowerCase() });
        if (!approvedUser) return res.status(401).json({ message: "Email address not authorized." });

        const masterPasswordSetting = await Setting.findOne({ key: 'masterPassword' });
        if (!masterPasswordSetting) return res.status(500).json({ message: "System error: Master password not set." });

        const isMatch = await bcrypt.compare(password, masterPasswordSetting.value);
        if (!isMatch) return res.status(401).json({ message: "Incorrect password." });

        const token = jwt.sign(
            {
                id: approvedUser._id,
                email: approvedUser.email,
                fullName: approvedUser.fullName,
                role: approvedUser.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }

        );
        res.json({ message: "Login successful!", token });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// --- Receipt Routes ---
app.get('/api/receipts', async (req, res) => {
    try {
        const receipts = await Receipt.find({}).sort({ date: -1 });
        res.json(receipts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching receipts', error: error.message });
    }
});

app.post('/api/receipts', upload.single('receiptImage'), async (req, res) => {
    console.log("Received receipt data:", req.body);
    console.log("Received file:", req.file);

    if (!req.file) return res.status(400).json({ message: 'Receipt image is required.' });

    const filename = `receipts/${Date.now()}-${req.file.originalname}`;
    try {
        const blob = await put(filename, req.file.buffer, { access: 'public' });

        // Parse JSON strings back to objects - with error handling
        let commessa;
        let peoplePaidFor = [];

        try {
            commessa = typeof req.body.commessa === 'string'
                ? JSON.parse(req.body.commessa)
                : req.body.commessa;
        } catch (e) {
            return res.status(400).json({ message: 'Invalid commessa data' });
        }

        if (req.body.peoplePaidFor) {
            try {
                peoplePaidFor = typeof req.body.peoplePaidFor === 'string'
                    ? JSON.parse(req.body.peoplePaidFor)
                    : req.body.peoplePaidFor;
            } catch (e) {
                console.warn('Could not parse peoplePaidFor, using empty array');
            }
        }

        const newReceiptData = {
            date: req.body.date,
            amount: parseFloat(req.body.amount),
            text: req.body.text || '',
            imageData: blob.url,
            commessa: commessa,
            peoplePaidFor: peoplePaidFor
        };

        console.log("Creating receipt with data:", newReceiptData);

        const receipt = new Receipt(newReceiptData);
        await receipt.save();
        res.status(201).json(receipt);
    } catch (error) {
        console.error("Error creating receipt:", error);
        res.status(500).json({ message: 'Server error while saving receipt.', error: error.message });
    }
});

app.delete('/api/receipts/:id', async (req, res) => {
    try {
        await Receipt.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Receipt deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting receipt', error: error.message });
    }
});

// --- Commesse Routes ---
app.get('/api/commesse', async (req, res) => {
    try {
        const commesse = await Commessa.find({});
        res.json(commesse);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching commesse', error: error.message });
    }
});

// --- Schedule Routes ---
app.get('/api/schedule/all', async (req, res) => {
    try {
        const schedules = await ScheduleData.find({}).sort({ uploadedAt: -1 });
        if (!schedules || schedules.length === 0) return res.status(404).json({ message: 'No schedules uploaded yet.' });
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching schedules.', error: error.message });
    }
});

app.post('/api/schedule/upload', upload.single('scheduleFile'), async (req, res) => {
    if (!req.file || !req.body.year || !req.body.month) {
        return res.status(400).json({ message: 'File, year, and month are required.' });
    }
    try {
        const filter = { year: parseInt(req.body.year), month: parseInt(req.body.month) };
        const update = {
            fileName: req.file.originalname,
            csvContent: req.file.buffer.toString('utf-8'),
            uploadedAt: new Date()
        };
        const updatedSchedule = await ScheduleData.findOneAndUpdate(filter, update, { new: true, upsert: true });
        res.status(200).json({ message: 'Schedule updated successfully.', schedule: updatedSchedule });
    } catch (error) {
        res.status(500).json({ message: 'Error saving schedule.', error: error.message });
    }
});
// ═══════════════════════════════════════════════════════════════════
// 1. ADD THIS ROUTE TO server.js
// ═══════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════
// rdl_generator_node.js  — metti nella root del server (stesso livello di server.js)
// SOSTITUISCE rdl_generator.py — funziona su Vercel/serverless, niente Python
//
// INSTALL:  npm install exceljs
// ═══════════════════════════════════════════════════════════════════════════

// ── In server.js: sostituisci il blocco const { exec } = require('child_process')
// ── e app.post('/api/rdl/genera', ...) con queste righe:

const { generateRdl } = require('./rdl_generator_node');

app.post('/api/rdl/genera', async (req, res) => {
    try {
        const data      = req.body;
        const assetsDir = path.join(__dirname, 'assets', 'rdl');

        const buffer   = await generateRdl(data, assetsDir);
        const filename = `RDL_${data.commessa || 'export'}_${(data.data_str || '').replace(/\./g,'')}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.send(buffer);

    } catch (error) {
        console.error('RDL generation error:', error);
        res.status(500).json({ message: error.message });
    }
});
// --- Geology & Site Routes ---
app.get('/api/sites/summary', async (req, res) => {
    try {
        const sites = await Site.aggregate([
            { $lookup: { from: 'piezometers', localField: '_id', foreignField: 'siteId', as: 'piezometers' } },
            { $unwind: { path: '$piezometers', preserveNullAndEmptyArrays: true } },
            { $lookup: { from: 'samplingevents', localField: 'piezometers._id', foreignField: 'piezometerId', as: 'events' } },
            { $addFields: { hasSampled: { $gt: [{ $size: '$events' }, 0] } } },
            {
                $group: {
                    _id: '$_id',
                    name: { $first: '$name' },
                    client: { $first: '$client' },
                    address: { $first: '$address' },
                    coordinates: { $first: '$coordinates' },
                    totalPZs: { $sum: { $cond: ['$piezometers', 1, 0] } },
                    completedPZs: { $sum: { $cond: ['$hasSampled', 1, 0] } }
                }
            }
        ]);
        res.json(sites);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching site summary', error: error.message });
    }
});

app.get('/api/sites', async (req, res) => {
    try {
        const sites = await Site.find({});
        res.json(sites);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sites', error: error.message });
    }
});

app.post('/api/sites', async (req, res) => {
    try {
        const site = await new Site(req.body).save();
        res.status(201).json(site);
    } catch (error) {
        res.status(400).json({ message: 'Error creating site', error: error.message });
    }
});

app.get('/api/sites/:siteId/piezometers', async (req, res) => {
    try {
        const piezometers = await Piezometer.find({ siteId: req.params.siteId });
        res.json(piezometers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching piezometers', error: error.message });
    }
});

app.post('/api/sites/:siteId/piezometers', async (req, res) => {
    try {
        const piezometer = new Piezometer({ ...req.body, siteId: req.params.siteId });
        const savedPiezometer = await piezometer.save();
        res.status(201).json(savedPiezometer);
    } catch (error) {
        res.status(400).json({ message: 'Error creating piezometer', error: error.message });
    }
});

app.get('/api/piezometers/:piezometerId/sampling-events', async (req, res) => {
    try {
        const events = await SamplingEvent.find({ piezometerId: req.params.piezometerId }).sort({ date: -1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sampling events', error: error.message });
    }
});

app.post('/api/piezometers/:piezometerId/sampling-events', async (req, res) => {
    try {
        const event = new SamplingEvent({ ...req.body, piezometerId: req.params.piezometerId });
        const savedEvent = await event.save();
        res.status(201).json(savedEvent);
    } catch (error) {
        res.status(400).json({ message: 'Error creating sampling event', error: error.message });
    }
});

// --- Waste Management Routes ---
app.get('/api/sites/:siteId/waste-logs', async (req, res) => {
    try {
        const logs = await WasteLog.find({ siteId: req.params.siteId }).sort({ dateGenerated: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching waste logs', error: err.message });
    }
});

app.post('/api/sites/:siteId/waste-logs', upload.single('wasteImage'), async (req, res) => {
    try {
        let imageUrl = null;
        if (req.file) {
            const filename = `waste-logs/${Date.now()}-${req.file.originalname}`;
            const blob = await put(filename, req.file.buffer, { access: 'public' });
            imageUrl = blob.url;
        }
        const newLog = new WasteLog({ ...req.body, siteId: req.params.siteId, imageUrl: imageUrl });
        await newLog.save();
        res.status(201).json(newLog);
    } catch (err) {
        res.status(400).json({ message: 'Error creating waste log', error: err.message });
    }
});



// --- Equipment Routes ---
// NOTE: /bookings routes must be registered before /:id to avoid Express matching "bookings" as an id.

app.get('/api/equipment', async (req, res) => {
    try {
        const items = await Equipment.find({}).sort({ name: 1 });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching equipment', error: error.message });
    }
});

app.post('/api/equipment', async (req, res) => {
    try {
        const item = new Equipment(req.body);
        await item.save();
        res.status(201).json(item);
    } catch (error) {
        res.status(400).json({ message: 'Error creating equipment', error: error.message });
    }
});

app.get('/api/equipment/bookings', async (req, res) => {
    try {
        const { date, from, to, technicianName } = req.query;
        const query = {};
        if (date) {
            query.date = date;
        } else if (from && to) {
            query.date = { $gte: from, $lte: to };
        }
        if (technicianName) query.technicianName = technicianName;
        const bookings = await EquipmentBooking.find(query).populate('equipmentId').sort({ date: 1 });
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching bookings', error: error.message });
    }
});

app.post('/api/equipment/bookings', async (req, res) => {
    try {
        const { equipmentId, date } = req.body;
        const existing = await EquipmentBooking.findOne({ equipmentId, date });
        if (existing) {
            return res.status(409).json({
                conflict: true,
                message: `Già prenotato da ${existing.technicianName} presso ${existing.site}`,
                booking: existing,
            });
        }
        const booking = new EquipmentBooking(req.body);
        await booking.save();
        res.status(201).json(booking);
    } catch (error) {
        res.status(400).json({ message: 'Error creating booking', error: error.message });
    }
});

app.delete('/api/equipment/bookings/:id', async (req, res) => {
    try {
        await EquipmentBooking.findByIdAndDelete(req.params.id);
        res.json({ message: 'Booking deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting booking', error: error.message });
    }
});

app.put('/api/equipment/:id', async (req, res) => {
    try {
        const item = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!item) return res.status(404).json({ message: 'Equipment not found' });
        res.json(item);
    } catch (error) {
        res.status(400).json({ message: 'Error updating equipment', error: error.message });
    }
});

app.delete('/api/equipment/:id', async (req, res) => {
    try {
        await Equipment.findByIdAndDelete(req.params.id);
        await EquipmentBooking.deleteMany({ equipmentId: req.params.id });
        res.json({ message: 'Equipment and related bookings deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting equipment', error: error.message });
    }
});
// ── GET /equipment/events ─────────────────────────────────────
app.get('/api/equipment/events', async (req, res) => {
    try {
        const { equipmentId, createdBy, from, to } = req.query;
        const filter = {};
        if (equipmentId) filter.equipmentId = equipmentId;
        if (createdBy) filter.createdBy = createdBy;
        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to) filter.createdAt.$lte = new Date(to);
        }
        const events = await EventLog.find(filter)
            .sort({ createdAt: -1 })
            .limit(200);
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── POST /equipment/:id/assign ────────────────────────────────
app.post('/api/equipment/:id/assign', async (req, res) => {
    try {
        const { assignedTo, assignedAt, site, notes, status, createdBy } = req.body;

        const equipment = await Equipment.findById(req.params.id);
        if (!equipment) return res.status(404).json({ message: 'Strumento non trovato' });

        if (equipment.status === 'in uso') {
            return res.status(409).json({
                message: `Già in uso da ${equipment.assignedTo} (${equipment.assignedSite || 'sito non specificato'})`
            });
        }

        equipment.status = 'in uso';
        equipment.assignedTo = assignedTo;
        equipment.assignedAt = assignedAt || new Date();
        equipment.assignedSite = site;
        await equipment.save();

        await EventLog.create({
            equipmentId: equipment._id,
            equipmentName: equipment.name,
            eventType: 'prelievo',
            createdBy,
            site,
            notes,
            condition: 'ok',
        });

        res.json(equipment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── POST /equipment/:id/return ────────────────────────────────
app.post('/api/equipment/:id/return', async (req, res) => {
    try {
        const { notes, condition, status, createdBy } = req.body;

        const equipment = await Equipment.findById(req.params.id);
        if (!equipment) return res.status(404).json({ message: 'Strumento non trovato' });

        await EventLog.create({
            equipmentId: equipment._id,
            equipmentName: equipment.name,
            eventType: 'riconsegna',
            createdBy: createdBy || equipment.assignedTo,
            site: equipment.assignedSite,
            notes,
            condition,
        });

        equipment.status = status || 'in magazzino';
        equipment.assignedTo = null;
        equipment.assignedAt = null;
        equipment.assignedSite = null;
        await equipment.save();

        res.json(equipment);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



// GET /api/users — list all users (all roles can see)
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ fullName: 1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST /api/users — add new user (admin only)
app.post('/api/users', async (req, res) => {
    try {
        const { email, fullName, role, phone, note } = req.body;
        if (!email) return res.status(400).json({ message: 'Email obbligatoria' });

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(409).json({ message: 'Email già registrata' });

        const user = new User({
            email: email.toLowerCase(),
            fullName: fullName || '',
            role: role || 'tecnico',
            phone: phone || '',
            note: note || '',
        });
        await user.save();
        res.status(201).json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/users/:id — update user (admin only)
app.put('/api/users/:id', async (req, res) => {
    try {
        const { fullName, role, phone, note } = req.body;
        // Note: email is NOT updatable
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { fullName, role, phone, note },
            { new: true }
        );
        if (!user) return res.status(404).json({ message: 'Utente non trovato' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/users/:id — delete user (admin only)
app.delete('/api/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Utente eliminato' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── COMMESSE ROUTES ──────────────────────────────────────────

// POST /api/commesse — add new commessa
app.post('/api/commesse', async (req, res) => {
    try {
        const { CodiceProgettoSAP, Descrizione } = req.body;
        if (!CodiceProgettoSAP || !Descrizione)
            return res.status(400).json({ message: 'Codice e Descrizione obbligatori' });

        const commessa = new Commessa({ CodiceProgettoSAP, Descrizione });
        await commessa.save();
        res.status(201).json(commessa);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /api/commesse/:id — update commessa
app.put('/api/commesse/:id', async (req, res) => {
    try {
        const { CodiceProgettoSAP, Descrizione } = req.body;
        const commessa = await Commessa.findByIdAndUpdate(
            req.params.id,
            { CodiceProgettoSAP, Descrizione },
            { new: true }
        );
        if (!commessa) return res.status(404).json({ message: 'Commessa non trovata' });
        res.json(commessa);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// DELETE /api/commesse/:id — delete commessa
app.delete('/api/commesse/:id', async (req, res) => {
    try {
        await Commessa.findByIdAndDelete(req.params.id);
        res.json({ message: 'Commessa eliminata' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
//------------------------------------------------------------------------------------------------
//--------------------------------------------------------------------------------------------------

// --- Production Build & Catch-all ---
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'client/build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
    });
}

// --- Server Start ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
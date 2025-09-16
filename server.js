const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- MongoDB Connection ---
mongoose.connect('mongodb+srv://medlique:HXRMVGMsPpdCjDSt@cluster0.4d0iacb.mongodb.net/acr');
const connection = mongoose.connection;
connection.once('open', () => {
  console.log('MongoDB database connection established successfully');
});

// --- Configure nodemailer (add your email service configuration) ---
const transporter = nodemailer.createTransporter({
    service: 'gmail', // or your email service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- SCHEMAS ---

// Authentication Schemas
const LoginCodeSchema = new mongoose.Schema({
    email: { type: String, required: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true }
});
const LoginCode = mongoose.model('LoginCode', LoginCodeSchema);

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    name: String,
    lastLogin: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

// Schedule Data Schema
const ScheduleDataSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    csvContent: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
});
const ScheduleData = mongoose.model('ScheduleData', ScheduleDataSchema);

// Commessa Schema
const commessaSchema = new mongoose.Schema({
  CodiceProgettoSAP: { type: String, required: true },
  Descrizione: { type: String, required: true },
});
const Commessa = mongoose.model('Commesse', commessaSchema);

// Receipt Schema
const receiptSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  text: { type: String },
  imageData: { type: String, required: true },
  commessa: { type: commessaSchema }
});
const Receipt = mongoose.model('Receipt', receiptSchema);

// Site Schema
const SiteSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    client: String,
    address: String,
    coordinates: { type: [Number], required: true }
});
const Site = mongoose.model('Site', SiteSchema);

// Piezometer Schema
const PiezometerSchema = new mongoose.Schema({
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
    name: { type: String, required: true },
    coordinates: { type: [Number], required: true },
    depth: Number
});
const Piezometer = mongoose.model('Piezometer', PiezometerSchema);

// Sampling Event Schema
const SamplingEventSchema = new mongoose.Schema({
    piezometerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Piezometer', required: true },
    date: { type: Date, required: true, default: Date.now },
    measurements: {
        depthToWater: Number,
        ph: Number,
        conductivity: Number,
        temperature: Number,
        redoxPotential: Number,
        dissolvedOxygen: Number,
    },
    notes: String
});
const SamplingEvent = mongoose.model('SamplingEvent', SamplingEventSchema);

// Waste Log Schema
const WasteLogSchema = new mongoose.Schema({
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
    dateGenerated: { type: Date, default: Date.now },
    wasteType: { 
        type: String, 
        enum: ['Contaminated Water', 'Contaminated Soil', 'Used Absorbents', 'Drilling Cuttings', 'Other'],
        required: true 
    },
    description: { type: String, required: true },
    eerCode: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, enum: ['Liters', 'kg', 'Drums', 'm³'], required: true },
    storageLocation: { type: String },
    imageUrl: { type: String },
    status: {
        type: String,
        enum: ['Stored On-Site', 'Awaiting Disposal', 'Transported Off-Site', 'Disposed'],
        default: 'Stored On-Site'
    },
});
const WasteLog = mongoose.model('WasteLog', WasteLogSchema);

// --- API ROUTES ---

// Health check
app.get('/api/health', (req, res) => {
    res.json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email } = req.body;
        const allowedDomain = 'yourcompany.com'; // IMPORTANT: Set your company's email domain

        if (!email || !email.endsWith('@' + allowedDomain)) {
            return res.status(400).json({ message: `Access denied. Please use a valid @${allowedDomain} email.` });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await LoginCode.findOneAndUpdate({ email }, { email, code, expiresAt }, { upsert: true });

        await transporter.sendMail({
            from: `"Your WebApp" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Verification Code',
            html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code will expire in 10 minutes.</p>`,
        });

        res.status(200).json({ message: 'Verification code sent to your email.' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error sending verification code.' });
    }
});

app.post('/api/auth/verify', async (req, res) => {
    try {
        const { email, code } = req.body;

        const loginAttempt = await LoginCode.findOne({ email, code, expiresAt: { $gt: new Date() } });

        if (!loginAttempt) {
            return res.status(400).json({ message: 'Invalid or expired verification code.' });
        }

        let user = await User.findOne({ email });
        if (!user) {
            user = new User({ email, name: email.split('@')[0] });
        }
        user.lastLogin = new Date();
        await user.save();

        await LoginCode.deleteOne({ _id: loginAttempt._id });

        const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({ token, user });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ message: 'Error during verification.' });
    }
});

// Receipt Routes
app.get('/api/receipts', async (req, res) => {
    try {
        const receipts = await Receipt.find({});
        res.json(receipts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching receipts', error: error.message });
    }
});

app.post('/api/receipts', async (req, res) => {
    try {
        const receipt = new Receipt(req.body);
        const savedReceipt = await receipt.save();
        res.status(201).json(savedReceipt);
    } catch (error) {
        res.status(400).json({ message: 'Error creating receipt', error: error.message });
    }
});

app.delete('/api/receipts/:id', async (req, res) => {
    try {
        const deletedReceipt = await Receipt.findByIdAndDelete(req.params.id);
        if (!deletedReceipt) {
            return res.status(404).json({ message: 'Receipt not found' });
        }
        res.json(deletedReceipt);
    } catch (error) {
        res.status(500).json({ message: 'Error deleting receipt', error: error.message });
    }
});

// Commesse Routes
app.get('/api/commesse', async (req, res) => {
    try {
        const commesse = await Commessa.find({});
        res.json(commesse);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching commesse', error: error.message });
    }
});

// Schedule Routes
app.get('/api/schedule/latest', async (req, res) => {
    try {
        const schedule = await ScheduleData.findOne().sort({ uploadedAt: -1 });
        if (!schedule) {
            return res.status(404).json({ message: 'No schedule has been uploaded yet.' });
        }
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching schedule.', error: error.message });
    }
});

app.post('/api/schedule/upload', upload.single('scheduleFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded.' });
        }

        await ScheduleData.deleteMany({});

        const newSchedule = new ScheduleData({
            fileName: req.file.originalname,
            csvContent: req.file.buffer.toString('utf-8'),
        });

        await newSchedule.save();

        res.status(201).json({ 
            message: 'Schedule updated successfully.',
            fileName: newSchedule.fileName,
            uploadedAt: newSchedule.uploadedAt 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error saving schedule.', error: error.message });
    }
});

// Site Routes
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
        const site = new Site(req.body);
        const savedSite = await site.save();
        res.status(201).json(savedSite);
    } catch (error) {
        res.status(400).json({ message: 'Error creating site', error: error.message });
    }
});

// Piezometer Routes
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

// Sampling Event Routes
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

// Waste Log Routes
app.get('/api/sites/:siteId/waste-logs', async (req, res) => {
    try {
        const logs = await WasteLog.find({ siteId: req.params.siteId }).sort({ dateGenerated: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching waste logs', error: error.message });
    }
});

app.post('/api/sites/:siteId/waste-logs', upload.single('wasteImage'), async (req, res) => {
    try {
        const { wasteType, description, eerCode, quantity, unit, storageLocation, status } = req.body;
        
        const newLog = new WasteLog({
            siteId: req.params.siteId,
            wasteType,
            description,
            eerCode,
            quantity,
            unit,
            storageLocation,
            status,
            imageUrl: req.file ? `/uploads/${req.file.filename}` : null
        });

        const savedLog = await newLog.save();
        res.status(201).json(savedLog);
    } catch (error) {
        res.status(400).json({ message: 'Error creating waste log', error: error.message });
    }
});

// Serve static files from React build (only in production)
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'client/build')));
    
    // Handle React routing - this should be LAST
    app.get('*', (req, res) => {
        // Don't serve index.html for API routes
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ message: 'API route not found' });
        }
        res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
    });
}

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ message: 'API endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
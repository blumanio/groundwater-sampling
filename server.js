const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path'); // ADDED THIS
const app = express();
const PORT = process.env.PORT || 5000;

// Configure multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- Serve static files in production ---
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// --- MongoDB Connection ---
mongoose.connect('mongodb+srv://medlique:HXRMVGMsPpdCjDSt@cluster0.4d0iacb.mongodb.net/acr');
const connection = mongoose.connection;
connection.once('open', () => {
  console.log('MongoDB database connection established successfully');
});

// --- NEW: Schema to store the raw schedule data ---
const ScheduleDataSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    csvContent: { type: String, required: true }, // The raw text content of the CSV
    uploadedAt: { type: Date, default: Date.now },
});
const ScheduleData = mongoose.model('ScheduleData', ScheduleDataSchema);

// --- ========== PREVIOUS SCHEMAS (Receipts & Commesse) ========== ---
const commessaSchema = new mongoose.Schema({
  CodiceProgettoSAP: { type: String, required: true },
  Descrizione: { type: String, required: true },
});
const Commessa = mongoose.model('Commesse', commessaSchema);

const receiptSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  text: { type: String },
  imageData: { type: String, required: true },
  commessa: { type: commessaSchema }
});
const Receipt = mongoose.model('Receipt', receiptSchema);

// --- NEW: Waste Log Schema ---
const WasteLogSchema = new mongoose.Schema({
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
    dateGenerated: { type: Date, default: Date.now },
    wasteType: { 
        type: String, 
        enum: ['Contaminated Water', 'Contaminated Soil', 'Used Absorbents', 'Drilling Cuttings', 'Other'],
        required: true 
    },
    description: { type: String, required: true },
    eerCode: { type: String, required: true }, // European Waste Catalogue (Codice CER)
    quantity: { type: Number, required: true },
    unit: { type: String, enum: ['Liters', 'kg', 'Drums', 'm³'], required: true },
    storageLocation: { type: String }, // On-site storage description
    imageUrl: { type: String }, // Path to the uploaded photo
    status: {
        type: String,
        enum: ['Stored On-Site', 'Awaiting Disposal', 'Transported Off-Site', 'Disposed'],
        default: 'Stored On-Site'
    },
});
const WasteLog = mongoose.model('WasteLog', WasteLogSchema);

// --- ========== NEW GEOLOGY SCHEMAS ========== ---

// 1. Site Schema: A single project location.
const SiteSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    client: String,
    address: String,
    coordinates: { type: [Number], required: true } // [latitude, longitude]
});
const Site = mongoose.model('Site', SiteSchema);

// 2. Piezometer Schema: A well, linked to a Site.
const PiezometerSchema = new mongoose.Schema({
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
    name: { type: String, required: true }, // e.g., "PZ-1"
    coordinates: { type: [Number], required: true },
    depth: Number
});
const Piezometer = mongoose.model('Piezometer', PiezometerSchema);

// 3. SamplingEvent Schema: A record of one sampling event.
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

// --- ========== API ROUTES ========== ---

// --- Previous Routes (Receipts & Commesse) ---
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
        const receipt = await new Receipt(req.body).save();
        res.status(201).json(receipt);
    } catch (error) {
        res.status(400).json({ message: 'Error creating receipt', error: error.message });
    }
});

app.delete('/api/receipts/:id', async (req, res) => {
    try {
        const receipt = await Receipt.findByIdAndDelete(req.params.id);
        res.json(receipt);
    } catch (error) {
        res.status(500).json({ message: 'Error deleting receipt', error: error.message });
    }
});

app.get('/api/commesse', async (req, res) => {
    try {
        const commesse = await Commessa.find({});
        res.json(commesse);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching commesse', error: error.message });
    }
});

// --- NEW Geology API Routes ---

// Sites
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

// Piezometers (scoped to a site)
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

// Sampling Events (scoped to a piezometer)
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

// --- NEW: Authentication API Routes ---

// Step 1: Request a login code
app.post('/api/auth/login', async (req, res) => {
    const { email } = req.body;
    const allowedDomain = 'yourcompany.com'; // IMPORTANT: Set your company's email domain

    if (!email || !email.endsWith('@' + allowedDomain)) {
        return res.status(400).json({ message: `Access denied. Please use a valid @${allowedDomain} email.` });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit code
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    try {
        // Note: You need to define LoginCode schema and transporter for email
        // await LoginCode.findOneAndUpdate({ email }, { email, code, expiresAt }, { upsert: true });

        // await transporter.sendMail({
        //     from: `"Your WebApp" <${process.env.EMAIL_USER}>`,
        //     to: email,
        //     subject: 'Your Verification Code',
        //     html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code will expire in 10 minutes.</p>`,
        // });

        res.status(200).json({ message: 'Verification code sent to your email.' });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error sending verification code.' });
    }
});

// Step 2: Verify the code and get a token
app.post('/api/auth/verify', async (req, res) => {
    const { email, code } = req.body;

    try {
        // Note: You need to define LoginCode and User schemas, and JWT_SECRET
        // const loginAttempt = await LoginCode.findOne({ email, code, expiresAt: { $gt: new Date() } });

        // if (!loginAttempt) {
        //     return res.status(400).json({ message: 'Invalid or expired verification code.' });
        // }

        // Code is valid, find or create the user
        // let user = await User.findOne({ email });
        // if (!user) {
        //     user = new User({ email, name: email.split('@')[0] });
        // }
        // user.lastLogin = new Date();
        // await user.save();

        // Delete the used code
        // await LoginCode.deleteOne({ _id: loginAttempt._id });

        // Generate a long-lived token
        // const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // res.status(200).json({ token, user });
        res.status(200).json({ message: 'Auth verification endpoint - needs implementation' });

    } catch (error) {
        res.status(500).json({ message: 'Error during verification.' });
    }
});

// Schedule API Routes
app.get('/api/schedule/latest', async (req, res) => {
    try {
        // Find the most recently uploaded document. Since we only keep one, this will be it.
        const schedule = await ScheduleData.findOne().sort({ uploadedAt: -1 });
        if (!schedule) {
            return res.status(404).json({ message: 'No schedule has been uploaded yet.' });
        }
        res.json(schedule);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching schedule.' });
    }
});

// POST (upload) a new schedule. This will replace the old one.
// The 'scheduleFile' string must match the name attribute in the form's file input.
app.post('/api/schedule/upload', upload.single('scheduleFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {
        // Step 1: Delete all existing schedules to ensure only one remains.
        await ScheduleData.deleteMany({});

        // Step 2: Create a new schedule document with the uploaded file's content.
        const newSchedule = new ScheduleData({
            fileName: req.file.originalname,
            csvContent: req.file.buffer.toString('utf-8'),
        });

        // Step 3: Save the new schedule to the database.
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

// Waste Management API Routes

// GET all waste logs for a specific site
app.get('/api/sites/:siteId/waste-logs', async (req, res) => {
    try {
        const logs = await WasteLog.find({ siteId: req.params.siteId }).sort({ dateGenerated: -1 });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching waste logs', error: err.message });
    }
});

// POST a new waste log with an optional image
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
            imageUrl: req.file ? `/uploads/${req.file.filename}` : null // Save the accessible URL path
        });

        await newLog.save();
        res.status(201).json(newLog);
    } catch (err) {
        res.status(400).json({ message: 'Error creating waste log', error: err.message });
    }
});

// --- Catch-all handler: send back React's index.html file in production ---
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// --- Server Start ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
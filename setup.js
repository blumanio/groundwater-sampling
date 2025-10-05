// setup.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// --- CONFIGURE THIS SECTION ---
const MONGO_URI = 'mongodb+srv://medlique:HXRMVGMsPpdCjDSt@cluster0.4d0iacb.mongodb.net/acr'; // Your MongoDB connection string
const MASTER_PASSWORD = 'AcrReggiani07'; // The password everyone will use
const APPROVED_EMAILS =
    [
        'Dante.Brogioli@acrreggiani.it',
        'Rocco.Langone@acrreggiani.it',
        'Alberto.Bellutti@acrreggiani.it',
        'Michele.Zara@acrreggiani.it',
        'Livia.Occhigrossi@acrreggiani.it',
        'Andrea.Sguazzini@acrreggiani.it',
        'Yuri.Bagetta@acrreggiani.it',
        'Filippo.Dolci@acrreggiani.it',
        'Davide.Fusetti@acrreggiani.it',
        'Roberto.Viero@acrreggiani.it',
        'Daniele.Ponsetti@acrreggiani.it',
        'Enrico.Lumachi@acrreggiani.it',
        'stefano.bullo@acrreggiani.it',
        'luca.camorali@acrreggiani.it',
        'giovanni.muzio@acrreggiani.it',
        'davide.sisti@acrreggiani.it',
        'Marco.Tombini@acrreggiani.it',
        'enrico.barontini@acrreggiani.it',
        'angelo.narciso@acrreggiani.it',
        'roman.bettini@acrreggiani.it',
        'fabio.mizzon@acrreggiani.it',
        'gianluca.carli@acrreggiani.it',
        'mattia.poletti@acrreggiani.it',
        'nicola.gatto@acrreggiani.it',
        'paolo.polico@acrreggiani.it',
        'alessandro.mazzara@acrreggiani.it',
        'mohamed.elaammari@acrreggiani.it',
        'andrea.difelice@acrreggiani.it'

    ];
// -----------------------------

const userSchema = new mongoose.Schema({ email: { type: String, required: true, unique: true, lowercase: true } });
const User = mongoose.model('User', userSchema);

const settingSchema = new mongoose.Schema({ key: { type: String, required: true, unique: true }, value: { type: String, required: true } });
const Setting = mongoose.model('Setting', settingSchema);

const setup = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected...');

        // Add users
        console.log('Adding approved emails...');
        await User.deleteMany({}); // Clear existing users
        const userDocs = APPROVED_EMAILS.map(email => ({ email }));
        await User.insertMany(userDocs);
        console.log(`${APPROVED_EMAILS.length} users added.`);

        // Hash and store the master password
        console.log('Setting master password...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(MASTER_PASSWORD, salt);

        await Setting.updateOne(
            { key: 'masterPassword' },
            { value: hashedPassword },
            { upsert: true } // Creates it if it doesn't exist, updates it if it does
        );
        console.log('Master password has been securely set.');

    } catch (err) {
        console.error(err.message);
    } finally {
        await mongoose.connection.close();
        console.log('Connection closed.');
    }
};

setup();
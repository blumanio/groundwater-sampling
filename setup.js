// setup.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGO_URI = 'mongodb+srv://medlique:HXRMVGMsPpdCjDSt@cluster0.4d0iacb.mongodb.net/acr';
const MASTER_PASSWORD = 'ACR2026ACR';

const APPROVED_USERS = [
    { email: 'dante.brogioli@acrreggiani.it',       fullName: 'Dante Brogioli',       role: 'admin' },
    { email: 'rocco.langone@acrreggiani.it',         fullName: 'Rocco Langone',         role: 'tecnico' },
    { email: 'alberto.bellutti@acrreggiani.it',      fullName: 'Alberto Bellutti',      role: 'tecnico' },
    { email: 'michele.zara@acrreggiani.it',          fullName: 'Michele Zara',          role: 'tecnico' },
    { email: 'livia.occhigrossi@acrreggiani.it',     fullName: 'Livia Occhigrossi',     role: 'tecnico' },
    { email: 'andrea.sguazzini@acrreggiani.it',      fullName: 'Andrea Sguazzini',      role: 'tecnico' },
    { email: 'yuri.bagetta@acrreggiani.it',          fullName: 'Yuri Bagetta',          role: 'tecnico' },
    { email: 'filippo.dolci@acrreggiani.it',         fullName: 'Filippo Dolci',         role: 'tecnico' },
    { email: 'davide.fusetti@acrreggiani.it',        fullName: 'Davide Fusetti',        role: 'tecnico' },
    { email: 'roberto.viero@acrreggiani.it',         fullName: 'Roberto Viero',         role: 'tecnico' },
    { email: 'daniele.ponsetti@acrreggiani.it',      fullName: 'Daniele Ponsetti',      role: 'tecnico' },
    { email: 'enrico.lumachi@acrreggiani.it',        fullName: 'Enrico Lumachi',        role: 'tecnico' },
    { email: 'stefano.bullo@acrreggiani.it',         fullName: 'Stefano Bullo',         role: 'tecnico' },
    { email: 'luca.camorali@acrreggiani.it',         fullName: 'Luca Camorali',         role: 'tecnico' },
    { email: 'giovanni.muzio@acrreggiani.it',        fullName: 'Giovanni Muzio',        role: 'tecnico' },
    { email: 'davide.sisti@acrreggiani.it',          fullName: 'Davide Sisti',          role: 'tecnico' },
    { email: 'marco.tombini@acrreggiani.it',         fullName: 'Marco Tombini',         role: 'tecnico' },
    { email: 'enrico.barontini@acrreggiani.it',      fullName: 'Enrico Barontini',      role: 'tecnico' },
    { email: 'angelo.narciso@acrreggiani.it',        fullName: 'Angelo Narciso',        role: 'tecnico' },
    { email: 'roman.bettini@acrreggiani.it',         fullName: 'Roman Bettini',         role: 'tecnico' },
    { email: 'fabio.mizzon@acrreggiani.it',          fullName: 'Fabio Mizzon',          role: 'tecnico' },
    { email: 'gianluca.carli@acrreggiani.it',        fullName: 'Gianluca Carli',        role: 'tecnico' },
    { email: 'mattia.poletti@acrreggiani.it',        fullName: 'Mattia Poletti',        role: 'tecnico' },
    { email: 'nicola.gatto@acrreggiani.it',          fullName: 'Nicola Gatto',          role: 'tecnico' },
    { email: 'paolo.polico@acrreggiani.it',          fullName: 'Paolo Polico',          role: 'tecnico' },
    { email: 'alessandro.mazzara@acrreggiani.it',    fullName: 'Alessandro Mazzara',    role: 'tecnico' },
    { email: 'mohamed.elaammari@acrreggiani.it',     fullName: 'Mohamed El Aammari',    role: 'magazziniere' },
];

const setup = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✓ MongoDB connected');

        // Use native driver directly — bypasses Mongoose schema cache completely
        const db = mongoose.connection.db;

        // Drop entire users collection so old documents + schema are gone
        const existing = await db.listCollections({ name: 'users' }).toArray();
        if (existing.length > 0) {
            await db.collection('users').drop();
            console.log('✓ Old users collection dropped');
        } else {
            console.log('  (no existing users collection, creating fresh)');
        }

        // Insert all users with fullName + role via native driver
        const userDocs = APPROVED_USERS.map(u => ({
            email:    u.email.toLowerCase(),
            fullName: u.fullName,
            role:     u.role,
            createdAt: new Date(),
        }));

        await db.collection('users').insertMany(userDocs);
        console.log(`✓ ${userDocs.length} users inserted`);

        // Recreate unique index on email
        await db.collection('users').createIndex({ email: 1 }, { unique: true });
        console.log('✓ Index on email recreated');

        // Set master password via native driver too
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(MASTER_PASSWORD, salt);
        await db.collection('settings').updateOne(
            { key: 'masterPassword' },
            { $set: { key: 'masterPassword', value: hashedPassword } },
            { upsert: true }
        );
        console.log('✓ Master password set');

        // Verify one document directly
        const check = await db.collection('users').findOne(
            { email: 'mohamed.elaammari@acrreggiani.it' }
        );
        console.log('\n--- Verification ---');
        console.log('Mohamed doc in DB:', check);

        // Print full list
        console.log('\n--- All Users ---');
        for (const u of userDocs) {
            console.log(`  [${u.role.padEnd(12)}] ${u.fullName}`);
        }

    } catch (err) {
        console.error('✗ Setup error:', err);
    } finally {
        await mongoose.connection.close();
        console.log('\n✓ Done. Connection closed.');
    }
};

setup();
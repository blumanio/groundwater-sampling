// [USER DATA]
export const USER_DATA = [
    { email: 'Dante.Brogioli@acrreggiani.it', fullName: 'Dante Brogioli', phone: '3385411931', city: 'ARESE' },
    { email: 'Rocco.Langone@acrreggiani.it', fullName: 'Rocco Langone', phone: '3459981162', city: 'MONZA E BRIANZA' },
    { email: 'Alberto.Bellutti@acrreggiani.it', fullName: 'Alberto Bellutti', phone: '346/7834018', city: 'MANTOVA' },
    { email: 'Michele.Zara@acrreggiani.it', fullName: 'Michele Zara', phone: '3495934249', city: 'VENEZIA' },
    { email: 'Livia.Occhigrossi@acrreggiani.it', fullName: 'Livia Occhiogrossi', phone: '3440257161', city: 'MILANO' },
    { email: 'Andrea.Sguazzini@acrreggiani.it', fullName: 'Andrea Sguazzini', phone: '3394351944', city: 'NOVARA' },
    { email: 'Yuri.Bagetta@acrreggiani.it', fullName: 'Yuri Bagetta', phone: '3397141446', city: 'TORINO' },
    { email: 'Filippo.Dolci@acrreggiani.it', fullName: 'Filippo Dolci', phone: '3386786653', city: 'PAVIA' },
    { email: 'Davide.Fusetti@acrreggiani.it', fullName: 'Davide Fusetti', phone: null, city: null },
    { email: 'Roberto.Viero@acrreggiani.it', fullName: 'Roberto Viero', phone: '3489898114', city: 'VARESE' },
    { email: 'Daniele.Ponsetti@acrreggiani.it', fullName: 'Daniele Ponsetti', phone: '348/8297910', city: 'TORINO' },
    { email: 'Enrico.Lumachi@acrreggiani.it', fullName: 'Enrico Lumachi', phone: '3429790463', city: 'MILANO' },
    { email: 'stefano.bullo@acrreggiani.it', fullName: 'Stefano Bullo', phone: '3440816017', city: 'VENEZIA' },
    { email: 'luca.camorali@acrreggiani.it', fullName: 'Luca Camorali', phone: '3332023662', city: 'PAVIA' },
    { email: 'giovanni.muzio@acrreggiani.it', fullName: 'Giovanni Muzio', phone: '347/4211320', city: 'GENOVA' },
    { email: 'davide.sisti@acrreggiani.it', fullName: 'Davide Sisti', phone: null, city: null },
    { email: 'Marco.Tombini@acrreggiani.it', fullName: 'Marco Tombini', phone: '3440365355', city: 'PADOVA' },
    { email: 'enrico.barontini@acrreggiani.it', fullName: 'Enrico Barontini', phone: '3339244012', city: 'MILANO-ANCONA' },
    { email: 'angelo.narciso@acrreggiani.it', fullName: 'Angelo Narciso', phone: '3347109203', city: 'PAVIA' },
    { email: 'roman.bettini@acrreggiani.it', fullName: 'Roman Bettini', phone: '3425337842', city: 'MODENA' },
    { email: 'fabio.mizzon@acrreggiani.it', fullName: 'Fabio Mizzon', phone: '3478382640', city: 'PAVIA' },
    { email: 'gianluca.carli@acrreggiani.it', fullName: 'Gianluca Carli', phone: '3456325804', city: 'FERRARA' },
    { email: 'mattia.poletti@acrreggiani.it', fullName: 'Mattia Poletti', phone: '340 4174867', city: 'IMOLA' },
    { email: 'nicola.gatto@acrreggiani.it', fullName: 'Nicola Gatto', phone: '3420333535', city: 'VENEZIA' },
    { email: 'paolo.polico@acrreggiani.it', fullName: 'Paolo Polico', phone: '3421582489', city: 'PAVIA' },
    { email: 'alessandro.mazzara@acrreggiani.it', fullName: 'Alessandro Mazzara', phone: '3889532005', city: 'PAVIA' },
    { email: 'mohamed.elaammari@acrreggiani.it', fullName: 'Mohamed El Aammari', phone: null, city: 'MONZA E BRIANZA' },
    { email: 'andrea.difelice@acrreggiani.it', fullName: 'Andrea di Felice', phone: null, city: 'TORINO' }
];

export const getLoggedInUser = () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) return null;
        const payload = JSON.parse(atob(token.split('.')[1]));
        return USER_DATA.find(u => u.email.toLowerCase() === payload.email.toLowerCase()) || null;
    } catch (e) {
        console.error("Failed to decode token:", e);
        return null;
    }
};
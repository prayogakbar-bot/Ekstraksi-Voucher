const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Variabel Webhook ID wajib ada
const WEBHOOK_ID = "WH-TIMVD-ONLINE-001"; 

exports.handleSupplierWebhook = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const db = admin.firestore();
    const payload = req.body;

    try {
        const refId = payload.ref_id || payload.order_id; 
        const status = payload.status; 
        const sn = payload.sn || "SN-PENDING";

        if (refId) {
            await db.collection('transaksi').doc(refId).update({
                status: status,
                sn: sn,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                processed_by: WEBHOOK_ID //
            });
        }
        return res.status(200).send('OK');
    } catch (error) {
        return res.status(500).send('Error');
    }
});
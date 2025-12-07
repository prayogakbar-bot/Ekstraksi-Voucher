import { 
    initializeApp 
} from "firebase/app";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    serverTimestamp, 
    collection, 
    query,      
    getDocs,    
    orderBy,    
    deleteDoc, 
    updateDoc  
} from "firebase/firestore";

// --- Konfigurasi Firebase ---
const FIREBASE_CONFIG = {
  apiKey: process.env.REACT_APP_FIREBASE_KEY, 
  authDomain: "vdvoucher.firebaseapp.com",
  projectId: "vdvoucher", 
  storageBucket: "vdvoucher.firebasestorage.app",
  messagingSenderId: "535315980318",
  appId: "1:535315980318:web:ac71d91380d51f1a7ace0f"
};

const DB_COLLECTION_NAME = 'extracted_vouchers'; 

// --- INISIALISASI FIREBASE ---
const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

/**
 * Helper function untuk memformat timestamp Firestore.
 */
export const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};


// --- FUNGSI CRUD FIREBASE ---

/**
 * Menyimpan hasil ekstraksi kode unik ke Firestore.
 */
export async function saveCodesToDatabase(codesList, files, filename, userId, showStatus) {
    if (codesList.uniqueList.length === 0) {
        showStatus("Tidak ada kode unik untuk disimpan.", 'info');
        return;
    }

    if (!userId) {
        showStatus("Gagal menyimpan: Pengguna tidak terautentikasi.", 'error');
        return;
    }

    const dataToSave = {
        userId: userId, 
        codes: codesList.uniqueList.map(item => item.code),
        count: codesList.uniqueList.length,
        sourceFiles: files.map(f => f.name), 
        filename: filename.trim() || `extracted_vouchers_${new Date().toISOString().slice(0, 10)}`, 
        timestamp: serverTimestamp(), 
    };

    try {
        const docRef = doc(db, DB_COLLECTION_NAME, `extraction-${Date.now()}`);
        await setDoc(docRef, dataToSave);
        showStatus(`✅ ${dataToSave.count} kode unik berhasil disimpan ke Firestore!`, 'success');
    } catch (error) {
        console.error("Error saving document to Firestore: ", error);
        showStatus(`Gagal menyimpan data ke Firestore. Pesan: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Mengambil semua riwayat ekstraksi dari Firestore.
 */
export async function fetchHistory(userId, showStatus) {
    if (!userId) {
         showStatus("Gagal memuat: Pengguna tidak terautentikasi.", 'error');
         return [];
    }

    try {
        const q = query(collection(db, DB_COLLECTION_NAME), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        const fetchedData = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const filename = data.filename || `extracted_vouchers_${formatDate(data.timestamp).replace(/, /g, '_').replace(/:/g, '-')}`;
            fetchedData.push({ id: doc.id, ...data, filename: filename });
        });
        
        return fetchedData;

    } catch (err) {
        console.error("Error fetching history: ", err);
        showStatus(`Gagal memuat riwayat: ${err.message}`, 'error');
        throw err;
    }
}

/**
 * Memperbarui nama file untuk item riwayat tertentu.
 */
export async function updateFilename(itemId, newFilename, showStatus) {
    try {
        const docRef = doc(db, DB_COLLECTION_NAME, itemId);
        await updateDoc(docRef, {
            filename: newFilename.trim()
        });
        return { success: true };
    } catch (err) {
        console.error("Error renaming document: ", err);
        showStatus(`Gagal memperbarui nama file: ${err.message}`, 'error');
        throw err;
    }
}

/**
 * Menghapus item riwayat ekstraksi.
 */
export async function deleteHistoryItem(itemId, filename, showStatus) {
    try {
        await deleteDoc(doc(db, DB_COLLECTION_NAME, itemId));
        return { success: true };
    } catch (err) {
        console.error("Error deleting document: ", err);
        showStatus(`Gagal menghapus riwayat: ${err.message}`, 'error');
        throw err;
    }
}
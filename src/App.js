import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI } from '@google/genai'; 

// --- IMPOR FIREBASE SEBENARNYA (DITAMBAH UNTUK HISTORY) ---
import { 
    initializeApp 
} from "firebase/app";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    serverTimestamp, 
    collection, // <-- Baru
    query,      // <-- Baru
    getDocs,    // <-- Baru
    orderBy     // <-- Baru
} from "firebase/firestore";
// ----------------------------------------------------

// --- KONFIGURASI PENTING ---
// 🔑 API Key Gemini Anda
const GEMINI_API_KEY = 'AIzaSyCLWcq4td2TQuOq-mlxcfjHSOo_tM3sE78'; 
// --------------------------

// --- Konfigurasi Firebase untuk Client SDK (Frontend) ---
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCqgdC3hX8bJ_Ef0aBo_rsW0TEZArmyvzQ", 
  authDomain: "vdvoucher.firebaseapp.com",
  projectId: "vdvoucher", 
  storageBucket: "vdvoucher.firebasestorage.app",
  messagingSenderId: "535315980318",
  appId: "1:535315980318:web:ac71d91380d51f1a7ace0f"
};
// -----------------------------------------------------

const TARGET_DIGITS_REQUIRED = 18;
const DB_COLLECTION_NAME = 'extracted_vouchers'; // Koleksi tempat data disimpan
const IMAGE_MAX_WIDTH = 1200;
const IMAGE_QUALITY = 0.8;
const appId = 'default-app-id'; 


// --- INISIALISASI FIREBASE (NYATA) ---
const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);
// -------------------------------------


// --- UTILITY UNTUK RESIZE GAMBAR & KONVERSI BASE64 (TIDAK BERUBAH) ---
const resizeImageAndConvertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                let width = img.width;
                let height = img.height;

                if (width > IMAGE_MAX_WIDTH) {
                    height = height * (IMAGE_MAX_WIDTH / width);
                    width = IMAGE_MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const dataURL = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
                const base64String = dataURL.split(',')[1];
                const mimeType = 'image/jpeg';

                resolve({ base64: base64String, dataURL: dataURL, name: file.name, mimeType });
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


// --- FUNGSI INTEGRASI GEMINI API (TIDAK BERUBAH) ---
const ai = new GoogleGenAI({ 
    apiKey: GEMINI_API_KEY, 
});

function fileToGenerativePart(base64Image, mimeType) {
    return {
        inlineData: {
            data: base64Image,
            mimeType,
        },
    };
}

async function callGeminiApi(base64Image, prompt, fileName) {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
        throw new Error("Kunci API Gemini belum diatur atau tidak valid.");
    }
    
    const model = 'gemini-2.5-flash'; 

    try {
        const imagePart = fileToGenerativePart(base64Image, 'image/jpeg'); 
        const response = await ai.models.generateContent({
            model: model,
            contents: [
                imagePart,
                { text: prompt },
            ],
        });
        
        if (!response.text) {
             throw new Error("Gemini tidak menghasilkan teks balasan.");
        }
        
        return response.text;

    } catch (error) {
        console.error(`Error memanggil Gemini untuk ${fileName}:`, error);
        throw new Error(`Gagal memanggil Gemini API untuk ${fileName}. Pesan: ${error.message || 'Error tidak diketahui'}.`);
    }
}
// ---------------------------------------------------

// =======================================================================
// === KOMPONEN HISTORY PAGE (TIDAK BERUBAH) ===
// =======================================================================

function HistoryPage({ userId, showStatus, handleNavigate }) {
    const [historyList, setHistoryList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchHistory = useCallback(async () => {
        if (!userId) {
             showStatus("Gagal memuat: Pengguna tidak terautentikasi.", 'error');
             setIsLoading(false);
             return;
        }

        setIsLoading(true);
        setError(null);
        try {
            // Mengambil data dari Firestore dan mengurutkannya berdasarkan timestamp terbaru
            const q = query(collection(db, DB_COLLECTION_NAME), orderBy("timestamp", "desc"));
            const querySnapshot = await getDocs(q);
            
            const fetchedData = [];
            querySnapshot.forEach((doc) => {
                fetchedData.push({ id: doc.id, ...doc.data() });
            });

            setHistoryList(fetchedData);
            showStatus(`Berhasil memuat ${fetchedData.length} riwayat ekstraksi.`, 'success');

        } catch (err) {
            console.error("Error fetching history: ", err);
            setError("Gagal memuat riwayat. Periksa koneksi Firestore Anda.");
            showStatus(`Gagal memuat riwayat: ${err.message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [userId, showStatus]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    // Format timestamp
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        // Mengubah objek Timestamp Firestore menjadi objek Date
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    // Fungsi untuk membuat tombol Unduh CSV untuk riwayat
    const downloadHistoryCodes = (codes) => {
        if (codes.length === 0) return;
        
        const codesToDownload = codes.join('\n');
        const csvContent = codes.map(code => `"${code}"`).join('\n'); 
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const filename = `history_extraction_${formatDate(new Date()).replace(/, /g, '_').replace(/:/g, '-')}`;
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showStatus('File CSV riwayat berhasil diunduh.', 'success');
    };
    
    // Sidebar HistoryPage
    const sidebar = (
        <div className="w-64 bg-white p-6 flex flex-col h-screen sticky top-0 shadow-lg border-r border-gray-200">
             <div className="flex items-center mb-10 pb-4 border-b border-gray-200">
                <svg className="w-8 h-8 text-navy-accent mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2v2m4-2h-3m4 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h2m2 4h10m0 0l-3 3m3-3l-3-3" />
                </svg>
                <h1 className="text-xl font-extrabold text-gray-800">
                    Voucher <span className="text-navy-accent">Panel</span>
                </h1>
            </div>

            <nav className="space-y-2 flex-grow">
                {/* Link Ekstraksi */}
                <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); handleNavigate('extraction'); }}
                    className="flex items-center p-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition duration-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 9a1 1 0 100 2h12a1 1 0 100-2H4zM7 15a1 1 0 100 2h6a1 1 0 100-2H7z" />
                    </svg>
                    <span>Ekstraksi</span>
                </a>
                
                {/* Link Arsip / History (Active) */}
                <a 
                    href="#" 
                    onClick={(e) => e.preventDefault()}
                    className="flex items-center p-3 text-sm font-semibold text-white bg-navy-accent rounded-lg shadow-md transition duration-200"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <span>Arsip / History (Active)</span>
                </a>

            </nav>

            <div className="mt-auto pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">
                    Status: {userId ? <span className="text-green-600 font-medium">Connected</span> : <span className="text-yellow-600 font-medium">Connecting...</span>}
                </p>
                {/* Simulasi Logout (Ganti dengan handleLogout jika HistoryPage menerima prop tersebut) */}
                <button 
                    onClick={() => { localStorage.removeItem('isLoggedIn'); window.location.reload(); }} 
                    className="w-full py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition duration-200 shadow-md"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                </button>
            </div>
        </div>
    );


    const HistoryContent = () => {
        if (isLoading) {
            return (
                <div className="text-center py-20">
                    <svg className="animate-spin mx-auto h-10 w-10 text-navy-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-3 text-lg text-gray-600">Memuat riwayat ekstraksi...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center py-20 text-red-600">
                    <p className="text-xl font-bold">Terjadi Kesalahan</p>
                    <p>{error}</p>
                </div>
            );
        }

        if (historyList.length === 0) {
            return (
                <div className="text-center py-20 text-gray-500">
                    <p className="text-xl font-bold">Tidak Ada Riwayat</p>
                    <p>Mulai ekstraksi voucher pertama Anda di halaman Ekstraksi. Hasil akan tersimpan otomatis.</p>
                </div>
            );
        }
        
        // --- Render List ---
        return (
            <div className="space-y-4">
                {historyList.map((item, index) => (
                    <div key={item.id} className="main-card p-5 flex justify-between items-center hover:shadow-lg transition duration-300">
                        <div className="flex-grow">
                            <div className="flex items-baseline mb-1">
                                <span className="text-3xl font-extrabold text-navy-accent mr-3">{item.count}</span>
                                <span className="text-lg font-semibold text-gray-700">Kode Unik Diekstrak</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                                <span className='font-semibold'>Sumber:</span> Dari {item.sourceFiles.length} file (misalnya: {item.sourceFiles.slice(0, 3).join(', ')}
                                {item.sourceFiles.length > 3 && ` dan ${item.sourceFiles.length - 3} file lainnya.`})
                            </p>
                        </div>
                        
                        <div className="text-right flex flex-col items-end">
                            <p className="text-sm font-medium text-gray-800">
                                {formatDate(item.timestamp)}
                            </p>
                            {/* Download Button */}
                            <button 
                                onClick={() => downloadHistoryCodes(item.codes)}
                                className="mt-3 px-4 py-2 bg-gold-accent text-navy-accent text-sm font-semibold rounded-lg hover:bg-yellow-500 transition shadow-md"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Unduh CSV ({item.count})
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };


    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Re-use CSS styles for consistency */}
            <style jsx global>{`
                :root {
                    --color-navy-accent: #0f172a; /* Slate-900 */
                    --color-gold-accent: #fbbf24; /* Amber-400 */
                    --color-main-bg: #ffffff; /* White */
                    --color-panel-bg: #f9fafb; /* Gray-50 */
                }
                .main-card {
                    background-color: var(--color-main-bg); 
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06); 
                    color: #1f2937; 
                    border: 1px solid #f3f4f6; 
                }
                .text-title { color: var(--color-navy-accent); }
            `}</style>

            {sidebar}

            {/* --- KONTEN UTAMA HISTORY --- */}
            <div className="flex-grow p-10 bg-gray-50">
                 {/* HEADER */}
                <header className="mb-10 flex justify-between items-center pb-4 border-b border-gray-200">
                    <h2 className="text-3xl font-light text-gray-800 tracking-wider">Riwayat Ekstraksi Voucher</h2>
                    <button onClick={() => fetchHistory()} className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition disabled:opacity-50" disabled={isLoading}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.962 8.962 0 0112 20c-3.132 0-6.062-1.233-8-3.232l1.424-1.424M14 12V4m-2 2h6" />
                        </svg>
                        Refresh Data
                    </button>
                </header>
                
                <HistoryContent />
            </div>
        </div>
    );
}


// =======================================================================
// === KOMPONEN UTAMA DASHBOARD (Diperbarui untuk waktu saat ini) ===
// =======================================================================

function AppContainer({ showStatus, userId, handleLogout, currentPage, handleNavigate }) {
    // --- STATE HOOKS ---
    const [uploadedFiles, setUploadedFiles] = useState([]); 
    const [uploadedFileBase64, setUploadedFileBase64] = useState([]); 
    const [allDetectedCodes, setAllDetectedCodes] = useState([]); 
    const [allProcessedDetails, setAllProcessedDetails] = useState([]); 
    const [prompt, setPrompt] = useState(`Cari dan ekstrak **HANYA urutan angka yang tepat 18 digit** dari area bawah setiap voucher. Kualitas gambar sangat penting. Berikan HANYA KODE 18 digit tersebut (satu per baris). Abaikan SEMUA angka lain (seperti 12 digit barcode, tanggal, atau nomor seri pendek).`);
    
    const [isLoading, setIsLoading] = useState(false);
    const [processProgress, setProcessProgress] = useState(0); 
    const [isEditMode, setIsEditMode] = useState(false);
    const [uniqueCodesText, setUniqueCodesText] = useState('Hasil ekstraksi kode unik akan tampil di sini, satu per baris.');
    const [showAllDetails, setShowAllDetails] = useState(false);
    const [filenameInput, setFilenameInput] = useState('');
    
    // ==========================================================
    // === PERUBAHAN BARU UNTUK WAKTU SAAT INI ===
    // ==========================================================
    const [currentTime, setCurrentTime] = useState(new Date()); 

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000); // Update setiap 1 detik

        // Cleanup function
        return () => clearInterval(timer);
    }, []);
    
    // Helper function untuk format waktu
    const formatDateTime = (date) => {
        return new Intl.DateTimeFormat('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false // Menggunakan format 24 jam
        }).format(date);
    };
    // ==========================================================
    

    // --- Derived State ---
    const uniqueCodesList = allDetectedCodes.reduce((acc, current) => {
        if (!acc.uniqueSet.has(current.code)) {
            acc.uniqueSet.add(current.code);
            acc.uniqueList.push(current);
        } else {
            acc.duplicateList.push(current);
        }
        return acc;
    }, { uniqueSet: new Set(), uniqueList: [], duplicateList: [] });
    
    const codeCount = uniqueCodesList.uniqueList.length;

    // --- FUNGSI BARU UNTUK MENYIMPAN KE FIREBASE FIRESTORE ---
    const saveCodesToDatabase = useCallback(async (codesList, files) => {
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
            // Menyimpan daftar nama file yang diproses
            sourceFiles: files.map(f => f.name), 
            timestamp: serverTimestamp(), // Menggunakan timestamp Firestore
        };

        try {
            // Membuat ID dokumen unik menggunakan timestamp
            const docRef = doc(db, DB_COLLECTION_NAME, `extraction-${Date.now()}`);
            await setDoc(docRef, dataToSave);
            showStatus(`✅ ${dataToSave.count} kode unik berhasil disimpan ke Firestore!`, 'success');
        } catch (error) {
            console.error("Error saving document to Firestore: ", error);
            showStatus(`Gagal menyimpan data ke Firestore. Pesan: ${error.message}`, 'error');
        }
    }, [userId, showStatus]);
    
    
    // --- UTILITY/HELPER FUNCTIONS ---
    
    const resetExtractionState = useCallback((mode = 'full') => {
        setAllDetectedCodes([]);
        setAllProcessedDetails([]);
        setUniqueCodesText('Hasil ekstraksi kode unik akan tampil di sini, satu per baris.');
        
        if (mode === 'full') {
            setUploadedFiles([]);
            setUploadedFileBase64([]);
        }
        
        setIsEditMode(false);
        setProcessProgress(0);
    }, []);

    // --- HANDLERS ---

    const handleFileChange = async (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        resetExtractionState('soft');

        const newFiles = [...uploadedFiles, ...files];
        setUploadedFiles(newFiles);

        try {
            const base64Promises = files.map(file => resizeImageAndConvertToBase64(file));
            const newBase64Data = await Promise.all(base64Promises);
            setUploadedFileBase64(prev => [...prev, ...newBase64Data]);
            
            showStatus(`Berhasil mengunggah dan mengoptimasi ${files.length} gambar. ✅ Siap memproses.`, 'success');

        } catch (error) {
            console.error("Error processing files:", error);
            showStatus('Gagal memproses salah satu gambar. Coba lagi.', 'error');
        }
    };
    
    const removeImage = (indexToRemove) => {
        setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
        setUploadedFileBase64(prev => prev.filter((_, index) => index !== indexToRemove));
        
        if (allDetectedCodes.length > 0) {
            resetExtractionState('soft');
        }
    };
    
    const handleGenerate = async () => {
        if (uploadedFiles.length === 0) {
            showStatus('Mohon unggah minimal satu gambar voucher.', 'error');
            return;
        }
        
        resetExtractionState('soft');
        setIsLoading(true);
        showStatus(`Memulai ekstraksi untuk ${uploadedFiles.length} gambar via Gemini API...`, 'info');

        const currentPrompt = prompt;
        const newDetectedCodes = [];
        const newProcessedDetails = [];
        let success = false;

        try {
            for (let i = 0; i < uploadedFileBase64.length; i++) {
                const fileData = uploadedFileBase64[i];
                const fileName = uploadedFiles[i].name;

                const progress = ((i + 1) / uploadedFileBase64.length) * 100;
                setProcessProgress(progress);
                showStatus(`[${i + 1}/${uploadedFileBase64.length}] Memproses file: ${fileName}...`, 'info');

                const rawResultText = await callGeminiApi(
                    fileData.base64, 
                    currentPrompt,
                    fileName
                );
                
                // Parse dan Filter Hasil
                const allSequences = rawResultText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                const extractedCodes = allSequences.filter(code => code.length === TARGET_DIGITS_REQUIRED && /^\d+$/.test(code));
                
                newProcessedDetails.push({
                    file: uploadedFiles[i],
                    extractedCodes: extractedCodes,
                    allSequences: allSequences,
                });

                extractedCodes.forEach(code => {
                    newDetectedCodes.push({
                        code: code,
                        source: fileName,
                        id: `${fileName}-${i}-${Math.random()}`, 
                        fileIndex: i,
                    });
                });
            }
            
            setAllDetectedCodes(newDetectedCodes);
            setAllProcessedDetails(newProcessedDetails);
            
            const uniqueCodesExtracted = newDetectedCodes.reduce((acc, item) => {
                if (!acc.set.has(item.code)) {
                    acc.list.push(item);
                    acc.set.add(item.code);
                }
                return acc;
            }, { set: new Set(), list: [] });

            const finalCodesText = uniqueCodesExtracted.list.map(item => item.code).join('\n');
            setUniqueCodesText(finalCodesText || 'Tidak ada kode 18 digit yang terdeteksi.');
            
            showStatus(`✅ Ekstraksi selesai! Ditemukan ${uniqueCodesExtracted.list.length} kode unik 18 digit.`, 'success');
            
            // --- PANGGIL FUNGSI SIMPAN KE DATABASE DI SINI ---
            await saveCodesToDatabase(
                { uniqueList: uniqueCodesExtracted.list, uniqueSet: uniqueCodesExtracted.set }, 
                uploadedFiles
            );
            // ----------------------------------------------------
            success = true;

        } catch (error) {
            console.error("Kesalahan saat memproses gambar:", error);
            showStatus(`Terjadi kesalahan: ${error.message}. Ekstraksi gagal.`, 'error');
        } finally {
            setIsLoading(false);
            setProcessProgress(0);
        }
    };
    
    const toggleEditMode = () => {
        setIsEditMode(prev => {
            const newState = !prev;
            if (!newState) {
                const validatedCodes = uniqueCodesText.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.match(/^\d{18}$/));
                
                setUniqueCodesText(validatedCodes.join('\n'));
                
                showStatus('Daftar kode unik divalidasi dan siap disalin/diunduh.', 'success');
            } else {
                showStatus('Mode Edit Aktif. Harap koreksi kode 18 digit Anda.', 'info');
            }
            return newState;
        });
    };
    
    const copyCodes = () => {
        const codesToCopy = uniqueCodesText.trim();
        if (codesToCopy) {
            const textarea = document.createElement('textarea');
            textarea.value = codesToCopy;
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                document.execCommand('copy');
                showStatus('Daftar kode unik berhasil disalin!', 'success');
            } catch (err) {
                console.error('Failed to copy text:', err);
                showStatus('Gagal menyalin. Harap salin manual dari kotak teks.', 'error');
            }
            document.body.removeChild(textarea);
        }
    };

    const downloadCodes = () => {
        const codesToDownload = uniqueCodesText.trim();
        if (codesToDownload) {
            const codesArray = codesToDownload.split('\n').filter(c => c);
            const csvContent = codesArray.map(code => `"${code}"`).join('\n'); 
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            const filename = filenameInput.trim() || 'extracted_vouchers';
            link.setAttribute('href', url);
            link.setAttribute('download', `${filename}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            showStatus('File CSV berhasil diunduh.', 'success');
        }
    };
    
    const checkPotentialDuplicates = (uniqueCodes) => {
        const potentialMatches = [];
        const prefixes = [4, 5, 6]; 
        const length = TARGET_DIGITS_REQUIRED;
        const checks = new Set();
        
        for (let i = 0; i < uniqueCodes.length; i++) {
            for (let j = i + 1; j < uniqueCodes.length; j++) {
                const codeA = uniqueCodes[i].code;
                const codeB = uniqueCodes[j].code;
                
                if (checks.has(`${codeA}|${codeB}`) || checks.has(`${codeB}|${codeA}`)) continue;
                
                let isPotential = false;
                let matchDetails = [];
                
                for (const len of prefixes) {
                    if (codeA.substring(0, len) === codeB.substring(0, len)) {
                        isPotential = true;
                        matchDetails.push(`Awal ${len} digit`);
                    }
                    if (codeA.substring(length - len) === codeB.substring(length - len)) {
                        isPotential = true;
                        matchDetails.push(`Akhir ${len} digit`);
                    }
                }
                
                if (isPotential) {
                    potentialMatches.push(`${codeA} vs ${codeB} (${[...new Set(matchDetails)].join(', ')})`);
                    checks.add(`${codeA}|${codeB}`);
                }
            }
        }
        return potentialMatches;
    };
    
    // --- RENDER FUNCTIONS (TIDAK BERUBAH) ---
    const renderDuplicateList = () => {
        const duplicateList = uniqueCodesList.duplicateList;
        if (duplicateList.length === 0) {
            return { display: 'hidden', text: 'Tidak ada instance kode duplikat yang terdeteksi.' };
        }
        
        const duplicateCodesText = duplicateList.map(item => `${item.code} (File: ${uploadedFiles[item.fileIndex]?.name || 'N/A'})`).join('\n');
        return { display: '', text: duplicateCodesText };
    };

    const renderPotentialDuplicates = () => {
        const potentialMatches = checkPotentialDuplicates(uniqueCodesList.uniqueList);
        if (potentialMatches.length === 0) {
            return { display: 'hidden', text: 'Tidak ada potensi duplikat yang terdeteksi.' };
        }
        
        return { display: '', text: potentialMatches.join('\n') };
    };
    
    const renderDetailOutput = () => {
        if (allProcessedDetails.length === 0) {
            return 'Detail proses ekstraksi (Validasi, Gagal, Duplikat) akan ditampilkan di sini.';
        }
        
        const uniqueSet = uniqueCodesList.uniqueSet;
        
        return allProcessedDetails.map((detail, index) => {
            const fileName = detail.file.name;
            const isValid = detail.extractedCodes.length > 0;
            const icon = isValid ? '✅' : '❌';
            
            let acceptedCount = 0;
            let codeDisplay;

            if (showAllDetails) {
                codeDisplay = detail.extractedCodes.map(code => {
                    if (uniqueSet.has(code)) {
                        acceptedCount++;
                        return `<span key=${code}>${code}</span>`;
                    }
                    return `<span key=${code} class="line-through text-red-500" title="Duplikat">${code}</span>`;
                }).join('<br/>');

                return (
                    <div key={index} className="mb-3 p-2 border-b border-gray-200">
                        <p className="font-semibold text-gray-800">{icon} File {index + 1} ({fileName})</p>
                        <p className={`ml-5 text-xs ${acceptedCount > 0 ? 'text-green-600' : 'text-red-600'}`}>Kode 18 digit unik yang diterima: {acceptedCount}</p>
                        <div className="mt-1 ml-5 font-mono text-xs" dangerouslySetInnerHTML={{ __html: codeDisplay }} />
                    </div>
                );

            } else {
                codeDisplay = detail.extractedCodes.filter(code => uniqueSet.has(code)).map(code => {
                    acceptedCount++;
                    return `<span key={code}>${code}</span>`;
                }).join('<br/>');

                return (
                    <div key={index} className="mb-3 p-2 border-b border-gray-200">
                        <p className="font-semibold text-gray-800">{icon} File {index + 1} ({fileName})</p>
                        <p className={`text-xs ${acceptedCount > 0 ? 'text-green-600' : 'text-gray-500'} ml-5`}>Diterima: {acceptedCount} kode unik 18 digit.</p>
                        {acceptedCount > 0 && 
                            <div className="mt-1 ml-5 font-mono text-xs" dangerouslySetInnerHTML={{ __html: codeDisplay }} />
                        }
                    </div>
                );
            }
        });
    };

    // --- RENDER UTAMA DASHBOARD ---
    return (
        <div className="min-h-screen bg-gray-50 flex">
            
            {/* --- CUSTOM CSS STYLES (Sama seperti sebelumnya) --- */}
            <style jsx global>{`
                :root {
                    --color-navy-accent: #0f172a; /* Slate-900 */
                    --color-gold-accent: #fbbf24; /* Amber-400 */
                    --color-main-bg: #ffffff; /* White */
                    --color-panel-bg: #f9fafb; /* Gray-50 */
                }
                .main-card {
                    background-color: var(--color-main-bg); 
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06); 
                    color: #1f2937; 
                    border: 1px solid #f3f4f6; 
                }
                .text-title { color: var(--color-navy-accent); }
                .custom-file-upload { 
                    border: 2px dashed #9ca3af; 
                    background-color: #f3f4f6; 
                    padding: 2.5rem;
                    text-align: center;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: border-color 0.3s, background-color 0.3s;
                }
                .custom-file-upload:hover { border-color: var(--color-navy-accent); background-color: #e5e7eb; }
                #image-upload { display: none; }
                .image-thumbnail-wrapper {
                    border: 1px solid #d1d5db; 
                    width: 100px;
                    height: 100px;
                    margin: 8px;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                    position: relative;
                }
                .image-thumbnail {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .remove-image-button {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background-color: rgba(239, 68, 68, 0.9);
                    color: white;
                    border: 1px solid white;
                    cursor: pointer;
                    line-height: 1;
                    padding: 0;
                }
                .pulse-ready {
                    background-color: var(--color-gold-accent); 
                    color: var(--color-navy-accent); 
                    animation: pulse 1.5s infinite;
                }
                .pulse-ready:hover { background-color: #f59e0b; }
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5); }
                    70% { box-shadow: 0 0 0 10px rgba(251, 191, 36, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
                }
                .total-count-display {
                    font-size: 2rem;
                    color: var(--color-navy-accent); 
                    font-weight: 800;
                    margin-left: 8px;
                }
                .dot {
                    background-color: white;
                    height: 8px;
                    width: 8px;
                    border-radius: 50%;
                    margin: 0 2px;
                    animation: dot-loading 1.4s infinite ease-in-out both;
                }
                .dot:nth-child(1) { animation-delay: -0.32s; }
                    .dot:nth-child(2) { animation-delay: -0.16s; }
                    @keyframes dot-loading {
                        0%, 80%, 100% { transform: scale(0); }
                        40% { transform: scale(1.0); }
                    }
                `}</style>
            
            {/* --- SIDEBAR NAVIGASI KIRI (Fixed) --- */}
            <div className="w-64 bg-white p-6 flex flex-col h-screen sticky top-0 shadow-lg border-r border-gray-200">
                <div className="flex items-center mb-10 pb-4 border-b border-gray-200">
                    <svg className="w-8 h-8 text-navy-accent mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2v2m4-2h-3m4 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h2m2 4h10m0 0l-3 3m3-3l-3-3" />
                    </svg>
                    <h1 className="text-xl font-extrabold text-gray-800">
                        Voucher <span className="text-navy-accent">Panel</span>
                    </h1>
                </div>

                <nav className="space-y-2 flex-grow">
                    {/* Active Link: Ekstraksi */}
                    <a 
                        href="#" 
                        onClick={(e) => e.preventDefault()}
                        className="flex items-center p-3 text-sm font-semibold text-white bg-navy-accent rounded-lg shadow-md transition duration-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 9a1 1 0 100 2h12a1 1 0 100-2H4zM7 15a1 1 0 100 2h6a1 1 0 100-2H7z" />
                        </svg>
                        <span>Ekstraksi (Active)</span>
                    </a>
                    
                    {/* Tautan Arsip / History (Now Clickable) */}
                    <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); handleNavigate('history'); }}
                        className="flex items-center p-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition duration-200"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                        <span>Arsip / History</span>
                    </a>

                </nav>

                <div className="mt-auto pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">
                        Status: {userId ? <span className="text-green-600 font-medium">Connected</span> : <span className="text-yellow-600 font-medium">Connecting...</span>}
                    </p>
                    {/* Menggunakan fungsi handleLogout yang di-pass dari App */}
                    <button 
                        onClick={handleLogout} 
                        className="w-full py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition duration-200 shadow-md"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
                </div>
            </div>

            {/* --- KONTEN UTAMA --- */}
            <div className="flex-grow p-10 bg-gray-50">
                 {/* HEADER KONVENSI */}
                <header className="mb-10 flex justify-between items-center pb-4 border-b border-gray-200">
                    <h2 className="text-3xl font-light text-gray-800 tracking-wider">Dashboard Ekstraksi Voucher</h2>
                    <p className="text-sm text-gray-500">Panel v1.0 | Selamat datang, <span className='font-semibold'>Admin</span></p>
                </header>

                {/* VISUALISASI RINGKASAN DATA (Card Light Premium) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                    {/* Card 1: Total Files */}
                    <div className="main-card p-6 border-l-4 border-navy-accent hover:shadow-lg transition duration-300">
                        <p className="text-sm font-medium text-gray-500">Total File Diunggah</p>
                        <div className="flex items-center mt-1">
                            <span className="text-4xl font-extrabold text-gray-800">{uploadedFiles.length}</span>
                            <span className="ml-2 text-sm text-navy-accent font-semibold">Gambar</span>
                        </div>
                    </div>
                    {/* Card 2: Total Codes */}
                    <div className="main-card p-6 border-l-4 border-gold-accent hover:shadow-lg transition duration-300">
                        <p className="text-sm font-medium text-gray-500">Kode Unik Ditemukan</p>
                        <div className="flex items-center mt-1">
                            <span className="text-4xl font-extrabold text-gray-800">{codeCount}</span>
                            <span className="ml-2 text-sm text-gold-accent font-semibold">Kode 18 Digit</span>
                        </div>
                    </div>
                    
                    {/* Card 3: Aktivitas Terakhir (Diperbarui) */}
                     <div className="main-card p-6 border-l-4 border-gray-300 hover:shadow-lg transition duration-300">
                        <p className="text-sm font-medium text-gray-500">Aktivitas Terkini</p>
                        <div className="mt-1">
                            <span className="text-lg font-extrabold text-gray-800 block">
                                {formatDateTime(currentTime)}
                            </span>
                            <span className='text-xs text-green-500 font-semibold block mt-1'>
                                {userId ? 'Firestore Aktif' : 'Menunggu Koneksi'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* GRID UTAMA (Upload/Process Kiri, Results Kanan) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* --- KOLOM KIRI (Upload & Process) --- */}
                    <div className="lg:col-span-1 space-y-8">
                        
                        {/* 1. UPLOAD SECTION */}
                        <div className="main-card p-6">
                            <h2 className="text-xl font-bold text-title mb-4 flex items-center border-b border-gray-200 pb-3">
                                <span className="bg-navy-accent text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 text-sm font-bold">1</span> 
                                Unggah File Voucher
                            </h2>
                            <label htmlFor="image-upload" className="custom-file-upload block mb-4">
                                <svg className="mx-auto h-10 w-10 text-navy-accent mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="font-bold text-lg text-gray-700">Klik atau Seret</span>
                                <span id="file-name" className="block text-sm text-gray-500 mt-1">
                                    {uploadedFiles.length > 0 
                                        ? `${uploadedFiles.length} file dipilih.` 
                                        : 'Pilih gambar voucher (JPG/PNG).'}
                                </span>
                            </label>
                            <input type="file" id="image-upload" accept="image/*" multiple onChange={handleFileChange} />

                            <div id="image-preview-container" className={`mt-4 flex flex-wrap justify-center p-2 border border-gray-200 rounded-lg ${uploadedFiles.length === 0 ? 'hidden' : 'bg-gray-100'}`}>
                                {uploadedFileBase64.map((fileData, index) => (
                                    <div key={index} className="image-thumbnail-wrapper" data-index={index}>
                                        <img 
                                            src={fileData.dataURL} 
                                            className="image-thumbnail" 
                                            alt={`Voucher Image ${index + 1}`} 
                                        />
                                        <button 
                                            className="remove-image-button absolute flex items-center justify-center"
                                            onClick={() => removeImage(index)}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 2. PROCESS SECTION */}
                        <div className="main-card p-6">
                            <h2 className="text-xl font-bold text-title mb-4 flex items-center border-b border-gray-200 pb-3">
                                <span className="bg-navy-accent text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 text-sm font-bold">2</span> 
                                Ekstraksi AI
                            </h2>
                            <label htmlFor="prompt" className="block text-sm font-semibold text-gray-700 mb-2">Instruksi AI</label>
                            <textarea 
                                id="prompt" 
                                rows="3" 
                                className="w-full p-3 border border-gray-300 bg-white rounded-lg focus:ring-navy-accent focus:border-navy-accent transition duration-150 text-sm shadow-sm resize-none text-gray-800"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                            <p className="text-xs text-gray-500 mt-1 mb-4">Pastikan kriteria kode 18 digit sudah benar.</p>

                            <button 
                                id="generate-button" 
                                className={`w-full py-3 text-white font-bold text-lg rounded-lg shadow-md disabled:opacity-50 disabled:shadow-none disabled:animate-none flex items-center justify-center transition duration-300 ${uploadedFiles.length > 0 && !isLoading ? 'pulse-ready text-navy-accent' : 'bg-gray-400 text-gray-700'}`} 
                                disabled={isLoading || uploadedFiles.length === 0} 
                                onClick={handleGenerate}
                            >
                                {/* LOADER */}
                                <div id="loading-spinner" className={`flex items-end justify-center -ml-1 mr-3 h-5 w-5 ${isLoading ? '' : 'hidden'}`}>
                                    <div className="dot"></div>
                                    <div className="dot"></div>
                                    <div className="dot"></div>
                                </div>
                                <span id="button-text">
                                    {isLoading ? 'Memproses dengan Gemini...' : 'Mulai Proses Ekstraksi'}
                                </span>
                            </button>

                            {/* Progress Bar */}
                            <div id="progress-container" className={`mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden ${isLoading ? '' : 'hidden'}`}>
                                <div id="progress-bar" className="h-full bg-gold-accent transition-all duration-300 ease-out" style={{ width: `${processProgress}%` }}></div>
                            </div>
                        </div>
                    </div>
                    
                    {/* --- KOLOM KANAN (Results & Tinjauan) --- */}
                    <div className="lg:col-span-2 space-y-8">
                        
                        {/* 3. UNIQUE CODES (Hasil Murni) */}
                        <div id="unique-codes-card" className="main-card p-6">
                            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                                <h2 className="text-xl font-bold text-title flex items-center">
                                    <span className="bg-navy-accent text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 text-sm font-bold">3</span> 
                                    Kode Unik Ditemukan
                                </h2>
                                <div className="flex items-center p-2 rounded-md bg-gray-100 border border-gray-200">
                                    <p className="text-base font-semibold text-gray-700">Total Unik:</p>
                                    <span id="code-count" className="total-count-display text-gold-accent">{codeCount}</span>
                                </div>
                            </div>
                            
                            <textarea 
                                id="unique-code-display" 
                                rows="10" 
                                className={`w-full p-3 border rounded-lg font-mono text-sm resize-none transition duration-150 ${isEditMode ? 'bg-yellow-50 border-yellow-500 shadow-xl text-gray-800' : 'bg-gray-100 border-gray-300 text-gray-800'}`} 
                                readOnly={!isEditMode}
                                value={uniqueCodesText}
                                onChange={(e) => setUniqueCodesText(e.target.value)}
                            />
                            
                            <p className="text-xs text-gray-500 mt-2">Daftar kode unik 18 digit.</p>
                            
                            {/* Actions Group */}
                            <div className="flex flex-col sm:flex-row justify-end items-end sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 mt-5 border-t border-gray-200 pt-5">
                                {/* Filename Input */}
                                <input 
                                    type="text" 
                                    id="filename-input" 
                                    placeholder="Nama file CSV (Opsional)" 
                                    className="p-2 border border-gray-300 bg-white rounded-lg text-sm w-full sm:w-48 focus:border-navy-accent focus:ring-navy-accent transition text-gray-800"
                                    value={filenameInput}
                                    onChange={(e) => setFilenameInput(e.target.value)}
                                />
                                
                                {/* Edit Button */}
                                <button 
                                    id="edit-button" 
                                    className={`px-4 py-2.5 text-white text-sm font-semibold rounded-lg shadow-md transition duration-200 disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 w-full sm:w-auto 
                                        ${isEditMode ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}`} 
                                    disabled={codeCount === 0 || isLoading}
                                    onClick={toggleEditMode}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    {isEditMode ? 'Selesai Edit' : 'Mode Edit'}
                                </button>

                                <button 
                                    id="copy-button" 
                                    className="px-4 py-2.5 bg-navy-accent text-white text-sm font-semibold rounded-lg shadow-md hover:bg-slate-700 transition duration-200 disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 w-full sm:w-auto" 
                                    disabled={codeCount === 0 || isLoading || isEditMode}
                                    onClick={copyCodes}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2m-2 2h2m-2 2h2m-2 2h2m-2 2h2" />
                                    </svg>
                                    Salin
                                </button>
                                <button 
                                    id="download-button" 
                                    className="px-4 py-2.5 bg-gray-500 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-gray-600 transition duration-200 disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 w-full sm:w-auto" 
                                    disabled={codeCount === 0 || isLoading || isEditMode}
                                    onClick={downloadCodes}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Unduh CSV
                                </button>
                            </div>
                        </div>

                        {/* 4. DETAIL SECTION (Pemisah Hasil, Duplikat & Potensi) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            
                            {/* DUPLICATE CODES (Kiri) */}
                            <div id="duplicate-codes-card" className={`main-card p-6 border-l-4 border-red-500 ${renderDuplicateList().display === 'hidden' ? 'opacity-70' : ''}`}>
                                <h2 className="text-lg font-bold text-red-700 mb-3 flex items-center border-b border-gray-200 pb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                    Duplikat Eksak
                                </h2>
                                <p className="text-xs text-red-600 mb-3">Kode ini terdeteksi di file berbeda. Tidak dihitung unik.</p>
                                
                                <textarea 
                                    id="duplicate-code-display" 
                                    rows="5" 
                                    className="w-full p-3 border border-red-300 rounded-lg bg-red-50 text-red-700 font-mono text-xs resize-none" 
                                    readOnly
                                    value={renderDuplicateList().text}
                                />
                            </div>
                            
                            {/* POTENTIAL DUPLICATES (Kanan) */}
                            <div id="potential-duplicates-card" className={`main-card p-6 border-l-4 border-yellow-500 ${renderPotentialDuplicates().display === 'hidden' ? 'opacity-70' : ''}`}>
                                <h2 className="text-lg font-bold text-yellow-700 mb-3 flex items-center border-b border-gray-200 pb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.368 15c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    Potensi Duplikat
                                </h2>
                                <p className="text-xs text-yellow-600 mb-3">Kesamaan prefix/suffix. Perlu tinjauan manual.</p>
                                
                                <textarea 
                                    id="potential-code-display" 
                                    rows="5" 
                                    className="w-full p-3 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-700 font-mono text-xs resize-none" 
                                    readOnly
                                    value={renderPotentialDuplicates().text}
                                />
                            </div>

                        </div>
                        
                        {/* 5. DETAIL PROSES PER GAMBAR */}
                        <div className="main-card p-6">
                            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                                <h3 className="text-xl font-bold text-gray-700 flex items-center">
                                    <span className="bg-gray-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 text-sm font-bold">4</span>
                                    Log & Validasi Hasil
                                </h3>
                            </div>
                            <div className="flex items-center mb-4">
                                <input 
                                    type="checkbox" 
                                    id="show-all-details-toggle" 
                                    className="form-checkbox h-4 w-4 text-navy-accent transition duration-150 ease-in-out border-gray-300 rounded focus:ring-navy-accent bg-white" 
                                    checked={!showAllDetails}
                                    onChange={() => setShowAllDetails(prev => !prev)}
                                />
                                <label htmlFor="show-all-details-toggle" className="ml-2 block text-sm leading-5 text-gray-600 select-none cursor-pointer">
                                    Tampilkan Hanya Kode Unik yang Diterima (Mode Filter)
                                </label>
                            </div>

                            <div id="detail-output" className="p-3 bg-gray-100 text-gray-700 overflow-auto min-h-[150px] border border-gray-200 rounded-lg shadow-inner text-sm">
                                {renderDetailOutput()}
                            </div>
                        </div>

                    </div>
                    
                </div>
            </div>
            
        </div>
    );
}

// =======================================================================
// === KOMPONEN LOGIN SCREEN (TIDAK BERUBAH) ===
// =======================================================================
function LoginScreen({ handleLogin, statusMessage }) {
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('1234'); // Default password di set ke 1234
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        // Delay simulasi
        setTimeout(() => {
            handleLogin(username, password);
            setLoading(false);
        }, 800);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <style jsx global>{`
                .login-card {
                    background-color: white;
                    border-radius: 16px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 5px 10px -5px rgba(0, 0, 0, 0.04);
                    border: 1px solid #e5e7eb;
                    width: 100%;
                    max-width: 400px;
                }
                .input-field {
                    border: 1px solid #d1d5db; /* Gray-300 */
                    border-radius: 8px;
                    padding: 0.75rem;
                    width: 100%;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .input-field:focus {
                    border-color: #0f172a; /* Navy Accent */
                    box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.1);
                    outline: none;
                }
            `}</style>
            
            <div className="login-card p-8">
                <div className="flex flex-col items-center mb-6">
                    <svg className="w-10 h-10 text-navy-accent mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2v2m4-2h-3m4 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h2m2 4h10m0 0l-3 3m3-3l-3-3" />
                    </svg>
                    <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">
                        Voucher <span className="text-navy-accent">Panel</span>
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Akses Admin Ekstraksi</p>
                </div>
                
                {/* Status Message (Untuk Error/Info Login) */}
                {statusMessage.visible && (
                    <div 
                        className={`p-3 mb-4 rounded-lg text-sm ${
                            statusMessage.type === 'error' ? 'border-red-400 bg-red-100 text-red-800' :
                            'border-blue-400 bg-blue-100 text-blue-800'
                        }`} 
                        role="alert"
                    >
                        {statusMessage.text}
                    </div>
                )}
                
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            className="input-field"
                            placeholder="Masukkan Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="input-field"
                            placeholder="Masukkan Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 bg-navy-accent text-white font-semibold rounded-lg shadow-md hover:bg-slate-700 transition duration-200 disabled:opacity-50 flex items-center justify-center"
                        disabled={loading}
                    >
                        {loading ? (
                             <span className='flex items-center'>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Authenticating...
                            </span>
                        ) : 'Login ke Panel'}
                    </button>
                    <p className='text-xs text-gray-400 text-center mt-4'></p>
                </form>
            </div>
        </div>
    );
}


// =======================================================================
// === KOMPONEN ROOT APP (Otentikasi Utama, Diperbarui untuk routing) ===
// =======================================================================

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userId, setUserId] = useState(null);
    const [currentPage, setCurrentPage] = useState('extraction'); // NEW STATE FOR ROUTING
    const [statusMessage, setStatusMessage] = useState({ text: '', type: 'info', visible: false });

    const showStatus = useCallback((text, type = 'info') => {
        setStatusMessage({ text, type, visible: true });
        setTimeout(() => setStatusMessage(prev => ({ ...prev, visible: false })), 7000); 
    }, []);
    
    // NEW NAVIGATION HANDLER
    const handleNavigate = useCallback((page) => {
        setCurrentPage(page);
        showStatus(`Navigasi ke halaman ${page === 'extraction' ? 'Ekstraksi' : 'Riwayat'}.`, 'info');
    }, [showStatus]);


    // Fungsi Logout yang sebenarnya
    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn'); // Hapus sesi dari penyimpanan lokal
        setIsLoggedIn(false); // Reset status login
        setUserId(null); // Hapus ID pengguna
        showStatus('Anda telah berhasil Logout.', 'info');
    };

    // Simulasi Otentikasi dan Pemuatan Data
    useEffect(() => {
        
        const storedLogin = localStorage.getItem('isLoggedIn');
        if (storedLogin === 'true') {
            setIsLoggedIn(true);
            setUserId('admin-user-123'); 
        }

    }, []); 

    const handleLogin = (username, password) => {
        // --- SIMULASI LOGIKA LOGIN ---
        if (username === 'admin' && password === '1234') { 
            setIsLoggedIn(true);
            setUserId('admin-user-123'); 
            localStorage.setItem('isLoggedIn', 'true');
            showStatus('Login Berhasil! Selamat datang di Dashboard.', 'success');
        } else {
            setIsLoggedIn(false);
            showStatus('Gagal Login. Username atau Password salah.', 'error');
        }
    };
    
    // --- STATUS MESSAGE UNTUK DASHBOARD ---
    const renderStatusPopup = () => (
        <div 
            id="status-message" 
            className={`fixed bottom-6 right-6 z-50 p-4 border rounded-lg text-sm shadow-xl transition-all duration-500 transform ${statusMessage.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12 pointer-events-none'} ${
                statusMessage.type === 'success' ? 'border-green-400 bg-green-100 text-green-800' :
                statusMessage.type === 'error' ? 'border-red-400 bg-red-100 text-red-800' :
                'border-blue-400 bg-blue-100 text-blue-800'
            }`} 
            role="alert"
        >
            {statusMessage.text}
        </div>
    );


    return (
        <>
            {isLoggedIn ? (
                <>
                    {/* Conditional rendering based on currentPage state */}
                    {currentPage === 'extraction' ? (
                        <AppContainer 
                            showStatus={showStatus} 
                            userId={userId} 
                            handleLogout={handleLogout} 
                            currentPage={currentPage}
                            handleNavigate={handleNavigate}
                        />
                    ) : (
                        <HistoryPage 
                            userId={userId} 
                            showStatus={showStatus} 
                            handleNavigate={handleNavigate}
                        />
                    )}
                    {renderStatusPopup()}
                </>
            ) : (
                <LoginScreen 
                    handleLogin={handleLogin} 
                    statusMessage={statusMessage}
                />
            )}
        </>
    );
}

export default App;
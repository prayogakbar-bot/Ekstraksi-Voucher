import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- IMPOR DARI FILE EKSTERNAL ---
import { 
    resizeImageAndConvertToBase64, 
    callGeminiApi, 
    TARGET_DIGITS_REQUIRED 
} from './gemini'; 
import { 
    saveCodesToDatabase, 
    fetchHistory, 
    updateFilename, 
    deleteHistoryItem,
    formatDate, 
} from './firebase'; 
// ------------------------------------

// =======================================================================
// === KOMPONEN NAVIGASI BAWAH UNTUK PONSEL (BottomNavBar) ===
// =======================================================================
function BottomNavBar({ currentPage, handleNavigate }) {
    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-2xl">
            <div className="flex justify-around items-center h-16">
                <button
                    onClick={() => handleNavigate('extraction')}
                    className={`flex flex-col items-center p-2 text-xs font-semibold transition duration-200 ${currentPage === 'extraction' ? 'text-navy-accent' : 'text-gray-500 hover:text-navy-accent'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 9a1 1 0 100 2h12a1 1 0 100-2H4zM7 15a1 1 0 100 2h6a1 1 0 100-2H7z" />
                    </svg>
                    <span>Ekstraksi</span>
                </button>

                <button
                    onClick={() => handleNavigate('history')}
                    className={`flex flex-col items-center p-2 text-xs font-semibold transition duration-200 ${currentPage === 'history' ? 'text-navy-accent' : 'text-gray-500 hover:text-navy-accent'}`}
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <span>Arsip</span>
                </button>
                
                <button
                    onClick={() => { localStorage.removeItem('isLoggedIn'); window.location.reload(); }} 
                    className={`flex flex-col items-center p-2 text-xs font-semibold transition duration-200 text-gray-500 hover:text-red-500`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                </button>
            </div>
        </div>
    );
}

// =======================================================================
// === KOMPONEN HISTORY PAGE (Dimodifikasi dengan Filter & Sort) ===
// =======================================================================
function HistoryPage({ userId, showStatus, handleNavigate }) {
    const [historyList, setHistoryList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isRenaming, setIsRenaming] = useState(null); 
    const [newFilename, setNewFilename] = useState('');
    
    // --- FITUR TAMBAHAN: State untuk Filter dan Sort ---
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('timestamp'); // 'timestamp', 'count', 'filename'
    const [sortOrder, setSortOrder] = useState('desc'); // 'asc' atau 'desc'
    // ----------------------------------------------------
    
    const fetchHistoryData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedData = await fetchHistory(userId, showStatus);
            setHistoryList(fetchedData);
            showStatus(`Berhasil memuat ${fetchedData.length} riwayat ekstraksi.`, 'success');

        } catch (err) {
            setError("Gagal memuat riwayat. Periksa koneksi Firestore Anda.");
        } finally {
            setIsLoading(false);
        }
    }, [userId, showStatus]);

    useEffect(() => {
        fetchHistoryData();
    }, [fetchHistoryData]);

    // --- FITUR TAMBAHAN: Logika Filter dan Sort ---
    const getSortedAndFilteredHistory = () => {
        let filteredList = historyList.filter(item => 
            // Filter berdasarkan nama file ATAU kode voucher
            item.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.codes.some(code => code.includes(searchTerm))
        );

        return filteredList.sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'count':
                    aValue = a.count;
                    bValue = b.count;
                    break;
                case 'filename':
                    aValue = a.filename.toLowerCase();
                    bValue = b.filename.toLowerCase();
                    break;
                case 'timestamp':
                default:
                    aValue = a.timestamp;
                    bValue = b.timestamp;
                    break;
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    };
    // -----------------------------------------------

    const handleRename = async (itemId) => {
        if (isRenaming === itemId) {
            if (!newFilename.trim()) {
                 showStatus("Nama file tidak boleh kosong.", 'error');
                 return;
            }
            setIsLoading(true);
            try {
                await updateFilename(itemId, newFilename, showStatus);
                setHistoryList(prevList => prevList.map(item => 
                    item.id === itemId ? { ...item, filename: newFilename.trim() } : item
                ));
                showStatus(`Nama file riwayat berhasil diperbarui menjadi ${newFilename.trim()}.`, 'success');
                setIsRenaming(null);
                setNewFilename('');
            } catch (err) {
                // Error handled in utility
            } finally {
                setIsLoading(false);
            }
        } else {
            const currentItem = historyList.find(item => item.id === itemId);
            if (currentItem) {
                setNewFilename(currentItem.filename.replace(/\.csv$/i, '')); 
                setIsRenaming(itemId);
            }
        }
    };
    
    const handleDelete = async (itemId, filename) => {
        if (!window.confirm(`Anda yakin ingin menghapus riwayat ekstraksi "${filename}"? Aksi ini tidak dapat dibatalkan.`)) {
            return;
        }
        setIsLoading(true);
        try {
            await deleteHistoryItem(itemId, filename, showStatus);
            setHistoryList(prevList => prevList.filter(item => item.id !== itemId));
            showStatus(`Riwayat ekstraksi "${filename}" berhasil dihapus.`, 'success');
        } catch (err) {
             // Error handled in utility
        } finally {
            setIsLoading(false);
        }
    };

    const downloadHistoryCodes = (codes, filename) => {
        if (codes.length === 0) return;
        const csvContent = codes.map(code => `"${code}"`).join('\n'); 
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const finalFilename = filename.trim().replace(/\.csv$/i, '') || 'extracted_vouchers_download';
        link.setAttribute('href', url);
        link.setAttribute('download', `${finalFilename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showStatus('File CSV riwayat berhasil diunduh.', 'success');
    };
    
    // Gunakan hasil filter dan sort
    const displayList = getSortedAndFilteredHistory();

    const sidebar = (
        <div className="hidden lg:flex w-64 bg-white p-6 flex-col h-screen sticky top-0 shadow-lg border-r border-gray-200">
             <div className="flex items-center mb-10 pb-4 border-b border-gray-200">
                <svg className="w-8 h-8 text-navy-accent mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2v2m4-2h-3m4 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h2m2 4h10m0 0l-3 3m3-3l-3-3" />
                </svg>
                <h1 className="text-xl font-extrabold text-gray-800">
                    Voucher <span className="text-navy-accent">Panel</span>
                </h1>
            </div>
            <nav className="space-y-2 flex-grow">
                <a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('extraction'); }} className="flex items-center p-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 9a1 1 0 100 2h12a1 1 0 100-2H4zM7 15a1 1 0 100 2h6a1 1 0 100-2H7z" /></svg>
                    <span>Ekstraksi</span>
                </a>
                <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center p-3 text-sm font-semibold text-white bg-navy-accent rounded-lg shadow-md transition duration-200">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    <span>Arsip / History (Active)</span>
                </a>
            </nav>
            <div className="mt-auto pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Status: {userId ? <span className="text-green-600 font-medium">Connected</span> : <span className="text-yellow-600 font-medium">Connecting...</span>}</p>
                <button onClick={() => { localStorage.removeItem('isLoggedIn'); window.location.reload(); }} className="w-full py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition duration-200 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> Logout
                </button>
            </div>
        </div>
    );

    const HistoryContent = () => {
        if (isLoading && historyList.length === 0) {
            return (
                <div className="text-center py-20">
                    <svg className="animate-spin mx-auto h-10 w-10 text-navy-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <p className="mt-3 text-lg text-gray-600">Memuat riwayat ekstraksi...</p>
                </div>
            );
        }
        if (error) {
            return (<div className="text-center py-20 text-red-600"><p className="text-xl font-bold">Terjadi Kesalahan</p><p>{error}</p></div>);
        }
        if (historyList.length === 0) {
            return (<div className="text-center py-20 text-gray-500"><p className="text-xl font-bold">Tidak Ada Riwayat</p><p>Mulai ekstraksi voucher pertama Anda di halaman Ekstraksi.</p></div>);
        }
        
        if (displayList.length === 0) {
            return (<div className="text-center py-20 text-gray-500"><p className="text-xl font-bold">Data Tidak Ditemukan</p><p>Coba ubah kata kunci pencarian atau pengaturan filter Anda.</p></div>);
        }
        
        return (
            <div className="space-y-4">
                {displayList.map((item) => (
                    <div key={item.id} className="main-card p-5 flex flex-col justify-between items-start hover:shadow-lg transition duration-300">
                        <div className="w-full">
                            <div className="flex items-center justify-between mb-3 border-b pb-3">
                                <div className="flex items-baseline">
                                    <span className="text-3xl font-extrabold text-navy-accent mr-3">{item.count}</span>
                                    <span className="text-lg font-semibold text-gray-700">Kode Unik Diekstrak</span>
                                </div>
                                <p className="text-sm font-medium text-gray-800">{formatDate(item.timestamp)}</p>
                            </div>
                            <div className="flex items-center mb-3">
                                {isRenaming === item.id ? (
                                    <>
                                        <input type="text" value={newFilename} onChange={(e) => setNewFilename(e.target.value)} className="p-1 border border-gray-400 rounded-lg text-sm w-full font-semibold mr-2" disabled={isLoading} />
                                        <button onClick={() => handleRename(item.id)} className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-lg" disabled={isLoading}>Simpan</button>
                                         <button onClick={() => { setIsRenaming(null); setNewFilename(''); }} className="ml-2 px-3 py-1 bg-gray-500 text-white text-xs font-semibold rounded-lg" disabled={isLoading}>Batal</button>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-sm text-gray-700 font-semibold truncate mr-3">Nama File: <span className="text-navy-accent">{item.filename}.csv</span></p>
                                        <button onClick={() => handleRename(item.id)} className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-md" disabled={isLoading}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                    </>
                                )}
                            </div>
                             <p className="text-sm text-gray-500 mb-4"><span className='font-semibold'>Sumber:</span> Dari {item.sourceFiles.length} file.</p>
                        </div>
                        <div className="w-full flex flex-wrap justify-end gap-3 border-t pt-4">
                            <button onClick={() => downloadHistoryCodes(item.codes, item.filename)} className="px-4 py-2 bg-gold-accent text-navy-accent text-sm font-semibold rounded-lg hover:bg-yellow-500 transition shadow-md flex-grow sm:flex-grow-0" disabled={isLoading}>Unduh CSV</button>
                            <button onClick={() => handleDelete(item.id, item.filename)} className="px-4 py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition shadow-md flex-grow sm:flex-grow-0" disabled={isLoading}>Hapus</button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <style jsx global>{`
                :root { --color-navy-accent: #0f172a; --color-gold-accent: #fbbf24; --color-main-bg: #ffffff; --color-panel-bg: #f9fafb; }
                .text-navy-accent { color: var(--color-navy-accent); }
                .bg-navy-accent { background-color: var(--color-navy-accent); }
                .bg-gold-accent { background-color: var(--color-gold-accent); }
                .main-card { background-color: var(--color-main-bg); border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06); color: #1f2937; border: 1px solid #f3f4f6; }
                .text-title { color: var(--color-navy-accent); }
            `}</style>
            {sidebar}
            <div className="flex-grow p-5 lg:p-10 bg-gray-50 pb-20"> 
                {/* --- HEADER DIMODIFIKASI UNTUK FILTER & SORT --- */}
                <header className="mb-6 lg:mb-10 flex flex-col justify-between items-start pb-4 border-b border-gray-200">
                    <h2 className="text-2xl sm:text-3xl font-light text-gray-800 tracking-wider mb-4">Riwayat Ekstraksi</h2>
                    <div className="w-full flex flex-wrap gap-4 items-center">
                        {/* Search Input */}
                        <input 
                            type="text" 
                            placeholder="Cari berdasarkan nama file atau kode..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-grow p-2 border border-gray-300 rounded-lg shadow-sm text-sm"
                            disabled={isLoading}
                        />
                        {/* Sort By Select */}
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            className="p-2 border border-gray-300 rounded-lg shadow-sm text-sm bg-white"
                            disabled={isLoading}
                        >
                            <option value="timestamp">Urutkan: Tanggal</option>
                            <option value="count">Urutkan: Jumlah Kode</option>
                            <option value="filename">Urutkan: Nama File</option>
                        </select>
                        {/* Sort Order Button */}
                        <button 
                            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} 
                            className="px-3 py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition flex items-center"
                            disabled={isLoading}
                        >
                            {/* Ikon panah berdasarkan urutan */}
                            {sortOrder === 'desc' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15.707 15.707a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414L14 14.586V10a1 1 0 112 0v4.586l1.293-1.293a1 1 0 011.414 1.414l-3 3z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15.707 4.293a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L14.586 6H10a1 1 0 110-2h4.586l-1.293-1.293a1 1 0 011.414-1.414l3 3z" /></svg>
                            )}
                            {sortOrder === 'desc' ? 'Urutan Menurun' : 'Urutan Menaik'}
                        </button>
                        <button onClick={() => fetchHistoryData()} className="flex items-center px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition disabled:opacity-50" disabled={isLoading}>Refresh Data</button>
                    </div>
                </header>
                {/* -------------------------------------------------- */}
                <HistoryContent />
            </div>
        </div>
    );
}


// =======================================================================
// === KOMPONEN UTAMA DASHBOARD ===
// =======================================================================
function AppContainer({ showStatus, userId, handleLogout, currentPage, handleNavigate }) {
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
    const [currentTime, setCurrentTime] = useState(new Date()); 

    useEffect(() => {
        const timer = setInterval(() => { setCurrentTime(new Date()); }, 1000); 
        return () => clearInterval(timer);
    }, []);
    
    const formatDateTime = (date) => {
        return new Intl.DateTimeFormat('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date);
    };

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

    const saveExtraction = useCallback(async (codesList, files, filename) => {
        await saveCodesToDatabase(codesList, files, filename, userId, showStatus);
    }, [userId, showStatus]);
    
    const resetExtractionState = useCallback((mode = 'full') => {
        setAllDetectedCodes([]);
        setAllProcessedDetails([]);
        setUniqueCodesText('Hasil ekstraksi kode unik akan tampil di sini, satu per baris.');
        if (mode === 'full') {
            setUploadedFiles([]);
            setUploadedFileBase64([]);
            setFilenameInput(''); 
        }
        setIsEditMode(false);
        setProcessProgress(0);
    }, []);

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
        if (allDetectedCodes.length > 0) resetExtractionState('soft');
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

        try {
            for (let i = 0; i < uploadedFileBase64.length; i++) {
                const fileData = uploadedFileBase64[i];
                const fileName = uploadedFiles[i].name;
                const progress = ((i + 1) / uploadedFileBase64.length) * 100;
                setProcessProgress(progress);
                showStatus(`[${i + 1}/${uploadedFileBase64.length}] Memproses file: ${fileName}...`, 'info');

                const rawResultText = await callGeminiApi(fileData.base64, currentPrompt, fileName);
                
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
            
            // Simpan otomatis hanya jika ada kode yang terdeteksi
            if (uniqueCodesExtracted.list.length > 0) {
                 await saveExtraction({ uniqueList: uniqueCodesExtracted.list, uniqueSet: uniqueCodesExtracted.set }, uploadedFiles, filenameInput);
            }
           
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
                // Saat keluar dari mode edit, validasi kode yang dimasukkan
                const validatedCodes = uniqueCodesText.split('\n').map(line => line.trim()).filter(line => line.match(/^\d{18}$/));
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
            navigator.clipboard.writeText(codesToCopy).then(() => {
                showStatus('Daftar kode unik berhasil disalin!', 'success');
            }).catch(err => {
                showStatus('Gagal menyalin. Harap salin secara manual.', 'error');
            });
        } else {
             showStatus('Tidak ada kode unik untuk disalin.', 'info');
        }
    };

    const downloadCodes = () => {
        const codesToDownload = uniqueCodesText.trim();
        if (codesToDownload) {
             const csvContent = codesToDownload.split('\n').map(code => `"${code}"`).join('\n');
             const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
             const url = URL.createObjectURL(blob);
             const link = document.createElement('a');
             const filename = filenameInput.trim().replace(/\.csv$/i, '') || 'extracted_vouchers';
             link.setAttribute('href', url);
             link.setAttribute('download', `${filename}.csv`);
             link.style.visibility = 'hidden';
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
             showStatus('File CSV kode unik berhasil diunduh.', 'success');
        } else {
            showStatus('Tidak ada kode unik untuk diunduh.', 'info');
        }
    };
    
    const checkPotentialDuplicates = (uniqueList) => {
        const potentialMatches = [];
        const checks = new Set(); 
        const TARGET_DIGITS_REQUIRED = 18; // Pastikan ini konsisten dengan impor
        for (let i = 0; i < uniqueList.length; i++) {
            for (let j = i + 1; j < uniqueList.length; j++) {
                const codeA = uniqueList[i].code;
                const codeB = uniqueList[j].code;
                if (checks.has(`${codeA}|${codeB}`) || checks.has(`${codeB}|${codeA}`)) continue;

                let isPotential = false;
                const matchDetails = [];
                let diffCount = 0;
                for(let k = 0; k < TARGET_DIGITS_REQUIRED; k++) {
                    if (codeA[k] !== codeB[k]) diffCount++;
                }
                if (diffCount === 1) {
                    isPotential = true;
                    matchDetails.push("Beda 1 digit");
                }
                const checkLengths = [8, 10, 12]; 
                for (const len of checkLengths) {
                    if (codeA.substring(0, len) === codeB.substring(0, len)) {
                         isPotential = true;
                         matchDetails.push(`Awal ${len} digit`);
                    }
                    if (codeA.substring(TARGET_DIGITS_REQUIRED - len) === codeB.substring(TARGET_DIGITS_REQUIRED - len)) {
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

    const renderDuplicateList = () => {
        const duplicateList = uniqueCodesList.duplicateList;
        if (duplicateList.length === 0) return { display: 'hidden', text: 'Tidak ada instance kode duplikat yang terdeteksi.' };
        const duplicateCodesText = duplicateList.map(item => `${item.code} (File: ${uploadedFiles[item.fileIndex]?.name || 'N/A'})`).join('\n');
        return { display: '', text: duplicateCodesText };
    };

    const renderPotentialDuplicates = () => {
        const potentialMatches = checkPotentialDuplicates(uniqueCodesList.uniqueList);
        if (potentialMatches.length === 0) return { display: 'hidden', text: 'Tidak ada potensi duplikat yang terdeteksi.' };
        return { display: '', text: potentialMatches.join('\n') };
    };

    const renderProcessedDetails = () => {
        if (allProcessedDetails.length === 0 || !showAllDetails) return { display: 'hidden', text: '' };
        const detailsText = allProcessedDetails.map(detail => {
            const fileName = detail.file.name;
            const extractedCodes = detail.extractedCodes.join(', ') || 'TIDAK ADA KODE 18 DIGIT YANG VALID';
            const allSequences = detail.allSequences.join(' | ');
            return `[${fileName}]\n  Valid (18 digit): ${extractedCodes}\n  Semua Hasil Mentah: ${allSequences}`;
        }).join('\n\n');
        return { display: '', text: detailsText };
    };
    
    const sidebar = (
        <div className="hidden lg:flex w-64 bg-white p-6 flex-col h-screen sticky top-0 shadow-lg border-r border-gray-200">
             <div className="flex items-center mb-10 pb-4 border-b border-gray-200">
                <svg className="w-8 h-8 text-navy-accent mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2v2m4-2h-3m4 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h2m2 4h10m0 0l-3 3m3-3l-3-3" />
                </svg>
                <h1 className="text-xl font-extrabold text-gray-800">
                    Voucher <span className="text-navy-accent">Panel</span>
                </h1>
            </div>

            <nav className="space-y-2 flex-grow">
                <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center p-3 text-sm font-semibold text-white bg-navy-accent rounded-lg shadow-md transition duration-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 9a1 1 0 100 2h12a1 1 0 100-2H4zM7 15a1 1 0 100 2h6a1 1 0 100-2H7z" /></svg>
                    <span>Ekstraksi (Active)</span>
                </a>
                <a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('history'); }} className="flex items-center p-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition duration-200">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                    <span>Arsip / History</span>
                </a>
            </nav>
            <div className="mt-auto pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Status: {userId ? <span className="text-green-600 font-medium">Connected</span> : <span className="text-yellow-600 font-medium">Connecting...</span>}</p>
                <button onClick={handleLogout} className="w-full py-2 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition duration-200 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> Logout
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <style jsx global>{`
                :root { --color-navy-accent: #0f172a; --color-gold-accent: #fbbf24; --color-main-bg: #ffffff; --color-panel-bg: #f9fafb; }
                .text-navy-accent { color: var(--color-navy-accent); }
                .bg-navy-accent { background-color: var(--color-navy-accent); }
                .bg-gold-accent { background-color: var(--color-gold-accent); }
                .main-card { background-color: var(--color-main-bg); border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06); color: #1f2937; border: 1px solid #f3f4f6; }
                .text-title { color: var(--color-navy-accent); }
                .total-count-display { font-size: 1.5rem; line-height: 2rem; font-weight: 800; margin-left: 0.5rem; }
                @keyframes dot-flashing { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
                .dot { width: 6px; height: 6px; background-color: white; border-radius: 50%; margin-left: 3px; animation: dot-flashing 1s infinite alternate; }
                .dot:nth-child(1) { animation-delay: 0s; }
                .dot:nth-child(2) { animation-delay: 0.2s; }
                .dot:nth-child(3) { animation-delay: 0.4s; }
            `}</style>
            
            {sidebar}

            <div className="flex-grow p-5 lg:p-10 bg-gray-50 pb-20"> 
                <header className="mb-6 lg:mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-gray-200">
                    <h2 className="text-2xl sm:text-3xl font-light text-gray-800 tracking-wider mb-3 sm:mb-0">Panel Ekstraksi Voucher</h2>
                    <p className='text-sm text-gray-500'>Selamat datang, Tampan!</p>
                </header>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="main-card p-4 lg:p-6 border-l-4 border-navy-accent hover:shadow-lg transition duration-300">
                        <p className="text-sm font-medium text-gray-500">Total File Diproses</p>
                        <span className="text-xl lg:text-2xl font-extrabold text-navy-accent block mt-1">{uploadedFiles.length}</span>
                    </div>
                    <div className="main-card p-4 lg:p-6 border-l-4 border-gold-accent hover:shadow-lg transition duration-300">
                        <p className="text-sm font-medium text-gray-500">Kode Unik Ditemukan</p>
                        <span id="card-code-count" className="text-xl lg:text-2xl font-extrabold text-gold-accent block mt-1">{codeCount}</span>
                    </div>
                    <div className="main-card p-4 lg:p-6 border-l-4 border-red-500 hover:shadow-lg transition duration-300">
                        <p className="text-sm font-medium text-gray-500">Duplikat Eksak</p>
                        <span className="text-xl lg:text-2xl font-extrabold text-red-500 block mt-1">{uniqueCodesList.duplicateList.length}</span>
                    </div>
                    <div className="main-card p-4 lg:p-6 border-l-4 border-gray-300 hover:shadow-lg transition duration-300">
                        <p className="text-sm font-medium text-gray-500">Aktivitas Terkini</p>
                        <div className="mt-1">
                            <span className="text-base lg:text-lg font-extrabold text-gray-800 block">{formatDateTime(currentTime)}</span>
                            <span className='text-xs text-green-500 font-semibold block mt-1'>{userId ? 'Firestore Aktif' : 'Menunggu Koneksi'}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-8">
                        <div className="main-card p-6">
                            <h2 className="text-xl font-bold text-title mb-4 flex items-center border-b border-gray-200 pb-3">
                                <span className="bg-navy-accent text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 text-sm font-bold">1</span> Unggah File Voucher
                            </h2>
                            <input type="file" id="image-upload" className="hidden" accept="image/*" multiple onChange={handleFileChange} disabled={isLoading} />
                            <label htmlFor="image-upload" className="custom-file-upload block mb-4">
                                <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-navy-accent transition duration-200 bg-gray-50">
                                    <svg className="mx-auto h-10 w-10 text-navy-accent mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <p className="text-sm font-semibold text-navy-accent">Klik untuk Unggah atau Seret & Lepas</p>
                                    <p className="text-xs text-gray-500 mt-1">Hingga 10 file. Format: JPG/PNG</p>
                                </div>
                            </label>
                            {uploadedFileBase64.length > 0 && (
                                <div className="mt-4 border-t pt-4">
                                    <h3 className="text-sm font-bold text-gray-700 mb-2">Pratinjau ({uploadedFiles.length} file)</h3>
                                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg bg-white">
                                        {uploadedFileBase64.map((fileData, index) => (
                                            <div key={index} className="relative group">
                                                <img src={fileData.dataURL} alt={fileData.name} className="w-full h-auto rounded object-cover border"/>
                                                <button onClick={() => removeImage(index)} className="absolute top-0 right-0 -mt-2 -mr-2 p-1 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition duration-150" title="Hapus gambar" disabled={isLoading}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => resetExtractionState('full')} className="mt-3 w-full py-1.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300 transition" disabled={isLoading}>Hapus Semua Gambar</button>
                                </div>
                            )}
                        </div>

                        <div className="main-card p-6">
                            <h2 className="text-xl font-bold text-title mb-4 flex items-center border-b border-gray-200 pb-3">
                                <span className="bg-navy-accent text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 text-sm font-bold">2</span> Proses Ekstraksi
                            </h2>
                            <div className="mb-4">
                                <label htmlFor="filename-input" className="block text-sm font-medium text-gray-700 mb-1">Nama File Simpan (Opsional)</label>
                                <input type="text" id="filename-input" className="w-full p-2 border border-gray-300 rounded-lg text-sm" placeholder="Contoh: 4GB" value={filenameInput} onChange={(e) => setFilenameInput(e.target.value)} disabled={isLoading} />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="prompt-input" className="block text-sm font-medium text-gray-700 mb-1">Prompt Gemini (Default)</label>
                                <textarea id="prompt-input" rows="4" className="w-full p-2 border border-gray-300 rounded-lg text-xs font-mono bg-gray-100 resize-none" value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={isLoading} />
                            </div>
                            <button id="generate-button" onClick={handleGenerate} className="w-full py-3 bg-navy-accent text-white text-base font-semibold rounded-lg shadow-xl hover:bg-gray-700 transition duration-200 disabled:opacity-50 disabled:bg-gray-400 flex items-center justify-center" disabled={uploadedFiles.length === 0 || isLoading}>
                                <div id="loading-spinner" className={`flex items-end justify-center -ml-1 mr-3 h-5 w-5 ${isLoading ? '' : 'hidden'}`}><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>
                                <span id="button-text">{isLoading ? 'Memproses dengan Gemini...' : 'Mulai Proses Ekstraksi'}</span>
                            </button>
                            <div id="progress-container" className={`mt-3 h-1.5 bg-gray-200 rounded-full overflow-hidden ${isLoading ? '' : 'hidden'}`}><div id="progress-bar" className="h-full bg-gold-accent transition-all duration-300 ease-out" style={{ width: `${processProgress}%` }}></div></div>
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-8">
                        <div id="unique-codes-card" className="main-card p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b border-gray-200 pb-3">
                                <h2 className="text-xl font-bold text-title flex items-center mb-2 sm:mb-0">
                                    <span className="bg-navy-accent text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 text-sm font-bold">3</span> Kode Unik Ditemukan
                                </h2>
                                <div className="flex items-center p-2 rounded-md bg-gray-100 border border-gray-200">
                                    <p className="text-base font-semibold text-gray-700">Total Unik:</p>
                                    <span id="code-count" className="total-count-display text-gold-accent">{codeCount}</span>
                                </div>
                            </div>
                            <textarea id="unique-code-display" rows="10" className={`w-full p-3 border rounded-lg font-mono text-sm resize-none transition duration-150 ${isEditMode ? 'bg-yellow-50 border-yellow-500 shadow-xl text-gray-800' : 'bg-gray-100 border-gray-300 text-gray-800'}`} placeholder={uniqueCodesText} value={uniqueCodesText} onChange={(e) => setUniqueCodesText(e.target.value)} readOnly={!isEditMode || isLoading} />
                            <div className="mt-4 flex flex-col sm:flex-row justify-between gap-3">
                                <button id="edit-toggle" className={`px-4 py-2.5 text-sm font-semibold rounded-lg shadow-md transition duration-200 disabled:opacity-50 w-full sm:w-auto ${isEditMode ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`} disabled={codeCount === 0 || isLoading} onClick={toggleEditMode}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                    {isEditMode ? 'Selesai Edit & Validasi' : 'Mode Edit Manual'}
                                </button>
                                <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
                                    <button id="copy-button" className="px-4 py-2.5 bg-navy-accent text-white text-sm font-semibold rounded-lg shadow-md hover:bg-gray-700 transition duration-200 disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 w-full sm:w-auto" disabled={codeCount === 0 || isLoading || isEditMode} onClick={copyCodes}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h2a2 2 0 012 2v2m0 0h2m-2 2h2m-2 2h2m-2 2h2m-2 2h2m-2 2h2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2" /></svg> Salin
                                    </button>
                                    <button id="download-button" className="px-4 py-2.5 bg-gold-accent text-navy-accent text-sm font-semibold rounded-lg shadow-md hover:bg-yellow-500 transition duration-200 disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500 w-full sm:w-auto" disabled={codeCount === 0 || isLoading || isEditMode} onClick={downloadCodes}>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Unduh CSV
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div id="duplicate-codes-card" className={`main-card p-6 border-l-4 border-red-500 ${renderDuplicateList().display === 'hidden' ? 'opacity-70' : ''}`}>
                                <h2 className="text-lg font-bold text-red-700 mb-3 flex items-center border-b border-gray-200 pb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> Duplikat Eksak
                                </h2>
                                <p className="text-xs text-red-600 mb-3">Kode ini terdeteksi di file berbeda. Tidak dihitung unik.</p>
                                <textarea id="duplicate-code-display" rows="6" className="w-full p-3 border rounded-lg font-mono text-xs bg-gray-100 text-gray-700 resize-none" value={renderDuplicateList().text} readOnly />
                            </div>
                             <div id="potential-duplicates-card" className={`main-card p-6 border-l-4 border-yellow-500 ${renderPotentialDuplicates().display === 'hidden' ? 'opacity-70' : ''}`}>
                                <h2 className="text-lg font-bold text-yellow-700 mb-3 flex items-center border-b border-gray-200 pb-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> Potensi Duplikat
                                </h2>
                                <p className="text-xs text-yellow-700 mb-3">Kode dengan kesamaan tinggi. Perlu tinjauan manual.</p>
                                <textarea id="potential-duplicate-display" rows="6" className="w-full p-3 border rounded-lg font-mono text-xs bg-gray-100 text-gray-700 resize-none" value={renderPotentialDuplicates().text} readOnly />
                            </div>
                        </div>

                        <div id="raw-details-card" className={`main-card p-6 transition duration-300 ${allProcessedDetails.length === 0 ? 'opacity-50' : ''}`}>
                            <h2 className="text-xl font-bold text-title mb-4 flex items-center border-b border-gray-200 pb-3 cursor-pointer" onClick={() => setShowAllDetails(prev => !prev)}>
                                <span className="bg-navy-accent text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 text-sm font-bold">4</span> Detail Hasil Mentah ({showAllDetails ? 'Sembunyikan' : 'Tampilkan'})
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ml-auto text-gray-500 transition-transform ${showAllDetails ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </h2>
                            {showAllDetails && (
                                <textarea id="raw-details-display" rows="12" className="w-full p-3 border rounded-lg font-mono text-xs bg-gray-100 text-gray-700 resize-none" value={renderProcessedDetails().text || "Detail hasil mentah dari setiap file yang diproses akan muncul di sini."} readOnly />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =======================================================================
// === KOMPONEN LOGIN SCREEN ===
// =======================================================================
function LoginScreen({ handleLogin, statusMessage }) {
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [username, setUsername] = useState(''); // State untuk username
    const [password, setPassword] = useState(''); // State untuk password
    
    // Logika login sekarang berada di dalam handleLoginClick
    const handleLoginClick = async () => {
        if (!username || !password) {
            alert("Username dan Password wajib diisi.");
            return;
        }
        
        setIsAuthenticating(true);
        try {
            // Panggil handleLogin dari App dengan username dan password
            await handleLogin(username, password);
        } finally {
            setIsAuthenticating(false);
        }
    }
    
    return (
        <div className="min-h-screen bg-navy-accent flex items-center justify-center p-4">
             <style jsx global>{`
                .text-navy-accent { color: #0f172a; }
                .bg-navy-accent { background-color: #0f172a; }
                .bg-gold-accent { background-color: #fbbf24; }
                .bg-status-red { background-color: #fef2f2; border-color: #fca5a5; color: #b91c1c; }
                .bg-status-blue { background-color: #eff6ff; border-color: #93c5fd; color: #1d4ed8; }
            `}</style>
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl border-t-4 border-gold-accent">
                <div className="text-center mb-8">
                    <svg className="mx-auto w-12 h-12 text-navy-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2v2m4-2h-3m4 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2h2m2 4h10m0 0l-3 3m3-3l-3-3" /></svg>
                    <h1 className="text-2xl font-extrabold text-gray-800 mt-3">Panel Admin Login</h1> 
                    <p className="text-gray-500">Ekstraksi Voucher</p>
                </div>
                <div className="space-y-4">
                    {/* Input Username */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">Username</label>
                        <input 
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-navy-accent focus:border-navy-accent"
                            placeholder="Masukkan Username"
                            disabled={isAuthenticating}
                        />
                    </div>
                    {/* Input Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">Password</label>
                        <input 
                            id="password"
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-navy-accent focus:border-navy-accent"
                            placeholder="Masukkan Password"
                            disabled={isAuthenticating}
                        />
                    </div>
                    
                    <button onClick={handleLoginClick} className="w-full py-3 bg-gold-accent text-navy-accent text-lg font-bold rounded-lg hover:bg-yellow-500 transition duration-200 shadow-md flex items-center justify-center disabled:opacity-70" disabled={isAuthenticating}>
                        {isAuthenticating ? (<span className='flex items-center'><svg className="animate-spin h-5 w-5 text-navy-accent mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Memverifikasi... </span>) : 'Login'}
                    </button>
                </div>
                 {statusMessage.text && (
                    <div className={`mt-5 p-3 rounded-lg border text-sm ${statusMessage.type === 'error' ? 'bg-status-red border-red-400 text-red-800' : 'bg-status-blue border-blue-400 text-blue-800'}`} role="alert">{statusMessage.text}</div>
                )}
                <p className='text-xs text-gray-400 text-center mt-4'>Didukung oleh Py.</p>
            </div>
        </div>
    );
}

// =======================================================================
// === KOMPONEN UTAMA APP (Root Component) ===
// =======================================================================
function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('isLoggedIn') === 'true');
    const [userId, setUserId] = useState(localStorage.getItem('userId') || null); 
    const [currentPage, setCurrentPage] = useState('extraction'); 
    const [statusMessage, setStatusMessage] = useState({ text: null, type: 'info' });
    const statusTimeoutRef = useRef(null);

    const showStatus = useCallback((text, type = 'info', duration = 4000) => {
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        setStatusMessage({ text, type });
        statusTimeoutRef.current = setTimeout(() => { setStatusMessage({ text: null, type: 'info' }); }, duration);
    }, []);

    // Fungsi handleLogin dengan username: admin, password: 1234
    const handleLogin = async (inputUsername, inputPassword) => {
        const EXPECTED_USERNAME = 'admin';
        const EXPECTED_PASSWORD = '1234';

        return new Promise(resolve => {
            setTimeout(() => {
                // Lakukan validasi
                if (inputUsername === EXPECTED_USERNAME && inputPassword === EXPECTED_PASSWORD) {
                    const mockUserId = `user-${Date.now()}`;
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('userId', mockUserId);
                    setIsLoggedIn(true);
                    setUserId(mockUserId);
                    showStatus('Login berhasil! Selamat datang di Voucher Panel.', 'success');
                } else {
                    showStatus('Login gagal. Username atau Password salah.', 'error');
                }
                resolve();
            }, 1000); 
        });
    };

    const handleLogout = () => {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userId');
        setIsLoggedIn(false); 
        setUserId(null);
        showStatus('Anda telah logout. Sampai jumpa!', 'info');
    };
    
    const handleNavigate = (page) => { setCurrentPage(page); };

    const renderStatusPopup = () => (
        statusMessage.text &&
        <div className={`fixed top-4 right-4 z-[100] max-w-sm p-4 rounded-lg shadow-xl text-sm font-medium transition-opacity duration-300 ${statusMessage.type === 'error' ? 'border-red-400 bg-red-100 text-red-800' : statusMessage.type === 'success' ? 'border-green-400 bg-green-100 text-green-800' : 'border-blue-400 bg-blue-100 text-blue-800'} border`} role="alert">
            {statusMessage.text}
        </div>
    );

    return (
        <>
            {isLoggedIn && userId ? (
                <>
                    {currentPage === 'extraction' ? (
                        <AppContainer showStatus={showStatus} userId={userId} handleLogout={handleLogout} currentPage={currentPage} handleNavigate={handleNavigate} />
                    ) : (
                        <HistoryPage userId={userId} showStatus={showStatus} handleNavigate={handleNavigate} />
                    )}
                    {renderStatusPopup()}
                    <BottomNavBar currentPage={currentPage} handleNavigate={handleNavigate} />
                </>
            ) : (
                <LoginScreen handleLogin={handleLogin} statusMessage={statusMessage} />
            )}
        </>
    );
}

export default App;
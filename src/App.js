import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// --- IMPORT KOMPONEN ---
import GamesPanel from './GamesPanel'; 
import RekapanDashboard from './Rekapan'; 
import DaftarAgen from './DaftarAgen'; 
import Validator from './Validasi'; 
import ValidasiTelpon from './ValidasiTelpon'; // Memanggil fail baharu

// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE,
  messagingSenderId: process.env.REACT_APP_FIREBASE_SENDER,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Webhook ID Variable (Sesuai instruksi tersimpan [2025-12-19])
const WEBHOOK_ID = process.env.REACT_APP_WEBHOOK_ID || "WH-7821-X902"; 

const formatRP = (val) => {
    const isNegative = val < 0;
    const formatted = new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        maximumFractionDigits: 0 
    }).format(Math.abs(val) || 0);
    
    if (isNegative) {
        return `-${formatted} (Selisih Harga)`;
    }
    return formatted;
};

const CountUp = ({ value, duration = 1000 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    useEffect(() => {
        let start = 0;
        const end = parseInt(value);
        if (start === end) {
            setDisplayValue(end);
            return;
        }
        let timer = setInterval(() => {
            const step = Math.ceil(Math.abs(end) / (duration / 20));
            if (end > 0) {
                start += step;
                if (start >= end) { setDisplayValue(end); clearInterval(timer); }
                else { setDisplayValue(start); }
            } else {
                start -= step;
                if (start <= end) { setDisplayValue(end); clearInterval(timer); }
                else { setDisplayValue(start); }
            }
        }, 20);
        return () => clearInterval(timer);
    }, [value, duration]);
    return <span>{formatRP(displayValue)}</span>;
};

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [usernameInput, setUsernameInput] = useState("");
    const [passwordInput, setPasswordInput] = useState("");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
    
    const AUTH_CREDENTIALS = { 
        user: process.env.REACT_APP_ADMIN_USER || "", 
        pass: process.env.REACT_APP_ADMIN_PASS || "" 
    };

    const [currentTime, setCurrentTime] = useState(new Date());
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [currentPage, setCurrentPage] = useState('dashboard');
    
    const [balances, setBalances] = useState({ DAS: 0, AMC: 0, HAO: 0, NEWBIEZ: 0, OASIS: 0 });
    const [balanceDates, setBalanceDates] = useState({ DAS: '-', AMC: '-', HAO: '-', NEWBIEZ: '-', OASIS: '-' });
    const [yesterdayBalances, setYesterdayBalances] = useState({ DAS: 0, AMC: 0, HAO: 0, NEWBIEZ: 0, OASIS: 0 });
    
    const [totals, setTotals] = useState({ jual: 0, modal: 0, profit: 0 });
    const [dailyData, setDailyData] = useState({}); 
    const [supplierDailyUsage, setSupplierDailyUsage] = useState({});
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [topProducts, setTopProducts] = useState([]);
    
    const [uploadHistory, setUploadHistory] = useState([]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (localStorage.getItem('vpanel_auth') === 'true') setIsLoggedIn(true);

        const unsub = onSnapshot(doc(db, "admin_data", "main_report"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setBalances(data.balances || { DAS: 0, AMC: 0, HAO: 0, NEWBIEZ: 0, OASIS: 0 });
                setBalanceDates(data.balanceDates || { DAS: '-', AMC: '-', HAO: '-', NEWBIEZ: '-', OASIS: '-' });
                setTotals(data.totals || { jual: 0, modal: 0, profit: 0 });
                setDailyData(data.dailyData || {});
                setSupplierDailyUsage(data.supplierDailyUsage || {});
                setYesterdayBalances(data.yesterdayBalances || { DAS: 0, AMC: 0, HAO: 0, NEWBIEZ: 0, OASIS: 0 });
                setTopProducts(data.topProducts || []);
                setUploadHistory(data.uploadHistory || []);
            }
        });

        return () => {
            clearInterval(timer);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            unsub();
        };
    }, []);

    const handleLogin = (e) => {
        e.preventDefault();
        if (usernameInput === AUTH_CREDENTIALS.user && passwordInput === AUTH_CREDENTIALS.pass) {
            setIsLoggedIn(true);
            localStorage.setItem('vpanel_auth', 'true');
        } else {
            alert("Username atau Password Salah!");
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        localStorage.removeItem('vpanel_auth');
    };

    const syncToCloud = async (newData) => {
        try {
            await setDoc(doc(db, "admin_data", "main_report"), newData);
        } catch (err) {
            console.error("Error Syncing:", err);
            alert("Gagal sinkronisasi ke Cloud!");
        }
    };

    const handleReset = async () => {
        if(window.confirm("Hapus seluruh data (termasuk riwayat) di Cloud Web Admin?")) {
            const emptyData = {
                balances: { DAS: 0, AMC: 0, HAO: 0, NEWBIEZ: 0, OASIS: 0 },
                balanceDates: { DAS: '-', AMC: '-', HAO: '-', NEWBIEZ: '-', OASIS: '-' },
                totals: { jual: 0, modal: 0, profit: 0 },
                dailyData: {},
                supplierDailyUsage: {},
                yesterdayBalances: { DAS: 0, AMC: 0, HAO: 0, NEWBIEZ: 0, OASIS: 0 },
                topProducts: [],
                uploadHistory: []
            };
            await syncToCloud(emptyData);
            alert("Data Berhasil Direset!");
        }
    };

    const parseNum = (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        let clean = val.replace(/\./g, "").replace(/,/g, ".");
        return parseFloat(clean) || 0;
    };

    const parseFinalBalance = (text, sKey) => {
        if (!text) return null;
        if (sKey === 'AMC') {
            const amcMatch = text.match(/Rp\.?\s*([\d\.,]+)Ref/i);
            if (amcMatch) return parseNum(amcMatch[1]);
        }
        let match = text.match(/Sal\s*([\d\.,]+)/i) || text.match(/([\d\.,]+)\s*@/);
        return match ? parseNum(match[1]) : null;
    };

    const processFile = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false });

            let tempYesterday = { ...balances }; 
            let tempBalances = { ...balances };
            let tempDates = { ...balanceDates };
            let tempDaily = { ...dailyData };
            let tempUsage = { ...supplierDailyUsage };
            let lastUpdateTimes = { DAS: 0, AMC: 0, HAO: 0, NEWBIEZ: 0, OASIS: 0 };
            let newAccJual = totals.jual;
            let newAccModal = totals.modal;
            let productCounts = {};

            let countSukses = 0;
            let countGagal = 0;

            let fileStats = {
                fileName: file.name,
                uploadTime: new Date().toLocaleString('id-ID'),
                id: Date.now(),
                totalJual: 0,
                totalModal: 0,
                trxSukses: 0,
                trxGagal: 0
            };

            jsonData.forEach(row => {
                const getVal = (kws) => {
                    const key = Object.keys(row).find(k => kws.some(kw => k.trim().toLowerCase() === kw.toLowerCase()));
                    return row[key] ? String(row[key]).trim() : "";
                };
                
                const status = (getVal(['Status', 'Keterangan Status']) || "").toLowerCase();
                const kodeProduk = getVal(['Kode Produk', 'Produk', 'Kode']).toUpperCase();
                const supplierRaw = getVal(['Nama Supplier', 'Supplier']).toUpperCase() || "UNKNOWN";
                const message = getVal(['Message', 'Keterangan']);
                const tglRaw = getVal(['Tanggal', 'Waktu']);
                const currentRecordTime = new Date(tglRaw).getTime();
                const dateOnly = tglRaw.split(' ')[0];
                const hrgModal = parseNum(getVal(['Harga Modal', 'Modal', 'HPP']));
                const hrgJual = parseNum(getVal(['Harga Jual', 'Harga', 'Jual']));

                let sKey = null;
                if (supplierRaw.includes('DAS')) sKey = 'DAS';
                else if (supplierRaw.includes('AMC')) sKey = 'AMC';
                else if (supplierRaw.includes('HAO')) sKey = 'HAO';
                else if (supplierRaw.includes('NEWBIEZ')) sKey = 'NEWBIEZ';
                else if (supplierRaw.includes('OASIS')) sKey = 'OASIS';

                if (status === 'sukses' || status === 'success') {
                    countSukses++;
                    newAccModal += hrgModal;
                    newAccJual += hrgJual;
                    fileStats.totalJual += hrgJual;
                    fileStats.totalModal += hrgModal;
                    
                    if(kodeProduk) {
                        productCounts[kodeProduk] = (productCounts[kodeProduk] || 0) + 1;
                    }

                    if(!tempDaily[dateOnly]) tempDaily[dateOnly] = { jual: 0, modal: 0, profit: 0 };
                    tempDaily[dateOnly].jual += hrgJual;
                    tempDaily[dateOnly].modal += hrgModal;
                    tempDaily[dateOnly].profit += (hrgJual - hrgModal);
                    
                    if (sKey) {
                        if (!tempUsage[dateOnly]) tempUsage[dateOnly] = { DAS: 0, AMC: 0, HAO: 0, NEWBIEZ: 0, OASIS: 0 };
                        tempUsage[dateOnly][sKey] = (tempUsage[dateOnly][sKey] || 0) + hrgModal;
                    }
                } else if (status === 'gagal' || status === 'failed') {
                    countGagal++;
                }
                
                if (sKey) {
                    const saldoBaru = parseFinalBalance(message, sKey);
                    if (saldoBaru !== null && currentRecordTime >= (lastUpdateTimes[sKey] || 0)) {
                        tempBalances[sKey] = saldoBaru;
                        tempDates[sKey] = tglRaw;
                        lastUpdateTimes[sKey] = currentRecordTime;
                    }
                }
            });

            fileStats.trxSukses = countSukses;
            fileStats.trxGagal = countGagal;

            const sortedProducts = Object.entries(productCounts)
                .map(([kode, qty]) => ({ kode, qty }))
                .sort((a, b) => b.qty - a.qty)
                .slice(0, 5);

            await syncToCloud({
                balances: tempBalances,
                balanceDates: tempDates,
                totals: { jual: newAccJual, modal: newAccModal, profit: newAccJual - newAccModal },
                dailyData: tempDaily,
                yesterdayBalances: tempYesterday,
                supplierDailyUsage: tempUsage,
                topProducts: sortedProducts,
                uploadHistory: [fileStats, ...uploadHistory].slice(0, 10) 
            });
            
            alert(`File Berhasil Diproses!\nSukses: ${countSukses} Trx\nGagal: ${countGagal} Trx`);
            setCurrentPage('dashboard');
        };
        reader.readAsArrayBuffer(file);
    };

    const deleteHistoryItem = async (id) => {
        if(window.confirm("Hapus catatan riwayat ini? (Catatan: Ini hanya menghapus riwayat tampilan, tidak mengurangi total yang sudah masuk ke database utama)")) {
            const updatedHistory = uploadHistory.filter(item => item.id !== id);
            await syncToCloud({
                balances,
                balanceDates,
                totals,
                dailyData,
                yesterdayBalances,
                supplierDailyUsage,
                topProducts,
                uploadHistory: updatedHistory
            });
        }
    };

    const getSelectedDayStats = () => {
        return dailyData[filterDate] || { jual: 0, modal: 0, profit: 0 };
    };

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-600 rounded-full filter blur-3xl opacity-10"></div>
                <div className="max-w-md w-full relative">
                    <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 shadow-2xl">
                        <div className="text-center mb-10">
                            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em]">Cloud Database Terminal</p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input type="text" placeholder="Username" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white outline-none" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} />
                            <input type="password" placeholder="Password" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white outline-none" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase mt-6">Access Dashboard</button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans text-[10px] text-slate-900">
            {/* --- HEADER MOBILE --- */}
            <header className="md:hidden bg-[#0f172a] text-white p-4 sticky top-0 z-[60] shadow-xl">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center font-black text-[10px]">V</div>
                        <span className="font-black text-[10px] tracking-widest uppercase">V-PANEL</span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-2">{isSidebarOpen ? '✕' : '☰'}</button>
                </div>
                <div className="flex justify-between items-center px-1 pt-2 border-t border-white/10">
                    <div className="text-[12px] font-black text-blue-400">{currentTime.toLocaleTimeString('id-ID', { hour12: false })}</div>
                    <div className="text-[7px] font-bold text-slate-400 uppercase">{currentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                </div>
            </header>

            {/* --- SIDEBAR --- */}
            <aside className={`w-60 bg-[#0f172a] text-white p-6 fixed h-full flex flex-col z-50 transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="hidden md:flex items-center gap-3 mb-6 px-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-black">V</div>
                    <h2 className="text-sm font-black tracking-widest uppercase">V-PANEL ADMIN</h2>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 mb-8 border border-white/10">
                    <div className="text-[16px] font-black text-blue-400 mb-1">{currentTime.toLocaleTimeString('id-ID', { hour12: false })}</div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mb-3">{currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                        <span className="text-[7px] font-black uppercase text-slate-300">{isOnline ? 'Jam Saat Ini' : 'Offline Mode'}</span>
                    </div>
                </div>
                <nav className="space-y-2 flex-grow overflow-y-auto">
                    <button onClick={() => {setCurrentPage('dashboard'); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold ${currentPage === 'dashboard' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>📊 Dashboard</button>
                    <button onClick={() => {setCurrentPage('rekapan'); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold ${currentPage === 'rekapan' ? 'bg-indigo-600 shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>💰 Rekap Operasional</button>
                    <button onClick={() => {setCurrentPage('validator'); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold ${currentPage === 'validator' ? 'bg-sky-600 shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>🔍 Telkomsel/Byu Validasi</button>
                    <button onClick={() => {setCurrentPage('upload'); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold ${currentPage === 'upload' ? 'bg-blue-600' : 'text-slate-400 hover:bg-white/5'}`}>📤 Upload Data</button>
                    <button onClick={() => {setCurrentPage('agen'); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold ${currentPage === 'agen' ? 'bg-orange-600 shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>👥 Daftar Agen</button>
                    <button onClick={() => {setCurrentPage('v-telpon'); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold ${currentPage === 'v-telpon' ? 'bg-emerald-600' : 'text-slate-400 hover:bg-white/5'}`}>📞 Validasi Paket Telpon</button>
                    <button onClick={() => {setCurrentPage('games'); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold ${currentPage === 'games' ? 'bg-violet-600' : 'text-slate-400 hover:bg-white/5'}`}>🎮 Games Panel</button>
                </nav>
                <div className="mt-auto pt-6 border-t border-slate-800 space-y-3">
                    <button onClick={handleReset} className="w-full text-left p-3 rounded-xl font-bold text-red-400 hover:bg-red-500/10 text-[9px]">🗑️ RESET DATA</button>
                    <button onClick={handleLogout} className="w-full text-left p-3 rounded-xl font-bold text-slate-400 hover:bg-white/5 text-[9px]">🔓 KELUAR</button>
                </div>
            </aside>

            {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden"></div>}

            {/* --- MAIN CONTENT --- */}
            <main className="flex-grow md:ml-60 p-4 md:p-10">
                {currentPage === 'dashboard' ? (
                    <div className="max-w-5xl mx-auto space-y-4 md:space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Jual (Semua)</p>
                                <h3 className="text-xl md:text-2xl font-black text-blue-600"><CountUp value={totals.jual} /></h3>
                            </div>
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Modal (Semua)</p>
                                <h3 className="text-xl md:text-2xl font-black text-slate-600"><CountUp value={totals.modal} /></h3>
                            </div>
                            <div className={`bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 ${totals.profit < 0 ? 'bg-red-50/20' : 'bg-emerald-50/20'}`}>
                                <p className={`text-[8px] font-black uppercase tracking-widest mb-2 ${totals.profit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    {totals.profit < 0 ? 'Total Selisih Harga' : 'Total Profit (Semua)'}
                                </p>
                                <h3 className={`text-xl md:text-2xl font-black ${totals.profit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                    <CountUp value={totals.profit} />
                                </h3>
                            </div>
                        </div>

                        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-xl">🔥</span>
                                <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-wider">Top 5 Produk Terlaris</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="pb-4 text-[8px] font-black text-slate-400 uppercase">Peringkat</th>
                                            <th className="pb-4 text-[8px] font-black text-slate-400 uppercase">Kode Produk</th>
                                            <th className="pb-4 text-[8px] font-black text-slate-400 uppercase text-right">Total Transaksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topProducts.length > 0 ? topProducts.map((prod, idx) => (
                                            <tr key={idx} className="border-b border-slate-50 last:border-0">
                                                <td className="py-4">
                                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white ${idx === 0 ? 'bg-amber-400' : 'bg-slate-200'}`}>
                                                        {idx + 1}
                                                    </span>
                                                </td>
                                                <td className="py-4 font-black text-slate-700 text-[10px]">{prod.kode}</td>
                                                <td className="py-4 text-right font-bold text-blue-600 text-[10px]">{prod.qty} x</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="3" className="py-8 text-center text-slate-400 font-bold uppercase text-[8px]">Belum ada data upload</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📅</span>
                                    <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-wider">Statistik Harian</h3>
                                </div>
                                <input type="date" className="w-full md:w-auto bg-slate-50 border p-2 px-6 rounded-full font-black text-[10px] text-blue-600" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100">
                                    <p className="text-[7px] font-black text-blue-400 uppercase mb-1">Jual ({filterDate})</p>
                                    <p className="text-sm font-black text-blue-700">{formatRP(getSelectedDayStats().jual)}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                                    <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Modal ({filterDate})</p>
                                    <p className="text-sm font-black text-slate-700">{formatRP(getSelectedDayStats().modal)}</p>
                                </div>
                                <div className={`p-4 rounded-2xl border ${getSelectedDayStats().profit < 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                    <p className={`text-[7px] font-black uppercase mb-1 ${getSelectedDayStats().profit < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {getSelectedDayStats().profit < 0 ? 'Selisih Harga' : 'Profit'} ({filterDate})
                                    </p>
                                    <p className={`text-sm font-black ${getSelectedDayStats().profit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                        {formatRP(getSelectedDayStats().profit)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pb-10">
                            {['DAS', 'AMC', 'HAO', 'NEWBIEZ', 'OASIS'].map(name => (
                                <div key={name} className="bg-[#1e293b] text-white p-5 rounded-[2rem] shadow-xl relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <span className="text-blue-400 font-black tracking-widest text-[8px] uppercase">{name}</span>
                                        <div className="text-right">
                                            <p className="text-[6px] text-slate-500 uppercase font-black">Saldo Kemarin</p>
                                            <p className="text-amber-400 font-bold text-[9px]">{formatRP(yesterdayBalances[name] || 0)}</p>
                                        </div>
                                    </div>
                                    <p className="text-[7px] text-slate-400 font-bold uppercase mb-1">Saldo Terakhir</p>
                                    <h3 className="text-lg md:text-xl font-black text-white"><CountUp value={balances[name]} /></h3>
                                    <div className="pt-3 mt-3 border-t border-white/5 text-[7px] text-slate-500 font-bold uppercase">
                                        Pakai: <span className="text-emerald-400">-{formatRP(supplierDailyUsage[filterDate]?.[name] || 0)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : currentPage === 'rekapan' ? (
                    <RekapanDashboard 
                        balances={balances} 
                        yesterdayBalances={yesterdayBalances}
                        supplierDailyUsage={supplierDailyUsage}
                        filterDate={filterDate}
                        webhookId={WEBHOOK_ID} 
                        totalProfit={totals.profit} 
                        dailyStats={{
                            totalTrx: (uploadHistory[0]?.trxSukses || 0) + (uploadHistory[0]?.trxGagal || 0),
                            successTrx: uploadHistory[0]?.trxSukses || 0,
                            failedTrx: uploadHistory[0]?.trxGagal || 0,
                            totalSales: getSelectedDayStats().jual,
                            totalCost: getSelectedDayStats().modal,
                            successRate: uploadHistory[0]?.trxSukses 
                                ? ((uploadHistory[0].trxSukses / (uploadHistory[0].trxSukses + uploadHistory[0].trxGagal)) * 100).toFixed(1) 
                                : 0
                        }}
                    />
                ) : currentPage === 'validator' ? (
                    <Validator />
                ) : currentPage === 'agen' ? (
                    <DaftarAgen />
                ) : currentPage === 'v-telpon' ? (
                    <ValidasiTelpon /> // Menggunakan komponen baharu
                ) : currentPage === 'games' ? (
                    <GamesPanel />
                ) : (
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="bg-white p-8 md:p-16 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl text-center border-4 border-dashed border-slate-100">
                             <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-2xl md:text-3xl mx-auto mb-8">📤</div>
                             <h2 className="text-xl md:text-2xl font-black mb-4 uppercase text-slate-800">Import Data ke Cloud</h2>
                             <p className="text-slate-400 text-[9px] md:text-[10px] mb-10 max-w-xs mx-auto font-medium uppercase tracking-widest leading-relaxed">Sinkronisasi data ke seluruh perangkat admin.</p>
                             <input type="file" accept=".xlsx, .xls" onChange={(e) => processFile(e.target.files[0])} className="hidden" id="fUp" />
                             <label htmlFor="fUp" className="inline-block bg-blue-600 text-white px-10 md:px-16 py-4 md:py-5 rounded-[1.5rem] md:rounded-[2rem] font-black cursor-pointer shadow-xl hover:scale-105 transition-all uppercase tracking-widest">Pilih Dokumen Excel</label>
                        </div>

                        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-xl">📜</span>
                                <h3 className="text-[11px] font-black uppercase text-slate-800 tracking-wider">Riwayat Upload Terakhir</h3>
                            </div>
                            <div className="space-y-3">
                                {uploadHistory.length > 0 ? uploadHistory.map((item) => (
                                    <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-black">XLS</div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-800 truncate max-w-[200px]">{item.fileName}</p>
                                                <p className="text-[7px] font-bold text-slate-400 uppercase">{item.uploadTime}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end gap-6">
                                            <div className="text-right">
                                                <p className="text-[7px] font-black text-emerald-600 uppercase">Sukses</p>
                                                <p className="text-[10px] font-black">{item.trxSukses || 0} Trx</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[7px] font-black text-red-500 uppercase">Gagal</p>
                                                <p className="text-[10px] font-black">{item.trxGagal || 0} Trx</p>
                                            </div>
                                            <div className="text-right min-w-[100px]">
                                                <p className="text-[7px] font-black text-blue-500 uppercase">Input Jual</p>
                                                <p className="text-[9px] font-bold">{formatRP(item.totalJual)}</p>
                                            </div>
                                            <button onClick={() => deleteHistoryItem(item.id)} className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-center py-10 text-slate-400 font-bold uppercase text-[8px]">Tidak ada riwayat upload</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesionGrid } from 'recharts';

// --- IMPORT KOMPONEN ---
import GamesPanel from './GamesPanel'; 
import RekapanDashboard from './Rekapan'; 
import DaftarAgen from './DaftarAgen'; 
import Validator from './Validasi'; 
import LogSpeedPanel from './Speed'; 
import ValidasiTelpon from './ValidasiTelpon'; 

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

// --- TELEGRAM CONFIG ---
const TELEGRAM_TOKEN = "8571888481:AAGdqdiaa4kPd_YWqfZauELZ1-ACiMV0iYg";
const TELEGRAM_CHAT_ID = "-1003574594574";
const LOW_BALANCE_THRESHOLD = 500000; 

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

const CountUp = ({ value, hide }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const frameRef = useRef();
    const startTimeRef = useRef();
    const duration = 1000; 

    useEffect(() => {
        const end = parseInt(value) || 0;
        const start = displayValue;
        
        if (start === end) return;

        const animate = (timestamp) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const progress = timestamp - startTimeRef.current;
            const percentage = Math.min(progress / duration, 1);
            
            const easeOutQuart = 1 - Math.pow(1 - percentage, 4);
            const currentCount = Math.floor(start + (end - start) * easeOutQuart);
            
            setDisplayValue(currentCount);

            if (percentage < 1) {
                frameRef.current = requestAnimationFrame(animate);
            }
        };

        startTimeRef.current = null;
        frameRef.current = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(frameRef.current);
    }, [value]);

    if (hide) return <span>••••••</span>;
    return <span>{formatRP(displayValue)}</span>;
};

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [usernameInput, setUsernameInput] = useState("");
    const [passwordInput, setPasswordInput] = useState("");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
    const [isSyncing, setIsSyncing] = useState(false);
    
    // --- STATE FITUR UI/UX & MIKRO INTERAKSI ---
    const [showBalance, setShowBalance] = useState(true);
    const [searchHistory, setSearchHistory] = useState("");
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    
    const AUTH_CREDENTIALS = { 
        user: process.env.REACT_APP_ADMIN_USER || "", 
        pass: process.env.REACT_APP_ADMIN_PASS || "" 
    };

    const [currentTime, setCurrentTime] = useState(new Date());
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [currentPage, setCurrentPage] = useState('dashboard');
    
    const [balances, setBalances] = useState({ DAS: 0, AMC: 0, HAO: 0, NEWBIEZ: 0, OASIS: 0, ANTUM: 0 });
    const [balanceDates, setBalanceDates] = useState({ DAS: '-', AMC: '-', HAO: '-', NEWBIEZ: '-', OASIS: '-', ANTUM: '-' });
    const [yesterdayBalances, setYesterdayBalances] = useState({ DAS: 0, AMC: 0, HAO: 0, NEWBIEZ: 0, OASIS: 0, ANTUM: 0 });
    
    const [totals, setTotals] = useState({ jual: 0, modal: 0, profit: 0 });
    const [dailyData, setDailyData] = useState({}); 
    const [supplierDailyUsage, setSupplierDailyUsage] = useState({});
    
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [topProducts, setTopProducts] = useState([]);
    const [uploadHistory, setUploadHistory] = useState([]);

    // --- FUNGSI TOAST NOTIFIKASI ---
    const showToast = (message, type = "success") => {
        setToast({ show: true, message, type });
    };

    useEffect(() => {
        if (!toast.show) return;
        const timer = setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
        return () => clearTimeout(timer);
    }, [toast.show]);

    // Deteksi Scroll untuk Floating Button (Aman dari lag)
    useEffect(() => {
        let ticking = false;
        const handleScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    setShowScrollBtn(window.scrollY > 300);
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
                setBalances(data.balances || { DAS: 0, AMC: 0, HAO: 0, NEWBIEZ: 0, OASIS: 0, ANTUM: 0 });
                setBalanceDates(data.balanceDates || { DAS: '-', AMC: '-', HAO: '-', NEWBIEZ: '-', OASIS: '-', ANTUM: '-' });
                setTotals(data.totals || { jual: 0, modal: 0, profit: 0 });
                setDailyData(data.dailyData || {});
                setSupplierDailyUsage(data.supplierDailyUsage || {});
                setYesterdayBalances(data.yesterdayBalances || { DAS: 0, AMC: 0, HAO: 0, NEWBIEZ: 0, OASIS: 0, ANTUM: 0 });
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

    const sendTelegramAlert = async (supplierName, currentBalance) => {
        const message = `⚠️ *PERINGATAN: SALDO MENIPIS!*
        
Supplier: *${supplierName}*
Sisa Saldo: *${formatRP(currentBalance)}*

_Mohon segera lakukan deposit ulang._`;
        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
        } catch (err) {
            console.error("Gagal mengirim notif Telegram:", err);
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (usernameInput === AUTH_CREDENTIALS.user && passwordInput === AUTH_CREDENTIALS.pass) {
            setIsLoggedIn(true);
            localStorage.setItem('vpanel_auth', 'true');
            showToast("Berhasil masuk ke sistem access panel", "success");
        } else {
            showToast("Username atau password salah!", "error");
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        localStorage.removeItem('vpanel_auth');
    };

    const syncToCloud = async (newData) => {
        setIsSyncing(true);
        try {
            await setDoc(doc(db, "admin_data", "main_report"), newData);
            setTimeout(() => setIsSyncing(false), 600);
        } catch (err) {
            console.error("Error Syncing:", err);
            setIsSyncing(false);
            showToast("Gagal sinkronisasi data ke cloud!", "error");
        }
    };

    const handleReset = async () => {
        if(window.confirm("Hapus seluruh data (termasuk riwayat) di Cloud Web Admin?")) {
            const emptyData = {
                balances: { DAS: 0, AMC: 0, HAO: 0, NEWBIEZ: 0, OASIS: 0, ANTUM: 0 },
                balanceDates: { DAS: '-', AMC: '-', HAO: '-', NEWBIEZ: '-', OASIS: '-', ANTUM: '-' },
                totals: { jual: 0, modal: 0, profit: 0 },
                dailyData: {},
                supplierDailyUsage: {},
                yesterdayBalances: { DAS: 0, AMC: 0, HAO: 0, NEWBIEZ: 0, OASIS: 0, ANTUM: 0 },
                topProducts: [],
                uploadHistory: []
            };
            await syncToCloud(emptyData);
            showToast("Seluruh database cloud berhasil direset!", "success");
        }
    };

    const parseNum = (val, isAntum = false) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        
        let clean = val.trim();
        
        if (isAntum) {
            clean = clean.replace(/,/g, "").replace(/\./g, "");
        } else {
            clean = clean.replace(/\./g, "").replace(/,/g, ".");
        }
        
        return parseFloat(clean) || 0;
    };

    const parseFinalBalance = (text, sKey) => {
        if (!text) return null;
        
        if (sKey === 'AMC') {
            const amcMatch = text.match(/Rp\.?\s*([\d\.,]+)Ref/i);
            if (amcMatch) return parseNum(amcMatch[1]);
        }
        if (sKey === 'OASIS') {
            const oasisMatch = text.match(/Rp\.?\s*([\d\.,]+),/i);
            if (oasisMatch) return parseNum(oasisMatch[1]);
        }
        
        if (sKey === 'ANTUM') {
            const antumMatch = text.match(/=\s*([\d\.,]+)(?=\.)/i) || text.match(/=\s*([\d\.,]+)/i);
            if (antumMatch) return parseNum(antumMatch[1], true);
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
            let lastUpdateTimes = { DAS: 0, AMC: 0, HAO: 0, NEWBIEZ: 0, OASIS: 0, ANTUM: 0 };
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
                const kodeProduk = (getVal(['Kode Produk', 'Produk', 'Kode']) || "").toUpperCase();
                const supplierRaw = (getVal(['Nama Supplier', 'Supplier']) || "UNKNOWN").toUpperCase();
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
                else if (supplierRaw.includes('ANTUM')) sKey = 'ANTUM';

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
                        if (!tempUsage[dateOnly]) tempUsage[dateOnly] = { DAS: 0, AMC: 0, HAO: 0, NEWBIEZ: 0, OASIS: 0, ANTUM: 0 };
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

            Object.entries(tempBalances).forEach(([name, bal]) => {
                if (bal > 0 && bal < LOW_BALANCE_THRESHOLD) {
                    sendTelegramAlert(name, bal);
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
            
            showToast(`File diproses! ${countSukses} Sukses & ${countGagal} Gagal.`, "success");
            setCurrentPage('dashboard');
        };
        reader.readAsArrayBuffer(file);
    };

    const deleteHistoryItem = async (id) => {
        if(window.confirm("Hapus catatan riwayat ini?")) {
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
            showToast("Item riwayat berhasil dihapus", "success");
        }
    };

    const rangeStats = useMemo(() => {
        let rangeJual = 0;
        let rangeModal = 0;
        let rangeProfit = 0;

        Object.keys(dailyData).forEach(date => {
            if (date >= startDate && date <= endDate) {
                rangeJual += dailyData[date].jual || 0;
                rangeModal += dailyData[date].modal || 0;
                rangeProfit += dailyData[date].profit || 0;
            }
        });

        return { jual: rangeJual, modal: rangeModal, profit: rangeProfit };
    }, [dailyData, startDate, endDate]);

    const getChartData = (sKey) => {
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            last7Days.push({
                date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                usage: supplierDailyUsage[dateStr]?.[sKey] || 0
            });
        }
        return last7Days;
    };

    const getCombinedTotalChartData = () => {
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            last7Days.push({
                date: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                Jual: dailyData[dateStr]?.jual || 0,
                Profit: dailyData[dateStr]?.profit || 0
            });
        }
        return last7Days;
    };

    // --- QUICK FILTER SHORTCUT PERIODS ---
    const setPeriodShortcut = (days) => {
        const end = new Date().toISOString().split('T')[0];
        const startDay = new Date();
        startDay.setDate(startDay.getDate() - days);
        const start = startDay.toISOString().split('T')[0];
        setStartDate(start);
        setEndDate(end);
        showToast(`Filter: ${days === 0 ? 'Hari Ini' : days + 1 + ' Hari Terakhir'}`, "success");
    };

    // --- COPY TEXT UTILITY ---
    const handleCopyText = (text) => {
        navigator.clipboard.writeText(text);
        showToast(`Disalin: ${text}`, "success");
    };

    // --- FILTER SEARCH DATA LOG RECENT ---
    const filteredUploadHistory = useMemo(() => {
        return uploadHistory.filter(item => 
            item.fileName.toLowerCase().includes(searchHistory.toLowerCase())
        );
    }, [uploadHistory, searchHistory]);

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-[#f5f5f9] flex items-center justify-center p-4 font-sans">
                <div className="max-w-md w-full relative">
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl">
                        <div className="text-center mb-8">
                            <div className="w-14 h-14 bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl text-white mx-auto mb-4 shadow-md shadow-indigo-500/20 tracking-tighter">I</div>
                            <h2 className="text-slate-800 font-extrabold text-xl tracking-tight">INTEGRETED</h2>
                            <p className="text-slate-400 text-xs mt-1">Cloud Core Terminal Management</p>
                        </div>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <input type="text" placeholder="Username" className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 transition-all" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} />
                            </div>
                            <div>
                                <input type="password" placeholder="Password" className="w-full bg-white border border-slate-300 rounded-xl py-3 px-4 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 transition-all" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-indigo-500/10 mt-6">Access Dashboard</button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f5f5f9] flex flex-col md:flex-row font-sans text-xs text-slate-600 antialiased relative">
            
            {/* FLOATING INTERNAL TOAST NOTIFICATION */}
            {toast.show && (
                <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl bg-slate-900 text-white transition-all duration-300`}>
                    <span className="text-sm">{toast.type === 'error' ? '❌' : '⚡'}</span>
                    <span className="font-bold tracking-wide text-xs">{toast.message}</span>
                </div>
            )}

            {/* LIGHTWEIGHT FLOATING SCROLL BUTTON */}
            {showScrollBtn && (
                <button 
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="fixed bottom-5 right-5 z-50 w-10 h-10 bg-indigo-600 text-white rounded-xl shadow-lg flex items-center justify-center text-sm"
                >
                    ▲
                </button>
            )}

            {/* HEADER MOBILE GLASSMORPHISM */}
            <header className="md:hidden bg-white border-b border-slate-200 text-slate-800 px-5 py-4 sticky top-0 z-[60] shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center font-black text-sm text-white">I</div>
                    <div className="flex flex-col">
                        <span className="font-black text-xs tracking-wider uppercase text-slate-800">INTEGRETED</span>
                        <span className="text-[8px] text-indigo-600 font-bold tracking-widest uppercase -mt-0.5">ADMIN APP</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowBalance(!showBalance)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-xs">
                        {showBalance ? '👁️' : '🙈'}
                    </button>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 border border-slate-200 text-sm">
                        {isSidebarOpen ? '✕' : '☰'}
                    </button>
                </div>
            </header>

            {/* PREMIUM SIDEBAR TEMPLATE (SNEAT-STYLE LIGHT VERSION) */}
            <aside className={`w-64 bg-white text-slate-700 p-5 fixed h-full flex flex-col z-50 transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} pt-20 md:pt-6 border-r border-slate-200 shadow-sm`}>
                
                {/* BRAND LOGO UNIT (DESKTOP) */}
                <div className="hidden md:flex items-center gap-3 mb-8 px-1">
                    <div className="w-9 h-9 bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center font-black text-base text-white shadow-md shadow-indigo-500/20">
                        <span>I</span>
                    </div>
                    <div className="flex flex-col">
                        <h2 className="text-sm font-black tracking-widest uppercase text-slate-800">IFY-ADMIN</h2>
                        <span className="text-[9px] font-extrabold text-indigo-600 tracking-widest uppercase -mt-0.5">CORE TERMINAL</span>
                    </div>
                </div>

                {/* NAVIGATION MENU */}
                <nav className="space-y-1 flex-grow overflow-y-auto pr-1">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: '📋' },
                        { id: 'rekapan', label: 'Rekap Operasional', icon: '💰' },
                        { id: 'validator', label: 'Validasi & Broadcast', icon: '🔔' },
                        { id: 'upload', label: 'Upload Data', icon: '📤' },
                        { id: 'agen', label: 'Daftar Agen', icon: '👥' },
                        { id: 'v-telpon', label: 'Validasi Paket Telpon', icon: '📞' },
                        { id: 'games', label: 'Games Panel', icon: '🎮' },
                        { id: 'speed', label: 'Log Speed Panel', icon: '⚡' }
                    ].map((menu) => {
                        const isActive = currentPage === menu.id;
                        return (
                            <button 
                                key={menu.id}
                                onClick={() => {setCurrentPage(menu.id); setIsSidebarOpen(false)}} 
                                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-xs transition-all duration-200 ${
                                    isActive 
                                    ? 'bg-indigo-50 text-indigo-600 font-bold shadow-sm border-l-4 border-indigo-600' 
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                <span className="text-sm">{menu.icon}</span>
                                <span className="tracking-wide">{menu.label}</span>
                            </button>
                        );
                    })}
                </nav>
                
                {/* FOOTER BUTTONS */}
                <div className="mt-auto pt-4 border-t border-slate-200 space-y-1">
                    <button onClick={handleReset} className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-red-500 hover:bg-red-50 text-[10px] uppercase tracking-wider transition-colors">
                        🗑️ <span>Reset Database</span>
                    </button>
                    <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 text-[10px] uppercase tracking-wider transition-colors">
                        🚪 <span>Keluar Sesi</span>
                    </button>
                </div>
            </aside>

            {/* BACKDROP FOR MOBILE */}
            {isSidebarOpen && <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-slate-900/20 z-40 md:hidden"></div>}

            {/* MAIN CONTENT CONTAINER */}
            <main className={`flex-grow md:ml-64 transition-all duration-300 ${currentPage === 'games' ? 'p-0 bg-transparent' : 'p-4 md:p-8'}`}>
                
                {/* TOP BAR / HEADER BAR */}
                {currentPage !== 'games' && (
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 max-w-6xl mx-auto bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-slate-800 capitalize">Menu / {currentPage}</span>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full font-bold text-[9px]">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                {isOnline ? 'ONLINE' : 'OFFLINE'}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-slate-400 font-mono font-medium">{currentTime.toLocaleTimeString('id-ID')}</span>
                            <button 
                                onClick={() => { setShowBalance(!showBalance); showToast(showBalance ? "Privacy Mode Active" : "Privacy Mode Inactive", "success"); }}
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-all text-[10px] uppercase tracking-wider"
                            >
                                <span>{showBalance ? '👁️ Hide Nominal' : '👁️‍🗨️ Show Nominal'}</span>
                            </button>
                        </div>
                    </div>
                )}

                {isSyncing && currentPage !== 'games' && (
                    <div className="w-full max-w-6xl mx-auto mb-4 bg-indigo-50 border border-indigo-200 text-indigo-600 rounded-xl px-4 py-2 flex items-center justify-between animate-pulse">
                        <span className="font-bold text-[10px] uppercase tracking-wide">Syncing data to Cloud Firestore...</span>
                        <span className="text-xs">⏳</span>
                    </div>
                )}

                {currentPage === 'dashboard' ? (
                    <div className="max-w-6xl mx-auto space-y-6">
                        
                        {/* HERO WELCOME BANNER (SIMILAR TO SNEAT 'CONGRATULATIONS JOHN') */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between relative overflow-hidden lg:col-span-2">
                                <div className="space-y-2 max-w-md">
                                    <h2 className="text-base font-extrabold text-indigo-600">Selamat Datang Kembali Admin! 🎉</h2>
                                    <p className="text-slate-400 text-xs leading-relaxed">Dashboard operasional terpantau aman dan sinkronisasi berjalan normal. Berikut adalah ringkasan performa finansial akumulatif Anda saat ini.</p>
                                    <button onClick={() => setCurrentPage('upload')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg shadow-sm tracking-wide uppercase transition-all">Upload File Laporan</button>
                                </div>
                                <div className="text-5xl hidden sm:block opacity-20 filter grayscale">📊</div>
                            </div>

                            {/* TOTAL PROFIT BOX WITH CIRCULAR INTERACTION LOOK */}
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-lg text-emerald-500 border border-emerald-100">📈</div>
                                    <span className="text-emerald-500 bg-emerald-50 font-bold px-2 py-0.5 rounded text-[10px]">+All Time</span>
                                </div>
                                <div className="mt-4">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Profit Bersih</p>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight mt-1">
                                        <CountUp value={totals.profit} hide={!showBalance} />
                                    </h3>
                                </div>
                            </div>
                        </div>

                        {/* ACCUMULATED SALES & COST STATS CARDS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-xl text-indigo-600 border border-indigo-100">💳</div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Nilai Jual (Omset)</p>
                                    <h3 className="text-lg font-black text-slate-800 mt-0.5">
                                        <CountUp value={totals.jual} hide={!showBalance} />
                                    </h3>
                                </div>
                            </div>
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-xl text-slate-500 border border-slate-200">📥</div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Harga Modal (HPP)</p>
                                    <h3 className="text-lg font-black text-slate-800 mt-0.5">
                                        <CountUp value={totals.modal} hide={!showBalance} />
                                    </h3>
                                </div>
                            </div>
                        </div>

                        {/* RENDER DUAL GRAPH - TOTAL REVENUE & DATA ANALYTICS */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">Analisis Performa 7 Hari Terakhir</h3>
                                    <p className="text-slate-400 text-[11px] mt-0.5">Perbandingan fluktuasi grafik Jual dan Profit operasional harian.</p>
                                </div>
                                <div className="flex items-center gap-4 font-bold text-[10px]">
                                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span> OMSET JUAL</div>
                                    <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span> PROFIT</div>
                                </div>
                            </div>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={getCombinedTotalChartData()}>
                                        <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', fontSize: '11px' }}
                                        />
                                        <Line type="monotone" dataKey="Jual" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="Profit" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* TOP PRODUCTS & FILTER RANGE SECTION */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* TOP 5 PRODUCTS */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-base">🔥</span>
                                    <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">Top 5 Produk Terlaris</h3>
                                </div>
                                <div className="space-y-2">
                                    {topProducts.map((prod, idx) => (
                                        <div 
                                            key={idx} 
                                            onClick={() => handleCopyText(prod.kode)}
                                            title="Klik untuk menyalin"
                                            className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:bg-indigo-50/50 hover:border-indigo-200 active:scale-[0.99] transition-all cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${idx === 0 ? 'bg-indigo-600 shadow-sm' : 'bg-slate-300'}`}>{idx + 1}</span>
                                                <span className="font-bold text-slate-700 font-mono text-xs">{prod.kode}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-extrabold text-indigo-600 text-xs bg-indigo-50 px-2 py-0.5 rounded-md">{prod.qty} x</span>
                                            </div>
                                        </div>
                                    ))}
                                    {topProducts.length === 0 && <p className="text-slate-400 text-center py-4">Belum ada data</p>}
                                </div>
                            </div>

                            {/* FILTER RANGE CARD WITH SNEAT LAYOUT GRID */}
                            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col justify-between">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">📅</span>
                                            <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">Filter Range Tanggal</h3>
                                        </div>
                                        <div className="flex gap-1 mt-1">
                                            <button onClick={() => setPeriodShortcut(0)} className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-lg font-bold text-[9px] uppercase tracking-wide transition-colors">Hari ini</button>
                                            <button onClick={() => setPeriodShortcut(6)} className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-lg font-bold text-[9px] uppercase tracking-wide transition-colors">7 Hari</button>
                                            <button onClick={() => setPeriodShortcut(29)} className="bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 px-2.5 py-1 rounded-lg font-bold text-[9px] uppercase tracking-wide transition-colors">30 Hari</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                                        <input type="date" className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-bold text-xs text-indigo-600 outline-none w-full sm:w-auto" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                                        <span className="text-slate-400 font-bold text-xs">s/d</span>
                                        <input type="date" className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-bold text-xs text-indigo-600 outline-none w-full sm:w-auto" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                                    <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100">
                                        <p className="text-[9px] font-bold text-indigo-400 uppercase mb-0.5">Jual (Range)</p>
                                        <p className="text-sm font-black text-indigo-700 tracking-tight">
                                            {showBalance ? formatRP(rangeStats.jual) : "••••••"}
                                        </p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">Modal (Range)</p>
                                        <p className="text-sm font-black text-slate-700 tracking-tight">
                                            {showBalance ? formatRP(rangeStats.modal) : "••••••"}
                                        </p>
                                    </div>
                                    <div className={`p-4 rounded-xl border ${rangeStats.profit < 0 ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                                        <p className={`text-[9px] font-bold uppercase mb-0.5 ${rangeStats.profit < 0 ? 'text-red-400' : 'text-emerald-500'}`}>Profit (Range)</p>
                                        <p className={`text-sm font-black tracking-tight ${rangeStats.profit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                            {showBalance ? formatRP(rangeStats.profit) : "••••••"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SUPPLIER CARDS SECTION GRID */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-8">
                            {['DAS', 'AMC', 'HAO', 'NEWBIEZ', 'OASIS', 'ANTUM'].map(name => {
                                const currentBal = balances[name] || 0;
                                const safePercentage = Math.min((currentBal / 5000000) * 100, 100);
                                
                                return (
                                    <div key={name} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 transition-all duration-200 hover:shadow-md flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-indigo-600 font-extrabold tracking-widest text-[10px] uppercase bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{name}</span>
                                                <div className="text-right">
                                                    <p className="text-[8px] text-slate-400 uppercase font-bold">Kemarin</p>
                                                    <p className="text-slate-600 font-bold font-mono text-[11px]">
                                                        {showBalance ? formatRP(yesterdayBalances[name] || 0) : "••••••"}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <h3 className="text-base font-black text-slate-800 font-mono tracking-tight">
                                                <CountUp value={balances[name]} hide={!showBalance} />
                                            </h3>
                                            
                                            {/* LINECHART PER SUPPLIER USING SNEAT MATRICES */}
                                            <div className="h-12 mt-3 opacity-80">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={getChartData(name)}>
                                                        {showBalance && (
                                                            <Tooltip 
                                                                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '9px' }}
                                                                formatter={(value) => [formatRP(value), 'Usage']}
                                                            />
                                                        )}
                                                        <Line isAnimationActive={false} type="monotone" dataKey="usage" stroke="#6366f1" strokeWidth={2} dot={false} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {/* LINEAR PROGRESS BAR TRACK */}
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-300 ${currentBal < LOW_BALANCE_THRESHOLD ? 'bg-red-500' : 'bg-indigo-600'}`}
                                                    style={{ width: `${safePercentage}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex justify-between items-center">
                                            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide">Hari Ini</span>
                                            <span className="text-red-500 font-extrabold font-mono text-[10px]">
                                                {showBalance ? `-${formatRP(supplierDailyUsage[endDate]?.[name] || 0)}` : "••••••"}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : currentPage === 'rekapan' ? (
                    <RekapanDashboard 
                        balances={balances} 
                        yesterdayBalances={yesterdayBalances}
                        supplierDailyUsage={supplierDailyUsage}
                        filterDate={endDate}
                        webhookId={WEBHOOK_ID}
                        totalProfit={totals.profit} 
                        dailyStats={{
                            totalTrx: (uploadHistory[0]?.trxSukses || 0) + (uploadHistory[0]?.trxGagal || 0),
                            successTrx: uploadHistory[0]?.trxSukses || 0,
                            failedTrx: uploadHistory[0]?.trxGagal || 0,
                            totalSales: dailyData[endDate]?.jual || 0,
                            totalCost: dailyData[endDate]?.modal || 0,
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
                    <ValidasiTelpon />
                ) : currentPage === 'games' ? (
                    <GamesPanel />
                ) : currentPage === 'speed' ? (
                    <LogSpeedPanel /> 
                ) : (
                    /* UPLOAD PAGE */
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm text-center border-2 border-dashed border-slate-200 bg-gradient-to-b from-white to-slate-50/30">
                             <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl mx-auto mb-5 shadow-inner">📤</div>
                             <h2 className="text-sm font-black mb-1.5 uppercase text-slate-800 tracking-wide">Import Data ke Cloud</h2>
                             <p className="text-slate-400 text-xs mb-6 max-w-sm mx-auto">Silakan pilih file laporan berformat Excel (.xlsx, .xls) atau .csv untuk sinkronisasi database harian.</p>
                             <input type="file" accept=".xlsx, .xls, .csv" onChange={(e) => processFile(e.target.files[0])} className="hidden" id="fUp" />
                             <label htmlFor="fUp" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold cursor-pointer shadow-md shadow-indigo-600/10 active:scale-[0.98] transition-transform text-xs uppercase tracking-wider">Pilih Dokumen Excel</label>
                        </div>

                        {/* UPLOAD HISTORY CARD */}
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-base">📜</span>
                                    <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">Riwayat Upload Terakhir</h3>
                                </div>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="Cari nama log file..." 
                                        value={searchHistory}
                                        onChange={(e) => setSearchHistory(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-semibold text-xs outline-none w-full sm:w-48 pl-7 text-slate-700"
                                    />
                                    <span className="absolute left-2.5 top-2 opacity-40">🔍</span>
                                </div>
                            </div>
                            
                            <div className="space-y-2.5">
                                {filteredUploadHistory.map((item) => (
                                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl gap-3 hover:bg-slate-100/40 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-extrabold text-[11px] border border-emerald-100">XLS</div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 tracking-tight break-all">{item.fileName}</p>
                                                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{item.uploadTime}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                                            <div className="text-right">
                                                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">Sukses</p>
                                                <p className="text-xs font-extrabold text-slate-700 mt-0.5">{item.trxSukses || 0} Trx</p>
                                            </div>
                                            <div className="text-right min-w-[90px]">
                                                <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wide">Input Jual</p>
                                                <p className="text-xs font-extrabold font-mono text-slate-700 mt-0.5">
                                                    {showBalance ? formatRP(item.totalJual) : "••••••"}
                                                </p>
                                            </div>
                                            <button onClick={() => deleteHistoryItem(item.id)} className="w-8 h-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white border border-red-100 transition-transform">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                                {filteredUploadHistory.length === 0 && (
                                    <p className="text-slate-400 text-center py-6 bg-slate-50/50 rounded-xl border border-dashed">Tidak ditemukan riwayat data yang cocok.</p>
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
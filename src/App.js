import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
// Import Firebase
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";

// --- CONFIGURATION FIREBASE (Using ENV) ---
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

const WEBHOOK_ID = process.env.REACT_APP_WEBHOOK_ID || ""; 

const CountUp = ({ value, duration = 1000 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    useEffect(() => {
        let start = 0;
        const end = parseInt(value);
        if (start === end) return;
        let timer = setInterval(() => {
            start += Math.ceil(end / (duration / 20));
            if (start >= end) {
                setDisplayValue(end);
                clearInterval(timer);
            } else {
                setDisplayValue(start);
            }
        }, 20);
        return () => clearInterval(timer);
    }, [value, duration]);
    return <span>{formatRP(displayValue)}</span>;
};

const formatRP = (val) => new Intl.NumberFormat('id-ID', { 
    style: 'currency', 
    currency: 'IDR', 
    maximumFractionDigits: 0 
}).format(val || 0);

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [usernameInput, setUsernameInput] = useState("");
    const [passwordInput, setPasswordInput] = useState("");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State baru untuk mobile menu
    
    const AUTH_CREDENTIALS = { 
        user: process.env.REACT_APP_ADMIN_USER || "", 
        pass: process.env.REACT_APP_ADMIN_PASS || "" 
    };

    const [currentTime, setCurrentTime] = useState(new Date());
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [balances, setBalances] = useState({ DAS: 0, AMC: 0, HAO: 0 });
    const [balanceDates, setBalanceDates] = useState({ DAS: '-', AMC: '-', HAO: '-' });
    const [totals, setTotals] = useState({ jual: 0, modal: 0, profit: 0 });
    const [dailyData, setDailyData] = useState({}); 
    const [supplierDailyUsage, setSupplierDailyUsage] = useState({});
    const [yesterdayBalances, setYesterdayBalances] = useState({ DAS: 0, AMC: 0, HAO: 0 });
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [inputTelpon, setInputTelpon] = useState("");
    const [resultTelpon, setResultTelpon] = useState("");

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
                setBalances(data.balances || { DAS: 0, AMC: 0, HAO: 0 });
                setBalanceDates(data.balanceDates || { DAS: '-', AMC: '-', HAO: '-' });
                setTotals(data.totals || { jual: 0, modal: 0, profit: 0 });
                setDailyData(data.dailyData || {});
                setSupplierDailyUsage(data.supplierDailyUsage || {});
                setYesterdayBalances(data.yesterdayBalances || { DAS: 0, AMC: 0, HAO: 0 });
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
        if(window.confirm("Hapus seluruh data di Cloud Web Admin?")) {
            const emptyData = {
                balances: { DAS: 0, AMC: 0, HAO: 0 },
                balanceDates: { DAS: '-', AMC: '-', HAO: '-' },
                totals: { jual: 0, modal: 0, profit: 0 },
                dailyData: {},
                supplierDailyUsage: {},
                yesterdayBalances: { DAS: 0, AMC: 0, HAO: 0 }
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

    const parseFinalBalance = (text) => {
        if (!text) return null;
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
            let lastUpdateTimes = { DAS: 0, AMC: 0, HAO: 0 };
            let newAccJual = totals.jual;
            let newAccModal = totals.modal;

            jsonData.forEach(row => {
                const getVal = (kws) => {
                    const key = Object.keys(row).find(k => kws.some(kw => k.trim().toLowerCase() === kw.toLowerCase()));
                    return row[key] ? String(row[key]).trim() : "";
                };
                const status = (getVal(['Status', 'Keterangan Status']) || "").toLowerCase();
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

                if (status === 'sukses' || status === 'success') {
                    newAccModal += hrgModal;
                    newAccJual += hrgJual;
                    if(!tempDaily[dateOnly]) tempDaily[dateOnly] = { jual: 0, modal: 0, profit: 0 };
                    tempDaily[dateOnly].jual += hrgJual;
                    tempDaily[dateOnly].modal += hrgModal;
                    tempDaily[dateOnly].profit += (hrgJual - hrgModal);
                    if (sKey) {
                        if (!tempUsage[dateOnly]) tempUsage[dateOnly] = { DAS: 0, AMC: 0, HAO: 0 };
                        tempUsage[dateOnly][sKey] += hrgModal;
                    }
                }
                if (sKey) {
                    const saldoBaru = parseFinalBalance(message);
                    if (saldoBaru !== null && currentRecordTime >= lastUpdateTimes[sKey]) {
                        tempBalances[sKey] = saldoBaru;
                        tempDates[sKey] = tglRaw;
                        lastUpdateTimes[sKey] = currentRecordTime;
                    }
                }
            });

            await syncToCloud({
                balances: tempBalances,
                balanceDates: tempDates,
                totals: { jual: newAccJual, modal: newAccModal, profit: newAccJual - newAccModal },
                dailyData: tempDaily,
                yesterdayBalances: tempYesterday,
                supplierDailyUsage: tempUsage
            });
            setCurrentPage('dashboard');
        };
        reader.readAsArrayBuffer(file);
    };

    const maxH = Math.max(totals.jual, 1);
    const getBarHeight = (val) => `${(val / maxH) * 100}%`;

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
            {/* Mobile Header */}
            <header className="md:hidden bg-[#0f172a] text-white p-4 flex justify-between items-center sticky top-0 z-[60]">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center font-black text-[10px]">V</div>
                    <span className="font-black text-[10px] tracking-widest uppercase">V-PANEL</span>
                </div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-white p-2">
                    {isSidebarOpen ? '✕' : '☰'}
                </button>
            </header>

            {/* Sidebar */}
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
                        <span className="text-[7px] font-black uppercase text-slate-300">{isOnline ? 'Cloud Sync Active' : 'Offline Mode'}</span>
                    </div>
                </div>
                
                <nav className="space-y-2 flex-grow">
                    <button onClick={() => {setCurrentPage('dashboard'); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold ${currentPage === 'dashboard' ? 'bg-blue-600 shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}>📊 Dashboard</button>
                    <button onClick={() => {setCurrentPage('upload'); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold ${currentPage === 'upload' ? 'bg-blue-600' : 'text-slate-400 hover:bg-white/5'}`}>📤 Upload Data</button>
                    <button onClick={() => {setCurrentPage('v-telpon'); setIsSidebarOpen(false)}} className={`w-full flex items-center gap-3 p-3 rounded-xl font-bold ${currentPage === 'v-telpon' ? 'bg-emerald-600' : 'text-slate-400 hover:bg-white/5'}`}>📞 Validasi Paket</button>
                </nav>

                <div className="mt-auto pt-6 border-t border-slate-800 space-y-3">
                    <button onClick={handleReset} className="w-full text-left p-3 rounded-xl font-bold text-red-400 hover:bg-red-500/10 text-[9px]">🗑️ RESET CLOUD</button>
                    <button onClick={handleLogout} className="w-full text-left p-3 rounded-xl font-bold text-slate-400 hover:bg-white/5 text-[9px]">🔓 KELUAR</button>
                </div>
            </aside>

            {/* Overlay Mobile */}
            {isSidebarOpen && (
                <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/50 z-40 md:hidden"></div>
            )}

            {/* Main Content */}
            <main className="flex-grow md:ml-60 p-4 md:p-10">
                {currentPage === 'dashboard' ? (
                    <div className="max-w-5xl mx-auto space-y-4 md:space-y-8">
                        {/* Top Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Penjualan (Cloud)</p>
                                <h3 className="text-xl md:text-2xl font-black text-blue-600"><CountUp value={totals.jual} /></h3>
                            </div>
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Modal</p>
                                <h3 className="text-xl md:text-2xl font-black text-slate-600"><CountUp value={totals.modal} /></h3>
                            </div>
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 bg-emerald-50/20">
                                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-2">Total Profit</p>
                                <h3 className="text-xl md:text-2xl font-black text-emerald-600"><CountUp value={totals.profit} /></h3>
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-slate-200 overflow-x-hidden">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-12">
                                <h3 className="text-[11px] font-black uppercase text-slate-800">Performa Bisnis Terminal</h3>
                                <input type="date" className="w-full md:w-auto bg-slate-50 border p-2 px-4 rounded-full font-bold text-[10px]" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                            </div>
                            <div className="relative h-48 md:h-64 border-l border-b border-slate-200 flex items-end justify-around px-2 md:px-10 pb-2">
                                <div className="relative w-12 md:w-24 h-full flex flex-col justify-end">
                                    <div className="w-full bg-blue-600 rounded-t-lg md:rounded-t-xl" style={{height: getBarHeight(totals.jual)}}></div>
                                    <span className="absolute -bottom-8 left-0 right-0 text-center font-black text-slate-500 uppercase text-[8px] md:text-[10px]">Jual</span>
                                </div>
                                <div className="relative w-12 md:w-24 h-full flex flex-col justify-end">
                                    <div className="w-full bg-slate-400 rounded-t-lg md:rounded-t-xl" style={{height: getBarHeight(totals.modal)}}></div>
                                    <span className="absolute -bottom-8 left-0 right-0 text-center font-black text-slate-500 uppercase text-[8px] md:text-[10px]">Modal</span>
                                </div>
                                <div className="relative w-12 md:w-24 h-full flex flex-col justify-end">
                                    <div className="w-full bg-emerald-500 rounded-t-lg md:rounded-t-xl" style={{height: getBarHeight(totals.profit)}}></div>
                                    <span className="absolute -bottom-8 left-0 right-0 text-center font-black text-emerald-600 uppercase text-[8px] md:text-[10px]">Profit</span>
                                </div>
                            </div>
                        </div>

                        {/* Supplier Section */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 pb-10">
                            {['DAS', 'AMC', 'HAO'].map(name => (
                                <div key={name} className="bg-[#1e293b] text-white p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-xl relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <span className="text-blue-400 font-black tracking-widest text-[8px] uppercase">{name}</span>
                                        <div className="text-right">
                                            <p className="text-[6px] text-slate-500 uppercase font-black">Saldo Kemarin</p>
                                            <p className="text-amber-400 font-bold text-[10px]">{formatRP(yesterdayBalances[name] || 0)}</p>
                                        </div>
                                    </div>
                                    <p className="text-[7px] text-slate-400 font-bold uppercase mb-1">Saldo Cloud Saat Ini</p>
                                    <h3 className="text-xl md:text-2xl font-black text-white"><CountUp value={balances[name]} /></h3>
                                    <div className="pt-4 mt-4 border-t border-white/5 text-[7px] text-slate-500 font-bold uppercase">
                                        Pemakaian ({filterDate}): <span className="text-emerald-400">-{formatRP(supplierDailyUsage[filterDate]?.[name] || 0)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : currentPage === 'v-telpon' ? (
                    <div className="max-w-2xl mx-auto bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl border border-slate-200">
                        <h2 className="text-lg md:text-xl font-black uppercase text-slate-800 text-center mb-8">Validasi Paket Telpon</h2>
                        <textarea className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] md:rounded-[2rem] p-6 mb-6 font-mono text-[11px] h-40 outline-none" placeholder="Tempel respon supplier..." value={inputTelpon} onChange={(e) => setInputTelpon(e.target.value)} />
                        <button onClick={() => {
                             const text = inputTelpon;
                             const mntMatch = text.match(/(\d+[\d\.]*)\s*(Menit|Mnt|m\b)/i);
                             const mnt = mntMatch ? mntMatch[1].replace(/\./g, "") : "???";
                             const hrMatch = text.match(/(\d+)\s*(Hari|Hr)/i);
                             const hr = hrMatch ? hrMatch[1] : "??";
                             const noMatch = text.match(/(08\d{8,11}|8\d{8,11})/);
                             let no = noMatch ? noMatch[0] : "";
                             no = no.startsWith('0') ? '62' + no.slice(1) : (no.startsWith('8') ? '62' + no : no);
                             const snMatch = text.match(/(\d{15,25})/);
                             const sn = snMatch ? snMatch[0] : "-";
                             setResultTelpon(`Paket ${mnt} Mnt AllOpr (${hr} hari) telah aktif di nomor ${no}. SN ${sn}.`);
                        }} className="w-full bg-emerald-600 text-white py-4 md:py-5 rounded-2xl font-black uppercase shadow-lg">Generate Template</button>
                        {resultTelpon && (
                            <div className="mt-10 p-6 md:p-8 bg-[#0f172a] rounded-[2rem] text-white relative">
                                <p className="text-[7px] font-black text-emerald-400 uppercase mb-4 tracking-widest">Hasil:</p>
                                <span className="block font-bold text-xs pr-8">{resultTelpon}</span>
                                <button onClick={() => {navigator.clipboard.writeText(resultTelpon); alert("Tersalin!")}} className="absolute top-6 md:top-8 right-6 md:right-8 bg-white/10 p-2 rounded-xl text-[10px]">📋</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto bg-white p-8 md:p-16 rounded-[2.5rem] md:rounded-[4rem] shadow-2xl text-center border-4 border-dashed border-slate-100">
                         <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-2xl md:text-3xl mx-auto mb-8">📤</div>
                         <h2 className="text-xl md:text-2xl font-black mb-4 uppercase text-slate-800">Import Data ke Cloud</h2>
                         <p className="text-slate-400 text-[9px] md:text-[10px] mb-10 max-w-xs mx-auto font-medium uppercase tracking-widest leading-relaxed">Sinkronisasi data ke seluruh perangkat admin.</p>
                         <input type="file" accept=".xlsx, .xls" onChange={(e) => processFile(e.target.files[0])} className="hidden" id="fUp" />
                         <label htmlFor="fUp" className="inline-block bg-blue-600 text-white px-10 md:px-16 py-4 md:py-5 rounded-[1.5rem] md:rounded-[2rem] font-black cursor-pointer shadow-xl hover:scale-105 transition-all uppercase tracking-widest">Pilih Dokumen Excel</label>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
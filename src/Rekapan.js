import React, { useState, useEffect, Component, useMemo, useCallback } from 'react';
import { 
    Calculator, CreditCard, Wallet, X, ShieldAlert,
    TrendingUp, PiggyBank, RefreshCcw, Landmark, Zap, 
    Scale, Lock, Unlock, Plus, Trash2, Save, RotateCcw, CheckCircle2,
    PlusSquare, ChevronRight, Coffee, Calendar, Info, Send, Edit3
} from 'lucide-react';
import * as XLSX from 'xlsx';

// Import fungsi Firebase
import { saveRekapData, db, getAgents, WEBHOOK_ID } from './firebase'; 
import { doc, onSnapshot, getDoc } from "firebase/firestore";

const formatIDR = (val) => {
    const number = parseFloat(val);
    if (isNaN(number) || number === 0) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
};

const parseRawNumber = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = val.toString().replace(/\D/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
};

class ErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { hasError: false }; }
    static getDerivedStateFromError(error) { return { hasError: true }; }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
                    <div className="bg-white p-10 rounded-[3rem] shadow-xl max-w-md border border-red-100">
                        <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600"><ShieldAlert size={40} /></div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">Terjadi Kesalahan</h2>
                        <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2"><RefreshCcw size={18} /> Muat Ulang</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const StableInput = ({ id, label, icon, color, bg, border, disabled, value, onChange, className = "", textColor = "text-slate-700" }) => {
    const [displayValue, setDisplayValue] = useState(formatIDR(value));
    useEffect(() => { setDisplayValue(formatIDR(value)); }, [value]);
    const handleChange = (e) => {
        const raw = e.target.value;
        const numValue = parseRawNumber(raw);
        setDisplayValue(formatIDR(numValue));
        onChange(id, numValue);
    };
    return (
        <div className={`space-y-2 ${className}`}>
            {label && <label className={`text-[10px] font-black ${color} ml-2 uppercase flex items-center gap-1`}>{icon} {label}</label>}
            <input 
                type="text" 
                inputMode="numeric" 
                value={displayValue} 
                onChange={handleChange} 
                disabled={disabled} 
                className={`w-full p-4 ${bg} rounded-2xl border-2 border-transparent ${border} focus:bg-white transition-all font-bold outline-none ${textColor} disabled:opacity-60 disabled:cursor-not-allowed`} 
                placeholder="Rp 0" 
            />
        </div>
    );
};

const DashboardContent = ({ externalBalances, totalProfit, yesterdayBalances, supplierDailyUsage, filterDate, webhookId, dailyStats }) => {
    const ID_SISTEM = webhookId || WEBHOOK_ID; 
    const TELEGRAM_BOT_TOKEN = "8571888481:AAGdqdiaa4kPd_YWqfZauELZ1-ACiMV0iYg";
    const TELEGRAM_CHAT_ID = "-1003574594574";

    const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [showLockConfirm, setShowLockConfirm] = useState(false);
    
    const [isModalLock, setIsModalLock] = useState(true);
    const [isOpsLock, setIsOpsLock] = useState(true); 
    const [isTopupLock, setIsTopupLock] = useState(true);
    const [isSupplierEdit, setIsSupplierEdit] = useState(false);
    
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isDayLocked, setIsDayLocked] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');
    const [profitIsLocked, setProfitIsLocked] = useState(false);

    const [agents, setAgents] = useState([]);
    const [tempOpsName, setTempOpsName] = useState('');
    const [tempOpsValue, setTempOpsValue] = useState(0);
    const [tempTopupSupplier, setTempTopupSupplier] = useState('DAS');
    const [tempTopupValue, setTempTopupValue] = useState(0);
    const [labaBersihKemarin, setLabaBersihKemarin] = useState(0);

    const emptyData = {
        modalUtama: 0, saldoBCA: 0, saldoBRI: 0, settledDigiflazz: 0, sisaDigiflazz: 0,
        saldoDigiswitch: 0, biayaOpsList: [], catatanAnalisisLainnya: '',
        historyTopup: [], 
        profitCloudSistem: 0, 
        lockedSupplierBalances: null,
        manualSupplierAdjustments: {},
        manualDifference: null,
        dailyStatsSnapshot: null
    };

    const [rekapData, setRekapData] = useState(emptyData);

    useEffect(() => {
        const fetchAgents = async () => {
            try {
                const data = await getAgents();
                setAgents(data);
            } catch (err) {
                console.error("Gagal sinkron data agen:", err);
            }
        };
        fetchAgents();
    }, []);

    useEffect(() => {
        setSyncStatus('Connecting...');
        const docRef = doc(db, "rekapan_operasional", selectedDate);
        
        const unsubscribe = onSnapshot(docRef, async (docSnap) => {
            const prevDate = new Date(selectedDate);
            prevDate.setDate(prevDate.getDate() - 1);
            const prevDateStr = prevDate.toISOString().split('T')[0];
            const prevSnap = await getDoc(doc(db, "rekapan_operasional", prevDateStr));
            
            if (prevSnap.exists()) {
                setLabaBersihKemarin(prevSnap.data().labaBersihCalculated || 0);
            } else {
                setLabaBersihKemarin(0);
            }

            if (docSnap.exists()) {
                const cloudData = docSnap.data();
                const hasSavedProfit = cloudData.profitCloudSistem !== undefined && cloudData.profitCloudSistem !== 0;
                
                setRekapData(prev => ({
                    ...emptyData,
                    ...cloudData,
                    profitCloudSistem: hasSavedProfit ? cloudData.profitCloudSistem : (parseFloat(totalProfit) || 0)
                }));
                setProfitIsLocked(hasSavedProfit);
                setIsDayLocked(cloudData.isLocked || false);
                setSyncStatus('Live');
            } else {
                setSyncStatus('Checking History...');
                if (prevSnap.exists()) {
                    const lastData = prevSnap.data();
                    setRekapData({ 
                        ...emptyData, 
                        modalUtama: lastData.modalUtama || 0, 
                        biayaOpsList: lastData.biayaOpsList || [],
                        catatanAnalisisLainnya: lastData.catatanAnalisisLainnya || '',
                        profitCloudSistem: parseFloat(totalProfit) || 0
                    });
                } else {
                    setRekapData({ ...emptyData, profitCloudSistem: parseFloat(totalProfit) || 0 });
                }
                setProfitIsLocked(false);
                setIsDayLocked(false);
                setSyncStatus('Ready');
            }
        });

        return () => unsubscribe();
    }, [selectedDate, totalProfit]);

    const activeStats = useMemo(() => {
        if (isDayLocked && rekapData.dailyStatsSnapshot) {
            return rekapData.dailyStatsSnapshot;
        }
        return dailyStats || { 
            totalTrx: 0, successTrx: 0, pendingTrx: 0, failedTrx: 0, 
            successRate: 0, totalSales: 0, totalCost: 0 
        };
    }, [isDayLocked, rekapData.dailyStatsSnapshot, dailyStats]);

    const displaySupplierBalances = useMemo(() => {
        const isSnapshotLocked = !!rekapData.lockedSupplierBalances;
        const getSupData = (name) => {
            const manualVal = rekapData.manualSupplierAdjustments?.[name];
            if (isSnapshotLocked) {
                const snapshot = rekapData.lockedSupplierBalances[name];
                const baseData = typeof snapshot === 'object' ? snapshot : { real: snapshot || 0, kemarin: 0, pakai: 0 };
                return { ...baseData, real: manualVal !== undefined ? manualVal : baseData.real };
            }
            const currentReal = manualVal !== undefined ? manualVal : parseRawNumber(externalBalances?.[name]);
            return {
                real: currentReal,
                kemarin: yesterdayBalances?.[name] || 0,
                pakai: supplierDailyUsage?.[filterDate]?.[name] || 0
            };
        };

        return {
            DAS: getSupData('DAS'),
            HAO: getSupData('HAO'),
            AMC: getSupData('AMC'),
            NEWBIEZ: getSupData('NEWBIEZ'),
            OASIS: getSupData('OASIS'),
            isLocked: isSnapshotLocked
        };
    }, [rekapData.lockedSupplierBalances, rekapData.manualSupplierAdjustments, externalBalances, yesterdayBalances, supplierDailyUsage, filterDate]);

    const results = useMemo(() => {
        // Kalkulasi Saldo Agen
        const totalSaldoAgen = agents
            .filter(a => {
                const n = a.name.toLowerCase();
                return !n.includes('owner') && !n.includes('digiflazz');
            })
            .reduce((sum, a) => sum + (parseInt(a.balance) || 0), 0);

        // 1. Hitung Bank Real (Hanya ini komponen perbankan yang masuk Aset)
        const totalBankKotor = (rekapData.saldoBCA || 0) + (rekapData.saldoBRI || 0);
        const totalBankReal = totalBankKotor - totalSaldoAgen;
        
        const dayOfMonth = new Date(selectedDate).getDate();
        const POTONGAN_PER_HARI = 2775;
        const totalPotonganAccumulated = dayOfMonth * POTONGAN_PER_HARI;
        
        const settledNet = rekapData.settledDigiflazz > 0 ? (rekapData.settledDigiflazz - POTONGAN_PER_HARI) : 0;
        
        // 2. Kalkulasi Seluruh Supplier
        const currentSupplierSum = (rekapData.sisaDigiflazz || 0) + 
                                    displaySupplierBalances.DAS.real + 
                                    displaySupplierBalances.AMC.real + 
                                    displaySupplierBalances.HAO.real +
                                    displaySupplierBalances.NEWBIEZ.real +
                                    displaySupplierBalances.OASIS.real;

        // 3. TOTAL ASET RIIL (Bank Real + Supplier + Settled)
        // Note: Digiswitch, BCA (Input), BRI (Input), Agen tidak dijumlahkan lagi ke sini.
        const currentTotalAsset = totalBankReal + currentSupplierSum + settledNet;

        const labaBersih = currentTotalAsset - (rekapData.modalUtama || 0);
        const profitBasis = (rekapData.profitCloudSistem || parseFloat(totalProfit) || 0);
        const calculatedDiff = (labaBersih - profitBasis) + totalPotonganAccumulated;

        const finalSelisih = (rekapData.manualDifference !== null && rekapData.manualDifference !== undefined) 
                            ? rekapData.manualDifference 
                            : calculatedDiff;

        return { 
            totalSisaSaldo: currentTotalAsset, 
            labaBersih, 
            totalSupplierBalance: currentSupplierSum, 
            settledNetValue: settledNet, 
            selisihProfit: finalSelisih, 
            profitBasis,
            totalPotonganAccumulated,
            totalBankReal,
            totalSaldoAgen,
            isManualDiff: rekapData.manualDifference !== null,
            profitKotor: (activeStats.totalSales || 0) - (activeStats.totalCost || 0)
        };
    }, [rekapData, displaySupplierBalances, selectedDate, agents, totalProfit, activeStats]);

    const handleManualChange = useCallback((field, value) => {
        if (isDayLocked) return; 
        setRekapData(prev => ({ ...prev, [field]: value }));
    }, [isDayLocked]);

    const handleSupplierManualEdit = (name, value) => {
        setRekapData(prev => ({
            ...prev,
            manualSupplierAdjustments: {
                ...(prev.manualSupplierAdjustments || {}),
                [name]: value
            }
        }));
    };

    const handleConfirmLock = async () => {
        setSyncStatus('Locking...');
        const currentSupplierSnapshot = {
            DAS: displaySupplierBalances.DAS,
            HAO: displaySupplierBalances.HAO,
            AMC: displaySupplierBalances.AMC,
            NEWBIEZ: displaySupplierBalances.NEWBIEZ,
            OASIS: displaySupplierBalances.OASIS
        };

        try {
            const updatePayload = { 
                ...rekapData,
                isLocked: true,
                lockedSupplierBalances: currentSupplierSnapshot,
                dailyStatsSnapshot: activeStats,
                webhookId: ID_SISTEM,
                labaBersihCalculated: results.labaBersih,
                profitCloudSistem: results.profitBasis,
                lastUpdated: new Date().toISOString()
            };
            await saveRekapData(selectedDate, updatePayload);
            setProfitIsLocked(true);
            setIsDayLocked(true);
            setShowLockConfirm(false);
            setSyncStatus('Snapshot Saved');
            setTimeout(() => setSyncStatus('Live'), 2000);
        } catch (error) {
            setSyncStatus('Lock Failed');
        }
    };

    const handleCloudSync = async () => {
        setSyncStatus('Saving...');
        const finalData = {
            ...rekapData,
            webhookId: ID_SISTEM,
            labaBersihCalculated: results.labaBersih,
            isLocked: isDayLocked,
            lastUpdated: new Date().toISOString()
        };
        await saveRekapData(selectedDate, finalData, (msg) => {
            setSyncStatus(msg);
            setTimeout(() => setSyncStatus('Live'), 2000);
        });
    };

    const addOpsItem = () => {
        if (tempOpsValue <= 0 || !tempOpsName) return;
        const newItem = { id: Date.now(), name: tempOpsName, amount: tempOpsValue };
        setRekapData(prev => ({ ...prev, biayaOpsList: [...(prev.biayaOpsList || []), newItem] }));
        setTempOpsName(''); setTempOpsValue(0);
    };

    const removeOpsItem = (id) => {
        if (isDayLocked || isOpsLock) return;
        setRekapData(prev => ({ ...prev, biayaOpsList: prev.biayaOpsList.filter(item => item.id !== id) }));
    };

    const addTopupItem = () => {
        if (tempTopupValue <= 0) return;
        const newItem = { 
            id: Date.now(), 
            supplier: tempTopupSupplier, 
            amount: tempTopupValue, 
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) 
        };
        setRekapData(prev => ({ ...prev, historyTopup: [newItem, ...(prev.historyTopup || [])] }));
        setTempTopupValue(0);
    };

    const removeTopupItem = (id) => {
        if (isDayLocked || isTopupLock) return;
        setRekapData(prev => ({ ...prev, historyTopup: prev.historyTopup.filter(item => item.id !== id) }));
    };

    const sendToTelegram = async () => {
        setSyncStatus('Preparing Excel...');
        try {
            const f = (v) => formatIDR(v || 0);
            const dayNum = new Date(selectedDate).getDate();

            const wsData = [
                ["LAPORAN OPERASIONAL HARIAN"],
                ["Tanggal Laporan", ": " + selectedDate],
                [""],
                ["I. STATISTIK TRANSAKSI", "JUMLAH"],
                ["Total Transaksi", activeStats.totalTrx || 0],
                ["Transaksi Sukses", activeStats.successTrx || 0],
                ["Transaksi Gagal", activeStats.failedTrx || 0],
                ["Success Rate", (activeStats.successRate || 0) + "%"],
                [""],
                ["II. PERFORMA PENJUALAN", "NOMINAL"],
                ["Total Penjualan (Jual)", f(activeStats.totalSales)],
                ["Total Modal (Beli)", f(activeStats.totalCost)],
                ["Laba Hari Ini (Gross)", f(results.profitKotor)],
                [""],
                ["III. RINCIAN ASET RIIL", "NOMINAL"],
                ["Bank Real (BCA+BRI - Agen)", f(results.totalBankReal)],
                ["Settled Net (Hari Ini)", f(results.settledNetValue)],
                ["Saldo Digiflazz", f(rekapData.sisaDigiflazz)],
                ["Supplier DAS", f(displaySupplierBalances.DAS.real)],
                ["Supplier AMC", f(displaySupplierBalances.AMC.real)],
                ["Supplier HAO", f(displaySupplierBalances.HAO.real)],
                ["Supplier NEWBIEZ", f(displaySupplierBalances.NEWBIEZ.real)],
                ["Supplier OASIS", f(displaySupplierBalances.OASIS.real)],
                ["TOTAL ASET RIIL (FINAL)", f(results.totalSisaSaldo)],
                [""],
                ["IV. INFO PENDUKUNG (NON-ASET)", "NOMINAL"],
                ["Bank BCA (Input)", f(rekapData.saldoBCA)],
                ["Bank BRI (Input)", f(rekapData.saldoBRI)],
                ["Total Saldo Agen", f(results.totalSaldoAgen)],
                ["Digiswitch (Catatan)", f(rekapData.saldoDigiswitch)],
                [""],
                ["V. RINGKASAN PERHITUNGAN", "NOMINAL"],
                ["Modal Utama", f(rekapData.modalUtama)],
                ["Laba Bersih (Aset - Modal)", f(results.labaBersih)],
                ["Total Profit (System)", f(results.profitBasis)], 
                ["Akumulasi Potongan Harian", f(results.totalPotonganAccumulated)],
                ["SELISIH / VARIANCE", f(results.selisihProfit)],
                [""],
                ["VI. PENGELUARAN OPERASIONAL", "NOMINAL"],
                ...(rekapData.biayaOpsList || []).map(item => [item.name, f(item.amount)]),
                ["TOTAL BIAYA OPS", f((rekapData.biayaOpsList || []).reduce((acc, curr) => acc + curr.amount, 0))],
                [""],
                ["VII. CATATAN ANALISIS"],
                [rekapData.catatanAnalisisLainnya || "Tidak ada catatan."]
            ];

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!cols'] = [{ wch: 35 }, { wch: 25 }];
            XLSX.utils.book_append_sheet(wb, ws, "Rekapan");
            
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            const formData = new FormData();
            formData.append('chat_id', TELEGRAM_CHAT_ID);
            formData.append('document', blob, `Rekap_${selectedDate}.xlsx`);
            
            const caption = `LAPORAN REKAPAN HARIAN\n` +
                            `Tanggal: ${selectedDate}\n\n` +
                            `PERFORMA KEUANGAN\n` +
                            `Laba Bersih: ${f(results.labaBersih)}\n` +
                            `Total Profit: ${f(results.profitBasis)}\n` + 
                            `Selisih: ${f(results.selisihProfit)}\n\n` +
                            `ASET FINAL\n` +
                            `Total Aset Riil: ${f(results.totalSisaSaldo)}\n` +
                            `Bank Real (Nett): ${f(results.totalBankReal)}`;

            formData.append('caption', caption);
            formData.append('parse_mode', 'HTML');

            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                setSyncStatus('Sent!');
                alert('Laporan Berhasil Terkirim ke Telegram!');
            } else {
                const errData = await response.json();
                throw new Error(errData.description || 'Gagal mengirim');
            }
        } catch (error) {
            console.error("Excel/Telegram Error:", error);
            setSyncStatus('Failed');
            alert('Gagal mengirim laporan: ' + error.message);
        } finally {
            setTimeout(() => setSyncStatus('Live'), 3000);
        }
    };

    return (
        <div className="bg-slate-50 p-3 md:p-8 font-sans text-slate-900 rounded-[2rem] min-h-screen">
            <div className="max-w-7xl mx-auto">
                <header className="mb-6 md:mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800 uppercase">Operational Dashboard</h1>
                        <p className="text-slate-500 font-medium text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2">
                           Laporan Harian Terminal {syncStatus && <span className="text-blue-600 animate-pulse">| {syncStatus}</span>}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch gap-3">
                        <button onClick={() => { if(!isDayLocked && window.confirm(`Reset data ${selectedDate}?`)) { setRekapData({ ...emptyData }); setProfitIsLocked(false); } }} disabled={isDayLocked} className="px-5 py-3 md:py-4 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white transition-all active:scale-95 disabled:opacity-50">
                            <RotateCcw size={16} /> RESET
                        </button>
                        <button onClick={handleCloudSync} className="px-5 py-3 md:py-4 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 bg-blue-600 text-white shadow-lg active:scale-95 transition-all">
                            <Save size={16} /> SYNC CLOUD
                        </button>
                        <button onClick={() => { if(!isDayLocked) setShowLockConfirm(true); else setIsDayLocked(false); }} className={`px-5 py-3 md:py-4 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${isDayLocked ? 'bg-orange-500 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}>
                            {isDayLocked ? <Lock size={16} /> : <Unlock size={16} />} {isDayLocked ? 'LOCKED' : 'LOCK DAY'}
                        </button>
                        <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between gap-3">
                            <Calendar size={16} className="text-blue-600" />
                            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="font-bold text-xs outline-none text-slate-700 cursor-pointer bg-transparent" />
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Total Transaksi</p>
                        <h4 className="text-lg font-black text-slate-800">{activeStats.totalTrx} <span className="text-[10px] text-slate-400">Trx</span></h4>
                    </div>
                    <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                        <p className="text-[8px] font-black text-emerald-500 uppercase mb-1">Success Rate</p>
                        <h4 className="text-lg font-black text-emerald-600">{activeStats.successRate}%</h4>
                    </div>
                    <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                        <p className="text-[8px] font-black text-blue-500 uppercase mb-1">Penjualan Hari Ini</p>
                        <h4 className="text-lg font-black text-blue-600">{formatIDR(activeStats.totalSales)}</h4>
                    </div>
                    <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm">
                        <p className="text-[8px] font-black text-orange-500 uppercase mb-1">Profit Kotor</p>
                        <h4 className="text-lg font-black text-orange-600">{formatIDR(results.profitKotor)}</h4>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-2"><Wallet size={16} /> 1. Komponen Aset & Info</h3>
                            <button onClick={() => setIsSupplierEdit(!isSupplierEdit)} className="text-[10px] font-black underline text-blue-700 uppercase flex items-center gap-1">
                                <Edit3 size={12}/> {isSupplierEdit ? 'Done' : 'Edit Supplier'}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <StableInput id="saldoBCA" value={rekapData.saldoBCA} onChange={handleManualChange} label="BCA (Info)" icon={<CreditCard size={10}/>} color="text-slate-400" bg="bg-slate-50" border="focus:border-blue-200" disabled={isDayLocked} />
                            <StableInput id="saldoBRI" value={rekapData.saldoBRI} onChange={handleManualChange} label="BRI (Info)" icon={<Landmark size={10}/>} color="text-slate-400" bg="bg-slate-50" border="focus:border-orange-200" disabled={isDayLocked} />

                            <div className="col-span-1 sm:col-span-2 px-4 py-3 bg-blue-50/50 rounded-2xl flex flex-wrap justify-between items-center gap-3 border border-blue-100">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Total Agen (Pengurang):</span>
                                    <span className="text-[11px] font-black text-red-500">-{formatIDR(results.totalSaldoAgen)}</span>
                                </div>
                                <div className="flex flex-col items-end text-right">
                                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-tighter">Bank Real (Asset Nett):</span>
                                    <span className="text-[11px] font-black text-blue-700">{formatIDR(results.totalBankReal)}</span>
                                </div>
                            </div>

                            <StableInput id="settledDigiflazz" value={rekapData.settledDigiflazz} onChange={handleManualChange} label="Settled Gross" icon={<Calculator size={10}/>} color="text-emerald-600" bg="bg-emerald-50/30" border="focus:border-emerald-500" disabled={isDayLocked} />
                            <StableInput id="saldoDigiswitch" value={rekapData.saldoDigiswitch} onChange={handleManualChange} label="Digiswitch (Catatan)" icon={<Zap size={10}/>} color="text-slate-400" bg="bg-slate-50" border="focus:border-slate-300" disabled={isDayLocked} />
                            
                            <div className="col-span-1 sm:col-span-2 p-4 md:p-6 bg-slate-900 rounded-[2rem] text-white mt-2 relative overflow-hidden shadow-xl">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 border-b border-white/10 pb-4 gap-2">
                                    <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Total Asset Supplier</span>
                                    <span className="text-xl md:text-2xl font-black text-blue-400">{formatIDR(results.totalSupplierBalance)}</span>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-4 bg-white/5 p-3 rounded-2xl">
                                        <label className="text-[10px] font-black uppercase text-slate-300">Sisa Digiflazz</label>
                                        <div className="w-1/2 min-w-[120px]">
                                            <StableInput id="sisaDigiflazz" value={rekapData.sisaDigiflazz} onChange={handleManualChange} bg="bg-white/10" border="border-white/10" disabled={isDayLocked} textColor="text-white" />
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto rounded-xl border border-white/5">
                                        <table className="w-full text-[9px] md:text-[10px] text-left min-w-[420px]">
                                            <thead className="bg-white/10 text-slate-400 font-black uppercase">
                                                <tr>
                                                    <th className="p-3">Supplier</th>
                                                    <th className="p-3 text-right">Kemarin</th>
                                                    <th className="p-3 text-right">Pakai</th>
                                                    <th className="p-3 text-right">Realita</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {['DAS', 'AMC', 'HAO', 'NEWBIEZ', 'OASIS'].map(name => {
                                                    const data = displaySupplierBalances[name];
                                                    return (
                                                        <tr key={name}>
                                                            <td className="p-3 font-black text-blue-400 uppercase">{name}</td>
                                                            <td className="p-3 text-right text-slate-400">{formatIDR(data.kemarin)}</td>
                                                            <td className="p-3 text-right text-red-500">-{formatIDR(data.pakai)}</td>
                                                            <td className="p-3 text-right">
                                                                {isSupplierEdit ? (
                                                                    <input type="text" className="w-full bg-blue-500/20 text-white text-right font-black p-1 rounded outline-none border border-blue-500/50" value={formatIDR(data.real)} onChange={(e) => handleSupplierManualEdit(name, parseRawNumber(e.target.value))} />
                                                                ) : (
                                                                    <span className="font-black text-white">{formatIDR(data.real)}</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-2"><Coffee size={16} /> 2. Biaya Operasional</h3>
                                <button onClick={() => setIsOpsLock(!isOpsLock)} disabled={isDayLocked} className="text-[10px] font-black underline text-amber-700 uppercase">{isOpsLock ? 'UNLOCK' : 'LOCK'}</button>
                            </div>
                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <input type="text" placeholder="Nama..." value={tempOpsName} onChange={(e) => setTempOpsName(e.target.value)} disabled={isOpsLock || isDayLocked} className="flex-1 p-3 bg-amber-50/30 rounded-xl outline-none font-bold text-xs" />
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Rp 0" value={tempOpsValue === 0 ? '' : formatIDR(tempOpsValue)} onChange={(e) => setTempOpsValue(parseRawNumber(e.target.value))} disabled={isOpsLock || isDayLocked} className="flex-1 sm:w-32 p-3 bg-amber-50/30 rounded-xl outline-none font-bold text-xs text-right" />
                                        <button onClick={addOpsItem} disabled={isOpsLock || isDayLocked} className="p-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600"><Plus size={20}/></button>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-2 max-h-[120px] overflow-y-auto pr-2">
                                    {rekapData.biayaOpsList?.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                                            <span className="text-xs font-bold text-slate-700">{item.name}</span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-black text-amber-600">{formatIDR(item.amount)}</span>
                                                <button onClick={() => removeOpsItem(item.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-2"><PlusSquare size={16} /> 3. Penambahan Saldo</h3>
                                <button onClick={() => setIsTopupLock(!isTopupLock)} disabled={isDayLocked} className="text-[10px] font-black underline text-emerald-700 uppercase">{isTopupLock ? 'UNLOCK' : 'LOCK'}</button>
                            </div>
                            <div className="space-y-3">
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <select value={tempTopupSupplier} onChange={(e) => setTempTopupSupplier(e.target.value)} disabled={isTopupLock || isDayLocked} className="p-3 bg-emerald-50/30 rounded-xl outline-none font-bold text-xs text-emerald-700">
                                        <option value="DAS">DAS</option>
                                        <option value="HAO">HAO</option>
                                        <option value="AMC">AMC</option>
                                        <option value="NEWBIEZ">NEWBIEZ</option>
                                        <option value="OASIS">OASIS</option>
                                        <option value="DIGIFLAZZ">DIGIFLAZZ</option>
                                    </select>
                                    <div className="flex gap-2 flex-1">
                                        <input type="text" placeholder="Rp 0" value={tempTopupValue === 0 ? '' : formatIDR(tempTopupValue)} onChange={(e) => setTempTopupValue(parseRawNumber(e.target.value))} disabled={isTopupLock || isDayLocked} className="flex-1 p-3 bg-emerald-50/30 rounded-xl outline-none font-bold text-xs text-right" />
                                        <button onClick={addTopupItem} disabled={isTopupLock || isDayLocked} className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"><Plus size={20}/></button>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-2 max-h-[120px] overflow-y-auto pr-2">
                                    {rekapData.historyTopup?.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-emerald-600 leading-none">{item.supplier}</span>
                                                <span className="text-[8px] font-bold text-slate-400">{item.time}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-black text-slate-700">{formatIDR(item.amount)}</span>
                                                <button onClick={() => removeTopupItem(item.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="bg-red-50/40 p-6 md:p-8 rounded-[2.5rem] border-2 border-red-100/50">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-[10px] font-black uppercase text-red-600 flex items-center gap-2"><PiggyBank size={16} /> Modal Utama</h3>
                                <button onClick={() => setIsModalLock(!isModalLock)} disabled={isDayLocked} className="text-[10px] font-black underline text-red-700 uppercase">{isModalLock ? 'UNLOCK' : 'LOCK'}</button>
                            </div>
                            <StableInput id="modalUtama" value={rekapData.modalUtama} onChange={handleManualChange} disabled={isModalLock || isDayLocked} bg="bg-transparent" border="border-transparent" className="!space-y-0" />
                        </div>
                    </div>
                </div>

                <div className="mb-8 p-6 md:p-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><Wallet size={120} /></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
                        <div>
                            <p className="text-blue-100 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] mb-2">Laba Bersih (Aset Final - Modal)</p>
                            <h2 className="text-4xl md:text-6xl font-black tracking-tighter">{formatIDR(results.labaBersih)}</h2>
                        </div>
                        <div onClick={() => setIsAssetModalOpen(true)} className="bg-white/20 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/30 text-center min-w-[240px] cursor-pointer hover:bg-white/40 transition-all active:scale-95 shadow-xl">
                            <p className="text-[10px] font-black uppercase mb-1 flex items-center justify-center gap-2 tracking-[0.1em]"><Info size={12}/> Detail Aset Riil <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform"/></p>
                            <p className="text-2xl md:text-3xl font-black">{formatIDR(results.totalSisaSaldo)}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900 p-6 md:p-8 rounded-[2.5rem] text-white flex justify-between items-center shadow-xl">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <p className="text-[10px] font-black text-blue-400 uppercase">Total Profit (Auto)</p> 
                                {profitIsLocked && <span className="bg-blue-500/20 text-blue-400 text-[8px] px-2 py-0.5 rounded-full font-black border border-blue-500/30 flex items-center gap-1"><CheckCircle2 size={8}/> LOCKED</span>}
                            </div>
                            <h2 className="text-3xl font-black">{formatIDR(results.profitBasis)}</h2>
                            <p className="text-[10px] text-emerald-400 font-black uppercase mt-2">Laba Hari Ini: {formatIDR(results.profitKotor)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                            <TrendingUp size={32} className={`${profitIsLocked ? 'text-blue-400' : 'text-emerald-400 animate-pulse'}`} />
                            {!profitIsLocked && !isDayLocked && (
                                <button onClick={() => setShowLockConfirm(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black py-2 px-4 rounded-xl flex items-center gap-2 transition-all">
                                    <Save size={12}/> LOCK PROFIT
                                </button>
                            )}
                        </div>
                    </div>

                    <div onClick={() => setIsDiffModalOpen(true)} className="bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-indigo-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-indigo-300 transition-all">
                        <div>
                            <div className="flex items-center gap-2 text-indigo-600 mb-1 font-black text-[10px] uppercase tracking-wider">
                                <Scale size={14} /> Selisih (Laba - Profit) {results.isManualDiff && <span className="bg-amber-100 text-amber-600 text-[7px] px-1 rounded">MANUAL</span>}
                            </div>
                            <h2 className={`text-3xl font-black ${results.selisihProfit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatIDR(results.selisihProfit)}</h2>
                            <p className="text-[8px] mt-2 text-slate-400 font-bold uppercase">Potongan Akumulasi: {formatIDR(results.totalPotonganAccumulated)}</p>
                        </div>
                        <TrendingUp size={32} className={`opacity-10 ${results.selisihProfit < 0 ? 'text-red-600' : 'text-emerald-600'}`} />
                    </div>
                </div>
            </div>

            {/* Modal Detail Aset */}
            {isAssetModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={() => setIsAssetModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[3.5rem] overflow-hidden shadow-2xl">
                        <div className="bg-slate-50 p-6 md:p-8 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><Wallet size={24} /></div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Konsolidasi Aset Final</h3>
                            </div>
                            <button onClick={() => setIsAssetModalOpen(false)} className="p-3 bg-white shadow-sm rounded-full text-slate-400 hover:text-red-500"><X size={20}/></button>
                        </div>

                        <div className="p-6 md:p-8 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase ml-2">Aset Riil Dijumlahkan</h4>
                                    {[
                                        { label: 'Total Bank Real (Nett)', val: results.totalBankReal, icon: <CreditCard size={14}/>, color: 'text-blue-600' },
                                        { label: 'Settled Net', val: results.settledNetValue, icon: <Zap size={14}/>, color: 'text-yellow-600' },
                                        { label: 'Sisa Digiflazz', val: rekapData.sisaDigiflazz, icon: <Calculator size={14}/>, color: 'text-slate-600' },
                                        { label: 'Supplier DAS', val: displaySupplierBalances.DAS.real, icon: <ShieldAlert size={14}/>, color: 'text-blue-500' },
                                        { label: 'Supplier AMC', val: displaySupplierBalances.AMC.real, icon: <ShieldAlert size={14}/>, color: 'text-blue-500' },
                                        { label: 'Supplier HAO', val: displaySupplierBalances.HAO.real, icon: <ShieldAlert size={14}/>, color: 'text-blue-500' },
                                        { label: 'Supplier NEWBIEZ', val: displaySupplierBalances.NEWBIEZ.real, icon: <ShieldAlert size={14}/>, color: 'text-blue-500' },
                                        { label: 'Supplier OASIS', val: displaySupplierBalances.OASIS.real, icon: <ShieldAlert size={14}/>, color: 'text-blue-500' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-blue-50/30 rounded-2xl border border-blue-100">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg bg-white shadow-sm ${item.color}`}>{item.icon}</div>
                                                <span className="text-[10px] font-black text-slate-600 uppercase">{item.label}</span>
                                            </div>
                                            <span className="text-sm font-black text-slate-800">{formatIDR(item.val)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase ml-2">Informasi Pendukung (Non-Asset)</h4>
                                    {[
                                        { label: 'Bank BCA (Input)', val: rekapData.saldoBCA, icon: <CreditCard size={14}/>, color: 'text-slate-400' },
                                        { label: 'Bank BRI (Input)', val: rekapData.saldoBRI, icon: <Landmark size={14}/>, color: 'text-slate-400' },
                                        { label: 'Total Saldo Agen', val: results.totalSaldoAgen, icon: <ShieldAlert size={14}/>, color: 'text-red-400' },
                                        { label: 'Digiswitch (Catatan)', val: rekapData.saldoDigiswitch, icon: <Zap size={14}/>, color: 'text-slate-400' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex flex-col p-4 bg-slate-50 border border-slate-100 rounded-2xl opacity-70">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`${item.color}`}>{item.icon}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase">{item.label}</span>
                                            </div>
                                            <span className="text-sm font-black text-slate-500">{formatIDR(item.val)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 flex flex-col gap-3">
                            <button onClick={sendToTelegram} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg active:scale-95">
                                <Send size={16}/> Kirim Laporan Ke Telegram (Excel)
                            </button>
                            <button onClick={() => setIsAssetModalOpen(false)} className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest">Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Edit Selisih & Catatan */}
            {isDiffModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsDiffModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-3 uppercase text-indigo-600"><Scale size={20}/> Edit & Analisis</h3>
                        <div className="mb-6 text-center bg-indigo-50 p-4 rounded-2xl">
                             <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Selisih Terdeteksi</p>
                             <h4 className={`text-2xl font-black ${results.selisihProfit < 0 ? 'text-red-500' : 'text-indigo-600'}`}>{formatIDR(results.selisihProfit)}</h4>
                        </div>
                        <div className="mb-6">
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Koreksi Selisih Manual (Opsional)</label>
                            <input type="text" value={rekapData.manualDifference === null ? '' : formatIDR(rekapData.manualDifference)} onChange={(e) => handleManualChange('manualDifference', parseRawNumber(e.target.value))} className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 font-black text-slate-700 outline-none" placeholder="Masukkan nominal jika ingin koreksi..." />
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Catatan Analisis</label>
                            <textarea value={rekapData.catatanAnalisisLainnya} onChange={(e) => handleManualChange('catatanAnalisisLainnya', e.target.value)} placeholder="Tulis alasan jika ada selisih saldo..." className="w-full p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold min-h-[140px] resize-none outline-none"/>
                        </div>
                        <button onClick={() => { handleCloudSync(); setIsDiffModalOpen(false); }} className="w-full mt-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2"><Save size={16}/> Simpan</button>
                    </div>
                </div>
            )}
            
            {/* Modal Konfirmasi Lock */}
            {showLockConfirm && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white p-8 rounded-[2.5rem] max-w-sm w-full text-center shadow-2xl">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={32}/></div>
                        <h3 className="text-lg font-black mb-2 uppercase">Kunci Laporan?</h3>
                        <p className="text-[10px] text-slate-500 mb-6 font-bold uppercase">Data akan dibekukan permanen untuk menjaga integritas rekap harian.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowLockConfirm(false)} className="flex-1 py-4 bg-slate-100 rounded-xl font-black text-[10px] uppercase">Batal</button>
                            <button onClick={handleConfirmLock} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase">Kunci!</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function RekapanDashboard({ balances, totalProfit, yesterdayBalances, supplierDailyUsage, filterDate, webhookId, dailyStats }) {
    const WEBHOOK_TO_USE = webhookId || WEBHOOK_ID || "WEBHOOK_NOT_SET"; 
    return (
        <ErrorBoundary>
            <DashboardContent 
                externalBalances={balances} 
                totalProfit={totalProfit} 
                yesterdayBalances={yesterdayBalances}
                supplierDailyUsage={supplierDailyUsage}
                filterDate={filterDate}
                webhookId={WEBHOOK_TO_USE}
                dailyStats={dailyStats}
            />
        </ErrorBoundary>
    );
}
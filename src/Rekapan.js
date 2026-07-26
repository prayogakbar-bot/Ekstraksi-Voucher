import React, { useState, useEffect, Component, useMemo, useCallback } from 'react';
import { 
    Calculator, CreditCard, Wallet, X, ShieldAlert,
    TrendingUp, PiggyBank, RefreshCcw, Landmark, Zap, 
    Scale, Lock, Unlock, Plus, Trash2, Save, RotateCcw, CheckCircle2,
    PlusSquare, ChevronRight, Coffee, Calendar, Info, Send, Edit3, ArrowUpRight, AlertTriangle
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
    const [isSupplierEdit, setIsSupplierEdit] = useState(false);
    
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isDayLocked, setIsDayLocked] = useState(false);
    const [syncStatus, setSyncStatus] = useState('');
    const [profitIsLocked, setProfitIsLocked] = useState(false);

    const [agents, setAgents] = useState([]);
    const [tempOpsName, setTempOpsName] = useState('');
    const [tempOpsValue, setTempOpsValue] = useState(0);
    const [labaBersihKemarin, setLabaBersihKemarin] = useState(0);

    const emptyData = {
        modalUtama: 0, saldoBCA: 0, saldoBRI: 0, settledDigiflazz: 0, saldoMidtrans: 0, sisaDigiflazz: 0,
        saldoDigiswitch: 0, biayaOpsList: [], catatanAnalisisLainnya: '',
        profitCloudSistem: 0, 
        lockedSupplierBalances: null,
        manualSupplierAdjustments: {},
        confirmedTopups: {}, 
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
            let baseData;
            
            if (isSnapshotLocked) {
                const snapshot = rekapData.lockedSupplierBalances[name];
                baseData = typeof snapshot === 'object' ? snapshot : { real: snapshot || 0, kemarin: 0, pakai: 0 };
            } else {
                baseData = {
                    real: parseRawNumber(externalBalances?.[name]),
                    kemarin: yesterdayBalances?.[name] || 0,
                    pakai: supplierDailyUsage?.[filterDate]?.[name] || 0
                };
            }

            const realFinal = manualVal !== undefined ? manualVal : baseData.real;
            const expected = baseData.kemarin - baseData.pakai;
            const diff = realFinal - expected;
            const tambah = diff > 0 ? diff : 0;

            return {
                ...baseData,
                real: realFinal,
                tambah: tambah,
                isJanggal: !rekapData.confirmedTopups?.[name] && (realFinal !== expected)
            };
        };

        const suppliers = {
            DAS: getSupData('DAS'),
            HAO: getSupData('HAO'),
            AMC: getSupData('AMC'),
            NEWBIEZ: getSupData('NEWBIEZ'),
            OASIS: getSupData('OASIS'),
            ANTUM: getSupData('ANTUM'),
            isLocked: isSnapshotLocked
        };

        let totalKemarin = 0;
        let totalPakai = 0;
        let totalReal = (rekapData.sisaDigiflazz || 0);
        let anyJanggal = false;
        let totalTambah = 0;

        ['DAS', 'AMC', 'HAO', 'NEWBIEZ', 'OASIS', 'ANTUM'].forEach(name => {
            const s = suppliers[name];
            totalKemarin += s.kemarin;
            totalPakai += s.pakai;
            totalReal += s.real;
            totalTambah += s.tambah;
            if (s.isJanggal) anyJanggal = true;
        });

        return {
            ...suppliers,
            aggregate: {
                kemarin: totalKemarin,
                pakai: totalPakai,
                tambah: totalTambah,
                isAnyJanggal: anyJanggal
            }
        };
    }, [rekapData.lockedSupplierBalances, rekapData.manualSupplierAdjustments, rekapData.sisaDigiflazz, rekapData.confirmedTopups, externalBalances, yesterdayBalances, supplierDailyUsage, filterDate]);

    const results = useMemo(() => {
        const totalSaldoAgen = agents
            .filter(a => {
                const n = a.name.toLowerCase();
                return !n.includes('owner') && !n.includes('digiflazz');
            })
            .reduce((sum, a) => sum + (parseInt(a.balance) || 0), 0);

        const totalBankKotor = (rekapData.saldoBCA || 0) + (rekapData.saldoBRI || 0);
        const totalBankReal = totalBankKotor - totalSaldoAgen;
        
        const dayOfMonth = new Date(selectedDate).getDate();
        const POTONGAN_PER_HARI = 2775;
        const totalPotonganAccumulated = dayOfMonth * POTONGAN_PER_HARI;
        
        const settledNet = rekapData.settledDigiflazz > 0 ? (rekapData.settledDigiflazz - POTONGAN_PER_HARI) : 0;
        const midtransNet = (rekapData.saldoMidtrans || 0);
        
        const currentSupplierSum = (rekapData.sisaDigiflazz || 0) + 
                                    displaySupplierBalances.DAS.real + 
                                    displaySupplierBalances.AMC.real + 
                                    displaySupplierBalances.HAO.real +
                                    displaySupplierBalances.NEWBIEZ.real +
                                    displaySupplierBalances.OASIS.real +
                                    displaySupplierBalances.ANTUM.real;

        const currentTotalAsset = totalBankReal + currentSupplierSum + settledNet + midtransNet;

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
            midtransValue: midtransNet,
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

    const handleConfirmTopup = (supplierName) => {
        setRekapData(prev => ({
            ...prev,
            confirmedTopups: {
                ...(prev.confirmedTopups || {}),
                [supplierName]: true
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
            OASIS: displaySupplierBalances.OASIS,
            ANTUM: displaySupplierBalances.ANTUM
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

    const sendToTelegram = async () => {
        setSyncStatus('Preparing Excel...');
        try {
            const f = (v) => formatIDR(v || 0);
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
                ["Saldo Midtrans", f(results.midtransValue)],
                ["Saldo Digiflazz", f(rekapData.sisaDigiflazz)],
                ["Supplier DAS", f(displaySupplierBalances.DAS.real)],
                ["Supplier AMC", f(displaySupplierBalances.AMC.real)],
                ["Supplier HAO", f(displaySupplierBalances.HAO.real)],
                ["Supplier NEWBIEZ", f(displaySupplierBalances.NEWBIEZ.real)],
                ["Supplier OASIS", f(displaySupplierBalances.OASIS.real)],
                ["Supplier ANTUM", f(displaySupplierBalances.ANTUM.real)],
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
                            `STATISTIK TRANSAKSI\n` +
                            `Sukses: ${activeStats.successTrx || 0}\n` +
                            `Gagal: ${activeStats.failedTrx || 0}\n\n` +
                            `PERFORMA KEUANGAN\n` +
                            `Laba Harian: ${f(results.profitKotor)}\n` +
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
                // Setelah laporan pertama terkirim, kirim otomatis Laporan Sisa Saldo Supplier
                setSyncStatus('Sending Saldo Report...');
                
                const messageSupplier = `LAPORAN SISA SALDO SUPPLIER\n` +
                                       `Tanggal: ${selectedDate}\n\n` +
                                       `DIGIFLAZZ: ${f(rekapData.sisaDigiflazz)}\n` +
                                       `DAS: ${f(displaySupplierBalances.DAS.real)}\n` +
                                       `HAO: ${f(displaySupplierBalances.HAO.real)}\n` +
                                       `AMC: ${f(displaySupplierBalances.AMC.real)}\n` +
                                       `OASIS: ${f(displaySupplierBalances.OASIS.real)}\n` +
                                       `NEWBIEZ: ${f(displaySupplierBalances.NEWBIEZ.real)}\n` +
                                       `ANTUM: ${f(displaySupplierBalances.ANTUM.real)}\n\n` +
                                       `TOTAL SALDO SUPPLIER: ${f(results.totalSupplierBalance)}`;

                const respSupplier = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: TELEGRAM_CHAT_ID,
                        text: messageSupplier,
                        parse_mode: 'HTML'
                    })
                });

                if (respSupplier.ok) {
                    setSyncStatus('Sent!');
                    alert('Laporan Rekapan Harian & Laporan Saldo Supplier Berhasil Terkirim ke Telegram!');
                } else {
                    throw new Error('Laporan pertama terkirim, tetapi gagal mengirim laporan saldo supplier.');
                }
            } else {
                const errData = await response.json();
                throw new Error(errData.description || 'Gagal mengirim laporan rekapan harian');
            }
        } catch (error) {
            setSyncStatus('Failed');
            alert('Gagal mengirim laporan: ' + error.message);
        } finally {
            setTimeout(() => setSyncStatus('Live'), 3000);
        }
    };

    return (
        <div className="bg-slate-50 p-3 md:p-8 font-sans text-slate-900 rounded-[2rem] min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
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
                            <Save size={16} /> SIMPAN
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

                {/* Statistik Atas */}
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

                {/* 1. Komponen Aset & Info */}
                <div className="w-full mb-8">
                    <div className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-black uppercase text-blue-600 flex items-center gap-2 tracking-widest"><Wallet size={16} /> 1. Komponen Aset & Info</h3>
                            <button onClick={() => setIsSupplierEdit(!isSupplierEdit)} className="text-[10px] font-black underline text-blue-700 uppercase flex items-center gap-1">
                                <Edit3 size={12}/> {isSupplierEdit ? 'Selesai' : 'Edit Supplier'}
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                            <StableInput id="saldoBCA" value={rekapData.saldoBCA} onChange={handleManualChange} label="BCA (Info)" icon={<CreditCard size={10}/>} color="text-slate-400" bg="bg-slate-50" border="focus:border-blue-200" disabled={isDayLocked} />
                            <StableInput id="saldoBRI" value={rekapData.saldoBRI} onChange={handleManualChange} label="BRI (Info)" icon={<Landmark size={10}/>} color="text-slate-400" bg="bg-slate-50" border="focus:border-orange-200" disabled={isDayLocked} />
                            <StableInput id="settledDigiflazz" value={rekapData.settledDigiflazz} onChange={handleManualChange} label="Settled Digiflazz" icon={<Calculator size={10}/>} color="text-emerald-600" bg="bg-emerald-50/30" border="focus:border-emerald-500" disabled={isDayLocked} />
                            <StableInput id="saldoMidtrans" value={rekapData.saldoMidtrans} onChange={handleManualChange} label="Saldo Midtrans" icon={<Wallet size={10}/>} color="text-blue-600" bg="bg-blue-50/30" border="focus:border-blue-500" disabled={isDayLocked} />
                            <StableInput id="saldoDigiswitch" value={rekapData.saldoDigiswitch} onChange={handleManualChange} label="Digiswitch (Catatan)" icon={<Zap size={10}/>} color="text-slate-400" bg="bg-slate-50" border="focus:border-slate-300" disabled={isDayLocked} />
                        </div>

                        {/* Bar Status Saldo Agen */}
                        <div className="w-full px-6 py-4 bg-blue-50/50 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 border border-blue-100 mb-6">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Total Saldo Agen:</span>
                                    <span className="text-sm font-black text-red-500">{formatIDR(results.totalSaldoAgen)}</span>
                                </div>
                                <div className="h-8 w-[1px] bg-blue-200 hidden md:block"></div>
                                <div className="flex flex-col">
                                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">Bank Real (Nett Asset):</span>
                                    <span className="text-sm font-black text-blue-700">{formatIDR(results.totalBankReal)}</span>
                                </div>
                            </div>
                            <div className="bg-white/50 px-4 py-2 rounded-xl border border-blue-200 hidden md:block">
                                <span className="text-[10px] font-black text-blue-500 uppercase">Status: Terkonsolidasi</span>
                            </div>
                        </div>

                        {/* Supplier Area */}
                        <div className="bg-slate-50 p-6 md:p-8 rounded-[2rem] border border-slate-200">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                                <div className="space-y-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Total Asset Supplier</span>
                                        </div>
                                        <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter">{formatIDR(results.totalSupplierBalance)}</h2>
                                    </div>
                                    
                                    {/* Stats Agregat */}
                                    <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 border-t border-slate-200">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">Saldo Kemarin</span>
                                            <span className="text-[11px] font-black text-slate-600">{formatIDR(displaySupplierBalances.aggregate.kemarin)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-bold text-red-400 uppercase">Total Pengurangan</span>
                                            <span className="text-[11px] font-black text-red-500">-{formatIDR(displaySupplierBalances.aggregate.pakai)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-bold text-emerald-400 uppercase">Total Penambahan</span>
                                            <span className="text-[11px] font-black text-emerald-600">+{formatIDR(displaySupplierBalances.aggregate.tambah)}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">Status Saldo</span>
                                            {displaySupplierBalances.aggregate.isAnyJanggal ? (
                                                <span className="text-[11px] font-black text-orange-600 flex items-center gap-1"><AlertTriangle size={10}/> JANGGAL</span>
                                            ) : (
                                                <span className="text-[11px] font-black text-emerald-600 flex items-center gap-1"><CheckCircle2 size={10}/> NORMAL</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl flex items-center gap-4 w-full md:max-w-md shadow-sm">
                                    <div className="p-2 bg-blue-50 rounded-xl flex-shrink-0"><Calculator size={20} className="text-blue-600"/></div>
                                    <div className="flex flex-col w-full">
                                        <span className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-wider">Sisa Saldo Digiflazz</span>
                                        <input 
                                            type="text" 
                                            value={formatIDR(rekapData.sisaDigiflazz)} 
                                            onChange={(e) => handleManualChange('sisaDigiflazz', parseRawNumber(e.target.value))}
                                            className="bg-transparent text-slate-800 font-black text-lg outline-none border-none w-full focus:text-blue-600 transition-colors"
                                            disabled={isDayLocked}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* List Supplier Individual */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {['DAS', 'AMC', 'HAO', 'NEWBIEZ', 'OASIS', 'ANTUM'].map((name) => {
                                    const data = displaySupplierBalances[name];
                                    const isJanggal = data.isJanggal;

                                    return (
                                        <div key={name} className={`flex flex-col p-5 rounded-[1.5rem] border transition-all ${isJanggal ? 'bg-orange-50 border-orange-200 shadow-md' : 'bg-white border-slate-100 hover:shadow-sm'}`}>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] ${isJanggal ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                        {name.substring(0, 3)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-slate-800 text-xs uppercase flex items-center gap-2">
                                                            {name} 
                                                            {isJanggal ? (
                                                                <span className="bg-orange-500 text-white text-[7px] px-2 py-0.5 rounded animate-pulse">JANGGAL</span>
                                                            ) : (
                                                                <span className="text-emerald-500 text-[8px] font-black flex items-center gap-1">● NORMAL</span>
                                                            )}
                                                        </h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {isSupplierEdit ? (
                                                                <input 
                                                                    type="text" 
                                                                    className="bg-blue-50 text-blue-600 text-xs font-black px-2 py-1 rounded border border-blue-200 w-32 outline-none" 
                                                                    value={formatIDR(data.real)} 
                                                                    onChange={(e) => handleSupplierManualEdit(name, parseRawNumber(e.target.value))} 
                                                                />
                                                            ) : (
                                                                <span className={`text-sm font-black ${isJanggal ? 'text-orange-600' : 'text-slate-700'}`}>{formatIDR(data.real)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {isJanggal && (
                                                    <button onClick={() => handleConfirmTopup(name)} className="bg-orange-500 hover:bg-orange-600 text-white text-[8px] font-black px-3 py-2 rounded-lg uppercase transition-all">Konfirmasi</button>
                                                )}
                                            </div>

                                            {/* Rincian Angka Supplier */}
                                            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[7px] font-black text-slate-400 uppercase">Kemarin</span>
                                                    <span className="text-[10px] font-bold text-slate-500">{formatIDR(data.kemarin)}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[7px] font-black text-red-400 uppercase">Pakai (-)</span>
                                                    <span className="text-[10px] font-bold text-red-500">-{formatIDR(data.pakai)}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[7px] font-black text-emerald-500 uppercase">Tambah (+)</span>
                                                    <span className={`text-[10px] font-bold ${data.tambah > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>+{formatIDR(data.tambah)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ringkasan Laba Utama */}
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

                {/* Selisih & Profit Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-900 p-6 md:p-8 rounded-[2.5rem] text-white flex justify-between items-center shadow-xl">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total Profit (Auto)</p> 
                                {profitIsLocked && <span className="bg-blue-500/20 text-blue-400 text-[8px] px-2 py-0.5 rounded-full font-black border border-blue-500/30">LOCKED</span>}
                            </div>
                            <h2 className="text-3xl font-black">{formatIDR(results.profitBasis)}</h2>
                            <p className="text-[10px] text-emerald-400 font-black uppercase mt-2">Laba Hari Ini: {formatIDR(results.profitKotor)}</p>
                        </div>
                        <TrendingUp size={32} className={`${profitIsLocked ? 'text-blue-400' : 'text-emerald-400 animate-pulse'}`} />
                    </div>

                    <div onClick={() => setIsDiffModalOpen(true)} className="bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-indigo-100 shadow-sm flex justify-between items-center cursor-pointer hover:border-indigo-300 transition-all">
                        <div>
                            <div className="flex items-center gap-2 text-indigo-600 mb-1 font-black text-[10px] uppercase tracking-wider">
                                <Scale size={14} /> Selisih (Laba - Profit)
                            </div>
                            <h2 className={`text-3xl font-black ${results.selisihProfit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatIDR(results.selisihProfit)}</h2>
                            <p className="text-[8px] mt-2 text-slate-400 font-bold uppercase tracking-tight">Akumulasi Potongan Harian: {formatIDR(results.totalPotonganAccumulated)}</p>
                        </div>
                        <Scale size={32} className="opacity-10 text-indigo-600" />
                    </div>
                </div>

                {/* Bagian Bawah: Biaya Ops & Modal Utama */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-5 md:p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-2 tracking-widest"><Coffee size={16} /> 2. Biaya Operasional</h3>
                            <button onClick={() => setIsOpsLock(!isOpsLock)} disabled={isDayLocked} className="text-[10px] font-black underline text-amber-700 uppercase">{isOpsLock ? 'BUKA' : 'KUNCI'}</button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input type="text" placeholder="Keterangan..." value={tempOpsName} onChange={(e) => setTempOpsName(e.target.value)} disabled={isOpsLock || isDayLocked} className="flex-1 p-4 bg-amber-50/30 rounded-2xl outline-none font-bold text-xs border border-transparent focus:border-amber-200" />
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Rp 0" value={tempOpsValue === 0 ? '' : formatIDR(tempOpsValue)} onChange={(e) => setTempOpsValue(parseRawNumber(e.target.value))} disabled={isOpsLock || isDayLocked} className="flex-1 sm:w-40 p-4 bg-amber-50/30 rounded-2xl outline-none font-bold text-xs text-right border border-transparent focus:border-amber-200" />
                                    <button onClick={addOpsItem} disabled={isOpsLock || isDayLocked} className="p-4 bg-amber-500 text-white rounded-2xl hover:bg-amber-600 shadow-lg shadow-amber-500/20"><Plus size={20}/></button>
                                </div>
                            </div>
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                                {rekapData.biayaOpsList?.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-amber-100 transition-all">
                                        <span className="text-xs font-bold text-slate-700">{item.name}</span>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-black text-amber-600">{formatIDR(item.amount)}</span>
                                            <button onClick={() => removeOpsItem(item.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:scale-110"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-red-50/40 p-6 md:p-8 rounded-[2.5rem] border-2 border-red-100/50 flex flex-col justify-center h-full min-h-[200px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[10px] font-black uppercase text-red-600 flex items-center gap-2 tracking-widest"><PiggyBank size={16} /> Modal Utama</h3>
                            <button onClick={() => setIsModalLock(!isModalLock)} disabled={isDayLocked} className="text-[10px] font-black underline text-red-700 uppercase">{isModalLock ? 'BUKA' : 'KUNCI'}</button>
                        </div>
                        <input 
                            type="text"
                            inputMode="numeric"
                            value={formatIDR(rekapData.modalUtama)}
                            onChange={(e) => handleManualChange('modalUtama', parseRawNumber(e.target.value))}
                            disabled={isModalLock || isDayLocked}
                            className="w-full px-6 py-8 bg-white/80 rounded-[2rem] border-2 border-transparent focus:border-red-200 outline-none text-3xl font-black text-red-600 transition-all disabled:opacity-60"
                        />
                    </div>
                </div>
            </div>

            {/* Modal Detail Aset */}
            {isAssetModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={() => setIsAssetModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-2xl rounded-[3.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-50 p-6 md:p-8 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg"><Wallet size={24} /></div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Konsolidasi Aset Final</h3>
                            </div>
                            <button onClick={() => setIsAssetModalOpen(false)} className="p-3 bg-white shadow-sm rounded-full text-slate-400 hover:text-red-500"><X size={20}/></button>
                        </div>
                        <div className="p-8 flex flex-col gap-3">
                            <button onClick={sendToTelegram} className="w-full py-5 bg-emerald-600 text-white rounded-[1.8rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-[0.98]">
                                <Send size={20}/> Kirim Laporan Ke Telegram (Excel)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Edit Selisih */}
            {isDiffModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsDiffModalOpen(false)} />
                    <div className="relative bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
                        <h3 className="text-xl font-black mb-6 flex items-center gap-3 uppercase text-indigo-600 tracking-widest"><Scale size={20}/> Edit & Analisis</h3>
                        <div className="space-y-5">
                            <input type="text" value={rekapData.manualDifference === null ? '' : formatIDR(rekapData.manualDifference)} onChange={(e) => handleManualChange('manualDifference', parseRawNumber(e.target.value))} className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 font-black text-slate-700 outline-none focus:border-indigo-400 transition-all" placeholder="Nominal koreksi..." />
                            <textarea value={rekapData.catatanAnalisisLainnya} onChange={(e) => handleManualChange('catatanAnalisisLainnya', e.target.value)} placeholder="Alasan selisih saldo..." className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold min-h-[160px] resize-none outline-none focus:border-indigo-400 transition-all shadow-inner"/>
                        </div>
                        <button onClick={() => { handleCloudSync(); setIsDiffModalOpen(false); }} className="w-full mt-8 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 active:scale-95 shadow-lg"><Save size={18}/> Simpan Perubahan</button>
                    </div>
                </div>
            )}
            
            {showLockConfirm && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative bg-white p-10 rounded-[3rem] max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><Lock size={36}/></div>
                        <h3 className="text-xl font-black mb-2 uppercase tracking-tight">Kunci Laporan?</h3>
                        <p className="text-[10px] text-slate-500 mb-8 font-bold uppercase tracking-wide px-4">Data akan dibekukan permanen untuk menjaga integritas harian.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowLockConfirm(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500">Batal</button>
                            <button onClick={handleConfirmLock} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/30">Ya, Kunci!</button>
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
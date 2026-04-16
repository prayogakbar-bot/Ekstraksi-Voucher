import React, { useState } from 'react';

const Validator = () => {
    // Webhook ID Variable tetap ada di latar belakang [2025-12-19]
    const webhookId = process.env.REACT_APP_WEBHOOK_ID || "WH-7821-X902"; 
    
    const [inputRaw, setInputRaw] = useState("");
    const [historyReguler, setHistoryReguler] = useState([]);
    const [historyData, setHistoryData] = useState([]);
    const [historyTelpon, setHistoryTelpon] = useState([]);
    const [copyStatus, setCopyStatus] = useState(null);
    const [activeType, setActiveType] = useState("reguler");
    const [errorMessage, setErrorMessage] = useState("");

    const extractData = (rawText, type) => {
        const getVal = (key) => {
            const pattern = new RegExp(`${key}\\s*[:=]\\s*(.*)`, 'i');
            const match = rawText.match(pattern);
            return match ? match[1].trim() : null;
        };

        const dateMatch = rawText.match(/\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}/);
        let tanggalAsli = dateMatch ? dateMatch[0] : new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        let tujuanRaw = getVal("Nomor") || getVal("Tujuan") || rawText.match(/08\d{8,11}/)?.[0] || "-";
        const tujuan = tujuanRaw.startsWith('0') ? '62' + tujuanRaw.slice(1) : tujuanRaw;
        const sn = getVal("SN") || getVal("Ref ID") || rawText.match(/\d{15,20}/)?.[0] || "0";
        const statusRaw = (getVal("Status") || (rawText.toLowerCase().includes("sukses") ? "Success" : "Failed")).toLowerCase();
        const isSuccess = statusRaw.includes("sukses") || statusRaw.includes("success");

        const d = new Date(tanggalAsli.replace(/-/g, '/'));

        if (type === "reguler") {
            const produkText = getVal("Produk") || "";
            let nominal = "0";
            const matchNominal = produkText.match(/(\d+)(?:\.\d{3})?|(\d+)/);
            if (matchNominal) nominal = matchNominal[1] || matchNominal[2];
            return `${tanggalAsli} ${nominal} ${tujuan} ${sn} ${isSuccess ? 'Success' : 'Failed'}`;
        } else if (type === "telpon") {
            d.setSeconds(d.getSeconds() + 5);
            const tglShort = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
            return `Isi paket untuk no. ${tujuan} telah berhasil dengan SN : ${sn} pada ${tglShort}`;
        } else {
            let produkFull = getVal("Produk") || "Internet";
            if (produkFull.toLowerCase().includes("data flash")) {
                produkFull = produkFull.replace(/Telkomsel Data Flash/i, "Internet").replace(/\s+/g, ' ');
            }
            const tglData = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)} ${tanggalAsli.split(' ')[1]}`;
            return `${sn}\n${tglData}\n${tglData}\n${tujuan}\n${produkFull}\nsuccess`;
        }
    };

    const handleProcess = () => {
        setErrorMessage("");
        if (!inputRaw.trim()) return;

        const lowInput = inputRaw.toLowerCase();
        const isByu = lowInput.includes("byu");
        const isTelepon = lowInput.includes("telepon") || lowInput.includes("tps");
        const isData = lowInput.includes("data") || lowInput.includes("flash") || lowInput.includes("internet");

        // --- SISTEM FILTER MUTLAK ---
        
        if (activeType === "telpon") {
            // Hanya proses jika ada kata telepon/tps DAN bukan byu/data
            if (!isTelepon || isByu || isData) {
                setErrorMessage("❌ REJECTED: Tab Telpon Pas dilarang berisi data by.U, Reguler, atau Paket Data.");
                return;
            }
        }

        if (activeType === "data") {
            // Hanya proses jika ada kata data/flash/internet DAN bukan byu/telpon/reguler murni
            if (!isData || isByu || isTelepon) {
                setErrorMessage("❌ REJECTED: Tab Paket Data dilarang berisi data by.U, Telpon Pas, atau Reguler.");
                return;
            }
        }

        if (activeType === "reguler") {
            // Menolak jika terdeteksi telpon pas atau data (kecuali byu data yang masuk reguler)
            if ((isTelepon || isData) && !isByu) {
                setErrorMessage("❌ REJECTED: Gunakan Tab Khusus untuk Telpon atau Paket Data Telkomsel.");
                return;
            }
        }

        const result = extractData(inputRaw, activeType);
        if (activeType === "reguler") {
            setHistoryReguler([result, ...historyReguler]);
        } else if (activeType === "telpon") {
            setHistoryTelpon([result, ...historyTelpon]);
        } else {
            setHistoryData([result, ...historyData]);
        }
        setInputRaw("");
    };

    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopyStatus(id);
            setTimeout(() => setCopyStatus(null), 2000);
        });
    };

    const TrashIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );

    return (
        <div className="max-w-[1400px] mx-auto p-6 font-sans antialiased bg-slate-50 min-h-screen">
            <header className="mb-10 text-center">
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                    VALIDATOR <span className="text-red-600 underline decoration-wavy decoration-red-200">PRO EXCLUSIVE</span>
                </h1>
            </header>

            <div className="max-w-3xl mx-auto bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200 border border-slate-100 mb-12">
                <div className="flex gap-3 mb-6 bg-slate-100 p-2 rounded-2xl">
                    <button onClick={() => {setActiveType("reguler"); setErrorMessage("");}} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${activeType === "reguler" ? 'bg-white text-red-600 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}>⚡ Reguler / by.U</button>
                    <button onClick={() => {setActiveType("telpon"); setErrorMessage("");}} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${activeType === "telpon" ? 'bg-white text-emerald-600 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}>📞 Telpon Pas</button>
                    <button onClick={() => {setActiveType("data"); setErrorMessage("");}} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all duration-300 ${activeType === "data" ? 'bg-white text-blue-600 shadow-sm scale-105' : 'text-slate-400 hover:text-slate-600'}`}>📦 Paket Data</button>
                </div>

                <div className="relative">
                    <textarea value={inputRaw} onChange={(e) => setInputRaw(e.target.value)} placeholder="Tempel laporan di sini..." className={`w-full h-44 p-6 bg-slate-50 border-2 rounded-[1.5rem] text-sm font-mono outline-none transition-all ${errorMessage ? 'border-red-500 bg-red-50' : 'border-slate-100 focus:border-red-500'}`} />
                    {errorMessage && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/95 rounded-[1.5rem] backdrop-blur-sm px-10 text-center animate-in fade-in zoom-in duration-300">
                            <div>
                                <div className="text-red-600 text-4xl mb-2">🚫</div>
                                <p className="text-slate-900 font-black text-xs uppercase tracking-widest mb-4 leading-relaxed">{errorMessage}</p>
                                <button onClick={() => setErrorMessage("")} className="bg-slate-900 text-white px-8 py-2 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors">Perbaiki Input</button>
                            </div>
                        </div>
                    )}
                </div>
                
                <button onClick={handleProcess} className="w-full mt-6 bg-slate-900 hover:bg-black text-white font-black py-5 rounded-2xl transition-all uppercase tracking-[0.3em] text-[10px] shadow-xl active:scale-95">Proses Laporan</button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Kolom REGULER */}
                <div className="space-y-4">
                    <div className="bg-white p-5 rounded-[2rem] shadow-sm border-t-8 border-red-600 h-full">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Reguler / by.U</h2>
                            <button onClick={() => setHistoryReguler([])} className="text-[9px] font-bold text-slate-300 hover:text-red-600 transition-colors uppercase">Clear</button>
                        </div>
                        <div className="space-y-4">
                            {historyReguler.map((item, i) => (
                                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                                    <code className="text-[10px] font-mono text-slate-600 leading-relaxed">{item}</code>
                                    <button onClick={() => copyToClipboard(item, `reg-${i}`)} className={`ml-3 p-2 rounded-xl transition-all ${copyStatus === `reg-${i}` ? 'bg-green-500 text-white' : 'bg-white text-slate-400 group-hover:bg-red-600 group-hover:text-white shadow-sm'}`}>
                                        {copyStatus === `reg-${i}` ? '✓' : '📋'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Kolom TELPON PAS */}
                <div className="space-y-4">
                    <div className="bg-white p-5 rounded-[2rem] shadow-sm border-t-8 border-emerald-600 h-full">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest text-emerald-700">Telpon Pas</h2>
                            <button onClick={() => setHistoryTelpon([])} className="text-[9px] font-bold text-slate-300 hover:text-emerald-600 transition-colors uppercase">Clear</button>
                        </div>
                        <div className="space-y-4">
                            {historyTelpon.map((item, i) => (
                                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-start group hover:bg-white hover:shadow-md transition-all">
                                    <code className="text-[10px] font-mono text-slate-600 leading-tight">{item}</code>
                                    <button onClick={() => copyToClipboard(item, `tel-${i}`)} className={`ml-3 p-2 rounded-xl transition-all ${copyStatus === `tel-${i}` ? 'bg-green-500 text-white' : 'bg-white text-slate-400 group-hover:bg-emerald-600 group-hover:text-white shadow-sm'}`}>
                                        {copyStatus === `tel-${i}` ? '✓' : '📋'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Kolom PAKET DATA */}
                <div className="space-y-4">
                    <div className="bg-white p-5 rounded-[2rem] shadow-sm border-t-8 border-blue-600 h-full">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest text-blue-700">Paket Data</h2>
                            <button onClick={() => setHistoryData([])} className="text-[9px] font-bold text-slate-300 hover:text-blue-600 transition-colors uppercase">Clear</button>
                        </div>
                        <div className="space-y-4">
                            {historyData.map((item, i) => (
                                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-start group hover:bg-white hover:shadow-md transition-all">
                                    <code className="text-[10px] font-mono text-slate-600 whitespace-pre leading-tight">{item}</code>
                                    <button onClick={() => copyToClipboard(item, `dat-${i}`)} className={`ml-3 p-2 rounded-xl transition-all ${copyStatus === `dat-${i}` ? 'bg-green-500 text-white' : 'bg-white text-slate-400 group-hover:bg-blue-600 group-hover:text-white shadow-sm'}`}>
                                        {copyStatus === `dat-${i}` ? '✓' : '📋'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Validator;
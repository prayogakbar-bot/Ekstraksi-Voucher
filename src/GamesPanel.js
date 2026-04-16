import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';

const GamesPanel = () => {
    // Webhook ID Variable berdasarkan instruksi tersimpan [2025-12-19]
    const webhookId = "YOUR_WEBHOOK_ID_HERE";
    
    const ffResultRef = useRef(null);
    const mlResultRef = useRef(null);

    // --- STATE GAMES PANEL ---
    const [profitML, setProfitML] = useState(0); 
    const [rateTotal, setRateTotal] = useState(88000); 
    const [rateDivider, setRateDivider] = useState(330); 
    const [activeTab, setActiveTab] = useState('ml'); 
    const [isCopied, setIsCopied] = useState(false); 
    const [imageStatus, setImageStatus] = useState('idle'); // 'idle' | 'loading' | 'success'
    const [imageStatusML, setImageStatusML] = useState('idle');

    const [mlInput, setMlInput] = useState(""); 
    const [ffInput, setFfInput] = useState(""); 
    const [mlResult, setMlResult] = useState(null); 
    const [ffResult, setFfResult] = useState(null); 

    const ffpData = [
        { id: "FFP5", dm: "5 Diamond", sum: 3 }, { id: "FFP10", dm: "10 Diamond", sum: 6 },
        { id: "FFP12", dm: "12 Diamond", sum: 7 }, { id: "FFP20", dm: "20 Diamond", sum: 12 },
        { id: "FFP25", dm: "25 Diamond", sum: 15 }, { id: "FFP30", dm: "30 Diamond", sum: 18 },
        { id: "FFP40", dm: "40 Diamond", sum: 24 }, { id: "FFP50", dm: "50 Diamond", sum: 24 },
        { id: "FFP70", dm: "70 Diamond", sum: 33 }, { id: "FFP75", dm: "75 Diamond", sum: 36 },
        { id: "FFP80", dm: "80 Diamond", sum: 39 }, { id: "FFP90", dm: "90 Diamond", sum: 45 },
        { id: "FFP95", dm: "95 Diamond", sum: 48 }, { id: "FFP100", dm: "100 Diamond", sum: 48 },
        { id: "FFP120", dm: "120 Diamond", sum: 57 }, { id: "FFP130", dm: "130 Diamond", sum: 63 },
        { id: "FFP140", dm: "140 Diamond", sum: 66 }, { id: "FFP145", dm: "145 Diamond", sum: 69 },
        { id: "FFP150", dm: "150 Diamond", sum: 72 }, { id: "FFP160", dm: "160 Diamond", sum: 78 },
        { id: "FFP190", dm: "190 Diamond", sum: 90 }, { id: "FFP200", dm: "200 Diamond", sum: 96 },
        { id: "FFP210", dm: "210 Diamond", sum: 99 }, { id: "FFP250", dm: "250 Diamond", sum: 117 },
        { id: "FFP280", dm: "280 Diamond", sum: 132 }, { id: "FFP350", dm: "350 Diamond", sum: 165 },
        { id: "FFP355", dm: "355 Diamond", sum: 165 }, { id: "FFP375", dm: "375 Diamond", sum: 174 },
        { id: "FFP400", dm: "400 Diamond", sum: 186 }, { id: "FFP405", dm: "405 Diamond", sum: 189 },
        { id: "FFP425", dm: "425 Diamond", sum: 198 }, { id: "FFP475", dm: "475 Diamond", sum: 222 },
        { id: "FFP500", dm: "500 Diamond", sum: 231 }, { id: "FFP510", dm: "510 Diamond", sum: 237 },
        { id: "FFP545", dm: "545 Diamond", sum: 252 }, { id: "FFP565", dm: "565 Diamond", sum: 261 },
        { id: "FFP600", dm: "600 Diamond", sum: 282 }, { id: "FFP635", dm: "635 Diamond", sum: 297 },
        { id: "FFP700", dm: "700 Diamond", sum: 327 }, { id: "FFP720", dm: "720 Diamond", sum: 330 },
        { id: "FFP770", dm: "770 Diamond", sum: 354 }, { id: "FFP790", dm: "790 Diamond", sum: 363 },
        { id: "FFP800", dm: "800 Diamond", sum: 369 }, { id: "FFP860", dm: "860 Diamond", sum: 396 },
        { id: "FFP930", dm: "930 Diamond", sum: 429 }, { id: "FFP1000", dm: "1000 Diamond", sum: 462 },    
        { id: "FFP1050", dm: "1050 Diamond", sum: 486 }, { id: "FFP1075", dm: "1075 Diamond", sum: 498 },
        { id: "FFP1080", dm: "1080 Diamond", sum: 501 }, { id: "FFP1200", dm: "1200 Diamond", sum: 558 },
        { id: "FFP1300", dm: "1300 Diamond", sum: 603 }, { id: "FFP1440", dm: "1440 Diamond", sum: 660 },    
        { id: "FFP1450", dm: "1450 Diamond", sum: 666 }, { id: "FFP2000", dm: "2000 Diamond", sum: 924 },    
        { id: "FFP2140", dm: "2140 Diamond", sum: 990 }, { id: "FFP2180", dm: "2180 Diamond", sum: 1002 },   
        { id: "FFP2355", dm: "2355 Diamond", sum: 1080 }, { id: "FFP2720", dm: "2720 Diamond", sum: 1254 },   
        { id: "FFP3640", dm: "3640 Diamond", sum: 1674 }, { id: "FFP4000", dm: "4000 Diamond", sum: 1839 },   
        { id: "FFP6000", dm: "6000 Diamond", sum: 2772 }, { id: "FFP7290", dm: "7290 Diamond", sum: 3300 }    
    ];

    const mlData = [
        { id: "MLBWeekly", name: "Weekly Diamond Pass", base: 23295 },
        { id: "MLB5", name: "5 Diamond", base: 1476 },
        { id: "MLB10", name: "10 Diamond", base: 2945 },
        { id: "MLB14", name: "14 Diamond", base: 3929 },
        { id: "MLB22", name: "22 Diamond", base: 6211 },
        { id: "MLB28", name: "28 Diamond", base: 7630 },
        { id: "MLB42", name: "42 Diamond", base: 11422 },
        { id: "MLB56", name: "56 Diamond", base: 14736 },
        { id: "MLB70", name: "70 Diamond", base: 18523 },
        { id: "MLB75", name: "75 Diamond", base: 19944 },
        { id: "MLB78", name: "78 Diamond", base: 20417 },
        { id: "MLB84", name: "84 Diamond", base: 21837 },
        { id: "MLB85", name: "85 Diamond", base: 21837 },
        { id: "MLB86", name: "86 Diamond", base: 22064 },
        { id: "MLB110", name: "110 Diamond", base: 28205 },
        { id: "MLB112", name: "112 Diamond", base: 29427 },
        { id: "MLB140", name: "140 Diamond", base: 36528 },
        { id: "MLB145", name: "145 Diamond", base: 37228 },
        { id: "MLB172", name: "172 Diamond", base: 44576 },
        { id: "MLB185", name: "185 Diamond", base: 47890 },
        { id: "MLB210", name: "210 Diamond", base: 53783 },
        { id: "MLB222", name: "222 Diamond", base: 57541 },
        { id: "MLB250", name: "250 Diamond", base: 64459 },
        { id: "MLB257", name: "257 Diamond", base: 66353 },
        { id: "MLB344", name: "344 Diamond", base: 88604 },
        { id: "MLB355", name: "355 Diamond", base: 90970 },
        { id: "MLB706", name: "706 Diamond", base: 177359 },
        { id: "MLB875", name: "875 Diamond", base: 217845 },
        { id: "MLB1048", name: "1048 Diamond", base: 254985 },
        { id: "MLB1050", name: "1050 Diamond", base: 255472 },
        { id: "MLB1412", name: "1412 Diamond", base: 348261 },
        { id: "MLB2195", name: "2195 Diamond", base: 515140 },
        { id: "MLB2976", name: "2976 Diamond", base: 700945 },
        { id: "MLB3688", name: "3688 Diamond", base: 879895 },
        { id: "MLB5532", name: "5532 Diamond", base: 1298059 },
        { id: "MLB7502", name: "7502 Diamond", base: 1755368 },
        { id: "MLB9288", name: "9288 Diamond", base: 2168160 },
        { id: "MLB18576", name: "18576 Diamond", base: 4316293 }
    ]; 

    const contactInfo = `Website: https://ifyone.site\nDigiflazz: https://digiflazz.com/seller/o6n0Vo\nChannel Telegram: https://t.me/IFYOneofficial\nCustomer Service: @csifyone`;
    const formatNumber = (num) => new Intl.NumberFormat('id-ID').format(num);

    const parseRaw = (text, key) => {
        const pattern = new RegExp(`${key}\\s*[:=]\\s*(.*)`, 'i');
        const match = text.match(pattern);
        return match ? match[1].trim() : "-";
    }; 

    const processMLValidator = () => {
        if (!mlInput.trim()) return;
        let sn = parseRaw(mlInput, "SN").split(/Succsess|Sukses/i)[0].trim();
        let nick = "-", uid = "-";
        if (sn.includes("(") && sn.includes(")")) {
            const match = sn.match(/(.*)\((.*)\)/);
            if (match) { nick = match[1].trim(); uid = match[2].trim(); }
        } else {
            nick = sn;
            uid = parseRaw(mlInput, "Nomor").replace(/^\d+\.\s*/, "");
        }
        const product = parseRaw(mlInput, "Produk") !== "-" ? parseRaw(mlInput, "Produk") : parseRaw(mlInput, "Diamond");
        const trxId = (parseRaw(mlInput, "Ref ID") || parseRaw(mlInput, "ID Transaksi") || parseRaw(mlInput, "Nomor")).replace(/^\d+\.\s*/, "").toUpperCase();
        setMlResult({ trxId, product, nick, uid, time: parseRaw(mlInput, "Tanggal") });
    }; 

    const processFFValidator = () => {
        if (!ffInput.trim()) return;

        // 1. Ambil Data Dasar
        const product = (parseRaw(ffInput, "Produk") !== "-" ? parseRaw(ffInput, "Produk") : parseRaw(ffInput, "Diamond")).replace(/^[a-zA-Z0-9]+[\s-]*[-]\s*/, '').trim();
        const mainRefID = (parseRaw(ffInput, "Ref ID") || parseRaw(ffInput, "ID Transaksi") || parseRaw(ffInput, "Nomor")).replace(/^\d+\.\s*/, "").toUpperCase();
        
        let sn = parseRaw(ffInput, "SN");
        let nick = "-";
        let uid = parseRaw(ffInput, "Nomor").replace(/^\d+\.\s*/, "");
        let finalTrxId = mainRefID;

        // 2. Logika SN: Ambil RefId jika ada, jika tidak pakai Ref ID utama
        if (sn.toUpperCase().includes("REFID")) {
            // Memisahkan Nickname dan RefId (Contoh SN: UPAL-BHIZER. RefId : T260226YD9Y6ZQT7Q)
            const parts = sn.split(/RefId\s*[:]\s*/i);
            nick = parts[0].replace(/[.\s-]+$/, ""); // Mengambil teks sebelum "RefId"
            finalTrxId = parts[1] ? parts[1].trim().toUpperCase() : mainRefID; // Mengambil RefId dari SN
        } else if (sn.includes("(") && sn.includes(")")) {
            const match = sn.match(/(.*)\((.*)\)/);
            if (match) { nick = match[1].trim(); uid = match[2].trim(); }
        } else if (sn.includes("#")) {
            nick = sn;
        } else {
            nick = sn;
        }

        setFfResult({ 
            trxId: finalTrxId, 
            product, 
            nick, 
            uid, 
            time: parseRaw(ffInput, "Tanggal") 
        });
    }; 

    const generateFFP = () => {
        const currentRate = rateTotal / (rateDivider || 1);
        let text = `Daftar Harga Free Fire P (FFP)\nIFY ONE - Top Up Terpercaya\n\n`;
        ffpData.forEach(item => {
            let hpp = Math.round(item.sum * currentRate);
            text += `${item.id.padEnd(8, ' ')} ${item.dm.padEnd(14, ' ')} ${formatNumber(hpp)}\n`;
        });
        text += `\nKeunggulan Produk:\n • 100% Valid\n • Jalur KiosGamer\n • Speed Detikan\n • Tersedia Screenshot web\n\n${contactInfo}`;
        return text;
    }; 

    const generateMLB = () => {
        const margin = parseFloat(profitML) || 0;
        let text = `Daftar Harga Mobile Legends (MLB)\nIFY ONE - Top Up Terpercaya\n\n`;
        mlData.forEach(item => {
            let harga = Math.round(item.base * (1 + (margin / 100)));
            text += `${item.id.padEnd(9, ' ')} ${item.name.padEnd(20, ' ')} ${formatNumber(harga)}\n`;
        });
        text += `\nKeunggulan Produk:\n • 100% Valid\n • Jalur Direct Vendor\n • Speed Detikan\n • Tersedia Screenshot web\n\n${contactInfo}`;
        return text;
    }; 

    const handleCopy = () => {
        const content = activeTab === 'ml' ? generateMLB() : generateFFP();
        navigator.clipboard.writeText(content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }; 

    // --- REUSABLE CAPTURE FUNCTION ---
    const captureComponent = async (ref, setStatus, fileName) => {
        if (!ref.current) return;
        setStatus('loading');
        await new Promise(resolve => setTimeout(resolve, 200));
        try {
            const canvas = await html2canvas(ref.current, {
                backgroundColor: '#1c1c1e',
                scale: 3, 
                useCORS: true,
                allowTaint: true,
                logging: false,
            });
            canvas.toBlob(async (blob) => {
                if (!blob) { setStatus('idle'); return; }
                try {
                    const item = new ClipboardItem({ "image/png": blob });
                    await navigator.clipboard.write([item]);
                    setStatus('success');
                } catch (err) {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${fileName}-${Date.now()}.png`;
                    link.click();
                    setStatus('success');
                } finally {
                    setTimeout(() => setStatus('idle'), 2500);
                }
            }, "image/png");
        } catch (err) { setStatus('idle'); }
    };

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-10 bg-[#fafafa] min-h-screen text-slate-800 font-sans">
            {/* Header Dashboard */}
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent uppercase">IFY ONE Dashboard</h1>
                    <p className="text-slate-400 font-medium mt-2">Price List Generator & Game Validator</p>
                </div>
                <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
                    <button onClick={() => setActiveTab('ml')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab !== 'validator' ? 'bg-slate-100 text-slate-800' : 'text-slate-400'}`}>Pricing</button>
                    <button onClick={() => setActiveTab('validator')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'validator' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400'}`}>Validator</button>
                </div>
            </div>

            {/* Pricing Tabs Content */}
            {activeTab !== 'validator' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                </div>
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Mobile Legends %</span>
                            </div>
                            <div className="relative">
                                <input type="number" value={profitML} onChange={(e) => setProfitML(e.target.value)} className="w-full bg-slate-50/50 border-2 border-slate-50 rounded-[1.5rem] px-6 py-5 font-black text-indigo-600 text-3xl focus:border-indigo-400 outline-none" />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-200 text-2xl font-black">%</span>
                            </div>
                        </div>
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M16 14v4M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/></svg>
                                </div>
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Rate Calculator FFP</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <input type="number" value={rateTotal} onChange={(e) => setRateTotal(e.target.value)} className="flex-1 bg-slate-50/50 border-2 border-slate-50 rounded-2xl px-4 py-4 font-bold outline-none" />
                                <span className="text-slate-200 text-2xl font-black">/</span>
                                <input type="number" value={rateDivider} onChange={(e) => setRateDivider(e.target.value)} className="w-24 bg-slate-50/50 border-2 border-slate-50 rounded-2xl px-4 py-4 font-bold outline-none" />
                                <div className="hidden lg:block px-6 py-4 bg-orange-600 text-white rounded-2xl font-black">
                                    {(rateTotal / (rateDivider || 1)).toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
                        <div className="flex p-3 bg-slate-50/80">
                            <button onClick={() => setActiveTab('ml')} className={`flex-1 py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ml' ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-400'}`}>Mobile Legends</button>
                            <button onClick={() => setActiveTab('ff')} className={`flex-1 py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ff' ? 'bg-white text-orange-600 shadow-xl' : 'text-slate-400'}`}>Free Fire</button>
                        </div>
                        <div className="p-10 bg-white">
                            <button onClick={handleCopy} className={`w-full py-4 rounded-2xl text-[11px] font-black text-white transition-all mb-6 uppercase tracking-widest ${isCopied ? 'bg-emerald-500' : (activeTab === 'ml' ? 'bg-indigo-600' : 'bg-orange-600')}`}>
                                {isCopied ? 'Berhasil Disalin' : 'Salin Semua Harga'}
                            </button>
                            <div className="relative bg-slate-900 rounded-[2rem] p-10 shadow-2xl">
                                <pre className="font-mono text-[14px] text-indigo-200/80 whitespace-pre overflow-x-auto h-[500px] leading-relaxed custom-scrollbar">
                                    {activeTab === 'ml' ? generateMLB() : generateFFP()}
                                </pre>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Validator Tab Content */}
            {activeTab === 'validator' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* MLBB SECTION */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
                            <h3 className="text-lg font-black mb-4 text-sky-600">MLBB VALIDATOR</h3>
                            <textarea value={mlInput} onChange={(e) => setMlInput(e.target.value)} rows="4" placeholder="Tempel laporan transaksi MLBB..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-mono mb-4" />
                            <div className="flex gap-2">
                                <button onClick={processMLValidator} className="flex-1 bg-sky-600 text-white font-bold py-4 rounded-2xl">PROSES MLBB</button>
                                {mlResult && (
                                    <button 
                                        onClick={() => captureComponent(mlResultRef, setImageStatusML, 'INVOICE-ML')} 
                                        disabled={imageStatusML === 'loading'} 
                                        className={`px-6 rounded-2xl font-bold transition-all text-xs flex flex-col items-center justify-center gap-1 min-w-[100px] ${imageStatusML === 'success' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                                    >
                                        {imageStatusML === 'loading' ? "..." : imageStatusML === 'success' ? "DISALIN!" : <><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><span>GAMBAR</span></>}
                                    </button>
                                )}
                            </div>
                        </div>
                        {mlResult && (
                            <div ref={mlResultRef} className="bg-[#1c1c1e] p-8 rounded-[1.5rem] text-white shadow-2xl w-full max-w-[400px] mx-auto">
                                <div className="flex justify-between items-start mb-8"><h4 className="text-lg font-bold">Ringkasan Pesanan</h4></div>
                                <div className="space-y-4 text-[13px]">
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">No. Invoice</span><span className="font-bold tracking-tight">{mlResult.trxId}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Status</span><span className="font-bold text-emerald-400">Paid - Success</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Tanggal</span><span className="font-bold">{mlResult.time}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Metode</span><span className="font-bold text-slate-200">Credits</span></div>
                                    <div className="h-[1px] bg-white/10 my-4"></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Kategori</span><span className="font-bold">Mobile Legends</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Produk</span><span className="font-bold text-sky-400">{mlResult.product}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Nickname</span><span className="font-bold">{mlResult.nick}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">User ID</span><span className="font-bold">{mlResult.uid}</span></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FREE FIRE SECTION */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
                            <h3 className="text-lg font-black mb-4 text-orange-600">FF SUMMARY VALIDATOR</h3>
                            <textarea value={ffInput} onChange={(e) => setFfInput(e.target.value)} rows="4" placeholder="Tempel laporan Free Fire..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-mono mb-4" />
                            <div className="flex gap-2">
                                <button onClick={processFFValidator} className="flex-1 bg-orange-600 text-white font-bold py-4 rounded-2xl">PROSES FF</button>
                                {ffResult && (
                                    <button 
                                        onClick={() => captureComponent(ffResultRef, setImageStatus, 'INVOICE-FF')} 
                                        disabled={imageStatus === 'loading'} 
                                        className={`px-6 rounded-2xl font-bold transition-all text-xs flex flex-col items-center justify-center gap-1 min-w-[100px] ${imageStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                                    >
                                        {imageStatus === 'loading' ? "..." : imageStatus === 'success' ? "DISALIN!" : <><svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><span>GAMBAR</span></>}
                                    </button>
                                )}
                            </div>
                        </div>
                        {ffResult && (
                            <div ref={ffResultRef} className="bg-[#1c1c1e] p-8 rounded-[1.5rem] text-white shadow-2xl w-full max-w-[400px] mx-auto">
                                <div className="flex justify-between items-start mb-8"><h4 className="text-lg font-bold">Ringkasan Pesanan</h4></div>
                                <div className="space-y-4 text-[13px]">
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">No. Invoice</span><span className="font-bold tracking-tight">{ffResult.trxId}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Status</span><span className="font-bold text-emerald-400">Paid - Success</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Tanggal</span><span className="font-bold">{ffResult.time}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Metode</span><span className="font-bold text-slate-200">Credits</span></div>
                                    <div className="h-[1px] bg-white/10 my-4"></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Kategori</span><span className="font-bold">Free Fire</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Produk</span><span className="font-bold text-orange-400">{ffResult.product}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">Nickname</span><span className="font-bold">{ffResult.nick}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-slate-400 font-medium">User ID</span><span className="font-bold">{ffResult.uid}</span></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GamesPanel;
import React, { useState, useEffect } from 'react';
import { getBroadcastConfig, updateBroadcastConfig } from './firebase'; 

const Validator = () => {
    // --- State Navigasi ---
    const [activeTab, setActiveTab] = useState("input");
    const [activeCategory, setActiveCategory] = useState("SEMUA");

    // --- State Dasar Validator ---
    const [inputRaw, setInputRaw] = useState("");
    const [results, setResults] = useState([]); 
    const [activeType, setActiveType] = useState("reguler");

    // --- State Broadcast & Templates ---
    const [broadcastMessages, setBroadcastMessages] = useState([]);
    const [isBcActive, setIsBcActive] = useState(false);
    const [nextSendIndex, setNextSendIndex] = useState(0);
    const [broadcastInterval, setBroadcastInterval] = useState(3600); 
    const [countdown, setCountdown] = useState(0);
    const [isLoadingBc, setIsLoadingBc] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [templates, setTemplates] = useState([]);
    const [lockedTemplates, setLockedTemplates] = useState({}); 
    const [nextRunTimestamp, setNextRunTimestamp] = useState(null);
    const [lastSentTimestamp, setLastSentTimestamp] = useState(null);
    
    // --- State Log, Preview & Animasi ---
    const [broadcastLogs, setBroadcastLogs] = useState([]);
    const [previewItem, setPreviewItem] = useState(null);
    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg] = useState("");

    const categories = ["SEMUA", "TEMPLATE HARIAN", "TELKOMSEL", "BYU", "THREE", "INDOSAT", "XL AXIS", "SMARTFREN"];
    
    const intervalOptions = [
        { label: "5 MENIT", value: 300 },
        { label: "10 MENIT", value: 600 },
        { label: "15 MENIT", value: 900 },
        { label: "20 MENIT", value: 1200 },
        { label: "30 MENIT", value: 1800 },
        { label: "1 JAM", value: 3600 }
    ];

    const triggerToast = (msg) => {
        setToastMsg(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
    };

    const formatTime = (seconds) => {
        if (seconds <= 0) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // --- Efek Sinkronisasi Awal ---
    useEffect(() => {
        const loadCloudConfig = async () => {
            const config = await getBroadcastConfig();
            if (config) {
                setBroadcastMessages(config.messages || []);
                setIsBcActive(config.isActive || false);
                setNextSendIndex(config.nextIndex || 0);
                setLastSentTimestamp(config.lastSent || null);
                setBroadcastInterval(config.interval || 3600);
                setTemplates(config.templates || []);
                setNextRunTimestamp(config.nextRunTimestamp || null);
                setBroadcastLogs(config.logs || []);
                setLockedTemplates(config.lockedTemplates || {});
            }
            setIsLoadingBc(false);
        };
        loadCloudConfig();
    }, []);

    // Validasi tipe data ketat agar tidak sengaja overwrite array kosong karena efek operator ||
    const syncToCloud = async (updates) => {
        const payload = {
            messages: updates.messages !== undefined ? updates.messages : broadcastMessages,
            isActive: updates.isActive !== undefined ? updates.isActive : isBcActive,
            nextIndex: updates.nextIndex !== undefined ? updates.nextIndex : nextSendIndex,
            lastSent: updates.lastSent !== undefined ? updates.lastSent : lastSentTimestamp,
            interval: updates.interval !== undefined ? updates.interval : broadcastInterval,
            templates: updates.templates !== undefined ? updates.templates : templates,
            nextRunTimestamp: updates.nextRunTimestamp !== undefined ? updates.nextRunTimestamp : nextRunTimestamp,
            logs: updates.logs !== undefined ? updates.logs : broadcastLogs,
            lockedTemplates: updates.lockedTemplates !== undefined ? updates.lockedTemplates : lockedTemplates
        };
        await updateBroadcastConfig(payload);
        if (updates.nextRunTimestamp !== undefined) setNextRunTimestamp(updates.nextRunTimestamp);
    };

    const addLog = (msg, status) => {
        if (!msg) return broadcastLogs;
        const newLog = {
            time: new Date().toLocaleTimeString('id-ID'),
            content: msg.text ? msg.text.substring(0, 30) + "..." : "Media Only...",
            status: status ? "SUCCESS" : "FAILED"
        };
        const updatedLogs = [newLog, ...broadcastLogs].slice(0, 10);
        setBroadcastLogs(updatedLogs);
        return updatedLogs;
    };

    // --- Fungsi Kirim Telegram ---
    const sendToTelegram = async (msgObj) => {
        const botToken = "8017149378:AAFPJxzcQ5pMeCvq8P4N-9yOZ33Qr8hsjNM"; 
        const chatId = "-1002936402906";   
        
        if (!msgObj || (!msgObj.text && !msgObj.fileData)) return false;
        
        try {
            let success = false;
            if (msgObj.fileData) {
                const base64Data = msgObj.fileData.split(',')[1];
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'image/jpeg' });

                const formData = new FormData();
                formData.append('chat_id', chatId);
                formData.append('photo', blob, 'image.jpg');
                formData.append('caption', msgObj.text || "");
                formData.append('parse_mode', 'HTML');

                const response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                    method: 'POST',
                    body: formData
                });
                success = response.ok;
            } else {
                const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: msgObj.text, parse_mode: "HTML" })
                });
                success = response.ok;
            }
            return success;
        } catch (err) { 
            console.error("Telegram Error:", err);
            return false; 
        }
    };

    // --- Logika Loop Broadcast ---
    useEffect(() => {
        let timer;
        if (isBcActive && broadcastMessages.length > 0 && !isSending) {
            timer = setInterval(async () => {
                const now = new Date();
                const nowMs = now.getTime();
                
                const safeIdx = nextSendIndex >= broadcastMessages.length ? 0 : nextSendIndex;
                const currentMsg = broadcastMessages[safeIdx];
                
                if (!currentMsg) return;

                const wibTime = currentMsg.scheduledWib; 
                let shouldSend = false;

                if (wibTime) {
                    const [h, m] = wibTime.split(':');
                    if (now.getHours() === parseInt(h) && now.getMinutes() === parseInt(m) && now.getSeconds() === 0) {
                        shouldSend = true;
                    }
                } else if (nextRunTimestamp) {
                    const diff = Math.round((nextRunTimestamp - nowMs) / 1000);
                    setCountdown(diff > 0 ? diff : 0);
                    if (diff <= 0) shouldSend = true;
                }

                if (shouldSend && !isSending) {
                    setIsSending(true);
                    const success = await sendToTelegram(currentMsg);
                    const updatedLogs = addLog(currentMsg, success);
                    
                    let updatedMessages = [...broadcastMessages];
                    if (success) {
                        updatedMessages.splice(safeIdx, 1);
                    }

                    const nextIdx = updatedMessages.length > 0 ? (safeIdx % updatedMessages.length) : 0;
                    const nowStr = new Date().toLocaleTimeString('id-ID');
                    const nextRun = Date.now() + (broadcastInterval * 1000);
                    
                    setBroadcastMessages(updatedMessages);
                    setNextSendIndex(nextIdx);
                    setLastSentTimestamp(nowStr);

                    await syncToCloud({ 
                        messages: updatedMessages,
                        nextIndex: nextIdx, 
                        lastSent: nowStr, 
                        nextRunTimestamp: updatedMessages.length > 0 ? nextRun : null, 
                        logs: updatedLogs 
                    });
                    setIsSending(false);
                }
            }, 1000);
        } else {
            if (nextRunTimestamp) {
                const diff = Math.round((nextRunTimestamp - Date.now()) / 1000);
                setCountdown(diff > 0 ? diff : 0);
            }
        }
        return () => clearInterval(timer);
    }, [isBcActive, nextRunTimestamp, nextSendIndex, broadcastMessages, broadcastInterval, isSending]);

    // --- Logika Utama Validator ---
    const extractData = (rawText, type) => {
        const blocks = rawText.split(/\n\s*\n/).filter(b => b.trim() !== "");
        const finalResults = [];

        blocks.forEach(block => {
            const getVal = (key) => {
                const pattern = new RegExp(`${key}\\s*[:=]\\s*([^\\n,]+)`, 'i');
                const match = block.match(pattern);
                return match ? match[1].trim() : null;
            };

            let tujuanRaw = getVal("Nomor") || getVal("Tujuan") || block.match(/08\d{8,11}|628\d{8,11}/)?.[0];
            if (!tujuanRaw) return;
            
            const tujuan = tujuanRaw.startsWith('0') ? '62' + tujuanRaw.slice(1) : tujuanRaw;
            const sn = getVal("SN") || getVal("Ref ID") || block.match(/\d{15,22}/)?.[0] || "0";
            const isSuccess = block.toLowerCase().includes("sukses") || block.toLowerCase().includes("success") || block.toLowerCase().includes("berhasil");
            
            const dateMatch = block.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})|(\d{2}\/\d{2}\s\d{2}:\d{2}:\d{2})/);
            let dateObj = dateMatch ? new Date(dateMatch[0].replace(/\//g, '-')) : new Date();
            dateObj.setSeconds(dateObj.getSeconds() + 10);

            const formatLocal = (d) => {
                const pad = (n) => String(n).padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            };

            const formatShort = (d) => {
                const pad = (n) => String(n).padStart(2, '0');
                return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${String(d.getFullYear()).slice(-2)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            };

            const fullTime = formatLocal(dateObj);
            const shortTime = formatShort(dateObj);
            
            if (type === "reguler") {
                const p = getVal("Produk") || block.match(/(?:SP|TSEL|DATA|PLN)\s?(\d+)/i)?.[1] || "";
                let nominal = p.match(/\d+/)?.[0] || "0";
                finalResults.push(`${fullTime} ${nominal} ${tujuan} ${sn} ${isSuccess ? 'Success' : 'Failed'}`);
            } else if (type === "telpon") {
                finalResults.push(`Isi paket untuk no. ${tujuan} telah berhasil dengan SN : ${sn} pada ${shortTime}`);
            } else if (type === "data") {
                const tglOnly = shortTime.split(' ')[0];
                const jamOnly = shortTime.split(' ')[1];
                
                // --- PERBAIKAN LOGIKA PRODUK DATA ---
                const rawProduct = getVal("Produk") || "";
                let processedProduct = "Internet";
                
                if (rawProduct) {
                    // Mencari kecocokan spesifik kuota (GB) dan durasi (Hari/Bulan) pada nama produk supplier
                    const detailMatch = rawProduct.match(/\d+\s*(?:GB|MB|Hari|Hr|Bulan)/gi);
                    if (detailMatch) {
                        // Menggabungkannya menjadi format rapi (contoh: "Internet 8 GB 30 Hari")
                        processedProduct = `Internet ${detailMatch.join(' ')}`;
                    }
                }
                
                finalResults.push(`${sn}\n${tglOnly} ${jamOnly}\n${tglOnly} ${jamOnly}\n${tujuan}\n${processedProduct}\nsuccess`);
            }
        });
        
        return finalResults;
    };

    const handleProcess = () => {
        if (!inputRaw.trim()) return;
        const processed = extractData(inputRaw, activeType);
        if (processed.length > 0) {
            setResults([...processed, ...results]);
            setInputRaw(""); 
            triggerToast("Berhasil Diproses!");
        } else {
            alert("Format tidak dikenali atau Nomor/SN tidak ditemukan.");
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        triggerToast("Berhasil Disalin!");
    };

    const handleDeleteResult = (index) => {
        const newResults = results.filter((_, i) => i !== index);
        setResults(newResults);
    };

    const handleInstantSend = async (index) => {
        const msg = broadcastMessages[index];
        const success = await sendToTelegram(msg);
        addLog(msg, success);
        if (success) {
            const updated = broadcastMessages.filter((_, i) => i !== index);
            setBroadcastMessages(updated);
            syncToCloud({ messages: updated });
        }
        alert(success ? "Terkirim & Slot Dihapus!" : "Gagal Mengirim Pesan.");
    };

    const handleStartBroadcast = (active) => {
        const nextRun = active ? Date.now() + (broadcastInterval * 1000) : null;
        setIsBcActive(active);
        syncToCloud({ isActive: active, nextRunTimestamp: nextRun });
    };

    const resetBroadcastQueue = () => {
        const nextRun = Date.now() + (broadcastInterval * 1000);
        setNextSendIndex(0);
        setCountdown(broadcastInterval);
        syncToCloud({ nextIndex: 0, nextRunTimestamp: isBcActive ? nextRun : null });
    };

    const handleTemplateChange = (id, field, value) => {
        if (lockedTemplates[id]) return;
        setTemplates(templates.map(t => (t.id === id) ? { ...t, [field]: value } : t));
    };

    const toggleLock = (id) => {
        const newLocks = { ...lockedTemplates, [id]: !lockedTemplates[id] };
        setLockedTemplates(newLocks);
        syncToCloud({ lockedTemplates: newLocks });
    };

    const handleAddSlot = () => {
        setBroadcastMessages([...broadcastMessages, { text: "", fileData: null, scheduledWib: "" }]);
        triggerToast("Slot Antrian Ditambahkan!");
    };

    return (
        <div className="max-w-5xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-500 relative pb-20 bg-slate-50/50 p-2 md:p-8 rounded-3xl md:rounded-[3rem]">
            
            {/* Toast Notification */}
            {showToast && (
                <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[3000] animate-in slide-in-from-top-10 w-[90%] md:w-auto">
                    <div className="bg-slate-900/95 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-center gap-4 border border-white/10">
                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-[10px]">✓</div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{toastMsg}</span>
                    </div>
                </div>
            )}

            {/* Modal Preview */}
            {previewItem && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[2000] flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setPreviewItem(null)}>
                    <div className="bg-white w-full max-w-sm rounded-t-[2.5rem] md:rounded-[3rem] overflow-hidden shadow-2xl border border-white animate-in slide-in-from-bottom-10" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview Pesan</span>
                            <button onClick={() => setPreviewItem(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-sm hover:text-red-500 transition-colors">✕</button>
                        </div>
                        <div className="p-6 md:p-8">
                            {previewItem.fileData && <img src={previewItem.fileData} className="w-full rounded-2xl mb-4 shadow-lg max-h-56 object-cover border-4 border-slate-50" alt="Preview" />}
                            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50 max-h-60 overflow-y-auto no-scrollbar">
                                <p className="text-[12px] whitespace-pre-wrap leading-relaxed text-slate-700 font-medium italic">
                                    "{previewItem.text || "Tanpa teks..."}"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header & Navigasi */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4 pt-4 md:pt-0">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter mb-1">Web Admin IFYOne</h2>
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Sistem Validasi & Broadcast</p>
                    </div>
                </div>
                
                <div className="flex gap-1 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-white w-full md:w-auto ring-1 ring-slate-200/50 overflow-x-auto no-scrollbar">
                    {["input", "broadcast", "template"].map((tab) => (
                        <button 
                            key={tab} 
                            onClick={() => setActiveTab(tab)} 
                            className={`flex-1 whitespace-nowrap px-4 md:px-8 py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${activeTab === tab ? 'bg-blue-600 text-white shadow-xl translate-y-[-1px]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                            {tab === "input" ? "🔍 Validator" : tab === "broadcast" ? "📢 Broadcast" : "📑 Templates"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Tab: Input / Validator */}
            {activeTab === "input" && (
                <div className="space-y-4 md:space-y-6 px-2">
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-5 md:p-6 rounded-2xl md:rounded-[2.5rem] shadow-sm flex items-start gap-4">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-lg md:text-xl shrink-0">💡</div>
                        <div>
                            <h4 className="text-[10px] md:text-[11px] font-black uppercase text-amber-900 tracking-wider mb-1">Panduan Penggunaan</h4>
                            <p className="text-[9px] md:text-[10px] font-bold text-amber-800/80 leading-relaxed uppercase">
                                Copy logs dari supplier, paste di kolom bawah, lalu klik proses untuk validasi otomatis.
                            </p>
                        </div>
                    </div>

                    <div className="bg-white p-6 md:p-12 rounded-3xl md:rounded-[3.5rem] shadow-xl border border-white space-y-6 md:space-y-8 relative overflow-hidden">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3 w-full">
                                <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white text-sm">⚡</div>
                                <h3 className="text-[10px] md:text-[11px] font-black uppercase text-slate-800 tracking-widest">Raw Report Input</h3>
                            </div>
                            <div className="flex gap-1 bg-slate-100/80 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
                                {['reguler', 'telpon', 'data'].map((t) => (
                                    <button key={t} onClick={() => setActiveType(t)} className={`flex-1 px-4 md:px-6 py-2.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeType === t ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                                        {t === 'telpon' ? 'TELPON PAS' : t.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <textarea 
                            value={inputRaw} 
                            onChange={(e) => setInputRaw(e.target.value)} 
                            className="w-full h-48 md:h-56 p-5 md:p-8 bg-slate-50/50 border-2 border-slate-100 rounded-2xl md:rounded-[2.5rem] text-[11px] md:text-[12px] font-mono focus:border-blue-500 focus:bg-white outline-none transition-all placeholder:text-slate-300 no-scrollbar" 
                            placeholder="Paste logs laporan di sini..." 
                        />
                        <button onClick={handleProcess} className="w-full bg-slate-900 text-white font-black py-5 md:py-6 rounded-2xl md:rounded-[2rem] hover:bg-blue-600 transition-all duration-300 uppercase text-[10px] md:text-[11px] tracking-[0.2em] active:scale-[0.98] shadow-xl">
                            Generate Validasi Sekarang
                        </button>
                    </div>

                    {results.length > 0 && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-5">
                            <div className="flex justify-between items-center px-4">
                                <h3 className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Hasil Validasi ({results.length})</h3>
                                <button onClick={() => setResults([])} className="text-[9px] md:text-[10px] font-black text-red-500 uppercase px-3 py-1.5 rounded-lg hover:bg-red-50">Hapus Semua</button>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                {results.map((res, idx) => (
                                    <div key={idx} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 hover:border-blue-200 transition-all">
                                        <div className="flex-1 w-full bg-slate-50/50 p-4 md:p-6 rounded-xl md:rounded-[2rem] border border-slate-50">
                                            <p className="text-[11px] md:text-[12px] font-mono whitespace-pre-wrap text-slate-700 leading-relaxed">{res}</p>
                                        </div>
                                        <div className="flex gap-2 w-full md:w-auto">
                                            <button onClick={() => handleCopy(res)} className="flex-1 md:flex-none px-6 py-3.5 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all active:scale-95">Salin</button>
                                            <button onClick={() => handleDeleteResult(idx)} className="px-4 py-3.5 bg-red-50 text-red-500 rounded-xl text-[10px] hover:bg-red-500 hover:text-white transition-all active:scale-95">🗑️</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Content Tab: Broadcast */}
            {activeTab === "broadcast" && (
                <div className="space-y-4 md:space-y-6 px-2">
                    <div className="bg-white p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] border border-white shadow-xl space-y-6 md:space-y-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-4 w-full">
                                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] flex items-center justify-center text-2xl shadow-inner ${isBcActive ? 'bg-emerald-50 text-emerald-500 ring-4 ring-emerald-50' : 'bg-slate-100 text-slate-300'}`}>
                                    {isBcActive ? '📡' : '💤'}
                                </div>
                                <div>
                                    <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Queue Management</p>
                                    <p className={`text-base md:text-lg font-black tracking-tight ${isBcActive ? 'text-slate-900' : 'text-slate-400'}`}>
                                        {isBcActive ? `Next: ${broadcastMessages[nextSendIndex]?.scheduledWib || formatTime(countdown)}` : 'SYSTEM OFF'}
                                    </p>
                                    <span className="inline-block mt-1 px-2.5 py-0.5 bg-slate-50 text-[7px] md:text-[8px] font-bold text-slate-400 rounded-full border border-slate-100">AUTO-DELETE ENABLED</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-5 bg-slate-50/50 p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] border border-slate-100 w-full md:w-auto justify-between">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System On</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={isBcActive} onChange={(e) => handleStartBroadcast(e.target.checked)} className="sr-only peer" />
                                    <div className="w-12 h-7 md:w-14 md:h-8 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 md:after:h-6 after:w-5 md:after:w-6 after:transition-all peer-checked:after:translate-x-5 md:peer-checked:after:translate-x-6 shadow-inner"></div>
                                </label>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100">
                            <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Jadwal Broadcast</p>
                            <div className="flex flex-wrap gap-2">
                                {intervalOptions.map((opt) => (
                                    <button 
                                        key={opt.value}
                                        onClick={() => {
                                            setBroadcastInterval(opt.value);
                                            const nextRun = Date.now() + (opt.value * 1000);
                                            syncToCloud({ interval: opt.value, nextRunTimestamp: isBcActive ? nextRun : null });
                                        }}
                                        className={`flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl text-[8px] md:text-[9px] font-black transition-all border ${broadcastInterval === opt.value ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-200'}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                        <button onClick={handleAddSlot} className="py-4 md:py-5 rounded-xl md:rounded-[2rem] text-[9px] md:text-[10px] font-black bg-slate-900 text-white shadow-lg active:scale-95 transition-all">＋ ADD SLOT</button>
                        <button onClick={async () => {
                            setIsSaving(true);
                            await syncToCloud({ messages: broadcastMessages });
                            setTimeout(() => setIsSaving(false), 800);
                        }} className={`py-4 md:py-5 rounded-xl md:rounded-[2rem] text-[9px] md:text-[10px] font-black text-white shadow-lg active:scale-95 transition-all ${isSaving ? 'bg-emerald-500' : 'bg-blue-600'}`}>
                            {isSaving ? 'SAVING...' : '💾 SIMPAN BROADCAST'}
                        </button>
                        <button onClick={resetBroadcastQueue} className="py-4 md:py-5 rounded-xl md:rounded-[2rem] text-[9px] md:text-[10px] font-black bg-amber-500 text-white shadow-lg active:scale-95 transition-all">🔄 HAPUS ANTRIAN</button>
                        <button onClick={() => window.confirm("Hapus semua?") && syncToCloud({messages: []})} className="py-4 md:py-5 rounded-xl md:rounded-[2rem] text-[9px] md:text-[10px] font-black bg-red-500 text-white shadow-lg active:scale-95 transition-all">🗑️ HAPUS SEMUA</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {broadcastMessages.map((msg, index) => (
                            <div key={index} className={`p-6 md:p-8 rounded-2xl md:rounded-[3rem] border-2 transition-all ${nextSendIndex === index && isBcActive ? 'border-blue-500 bg-white shadow-xl ring-4 ring-blue-50' : 'border-white bg-white/60'}`}>
                                <div className="flex justify-between items-center mb-5 md:mb-6">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-slate-900 text-white w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black shadow-md">{index + 1}</span>
                                        <input type="time" value={msg.scheduledWib || ""} onChange={(e) => {
                                            const m = [...broadcastMessages];
                                            m[index].scheduledWib = e.target.value;
                                            setBroadcastMessages(m);
                                        }} className="text-[10px] font-black bg-slate-100/50 px-3 py-2 rounded-lg outline-none focus:bg-white ring-1 ring-slate-200" />
                                    </div>
                                    <div className="flex gap-1.5">
                                        <button onClick={() => setPreviewItem(msg)} className="w-9 h-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all">👁️</button>
                                        <button onClick={() => handleInstantSend(index)} className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all">🚀</button>
                                        <button onClick={() => {
                                            const updated = broadcastMessages.filter((_, i) => i !== index);
                                            setBroadcastMessages(updated);
                                            syncToCloud({ messages: updated });
                                        }} className="w-9 h-9 bg-red-50 text-red-400 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="relative h-32 md:h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl md:rounded-[2rem] overflow-hidden group cursor-pointer hover:border-blue-300 shadow-inner">
                                        {msg.fileData ? <img src={msg.fileData} className="w-full h-full object-cover" alt="preview" /> : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300">
                                                <span className="text-2xl">🖼️</span>
                                                <span className="text-[8px] font-black uppercase">Upload Media</span>
                                            </div>
                                        )}
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                                            const r = new FileReader();
                                            r.onload = () => {
                                                const m = [...broadcastMessages];
                                                m[index].fileData = r.result;
                                                setBroadcastMessages(m);
                                            };
                                            r.readAsDataURL(e.target.files[0]);
                                        }} />
                                    </div>
                                    <textarea value={msg.text} onChange={(e) => {
                                        const m = [...broadcastMessages];
                                        m[index].text = e.target.value;
                                        setBroadcastMessages(m);
                                    }} className="w-full h-24 p-4 md:p-6 bg-slate-50/50 border border-slate-100 rounded-xl md:rounded-[2rem] text-[11px] outline-none focus:bg-white no-scrollbar" placeholder="Caption message..." />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Content Tab: Template */}
            {activeTab === "template" && (
                <div className="space-y-4 md:space-y-8 px-2">
                    <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                        {categories.map((cat) => (
                            <button key={cat} onClick={() => setActiveCategory(cat)} className={`whitespace-nowrap px-6 md:px-8 py-3.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase transition-all border shadow-sm ${activeCategory === cat ? 'bg-indigo-600 text-white border-indigo-600 translate-y-[-1px]' : 'bg-white text-slate-400 border-slate-100'}`}>
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white/70 backdrop-blur-sm rounded-3xl md:rounded-[4rem] p-6 md:p-14 border border-white shadow-xl">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 md:mb-12 gap-6">
                            <div>
                                <h3 className="text-xl md:text-2xl font-black uppercase text-slate-800 tracking-tighter mb-1">Library</h3>
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Siap kirim ke Telegram</p>
                            </div>
                            <div className="flex gap-2 w-full md:w-auto">
                                <button onClick={() => syncToCloud({ templates: templates })} className="flex-1 md:flex-none bg-emerald-500 text-white px-5 md:px-8 py-3.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">💾 SIMPAN LIBRARY</button>
                                <button onClick={() => setTemplates([{ id: Date.now(), category: "TEMPLATE HARIAN", title: "", text: "", fileData: null }, ...templates])} className="flex-1 md:flex-none bg-slate-900 text-white px-5 md:px-8 py-3.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">＋ CREATE</button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                            {templates.filter(t => activeCategory === "SEMUA" || t.category === activeCategory).map(tpl => (
                                <div key={tpl.id} className={`p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border-2 transition-all relative ${lockedTemplates[tpl.id] ? 'bg-slate-100/50 border-slate-200 grayscale' : 'bg-white border-slate-50 hover:border-indigo-200 shadow-sm'}`}>
                                    <div className="flex justify-between items-start mb-5">
                                        <select disabled={lockedTemplates[tpl.id]} value={tpl.category} onChange={(e) => handleTemplateChange(tpl.id, 'category', e.target.value)} className="text-[8px] md:text-[9px] font-black bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 outline-none uppercase shadow-inner">
                                            {categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                        <div className="flex gap-1.5">
                                            <button onClick={() => toggleLock(tpl.id)} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${lockedTemplates[tpl.id] ? 'bg-amber-100 text-amber-600' : 'bg-slate-50 text-slate-300 hover:text-blue-500'}`}>
                                                {lockedTemplates[tpl.id] ? '🔒' : '🔓'}
                                            </button>
                                            {!lockedTemplates[tpl.id] && (
                                                <button onClick={() => window.confirm("Hapus?") && setTemplates(templates.filter(t => t.id !== tpl.id))} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-colors">✕</button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="relative h-28 md:h-32 bg-slate-50 rounded-2xl mb-4 overflow-hidden shadow-inner">
                                        {tpl.fileData ? <img src={tpl.fileData} className="w-full h-full object-cover" alt="tpl" /> : (
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-[8px] font-black uppercase">Add Image</div>
                                        )}
                                        {!lockedTemplates[tpl.id] && <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                                            const r = new FileReader();
                                            r.onload = () => handleTemplateChange(tpl.id, 'fileData', r.result);
                                            r.readAsDataURL(e.target.files[0]);
                                        }} />}
                                    </div>

                                    <input disabled={lockedTemplates[tpl.id]} type="text" value={tpl.title} onChange={(e) => handleTemplateChange(tpl.id, 'title', e.target.value)} placeholder="Template Name" className="w-full bg-transparent font-black text-xs md:text-sm mb-3 outline-none uppercase tracking-tight disabled:text-slate-500" />
                                    <textarea disabled={lockedTemplates[tpl.id]} value={tpl.text} onChange={(e) => handleTemplateChange(tpl.id, 'text', e.target.value)} className="w-full h-32 p-4 md:p-6 bg-slate-50/50 border border-slate-50 rounded-2xl text-[10px] md:text-[11px] outline-none focus:bg-white transition-all no-scrollbar disabled:opacity-50" placeholder="Pesan broadcast..." />
                                    <div className="flex gap-2 mt-5">
                                        <button onClick={() => setPreviewItem(tpl)} className="flex-1 bg-white text-slate-400 border border-slate-100 py-3.5 rounded-xl text-[8px] md:text-[9px] font-black uppercase active:scale-95 transition-all">Preview</button>
                                        <button onClick={async () => {
                                            const success = await sendToTelegram(tpl);
                                            triggerToast(success ? "SENT!" : "FAILED!");
                                        }} className="flex-[1.5] bg-indigo-600 text-white py-3.5 rounded-xl text-[8px] md:text-[9px] font-black uppercase shadow-lg shadow-indigo-100 active:scale-95 transition-all">Send Now</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Validator;
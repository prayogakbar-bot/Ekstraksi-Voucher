import React, { useState } from 'react';

const ValidasiTelpon = () => {
    const [inputTelpon, setInputTelpon] = useState("");
    const [resultTelpon, setResultTelpon] = useState("");
    const [resultSnApi, setResultSnApi] = useState("");
    const [copyStatus, setCopyStatus] = useState(false);
    const [copySnStatus, setCopySnStatus] = useState(false);

    const handleValidateTelpon = () => {
        const text = inputTelpon;
        
        // --- FITUR BAWAAN (100% UTUH)[cite: 3] ---
        const mntMatch = text.match(/([\d\.]+)[\s-]*(Menit|Mnt|m\b)/i);
        const mnt = mntMatch ? mntMatch[1].replace(/\./g, "") : "???";
        const hrMatch = text.match(/(\d+)[\s-]*(Hari|Hr)/i);
        const hr = hrMatch ? hrMatch[1] : "??";
        const noMatch = text.match(/(08\d{8,11}|8\d{8,11})/);
        let no = noMatch ? noMatch[0] : "";
        no = no.startsWith('0') ? '62' + no.slice(1) : (no.startsWith('8') ? '62' + no : no);
        const snMatch = text.match(/SN\s*[:]\s*([\w\d]+)/i) || text.match(/(\d{15,25})/);
        const sn = snMatch ? (snMatch[1] || snMatch[0]) : "-";
        
        setResultTelpon(`Paket ${mnt} Mnt AllOpr (${hr} hari) telah aktif di nomor ${no}. Serial Number ${sn}.`);
        // --------------------------------

        // --- FITUR VALIDASI SN API BARU (KINI DENGAN HARI) ---
        // 1. Ambil Tanggal / Waktu[cite: 3]
        const tglMatch = text.match(/Tanggal\s*:\s*([\d\-\s:]+)/i);
        const tgl = tglMatch ? tglMatch[1].trim() : "2026-07-17 14:46:18";

        // 2. Ambil Tujuan (Format Spasi: 0853 6625 3736)[cite: 3]
        let rawNo = noMatch ? noMatch[0] : "";
        let formattedNo = rawNo;
        if (rawNo.length >= 4) {
            formattedNo = rawNo.replace(/(\d{4})(\d{4})(\d{0,4})/, (m, p1, p2, p3) => {
                return p3 ? `${p1} ${p2} ${p3}` : `${p1} ${p2}`;
            }).trim();
        }

        // 3. Modifikasi nama paket: "Telepon [Menit] Menit Pamasuka [Hari] Hari"[cite: 3]
        const formattedMnt = mntMatch ? mntMatch[1] : "???";
        const hrSuffix = hrMatch ? ` ${hr} Hari` : "";
        const produk = `Telepon ${formattedMnt} Menit Pamasuka${hrSuffix}`;

        // 4. Ambil SN untuk Request ID[cite: 3]
        const snApiMatch = text.match(/SN\s*:\s*([\w\d]+)/i);
        const snApi = snApiMatch ? snApiMatch[1].trim() : "-";

        // Susun template Validasi SN API sesuai request[cite: 3]
        const templateSnApi = `SUKSES\nRequest ID: ${snApi}\nSubmit: ${tgl}\nEksekusi: ${tgl}\nTujuan: ${formattedNo}\nPaket: ${produk}\nStatus : VALID`;
        setResultSnApi(templateSnApi);
    };

    const handleClearTelpon = () => {
        setInputTelpon("");
        setResultTelpon("");
        setResultSnApi("");
        setCopyStatus(false);
        setCopySnStatus(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(resultTelpon);
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2000);
    };

    const handleCopySn = () => {
        navigator.clipboard.writeText(resultSnApi);
        setCopySnStatus(true);
        setTimeout(() => setCopySnStatus(false), 2000);
    };

    return (
        <div className="max-w-2xl mx-auto bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl border border-slate-200">
            <h2 className="text-lg md:text-xl font-black uppercase text-slate-800 text-center mb-8">Validasi Paket Telpon</h2>
            <textarea 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] md:rounded-[2rem] p-6 mb-6 font-mono text-[11px] h-40 outline-none" 
                placeholder="Tempel respon supplier..." 
                value={inputTelpon} 
                onChange={(e) => setInputTelpon(e.target.value)} 
            />
            
            <div className="flex gap-3 mb-10">
                <button onClick={handleValidateTelpon} className="flex-grow bg-emerald-600 text-white py-4 md:py-5 rounded-2xl font-black uppercase shadow-lg">Generate Template</button>
                <button onClick={handleClearTelpon} className="bg-red-500 text-white px-6 py-4 md:py-5 rounded-2xl font-black uppercase shadow-lg">🗑️</button>
            </div>

            {resultTelpon && (
                <div className="space-y-6">
                    {/* KOLOM UTAMA BAWAAN[cite: 3] */}
                    <div className="space-y-2">
                        <div className="p-6 md:p-8 bg-[#0f172a] rounded-[2rem] text-white border border-white/5 shadow-inner">
                            <p className="text-[7px] font-black text-emerald-400 uppercase mb-4 tracking-widest">Hasil Generasi:</p>
                            <span className="block font-bold text-xs leading-relaxed">{resultTelpon}</span>
                        </div>
                        <div className="bg-slate-100 p-4 rounded-2xl flex items-center justify-between border border-slate-200">
                            <button onClick={handleCopy} className={`w-full py-3 rounded-xl font-black uppercase text-[10px] transition-all shadow-md ${copyStatus ? 'bg-blue-600 text-white' : 'bg-white text-slate-800'}`}>
                                {copyStatus ? 'Tersalin!' : '📋 Salin Teks Utama'}
                            </button>
                        </div>
                    </div>

                    {/* KOLOM BARU: VALIDASI SN API[cite: 3] */}
                    {resultSnApi && (
                        <div className="space-y-2">
                            <div className="p-6 md:p-8 bg-[#1e293b] rounded-[2rem] text-white border border-white/5 shadow-inner">
                                <p className="text-[7px] font-black text-amber-400 uppercase mb-4 tracking-widest">Validasi SN API:</p>
                                <span className="block font-bold text-xs leading-relaxed whitespace-pre-line">{resultSnApi}</span>
                            </div>
                            <div className="bg-slate-100 p-4 rounded-2xl flex items-center justify-between border border-slate-200">
                                <button onClick={handleCopySn} className={`w-full py-3 rounded-xl font-black uppercase text-[10px] transition-all shadow-md ${copySnStatus ? 'bg-amber-600 text-white' : 'bg-white text-slate-800'}`}>
                                    {copySnStatus ? 'Tersalin!' : '📋 Salin Validasi SN API'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ValidasiTelpon;
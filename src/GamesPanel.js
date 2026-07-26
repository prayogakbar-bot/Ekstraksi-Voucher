import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';

const GamesPanel = () => {
    // --- KONFIGURASI BOT TELEGRAM ---
    const TELEGRAM_BOT_TOKEN = "8571888481:AAGdqdiaa4kPd_YWqfZauELZ1-ACiMV0iYg";
    const TELEGRAM_CHAT_ID = "-1003574594574";

    const ffResultRef = useRef(null);
    const mlResultRef = useRef(null);

    // --- STATE GAMES PANEL ---
    const [profitML, setProfitML] = useState(0); 
    const [rateTotal, setRateTotal] = useState(90175); 
    const [rateDivider, setRateDivider] = useState(330); 
    const [activeTab, setActiveTab] = useState('checker'); 
    const [isCopied, setIsCopied] = useState(false); 
    const [imageStatus, setImageStatus] = useState('idle'); 
    const [imageStatusML, setImageStatusML] = useState('idle');

    const [mlInput, setMlInput] = useState(""); 
    const [ffInput, setFfInput] = useState(""); 
    const [mlResult, setMlResult] = useState(null); 
    const [ffResult, setFfResult] = useState(null); 

    // --- STATE API CHECKER FREE FIRE ---
    const [ffCheckId, setFfCheckId] = useState("");
    const [isCheckingFF, setIsCheckingFF] = useState(false);
    const [ffCheckError, setFfCheckError] = useState("");
    const [ffCheckedNickname, setFfCheckedNickname] = useState("");

    // --- STATE API CHECKER MOBILE LEGENDS ---
    const [mlCheckId, setMlCheckId] = useState("");
    const [mlCheckZone, setMlCheckZone] = useState("");
    const [isCheckingML, setIsCheckingML] = useState(false);
    const [mlCheckError, setMlCheckError] = useState("");
    const [mlCheckedNickname, setMlCheckedNickname] = useState("");

    // --- FITUR EDIT CAPTION ---
    const [customCaption, setCustomCaption] = useState("IFY ONE - Top Up Terpercaya");
    const [showSettings, setShowSettings] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // --- FITUR MODE GELAP ---
    const [isUltraDarkMode, setIsUltraDarkMode] = useState(false);

    // --- STATE REMINDER SUPPLIER ---
    const [supplierStates, setSupplierStates] = useState({
        DAS: 'idle',
        HAO: 'idle',
        AMC: 'idle',
        NEWBIEZ: 'idle',
        OASIS: 'idle',
        ANTUM: 'idle'
    });

    // --- STATE KATALOG PRODUK ---
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Semua Produk");

    // --- DATA KATALOG PRODUK TRANSAKSI ---
    const catalogCategories = [
        "Semua Produk", "Top Up", "Voucher", "Pulsa", "Token Listrik", "Paket Data", "Voucher Data", "Telpon & SMS", "TV", "E-Toll", "Hiburan", "E-Money"
    ];

    const catalogProducts = [
        { id: 1, name: "Free Fire ID", category: "Top Up", url: "https://www.ifyone.com/checkout/games/Free%20Fire/FF10", bg: "from-amber-600 to-red-700", icon: "🔥", badge: "ID" },
        { id: 2, name: "Shopee Pay", category: "E-Money", url: "https://www.ifyone.com/checkout/emoney/ShopeePay", bg: "from-orange-500 to-red-600", icon: "S", badge: "E-Wallet" },
        { id: 3, name: "Mobile Legends ID", category: "Top Up", url: "https://www.ifyone.com/checkout/games/Mobile%20Legend/ML10", bg: "from-blue-600 to-indigo-800", icon: "⚔️", badge: "ID" },
        { id: 4, name: "Hago Diamond ID", category: "Top Up", url: "https://www.ifyone.com/checkout/games/Hago", bg: "from-yellow-400 to-amber-500", icon: "😃", badge: "ID" },
        { id: 5, name: "PUBG Mobile ID", category: "Top Up", url: "https://www.ifyone.com/checkout/games/PUBG%20Mobile/FUBGM120", bg: "from-emerald-700 to-teal-900", icon: "🪂", badge: "ID" },
        { id: 6, name: "Voucher Roblox", category: "Voucher", url: "https://www.ifyone.com/checkout/games/Roblox", bg: "from-blue-500 to-cyan-600", icon: "R", badge: "Voucher" },
        { id: 7, name: "Magic Chess Go Go ID", category: "Top Up", url: "https://www.ifyone.com/checkout/games/Magic%20Chess/MCGGG12", bg: "from-purple-600 to-indigo-900", icon: "♟️", badge: "ID" },
        { id: 8, name: "Honor Of Kings", category: "Top Up", url: "https://www.ifyone.com/checkout/games/HonorOfKings", bg: "from-slate-700 to-purple-900", icon: "👑", badge: "ID" },
        { id: 9, name: "Valorant ID", category: "Top Up", url: "https://www.ifyone.com/checkout/games/Valorant", bg: "from-rose-600 to-red-800", icon: "🎯", badge: "ID" },
        { id: 10, name: "Call Of Duty Mobile", category: "Top Up", url: "https://www.ifyone.com/checkout/games/Call%20of%20Duty%20Mobile/CODM-1373", bg: "from-stone-700 to-neutral-900", icon: "💥", badge: "ID" },
        { id: 11, name: "Lords Mobile", category: "Top Up", url: "https://www.ifyone.com/checkout/games/LordsMobile", bg: "from-amber-500 to-orange-600", icon: "🛡️", badge: "ID" },
        { id: 12, name: "Speed Drifters", category: "Top Up", url: "https://www.ifyone.com/checkout/games/SpeedDrifters", bg: "from-pink-600 to-rose-700", icon: "🏎️", badge: "ID" },
        { id: 13, name: "Point Blank", category: "Top Up", url: "https://www.ifyone.com/checkout/games/Point%20Blank/PBAPK1", bg: "from-red-600 to-slate-900", icon: "💣", badge: "Voucher" },
        { id: 14, name: "Arena of Valor", category: "Top Up", url: "https://www.ifyone.com/checkout/games/Arena%20of%20Valor/AOV_ID_1430", bg: "from-sky-600 to-blue-900", icon: "⚔️", badge: "ID" }
    ];

    // --- DATA PRODUK FFP & DENOMINASI ---
    const ffpData = [
        { id: "FFP5", dm: "5 Diamond", sum: 3 },
        { id: "FFP10", dm: "10 Diamond", sum: 6 },
        { id: "FFP12", dm: "12 Diamond", sum: 6.73 },
        { id: "FFP20", dm: "20 Diamond", sum: 12 },
        { id: "FFP25", dm: "25 Diamond", sum: 15 },
        { id: "FFP30", dm: "30 Diamond", sum: 18 },
        { id: "FFP40", dm: "40 Diamond", sum: 23.96 },
        { id: "FFP50", dm: "50 Diamond", sum: 24 },
        { id: "FFP70", dm: "70 Diamond", sum: 33 },
        { id: "FFP75", dm: "75 Diamond", sum: 36 },
        { id: "FFP80", dm: "80 Diamond", sum: 39 },
        { id: "FFP90", dm: "90 Diamond", sum: 45 },
        { id: "FFP95", dm: "95 Diamond", sum: 48 },
        { id: "FFP100", dm: "100 Diamond", sum: 48 },
        { id: "FFP120", dm: "120 Diamond", sum: 57 },
        { id: "FFP130", dm: "130 Diamond", sum: 63 },
        { id: "FFP144", dm: "140 Diamond", sum: 66 },
        { id: "FFP145", dm: "145 Diamond", sum: 69 },
        { id: "FFP150", dm: "150 Diamond", sum: 72 },
        { id: "FFP160", dm: "160 Diamond", sum: 78 },
        { id: "FFP190", dm: "190 Diamond", sum: 90.05 },
        { id: "FFP200", dm: "200 Diamond", sum: 96 },
        { id: "FFP210", dm: "210 Diamond", sum: 99 },
        { id: "FFP250", dm: "250 Diamond", sum: 120 },
        { id: "FFP280", dm: "280 Diamond", sum: 132 },
        { id: "FFP350", dm: "350 Diamond", sum: 164.96 },
        { id: "FFP355", dm: "355 Diamond", sum: 165 },
        { id: "FFP375", dm: "375 Diamond", sum: 177 },
        { id: "FFP400", dm: "400 Diamond", sum: 189 },
        { id: "FFP405", dm: "405 Diamond", sum: 189.03 },
        { id: "FFP425", dm: "425 Diamond", sum: 198.06 },
        { id: "FFP475", dm: "475 Diamond", sum: 222.01 },
        { id: "FFP500", dm: "500 Diamond", sum: 234.05 },
        { id: "FFP510", dm: "510 Diamond", sum: 240 },
        { id: "FFP545", dm: "545 Diamond", sum: 255 },
        { id: "FFP565", dm: "565 Diamond", sum: 264 },
        { id: "FFP600", dm: "600 Diamond", sum: 282 },
        { id: "FFP635", dm: "635 Diamond", sum: 297 },
        { id: "FFP700", dm: "700 Diamond", sum: 330 },
        { id: "FFP720", dm: "720 Diamond", sum: 330 },
        { id: "FFP770", dm: "770 Diamond", sum: 354.2 },
        { id: "FFP790", dm: "790 Diamond", sum: 363 },
        { id: "FFP800", dm: "800 Diamond", sum: 369 },
        { id: "FFP860", dm: "860 Diamond", sum: 396.1 },
        { id: "FFP930", dm: "930 Diamond", sum: 429 },
        { id: "FFP1000", dm: "1000 Diamond", sum: 462 },
        { id: "FFP1050", dm: "1050 Diamond", sum: 486 },
        { id: "FFP1075", dm: "1075 Diamond", sum: 495 },
        { id: "FFP1080", dm: "1080 Diamond", sum: 498 },
        { id: "FFP1200", dm: "1200 Diamond", sum: 555 },
        { id: "FFP1300", dm: "1300 Diamond", sum: 603 },
        { id: "FFP1440", dm: "1440 Diamond", sum: 660 },
        { id: "FFP1450", dm: "1450 Diamond", sum: 666 },
        { id: "FFP2000", dm: "2000 Diamond", sum: 924 },
        { id: "FFP2140", dm: "2140 Diamond", sum: 990 },
        { id: "FFP2180", dm: "2180 Diamond", sum: 996 },
        { id: "FFP2355", dm: "2355 Diamond", sum: 1080 },
        { id: "FFP2720", dm: "2720 Diamond", sum: 1251 },
        { id: "FFP3640", dm: "3640 Diamond", sum: 1659 },
        { id: "FFP4000", dm: "4000 Diamond", sum: 1827 },
        { id: "FFP6000", dm: "6000 Diamond", sum: 2742 },
        { id: "FFP7290", dm: "7290 Diamond", sum: 3300 }
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
        { id: "MLB110", name: "110 Diamond", base: 28205 },
        { id: "MLB210", name: "210 Diamond", base: 53783 },
        { id: "MLB355", name: "355 Diamond", base: 90970 },
        { id: "MLB706", name: "706 Diamond", base: 177359 },
        { id: "MLB1050", name: "1050 Diamond", base: 255472 },
        { id: "MLB2195", name: "2195 Diamond", base: 515140 },
        { id: "MLB3688", name: "3688 Diamond", base: 879895 },
        { id: "MLB532", name: "5532 Diamond", base: 1298059 },
        { id: "MLB9288", name: "9288 Diamond", base: 2168160 }
    ]; 

    const contactInfo = `Website: https://ifyone.site\nDigiflazz: https://digiflazz.com/seller/o6n0Vo\nChannel Telegram: https://t.me/IFYOneofficial\nCustomer Service: @csifyone`;
    const formatNumber = (num) => new Intl.NumberFormat('id-ID').format(num);

    const parseRaw = (text, key) => {
        const pattern = new RegExp(`${key}\\s*[:=]\\s*(.*)`, 'i');
        const match = text.match(pattern);
        return match ? match[1].trim() : "-";
    }; 

    // --- LOGIKA REKAPAN VIA BOT TELEGRAM ---
    const handleBalanceReminder = async (supplierName) => {
        setSupplierStates(prev => ({ ...prev, [supplierName]: 'loading' }));
        const textMessage = `\nBantu cek dan isi saldo untuk Supplier: ${supplierName.toUpperCase()}`;
        
        try {
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: textMessage,
                    parse_mode: "Markdown"
                })
            });

            if (response.ok) {
                setSupplierStates(prev => ({ ...prev, [supplierName]: 'success' }));
                setTimeout(() => {
                    setSupplierStates(prev => ({ ...prev, [supplierName]: 'idle' }));
                }, 3000);
            } else {
                alert("Gagal mengirim pesan via Bot Telegram. Periksa kembali Token dan Chat ID Anda.");
                setSupplierStates(prev => ({ ...prev, [supplierName]: 'idle' }));
            }
        } catch (error) {
            console.error("Telegram API Error:", error);
            alert("Terjadi kesalahan jaringan saat menghubungi API Bot Telegram.");
            setSupplierStates(prev => ({ ...prev, [supplierName]: 'idle' }));
        }
    };

    // --- LOGIKA MLBB VALIDATOR ---
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

    // --- LOGIKA FF VALIDATOR ---
    const processFFValidator = () => {
        if (!ffInput.trim()) return;
        
        let product = parseRaw(ffInput, "Produk");
        if (product === "-") product = parseRaw(ffInput, "Diamond");
        
        let finalTrxId = parseRaw(ffInput, "Ref ID");
        if (finalTrxId === "-") finalTrxId = parseRaw(ffInput, "ID Transaksi");
        if (finalTrxId === "-") finalTrxId = parseRaw(ffInput, "Nomor");
        finalTrxId = finalTrxId.replace(/^\d+\.\s*/, "").toUpperCase();

        let sn = parseRaw(ffInput, "SN");
        let nick = "-";
        let uid = parseRaw(ffInput, "Nomor").replace(/^\d+\.\s*/, "");

        if (sn !== "-") {
            if (sn.toUpperCase().includes("REFID")) {
                const parts = sn.split(/RefId\s*[: ]\s*/i);
                nick = parts[0].replace(/[.\s-]+$/, "");
                finalTrxId = parts[1] ? parts[1].trim().toUpperCase() : finalTrxId;
            } else if (sn.includes("(") && sn.includes(")")) {
                const match = sn.match(/(.*)\((.*)\)/);
                if (match) { 
                    nick = match[1].trim(); 
                    uid = match[2].trim(); 
                }
            } else {
                nick = sn;
            }
        }

        setFfResult({ trxId: finalTrxId, product, nick, uid, time: parseRaw(ffInput, "Tanggal") });
    }; 

    // --- LOGIKA REAL-TIME API CHECK ID FREE FIRE ---
    const checkFreeFireId = async () => {
        if (!ffCheckId.trim()) {
            setFfCheckError("Masukkan User ID Free Fire terlebih dahulu Om!");
            return;
        }
        setIsCheckingFF(true);
        setFfCheckError("");
        setFfCheckedNickname("");
        try {
            const response = await fetch(`https://api.omegatronik.co.id/api/game/freefire-dg?key=bIQGfd2WhB&id=${encodeURIComponent(ffCheckId)}`);
            if (!response.ok) {
                setFfCheckError(`Server error status: ${response.status}`);
                setIsCheckingFF(false);
                return;
            }
            const data = await response.json();
            let foundNickname = "";
            if (data) {
                if (data.data && data.data.username) foundNickname = data.data.username; 
                else if (data.nickname) foundNickname = data.nickname;
                else if (data.name) foundNickname = data.name;
                else if (data.username) foundNickname = data.username;
                else if (data.player_name) foundNickname = data.player_name;
                else if (data.data && data.data.nickname) foundNickname = data.data.nickname;
                else if (data.data && data.data.name) foundNickname = data.data.name;
            }
            if (foundNickname && foundNickname !== "-") {
                setFfCheckedNickname(foundNickname);
            } else {
                let apiMessage = data?.message || data?.error || data?.msg || "ID tidak ditemukan atau API Limit, Om.";
                setFfCheckError(apiMessage);
            }
        } catch (error) {
            setFfCheckError("Gagal terhubung ke API Omegatronik (Masalah Jaringan / CORS).");
        } finally {
            setIsCheckingFF(false);
        }
    };

    // --- LOGIKA REAL-TIME API CHECK ID MOBILE LEGENDS ---
    const checkMobileLegendsId = async () => {
        if (!mlCheckId.trim() || !mlCheckZone.trim()) {
            setMlCheckError("Masukkan User ID dan Zone ID Mobile Legends terlebih dahulu Om!");
            return;
        }
        setIsCheckingML(true);
        setMlCheckError("");
        setMlCheckedNickname("");
        try {
            const response = await fetch(`https://api.omegatronik.co.id/api/game/check-region-mlbb?key=bIQGfd2WhB&id=${encodeURIComponent(mlCheckId)}&zone=${encodeURIComponent(mlCheckZone)}`);
            if (!response.ok) {
                setMlCheckError(`Server error status: ${response.status}`);
                setIsCheckingML(false);
                return;
            }
            const data = await response.json();
            let foundNickname = "";
            if (data) {
                if (data.data && data.data.username) foundNickname = data.data.username; 
                else if (data.nickname) foundNickname = data.nickname;
                else if (data.name) foundNickname = data.name;
                else if (data.username) foundNickname = data.username;
                else if (data.player_name) foundNickname = data.player_name;
                else if (data.data && data.data.nickname) foundNickname = data.data.nickname;
                else if (data.data && data.data.name) foundNickname = data.data.name;
            }
            if (foundNickname && foundNickname !== "-") {
                setMlCheckedNickname(foundNickname);
            } else {
                let apiMessage = data?.message || data?.error || data?.msg || "ID / Zone tidak ditemukan atau API Limit, Om.";
                setMlCheckError(apiMessage);
            }
        } catch (error) {
            setMlCheckError("Gagal terhubung ke API Omegatronik (Masalah Jaringan / CORS).");
        } finally {
            setIsCheckingML(false);
        }
    };

    const generateFFP = () => {
        const currentRate = rateTotal / (rateDivider || 1);
        let text = `TOP UP FREE FIRE\n\n`;
        ffpData.forEach(item => {
            let hpp = Math.ceil(item.sum * currentRate);
            text += `${item.id.padEnd(9, ' ')}${item.dm.padEnd(15, ' ')}${formatNumber(hpp)}\n`;
        });
        text += `\nKeunggulan Produk:\n • 100% Valid\n • Jalur KiosGamer\n • Speed Detikan\n • Tersedia Screenshot web\n\n${contactInfo}`;
        return text;
    }; 

    const generateMLB = () => {
        const margin = parseFloat(profitML) || 0;
        let text = `Daftar Harga Mobile Legends (MLB)\n${customCaption}\n\n`;
        mlData.forEach(item => {
            let harga = Math.round(item.base * (1 + (margin / 100)));
            text += `${item.id.padEnd(10, ' ')} ${item.name.padEnd(22, ' ')} ${formatNumber(harga)}\n`;
        });
        text += `\nKeunggulan Produk:\n • 100% Valid\n • Jalur Direct Vendor\n\n${contactInfo}`;
        return text;
    }; 

    const handleCopy = () => {
        const content = activeTab === 'ml' ? generateMLB() : generateFFP();
        navigator.clipboard.writeText(content);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }; 

    const captureComponent = async (ref, setStatus, fileName) => {
        if (!ref.current) return;
        setStatus('loading');
        await new Promise(resolve => setTimeout(resolve, 200));
        try {
            const canvas = await html2canvas(ref.current, {
                backgroundColor: "#111111", 
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

    const getDropdownLabel = () => {
        if (activeTab === 'ml' || activeTab === 'ff') return 'Pricing Table';
        if (activeTab === 'validator') return 'Validator Struk';
        return 'Menu Panel';
    };

    // --- FILTER PRODUK KATALOG ---
    const filteredProducts = catalogProducts.filter(prod => {
        const matchesCategory = selectedCategory === "Semua Produk" || prod.category === selectedCategory;
        const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // --- STRUKTUR TEMA PREMIUM ---
    const bgOverlayClass = "w-full min-h-screen p-4 md:p-8 transition-colors duration-500 font-sans flex flex-col " + (
        isUltraDarkMode 
            ? "bg-slate-950 text-neutral-100" 
            : "bg-slate-50 text-slate-900"
    );

    const bgCardClass = "backdrop-blur-md border p-6 md:p-8 rounded-[2rem] transition-all duration-300 transform shadow-sm " + (
        isUltraDarkMode
            ? "border-neutral-800 bg-neutral-900/60 shadow-black/40 hover:border-neutral-700"
            : "border-slate-200/60 bg-white shadow-slate-100 hover:shadow-md"
    );

    const bgInputClass = "w-full p-4 rounded-xl border border-slate-200 focus:bg-white transition-all duration-300 font-bold outline-none " + (
        isUltraDarkMode
            ? "bg-neutral-900/80 border-neutral-800 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            : "bg-slate-50 text-slate-800 border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    );

    return (
        <div className="min-h-screen w-full relative overflow-x-hidden bg-slate-50 rounded-[2rem]">
          <div className={bgOverlayClass}>
            
            {/* Header Section */}
            <div className="mb-6 md:mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="transition-all transform duration-300 hover:translate-x-1">
                    <div className="flex items-center gap-3 mb-1">
                        <span className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider animate-pulse shadow-md shadow-blue-600/20">Pro System</span>
                        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800 uppercase dark:text-white">IFYONE HQ</h1>
                    </div>
                    <p className="text-slate-500 font-medium text-[10px] md:text-xs uppercase tracking-widest">Automated Gateway & H2H Engine Solution</p>
                </div>
                
                {/* NAVIGATION MENU BAR UTAMA */}
                <div className="flex flex-wrap items-center gap-3 self-stretch lg:self-center justify-start lg:justify-end bg-slate-100 dark:bg-neutral-900/80 p-2 rounded-2xl border border-slate-200/50 dark:border-neutral-800/50 transition-all">
                    
                    {/* BUTTON DASHBOARD CHECKER ID */}
                    <button 
                        onClick={() => { setActiveTab('checker'); setIsDropdownOpen(false); }} 
                        className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-300 transform active:scale-95 ${activeTab === 'checker' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-[1.02]' : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-200/60 dark:hover:bg-neutral-800'}`}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-1.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                        Menu Checker ID
                    </button>

                    {/* MENU PRODUK TRANSAKSI / KATALOG */}
                    <button 
                        onClick={() => { setActiveTab('products'); setIsDropdownOpen(false); }} 
                        className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-300 transform active:scale-95 ${activeTab === 'products' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]' : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-200/60 dark:hover:bg-neutral-800'}`}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                        Produk Transaksi
                    </button>

                    {/* MENU: PENGINGAT SALDO SUPPLIER */}
                    <button 
                        onClick={() => { setActiveTab('supplier'); setIsDropdownOpen(false); }} 
                        className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-300 transform active:scale-95 ${activeTab === 'supplier' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.02]' : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-200/60 dark:hover:bg-neutral-800'}`}
                    >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        Supplier Balance
                    </button>

                    {/* DROPDOWN TRIGGER TOOLS LAINNYA */}
                    <div className="relative">
                        <button 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-300 transform active:scale-95 ${(activeTab !== 'checker' && activeTab !== 'supplier' && activeTab !== 'products') ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-200/60 dark:hover:bg-neutral-800'}`}
                        >
                            <span>{getDropdownLabel()}</span>
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
                        </button>

                        {/* DROPDOWN MENU LIST */}
                        {isDropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)}></div>
                                <div className="absolute right-0 mt-2 w-56 border rounded-xl p-2 z-20 shadow-xl bg-white dark:bg-neutral-900 border-slate-100 dark:border-neutral-800 animate-fadeIn">
                                    <button 
                                        onClick={() => { setActiveTab('ff'); setIsDropdownOpen(false); }}
                                        className={`w-full text-left px-4 py-3 text-xs font-black uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2.5 ${activeTab === 'ml' || activeTab === 'ff' ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'}`}
                                    >
                                        Pricing Table
                                    </button>
                                    <button 
                                        onClick={() => { setActiveTab('validator'); setIsDropdownOpen(false); }}
                                        className={`w-full text-left px-4 py-3 text-xs font-black uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2.5 mt-1 ${activeTab === 'validator' ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800'}`}
                                    >
                                        Validator Struk
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* CONFIG BUTTON */}
                    <button 
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-3 rounded-xl transition-all duration-300 transform active:scale-95 ${showSettings ? 'bg-slate-800 dark:bg-neutral-700 text-white' : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.453.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>

                    {/* ULTRA DARK MODE TOGGLE */}
                    <button 
                        onClick={() => setIsUltraDarkMode(!isUltraDarkMode)}
                        className={`p-3 rounded-xl border transition-all duration-300 transform active:scale-95 ${isUltraDarkMode ? 'bg-orange-500/10 border-orange-500/30 text-amber-400' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'}`}
                    >
                        {isUltraDarkMode ? (
                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2m-19.78 7.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                        ) : (
                            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Custom Settings Panel */}
            {showSettings && (
                <div className={`mb-8 ${bgCardClass} animate-fadeIn`}>
                    <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                        Tampilan & Teks Kustom
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase ml-1 text-slate-400">Caption Promosi Utama</label>
                            <input type="text" value={customCaption} onChange={(e) => setCustomCaption(e.target.value)} className={bgInputClass} placeholder="Contoh: IFY ONE - Top Up Terpercaya" />
                        </div>
                        <div className="flex items-end">
                            <button onClick={() => setShowSettings(false)} className="w-full md:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition-all uppercase tracking-wider transform active:scale-95">Simpan Perubahan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* HALAMAN PRODUK TRANSAKSI (KATALOG DESAIN GAME TOPUP MODERN) */}
            {activeTab === 'products' && (
                <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col py-2 animate-fadeIn">
                    
                    {/* TITLE & DESKRIPSI KATALOG */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                            Katalog <span className="text-blue-600">Produk</span>
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Temukan produk digital favoritmu dengan harga termurah
                        </p>
                    </div>

                    {/* SEARCH BAR */}
                    <div className="relative mb-6">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Cari produk..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-xs font-bold outline-none border transition-all ${
                                isUltraDarkMode 
                                    ? "bg-neutral-900/90 border-neutral-800 text-white focus:border-blue-500" 
                                    : "bg-slate-100 border-slate-200/80 text-slate-800 focus:bg-white focus:border-blue-500"
                            }`}
                        />
                    </div>

                    {/* CATEGORY CHIPS SCROLLABLE */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none">
                        {catalogCategories.map((cat, idx) => {
                            const isSelected = selectedCategory === cat;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-300 transform active:scale-95 flex items-center gap-2 shrink-0 ${
                                        isSelected 
                                            ? "bg-slate-900 dark:bg-blue-600 text-white shadow-md shadow-slate-900/20" 
                                            : "bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:bg-slate-100 border border-slate-200/60 dark:border-neutral-800"
                                    }`}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>

                    {/* INFORMASI JUMLAH PRODUK */}
                    <div className="text-[11px] font-bold text-slate-400 dark:text-neutral-500 mb-5">
                        Menampilkan {filteredProducts.length} produk
                    </div>

                    {/* GRID CARDS KATALOG PRODUK */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5">
                        {filteredProducts.map((prod) => (
                            <a 
                                key={prod.id} 
                                href={prod.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`group rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between ${
                                    isUltraDarkMode 
                                        ? 'bg-neutral-900 border-neutral-800 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10' 
                                        : 'bg-white border-slate-200/80 hover:shadow-xl hover:shadow-slate-200/50 hover:border-blue-400'
                                }`}
                            >
                                {/* HEADER POSTER GAMBAR GAME */}
                                <div className={`h-36 md:h-40 w-full bg-gradient-to-br ${prod.bg} relative p-3 flex flex-col justify-between overflow-hidden`}>
                                    
                                    {/* EFEK POLA & DEKORASI BORDER BAWAH */}
                                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                                    <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/60 to-transparent"></div>

                                    {/* ICON BANNER ATAU LOGO */}
                                    <div className="relative z-10 flex justify-end">
                                        <span className="w-8 h-8 rounded-xl bg-black/30 backdrop-blur-md text-white font-black text-sm flex items-center justify-center border border-white/20 shadow-md">
                                            {prod.icon}
                                        </span>
                                    </div>

                                    {/* NAMA OVERLAY DI DALAM BANNER DENGAN GARIS KUNING TOPUP GAME */}
                                    <div className="relative z-10">
                                        <div className="border-b-2 border-yellow-400 w-12 mb-1 group-hover:w-full transition-all duration-500"></div>
                                        <div className="text-white font-black text-xs md:text-sm drop-shadow-md tracking-wider uppercase leading-tight line-clamp-2">
                                            {prod.name}
                                        </div>
                                    </div>
                                </div>

                                {/* FOOTER NAMA & BADGE ID/VOUCHER */}
                                <div className="p-3.5 flex items-center justify-between gap-1 bg-white dark:bg-neutral-900">
                                    <span className="text-xs font-black text-slate-800 dark:text-white truncate">
                                        {prod.name}
                                    </span>
                                    {prod.badge && (
                                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 uppercase shrink-0">
                                            {prod.badge}
                                        </span>
                                    )}
                                </div>
                            </a>
                        ))}
                    </div>

                    {filteredProducts.length === 0 && (
                        <div className="py-16 text-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                            Tidak ada produk yang cocok dengan pencarian.
                        </div>
                    )}
                </div>
            )}

            {/* HALAMAN MENU: PENGINGAT SALDO SUPPLIER H2H */}
            {activeTab === 'supplier' && (
                <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col justify-center py-2 animate-fadeIn">
                    <div className={`${bgCardClass} border-emerald-500/20`}>
                        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 border-slate-100 dark:border-neutral-800">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-sm">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.07 6.07 0 00-1-3.5M3.5 3l19 19M7.05 7.05A7 7 0 0012 18a7 7 0 004.95-2.05M12 18.25V21M12 3v1"/></svg>
                                </div>
                                <div>
                                    <h2 className={`text-xl font-black tracking-tight uppercase ${isUltraDarkMode ? 'text-white' : 'text-slate-800'}`}>H2H Supplier Balance Gateway</h2>
                                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Automated Telegram Dispatcher Terminal</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-center bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">System Live Link Status</span>
                            </div>
                        </div>

                        {/* GRID CONTROL SUPPLIER */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {['DAS', 'HAO', 'AMC', 'NEWBIEZ', 'OASIS', 'ANTUM'].map((sup) => {
                                const currentStatus = supplierStates[sup];
                                return (
                                    <div 
                                        key={sup} 
                                        className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] ${
                                            currentStatus === 'success' 
                                                ? 'bg-emerald-50/80 border-emerald-500 dark:bg-emerald-950/20 shadow-lg shadow-emerald-500/10' 
                                                : isUltraDarkMode 
                                                    ? 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700' 
                                                    : 'bg-slate-50 border-slate-200/60 hover:bg-white hover:shadow-md'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-black tracking-widest uppercase">SUPPLIER CODE</span>
                                                <h3 className={`text-xl font-black tracking-tight mt-0.5 ${currentStatus === 'success' ? 'text-emerald-600 dark:text-emerald-400' : isUltraDarkMode ? 'text-white' : 'text-slate-800'}`}>{sup}</h3>
                                            </div>
                                            
                                            {currentStatus === 'success' ? (
                                                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center animate-successPop shadow-md">
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                </div>
                                            ) : currentStatus === 'loading' ? (
                                                <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-xl bg-slate-200/50 dark:bg-neutral-800 flex items-center justify-center text-slate-400 group-hover:rotate-12 transition-transform">
                                                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                                </div>
                                            )}
                                        </div>

                                        <p className="text-[11px] text-slate-400 dark:text-neutral-400 font-bold mb-6">Kirim push pemberitahuan deposit top-up menuju server bot Telegram.</p>

                                        <button
                                            onClick={() => handleBalanceReminder(sup)}
                                            disabled={currentStatus === 'loading'}
                                            className={`w-full py-3.5 rounded-xl font-black text-xs tracking-wider uppercase transition-all duration-300 transform active:scale-95 shadow-sm flex items-center justify-center gap-2 ${
                                                currentStatus === 'success'
                                                    ? 'bg-emerald-600 text-white animate-pulse'
                                                    : 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-neutral-800 dark:hover:bg-neutral-700'
                                            }`}
                                        >
                                            {currentStatus === 'loading' ? (
                                                "MENGIRIMKAN..."
                                            ) : currentStatus === 'success' ? (
                                                <span className="flex items-center gap-2 tracking-widest">
                                                    TERKIRIM 
                                                    <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24" className="animate-bounce"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                                                </span>
                                            ) : (
                                                `REMINDER ${sup}`
                                            )}
                                        </button>
                                        
                                        {currentStatus === 'success' && (
                                            <div className="absolute inset-0 border-2 border-emerald-500 rounded-2xl pointer-events-none animate-ping opacity-25"></div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* HALAMAN UTAMA: CEK ID (FF & MOBILE LEGENDS) */}
            {activeTab === 'checker' && (
                <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col justify-center py-2 animate-fadeIn">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        
                        {/* SUB-PANEL 1: CEK ID FREE FIRE */}
                        <div className={`${bgCardClass} hover:border-orange-500/30`}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 text-white font-black rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 text-xs transform hover:rotate-6 transition-transform">FF</div>
                                    <div>
                                        <h2 className={`text-lg font-black tracking-tight uppercase ${isUltraDarkMode ? 'text-white' : 'text-slate-800'}`}>Free Fire ID Checker</h2>
                                        <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">Real-time Garena API Sync</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="relative group">
                                    <input 
                                        type="text" 
                                        placeholder="Masukkan Player ID (Contoh: 12345678)" 
                                        value={ffCheckId}
                                        onChange={(e) => setFfCheckId(e.target.value)}
                                        className={bgInputClass + " pr-28 transition-all"}
                                    />
                                    <button 
                                        onClick={checkFreeFireId}
                                        disabled={isCheckingFF}
                                        className="absolute right-2 top-2 bottom-2 px-5 bg-gradient-to-r from-slate-900 to-neutral-800 hover:from-orange-600 hover:to-orange-500 text-white text-xs font-black uppercase tracking-wider rounded-lg transition-all duration-300 disabled:opacity-50 flex items-center gap-2 shadow-sm transform active:scale-95"
                                    >
                                        {isCheckingFF ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Check"}
                                    </button>
                                </div>

                                {ffCheckedNickname && (
                                    <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-xl dark:bg-emerald-950/30 dark:border-emerald-900/50 animate-scaleUp">
                                        <div className="text-[10px] uppercase font-black tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Nickname Ditemukan:</div>
                                        <div className={`text-lg font-black tracking-wide break-all ${isUltraDarkMode ? 'text-emerald-400' : 'text-slate-800'}`}>{ffCheckedNickname}</div>
                                    </div>
                                )}

                                {ffCheckError && (
                                    <div className="p-5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold dark:bg-red-950/20 dark:border-red-900/50 animate-scaleUp">
                                        Error: {ffCheckError}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SUB-PANEL 2: CEK ID MOBILE LEGENDS */}
                        <div className={`${bgCardClass} hover:border-cyan-500/30`}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-black rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 text-xs transform hover:rotate-6 transition-transform">ML</div>
                                    <div>
                                        <h2 className={`text-lg font-black tracking-tight uppercase ${isUltraDarkMode ? 'text-white' : 'text-slate-800'}`}>Mobile Legends Checker</h2>
                                        <p className="text-[10px] text-cyan-500 font-bold uppercase tracking-wider">Real-time Moonton API Sync</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-col md:flex-row gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="User ID (cth: 8639264)" 
                                        value={mlCheckId}
                                        onChange={(e) => setMlCheckId(e.target.value)}
                                        className={bgInputClass + " flex-[2]"}
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Zone (cth: 23423)" 
                                        value={mlCheckZone}
                                        onChange={(e) => setMlCheckZone(e.target.value)}
                                        className={bgInputClass + " flex-1 text-center"}
                                    />
                                </div>
                                <button  
                                    onClick={checkMobileLegendsId}
                                    disabled={isCheckingML}
                                    className="w-full py-4 bg-gradient-to-r from-slate-900 to-neutral-800 hover:from-cyan-600 hover:to-cyan-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md transform active:scale-95"
                                >
                                    {isCheckingML ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Periksa Nickname Player"}
                                </button>

                                {mlCheckedNickname && (
                                    <div className="p-5 bg-cyan-50 border border-cyan-100 rounded-xl dark:bg-cyan-950/30 dark:border-cyan-900/50 animate-scaleUp">
                                        <div className="text-[10px] uppercase font-black tracking-widest text-cyan-600 dark:text-cyan-400 mb-1">Nickname Ditemukan:</div>
                                        <div className={`text-lg font-black tracking-wide break-all ${isUltraDarkMode ? 'text-cyan-400' : 'text-slate-800'}`}>{mlCheckedNickname}</div>
                                    </div>
                                )}

                                {mlCheckError && (
                                    <div className="p-5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold dark:bg-red-950/20 dark:border-red-900/50 animate-scaleUp">
                                        Error: {mlCheckError}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB PRICING GENERATOR MANUAL */}
            {(activeTab === 'ml' || activeTab === 'ff') && (
                <div className="w-full max-w-7xl mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start py-2 animate-fadeIn">
                    <div className={`lg:col-span-5 space-y-6 ${bgCardClass}`}>
                        
                        <div className="flex p-1.5 bg-slate-100 rounded-xl dark:bg-neutral-900">
                            <button 
                                onClick={() => setActiveTab('ff')} 
                                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'ff' ? 'bg-white text-slate-800 shadow-sm dark:bg-neutral-800 dark:text-white scale-[1.01]' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Free Fire (HPP Rate)
                            </button>
                            <button 
                                onClick={() => setActiveTab('ml')} 
                                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'ml' ? 'bg-white text-slate-800 shadow-sm dark:bg-neutral-800 dark:text-white scale-[1.01]' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                Mobile Legends (Margin)
                            </button>
                        </div>

                        <div className="space-y-4">
                            {activeTab === 'ff' ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase ml-1 text-slate-400">Total Pembelian Modal (IDR)</label>
                                        <input type="number" value={rateTotal} onChange={(e) => setRateTotal(Number(e.target.value))} className={bgInputClass} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase ml-1 text-slate-400">Pembagi KiosGamer (DM / Unit)</label>
                                        <input type="number" value={rateDivider} onChange={(e) => setRateDivider(Number(e.target.value))} className={bgInputClass} />
                                    </div>
                                    <div className="p-4 rounded-xl border bg-orange-50/50 border-orange-100 flex justify-between items-center dark:bg-orange-950/20 dark:border-orange-900">
                                        <span className="text-xs font-bold text-slate-500 dark:text-neutral-400">HPP per 1 Unit DM:</span>
                                        <span className="text-sm font-black text-orange-600 dark:text-orange-400 animate-pulse">Rp {formatNumber(Math.ceil(rateTotal / (rateDivider || 1)))}</span>
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase ml-1 text-slate-400">Markup Keuntungan Bersih (%)</label>
                                    <input type="number" step="0.1" value={profitML} onChange={(e) => setProfitML(e.target.value)} className={bgInputClass} placeholder="Contoh: 3.5" />
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button onClick={handleCopy} className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl transition-all uppercase tracking-wider shadow-md transform active:scale-95">
                                {isCopied ? "Berhasil Disalin!" : "Salin Teks Harga"}
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-7 h-full">
                        <div className="w-full rounded-[2rem] border overflow-hidden shadow-md h-full font-mono flex flex-col bg-[#111111] border-neutral-800">
                            <div className="px-5 py-4 border-b flex items-center justify-between bg-neutral-900 border-neutral-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-2">Live Output Terminal</span>
                                </div>
                                <span className="text-[11px] font-black text-neutral-400 tracking-wide">{activeTab.toUpperCase()} ENGINE</span>
                            </div>
                            
                            <div className="p-6 overflow-y-auto text-xs font-bold leading-relaxed flex-1 select-all text-neutral-300 whitespace-pre">
                                {activeTab === 'ml' ? generateMLB() : generateFFP()}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB VALIDATOR STRUK GATEWAY */}
            {activeTab === 'validator' && (
                <div className="w-full max-w-7xl mx-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start py-2 animate-fadeIn">
                    
                    <div className={`space-y-6 ${bgCardClass}`}>
                        <div>
                            <h2 className={`text-md font-black uppercase tracking-tight ${isUltraDarkMode ? 'text-white' : 'text-slate-800'}`}>Parser Engine v2.0</h2>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase">Automated Structure Extract</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-cyan-600 tracking-wider">Raw Struk Mobile Legends</label>
                            <textarea 
                                rows="3"
                                value={mlInput}
                                onChange={(e) => setMlInput(e.target.value)}
                                placeholder="Paste data transaksi MLBB disini..."
                                className={`${bgInputClass} resize-none`}
                            />
                            <button onClick={processMLValidator} className="w-full py-3.5 bg-cyan-50/60 border border-cyan-100 text-cyan-600 rounded-xl transition-all font-black text-xs uppercase tracking-wider hover:bg-cyan-100 transform active:scale-95 dark:bg-cyan-950/20 dark:border-cyan-900/40 dark:text-cyan-400">Parse Data MLBB</button>
                        </div>

                        <div className="space-y-2 pt-2">
                            <label className="text-[10px] font-black uppercase text-orange-600 tracking-wider">Raw Struk Free Fire</label>
                            <textarea 
                                rows="3"
                                value={ffInput}
                                onChange={(e) => setFfInput(e.target.value)}
                                placeholder="Paste data transaksi Free Fire disini..."
                                className={`${bgInputClass} resize-none`}
                            />
                            <button onClick={processFFValidator} className="w-full py-3.5 bg-orange-50/60 border border-orange-100 text-orange-600 rounded-xl transition-all font-black text-xs uppercase tracking-wider hover:bg-orange-100 transform active:scale-95 dark:bg-orange-950/20 dark:border-orange-900/40 dark:text-orange-400">Parse Data Free Fire</button>
                        </div>
                    </div>

                    <div className="space-y-8">
                        {mlResult && (
                            <div className="space-y-3 animate-scaleUp">
                                <div className="flex justify-between items-center px-2">
                                    <span className="text-[11px] font-black text-cyan-600 uppercase tracking-widest">Preview Struk MLBB</span>
                                    <button 
                                        onClick={() => captureComponent(mlResultRef, setImageStatusML, "MLBB-Struk")}
                                        className="text-[11px] font-black bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl uppercase tracking-wider transition-all transform active:scale-95"
                                    >
                                        {imageStatusML === 'loading' ? 'Processing...' : imageStatusML === 'success' ? 'Copied Image!' : 'Copy Gambar'}
                                    </button>
                                </div>

                                <div ref={mlResultRef} className="w-full max-w-sm mx-auto bg-[#111111] border border-neutral-800 rounded-[2rem] p-6 font-mono relative overflow-hidden shadow-lg transition-transform hover:scale-[1.01]">
                                    <div className="flex items-center gap-3 border-b border-neutral-800 pb-4 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-black text-[10px]">ML</div>
                                        <div>
                                            <div className="text-xs font-black text-white tracking-wide">MOBILE LEGENDS</div>
                                            <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">{mlResult.time || "TRANSAKSI BERHASIL"}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-3 text-xs">
                                        <div className="flex justify-between items-center gap-4">
                                            <span className="text-neutral-400 font-medium shrink-0">Ref ID</span>
                                            <span className="font-bold text-white text-right break-all flex-1">{mlResult.trxId}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-4">
                                            <span className="text-neutral-400 font-medium shrink-0">Kategori</span>
                                            <span className="font-bold text-cyan-400 text-right flex-1">Mobile Legends</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-4">
                                            <span className="text-neutral-400 font-medium shrink-0">Produk</span>
                                            <span className="font-bold text-cyan-400 text-right flex-1">{mlResult.product}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-4">
                                            <span className="text-neutral-400 font-medium shrink-0">Nickname</span>
                                            <span className="font-bold text-white text-right flex-1">{mlResult.nick}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-4">
                                            <span className="text-neutral-400 font-medium shrink-0">User ID</span>
                                            <span className="font-bold text-white text-right flex-1">{mlResult.uid}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {ffResult && (
                            <div className="space-y-3 animate-scaleUp">
                                <div className="flex justify-between items-center px-2">
                                    <span className="text-[11px] font-black text-orange-600 uppercase tracking-widest">Preview Struk Free Fire</span>
                                    <button 
                                        onClick={() => captureComponent(ffResultRef, setImageStatus, "FF-Struk")}
                                        className="text-[11px] font-black bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl uppercase tracking-wider transition-all transform active:scale-95"
                                    >
                                        {imageStatus === 'loading' ? 'Processing...' : imageStatus === 'success' ? 'Copied Image!' : 'Copy Gambar'}
                                    </button>
                                </div>

                                <div ref={ffResultRef} className="w-full max-w-sm mx-auto bg-[#111111] border border-neutral-800 rounded-[2rem] p-6 font-mono relative overflow-hidden shadow-lg transition-transform hover:scale-[1.01]">
                                    <div className="flex items-center gap-3 border-b border-neutral-800 pb-4 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-black text-[10px]">FF</div>
                                        <div>
                                            <div className="text-xs font-black text-white tracking-wide">GARENA FREE FIRE</div>
                                            <div className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">{ffResult.time || "TRANSAKSI BERHASIL"}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-3 text-xs">
                                        <div className="flex justify-between items-center gap-4">
                                            <span className="text-neutral-400 font-medium shrink-0">Ref ID</span>
                                            <span className="font-bold text-white text-right break-all flex-1">{ffResult.trxId}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-4">
                                            <span className="text-neutral-400 font-medium shrink-0">Kategori</span>
                                            <span className="font-bold text-orange-400 text-right flex-1">Free Fire</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-4">
                                            <span className="text-neutral-400 font-medium shrink-0">Produk</span>
                                            <span className="font-bold text-orange-400 text-right flex-1">{ffResult.product}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-4">
                                            <span className="text-neutral-400 font-medium shrink-0">Nickname</span>
                                            <span className="font-bold text-white text-right flex-1">{ffResult.nick}</span>
                                        </div>
                                        <div className="flex justify-between items-center gap-4">
                                            <span className="text-neutral-400 font-medium shrink-0">User ID</span>
                                            <span className="font-bold text-white text-right flex-1">{ffResult.uid}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

          </div>
          
          <style jsx="true">{`
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes scaleUp {
                from { opacity: 0; transform: scale(0.97); }
                to { opacity: 1; transform: scale(1); }
            }
            @keyframes successPop {
                0% { transform: scale(0.8); opacity: 0; }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); opacity: 1; }
            }
            .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
            .animate-scaleUp { animation: scaleUp 0.3s ease-out forwards; }
            .animate-successPop { animation: successPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
            
            .scrollbar-none::-webkit-scrollbar {
                display: none;
            }
            .scrollbar-none {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
          `}</style>
        </div>
    );
};

export default GamesPanel;
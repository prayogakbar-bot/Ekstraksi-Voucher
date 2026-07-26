import React, { useState, useEffect, useRef } from 'react';
import { 
  Search as SearchIcon, 
  FileSpreadsheet, 
  X, 
  ChevronDown, 
  Trash2,
  Calendar,
  Filter,
  AlertTriangle,
  Copy
} from 'lucide-react';
import * as XLSX from 'xlsx';

const LogSpeedPanel = () => {
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [isAutoFit, setIsAutoFit] = useState(false); // Fitur Resize Otomax
  const fileInputRef = useRef(null);

  // State Tambahan untuk Fitur Edit Tanggal Upload
  const [useCustomUploadDate, setUseCustomUploadDate] = useState(false);
  const [customUploadDate, setCustomUploadDate] = useState('');

  const defaultWidths = {
    tglEntri: 100, 
    tglStatus: 100, 
    produk: 50,
    tujuan: 100, 
    sn: 150, 
    status: 60,
    hargaJual: 80,
    hargaBeli: 80,
    laba: 70,
    supplier: 90,
    jawabanProvider: 200
  };

  const [columnWidths, setColumnWidths] = useState(defaultWidths);

  const resizingColumn = useRef(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Logic untuk Auto-fit (Resize)
  useEffect(() => {
    if (isAutoFit) {
      setColumnWidths({
        tglEntri: 120, tglStatus: 120, produk: 80, tujuan: 140, sn: 180, status: 80,
        hargaJual: 100, hargaBeli: 100, laba: 90, supplier: 110, jawabanProvider: 300
      });
    } else {
      setColumnWidths(defaultWidths);
    }
  }, [isAutoFit]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!resizingColumn.current) return;
      const clientX = e.touches ? e.touches[0].pageX : e.pageX;
      const diff = clientX - startX.current;
      const newWidth = Math.max(5, startWidth.current + diff);
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn.current]: newWidth
      }));
    };
    
    const onMouseUp = () => { 
        resizingColumn.current = null; 
        document.body.style.cursor = 'default'; 
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onMouseMove);
    window.addEventListener('touchend', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, []);

  const handleResizeStart = (e, colKey) => {
    const clientX = e.touches ? e.touches[0].pageX : e.pageX;
    resizingColumn.current = colKey;
    startX.current = clientX;
    startWidth.current = columnWidths[colKey];
    document.body.style.cursor = 'col-resize';
  };

  const handleReset = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setDateFilter('');
    setIsAutoFit(false);
    setUseCustomUploadDate(false);
    setCustomUploadDate('');
    setColumnWidths(defaultWidths);
  };

  const clearFile = () => {
    setData([]);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatOtomaxDate = (dateObj, manualTime = null) => {
    if (!(dateObj instanceof Date) || isNaN(dateObj)) return "-";
    const pad = (num) => num.toString().padStart(2, '0');
    const d = pad(dateObj.getDate());
    const m = pad(dateObj.getMonth() + 1);
    const y = dateObj.getFullYear().toString().slice(-2);
    
    let timeStr = "";
    if (manualTime) {
      timeStr = manualTime.replace(/:/g, '.');
    } else {
      const h = pad(dateObj.getHours());
      const min = pad(dateObj.getMinutes());
      const s = pad(dateObj.getSeconds());
      timeStr = `${h}.${min}.${s}`;
    }
    
    return `${d}/${m}/${y} ${timeStr}`;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const dataArray = new Uint8Array(e.target.result);
          const workbook = XLSX.read(dataArray, { type: 'array', cellDates: true });
          const rawJson = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { 
            defval: "",
            header: "A" 
          });
          
          const dataRows = rawJson.slice(1);

          const mappedData = dataRows.map((item) => {
            let entriDate = item['A'] || new Date(); 
            if (!(entriDate instanceof Date)) entriDate = new Date(entriDate);
            
            // Override Tanggal jika fitur edit tanggal aktif dan bernilai valid
            if (useCustomUploadDate && customUploadDate) {
              const [year, month, day] = customUploadDate.split('-');
              entriDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
            }

            const jawabanProvider = (item['N'] || "").toString();
            let finalTglStatus = "";

            const timeMatch = jawabanProvider.match(/(\d{2}[:\.]\d{2}[:\.]\d{2})/);

            if (timeMatch) {
              finalTglStatus = formatOtomaxDate(entriDate, timeMatch[0]);
            } else {
              const statusDate = new Date(entriDate.getTime() + 10000);
              finalTglStatus = formatOtomaxDate(statusDate);
            }

            let rawStatus = (item['P'] || "").toString().trim();

            return {
              rawDate: entriDate,
              tglEntri: formatOtomaxDate(entriDate),
              tglStatus: finalTglStatus,
              produk: (item['C'] || "").toString().toUpperCase(),
              tujuan: (item['E'] || "").toString(),
              sn: (item['O'] || "").toString(),
              status: rawStatus,
              hargaJual: item['L'] || 0,
              hargaBeli: item['K'] || 0,
              laba: item['M'] || 0,
              supplier: (item['H'] || "").toString(),
              jawabanProvider: jawabanProvider
            };
          });
          setData(mappedData);
        } catch (err) { console.error("Error processing excel:", err); }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const filteredData = data.filter(item => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = item.tujuan.toLowerCase().includes(s) || 
                          item.produk.toLowerCase().includes(s) || 
                          item.sn.toLowerCase().includes(s);
    const matchesStatus = statusFilter === 'ALL' || item.status.toLowerCase() === statusFilter.toLowerCase();
    let matchesDate = true;
    if (dateFilter) {
      const itemDateStr = item.rawDate.toISOString().split('T')[0];
      matchesDate = itemDateStr === dateFilter;
    }
    return matchesSearch && matchesStatus && matchesDate;
  });

  const naRows = filteredData.filter(item => item.sn.toUpperCase() === 'N/A' || item.sn.toUpperCase() === 'NA');

  const copyToClipboard = () => {
    const text = naRows.map(item => 
      `Komplain SN N/A:\nTrx: ${item.produk}\nTujuan: ${item.tujuan}\nTgl: ${item.tglEntri}\nStatus: ${item.status}\nSN: ${item.sn}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(text);
    alert('Format komplain berhasil disalin!');
  };

  const totalLaba = filteredData.reduce((acc, curr) => acc + (Number(curr.laba) || 0), 0);

  const HeaderCell = ({ title, colKey, hasArrow = false }) => (
    <th style={{ width: columnWidths[colKey] }} className="header-cell relative">
      <div className="flex items-center w-full h-full overflow-hidden">
        <div className="whitespace-nowrap flex-1 overflow-hidden text-clip leading-none text-black">
          {title}
        </div>
        {hasArrow && <ChevronDown size={10} className="text-gray-500 shrink-0 ml-[2px]" />}
      </div>
      <div 
        onMouseDown={(e) => handleResizeStart(e, colKey)} 
        onTouchStart={(e) => handleResizeStart(e, colKey)}
        className="resizer" 
      />
    </th>
  );

  return (
    <div className="w-full max-w-full overflow-hidden p-1 md:p-0">
      <div className="flex flex-col bg-[#D4D0C8] font-['Tahoma',sans-serif] text-[11px] text-black border border-[#808080] rounded-sm overflow-hidden h-[85vh] md:h-[600px] shadow-sm">
        
        <div className="bg-[#F0F0F0] border-b border-[#808080] px-2 py-1 flex items-center gap-4 text-[11px] font-bold select-none shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-[#000080]">Total Transaksi:</span>
            <span>{filteredData.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[#000080]">Total Laba:</span>
            <span className="text-green-700">{totalLaba.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-[#F0F0F0] border-b border-[#808080] p-[4px] flex flex-wrap items-center gap-1 shrink-0 select-none">
          <div className="flex items-center bg-white border border-[#7F9DB9] px-1 h-[24px] md:h-[20px] flex-1 min-w-[120px]">
            <Calendar size={11} className="text-gray-400 mr-1" />
            <input type="date" className="outline-none text-[10px] w-full bg-transparent" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          </div>
          
          <div className="flex items-center bg-white border border-[#7F9DB9] px-1 h-[24px] md:h-[20px] flex-1 min-w-[120px]">
            <SearchIcon size={11} className="text-gray-400 mr-1" />
            <input type="text" className="outline-none w-full text-[11px]" placeholder="Cari..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          <div className="flex items-center gap-1 w-full md:w-auto">
            <select className="border border-[#7F9DB9] h-[24px] md:h-[20px] outline-none text-[11px] bg-white flex-1 md:w-20" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">Semua</option>
              <option value="Sukses">Sukses</option>
              <option value="Gagal">Gagal</option>
            </select>

            {!fileName ? (
              <label className="flex items-center justify-center gap-1 px-2 h-[24px] md:h-[20px] bg-[#F0F0F0] border border-[#7F9DB9] hover:bg-[#E5E5E5] cursor-pointer text-[10px] flex-1 md:flex-none">
                <FileSpreadsheet size={11} className="text-green-700" />
                <span>Open</span>
                <input ref={fileInputRef} type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
              </label>
            ) : (
              <div className="flex items-center gap-1 bg-[#E1E1E1] border border-[#7F9DB9] px-2 h-[24px] md:h-[20px] text-[10px] flex-1 md:flex-none justify-between">
                <div className="flex items-center gap-1 overflow-hidden">
                  <FileSpreadsheet size={11} className="text-green-700" />
                  <span className="max-w-[60px] md:max-w-[80px] truncate uppercase text-black">{fileName}</span>
                </div>
                <button onClick={clearFile} className="ml-1 hover:text-red-600"><Trash2 size={11} /></button>
              </div>
            )}
          </div>

          {/* Fitur Edit Tanggal Upload */}
          <div className="flex items-center gap-1 border border-[#A0A0A0] bg-[#E1E1E1] p-[2px] h-[24px] md:h-[20px] rounded-sm">
            <label className="flex items-center gap-1 cursor-pointer text-[10px] font-semibold text-gray-700 px-1">
              <input 
                type="checkbox" 
                checked={useCustomUploadDate} 
                onChange={(e) => setUseCustomUploadDate(e.target.checked)}
                className="w-3 h-3"
              />
              <span>Ubah Tgl</span>
            </label>
            {useCustomUploadDate && (
              <input 
                type="date" 
                className="outline-none text-[10px] bg-white border border-[#7F9DB9] px-1 h-full font-sans" 
                value={customUploadDate} 
                onChange={(e) => setCustomUploadDate(e.target.value)} 
              />
            )}
          </div>
        </div>

        <div className="flex-1 bg-white overflow-auto scrollbar-otomax touch-auto selection:bg-[#316AC5] selection:text-white">
          <div className="bg-white inline-block min-w-full">
            <table className="border-collapse table-fixed w-full" style={{ tableLayout: 'fixed' }}>
              <thead className="sticky top-0 z-20 select-none">
                <tr className="bg-[#F2F2F2]">
                  <th className="header-cell" style={{ width: '30px', textAlign: 'center' }}>#</th>
                  <HeaderCell title="Tgl. Entri" colKey="tglEntri" hasArrow={true} />
                  <HeaderCell title="Tgl. Status" colKey="tglStatus" />
                  <HeaderCell title="Produk" colKey="produk" />
                  <HeaderCell title="Tujuan" colKey="tujuan" />
                  <HeaderCell title="SN" colKey="sn" />
                  <HeaderCell title="Status" colKey="status" />
                  <HeaderCell title="Harga Jual" colKey="hargaJual" />
                  <HeaderCell title="Harga Beli" colKey="hargaBeli" />
                  <HeaderCell title="Laba" colKey="laba" />
                  <HeaderCell title="Supplier" colKey="supplier" />
                  <HeaderCell title="Jawaban Provider" colKey="jawabanProvider" />
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, idx) => {
                  const isGagal = item.status.toLowerCase() === 'gagal';
                  const isNA = item.sn.toUpperCase() === 'N/A' || item.sn.toUpperCase() === 'NA';
                  
                  // Logic Penentuan Warna Background Baris (Otomax Style)
                  let rowBgClass = idx % 2 === 1 ? 'bg-[#F5F5F5]' : 'bg-white';
                  
                  // Warna Merah Gagal khas Otomax (Red: #FF4D4D atau #FF3333)
                  if (isGagal) {
                    rowBgClass = 'bg-[#FF4D4D] text-white'; 
                  } else if (isNA) {
                    rowBgClass = 'bg-[#FFF4CE]'; // Kuning jika SN N/A
                  }
                  
                  return (
                    <tr key={idx} className={`row-otomax ${rowBgClass}`}>
                      <td className={`cell-otomax text-center select-none border-r-[#808080] text-[9px] ${isGagal ? 'bg-[#E60000] text-white' : 'bg-[#F0F0F0] text-gray-600'}`} style={{ width: '30px' }}>{idx + 1}</td>
                      <td className="cell-otomax" style={{ width: columnWidths.tglEntri }}>{item.tglEntri}</td>
                      <td className="cell-otomax" style={{ width: columnWidths.tglStatus }}>{item.tglStatus}</td>
                      <td className="cell-otomax" style={{ width: columnWidths.produk }}>{item.produk}</td>
                      <td className="cell-otomax" style={{ width: columnWidths.tujuan }}>{item.tujuan}</td>
                      <td className={`cell-otomax ${isNA && !isGagal ? 'font-bold text-orange-700' : ''}`} style={{ width: columnWidths.sn }}>{item.sn}</td>
                      <td className="cell-otomax" style={{ width: columnWidths.status }}>{item.status}</td>
                      <td className="cell-otomax text-right" style={{ width: columnWidths.hargaJual }}>{item.hargaJual?.toLocaleString()}</td>
                      <td className="cell-otomax text-right" style={{ width: columnWidths.hargaBeli }}>{item.hargaBeli?.toLocaleString()}</td>
                      <td className="cell-otomax text-right" style={{ width: columnWidths.laba }}>{item.laba?.toLocaleString()}</td>
                      <td className="cell-otomax" style={{ width: columnWidths.supplier }}>{item.supplier}</td>
                      <td className="cell-otomax" style={{ width: columnWidths.jawabanProvider }}>{item.jawabanProvider}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {naRows.length > 0 && (
          <div className="bg-[#FFF4CE] border-y border-[#808080] p-1 flex items-center justify-between animate-pulse select-none">
            <div className="flex items-center gap-2 text-[#856404] font-bold text-[10px]">
              <AlertTriangle size={14} className="text-orange-600" />
              <span>DITEMUKAN {naRows.length} DATA DENGAN SN: N/A</span>
            </div>
            <button 
              onClick={copyToClipboard}
              className="win-btn flex items-center gap-1 px-2 py-0.5 bg-[#E1E1E1]"
            >
              <Copy size={10} />
              SALIN KOMPLAIN
            </button>
          </div>
        )}

        <div className="bg-[#D4D0C8] border-t border-[#808080] text-black px-1 h-[24px] md:h-[22px] flex items-center justify-between shrink-0 text-[10px] select-none">
          <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 cursor-pointer hover:bg-white/50 px-1 py-0.5 border border-transparent active:border-[#808080]">
                <input 
                  type="checkbox" 
                  checked={isAutoFit} 
                  onChange={(e) => setIsAutoFit(e.target.checked)}
                  className="w-3 h-3"
                />
                <span className="leading-none">Resize</span>
              </label>
              <div className="w-[1px] h-3 bg-[#808080] mx-1" />
              <span className="opacity-70">Otomax Speed Log</span>
          </div>
          
          <div className="flex items-center gap-1">
             <button onClick={() => setData([...data])} className="win-btn px-2">Refresh</button>
             <button onClick={handleReset} className="win-btn px-2">Reset</button>
          </div>
        </div>

        <style>{`
          .scrollbar-otomax::-webkit-scrollbar { width: 14px; height: 14px; }
          .scrollbar-otomax::-webkit-scrollbar-track { background: #F0F0F0; border-left: 1px solid #C0C0C0; }
          .scrollbar-otomax::-webkit-scrollbar-thumb { 
            background: #D4D0C8; border: 1px solid #FFFFFF; 
            box-shadow: inset -1px -1px #808080, inset 1px 1px #FFF; 
          }
          .win-btn { 
            background: #D4D0C8; color: black; font-weight: normal; 
            height: 16px; border: 1px solid #FFF;
            box-shadow: inset 1px 1px #fff, 1px 1px #404040; line-height: 1; 
            font-size: 9px;
            cursor: pointer;
          }
          .win-btn:active {
            box-shadow: inset -1px -1px #fff, inset 1px 1px #404040;
          }
          .header-cell {
            border: 1px solid #A0A0A0; padding: 0 3px; height: 22px;
            background: #F2F2F2; font-weight: normal; text-align: left;
            font-family: 'Tahoma', sans-serif;
            overflow: hidden;
          }
          .resizer {
            position: absolute; right: 0; top: 0; bottom: 0; width: 8px;
            cursor: col-resize; z-index: 10;
          }
          .row-otomax { height: 18px; transition: none; display: table-row; }
          
          .cell-otomax {
              border: 1px solid #D0D0D0;
              padding: 0 3px;
              height: 18px;
              font-family: 'Tahoma', sans-serif;
              color: inherit;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: clip;
              display: table-cell;
              vertical-align: middle;
              user-select: text;
          }

          @media (hover: hover) {
            .row-otomax:hover { 
              background-color: #E8F2FF !important;
              color: black !important;
            }
          }
          
          @media (max-width: 640px) {
            .win-btn { height: 18px; padding: 0 6px; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default LogSpeedPanel;
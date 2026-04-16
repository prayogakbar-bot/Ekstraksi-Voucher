import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getAgents, saveAgent, deleteAgent, WEBHOOK_ID } from './firebase';

function DaftarAgen() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ id: '', name: '', phone: '', balance: '' });

    useEffect(() => {
        loadAgentsData();
    }, []);

    const loadAgentsData = async () => {
        try {
            setLoading(true);
            const data = await getAgents();
            setAgents(data);
        } catch (error) {
            console.error("Gagal memuat data:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatRP = (val) => new Intl.NumberFormat('id-ID', { 
        style: 'currency', currency: 'IDR', maximumFractionDigits: 0 
    }).format(val || 0);

    const formatInputWithDots = (val) => {
        if (!val) return '';
        let value = val.toString().replace(/\D/g, ''); 
        return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const excelData = XLSX.utils.sheet_to_json(ws);

                if (excelData.length === 0) return alert("File kosong!");

                const importPromises = excelData.map(async (row) => {
                    const rowName = row.Nama || row.nama || row.name || row.Name;
                    const rowSaldo = row.Saldo || row.saldo || row.balance || row.Balance;
                    const rowPhone = row.HP || row.hp || row.phone || row.Phone || row.telepon;

                    if (!rowName) return null;

                    const existingAgent = agents.find(a => 
                        a.name.toLowerCase() === rowName.toString().trim().toLowerCase()
                    );

                    const payload = {
                        id: existingAgent ? existingAgent.id : '', 
                        name: rowName.toString().trim(),
                        phone: String(rowPhone || "0"),
                        balance: parseInt(rowSaldo || 0)
                    };

                    return await saveAgent(payload);
                });

                await Promise.all(importPromises);
                alert(`Berhasil sinkronisasi data dari Excel!`);
                loadAgentsData(); 
            } catch (err) {
                alert("Gagal membaca Excel: " + err.message);
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const cleanBalance = parseInt(formData.balance.toString().replace(/\D/g, '')) || 0;
        try {
            await saveAgent({ ...formData, balance: cleanBalance });
            setIsModalOpen(false);
            setFormData({ id: '', name: '', phone: '', balance: '' });
            loadAgentsData();
        } catch (error) {
            alert("Gagal menyimpan data ke Cloud");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("Hapus data agen ini?")) {
            await deleteAgent(id);
            loadAgentsData();
        }
    };

    const grandTotal = agents.reduce((sum, a) => sum + (parseInt(a.balance) || 0), 0);

    return (
        <div className="max-w-6xl mx-auto space-y-6 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 flex flex-col justify-center bg-gradient-to-br from-[#1e293b] to-[#334155] p-8 rounded-[2.5rem] text-white shadow-2xl border border-slate-700">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Total Saldo Cloud</p>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight">
                        {loading ? "..." : formatRP(grandTotal)}
                    </h2>
                </div>

                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col justify-center gap-3">
                    <label className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer px-4 py-4 rounded-2xl font-bold text-[10px] uppercase flex items-center justify-center gap-2 transition-all">
                        <span>📥 Upload Excel</span>
                        <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <button 
                        onClick={() => { setIsEditing(false); setIsModalOpen(true); setFormData({id:'', name:'', phone:'', balance:''}) }} 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-4 rounded-2xl font-bold text-[10px] uppercase transition-all shadow-lg shadow-blue-100"
                    >
                        ➕ Tambah Agen
                    </button>
                </div>
            </div>

            <input 
                type="text" 
                placeholder="Cari agen..." 
                className="w-full p-5 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm bg-white"
                onChange={(e) => setSearchTerm(e.target.value)}
            />

            {loading ? (
                <div className="text-center py-20 font-bold text-slate-400 animate-pulse">SINKRONISASI CLOUD...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {agents.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())).map(agent => (
                        <div key={agent.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-black text-slate-800 uppercase text-[12px] mb-1">{agent.name}</h3>
                                    <p className="text-[10px] text-slate-400 font-medium">{agent.phone}</p>
                                </div>
                                <button 
                                    onClick={() => { 
                                        setIsEditing(true); 
                                        setFormData({ ...agent, balance: formatInputWithDots(agent.balance) }); 
                                        setIsModalOpen(true); 
                                    }} 
                                    className="bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-400 p-2.5 rounded-xl transition-all"
                                >
                                    ✎
                                </button>
                            </div>

                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 group-hover:border-blue-100 transition-colors">
                                <p className="text-[9px] text-slate-400 uppercase font-black mb-1">Sisa Saldo</p>
                                <p className="text-xl font-black text-blue-600">{formatRP(agent.balance)}</p>
                            </div>

                            <div className="mt-4 flex justify-between items-center">
                                <a href={`https://wa.me/${agent.phone.replace(/^0/, '62')}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-emerald-600 hover:underline">WhatsApp</a>
                                <button onClick={() => handleDelete(agent.id)} className="text-slate-300 hover:text-red-500 transition-colors text-xs">🗑</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-[3rem] w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-black text-slate-800 uppercase mb-6">
                            {isEditing ? 'Update Saldo' : 'Tambah Agen Baru'}
                        </h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <input type="text" placeholder="Nama Agen" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            <input type="tel" placeholder="Nomor HP" required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">Rp</span>
                                <input 
                                    type="text" required 
                                    className="w-full p-4 pl-12 bg-blue-50 border-2 border-blue-100 rounded-2xl text-2xl font-black text-blue-700 outline-none" 
                                    value={formData.balance} 
                                    onChange={e => setFormData({...formData, balance: formatInputWithDots(e.target.value)})} 
                                />
                            </div>
                            <div className="flex gap-3 pt-6">
                                <button type="submit" className="flex-[2] bg-blue-600 text-white py-4 rounded-2xl font-bold uppercase text-[10px]">Simpan ke Cloud</button>
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold uppercase text-[10px]">Batal</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DaftarAgen;
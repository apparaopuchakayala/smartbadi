import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { 
    ShieldAlert, Search, RefreshCw, Eye, 
    FileText, LogIn, Trash2, Edit, Database 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export function SuperAdminLogs() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLog, setSelectedLog] = useState<any>(null); // For Modal

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Join with profiles to get User Name instead of just ID
            const { data, error } = await supabase
                .from('audit_logs')
                .select(`
                    *,
                    profiles:user_id ( full_name, email, role )
                `)
                .order('created_at', { ascending: false })
                .limit(100); // Fetch latest 100 records

            if (error) throw error;
            setLogs(data || []);
        } catch (err: any) {
            toast.error("Failed to fetch logs");
        } finally {
            setLoading(false);
        }
    };

    // --- Helper: Action Color & Icon ---
    const getActionStyle = (type: string) => {
        const t = type?.toUpperCase();
        if (t.includes('DELETE')) return { color: 'text-red-600 bg-red-50 border-red-200', icon: <Trash2 size={14} /> };
        if (t.includes('UPDATE')) return { color: 'text-orange-600 bg-orange-50 border-orange-200', icon: <Edit size={14} /> };
        if (t.includes('LOGIN')) return { color: 'text-blue-600 bg-blue-50 border-blue-200', icon: <LogIn size={14} /> };
        if (t.includes('EXPORT')) return { color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: <Database size={14} /> };
        return { color: 'text-slate-600 bg-slate-50 border-slate-200', icon: <FileText size={14} /> };
    };

    // Filter Logic
    const filteredLogs = logs.filter(log => 
        log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8 font-poppins bg-[#F8FAFC] min-h-screen">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[30px] border-2 border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
                        <ShieldAlert size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Security <span className="text-blue-700">Audit Logs</span></h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Activity Monitor</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search user, action..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>
                    <button onClick={fetchLogs} className="p-3 bg-white border-2 border-slate-100 rounded-xl hover:bg-slate-50 text-slate-600 transition-all active:scale-95">
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-[30px] border-4 border-white shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="p-6">Timestamp</th>
                                <th className="p-6">User / Role</th>
                                <th className="p-6">Action Type</th>
                                <th className="p-6">Description</th>
                                <th className="p-6">IP Address</th>
                                <th className="p-6 text-center">Data</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredLogs.map((log) => {
                                const style = getActionStyle(log.action_type);
                                return (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="p-6 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900 uppercase">
                                                    {log.profiles?.full_name || 'Unknown User'}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {log.role || log.profiles?.role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${style.color}`}>
                                                {style.icon} {log.action_type}
                                            </span>
                                        </td>
                                        <td className="p-6 text-xs font-bold text-slate-700 max-w-xs truncate">
                                            {log.description}
                                        </td>
                                        <td className="p-6">
                                            <span className="font-mono text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500">
                                                {log.ip_address || '---'}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            <button 
                                                onClick={() => setSelectedLog(log)}
                                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    {!loading && filteredLogs.length === 0 && (
                        <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
                            No Activity Found
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal (JSON Viewer) */}
            <AnimatePresence>
                {selectedLog && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
                            onClick={() => setSelectedLog(null)} className="absolute inset-0 bg-slate-900/60" 
                        />
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="relative bg-white w-full max-w-2xl max-h-[80vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border-4 border-white"
                        >
                            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Raw Data Log</h3>
                                <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-all"><FileText size={20}/></button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Table Affected</label>
                                        <p className="text-sm font-bold text-slate-800 mt-1 font-mono">{selectedLog.table_name || 'N/A'}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Record ID</label>
                                        <p className="text-sm font-bold text-slate-800 mt-1 font-mono truncate">{selectedLog.record_id || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* JSON Data Diff */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-2">Meta Data / Changes</label>
                                    <div className="bg-slate-900 p-5 rounded-2xl overflow-x-auto text-xs font-mono leading-relaxed text-emerald-400 border-4 border-slate-800 shadow-inner">
                                        <pre>
                                            {JSON.stringify(selectedLog.new_values || selectedLog.old_values || {}, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import { Calendar, Plus, Clock, CheckCircle, XCircle, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';

const calculateDays = (start: string, end: string) => {
    if(!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    const timeDiff = e.getTime() - s.getTime();
    const days = timeDiff / (1000 * 3600 * 24) + 1; 
    return days > 0 ? days : 0;
};

export function TeacherLeaveDashboard() {
    const { profile } = useAuth();
    const schoolContext = profile?.school_id;
    const [balances, setBalances] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        leave_type_id: '',
        start_date: '',
        end_date: '',
        reason: ''
    });

    useEffect(() => {
        if (profile?.id) {
            fetchDashboardData();
        }
    }, [profile]);

    const fetchDashboardData = async () => {
        try {
            const { data: balanceData, error: balanceError } = await supabase
                .from('staff_leave_balances')
                .select(`*, leave_types ( name, code, days_allowed )`)
                .eq('staff_id', profile?.id);

            if (balanceError) throw balanceError;
            setBalances(balanceData || []);

            const { data: reqData, error: reqError } = await supabase
                .from('leave_requests')
                .select('*, leave_types(name, code)')
                .eq('staff_id', profile?.id)
                .order('created_at', { ascending: false });

            if (reqError) throw reqError;
            setRequests(reqData || []);

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        const days = calculateDays(formData.start_date, formData.end_date);
        
        if (days <= 0) {
            toast.error("Invalid dates selected");
            return;
        }

        try {
            const { error } = await supabase.from('leave_requests').insert({
                school_id: schoolContext,
                staff_id: profile?.id,
                leave_type_id: formData.leave_type_id,
                start_date: formData.start_date,
                end_date: formData.end_date,
                total_days: days,
                reason: formData.reason,
                status: 'PENDING'
            });

            if (error) throw error;

            toast.success("Leave Application Submitted!");
            setShowModal(false);
            setFormData({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
            fetchDashboardData(); 

        } catch (error: any) {
            toast.error(error.message || "Failed to apply");
        }
    };

    const getStatusBadge = (status: string) => {
        switch(status) {
            case 'APPROVED': return <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider"><CheckCircle size={12}/> Approved</span>;
            case 'REJECTED': return <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider"><XCircle size={12}/> Rejected</span>;
            default: return <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider"><Clock size={12}/> Pending</span>;
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-8 bg-[#F8FAFC] min-h-screen font-poppins">
            
            {/* Page Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter">My Leaves</h1>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Track & Apply
                    </p>
                </div>
                <button 
                    onClick={() => setShowModal(true)}
                    className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
                >
                    <Plus size={16} /> New Request
                </button>
            </div>

            {/* 1. Balances Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {balances.map((item) => {
                    const remaining = item.total_allocated - item.used_leaves;
                    const percent = (remaining / item.total_allocated) * 100;
                    
                    return (
                        <div key={item.id} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <div className={`absolute top-0 left-0 w-1 h-full ${remaining < 2 ? 'bg-red-500' : 'bg-blue-500'}`} />
                            
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">{item.leave_types.code}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.leave_types.name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-slate-900">{remaining}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Available</p>
                                </div>
                            </div>

                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${remaining < 2 ? 'bg-red-500' : 'bg-blue-500'}`} 
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 font-medium text-right">
                                Total Allocated: {item.total_allocated}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* 2. Recent Requests (Responsive: Table on Desktop, Cards on Mobile) */}
            <div className="bg-white rounded-[30px] p-6 md:p-8 border border-slate-100 shadow-sm">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                    <Clock size={20} className="text-slate-400"/> Recent Applications
                </h3>
                
                {/* Desktop Table View (Hidden on Mobile) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-center border-collapse">
                        <thead>
                            <tr className="border-b border-slate-150">
                                <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Type</th>
                                <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Dates</th>
                                <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Duration</th>
                                <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reason</th>
                                <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {requests.map((req) => (
                                <tr key={req.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="py-4 font-bold text-slate-700 text-sm pl-2">{req.leave_types?.name}</td>
                                    <td className="py-4 text-xs font-medium text-slate-500">
                                        {req.start_date} <span className="text-slate-600 mx-1">to</span> {req.end_date}
                                    </td>
                                    {/* --- UPDATED: Singular/Plural Logic --- */}
                                    <td className="py-4 text-center">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                                            {req.total_days} {req.total_days <= 1 ? 'Day' : 'Days'}
                                        </span>
                                    </td>
                                    <td className="py-4 text-xs text-slate-500 max-w-[200px] truncate" title={req.reason}>
                                        {req.reason}
                                    </td>
                                    <td className="py-4 text-center">
                                        {getStatusBadge(req.status)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View (Hidden on Desktop) */}
                <div className="md:hidden space-y-4">
                    {requests.map((req) => (
                        <div key={req.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">{req.leave_types?.name}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                                        {req.start_date} <span className="mx-1 text-slate-300">-</span> {req.end_date}
                                    </p>
                                </div>
                                {getStatusBadge(req.status)}
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-100">
                                <span className="font-bold text-slate-400 text-[10px] uppercase">Reason:</span>
                                <span className="truncate">{req.reason}</span>
                            </div>

                            {/* --- UPDATED: Singular/Plural Logic --- */}
                            <div className="flex justify-end">
                                <span className="bg-white border border-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide">
                                    Duration: {req.total_days} {req.total_days <= 1 ? 'Day' : 'Days'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {requests.length === 0 && (
                    <div className="py-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                            <Clock size={32} />
                        </div>
                        <p className="text-slate-400 text-sm font-medium">No leave requests found.</p>
                    </div>
                )}
            </div>

            {/* Apply Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[30px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Apply Leave</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-red-500 transition-colors"><XCircle size={24}/></button>
                        </div>

                        <form onSubmit={handleApply} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Leave Type</label>
                                <select 
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={formData.leave_type_id}
                                    onChange={e => setFormData({...formData, leave_type_id: e.target.value})}
                                >
                                    <option value="">Select Type</option>
                                    {balances.map(b => (
                                        <option key={b.leave_type_id} value={b.leave_type_id}>
                                            {b.leave_types.name} (Available: {b.total_allocated - b.used_leaves})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">From</label>
                                    <input 
                                        type="date" 
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.start_date}
                                        onChange={e => setFormData({...formData, start_date: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">To</label>
                                    <input 
                                        type="date" 
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.end_date}
                                        onChange={e => setFormData({...formData, end_date: e.target.value})}
                                    />
                                </div>
                            </div>

                            {/* Calculator Preview */}
                            {formData.start_date && formData.end_date && (
                                <div className="bg-blue-50 p-3 rounded-xl flex items-center gap-2 text-blue-700 text-xs font-bold animate-in fade-in">
                                    <Calculator size={14} />
                                    {(() => {
                                        const d = calculateDays(formData.start_date, formData.end_date);
                                        return `Total Duration: ${d} ${d <= 1 ? 'Day' : 'Days'}`;
                                    })()}
                                </div>
                            )}

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Reason</label>
                                <textarea 
                                    required
                                    rows={3}
                                    placeholder="e.g. Attending a family function"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.reason}
                                    onChange={e => setFormData({...formData, reason: e.target.value})}
                                />
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-4 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 mt-2 active:scale-95 transition-all"
                            >
                                Submit Application
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
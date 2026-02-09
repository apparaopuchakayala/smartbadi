import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import { Check, X, Calendar, User, CheckCircle2, XCircle, PieChart, RefreshCcw, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useConfirm } from '../../context/ConfirmDialogContext';

export function LeaveApprovals({ schoolId }: { schoolId: string }) {
    const { profile } = useAuth();
    const schoolContext = schoolId;
    const { confirm } = useConfirm();

    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('PENDING');

    useEffect(() => {
        if (schoolContext) fetchRequests();
    }, [schoolContext, filter]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('leave_requests')
                .select(`
                    *,
                    leave_types ( name, code ),
                    profiles:staff_id ( 
                        full_name, role, employee_id,
                        staff_leave_balances ( leave_type_id, total_allocated, used_leaves, leave_types ( code, name ) )
                    )
                `)
                .eq('school_id', schoolContext)
                .eq('status', filter)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRequests(data || []);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (reqId: string, newStatus: string) => {
        const isConfirmed = await confirm({
            title: `Mark as ${newStatus}?`,
            message: `Are you sure you want to change the status to ${newStatus}? \nThis will automatically adjust the staff member's leave balance.`,
            confirmText: `Yes, ${newStatus}`,
            cancelText: 'Cancel',
            type: newStatus === 'REJECTED' ? 'danger' : newStatus === 'APPROVED' ? 'success' : 'info'
        });

        if (!isConfirmed) return;
        
        const toastId = toast.loading("Updating Status...");
        try {
            const { error } = await supabase.rpc('change_leave_status', {
                request_id: reqId,
                new_status: newStatus,
                admin_id: profile?.id
            });
    
            if (error) throw error;
    
            toast.success(`Status updated to ${newStatus}`, { id: toastId });
            fetchRequests(); 
        } catch (error: any) {
            toast.error(error.message, { id: toastId });
        }
    };

    return (
        <div className="space-y-6 md:space-y-10 text-left min-h-screen font-poppins pb-20 px-2 md:px-0">

            {/* --- HEADER CARD --- */}
            <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200/60 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-1000 group-hover:bg-blue-100/60 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
                            <FileText size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                                Leave Approvals
                            </h1>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                Manage Staff Requests
                            </p>
                        </div>
                    </div>

                    <div className="flex w-full md:w-auto bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60">
                        {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`flex-1 md:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                    filter === status
                                        ? 'bg-white text-slate-900 shadow-md shadow-slate-200 scale-105'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <div className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Loading Requests...</div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {requests.map((req) => {
                        const balanceList = req.profiles?.staff_leave_balances || [];
                        return (
                            <div key={req.id} className="bg-white p-6 rounded-[30px] border border-slate-200/60 shadow-sm hover:shadow-lg transition-all flex flex-col h-full group relative overflow-hidden">
                                
                                {/* Decorative Gradient */}
                                <div className={`absolute top-0 left-0 w-full h-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${req.status === 'APPROVED' ? 'bg-green-500' : req.status === 'REJECTED' ? 'bg-red-500' : 'bg-blue-500'}`}></div>

                                {/* User Info */}
                                <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-50">
                                    <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center font-black shrink-0 border border-slate-100">
                                        <User size={20} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="text-sm font-black text-slate-900 truncate">{req.profiles?.full_name || "Unknown"}</h3>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate mt-0.5">
                                            <span>{req.profiles?.role}</span>
                                            {req.profiles?.employee_id && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    <span>{req.profiles.employee_id}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Leave Body */}
                                <div className="space-y-5 flex-grow">
                                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Type</span>
                                            <span className="text-xs font-black text-slate-700 uppercase">{req.leave_types?.name}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Duration</span>
                                            <span className="text-xs font-black text-slate-900">{req.total_days} Days</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 px-1">
                                        <Calendar size={16} className="text-blue-500 shrink-0" />
                                        <p className="text-xs font-bold text-slate-600">
                                            {new Date(req.start_date).toLocaleDateString()} <span className="text-slate-300 mx-1">→</span> {new Date(req.end_date).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1">
                                            Reason
                                        </p>
                                        <p className="text-xs text-slate-600 font-medium italic">"{req.reason}"</p>
                                    </div>

                                    {/* Balances */}
                                    <div className="mt-2">
                                        <div className="flex items-center gap-1.5 text-slate-400 mb-3 px-1">
                                            <PieChart size={12} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Current Balances</span>
                                        </div>
                                        <div className="space-y-2">
                                            {balanceList.map((bal: any) => {
                                                const total = bal.total_allocated || 0;
                                                const used = bal.used_leaves || 0;
                                                const remaining = total - used;
                                                const progressPercent = total > 0 ? (remaining / total) * 100 : 0;
                                                const isRequested = bal.leave_type_id === req.leave_type_id;

                                                return (
                                                    <div key={bal.leave_type_id} className={`flex flex-col gap-1 ${isRequested ? 'bg-blue-50/50 p-2 rounded-lg border border-blue-100' : 'px-2'}`}>
                                                        <div className="flex justify-between items-center">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isRequested ? 'text-blue-700' : 'text-slate-500'}`}>
                                                                {bal.leave_types?.code}
                                                            </span>
                                                            <span className="text-[9px] font-bold text-slate-400">
                                                                <span className={`text-xs font-black ${isRequested ? 'text-blue-900' : 'text-slate-800'}`}>{remaining}</span>/{total}
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${remaining < 2 ? 'bg-red-400' : isRequested ? 'bg-blue-500' : 'bg-slate-300'}`}
                                                                style={{ width: `${progressPercent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* --- ACTIONS SECTION --- */}
                                <div className="mt-6 pt-4 border-t border-slate-50">
                                    {req.status === 'PENDING' ? (
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => handleStatusChange(req.id, 'REJECTED')} 
                                                className="flex-1 py-3.5 bg-white border border-red-100 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 flex items-center justify-center gap-2 transition-all shadow-sm"
                                            >
                                                <X size={14} strokeWidth={3} /> Reject
                                            </button>
                                            <button 
                                                onClick={() => handleStatusChange(req.id, 'APPROVED')} 
                                                className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-200"
                                            >
                                                <Check size={14} strokeWidth={3} /> Approve
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-3 group/edit">
                                            {req.status === 'APPROVED' ? (
                                                <div className="w-full py-3 bg-green-50 text-green-700 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest border border-green-100">
                                                    <CheckCircle2 size={16} /> Approved
                                                </div>
                                            ) : (
                                                <div className="w-full py-3 bg-red-50 text-red-700 rounded-xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest border border-red-100">
                                                    <XCircle size={16} /> Rejected
                                                </div>
                                            )}

                                            {/* Edit Options - Reveal on Hover */}
                                            <div className="w-full h-0 overflow-hidden group-hover/edit:h-auto group-hover/edit:overflow-visible transition-all duration-300 opacity-0 group-hover/edit:opacity-100">
                                                <div className="pt-2 flex gap-2 w-full animate-in slide-in-from-top-2 fade-in">
                                                    {req.status !== 'APPROVED' && (
                                                        <button
                                                            onClick={() => handleStatusChange(req.id, 'APPROVED')}
                                                            className="flex-1 py-2 bg-slate-100 text-slate-600 text-[9px] font-bold uppercase rounded-lg hover:bg-green-100 hover:text-green-700 transition-colors"
                                                        >
                                                            Approve
                                                        </button>
                                                    )}
                                                    {req.status !== 'REJECTED' && (
                                                        <button
                                                            onClick={() => handleStatusChange(req.id, 'REJECTED')}
                                                            className="flex-1 py-2 bg-slate-100 text-slate-600 text-[9px] font-bold uppercase rounded-lg hover:bg-red-100 hover:text-red-700 transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    )}
                                                    {req.status !== 'PENDING' && (
                                                        <button
                                                            onClick={() => handleStatusChange(req.id, 'PENDING')}
                                                            className="flex-1 py-2 bg-slate-100 text-slate-600 text-[9px] font-bold uppercase rounded-lg hover:bg-orange-100 hover:text-orange-700 transition-colors"
                                                        >
                                                            Pending
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {requests.length === 0 && (
                        <div className="col-span-full bg-slate-50 rounded-[40px] p-16 text-center border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                            <div className="p-4 bg-white rounded-full shadow-sm mb-4 text-slate-300">
                                <FileText size={32} />
                            </div>
                            <h3 className="text-lg font-black text-slate-400 uppercase tracking-tight">No Requests Found</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 opacity-60">There are no {filter.toLowerCase()} leave requests at this time.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
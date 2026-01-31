import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useAuth } from '../../context/AuthProvider';
import { Check, X, Calendar, User, CheckCircle2, XCircle, PieChart, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';
// 1. Import the Custom Hook
import { useConfirm } from '../../context/ConfirmDialogContext';

export function LeaveApprovals({ schoolId }: { schoolId: string }) {
    const { profile } = useAuth();
    const schoolContext = schoolId;
    
    // 2. Initialize the Hook
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
                        full_name, 
                        role,
                        employee_id,
                        staff_leave_balances ( 
                            leave_type_id, 
                            total_allocated, 
                            used_leaves,
                            leave_types ( code, name )  
                        )
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

    // --- UPDATED: Status Change with Custom Confirm Dialog ---
    const handleStatusChange = async (reqId: string, newStatus: string) => {
        
        // 3. Use the custom confirm dialog
        const isConfirmed = await confirm({
            title: `Mark as ${newStatus}?`,
            message: `Are you sure you want to change the status to ${newStatus}? \nThis will automatically adjust the staff member's leave balance.`,
            confirmText: `Yes, ${newStatus}`,
            cancelText: 'Cancel',
            type: newStatus === 'REJECTED' ? 'danger' : newStatus === 'APPROVED' ? 'success' : 'info'
        });

        // If user clicks "Cancel", stop here.
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
            fetchRequests(); // Refresh UI to show new balance
        } catch (error: any) {
            toast.error(error.message, { id: toastId });
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 min-h-screen bg-[#F8FAFC]">

            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tighter">Leave Approvals</h1>
                    <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Manage Staff Requests
                    </p>
                </div>

                <div className="flex w-full md:w-auto bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                    {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === status
                                ? 'bg-slate-900 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <div className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Loading...</div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {requests.map((req) => {
                        const balanceList = req.profiles?.staff_leave_balances || [];
                        return (
                            <div key={req.id} className="bg-white p-5 md:p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col h-full group">

                                {/* User Info */}
                                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-50">
                                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black shrink-0">
                                        <User size={18} />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="text-sm font-black text-slate-800 truncate">{req.profiles?.full_name || "Unknown"}</h3>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                                            <span>{req.profiles?.role}</span>
                                            {req.profiles?.employee_id && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    <span className="text-slate-500">EmpId: {req.profiles.employee_id}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Leave Body */}
                                <div className="space-y-4 flex-grow">
                                    <div className="flex justify-between items-center">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-black uppercase">{req.leave_types?.name}</span>
                                        <span className="text-xs font-black text-slate-900">{req.total_days} Days</span>
                                    </div>

                                    <div className="flex items-start gap-2">
                                        <Calendar size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                        <p className="text-xs font-medium text-slate-600">
                                            {req.start_date} <span className="text-slate-300">to</span> {req.end_date}
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 p-3 rounded-xl">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Reason</p>
                                        <p className="text-xs text-slate-700 font-medium break-words">"{req.reason}"</p>
                                    </div>

                                    {/* All Balances List */}
                                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl mt-2">
                                        <div className="flex items-center gap-1.5 text-slate-400 mb-3">
                                            <PieChart size={12} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">All Balances</span>
                                        </div>

                                        <div className="space-y-3">
                                            {balanceList.map((bal: any) => {
                                                const total = bal.total_allocated || 0;
                                                const used = bal.used_leaves || 0;
                                                const remaining = total - used;
                                                const progressPercent = total > 0 ? (remaining / total) * 100 : 0;
                                                const isRequested = bal.leave_type_id === req.leave_type_id;

                                                return (
                                                    <div key={bal.leave_type_id} className={`flex flex-col gap-1 ${isRequested ? 'bg-blue-50 p-2 rounded-lg -mx-2' : ''}`}>
                                                        <div className="flex justify-between items-center">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isRequested ? 'text-blue-700' : 'text-slate-500'}`}>
                                                                {bal.leave_types ? `${bal.leave_types.name} (${bal.leave_types.code})` : 'Type'}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                                <span className={`text-sm font-black ${isRequested ? 'text-blue-900' : 'text-slate-800'}`}>{remaining}</span> / {total}
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${remaining < 2 ? 'bg-red-500' : isRequested ? 'bg-blue-500' : 'bg-slate-400'}`}
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
                                    
                                    {/* CASE 1: PENDING (Show Approve/Reject) */}
                                    {req.status === 'PENDING' ? (
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => handleStatusChange(req.id, 'REJECTED')} 
                                                className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <X size={14} /> Reject
                                            </button>
                                            <button 
                                                onClick={() => handleStatusChange(req.id, 'APPROVED')} 
                                                className="flex-1 py-3 bg-green-50 text-green-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-100 flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Check size={14} /> Approve
                                            </button>
                                        </div>
                                    ) : (
                                        /* CASE 2: EDIT MODE (Show Status + Edit Buttons on Hover) */
                                        <div className="flex flex-col items-center gap-3 relative">
                                            
                                            {/* Current Status Badge */}
                                            {req.status === 'APPROVED' ? (
                                                <span className="text-green-600 flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                                    <CheckCircle2 size={16} /> Approved
                                                </span>
                                            ) : (
                                                <span className="text-red-600 flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                                    <XCircle size={16} /> Rejected
                                                </span>
                                            )}

                                            {/* Edit Options - Reveal on Hover */}
                                            <div className="w-full h-0 overflow-hidden group-hover:h-auto group-hover:overflow-visible transition-all duration-300">
                                                <div className="pt-3 flex flex-col items-center animate-in slide-in-from-top-2">
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase mb-2 flex items-center gap-1">
                                                        <RefreshCcw size={10}/> Change Status
                                                    </p>
                                                    <div className="flex gap-2 w-full">
                                                        {req.status !== 'APPROVED' && (
                                                            <button
                                                                onClick={() => handleStatusChange(req.id, 'APPROVED')}
                                                                className="flex-1 py-2 bg-green-50 text-green-700 text-[9px] font-black uppercase rounded-lg hover:bg-green-100 border border-green-100 transition-colors"
                                                            >
                                                                Approve
                                                            </button>
                                                        )}
                                                        {req.status !== 'REJECTED' && (
                                                            <button
                                                                onClick={() => handleStatusChange(req.id, 'REJECTED')}
                                                                className="flex-1 py-2 bg-red-50 text-red-700 text-[9px] font-black uppercase rounded-lg hover:bg-red-100 border border-red-100 transition-colors"
                                                            >
                                                                Reject
                                                            </button>
                                                        )}
                                                         {req.status !== 'PENDING' && (
                                                            <button
                                                                onClick={() => handleStatusChange(req.id, 'PENDING')}
                                                                className="flex-1 py-2 bg-orange-50 text-orange-700 text-[9px] font-black uppercase rounded-lg hover:bg-orange-100 border border-orange-100 transition-colors"
                                                            >
                                                                Pending
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {requests.length === 0 && (
                        <div className="col-span-full py-20 text-center text-slate-400 font-medium">No {filter.toLowerCase()} requests.</div>
                    )}
                </div>
            )}
        </div>
    );
}
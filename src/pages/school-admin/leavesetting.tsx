import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Plus, Trash2, Save, Calendar, Info, Briefcase, Settings, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthProvider';

export function LeaveSettings({ schoolId }: any) {
    const { profile } = useAuth();
    const schoolContext = schoolId;

    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form State
    const [newLeave, setNewLeave] = useState({
        name: '',
        code: '',
        days_allowed: '',
        description: ''
    });

    useEffect(() => {
        if (schoolContext) fetchLeaveTypes();
    }, [schoolContext]);

    const fetchLeaveTypes = async () => {
        try {
            const { data, error } = await supabase
                .from('leave_types')
                .select('*')
                .eq('school_id', schoolContext)
                .order('created_at', { ascending: true });
            if (error) throw error;
            setLeaveTypes(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLeave = async () => {
        if (!newLeave.name || !newLeave.days_allowed) {
            toast.error("Please fill required fields");
            return;
        }

        try {
            const { error } = await supabase.from('leave_types').insert({
                school_id: schoolContext,
                name: newLeave.name,
                code: newLeave.code.toUpperCase(),
                days_allowed: parseInt(newLeave.days_allowed),
                description: newLeave.description
            });

            if (error) throw error;

            toast.success("Leave Type Added Successfully!");
            setShowModal(false);
            setNewLeave({ name: '', code: '', days_allowed: '', description: '' });
            fetchLeaveTypes();

        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will delete this leave type for everyone.")) return;

        const { error } = await supabase.from('leave_types').delete().eq('id', id);
        if (!error) {
            toast.success("Deleted");
            fetchLeaveTypes();
        }
    };

    return (
        <div className="space-y-6 md:space-y-10 text-left min-h-screen font-poppins pb-20 px-2 md:px-0  ">

            {/* --- HEADER CARD --- */}
            <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-slate-200/60 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-1000 group-hover:bg-blue-100/60 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 shrink-0">
                            <Settings size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                                Leave Configurations
                            </h1>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                Define Policies & Allowances
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 hover:shadow-2xl hover:-translate-y-1 active:scale-95"
                    >
                        <Plus size={16} strokeWidth={3} /> Add Policy
                    </button>
                </div>
            </div>

            {/* List of Leave Types */}
            {loading ? (
                <div className="text-center py-20 text-slate-400 animate-pulse font-bold uppercase tracking-widest text-xs">Loading Policies...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {leaveTypes.map((leave) => (
                        <div key={leave.id} className="bg-white p-6 rounded-[30px] border border-slate-200/60 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden h-full flex flex-col">
                            {/* Decorative Top Bar */}
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                                    <Briefcase size={22} />
                                </div>
                                <button
                                    onClick={() => handleDelete(leave.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">{leave.name}</h3>
                                <div className="flex items-center gap-2 mt-2 mb-4">
                                    <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider">
                                        Code: {leave.code}
                                    </span>
                                </div>

                                <p className="text-sm text-slate-500 font-medium leading-relaxed min-h-[40px]">
                                    {leave.description || "No description provided."}
                                </p>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center">
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Annual Allowance</p>
                                    <p className="text-2xl font-black text-slate-900 mt-0.5">{leave.days_allowed} <span className="text-xs font-bold text-slate-400">Days</span></p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {leaveTypes.length === 0 && (
                        <div className="col-span-full bg-slate-50 rounded-[40px] p-16 text-center border-2 border-dashed border-slate-200 flex flex-col items-center justify-center">
                            <div className="p-4 bg-white rounded-full shadow-sm mb-4 text-slate-300">
                                <Briefcase size={32} />
                            </div>
                            <h3 className="text-lg font-black text-slate-400 uppercase tracking-tight">No Policies Found</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 opacity-60">Create policies like 'Sick Leave' to get started.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl animate-in fade-in zoom-in duration-200 relative overflow-hidden">
                        
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">New Policy</h2>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Configure Leave Rules</p>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1.5 block">Leave Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Casual Leave"
                                    value={newLeave.name}
                                    onChange={e => setNewLeave({ ...newLeave, name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1.5 block">Short Code</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CL"
                                        value={newLeave.code}
                                        onChange={e => setNewLeave({ ...newLeave, code: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1.5 block">Days / Year</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 12"
                                        value={newLeave.days_allowed}
                                        onChange={e => setNewLeave({ ...newLeave, days_allowed: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1.5 block">Description / Rules</label>
                                <textarea
                                    rows={3}
                                    placeholder="e.g. Can be taken for personal matters..."
                                    value={newLeave.description}
                                    onChange={e => setNewLeave({ ...newLeave, description: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-medium text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateLeave}
                                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 hover:shadow-2xl hover:-translate-y-1 active:scale-95 transition-all"
                                >
                                    Save Policy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
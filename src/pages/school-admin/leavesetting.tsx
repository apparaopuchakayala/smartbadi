import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Plus, Trash2, Save, Calendar, Info, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthProvider'; // Assuming you have this

export function LeaveSettings({schoolId}) {
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

            // Note: In a real app, you might want to auto-assign this new leave 
            // to all existing staff in the 'staff_leave_balances' table here.

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
        <div className="max-w-6xl mx-auto p-6 space-y-8 min-h-screen bg-[#F8FAFC]">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                        Leave Configurations
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Define Leave Policies for Staff
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                    <Plus size={16} /> Add Leave Type
                </button>
            </div>

            {/* List of Leave Types */}
            {loading ? (
                <div className="text-center py-20 text-slate-400">Loading Policies...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {leaveTypes.map((leave) => (
                        <div key={leave.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative">
                            <div className="absolute top-6 right-6">
                                <button
                                    onClick={() => handleDelete(leave.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                                <Briefcase size={24} />
                            </div>

                            <h3 className="text-lg font-black text-slate-800">{leave.name}</h3>
                            <div className="flex items-center gap-2 mt-1 mb-4">
                                <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                                    Code: {leave.code}
                                </span>
                            </div>

                            <p className="text-sm text-slate-500 font-medium line-clamp-2 min-h-[40px]">
                                {leave.description || "No description provided."}
                            </p>

                            <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Allowance</p>
                                    <p className="text-xl font-black text-slate-900">{leave.days_allowed} <span className="text-xs font-bold text-slate-400">Days / Year</span></p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {leaveTypes.length === 0 && (
                        <div className="col-span-full bg-white rounded-3xl p-10 text-center border-2 border-dashed border-slate-200">
                            <Briefcase className="mx-auto text-slate-300 mb-4" size={40} />
                            <h3 className="text-slate-900 font-bold">No Leave Policies Yet</h3>
                            <p className="text-slate-500 text-sm mt-2">Create policies like 'Sick Leave' or 'Casual Leave' to get started.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-[30px] w-full max-w-lg p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">Create New Policy</h2>

                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Leave Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Casual Leave"
                                    value={newLeave.name}
                                    onChange={e => setNewLeave({ ...newLeave, name: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Short Code</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CL"
                                        value={newLeave.code}
                                        onChange={e => setNewLeave({ ...newLeave, code: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Days / Year</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 12"
                                        value={newLeave.days_allowed}
                                        onChange={e => setNewLeave({ ...newLeave, days_allowed: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Description / Rules</label>
                                <textarea
                                    rows={3}
                                    placeholder="e.g. Can be taken for personal matters. Cannot combine with Sick Leave."
                                    value={newLeave.description}
                                    onChange={e => setNewLeave({ ...newLeave, description: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateLeave}
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200"
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
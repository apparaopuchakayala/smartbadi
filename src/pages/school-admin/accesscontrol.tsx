import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { ShieldCheck, Search, Users, GraduationCap, Heart, Lock, Unlock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CardSkeleton, ControlSkeleton } from '../../components/common/skeletoncomp'; // Import your skeletons
import toast from 'react-hot-toast';

export function AccessControl() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<'staff' | 'student' | 'parent'>('staff');

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, employee_id, role, permissions')
                .in('role', ['teacher', 'admin', 'clerk', 'student', 'parent'])
                .order('full_name');
            setUsers(data || []);
        } finally {
            setLoading(false);
        }
    };

    const togglePermission = async (userId: string, currentPerms: any, module: string) => {
        const updatedPerms = { ...currentPerms, [module]: !currentPerms?.[module] };
        const { error } = await supabase.from('profiles').update({ permissions: updatedPerms }).eq('id', userId);

        if (!error) {
            setUsers(users.map(u => u.id === userId ? { ...u, permissions: updatedPerms } : u));
            toast.success(`${module.toUpperCase()} Access Updated`);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesTab = activeTab === 'staff'
            ? ['teacher', 'admin', 'clerk'].includes(u.role)
            : u.role === activeTab;
        const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div className="space-y-6 md:space-y-10 text-left min-h-screen font-poppins pb-20 px-2 md:px-0">

            {/* --- HEADER & SEARCH --- */}
            {loading ? (
                <ControlSkeleton />
            ) : (
                <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[40px] shadow-md border-2 border-blue-100">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-2xl border-4 border-white shrink-0">
                            <ShieldCheck size={36} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">
                                Access <span className="text-blue-700">Hub</span>
                            </h1>
                            <p className="text-[12px] font-black text-slate-500 uppercase tracking-[2px] mt-2">Security & Permissions Center</p>
                        </div>
                    </div>

                    <div className="relative w-full lg:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            className="w-full pl-12 pr-4 py-4 bg-slate-100 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* --- TAB NAVIGATION --- */}
            <div className="flex bg-slate-200 p-2 rounded-[25px] w-fit gap-3 shadow-inner">
                <TabButton active={activeTab === 'staff'} icon={<Users size={18} />} label="Staff" onClick={() => setActiveTab('staff')} />
                <TabButton active={activeTab === 'student'} icon={<GraduationCap size={18} />} label="Students" onClick={() => setActiveTab('student')} />
                <TabButton active={activeTab === 'parent'} icon={<Heart size={18} />} label="Parents" onClick={() => setActiveTab('parent')} />
            </div>

            {/* --- CARDS GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {loading ? (
                    // --- SHOW 6 SKELETON CARDS WHILE LOADING ---
                    [...Array(6)].map((_, i) => <CardSkeleton key={i} />)
                ) : (
                    <AnimatePresence mode="popLayout">
                        {filteredUsers.map((user) => (
                            <motion.div
                                layout
                                key={user.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="p-1 rounded-[38px] bg-gradient-to-b from-blue-100 to-transparent"
                            >
                                <div className="bg-white p-6 rounded-[36px] shadow-lg border-2 border-white min-h-[320px] flex flex-col hover:border-blue-400 transition-colors">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 bg-blue-700 text-white rounded-2xl flex items-center justify-center text-xl font-black shadow-lg border-2 border-white shrink-0">
                                            {user.full_name?.[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-md font-black text-slate-900 uppercase tracking-tight truncate">{user.full_name}</h3>
                                            <p className="text-[10px] font-black text-blue-600 uppercase mt-1 px-2 py-0.5 bg-blue-50 rounded border border-blue-100 inline-block">
                                                {user.role} • {user.employee_id || 'ID Pending'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-slate-50 p-5 rounded-3xl border border-slate-100">
                                        {activeTab === 'staff' ? (
                                            <>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
                                                    <Lock size={12} /> Control Panel
                                                </p>
                                                <div className="space-y-3">
                                                    <PermissionSwitch label="Attendance" active={user.permissions?.attendance} onClick={() => togglePermission(user.id, user.permissions, 'attendance')} />
                                                    <PermissionSwitch label="Marks Entry" active={user.permissions?.marks} onClick={() => togglePermission(user.id, user.permissions, 'marks')} />
                                                    <PermissionSwitch label="Student List" active={user.permissions?.studentlist} onClick={() => togglePermission(user.id, user.permissions, 'studentlist')} />
                                                    <PermissionSwitch label="Assignments" active={user.permissions?.assignments} onClick={() => togglePermission(user.id, user.permissions, 'assignments')} />
                                                    <PermissionSwitch label="Leave Management" active={user.permissions?.leave} onClick={() => togglePermission(user.id, user.permissions, 'leave')} />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                                                <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
                                                    <CheckCircle2 size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">System Managed Access</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 max-w-[180px]">
                                                        Access for {activeTab}s is restricted to personal dashboards only.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---

function TabButton({ active, icon, label, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 px-8 py-3.5 rounded-[20px] transition-all font-black text-[11px] uppercase tracking-widest border-2 ${active ? 'bg-blue-700 text-white border-blue-800 shadow-xl scale-105' : 'bg-white text-slate-500 border-transparent hover:bg-slate-50'
                }`}
        >
            {icon} {label}
        </button>
    );
}

function PermissionSwitch({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
    return (
        <div
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2 ${active ? 'bg-white border-blue-600 shadow-md' : 'bg-slate-100 border-slate-200 opacity-80 hover:bg-white'
                }`}
        >
            <div className="flex items-center gap-3">
                {active ? <Unlock size={16} className="text-blue-600" /> : <Lock size={16} className="text-slate-400" />}
                <span className={`text-[11px] font-black uppercase tracking-tight ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                    {label}
                </span>
            </div>

            <div className={`relative w-14 h-7 rounded-full transition-all flex items-center px-1 shrink-0 ${active ? 'bg-blue-600' : 'bg-slate-400'}`}>
                <motion.div
                    animate={{ x: active ? 28 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-5 h-5 bg-white rounded-full shadow-lg border border-slate-200 z-10"
                />
                <span className={`absolute text-[8px] font-black uppercase ${active ? 'left-2 text-white' : 'right-2 text-white'}`}>
                    {active ? 'ON' : 'OFF'}
                </span>
            </div>
        </div>
    );
}
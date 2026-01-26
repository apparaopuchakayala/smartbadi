import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { ShieldCheck, UserCog, Lock, Eye, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export function AccessControl() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        // Roles based profiles fetch
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, employee_id, role, permissions')
            .in('role', ['teacher', 'admin', 'clerk'])
            .order('role');
        setUsers(data || []);
        setLoading(false);
    };

    const togglePermission = async (userId: string, currentPerms: any, module: string) => {
        const updatedPerms = { ...currentPerms, [module]: !currentPerms?.[module] };
        
        const { error } = await supabase
            .from('profiles')
            .update({ permissions: updatedPerms })
            .eq('id', userId);

        if (!error) {
            toast.success("Permissions Synchronized");
            fetchUsers();
        }
    };

    return (
        <div className="space-y-8 p-6 text-left bg-[#F8FAFC] min-h-screen font-poppins">
            {/* Header Section */}
            <header className="bg-white p-10 rounded-[50px] shadow-sm border border-white flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
                        Access <span className="text-blue-600">Command Center</span>
                    </h1>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[3px] mt-2">
                        Define Role-Based Module Visibility
                    </p>
                </div>
                <div className="p-5 bg-slate-900 text-white rounded-[35px] shadow-2xl">
                    <ShieldCheck size={32} />
                </div>
            </header>

            {/* User Access Table */}
            <div className="bg-white rounded-[45px] shadow-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-[10px] font-black uppercase text-slate-400">
                            <th className="px-10 py-8">Staff Identity</th>
                            <th className="px-6 py-8">Module Permissions</th>
                            <th className="px-10 py-8 text-center">System Access</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50/50 transition-all">
                                <td className="px-10 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black">
                                            {user.full_name[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800 uppercase">{user.full_name}</p>
                                            <p className="text-[10px] font-bold text-slate-400">{user.employee_id} • {user.role}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-6">
                                    <div className="flex gap-3">
                                        <PermissionToggle 
                                            label="Attendance" 
                                            active={user.permissions?.attendance} 
                                            onClick={() => togglePermission(user.id, user.permissions, 'attendance')}
                                        />
                                        <PermissionToggle 
                                            label="Marks Entry" 
                                            active={user.permissions?.marks} 
                                            onClick={() => togglePermission(user.id, user.permissions, 'marks')}
                                        />
                                        <PermissionToggle 
                                            label="Staff Planning" 
                                            active={user.permissions?.planning} 
                                            onClick={() => togglePermission(user.id, user.permissions, 'planning')}
                                        />
                                    </div>
                                </td>
                                <td className="px-10 py-6 text-center">
                                    <button className="p-4 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-900 hover:text-white transition-all">
                                        <UserCog size={20} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Internal Toggle Component
function PermissionToggle({ label, active, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${
                active 
                ? 'bg-green-50 text-green-600 border-green-100 shadow-sm' 
                : 'bg-slate-50 text-slate-400 border-slate-100'
            }`}
        >
            {active ? <CheckCircle2 size={12} /> : <Lock size={12} />}
            {label}
        </button>
    );
}
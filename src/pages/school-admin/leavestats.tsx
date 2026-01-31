import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { Clock, CheckCircle2, XCircle, CalendarDays, User, ArrowRight } from 'lucide-react';

interface LeaveStatsProps {
    schoolId: string;
    onNavigate: (page: string) => void;
}

export function LeaveStats({ schoolId, onNavigate }: LeaveStatsProps) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        pending: 0,
        approved: 0,
        rejected: 0,
        todayLeaves: 0
    });
    const [absentToday, setAbsentToday] = useState<any[]>([]);

    useEffect(() => {
        if (schoolId) fetchStats();
    }, [schoolId]);

    const fetchStats = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];

            const { data: allRequests, error } = await supabase
                .from('leave_requests')
                .select(`*, profiles:staff_id ( full_name, role )`)
                .eq('school_id', schoolId);

            if (error) throw error;

            let pending = 0;
            let approved = 0;
            let rejected = 0;
            let todayCount = 0;
            let todayList: any[] = [];

            allRequests?.forEach(req => {
                if (req.status === 'PENDING') pending++;
                if (req.status === 'APPROVED') approved++;
                if (req.status === 'REJECTED') rejected++;

                if (req.status === 'APPROVED' && req.start_date <= today && req.end_date >= today) {
                    todayCount++;
                    todayList.push(req);
                }
            });

            setStats({ pending, approved, rejected, todayLeaves: todayCount });
            setAbsentToday(todayList);

        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="animate-pulse h-32 bg-slate-100 rounded-2xl w-full"></div>;

    return (
        <div className="space-y-6">
            
            {/* 1. TOP CARDS ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Pending Card (Actionable) */}
                <div 
                    // 2. Call the function passed from parent with the ID of Leave Approvals page
                    onClick={() => onNavigate('leave-approvals')} 
                    className="bg-white p-5 rounded-[24px] border border-orange-100 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={60} className="text-orange-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Pending</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.pending}</h3>
                        <p className="text-[10px] text-slate-400 mt-2 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Review Now <ArrowRight size={10}/>
                        </p>
                    </div>
                </div>

                {/* Today's Absent Card */}
                <div className="bg-white p-5 rounded-[24px] border border-blue-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <CalendarDays size={60} className="text-blue-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Absent Today</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.todayLeaves}</h3>
                        <p className="text-[10px] text-slate-400 mt-2 font-bold">Staff Members</p>
                    </div>
                </div>

                {/* Approved Card */}
                <div className="bg-white p-5 rounded-[24px] border border-green-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <CheckCircle2 size={60} className="text-green-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">Approved</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.approved}</h3>
                        <p className="text-[10px] text-slate-400 mt-2 font-bold">Total History</p>
                    </div>
                </div>

                {/* Rejected Card */}
                <div className="bg-white p-5 rounded-[24px] border border-red-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <XCircle size={60} className="text-red-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">Rejected</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.rejected}</h3>
                        <p className="text-[10px] text-slate-400 mt-2 font-bold">Total History</p>
                    </div>
                </div>
            </div>

            {/* 2. WHO IS ABSENT TODAY LIST */}
            {stats.todayLeaves > 0 && (
                <div className="bg-slate-900 rounded-[24px] p-6 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                            <CalendarDays className="text-blue-400" size={20}/> On Leave Today
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {absentToday.map((req) => (
                                <div key={req.id} className="bg-white/10 backdrop-blur-md p-3 rounded-xl flex items-center gap-3 border border-white/5">
                                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center font-black text-xs">
                                        <User size={14} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white">{req.profiles?.full_name}</p>
                                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">{req.profiles?.role}</p>
                                    </div>
                                    <span className="ml-auto text-[9px] bg-white/20 px-2 py-1 rounded-md font-bold">
                                        Until {req.end_date}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full filter blur-[80px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
                </div>
            )}
        </div>
    );
}
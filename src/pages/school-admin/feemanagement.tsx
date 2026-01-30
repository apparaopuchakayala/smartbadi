import React, { useState, useEffect } from 'react';
import { 
  Receipt, Settings, Plus, IndianRupee, 
  Search, Save, FileText, ToggleRight, ToggleLeft, 
  ArrowRight, CheckCircle2, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';

type TabType = 'config' | 'entry' | 'ledger';

export function FeeManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('ledger');
  const [reminderActive, setReminderActive] = useState(true);

  return (
    <div className="space-y-8 font-poppins text-left pb-20">
      {/* --- HEADER & NAVIGATION --- */}
      <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
            <IndianRupee size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Finance Portal</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SmartBadi Fee Management System</p>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
          {[
            { id: 'config', label: 'Setup', icon: Settings },
            { id: 'entry', label: 'Fee Entry', icon: Plus },
            { id: 'ledger', label: 'Ledger', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'config' && <FeeConfigurationView />}
          {activeTab === 'entry' && <FeeEntryView />}
          {activeTab === 'ledger' && <FeeLedgerView reminderActive={reminderActive} setReminderActive={setReminderActive} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// --- TAB 1: FEE CONFIGURATION (ADMIN SETUP) ---
function FeeConfigurationView() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-l-4 border-blue-600 pl-4">Create Fee Types</h3>
        <div className="space-y-4">
           <input placeholder="Ex: Tuition Fee, Bus Fee..." className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-600 transition-all font-bold text-sm" />
           <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all">Register Fee Category</button>
        </div>
      </div>
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest border-l-4 border-blue-600 pl-4 mb-6">Class-wise Pricing</h3>
        {/* Table for class fees */}
        <p className="text-slate-400 text-[11px] font-bold">Assign amounts to specific classes for the 2025-26 session.</p>
      </div>
    </div>
  );
}

// --- TAB 2: FEE ENTRY (ACCOUNTANT RECORDING) ---
function FeeEntryView() {
  return (
    <div className="max-w-3xl mx-auto bg-white p-10 rounded-[50px] shadow-xl border border-slate-100 space-y-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-10 opacity-5 text-slate-900 rotate-12"><CreditCard size={120} /></div>
      <div className="space-y-2">
        <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Collect Payment</h3>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Update student ledger in real-time</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
           <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Select Student</label>
           <select className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none"><option>Search Student...</option></select>
        </div>
        <div className="space-y-2">
           <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Amount Paid</label>
           <input type="number" placeholder="₹ 0.00" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl text-blue-600 outline-none" />
        </div>
      </div>

      <button className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black uppercase tracking-[3px] text-xs shadow-2xl shadow-blue-200 hover:bg-slate-900 transition-all active:scale-95 flex items-center justify-center gap-3">
        <Save size={18} /> Confirm & Save Transaction
      </button>
    </div>
  );
}

// --- TAB 3: LEDGER & RECEIPT GENERATOR ---
function FeeLedgerView({ reminderActive, setReminderActive }: any) {
  return (
    <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-50">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none" placeholder="Search by student or class..." />
        </div>
        <div className="flex items-center gap-4 bg-slate-900 px-6 py-3 rounded-2xl text-white">
           <span className="text-[9px] font-black uppercase tracking-widest">{reminderActive ? 'Auto-Reminders ON' : 'Reminders Muted'}</span>
           <button onClick={() => setReminderActive(!reminderActive)}>{reminderActive ? <ToggleRight className="text-blue-400" /> : <ToggleLeft />}</button>
        </div>
      </div>
      <table className="w-full text-left">
        <thead className="bg-slate-50/50 uppercase text-[10px] font-black text-slate-400 tracking-widest">
          <tr>
            <th className="px-8 py-5">Student</th>
            <th className="px-8 py-5">Total</th>
            <th className="px-8 py-5">Paid</th>
            <th className="px-8 py-5">Balance</th>
            <th className="px-8 py-5 text-right">Receipt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
           <tr className="hover:bg-slate-50/50 transition-all group">
             <td className="px-8 py-5">
                <p className="text-sm font-black text-slate-800 uppercase tracking-tighter">Aditya Varma</p>
                <p className="text-[10px] font-bold text-slate-400">Class 10A</p>
             </td>
             <td className="px-8 py-5 font-bold text-slate-600">₹35,000</td>
             <td className="px-8 py-5 font-black text-emerald-600">₹20,000</td>
             <td className="px-8 py-5 font-black text-rose-500">₹15,000</td>
             <td className="px-8 py-5 text-right">
                <button className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Receipt size={18} /></button>
             </td>
           </tr>
        </tbody>
      </table>
    </div>
  );
}
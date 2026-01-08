import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import {
  Plus, Building2, MapPin, Trash2, Edit2,
  Loader2, Calendar, AlertTriangle, CheckCircle2, X, Save, Clock, CreditCard, Power, Play, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export function ManageSchools() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSchool, setNewSchool] = useState({ name: '', location: '', subscription: '30' });

  // Modal & Animation States
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmStep, setConfirmStep] = useState(1);
  const [selectedSchool, setSelectedSchool] = useState<any>(null);
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showToggleModal, setShowToggleModal] = useState(false);

  // Form & Edit States
  const [editData, setEditData] = useState({ id: '', name: '', location: '', valid_until: '' });
  const [isSaving, setIsSaving] = useState(false);

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('*').order('created_at', { ascending: false });
    if (data) setSchools(data);
    setLoading(false);
  };

  useEffect(() => { fetchSchools(); }, []);

  const calculateExpiry = (days: string) => {
    const date = new Date();
    date.setDate(date.getDate() + parseInt(days));
    return date.toISOString();
  };

  const initiateToggle = (school: any) => {
    setSelectedSchool(school);
    setShowToggleModal(true);
  };

  const processToggle = async () => {
    setIsSaving(true);
    const newStatus = !selectedSchool.is_active;
    const { error } = await supabase
      .from('schools')
      .update({ is_active: newStatus })
      .eq('id', selectedSchool.id);

    if (error) {
      toast.error("Update failed");
    } else {
      toast.success(`Services ${newStatus ? 'Started' : 'Stopped'}`);
      fetchSchools();
      setShowToggleModal(false);
    }
    setIsSaving(false);
  };

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(newSchool.subscription));

    const { error } = await supabase.from('schools').insert([
      { name: newSchool.name, location: newSchool.location, valid_until: expiryDate.toISOString(), is_active: true }
    ]);

    if (error) toast.error("Error onboarding");
    else {
      setShowAddSuccess(true);
      setTimeout(() => setShowAddSuccess(false), 1000);
      setNewSchool({ name: '', location: '', subscription: '30' });
      fetchSchools();
    }
  };

  const openEditModal = (school: any) => {
    setEditData({ id: school.id, name: school.name, location: school.location || '', valid_until: school.valid_until });
    setIsEditModalOpen(true);
  };

  const handleUpdateSchool = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('schools').update({
      name: editData.name,
      location: editData.location,
      valid_until: editData.valid_until
    }).eq('id', editData.id);
    if (!error) { toast.success("Updated!"); setIsEditModalOpen(false); fetchSchools(); }
    setIsSaving(false);
  };

  const handleBulkExtension = async (days: string) => {
    setIsSaving(true);
    try {
      const { data: allSchools } = await supabase.from('schools').select('id, valid_until');
      const updatePromises = allSchools?.map(school => {
        const currentExpiry = new Date(school.valid_until > new Date().toISOString() ? school.valid_until : new Date());
        currentExpiry.setDate(currentExpiry.getDate() + parseInt(days));
        return supabase.from('schools').update({ valid_until: currentExpiry.toISOString() }).eq('id', school.id);
      });
      if (updatePromises) await Promise.all(updatePromises);
      toast.success("Bulk update done!");
      setShowExtendModal(false);
      fetchSchools();
    } finally { setIsSaving(false); }
  };

  const initiateDelete = (school: any) => {
    setSelectedSchool(school);
    setConfirmStep(1);
    setShowConfirm(true);
  };

  const processDelete = async () => {
    const { error } = await supabase.from('schools').delete().eq('id', selectedSchool.id);
    if (!error) { toast.success("Deleted"); fetchSchools(); setShowConfirm(false); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-10 max-w-7xl mx-auto text-left bg-[#f8fafc] min-h-screen">

      {/* 1. SUCCESS POPUP */}
      <AnimatePresence>
        {showAddSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center p-4 pointer-events-none">
            <motion.div initial={{ scale: 0.5, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 1.2, opacity: 0 }} className="bg-white p-8 rounded-[32px] shadow-2xl flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                <ShieldCheck size={40} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Institution Onboarded</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALS (Toggle, Edit, Bulk, Delete - logic remains same) */}
      {/* ... [Modals sections are same as previous code, keeping it clean] ... */}

      {/* 2. TOGGLE SERVICE MODAL */}
      <AnimatePresence>
        {showToggleModal && (
          <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowToggleModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="relative bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${selectedSchool?.is_active ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {selectedSchool?.is_active ? <Power size={32} /> : <Play size={32} fill="currentColor" />}
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2 uppercase">
                {selectedSchool?.is_active ? 'Suspend Services?' : 'Resume Services?'}
              </h2>
              <p className="text-slate-500 mb-8 font-medium">Are you sure you want to change the operational status for {selectedSchool?.name}?</p>
              <div className="flex gap-4">
                <button onClick={() => setShowToggleModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold uppercase">Cancel</button>
                <button onClick={processToggle} className={`flex-1 py-4 text-white rounded-2xl font-bold uppercase shadow-lg ${selectedSchool?.is_active ? 'bg-red-600' : 'bg-green-600'}`}>
                  {isSaving ? 'Wait...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. BULK EXTENSION MODAL */}
      <AnimatePresence>
        {showExtendModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowExtendModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative bg-white w-full max-w-md rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-2xl border border-blue-50 text-gray-800">
              <button onClick={() => setShowExtendModal(false)} className="absolute top-4 right-4 md:top-6 md:right-6 p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={24} /></button>
              <div className="p-3 md:p-4 bg-blue-50 text-blue-600 w-fit rounded-2xl mb-6"><CreditCard size={32} /></div>
              <h2 className="text-xl md:text-2xl font-black mb-2 uppercase tracking-tighter">Bulk Extension</h2>
              <p className="text-sm md:text-base text-gray-500 font-medium mb-8 uppercase tracking-tighter">Select a plan to extend subscription for <span className="text-blue-600 font-bold">ALL institutions</span>.</p>
              <select id="bulk-plan" className="w-full p-4 md:p-5 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:border-blue-400 font-bold text-gray-700 mb-6 md:mb-8 appearance-none cursor-pointer font-black tracking-tighter uppercase">
                <option value="15">Add 15 Days</option>
                <option value="30">Add 1 Month</option>
                <option value="60">Add 2 Months</option>
                <option value="90">Add 3 Months</option>
                <option value="120">Add 4 Months</option>
                <option value="150">Add 5 Months</option>
                <option value="180">Add 6 Months</option>
                <option value="210">Add 7 Months</option>
                <option value="240">Add 8 Months</option>
                <option value="270">Add 9 Months</option>
                <option value="300">Add 10 Months</option>
                <option value="330">Add 11 Months</option>
                <option value="365">Add 1 Year</option>
              </select>
              <div className="flex gap-3 uppercase tracking-tighter font-black">
                <button onClick={() => handleBulkExtension((document.getElementById('bulk-plan') as HTMLSelectElement).value)} disabled={isSaving} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 disabled:opacity-50">
                  {isSaving ? <Loader2 className="animate-spin mx-auto" /> : 'Apply to All'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-white w-full max-w-lg rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-2xl border border-gray-100 text-gray-800">
              <h2 className="text-xl md:text-2xl font-black mb-6 md:mb-8 flex items-center gap-3"><Edit2 className="text-blue-600" /> Edit Details</h2>
              <div className="space-y-4 md:space-y-5 font-black tracking-tighter uppercase text-sm md:text-base">
                <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none focus:border-blue-400 font-bold" value={editData.name} onChange={e => setEditData({ ...editData, name: e.target.value })} placeholder="School Name" />
                <input className="w-full p-4 bg-gray-50 rounded-2xl border outline-none focus:border-blue-400 font-bold" value={editData.location} onChange={e => setEditData({ ...editData, location: e.target.value })} placeholder="Location" />
                <div className="pt-2">
                  <label className="block text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2 ml-1">Extend Validity From Today</label>
                  <select className="w-full p-4 bg-blue-50/50 rounded-2xl border border-blue-100 outline-none font-bold text-blue-700" onChange={(e) => {
                    if (e.target.value) {
                      const newExpiry = new Date();
                      newExpiry.setDate(newExpiry.getDate() + parseInt(e.target.value));
                      setEditData({ ...editData, valid_until: newExpiry.toISOString() });
                    }
                  }}>
                    <option value="">Keep Current Expiry</option>
                    <option value="15">Add 15 Days</option>
                    <option value="30">Add 1 Month</option>
                    <option value="60">Add 2 Months</option>
                    <option value="90">Add 3 Months</option>
                    <option value="120">Add 4 Months</option>
                    <option value="150">Add 5 Months</option>
                    <option value="180">Add 6 Months</option>
                    <option value="210">Add 7 Months</option>
                    <option value="240">Add 8 Months</option>
                    <option value="270">Add 9 Months</option>
                    <option value="300">Add 10 Months</option>
                    <option value="330">Add 11 Months</option>
                    <option value="365">Add 1 Year</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-8 md:mt-10">
                <button onClick={handleUpdateSchool} disabled={isSaving} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase shadow-lg shadow-blue-100 text-sm">Save Changes</button>
                <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold uppercase tracking-tighter text-sm">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE MODAL (CUSTOM STYLE) */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowConfirm(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-white w-full max-w-md rounded-[32px] md:rounded-[40px] p-8 md:p-10 shadow-2xl border border-gray-100 text-gray-800 text-center font-black tracking-tighter uppercase">
              <div className={`p-3 md:p-4 rounded-2xl w-fit mb-4 md:mb-6 mx-auto ${confirmStep === 1 ? 'bg-orange-50 text-orange-500' : 'bg-red-50 text-red-500'}`}><AlertTriangle size={32} /></div>
              <h2 className="text-xl md:text-2xl font-black mb-2 leading-none tracking-tighter">{confirmStep === 1 ? 'Delete School?' : 'Final Warning!'}</h2>
              <p className="text-sm md:text-base text-gray-500 font-bold mb-6 md:mb-8 leading-relaxed tracking-tighter">{confirmStep === 1 ? `Confirm deletion of ${selectedSchool?.name}` : `This action is final.`}</p>
              <div className="flex flex-col gap-3 text-sm md:text-base">
                {confirmStep === 1 ? <button onClick={() => setConfirmStep(2)} className="w-full py-4 bg-orange-500 text-white rounded-2xl shadow-lg">Yes, Proceed</button> : <button onClick={processDelete} className="w-full py-4 bg-red-600 text-white rounded-2xl shadow-lg">Permanently Delete</button>}
                <button onClick={() => setShowConfirm(false)} className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight uppercase">Institutions</h1>
          <p className="text-slate-500 font-medium">Manage and monitor all onboarded schools</p>
        </div>
        <button onClick={() => setShowExtendModal(true)} className="flex items-center gap-2 bg-white text-blue-600 px-6 py-4 rounded-2xl font-bold shadow-sm border border-slate-200 hover:bg-slate-50 transition-all uppercase tracking-wide">
          <CreditCard size={20} /> Bulk Extension
        </button>
      </div>

      {/* FORM SECTION - PREMIUM COMPACT LOOK */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-100">
        <h2 className="text-lg font-bold text-slate-800 mb-6 uppercase flex items-center gap-2">
          <Plus size={20} className="text-blue-600" /> Onboard New Institution
        </h2>
        <form onSubmit={handleAddSchool} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 uppercase font-bold">
          <input placeholder="School Name" className="p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-2 ring-blue-500/20 transition-all" value={newSchool.name} onChange={e => setNewSchool({ ...newSchool, name: e.target.value })} required />
          <input placeholder="Location" className="p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none focus:ring-2 ring-blue-500/20 transition-all" value={newSchool.location} onChange={e => setNewSchool({ ...newSchool, location: e.target.value })} required />
          <select className="p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none cursor-pointer" value={newSchool.subscription} onChange={e => setNewSchool({ ...newSchool, subscription: e.target.value })} required>
            <option value="15">Add 15 Days</option>
            <option value="30">Add 1 Month</option>
            <option value="60">Add 2 Months</option>
            <option value="90">Add 3 Months</option>
            <option value="120">Add 4 Months</option>
            <option value="150">Add 5 Months</option>
            <option value="180">Add 6 Months</option>
            <option value="210">Add 7 Months</option>
            <option value="240">Add 8 Months</option>
            <option value="270">Add 9 Months</option>
            <option value="300">Add 10 Months</option>
            <option value="330">Add 11 Months</option>
            <option value="365">Add 1 Year</option>
          </select>
          <button type="submit" className="bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">Create Institution</button>
        </form>
      </div>

      {/* NEW PREMIUM SCHOOL CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={40} /></div> : (
          schools.map(school => {
            const isExpired = new Date(school.valid_until) < new Date();
            const isStopped = school.is_active === false;

            return (
              <motion.div
                key={school.id}
                whileHover={{}}
                className={`group relative bg-white rounded-[32px] border transition-all duration-300 shadow-sm hover:shadow-xl overflow-hidden
                  ${isStopped ? 'border-red-400 bg-red-50/10' : 'border-slate-100 hover:border-blue-200'}`}
              >
                {/* TOP DECORATIVE LINE */}
                <div className={`h-1.5 w-full ${isStopped ? 'bg-red-500' : isExpired ? 'bg-orange-500' : 'bg-blue-500'}`} />

                <div className="p-6 md:p-8">
                  {/* CARD HEADER */}
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors
                      ${isStopped ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      <Building2 size={28} />
                    </div>

                    <div className="flex flex-col items-end">
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider
                        ${isStopped ? 'bg-red-600 text-white' : isExpired ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                        {isStopped ? 'Suspended' : isExpired ? 'Expired' : 'Active'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">ID: {school.id.slice(0, 8)}</span>
                    </div>
                  </div>

                  {/* SCHOOL INFO */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-slate-800 mb-1 uppercase truncate">{school.name}</h3>
                    <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs uppercase">
                      <MapPin size={14} className="text-slate-400" /> {school.location}
                    </div>
                  </div>

                  {/* VALIDITY BOX */}
                  <div className={`flex items-center justify-between p-4 rounded-2xl border border-dashed mb-8
                    ${isStopped ? 'border-red-200 bg-red-50/30' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">Valid Until</span>
                    </div>
                    <span className={`text-xs font-bold uppercase ${isExpired ? 'text-red-600' : 'text-slate-800'}`}>
                      {new Date(school.valid_until).toLocaleDateString('en-GB')}
                    </span>
                  </div>

                  {/* ACTION BAR - CLEANER LOOK */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => initiateToggle(school)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-xs uppercase transition-all
                        ${isStopped ? 'bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200' : 'bg-slate-900 text-white hover:bg-red-600 shadow-md shadow-slate-200'}`}>
                      {isStopped ? <Play size={16} fill="currentColor" /> : <Power size={16} />}
                      {isStopped ? 'Resume' : 'Stop'}
                    </button>

                    <button
                      onClick={() => openEditModal(school)}
                      className="p-3.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                      <Edit2 size={16} />
                    </button>

                    <button
                      onClick={() => initiateDelete(school)}
                      className="p-3.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
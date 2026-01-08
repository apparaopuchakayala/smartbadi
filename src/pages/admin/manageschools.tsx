import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';
import { 
  Plus, Building, MapPin, Trash2, Edit2, 
  Loader2, Calendar, AlertTriangle, CheckCircle2, X, Save, Clock, CreditCard, Power, Play
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
  
  // NEW: Toggle Service Modal State
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

  // --- TOGGLE SERVICE LOGIC (CUSTOM MODAL) ---
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
      toast.error("Status update failed");
    } else {
      toast.success(`Services ${newStatus ? 'Started' : 'Stopped'} for ${selectedSchool.name}`);
      fetchSchools();
      setShowToggleModal(false);
    }
    setIsSaving(false);
  };

  // --- ADD SCHOOL LOGIC ---
  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(newSchool.subscription));
    
    const { error } = await supabase.from('schools').insert([
      { name: newSchool.name, location: newSchool.location, valid_until: expiryDate.toISOString(), is_active: true }
    ]);
    
    if (error) toast.error("Error onboarding institution");
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
    const { error } = await supabase.from('schools').update({ name: editData.name, location: editData.location, valid_until: editData.valid_until }).eq('id', editData.id);
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
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto text-left relative">
      
      {/* 1. TOGGLE SERVICE CUSTOM MODAL (YES/NO) */}
      <AnimatePresence>
        {showToggleModal && (
          <div className="fixed inset-0 z-[170] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowToggleModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="relative bg-white w-full max-w-md rounded-[32px] md:rounded-[40px] p-8 md:p-10 shadow-2xl border border-gray-100 text-gray-800 text-center">
              
              <div className={`p-4 rounded-2xl w-fit mb-6 mx-auto ${selectedSchool?.is_active ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                {selectedSchool?.is_active ? <Power size={32} /> : <Play size={32} fill="currentColor" />}
              </div>

              <h2 className="text-xl md:text-2xl font-black mb-2 tracking-tighter uppercase">
                {selectedSchool?.is_active ? 'Stop All Services?' : 'Resume Services?'}
              </h2>
              
              <p className="text-sm md:text-base text-gray-500 font-bold mb-8 leading-relaxed uppercase tracking-tighter">
                {selectedSchool?.is_active 
                  ? `This will prevent all staff, students, and parents of ${selectedSchool?.name} from accessing the platform.`
                  : `This will restore full access to all users of ${selectedSchool?.name}.`}
              </p>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={processToggle}
                  disabled={isSaving}
                  className={`w-full py-4 text-white rounded-2xl font-black uppercase tracking-tighter shadow-lg transition-all flex items-center justify-center gap-2 ${selectedSchool?.is_active ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-green-600 hover:bg-green-700 shadow-green-100'}`}
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : `Yes, ${selectedSchool?.is_active ? 'Stop' : 'Resume'} Now`}
                </button>
                <button 
                  onClick={() => setShowToggleModal(false)}
                  className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-black uppercase tracking-tighter hover:bg-gray-100 transition-all"
                >
                  No, Go Back
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- PREVIOUS MODALS (SUCCESS, BULK, EDIT, DELETE) --- */}
      {/* ... (Success popup logic) */}
      <AnimatePresence>
        {showAddSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[150] flex items-center justify-center p-4 pointer-events-none">
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} exit={{ scale: 1.2, opacity: 0 }} className="bg-white/90 backdrop-blur-xl p-6 md:p-10 rounded-[32px] md:rounded-[40px] shadow-2xl border border-blue-100 flex flex-col items-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-blue-200"><CheckCircle2 size={32} className="text-white" /></div>
              <h2 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight text-center uppercase tracking-tighter">Onboarded Successfully!</h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BULK EXTENSION MODAL */}
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
                <option value="30">Add 1 Month</option>
                <option value="90">Add 3 Months</option>
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

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight uppercase tracking-tighter">Institution Hub</h1>
        <button onClick={() => setShowExtendModal(true)} className="w-full sm:w-auto px-6 py-4 bg-white border border-blue-100 text-blue-600 rounded-[22px] font-black uppercase tracking-tighter flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
          <CreditCard size={20} /> Bulk Extension
        </button>
      </div>

      {/* ONBOARDING FORM */}
      <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-sm border border-gray-100 font-black tracking-tighter">
        <h2 className="text-lg md:text-xl font-bold mb-6 text-gray-800 flex items-center gap-2 uppercase"><Plus size={20} className="text-blue-600"/> Onboard New Client</h2>
        <form onSubmit={handleAddSchool} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 uppercase tracking-tighter">
          <input placeholder="School Name" className="p-4 bg-gray-50 rounded-2xl border outline-none font-bold text-gray-800 w-full" value={newSchool.name} onChange={e => setNewSchool({...newSchool, name: e.target.value})} required />
          <input placeholder="Location" className="p-4 bg-gray-50 rounded-2xl border outline-none font-bold text-gray-800 w-full" value={newSchool.location} onChange={e => setNewSchool({...newSchool, location: e.target.value})} />
          <select className="p-4 bg-gray-50 rounded-2xl border outline-none font-bold text-gray-600 w-full" value={newSchool.subscription} onChange={e => setNewSchool({...newSchool, subscription: e.target.value})}>
            <option value="30">1 Month Plan</option>
            <option value="365">1 Year Plan</option>
          </select>
          <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold uppercase hover:bg-blue-700 shadow-lg shadow-blue-100">Create & Activate</button>
        </form>
      </div>

      {/* SCHOOL CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {loading ? <div className="col-span-full py-12 md:py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={40}/></div> : (
          schools.map(school => {
            const isExpired = new Date(school.valid_until) < new Date();
            const isStopped = school.is_active === false;

            return (
              <motion.div key={school.id} whileHover={{ y: -10 }} className={`bg-white p-6 md:p-8 rounded-[32px] md:rounded-[45px] border-2 ${isStopped ? 'border-gray-300 grayscale opacity-75' : isExpired ? 'border-red-200' : 'border-blue-50'} shadow-xl transition-all group relative overflow-hidden`}>
                
                {isStopped && (
                  <div className="absolute inset-0 bg-white/40 z-10 rounded-[32px] md:rounded-[45px] flex items-center justify-center">
                    <span className="bg-slate-800 text-white px-4 py-2 rounded-full font-black uppercase text-[10px] tracking-widest shadow-xl">Services Paused</span>
                  </div>
                )}

                <div className="flex justify-between mb-6 relative z-20">
                  <div className={`p-3 md:p-4 rounded-[18px] md:rounded-[22px] ${isStopped ? 'bg-gray-100 text-gray-400' : isExpired ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    <Building size={24} />
                  </div>
                  
                  <div className="flex gap-1 md:gap-2">
                    {/* POWER BUTTON TRIGGER CUSTOM MODAL */}
                    <button 
                      onClick={() => initiateToggle(school)} 
                      title={isStopped ? "Start Service" : "Stop Service"}
                      className={`p-2 rounded-xl transition-all ${isStopped ? 'bg-green-100 text-green-600 hover:bg-green-600 hover:text-white' : 'bg-gray-100 text-gray-400 hover:bg-red-600 hover:text-white'}`}
                    >
                      {isStopped ? <Play size={18} fill="currentColor" /> : <Power size={18} />}
                    </button>
                    <button onClick={() => openEditModal(school)} className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-blue-500 hover:text-white"><Edit2 size={18}/></button>
                    <button onClick={() => initiateDelete(school)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-500 hover:text-white"><Trash2 size={18}/></button>
                  </div>
                </div>

                <h3 className="font-bold text-lg md:text-xl text-gray-800 tracking-tight mb-1 uppercase tracking-tighter truncate">{school.name}</h3>
                <p className="text-xs md:text-sm text-gray-400 font-bold mb-6 flex items-center gap-1 uppercase tracking-tighter "><MapPin size={14}/> {school.location || 'N/A'}</p>
                
                <div className={`p-3 md:p-4 rounded-[20px] md:rounded-[24px] mb-6 flex items-center justify-between border-2 ${isStopped ? 'bg-gray-50 border-gray-100 text-gray-400' : isExpired ? 'bg-red-50 border-red-100 text-red-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                  <div className="flex items-center gap-2 font-black uppercase tracking-tighter text-[10px] ">
                    <Clock size={16} /> Subscription
                  </div>
                  <span className="text-[10px] md:text-xs font-black tracking-tighter uppercase">{new Date(school.valid_until).toLocaleDateString('en-GB')}</span>
                </div>

                <div className="flex justify-between items-center text-[9px] md:text-[10px] font-black text-gray-300 tracking-widest uppercase tracking-tighter">
                  <span>ID: {school.id.slice(0, 8)}</span>
                  <span className={`flex items-center gap-1 ${isStopped ? 'text-gray-500' : isExpired ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                    {isStopped ? 'Disabled' : isExpired ? 'Expired' : 'Active'}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

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
    </div>
  );
}
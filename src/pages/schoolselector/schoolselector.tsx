import { useState, useEffect } from 'react';
import logo from '../../assets/smartbadi.png'; 
import { supabase } from '../../services/supabaseClient';
import { Search, ArrowRight, AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
import { SchoolItemSkeleton } from '../../components/common/skeletoncomp'; // Import the new skeleton
import toast from 'react-hot-toast';

export function SchoolSelector({ onSchoolSelect }: { onSchoolSelect: (school: any) => void }) {
  const [schools, setSchools] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    async function fetchSchools() {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('schools')
          .select('*')
          .order('name');

        if (err) throw err;
        setSchools(data || []);
      } catch (err: any) {
        console.error("Fetch Error:", err.message);
        setError("Unable to connect to server.");
        toast.error("Connection failed");
      } finally {
        setLoading(false);
      }
    }
    fetchSchools();
  }, []);

  const filtered = searchQuery.trim().length > 0
    ? schools.filter(s => 
        s.name?.toLowerCase().startsWith(searchQuery.toLowerCase().trim())
      )
    : []; 

  return (
    <div className="bg-white rounded-[40px] shadow-2xl p-8 w-full max-w-lg border border-blue-50 text-center animate-in fade-in duration-500">
      <img src={logo} alt="SmartBadi" className="h-20 mx-auto mb-6 object-contain" />
      <h1 className="text-2xl font-bold text-gray-800">Find Your Institution</h1>
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl flex gap-2 items-center justify-center">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {/* SEARCH BOX */}
      <div className="relative my-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
        <input
          type="text"
          placeholder="e.g. M for Millennium..."
          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-400 outline-none transition-all shadow-sm font-medium text-slate-800"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelected(null); 
          }}
          autoFocus
        />
      </div>

      {/* RESULTS LIST AREA */}
      <div className="min-h-[100px] max-h-[300px] overflow-y-auto mb-6 space-y-2 custom-scrollbar pr-2">
        
        {loading ? (
          // --- SKELETON LOADING STATE ---
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <SchoolItemSkeleton key={i} />
            ))}
          </div>
        ) : searchQuery.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-300 gap-3">
             <Search size={32} strokeWidth={1.5} />
             <p className="text-xs font-bold uppercase tracking-widest">Type starting institution name to search</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center">
             <p className="text-gray-400 text-sm italic">No schools starting with "{searchQuery}"</p>
          </div>
        ) : (
          filtered.map(s => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${selected?.id === s.id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}
            >
              <div className="flex items-center gap-3 text-left">
                <div className={`p-3 rounded-xl transition-colors ${selected?.id === s.id ? 'bg-blue-500 text-white' : 'bg-white text-gray-400 group-hover:text-blue-500'}`}>
                  <Building2 size={20} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${selected?.id === s.id ? 'text-blue-700' : 'text-gray-700'}`}>{s.name}</p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">{s.location || 'Main Campus'}</p>
                </div>
              </div>
              {selected?.id === s.id && <CheckCircle2 size={20} className="text-blue-500" />}
            </button>
          ))
        )}
      </div>

      <button
        disabled={!selected || loading}
        onClick={() => onSchoolSelect(selected)}
        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:bg-gray-300 shadow-lg shadow-blue-100"
      >
        Continue to Login <ArrowRight size={20} />
      </button>
    </div>
  );
}
import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ModalType = 'success' | 'error' | 'info' | 'confirm';

interface ModalOptions {
  title: string;
  message: string;
  type?: ModalType;
  onConfirm?: () => void;
}

const ModalContext = createContext<any>(null);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<ModalOptions | null>(null);

  const showPopup = (options: ModalOptions) => setModal(options);
  const closePopup = () => setModal(null);

  return (
    <ModalContext.Provider value={{ showPopup, closePopup }}>
      {children}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closePopup}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
            />
            
            {/* Modal Card */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[35px] p-8 shadow-2xl border border-white overflow-hidden"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Icon based on type */}
                <div className={`p-4 rounded-2xl ${
                  modal.type === 'error' ? 'bg-red-50 text-red-500' : 
                  modal.type === 'success' ? 'bg-green-50 text-green-500' : 'bg-blue-50 text-blue-500'
                }`}>
                  {modal.type === 'error' ? <AlertCircle size={32} /> : 
                   modal.type === 'success' ? <CheckCircle2 size={32} /> : <Info size={32} />}
                </div>

                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{modal.title}</h2>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">{modal.message}</p>

                <div className="flex gap-3 w-full mt-4">
                  {modal.onConfirm && (
                    <button 
                      onClick={() => { modal.onConfirm?.(); closePopup(); }}
                      className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-600 transition-all"
                    >
                      Confirm
                    </button>
                  )}
                  <button 
                    onClick={closePopup}
                    className={`py-4 font-black uppercase text-[10px] tracking-widest transition-all rounded-2xl ${
                      modal.onConfirm ? 'flex-1 bg-slate-100 text-slate-400' : 'w-full bg-blue-600 text-white shadow-lg shadow-blue-200'
                    }`}
                  >
                    {modal.onConfirm ? 'Cancel' : 'Understood'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}

export const usePopup = () => useContext(ModalContext);
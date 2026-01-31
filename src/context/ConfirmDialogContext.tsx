import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Check, Info } from 'lucide-react';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info' | 'success'; // To change colors
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ title: '', message: '' });
    
    // We use a ref to store the 'resolve' function of the Promise
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setOptions(opts);
            setIsOpen(true);
            resolveRef.current = resolve;
        });
    }, []);

    const handleConfirm = () => {
        if (resolveRef.current) resolveRef.current(true);
        setIsOpen(false);
    };

    const handleCancel = () => {
        if (resolveRef.current) resolveRef.current(false);
        setIsOpen(false);
    };

    // UI Colors based on type
    const getColor = () => {
        switch(options.type) {
            case 'danger': return 'bg-red-50 text-red-600 border-red-100';
            case 'success': return 'bg-green-50 text-green-600 border-green-100';
            default: return 'bg-blue-50 text-blue-600 border-blue-100';
        }
    };

    const getBtnColor = () => {
        switch(options.type) {
            case 'danger': return 'bg-red-600 hover:bg-red-700';
            case 'success': return 'bg-green-600 hover:bg-green-700';
            default: return 'bg-blue-600 hover:bg-blue-700';
        }
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}

            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                            onClick={handleCancel}
                        />

                        {/* Modal */}
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative bg-white w-full max-w-sm rounded-[24px] shadow-2xl p-6 border border-slate-100"
                        >
                            <div className="flex flex-col items-center text-center">
                                {/* Icon */}
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border ${getColor()}`}>
                                    {options.type === 'danger' ? <AlertTriangle size={28}/> : <Info size={28}/>}
                                </div>

                                <h3 className="text-lg font-black text-slate-800 mb-2">
                                    {options.title}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
                                    {options.message}
                                </p>

                                {/* Buttons */}
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <button 
                                        onClick={handleCancel}
                                        className="py-3 px-4 rounded-xl bg-slate-100 text-slate-600 font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors"
                                    >
                                        {options.cancelText || 'Cancel'}
                                    </button>
                                    <button 
                                        onClick={handleConfirm}
                                        className={`py-3 px-4 rounded-xl text-white font-black text-xs uppercase tracking-wider shadow-lg transition-all transform active:scale-95 ${getBtnColor()}`}
                                    >
                                        {options.confirmText || 'Confirm'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) throw new Error("useConfirm must be used within a ConfirmProvider");
    return context;
};
import React, { useState, useRef } from 'react';
import { PenTool, Upload, RefreshCw, X, Image as ImageIcon } from 'lucide-react';
import { useSchoolSign } from '../../hooks/useSchoolsign.ts';

interface Props {
    schoolId: string;
}

export function PrincipalSign({ schoolId }: Props) {
    const { signatureUrl, loading, uploading, uploadSignature } = useSchoolSign(schoolId);
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const success = await uploadSignature(e.target.files[0]);
            if (success) setIsEditing(false);
        }
    };

    if (loading) return <div className="h-16 bg-slate-50 rounded-xl animate-pulse w-full" />;

    const hasSignature = !!signatureUrl;
    const showUploadMode = !hasSignature || isEditing;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-visible w-full">
            
            {/* COMPACT MODE: Display when signature exists and not editing */}
            {!showUploadMode && (
                <div className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <ImageIcon size={14} />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">Principal Sign</h3>
                            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest truncate">
                                • Authorized
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Signature Preview */}
                        <div className="h-8 px-2 bg-slate-50 border border-slate-100 rounded-md flex items-center justify-center select-none pointer-events-none">
                            <img 
                                src={signatureUrl!} 
                                alt="Sign" 
                                className="h-full w-auto object-contain mix-blend-multiply opacity-80"
                            />
                        </div>
                        
                        {/* --- CUSTOM TOOLTIP BUTTON --- */}
                        <div className="relative group">
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            >
                                <PenTool size={12} />
                            </button>

                            {/* Tooltip Content */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-50 whitespace-nowrap">
                                <div className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg shadow-xl relative">
                                    Change Signature
                                    {/* Tiny Arrow pointing down */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                                </div>
                            </div>
                        </div>
                        {/* ----------------------------- */}

                    </div>
                </div>
            )}

            {/* UPLOAD MODE: Display when empty or editing */}
            {showUploadMode && (
                <div className="p-4 relative">
                    {/* Header with Cancel button if editing */}
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                            {uploading ? 'Uploading...' : 'Upload Signature'}
                        </h3>
                        {isEditing && (
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-red-500">
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Compact Drop Area */}
                    <div 
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        className={`
                            group cursor-pointer flex flex-col items-center justify-center py-4 px-2 rounded-xl border border-dashed transition-all
                            ${uploading ? 'bg-slate-50 border-slate-200' : 'bg-slate-50/50 border-blue-200 hover:bg-blue-50 hover:border-blue-300'}
                        `}
                    >
                         <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                            disabled={uploading}
                        />

                        {uploading ? (
                            <RefreshCw size={18} className="animate-spin text-blue-500 mb-1" />
                        ) : (
                            <Upload size={18} className="text-blue-400 group-hover:text-blue-600 group-hover:scale-110 transition-transform mb-1" />
                        )}
                        
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">
                            {uploading ? 'Please wait' : 'Click to Browse'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
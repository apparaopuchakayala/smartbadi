import React, { useState, useRef } from 'react';
import { PenTool, Lock, Upload, RefreshCw, CheckCircle2 } from 'lucide-react';
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

    if (loading) return <div className="h-40 bg-slate-50 rounded-2xl animate-pulse" />;

    const hasSignature = !!signatureUrl;
    const isLocked = hasSignature && !isEditing;

    return (
        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-200 flex flex-col gap-4 relative overflow-hidden group">
            
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Upload Principal Signature</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Principal Authorization
                    </p>
                </div>
                <div className={`p-2 rounded-xl transition-all ${isLocked ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                    {isLocked ? <Lock size={18} /> : <PenTool size={18} />}
                </div>
            </div>

            {/* Content Area */}
            <div className={`
                flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed transition-all
                ${isLocked ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-200 bg-slate-50 hover:border-blue-300'}
            `}>
                {isLocked ? (
                    <div className="text-center space-y-3">
                        <div className="bg-white p-2 rounded-lg border border-slate-100 inline-block shadow-sm">
                            <img 
                                src={signatureUrl!} 
                                alt="Principal Signature" 
                                className="h-16 object-contain opacity-90"
                            />
                        </div>
                        <div className="flex items-center justify-center gap-2 text-emerald-600">
                            <CheckCircle2 size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Active & Locked</span>
                        </div>
                    </div>
                ) : (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer text-center space-y-2 w-full"
                    >
                        <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto text-blue-500 mb-2">
                            {uploading ? <RefreshCw size={20} className="animate-spin" /> : <Upload size={20} />}
                        </div>
                        <p className="text-xs font-bold text-slate-600">
                            {uploading ? "Securing File..." : "Click to Upload Signature"}
                        </p>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">
                            Supports PNG/JPG • Max 2MB
                        </p>
                    </div>
                )}
                
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    disabled={isLocked || uploading}
                />
            </div>

            {/* Footer / Actions */}
            {hasSignature && (
                <div className="flex justify-end border-t border-slate-100 pt-3">
                    {isEditing ? (
                        <button 
                            onClick={() => setIsEditing(false)}
                            className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                    ) : (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1"
                        >
                            Change Signature
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
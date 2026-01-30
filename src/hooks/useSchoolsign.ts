// src/hooks/useSchoolSign.ts
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';

export function useSchoolSign(schoolId: string | undefined) {
    const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (schoolId) fetchSignature();
    }, [schoolId]);

    const fetchSignature = async () => {
        try {
            const { data, error } = await supabase
                .from('schools') 
                .select('principal_signature_url')
                .eq('id', schoolId)
                .single();
            
            if (error) throw error;

            // Add timestamp to force refresh if the URL exists
            if (data?.principal_signature_url) {
                setSignatureUrl(`${data.principal_signature_url}?t=${Date.now()}`);
            }
        } catch (error) {
            console.error('Error fetching signature:', error);
        } finally {
            setLoading(false);
        }
    };

    const uploadSignature = async (file: File) => {
        if (!schoolId) {
            toast.error("School ID is missing. Please re-login.");
            return false;
        }

        setUploading(true);
        const toastId = toast.loading("Securing Signature...");

        try {
            // 1. Validate File
            if (!file.type.startsWith('image/')) throw new Error("Only image files allowed");
            if (file.size > 2 * 1024 * 1024) throw new Error("File size must be under 2MB");

            // 2. Upload to 'school-assets' bucket
            const fileExt = file.name.split('.').pop();
            // Naming it 'principal_signature' ensures one clean file per school
            const filePath = `${schoolId}/principal_signature.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('school-assets')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 3. Get Public URL
            const { data: publicURLData } = supabase.storage
                .from('school-assets')
                .getPublicUrl(filePath);
            
            const finalUrl = publicURLData.publicUrl;

            // 4. Update Database (CRITICAL FIX: Added .select())
            // We verify that the database actually updated the row
            const { data, error: dbError } = await supabase
                .from('schools')
                .update({ principal_signature_url: finalUrl })
                .eq('id', schoolId)
                .select(); // <--- This forces Supabase to return the updated row

            if (dbError) throw dbError;

            // 5. Zero Trust Verification
            // If data is empty, RLS policies silently blocked the update
            if (!data || data.length === 0) {
                throw new Error("Permission Denied: Unable to link signature to your school profile.");
            }

            // 6. Success
            setSignatureUrl(`${finalUrl}?t=${Date.now()}`);
            toast.success("Signature Activated", { id: toastId });
            return true;

        } catch (error: any) {
            console.error("Signature Upload Error:", error);
            toast.error(error.message || "Upload failed", { id: toastId });
            return false;
        } finally {
            setUploading(false);
        }
    };

    return { signatureUrl, loading, uploading, uploadSignature };
}
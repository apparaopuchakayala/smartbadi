import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthProvider';

export const useAudit = () => {
    const { profile } = useAuth();

    /**
     * Logs an activity to the audit_logs table.
     * @param action - Short action code (e.g., 'LOGIN', 'UPDATE_MARKS')
     * @param description - Human readable description
     * @param metaData - Additional JSON data (optional)
     * @param overrides - Manual UserID/Role (Used during Login before session is set)
     */
    const logAction = async (
        action: string, 
        description: string, 
        metaData: any = {}, 
        overrides?: { userId?: string, role?: string }
    ) => {
        try {
            // 1. Fetch IP Address (Fail-safe)
            let ipAddress = 'Unknown';
            try {
                const ipReq = await fetch('https://api.ipify.org?format=json');
                if (ipReq.ok) {
                    const ipData = await ipReq.json();
                    ipAddress = ipData.ip;
                }
            } catch (e) { 
                // console.warn("[Audit] Could not fetch IP address"); 
            }

            // 2. Determine User Details (Priority: Manual Override > Context Profile > Supabase Session)
            let finalUserId = overrides?.userId || profile?.id;
            let finalRole = overrides?.role || profile?.role || 'anon';

            // If we still don't have an ID (e.g., page refresh), try fetching from active session
            if (!finalUserId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    finalUserId = user.id;
                    // Try to guess role if still 'anon'
                    if (finalRole === 'anon' && user.user_metadata?.role) {
                        finalRole = user.user_metadata.role;
                    }
                }
            }

            // 3. Insert into Database
            const { error } = await supabase.from('audit_logs').insert({
                user_id: finalUserId || null, // Send NULL if guest/login failed
                role: finalRole,
                ip_address: ipAddress,
                action_type: action,
                description: description,
                new_values: metaData
            });

            // 4. Console Feedback for Developers
            if (error) {
                // console.error("❌ [Audit Log Failed] DB Error:", error.message);
            } else {
                // console.log(`✅ [Audit Log Saved] Action: ${action}`);
            }

        } catch (err) {
            // console.error("❌ [Audit Log Critical Error]", err);
        }
    };

    return { logAction };
};
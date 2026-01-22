import { supabase } from './supabaseClient';

export const smartBadiApi = {

async secureLogin(credentials: any) {
    const { data, error } = await supabase.functions.invoke('secure-login', {
      body: credentials
    });

    if (error) {
      const errorContext = await error.context?.json();
      const detailedMsg = errorContext?.error || error.message || "Login Failed";
      
      const customError: any = new Error(detailedMsg);
      customError.response = { data: { error: detailedMsg } };
      throw customError;
    }

    if (data?.error) {
      const customError: any = new Error(data.error);
      customError.response = { data: { error: data.error } };
      throw customError;
    }

    return data;
  },
  async registerStaffOrStudent(payload: any) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("SECURITY_ALERT: No active session.");

    const { data, error } = await supabase.functions.invoke('create-user', {
      body: payload,
      headers: { Authorization: `Bearer ${token}` }
    });
    if (error || data?.error) throw new Error(data?.error || "Registration Failed");
    return data;
  },

  async bulkRegisterStudents(studentsArray: any[]) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("401: Unauthorized. Please login again.");

    const { data, error } = await supabase.functions.invoke('create-user', {
      body: { isBulk: true, students: studentsArray },
      headers: { Authorization: `Bearer ${token}` }
    });
    if (error || data?.error) throw new Error(data?.error || "Bulk Upload Failed");
    return data;
  },

  async deleteUser(targetId: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { target_id: targetId },
      headers: { Authorization: `Bearer ${sessionData.session?.access_token}` }
    });
    if (error || data?.error) throw new Error(data?.error || "Delete failed");
    return data;
  },

  async getProfiles(schoolId: string, role?: string) {
    let query = supabase.from('profiles').select('*').eq('school_id', schoolId);
    if (role) query = query.eq('role', role);

    const { data, error } = await query.order('full_name', { ascending: true });
    if (error) throw error;

    const processedData = data.map(profile => {
      if (profile.avatar_url) {
        if (profile.avatar_url.startsWith('https')) return profile;

        const { data: { publicUrl } } = supabase.storage
          .from('student-photos')
          .getPublicUrl(profile.avatar_url);

        return { ...profile, photo_url: publicUrl };
      }
      return profile;
    });

    return processedData;
  },

  async fetchStudentHubRecords(schoolId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('school_id', schoolId)
      .eq('role', 'student')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) throw new Error(`Student Sync Failed: ${error.message}`);
    return data;
  },

  async upsertMapping(mappings: any[]) {
    const { data, error } = await supabase
      .from('teacher_mappings')
      .upsert(mappings, { onConflict: 'teacher_id,class_id,subject_id' });

    if (error) throw error;
    return data;
  },

  async getMappings(schoolId: string) {
    const { data, error } = await supabase
      .from('teacher_mappings')
      .select('*, profiles(full_name), classes(name), subjects(name)')
      .eq('school_id', schoolId);

    if (error) throw error;
    return data;
  },

  getTelanganaSubjects() {
    return [
      "Telugu (1st Language)", "Hindi (2nd Language)", "English", 
      "Mathematics", "General Science", "Physical Science", 
      "Biological Science", "Social Studies", "Environmental Studies (EVS)",
      "Computer Science", "Moral Values", "Physical Education"
    ];
  },

  async setupSchoolStructure(schoolId: string, classes: any[]) {
    const { data, error } = await supabase
      .from('school_classes')
      .upsert(classes.map(c => ({ ...c, school_id: schoolId })));
    if (error) throw error;
    return data;
  },

  async setupSubjects(schoolId: string, subjects: string[]) {
    const payload = subjects.map(s => ({ school_id: schoolId, subject_name: s }));
    const { data, error } = await supabase.from('subjects').upsert(payload);
    if (error) throw error;
    return data;
  }
};



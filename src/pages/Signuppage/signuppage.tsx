import React, { useState, useEffect } from 'react';
import { User, Lock, Mail, Phone, Loader2, Check, X } from 'lucide-react';
import logo from '../../assets/smartbadi.png';
import { supabase } from '../../services/supabaseClient';
import toast from 'react-hot-toast';

type UserRole = 'Admin' | 'Teacher' | 'Student';

interface SignupPageProps {
  onSwitchToLogin: () => void;
}

export function SignupPage({ onSwitchToLogin }: SignupPageProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>('Teacher');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Password Validation States ---
  const [validations, setValidations] = useState({
    minLength: false,
    hasUpper: false,
    hasNumber: false,
    hasSpecial: false,
  });

  // Dynamic Validation Logic
  useEffect(() => {
    setValidations({
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  const isPasswordSecure = Object.values(validations).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword !== '';

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordSecure) {
      toast.error("Please meet all password requirements.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true);

    const signupAction = supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone,
          role: selectedRole,
        },
      },
    });

    toast.promise(signupAction, {
      loading: 'Creating your account...',
      success: (response) => {
        if (response.error) throw response.error;
        onSwitchToLogin();
        return 'Account created! Please verify your email.';
      },
      error: (err: any) => `Signup failed: ${err.message}`,
    });

    try {
      await signupAction;
    } catch (error) {
      console.error("Signup error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[32px] shadow-xl p-8 w-full max-w-md border border-gray-100">
      <div className="flex justify-center mb-6">
        <img src={logo} alt="SmartBadi Logo" className="h-20 object-contain" />
      </div>

      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Create Account</h1>
      </div>

      <div className="relative mb-6">
        <div className="flex bg-gray-100 rounded-full p-1.5 border border-gray-200">
          {(['Admin', 'Teacher', 'Student'] as UserRole[]).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setSelectedRole(role)}
              className={`flex-1 py-2 px-4 rounded-full text-xs font-bold transition-all duration-300 ${
                selectedRole === role ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <Input icon={<User size={18} />} placeholder="Full Name" value={fullName} onChange={setFullName} />
        <Input icon={<Mail size={18} />} type="email" placeholder="Email Address" value={email} onChange={setEmail} />
        <Input icon={<Phone size={18} />} type="tel" placeholder="Phone Number" value={phone} onChange={setPhone} />

        {/* Password Field */}
        <div className="space-y-2">
          <Input 
            icon={<Lock size={18} />} 
            type="password" 
            placeholder="Create Password" 
            value={password} 
            onChange={setPassword} 
          />
          
          {/* Password Strength Indicator */}
          <div className="grid grid-cols-2 gap-2 px-2 mt-2">
            <PasswordCheck label="8+ Characters" isValid={validations.minLength} />
            <PasswordCheck label="1 Capital Letter" isValid={validations.hasUpper} />
            <PasswordCheck label="1 Number" isValid={validations.hasNumber} />
            <PasswordCheck label="1 Special Char" isValid={validations.hasSpecial} />
          </div>
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-1">
          <Input 
            icon={<Lock size={18} />} 
            type="password" 
            placeholder="Confirm Password" 
            value={confirmPassword} 
            onChange={setConfirmPassword}
            error={!passwordsMatch && confirmPassword !== ''}
          />
          {!passwordsMatch && confirmPassword !== '' && (
            <span className="text-[10px] text-red-500 font-bold uppercase ml-4 italic flex items-center gap-1">
               Passwords do not match
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !isPasswordSecure || !passwordsMatch}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : 'Create Account'}
        </button>
      </form>

      <div className="text-center mt-6 text-sm text-gray-600">
        Already have an account?{' '}
        <button onClick={onSwitchToLogin} className="text-blue-600 font-bold hover:underline">
          Login Here
        </button>
      </div>
    </div>
  );
}

// --- Internal Helper Components for Reusability ---

function Input({ icon, value, onChange, error, ...props }: any) {
  return (
    <div className="relative">
      <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-red-400' : 'text-gray-400'}`}>
        {icon}
      </div>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className={`w-full pl-12 pr-4 py-3.5 bg-gray-50 border rounded-2xl focus:ring-2 outline-none transition-all ${
          error ? 'border-red-300 focus:ring-red-100' : 'border-gray-200 focus:ring-blue-400 focus:bg-white'
        }`}
      />
    </div>
  );
}

function PasswordCheck({ label, isValid }: { label: string; isValid: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${isValid ? 'text-green-500' : 'text-gray-300'}`}>
      {isValid ? <Check size={12} strokeWidth={3} /> : <X size={12} strokeWidth={3} />}
      {label}
    </div>
  );
}
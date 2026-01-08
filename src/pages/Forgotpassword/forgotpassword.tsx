import { useState } from 'react';
import { Mail } from 'lucide-react';
import logo from '../../assets/smartbadi.png';

interface ForgotPasswordPageProps {
  onSwitchToLogin: () => void;
}

export function ForgotPasswordPage({ onSwitchToLogin }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Password reset requested for:', email);
    setIsSubmitted(true);
    // Add your password reset logic here
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg p-8 w-full max-w-md">
      {/* Logo */}
      <div className="flex justify-center mb-4">
        <img src={logo} alt="SmartBadi Logo" className="h-24"/>
      </div>

      {/* Title */}
      <h1 className="text-center text-gray-800 mb-2">
        Forgot Password?
      </h1>

      {/* Description */}
      <p className="text-center text-gray-600 mb-6 text-sm">
        Enter your email address and we'll send you a link to reset your password.
      </p>

      {!isSubmitted ? (
        <>
          {/* Reset Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail size={20} />
              </div>
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-green-400 text-white rounded-full hover:shadow-lg transition-shadow duration-300"
            >
              Send Reset Link
            </button>
          </form>

          {/* Back to Login Link */}
          <div className="text-center mt-6">
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                onSwitchToLogin();
              }}
              className="text-blue-600 hover:text-blue-700"
            >
              Back to Login
            </a>
          </div>
        </>
      ) : (
        <>
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
            <p className="text-green-800 text-center text-sm">
              Password reset link has been sent to your email address. Please check your inbox.
            </p>
          </div>

          {/* Return to Login Button */}
          <button
            onClick={onSwitchToLogin}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-green-400 text-white rounded-full hover:shadow-lg transition-shadow duration-300"
          >
            Return to Login
          </button>
        </>
      )}
    </div>
  );
}
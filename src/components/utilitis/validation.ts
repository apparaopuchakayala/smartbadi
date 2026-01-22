// 1. Email Validation
export const validateEmail = (email: string): string | null => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) ? null : "Invalid email address format";
};

// 2. Password Validation (Min 8 chars, mixed characters)
export const validatePassword = (password: string): string | null => {
  // Min 8 chars, 1 Upper, 1 Lower, 1 Number, 1 Special
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password) 
    ? null 
    : "Password must be 8+ chars with Uppercase, Lowercase, Number & Special Character";
};

// 3. Mobile Number Validation (Exactly 10 digits)
export const validateMobile = (mobile: string): string | null => {
  const regex = /^\d{10}$/;
  return regex.test(mobile) ? null : "Mobile number must be exactly 10 digits";
};

// 4. Strict Date Format Validation (YYYY-MM-DD)
export const validateStrictDate = (date: string, fieldName: string): string | null => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return `${fieldName} must be in YYYY-MM-DD format`;
  
  const [year, month, day] = date.split('-').map(Number);
  if (month < 1 || month > 12) return "Month must be between 01-12";
  if (day < 1 || day > 31) return "Day must be between 01-31";
  if (year < 1900 || year > 2100) return "Year is out of range";
  
  return null;
};

// 5. Employee ID Validation (Numeric Only)
export const validateNumeric = (value: string, fieldName: string): string | null => {
  return /^\d+$/.test(value) ? null : `${fieldName} must contain only numbers`;
};

// 6. Alpha Only Validation (For Full Name & Department)
export const validateAlpha = (value: string, fieldName: string): string | null => {
  return /^[a-zA-Z\s]+$/.test(value) ? null : `${fieldName} must contain only letters`;
};

// 7. Password Strength Checker (Returns 0 to 4)
export const getPasswordStrength = (pwd: string): number => {
  let strength = 0;
  if (pwd.length >= 8) strength++;
  if (/[A-Z]/.test(pwd)) strength++;
  if (/[0-9]/.test(pwd)) strength++;
  if (/[@$!%*?&]/.test(pwd)) strength++;
  return strength;
};
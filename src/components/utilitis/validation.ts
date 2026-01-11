export const validateEmail = (email: string): string | null => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) ? null : "Invalid email address format";
};

export const validatePassword = (password: string): string | null => {
  // Min 8 chars, 1 Upper, 1 Lower, 1 Number, 1 Special
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password) 
    ? null 
    : "Password must be 8+ chars with Uppercase, Lowercase, Number & Special Character";
};

export const validateMobile = (mobile: string): string | null => {
  // Exactly 10 digits
  const regex = /^\d{10}$/;
  return regex.test(mobile) ? null : "Mobile number must be exactly 10 digits";
};

export const validateRequired = (value: any, fieldName: string): string | null => {
  return value && value.toString().trim() !== "" ? null : `${fieldName} is required`;
};
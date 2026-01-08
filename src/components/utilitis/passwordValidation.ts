export const passwordRules = {
  minLength: 8,
  requireCapital: /[A-Z]/,
  requireNumber: /[0-9]/,
  requireSpecial: /[!@#$%^&*(),.?":{}|<>]/,
};

export const validatePassword = (password: string) => {
  return {
    hasMinLength: password.length >= passwordRules.minLength,
    hasCapital: passwordRules.requireCapital.test(password),
    hasNumber: passwordRules.requireNumber.test(password),
    hasSpecial: passwordRules.requireSpecial.test(password),
  };
};
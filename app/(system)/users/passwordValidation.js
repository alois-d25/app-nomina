/**
 * Password validation utility
 * Ensures consistent password validation across user creation and editing
 */

const MIN_PASSWORD_LENGTH = 6;

export const validatePassword = (password) => {
  if (!password) {
    return "La contraseña es requerida";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  return null;
};

export const validatePasswordMatch = (password, confirmPassword) => {
  if (!confirmPassword) {
    return "Debe confirmar la contraseña";
  }
  if (password !== confirmPassword) {
    return "Las contraseñas no coinciden";
  }
  return null;
};

export const validatePasswordFields = (password, confirmPassword) => {
  const errors = {};

  if (password) {
    const passwordError = validatePassword(password);
    if (passwordError) {
      errors.password = passwordError;
    }

    const matchError = validatePasswordMatch(password, confirmPassword);
    if (matchError) {
      errors.confirmPassword = matchError;
    }
  }

  return errors;
};

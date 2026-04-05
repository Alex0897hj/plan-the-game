export interface ValidationErrors {
  email?: string;
  password?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuthForm(email: string, password: string): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!email.trim()) {
    errors.email = "Email обязателен";
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.email = "Введите корректный email";
  }

  if (!password) {
    errors.password = "Пароль обязателен";
  } else if (password.length < 6) {
    errors.password = "Пароль должен быть не менее 6 символов";
  }

  return errors;
}

export function hasErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}

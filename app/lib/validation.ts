export interface ValidationErrors {
  name?:     string;
  email?:    string;
  password?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAuthForm(
  email: string,
  password: string,
  name?: string,          // required only in register mode
  isRegister = false,
): ValidationErrors {
  const errors: ValidationErrors = {};

  if (isRegister) {
    if (!name || !name.trim()) {
      errors.name = "Имя обязательно";
    } else if (name.trim().length < 2) {
      errors.name = "Имя должно быть не менее 2 символов";
    } else if (name.trim().length > 50) {
      errors.name = "Имя не должно превышать 50 символов";
    }
  }

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

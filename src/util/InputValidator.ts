// Email validator
export function isValidEmail(email: string): boolean {
  // RFC 5322 compliant regex
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Username validator
export function isValidUsername(username: string): boolean {
  // Allows alphanumeric characters, underscores, and hyphens
  // Length between 3 and 20 characters
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(username);
}

// Password validator
export function isValidPassword(password: string): boolean {
  // At least 8 characters long
  // Contains at least one uppercase letter, one lowercase letter, one number, and one special character
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  return passwordRegex.test(password);
}

// Helper function to validate input
export function validateInput(
  input: string,
  validatorFn: (input: string) => boolean,
  errorMessage: string
): { isValid: boolean; error?: string } {
  if (validatorFn(input)) {
    return { isValid: true };
  } else {
    return { isValid: false, error: errorMessage };
  }
}

// Usage examples
export function validateEmail(email: string): {
  isValid: boolean;
  error?: string;
} {
  return validateInput(email, isValidEmail, "Invalid email address");
}

export function validateUsername(username: string): {
  isValid: boolean;
  error?: string;
} {
  return validateInput(
    username,
    isValidUsername,
    "Invalid username. It should be 3-20 characters long and can only contain letters, numbers, underscores, and hyphens."
  );
}

export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
} {
  return validateInput(
    password,
    isValidPassword,
    "Invalid password. It should be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
  );
}

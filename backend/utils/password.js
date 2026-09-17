/** Server-enforced password policy: >= 8 chars, upper + lower + digit + symbol. */
export const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]).{8,}$/;

export const PASSWORD_HINT =
  "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a symbol.";

export const isStrongPassword = (value) => PASSWORD_RULE.test(String(value || ""));

export const BCRYPT_ROUNDS = 10;

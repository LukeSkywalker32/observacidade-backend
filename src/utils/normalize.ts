/**
 * Normalizadores de campos sensíveis.
 * Use ANTES de salvar no banco ou comparar em queries.
 */

/** Remove tudo que não é dígito */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Normaliza CPF: só dígitos. Aceita com ou sem máscara */
export function normalizeCPF(cpf: string): string {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11) {
    throw new Error("CPF deve ter 11 dígitos");
  }
  return digits;
}

/** Normaliza RG: só dígitos + letras (sem pontuação) */
export function normalizeRG(rg: string): string {
  return rg.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/** Normaliza email: lowercase + trim */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

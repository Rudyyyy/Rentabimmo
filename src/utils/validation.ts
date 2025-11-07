/**
 * Utilitaires de validation des données
 * Utilisés pour valider et convertir les entrées utilisateur de manière sécurisée
 */

/**
 * Valide et convertit une valeur en nombre
 * @param value - Valeur à convertir
 * @param defaultValue - Valeur par défaut si la conversion échoue
 * @param min - Valeur minimale acceptée (optionnel)
 * @param max - Valeur maximale acceptée (optionnel)
 * @returns Nombre validé ou valeur par défaut
 */
export function safeNumber(
  value: unknown, 
  defaultValue: number = 0,
  min?: number,
  max?: number
): number {
  const num = Number(value);
  
  // Vérifier si c'est un nombre valide
  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }
  
  // Vérifier les limites si définies
  if (min !== undefined && num < min) {
    return defaultValue;
  }
  
  if (max !== undefined && num > max) {
    return defaultValue;
  }
  
  return num;
}

/**
 * Valide une date et retourne un objet Date valide
 * @param dateString - Chaîne de date à valider
 * @param defaultValue - Date par défaut si la validation échoue
 * @returns Date validée ou valeur par défaut
 */
export function safeDate(dateString: string | Date, defaultValue: Date = new Date()): Date {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    if (isNaN(date.getTime())) {
      return defaultValue;
    }
    
    return date;
  } catch {
    return defaultValue;
  }
}

/**
 * Valide un pourcentage (entre 0 et 100)
 * @param value - Valeur à valider
 * @param defaultValue - Valeur par défaut
 * @returns Pourcentage validé
 */
export function safePercentage(value: unknown, defaultValue: number = 0): number {
  return safeNumber(value, defaultValue, 0, 100);
}

/**
 * Valide un taux (peut être négatif mais limité)
 * @param value - Valeur à valider
 * @param defaultValue - Valeur par défaut
 * @returns Taux validé
 */
export function safeRate(value: unknown, defaultValue: number = 0): number {
  return safeNumber(value, defaultValue, -100, 100);
}

/**
 * Valide un montant financier (doit être positif)
 * @param value - Valeur à valider
 * @param defaultValue - Valeur par défaut
 * @returns Montant validé
 */
export function safeAmount(value: unknown, defaultValue: number = 0): number {
  return safeNumber(value, defaultValue, 0);
}

/**
 * Formate un nombre avec un nombre fixe de décimales
 * @param value - Valeur à formater
 * @param decimals - Nombre de décimales
 * @returns Nombre formaté
 */
export function toFixed(value: number, decimals: number = 2): number {
  return Number(value.toFixed(decimals));
}

/**
 * Vérifie si une chaîne n'est pas vide après trim
 * @param value - Chaîne à vérifier
 * @returns true si la chaîne n'est pas vide
 */
export function isNotEmpty(value: string | undefined | null): boolean {
  return Boolean(value && value.trim().length > 0);
}

/**
 * Valide un email basique
 * @param email - Email à valider
 * @returns true si l'email est valide
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valide une plage de dates (startDate doit être avant endDate)
 * @param startDate - Date de début
 * @param endDate - Date de fin
 * @returns true si la plage est valide
 */
export function isValidDateRange(startDate: string | Date, endDate: string | Date): boolean {
  const start = safeDate(startDate);
  const end = safeDate(endDate);
  return start < end;
}






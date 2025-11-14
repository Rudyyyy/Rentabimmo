import { useEffect, useState } from 'react';

/**
 * Hook personnalisé pour synchroniser un état avec localStorage
 * 
 * @param key - Clé pour le stockage local
 * @param initialValue - Valeur initiale si rien n'est dans le localStorage
 * @param sourceValue - Valeur source prioritaire (ex: depuis la DB)
 * @returns [value, setValue] - Tuple avec la valeur et la fonction de mise à jour
 */
export function useLocalStorageSync<T>(
  key: string,
  initialValue: T,
  sourceValue?: T
): [T, (value: T) => void] {
  // Initialiser l'état avec la priorité : sourceValue > localStorage > initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Priorité 1: Valeur source (ex: depuis la base de données)
    if (sourceValue !== undefined && sourceValue !== null) {
      return sourceValue;
    }
    
    // Priorité 2: Valeur dans localStorage
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : initialValue;
      } catch (error) {
        console.warn(`Erreur lors de la lecture de ${key} depuis localStorage:`, error);
        return initialValue;
      }
    }
    
    // Priorité 3: Valeur par défaut
    return initialValue;
  });

  // Synchroniser avec sourceValue quand elle change
  useEffect(() => {
    if (sourceValue !== undefined && sourceValue !== null) {
      setStoredValue(sourceValue);
      // Sauvegarder aussi dans localStorage
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(sourceValue));
        }
      } catch (error) {
        console.warn(`Erreur lors de la sauvegarde de ${key} dans localStorage:`, error);
      }
    }
  }, [key, sourceValue]);

  // Fonction pour mettre à jour la valeur
  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      
      // Sauvegarder dans localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.warn(`Erreur lors de la sauvegarde de ${key} dans localStorage:`, error);
    }
  };

  return [storedValue, setValue];
}

/**
 * Hook pour créer une clé de localStorage basée sur un ID d'entité
 * Utile pour stocker des données spécifiques à une entité
 * 
 * @param baseName - Nom de base pour la clé
 * @param entityId - ID de l'entité
 * @returns Clé formatée pour localStorage
 */
export function useStorageKey(baseName: string, entityId: string | undefined): string {
  return entityId ? `${baseName}_${entityId}` : baseName;
}










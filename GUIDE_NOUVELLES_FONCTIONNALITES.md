# Guide des Nouvelles Fonctionnalités - Rentab'immo

## 🎯 Guide Rapide pour les Développeurs

Ce guide présente les nouvelles fonctionnalités ajoutées lors de la refactorisation du code.

---

## 1. 📝 Système de Logging

### Import
```typescript
import { logger } from '../utils/logger';
```

### Utilisation

#### Logs de debug (visibles uniquement en développement)
```typescript
logger.debug('Message de debug', { data: someData });
```

#### Logs d'information
```typescript
logger.info('Opération réussie', { userId: 123 });
```

#### Avertissements
```typescript
logger.warn('Attention: valeur inhabituelle', { value });
```

#### Erreurs
```typescript
logger.error('Erreur lors de l\'opération', error);
```

#### Groupes de logs
```typescript
logger.group('Chargement de la propriété', () => {
  logger.debug('Étape 1: Récupération');
  logger.debug('Étape 2: Validation');
  logger.debug('Étape 3: Calculs');
});
```

#### Tables de données
```typescript
logger.table(arrayOfData);
```

### Configuration
Le logger est automatiquement configuré :
- **Développement:** Affiche tous les logs à partir de 'debug'
- **Production:** Affiche uniquement les 'error'

---

## 2. ✅ Validation des Données

### Import
```typescript
import { 
  safeNumber, 
  safeAmount, 
  safeRate, 
  safePercentage,
  safeDate,
  toFixed,
  isNotEmpty,
  isValidEmail,
  isValidDateRange
} from '../utils/validation';
```

### Fonctions Disponibles

#### safeNumber - Nombre générique
```typescript
// Convertit en nombre avec valeur par défaut
const age = safeNumber(userInput, 0);

// Avec limites min/max
const year = safeNumber(userInput, 2024, 1900, 2100);
```

#### safeAmount - Montant financier (≥ 0)
```typescript
const price = safeAmount(investment.purchasePrice);
// Garantit un nombre positif
```

#### safeRate - Taux (-100 à 100)
```typescript
const rate = safeRate(investment.interestRate);
// Garantit un taux valide
```

#### safePercentage - Pourcentage (0 à 100)
```typescript
const occupancy = safePercentage(investment.occupancyRate);
```

#### safeDate - Validation de dates
```typescript
const startDate = safeDate(investment.startDate);
// Retourne une Date valide ou la date par défaut
```

#### toFixed - Formatage avec décimales
```typescript
const formatted = toFixed(123.456789, 2);
// Résultat: 123.46 (number, pas string!)
```

#### isNotEmpty - Vérification de chaîne
```typescript
if (isNotEmpty(name)) {
  // La chaîne n'est pas vide après trim
}
```

#### isValidEmail - Validation d'email
```typescript
if (isValidEmail(email)) {
  // Email valide
}
```

#### isValidDateRange - Validation de plage
```typescript
if (isValidDateRange(startDate, endDate)) {
  // startDate < endDate
}
```

### Exemple Complet
```typescript
// ❌ Avant (non sécurisé)
function calculateTotal(price: any, quantity: any) {
  return Number(price) * Number(quantity);
}

// ✅ Après (sécurisé)
function calculateTotal(price: unknown, quantity: unknown): number {
  const validPrice = safeAmount(price);
  const validQuantity = safeNumber(quantity, 1, 1);
  return toFixed(validPrice * validQuantity);
}
```

---

## 3. 🔄 Hook useLocalStorageSync

### Import
```typescript
import { useLocalStorageSync, useStorageKey } from '../hooks/useLocalStorageSync';
```

### Utilisation de Base
```typescript
const [value, setValue] = useLocalStorageSync(
  'myKey',           // Clé localStorage
  defaultValue,      // Valeur par défaut
  sourceValue        // Valeur source prioritaire (ex: depuis DB)
);
```

### Exemple Pratique
```typescript
function MyComponent({ investment }) {
  // Synchronise automatiquement entre localStorage et DB
  const [targetGain, setTargetGain] = useLocalStorageSync(
    'targetGain',
    50000,                    // Valeur par défaut
    investment.targetGain     // Valeur depuis la DB (prioritaire)
  );

  return (
    <input 
      value={targetGain}
      onChange={(e) => setTargetGain(Number(e.target.value))}
    />
  );
}
```

### Clés Dynamiques
```typescript
// Créer une clé unique par entité
const storageKey = useStorageKey('targetGain', investment.id);
const [value, setValue] = useLocalStorageSync(storageKey, 50000);
```

### Priorités de Valeurs
1. **Valeur source** (ex: depuis DB) - Priorité la plus haute
2. **LocalStorage** - Si pas de valeur source
3. **Valeur par défaut** - Si rien d'autre

---

## 4. 📊 Hook useFinancialMetrics

### Import
```typescript
import { useFinancialMetrics, useIsValidInvestment } from '../hooks/useFinancialMetrics';
```

### Utilisation
```typescript
function PropertyComponent({ investment }) {
  // Calcule automatiquement les métriques avec memoization
  const metrics = useFinancialMetrics(investment);

  // Vérifie si l'investissement est valide
  const isValid = useIsValidInvestment(investment);

  if (!isValid) {
    return <div>Données d'investissement invalides</div>;
  }

  return (
    <div>
      <p>Rendement brut: {metrics.grossYield}%</p>
      <p>Rendement net: {metrics.netYield}%</p>
      <p>Cash flow mensuel: {metrics.monthlyCashFlow}€</p>
    </div>
  );
}
```

### Avantages
- ✅ **Performance:** Recalcule uniquement si nécessaire
- ✅ **Simplicité:** Pas besoin de gérer useEffect
- ✅ **Sécurité:** Types TypeScript complets

### Quand Utiliser
- ✅ Dans les composants qui affichent des métriques
- ✅ Quand vous avez besoin de calculer des indicateurs financiers
- ❌ Si vous n'avez pas besoin des métriques (overhead inutile)

---

## 5. 🎨 Bonnes Pratiques

### Logger vs Console
```typescript
// ❌ Ne JAMAIS faire
console.log('Debug info');
console.error('Error');

// ✅ TOUJOURS faire
logger.debug('Debug info');
logger.error('Error message', error);
```

### Validation des Entrées
```typescript
// ❌ Dangereux
function calculate(amount: any) {
  return Number(amount) * 1.2;
}

// ✅ Sécurisé
function calculate(amount: unknown): number {
  const validAmount = safeAmount(amount);
  return toFixed(validAmount * 1.2);
}
```

### Gestion des Dates
```typescript
// ❌ Non sécurisé
const date = new Date(dateString);
// Peut être une date invalide

// ✅ Sécurisé
const date = safeDate(dateString);
// Garantit une date valide
```

### Calculs Financiers
```typescript
// ❌ Recalculé à chaque render
function Component() {
  const metrics = calculateFinancialMetrics(investment);
  // ...
}

// ✅ Avec memoization
function Component() {
  const metrics = useFinancialMetrics(investment);
  // Recalculé uniquement si investment change
}
```

---

## 6. 🚀 Migration du Code Existant

### Étape 1: Remplacer console par logger
```bash
# Rechercher tous les console.log
grep -r "console.log" src/

# Les remplacer par logger.debug
```

### Étape 2: Ajouter la validation
```typescript
// Avant
const total = Number(price) + Number(tax);

// Après
import { safeAmount, toFixed } from '../utils/validation';
const total = toFixed(safeAmount(price) + safeAmount(tax));
```

### Étape 3: Utiliser les hooks
```typescript
// Avant
const [value, setValue] = useState(defaultValue);

useEffect(() => {
  const stored = localStorage.getItem('key');
  if (stored) setValue(JSON.parse(stored));
}, []);

useEffect(() => {
  localStorage.setItem('key', JSON.stringify(value));
}, [value]);

// Après
import { useLocalStorageSync } from '../hooks/useLocalStorageSync';
const [value, setValue] = useLocalStorageSync('key', defaultValue);
```

### Note Importante
Certaines pages (GlobalProfitability, Analysis) sont temporairement désactivées suite au refactoring et seront réactivées dans une prochaine version avec de meilleures fonctionnalités.

---

## 7. ⚠️ Points d'Attention

### Logger
- Les logs `debug` ne s'affichent qu'en développement
- Utilisez `info` pour les logs importants en production
- Toujours passer les données en objet : `logger.debug('msg', { data })`

### Validation
- `safeAmount` retourne toujours un nombre ≥ 0
- `safeNumber` peut retourner la valeur par défaut si invalide
- Testez toujours avec des valeurs limites

### Hooks
- `useFinancialMetrics` a des dépendances optimisées
- Ne pas passer des objets recréés à chaque render
- Utiliser `useMemo` si nécessaire pour stabiliser les props

---

## 8. 📖 Exemples Complets

### Composant avec Validation et Logging
```typescript
import { useState } from 'react';
import { logger } from '../utils/logger';
import { safeAmount, toFixed } from '../utils/validation';
import { useFinancialMetrics } from '../hooks/useFinancialMetrics';

function InvestmentCalculator({ investment }) {
  const [customAmount, setCustomAmount] = useState(0);
  const metrics = useFinancialMetrics(investment);

  const handleCalculate = () => {
    try {
      const amount = safeAmount(customAmount);
      const result = toFixed(amount * metrics.grossYield / 100);
      
      logger.info('Calcul effectué', { amount, result });
      
      return result;
    } catch (error) {
      logger.error('Erreur de calcul', error);
      return 0;
    }
  };

  return (
    <div>
      <input 
        type="number"
        value={customAmount}
        onChange={(e) => setCustomAmount(Number(e.target.value))}
      />
      <button onClick={handleCalculate}>Calculer</button>
    </div>
  );
}
```

### Hook Personnalisé avec Validation
```typescript
import { useState, useCallback } from 'react';
import { safeAmount } from '../utils/validation';
import { logger } from '../utils/logger';

function useInvestmentAmount(initialAmount = 0) {
  const [amount, setAmount] = useState(safeAmount(initialAmount));

  const updateAmount = useCallback((newAmount: unknown) => {
    const validated = safeAmount(newAmount);
    logger.debug('Montant mis à jour', { from: amount, to: validated });
    setAmount(validated);
  }, [amount]);

  return [amount, updateAmount] as const;
}
```

---

## 9. ❓ FAQ

### Q: Pourquoi utiliser logger au lieu de console ?
**R:** Le logger permet de :
- Désactiver les logs en production (performance)
- Avoir un formatage uniforme avec timestamps
- Filtrer par niveau (debug/info/warn/error)
- Tracer plus facilement les problèmes

### Q: Que se passe-t-il si safeAmount reçoit une valeur négative ?
**R:** Elle retourne 0 (la valeur par défaut pour un montant).

### Q: useFinancialMetrics recalcule-t-il à chaque render ?
**R:** Non ! Il utilise useMemo et ne recalcule que si les propriétés pertinentes de l'investment changent.

### Q: Puis-je désactiver complètement le logger ?
**R:** Oui, appelez `logger.disable()`. Pour réactiver : `logger.enable()`.

### Q: Comment changer le niveau minimum de log ?
**R:** Utilisez `logger.setMinLevel('info')` pour n'afficher que info, warn et error.

---

## ✅ Checklist de Migration

- [ ] Remplacer tous les `console.log` par `logger.debug`
- [ ] Remplacer tous les `console.error` par `logger.error`
- [ ] Ajouter la validation dans les fonctions de calcul
- [ ] Utiliser `useFinancialMetrics` pour les métriques
- [ ] Utiliser `useLocalStorageSync` pour la synchronisation
- [ ] Tester avec des valeurs limites (0, négatif, NaN, undefined)
- [ ] Vérifier les types TypeScript (pas de `any`)
- [ ] Vérifier que les logs ne s'affichent pas en production

---

**Besoin d'aide ?** Consultez les fichiers d'exemple dans le projet ou référez-vous à `ANALYSE_CODE.md` et `RAPPORT_AMELIORATIONS.md`.


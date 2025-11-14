# Correctif : Calculs de rentabilité SCI

## Problèmes identifiés

Après la première implémentation de la vue de rentabilité SCI, deux problèmes ont été identifiés :

1. **Les coûts du prêt n'étaient pas reportés** dans les colonnes du tableau
2. **Le prorata temporel** n'était pas appliqué aux années incomplètes

## Solutions apportées

### 1. Calcul dynamique des coûts du prêt

**Avant** : On utilisait directement `yearExpense?.loanPayment` et `yearExpense?.loanInsurance`

**Problème** : Ces valeurs peuvent être absentes ou incorrectes dans les données stockées

**Maintenant** : On utilise `getLoanInfoForYear()` qui calcule dynamiquement les coûts en fonction du tableau d'amortissement

```typescript
// Coûts du prêt (calculés dynamiquement avec prorata automatique)
const loanInfo = getLoanInfoForYear(investment, year);
const loanCosts = loanInfo.payment + loanInfo.insurance;
```

**Avantages** :
- ✅ Calculs toujours cohérents avec le tableau d'amortissement
- ✅ Prise en compte automatique des différés
- ✅ Gestion automatique des années partielles

### 2. Application du prorata temporel

**Avant** : Les montants des années incomplètes étaient affichés en valeur annuelle complète

**Problème** : 
- Une année qui ne couvre que 6 mois affichait 12 mois de loyers et charges
- Les calculs de rentabilité étaient faussés

**Maintenant** : On applique le prorata à tous les montants

```typescript
// Calculer le prorata temporel de l'année
const coverage = getYearCoverage(investment, year);

// Appliquer le prorata aux revenus
const rent = adjustForCoverage(Number(yearExpense?.rent || 0), coverage);
const furnishedRent = adjustForCoverage(Number(yearExpense?.furnishedRent || 0), coverage);

// Appliquer le prorata aux charges
const managementCharges = 
  adjustForCoverage(Number(yearExpense?.propertyTax || 0), coverage) +
  adjustForCoverage(Number(yearExpense?.condoFees || 0), coverage) +
  // ... etc
```

**Fonction ajoutée** :
```typescript
/**
 * Ajuste une valeur selon le prorata temporel de l'année
 * Pour les années incomplètes (première et dernière année du projet),
 * seule la période effective est prise en compte.
 */
const adjustForCoverage = (value: number, coverage: number): number => {
  return value * coverage;
};
```

### 3. Cohérence dans tout le composant

Les modifications ont été appliquées à :
1. **Le tableau de rentabilité** (`renderProfitabilityTable`)
2. **Les graphiques** (`prepareChartData`)

Cela garantit que les valeurs affichées sont cohérentes partout.

## Fichiers modifiés

### `src/components/SCIResultsDisplay.tsx`

#### Imports ajoutés
```typescript
import { getLoanInfoForYear, getYearCoverage } from '../utils/propertyCalculations';
```

#### Fonction ajoutée
```typescript
const adjustForCoverage = (value: number, coverage: number): number => {
  return value * coverage;
};
```

#### Fonction supprimée
L'ancienne fonction `calculateTotalCharges` a été supprimée car elle ne prenait pas en compte :
- Le prorata temporel
- Les coûts du prêt calculés dynamiquement

## Exemple de calcul

### Année complète (2026)

**Données** :
- Durée : 12 mois (coverage = 1.0)
- Loyer annuel : 12 000 €
- Charges annuelles : 3 000 €
- Remboursement prêt : 8 000 €
- Assurance : 400 €

**Calculs** :
- Loyer affiché = 12 000 € × 1.0 = **12 000 €**
- Charges affichées = 3 000 € × 1.0 = **3 000 €**
- Coûts prêt = 8 000 € + 400 € = **8 400 €**

### Année partielle - Début (2025)

**Données** :
- Projet démarre le 14/11/2025
- Durée : 1.5 mois (coverage = 0.125)
- Loyer annuel : 12 000 €
- Charges annuelles : 3 000 €
- Remboursement prêt calculé sur 1.5 mois

**Calculs** :
- Loyer affiché = 12 000 € × 0.125 = **1 500 €**
- Charges affichées = 3 000 € × 0.125 = **375 €**
- Coûts prêt = calculés sur 1.5 mois réels = **~1 050 €**

### Année partielle - Fin (2045)

**Données** :
- Projet finit le 14/11/2045
- Durée : 10.5 mois (coverage = 0.875)
- Loyer annuel : 12 000 €
- Charges annuelles : 3 000 €

**Calculs** :
- Loyer affiché = 12 000 € × 0.875 = **10 500 €**
- Charges affichées = 3 000 € × 0.875 = **2 625 €**
- Coûts prêt = calculés sur 10.5 mois réels = **~7 350 €**

## Impact sur les calculs de rentabilité

### Rentabilité brute
```
Rentabilité brute = (Revenus bruts avec prorata / Coût total) × 100
```

Le prorata est appliqué aux revenus, ce qui donne une rentabilité plus réaliste pour les années partielles.

### Rentabilité hors impôts
```
Rentabilité hors impôts = ((Revenus avec prorata - Charges avec prorata - Coûts prêt réels) / Coût total) × 100
```

Le prorata est appliqué à tous les éléments, donnant une image fidèle de la rentabilité réelle de chaque année.

## Tests recommandés

### Test 1 : Coûts du prêt
1. Créer un bien en SCI avec un prêt
2. Aller dans "Rentabilité"
3. Vérifier que la colonne "Coûts prêt" affiche des valeurs non nulles
4. Comparer avec le tableau d'amortissement dans "Acquisition"

### Test 2 : Année complète
1. Regarder une année complète (ni première ni dernière)
2. Vérifier que :
   - Les revenus correspondent aux valeurs annuelles saisies
   - Les charges correspondent aux valeurs annuelles
   - Les coûts prêt correspondent à 12 mensualités

### Test 3 : Première année partielle
1. Créer un bien qui démarre en cours d'année (ex: 14/11/2025)
2. Regarder l'année 2025
3. Vérifier que :
   - Les revenus sont au prorata (~1.5 mois)
   - Les charges sont au prorata
   - Les coûts prêt correspondent à ~1.5 mensualités

### Test 4 : Dernière année partielle
1. Regarder la dernière année du projet
2. Vérifier que les montants sont au prorata de la durée effective

### Test 5 : Graphiques
1. Vérifier que les courbes des graphiques suivent la même logique
2. Les valeurs affichées au survol doivent correspondre au tableau

## Cohérence avec les autres vues

Ce correctif assure la cohérence avec :
- ✅ L'onglet **Imposition** (qui utilait déjà le prorata)
- ✅ L'onglet **Bilan** (qui utilise aussi le prorata)
- ✅ L'onglet **Cashflow** (qui calcule dynamiquement)

## Notes techniques

### Fonction `getYearCoverage()`
Cette fonction, définie dans `src/utils/propertyCalculations.ts`, calcule le pourcentage de couverture d'une année en fonction des dates de début et fin du projet.

**Retourne** : Un nombre entre 0 et 1
- 0.125 = ~1.5 mois
- 0.5 = 6 mois
- 1.0 = 12 mois complets

### Fonction `getLoanInfoForYear()`
Cette fonction calcule dynamiquement les coûts du prêt pour une année donnée en :
1. Générant le tableau d'amortissement complet
2. Filtrant les lignes de l'année concernée
3. Sommant les paiements et assurances
4. **Appliquant automatiquement** le prorata temporel

**Retourne** : `{ payment: number, insurance: number }`

## Conclusion

Ces correctifs garantissent que :
- ✅ Les coûts du prêt sont toujours affichés et corrects
- ✅ Les années partielles sont calculées au prorata
- ✅ Les calculs sont cohérents dans tout le composant
- ✅ L'affichage reflète la réalité économique du bien

La vue de rentabilité SCI est maintenant **complète et précise** ! 🎉


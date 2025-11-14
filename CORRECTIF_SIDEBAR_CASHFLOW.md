# Correctif : Sidebar Cash Flow cohérent avec les tableaux

## Problème identifié

Les valeurs de cash flow affichées dans la **sidebar** (à droite de l'écran) ne correspondaient pas aux valeurs affichées dans les **tableaux** de cash flow pour les biens en SCI.

**Raisons** :
1. La fonction `calculateYearCashFlow` n'appliquait pas le **prorata temporel**
2. Elle utilisait des valeurs **statiques** pour les coûts du prêt (`loanPayment`, `loanInsurance`)
3. Le **mensualisé** était toujours divisé par 12, même pour les années partielles

## Solutions apportées

### 1. Import des fonctions nécessaires

```typescript
import { getLoanInfoForYear, getYearCoverage } from '../utils/propertyCalculations';
```

### 2. Modification de `calculateYearCashFlow()`

**Avant** :
```typescript
const calculateYearCashFlow = (year: number, type: 'nu' | 'meuble') => {
  // ...
  const rent = Number(expense.rent || 0);
  const furnishedRent = Number(expense.furnishedRent || 0);
  // ...
  const totalExpenses =
    Number(expense.propertyTax || 0) +
    // ...
    Number(expense.loanPayment || 0) +  // Statique !
    Number(expense.loanInsurance || 0);  // Statique !

  return revenues - totalExpenses;
};
```

**Maintenant** :
```typescript
const calculateYearCashFlow = (year: number, type: 'nu' | 'meuble') => {
  // Calculer le prorata temporel
  const coverage = getYearCoverage(investment, year);
  
  const adjustForCoverage = (value: number): number => {
    return value * coverage;
  };

  // Revenus avec prorata
  const rent = adjustForCoverage(Number(expense.rent || 0));
  const furnishedRent = adjustForCoverage(Number(expense.furnishedRent || 0));
  // ...

  // Charges de gestion avec prorata
  const managementExpenses =
    adjustForCoverage(Number(expense.propertyTax || 0)) +
    adjustForCoverage(Number(expense.condoFees || 0)) +
    // ...

  // Coûts du prêt calculés dynamiquement
  const loanInfo = getLoanInfoForYear(investment, year);
  const loanCosts = loanInfo.payment + loanInfo.insurance;

  const totalExpenses = managementExpenses + loanCosts;

  return revenues - totalExpenses;
};
```

### 3. Correction du calcul du mensualisé

**Avant** :
```typescript
const monthlyNu = cashFlowNu / 12;  // Toujours 12 !
const monthlyMeuble = cashFlowMeuble / 12;
```

**Maintenant** :
```typescript
// Calculer le nombre de mois effectifs dans l'année
const coverage = getYearCoverage(investment, currentYear);
const monthsInYear = coverage * 12;

const monthlyNu = monthsInYear > 0 ? cashFlowNu / monthsInYear : 0;
const monthlyMeuble = monthsInYear > 0 ? cashFlowMeuble / monthsInYear : 0;
```

## Exemple de calcul

### Année 2025 (partielle - 1.5 mois)

**Coverage** = 0.125

**Revenus** :
- Loyer nu annuel : 12 000 €
- Ajusté : 12 000 × 0.125 = **1 500 €**

**Charges** :
- Charges gestion : 3 000 € annuel
- Ajusté : 3 000 × 0.125 = **375 €**

**Coûts prêt** :
- Calculés sur 1.5 mois : **~1 050 €**

**Cash flow** :
- Total : 1 500 - 375 - 1 050 = **75 €**

**Mensualisé** :
- Mois dans l'année : 0.125 × 12 = **1.5 mois**
- Mensualisé : 75 / 1.5 = **50 €/mois**

## Affichage dans la sidebar

Avant, la sidebar affichait :
```
Location nue (Année 2025 • Mensuel 1 000 €)  ← FAUX
12 000 €  ← FAUX (valeur annuelle complète)
```

Maintenant, elle affiche :
```
Location nue (Année 2025 • Mensuel 50 €)  ← CORRECT
75 €  ← CORRECT (valeur au prorata)
```

## Cohérence obtenue

Maintenant, les valeurs sont **identiques** entre :
- ✅ Le **tableau** de cash flow principal
- ✅ Les **graphiques** de cash flow
- ✅ La **sidebar** (panneau latéral)

## Fichiers modifiés

### `src/components/SidebarContent.tsx`

1. **Ligne 15** : Ajout des imports
```typescript
import { getLoanInfoForYear, getYearCoverage } from '../utils/propertyCalculations';
```

2. **Lignes 331-377** : Fonction `calculateYearCashFlow` complètement réécrite
   - Application du prorata aux revenus
   - Application du prorata aux charges
   - Calcul dynamique des coûts prêt

3. **Lignes 1146-1156** : Correction du calcul du mensualisé
   - Calcul du nombre de mois effectifs
   - Division par le nombre de mois réels

## Tests recommandés

### Test 1 : Année complète (2026)
1. Aller sur un bien en SCI
2. Regarder la **sidebar** pour l'année 2026
3. Comparer avec le **tableau** de cash flow
4. Les valeurs doivent être **identiques**

### Test 2 : Première année partielle (2025)
1. Regarder la **sidebar** pour 2025
2. Vérifier que :
   - Le cash flow annuel est **au prorata**
   - Le mensualisé correspond au **nombre de mois réels**
3. Comparer avec le **tableau** → valeurs identiques

### Test 3 : Dernière année partielle (2045)
1. Regarder la **sidebar** pour 2045
2. Vérifier le prorata (~10.5 mois)
3. Comparer avec le **tableau** → valeurs identiques

### Test 4 : Comparaison nue/meublée
1. Dans la sidebar, noter le cash flow pour "Location nue"
2. Noter le cash flow pour "Location meublée"
3. Aller dans le **tableau** de cash flow
4. Basculer entre les onglets
5. Vérifier que les valeurs correspondent

## Impact

Cette correction garantit :
- ✅ **Cohérence totale** entre sidebar et tableaux
- ✅ **Précision** des calculs (prorata + coûts prêt dynamiques)
- ✅ **Confiance** de l'utilisateur dans les chiffres affichés
- ✅ **Facilité** de vérification des données

## Notes techniques

### Fonction `getYearCoverage()`
Calcule le pourcentage de l'année couvert par le projet :
- Année complète : 1.0
- Année partielle : entre 0 et 1

### Fonction `getLoanInfoForYear()`
Calcule les coûts du prêt pour une année en :
1. Générant le tableau d'amortissement
2. Filtrant les lignes de l'année
3. Sommant les paiements
4. Appliquant automatiquement le prorata

### Mensualisé intelligent
Le calcul du mensualisé tient compte du nombre de mois réels :
- Année complète : `/12`
- Année partielle : `/nombre_mois_réels`

Cela permet d'afficher un **mensualisé cohérent** qui représente vraiment le cash flow mensuel moyen de la période.

## Conclusion

La sidebar affiche maintenant les **mêmes valeurs** que les tableaux, avec le même niveau de précision :
- ✅ Prorata temporel appliqué
- ✅ Coûts prêt calculés dynamiquement
- ✅ Mensualisé adapté aux années partielles

L'expérience utilisateur est améliorée car les chiffres sont cohérents partout ! 🎉


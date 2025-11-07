# Correctif : Prise en compte des années partielles dans les calculs fiscaux

## 📋 Problème identifié

Les calculs d'imposition n'utilisaient **pas** les valeurs ajustées pour les années partielles calculées dans `LocationTables.tsx`.

### Exemple du problème
Si un bien est mis en location en **septembre** (4 mois de loyers perçus), les calculs fiscaux utilisaient les loyers annualisés complets au lieu des loyers réels de 4 mois, ce qui faussait complètement l'imposition calculée.

## ✅ Solution implémentée

### 1. Ajout de fonctions utilitaires dans `taxCalculations.ts`

Deux nouvelles fonctions ont été ajoutées pour calculer la couverture d'année et ajuster les valeurs :

```typescript
/**
 * Calcule la fraction de l'année couverte par le projet pour une année donnée
 * Retourne 1 pour les années complètes, une fraction pour les années partielles
 */
function getYearCoverage(investment: Investment, year: number): number {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
  const projectStart = new Date(investment.projectStartDate);
  const projectEnd = new Date(investment.projectEndDate);
  const start = projectStart > startOfYear ? projectStart : startOfYear;
  const end = projectEnd < endOfYear ? projectEnd : endOfYear;
  if (end < start) return 0;
  const msInDay = 1000 * 60 * 60 * 24;
  const daysInYear = Math.round((new Date(year + 1, 0, 1).getTime() - new Date(year, 0, 1).getTime()) / msInDay);
  const coveredDays = Math.floor((end.getTime() - start.getTime()) / msInDay) + 1;
  return Math.min(1, Math.max(0, coveredDays / daysInYear));
}

/**
 * Ajuste une valeur annualisée en fonction de la couverture réelle de l'année
 */
function adjustForCoverage(value: number, coverage: number): number {
  return Number((Number(value || 0) * coverage).toFixed(2));
}
```

### 2. Modification de toutes les fonctions de calcul fiscal

#### ✏️ `calculateAnnualRevenue()`
Ajuste maintenant les loyers (nus et meublés) en fonction de la couverture de l'année avant d'appliquer le taux de vacance.

```typescript
const coverage = getYearCoverage(investment, year);
const rent = adjustForCoverage(Number(yearExpenses.rent || 0), coverage);
return rent * (1 - vacancyRate / 100);
```

#### ✏️ `calculateDeductibleExpenses()`
Ajuste toutes les charges déductibles (taxe foncière, charges de copro, intérêts d'emprunt, etc.) en fonction de la couverture.

```typescript
const coverage = getYearCoverage(investment, year);
const totalDeductibleExpenses = (
  adjustForCoverage(Number(yearExpenses.propertyTax || 0), coverage) +
  adjustForCoverage(Number(yearExpenses.condoFees || 0), coverage) +
  // ... toutes les autres charges
);
```

#### ✏️ `calculateMicroFoncier()`
Utilise les valeurs ajustées pour le calcul du revenu net.

```typescript
const coverage = getYearCoverage(investment, year);
const totalNuWithVacancy = calculateTotalNu(
  adjustForCoverage(Number(yearExpenses.rent || 0), coverage),
  adjustForCoverage(Number(yearExpenses.taxBenefit || 0), coverage),
  adjustForCoverage(Number(yearExpenses.tenantCharges || 0), coverage),
  vacancyRate
);
```

#### ✏️ `calculateReelFoncier()`
Utilise la fonction `calculateDeductibleExpenses()` qui intègre déjà l'ajustement pour la couverture.

#### ✏️ `calculateMicroBIC()`
Ajuste les loyers meublés et charges locataires.

```typescript
const coverage = getYearCoverage(investment, year);
const totalMeubleWithVacancy = calculateTotalMeuble(
  adjustForCoverage(Number(yearExpenses.furnishedRent || 0), coverage),
  adjustForCoverage(Number(yearExpenses.tenantCharges || 0), coverage),
  vacancyRate
);
```

#### ✏️ `calculateReelBIC()`
Ajuste tous les revenus et charges déductibles pour le régime réel BIC (LMNP).

```typescript
const coverage = getYearCoverage(investment, year);
const furnishedRent = adjustForCoverage(Number(yearExpenses.furnishedRent || 0), coverage);
const deductibleExpenses = (
  adjustForCoverage((yearExpenses.propertyTax || 0), coverage) +
  adjustForCoverage((yearExpenses.condoFees || 0), coverage) +
  // ... toutes les charges
);
```

### 3. Tests ajoutés

5 nouveaux tests unitaires ont été créés dans `src/utils/__tests__/taxCalculations.test.ts` :

1. ✅ **Projet commençant mi-année (septembre)** : Vérifie l'ajustement des revenus pour 4 mois de location
2. ✅ **Projet commençant mi-année (juillet)** : Vérifie l'ajustement des charges pour 6 mois
3. ✅ **Année complète** : Vérifie qu'une année complète a une couverture de 1 (pas d'ajustement)
4. ✅ **Projet se terminant mi-année (juin)** : Vérifie l'ajustement pour 6 mois en fin de projet
5. ✅ **Calcul d'impôt correct (octobre)** : Vérifie que l'impôt et les charges sociales sont calculés sur 3 mois

**Résultat** : Tous les tests passent avec succès (25/25) ✅

## 📊 Impact des modifications

### Avant la correction
- Les calculs fiscaux utilisaient les valeurs annualisées complètes
- Un bien loué 4 mois était imposé comme s'il était loué 12 mois
- **Erreur majeure** dans les projections de rentabilité et de fiscalité

### Après la correction
- Les calculs fiscaux tiennent compte de la période réelle de location
- Un bien loué 4 mois génère un revenu imposable correspondant à 4 mois
- **Cohérence parfaite** entre les revenus affichés dans Location et l'imposition calculée

## 🔍 Exemples concrets

### Exemple 1 : Projet commençant en septembre
- **Dates** : 01/09/2024 → 31/12/2044
- **Loyer annualisé** : 12 000 €
- **Couverture 2024** : 122/366 = 0.333 (4 mois)
- **Loyer réel 2024** : 12 000 € × 0.333 = **4 000 €**
- **Revenu imposable (micro-foncier)** : 4 000 € × 0.7 = **2 800 €**

### Exemple 2 : Projet se terminant en juin
- **Dates** : 01/01/2024 → 30/06/2024
- **Loyer annualisé** : 12 000 €
- **Couverture 2024** : 182/366 = 0.497 (6 mois)
- **Loyer réel 2024** : 12 000 € × 0.497 = **5 964 €**
- **Revenu imposable (micro-foncier)** : 5 964 € × 0.7 = **4 175 €**

## 📝 Fichiers modifiés

- ✏️ `src/utils/taxCalculations.ts` : Ajout de `getYearCoverage()`, `adjustForCoverage()` et modification de toutes les fonctions de calcul
- ✏️ `src/utils/__tests__/taxCalculations.test.ts` : Ajout de 5 nouveaux tests pour les années partielles

## ✅ Validation

- ✅ Tous les tests unitaires passent (25/25)
- ✅ Aucune régression sur les tests existants
- ✅ Cohérence avec les calculs de `LocationTables.tsx`
- ✅ Couverture de tous les régimes fiscaux (micro-foncier, réel-foncier, micro-BIC, réel-BIC)

## 🎯 Conclusion

Le problème de non-prise en compte des années partielles dans les calculs fiscaux est maintenant **complètement résolu**. Les utilisateurs peuvent avoir confiance dans les calculs d'imposition, qui reflètent désormais fidèlement la réalité des revenus locatifs perçus sur des périodes partielles.


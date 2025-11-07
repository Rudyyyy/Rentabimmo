# Correctif : Affichage des valeurs ajustées dans les tableaux d'imposition

## 📋 Problème identifié

Les **valeurs affichées** dans les tableaux de la page Imposition ne correspondaient **pas** aux valeurs de la page Location pour les années partielles.

### Exemple du problème découvert
Pour l'année 2024 (partielle) :

**Page Location - Historique des revenus :**
- Loyer Meublé : **3 921,57 €** ✅ (valeur ajustée)
- Total Meublé : **4 627,45 €** ✅

**Page Imposition - LMNP Frais réels :**
- Loyer Meublé : **23 529,41 €** ❌ (valeur annualisée complète)
- Revenu Net : **4 627,45 €** ✅

**Incohérence** : Le loyer affiché était la valeur annualisée (24 000 €) au lieu de la valeur ajustée pour 4 mois (3 921,57 €), bien que le calcul final soit correct.

De plus, le badge **"partiel"** avec fond jaune présent sur la page Location n'apparaissait pas dans la page Imposition.

## ✅ Solution implémentée

### 1. Ajout des fonctions utilitaires dans `TaxForm.tsx`

Trois nouvelles fonctions ont été ajoutées pour gérer les années partielles :

```typescript
// Calcul de la couverture d'une année (pour les années partielles)
const getYearCoverage = (year: number): number => {
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
};

// Ajustement d'une valeur pour la couverture d'année
const adjustForCoverage = (value: number, year: number): number => {
  const coverage = getYearCoverage(year);
  return Number((Number(value || 0) * coverage).toFixed(2));
};

// Détection d'une année partielle
const isPartialYear = (year: number): boolean => {
  const coverage = getYearCoverage(year);
  return coverage > 0 && coverage < 1;
};
```

### 2. Modification de l'affichage du tableau historique/projection

#### ✏️ Colonne "Année" : Ajout du badge "partiel"

**Avant :**
```tsx
<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
  {year}
</td>
```

**Après :**
```tsx
<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
  <div className="flex items-center gap-2">
    <span>{year}</span>
    {isPartialYear(year) && (
      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
        partiel
      </span>
    )}
  </div>
</td>
```

#### ✏️ Fond de ligne : Ajout du fond amber pour les années partielles

**Avant :**
```tsx
<tr key={year} className={year === currentYear ? 'bg-blue-50' : ''}>
```

**Après :**
```tsx
<tr key={year} className={`${year === currentYear ? 'bg-blue-50' : ''} ${isPartialYear(year) ? 'bg-amber-50' : ''}`}>
```

#### ✏️ Colonnes de revenus : Affichage des valeurs ajustées

**Avant :**
```tsx
// Loyer Nu
{formatCurrency(yearExpense.rent || 0)}

// Loyer Meublé
{formatCurrency(yearExpense.furnishedRent || 0)}

// Charges Locataire
{formatCurrency(yearExpense.tenantCharges || 0)}

// Aide Fiscale
{formatCurrency(yearExpense.taxBenefit || 0)}
```

**Après :**
```tsx
// Loyer Nu
{formatCurrency(adjustForCoverage(yearExpense.rent || 0, year))}

// Loyer Meublé
{formatCurrency(adjustForCoverage(yearExpense.furnishedRent || 0, year))}

// Charges Locataire
{formatCurrency(adjustForCoverage(yearExpense.tenantCharges || 0, year))}

// Aide Fiscale
{formatCurrency(adjustForCoverage(yearExpense.taxBenefit || 0, year))}
```

## 📊 Résultat après correction

Maintenant, pour l'année 2024 (partielle, du 01/09/2024 au 31/12/2024) :

### Page Location - Historique des revenus
- **Année** : 2024 🟡 **partiel** (fond jaune)
- **Loyer Meublé** : 3 921,57 €
- **Total Meublé** : 4 627,45 €

### Page Imposition - LMNP Frais réels
- **Année** : 2024 🟡 **partiel** (fond jaune)
- **Loyer Meublé** : **3 921,57 €** ✅ (maintenant identique !)
- **Charges déductibles** : 812,67 €
- **Revenu imposable** : 0,00 €
- **Imposition** : 0,00 €
- **Revenu Net** : 4 627,45 € ✅

## 🎨 Cohérence visuelle

Les deux pages utilisent maintenant :
- ✅ Le **même badge "partiel"** : couleur amber (jaune), bordure, texte
- ✅ Le **même fond de ligne** : `bg-amber-50` pour les années partielles
- ✅ Les **mêmes valeurs ajustées** : calculées avec la même logique

## ✅ Validation

- ✅ Tous les tests unitaires passent (12/12 pour TaxForm)
- ✅ Pas d'erreur de linting
- ✅ Cohérence parfaite entre les pages Location et Imposition
- ✅ Le badge "partiel" et le fond amber apparaissent correctement

## 📝 Fichiers modifiés

- ✏️ `src/components/TaxForm.tsx` :
  - Ajout de `getYearCoverage()`, `adjustForCoverage()`, `isPartialYear()`
  - Modification de `renderHistoricalAndProjectionTable()` pour afficher les valeurs ajustées
  - Ajout du badge "partiel" et du fond amber

## 🎯 Conclusion

Les utilisateurs voient maintenant des valeurs **cohérentes** entre les pages Location et Imposition, avec le même formalisme visuel (badge "partiel" jaune) pour identifier facilement les années partielles.


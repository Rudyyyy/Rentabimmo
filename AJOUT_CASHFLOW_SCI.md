# Ajout de la vue Cash Flow pour les biens en SCI

## Vue d'ensemble

Suite à l'implémentation de la vue de rentabilité spécifique pour les SCI, la même logique a été appliquée à la vue **Cash Flow**.

## Nouveautés

### 1. Nouveau composant `SCICashFlowDisplay`

Un composant dédié pour afficher le cash flow des biens en SCI avec :
- **2 onglets seulement** : Location nue / Location meublée
- **Pas de régimes fiscaux IRPP** (micro-foncier, LMNP, etc.)
- **Inclusion automatique des coûts du prêt**
- **Application du prorata temporel**

### 2. Différences avec `CashFlowDisplay` (nom propre)

| Caractéristique | Nom propre | SCI |
|----------------|------------|-----|
| Onglets | 4 (régimes fiscaux) | 2 (nue/meublée) |
| Coûts prêt | Statiques | Dynamiques (getLoanInfoForYear) |
| Prorata temporel | Non | Oui |
| Imposition | Incluse (optionnel) | Hors calcul (IS au niveau SCI) |

## Fonctionnement

### Calcul des revenus

```typescript
// Calculer le prorata temporel
const coverage = getYearCoverage(investment, year);

// Appliquer le prorata aux revenus
const rent = adjustForCoverage(Number(yearExpense.rent || 0), coverage);
const furnishedRent = adjustForCoverage(Number(yearExpense.furnishedRent || 0), coverage);
const taxBenefit = adjustForCoverage(Number(yearExpense.taxBenefit || 0), coverage);
const tenantCharges = adjustForCoverage(Number(yearExpense.tenantCharges || 0), coverage);

const revenues = rentalType === 'furnished'
  ? furnishedRent + tenantCharges
  : rent + taxBenefit + tenantCharges;
```

### Calcul des dépenses

```typescript
// Charges de gestion avec prorata
const managementExpenses = 
  adjustForCoverage(Number(yearExpense.propertyTax || 0), coverage) +
  adjustForCoverage(Number(yearExpense.condoFees || 0), coverage) +
  // ... autres charges ...

// Coûts du prêt calculés dynamiquement
const loanInfo = getLoanInfoForYear(investment, year);
const loanCosts = loanInfo.payment + loanInfo.insurance;

const totalExpenses = managementExpenses + loanCosts;
```

### Calcul du cash flow

```typescript
const cashFlow = revenues - totalExpenses;
```

> **Note** : Pas d'imposition dans le cash flow SCI. L'IS est calculé au niveau de la SCI sur tous ses biens.

### Cash flow mensualisé

Pour les années partielles, le calcul du mensualisé tient compte du nombre de mois réels :

```typescript
const monthsInYear = coverage * 12;
const monthlyCashFlow = monthsInYear > 0 ? cashFlow / monthsInYear : 0;
```

**Exemple** :
- Année complète : 12 000 € / 12 mois = **1 000 €/mois**
- Année partielle (1.5 mois) : 1 500 € / 1.5 mois = **1 000 €/mois**

## Structure du tableau

| Année | Revenus | Dépenses | Cash Flow Net | Mensualisé |
|-------|---------|----------|---------------|------------|
| 2025 | 1 500 € | 1 050 € | 450 € | 300 €/mois |
| 2026 | 12 000 € | 11 400 € | 600 € | 50 €/mois |
| ... | ... | ... | ... | ... |

### Colonnes

1. **Année** : Année civile du projet
2. **Revenus** : Loyers + Aide fiscale + Charges locataires (avec prorata)
3. **Dépenses** : Charges de gestion + Coûts prêt (avec prorata)
4. **Cash Flow Net** : Revenus - Dépenses
5. **Mensualisé** : Cash flow / nombre de mois effectifs

## Graphique

Le graphique affiche **2 courbes** (vs 4 pour les biens en nom propre) :
- **Location nue** (bleu)
- **Location meublée** (orange)

Chaque point représente le cash flow net de l'année.

## Bannière d'information

Une bannière bleue apparaît en haut pour informer l'utilisateur :

```
ℹ️ Bien détenu en SCI à l'IS - Le cash flow est calculé hors imposition. 
L'IS sera calculé au niveau de la SCI sur l'ensemble de ses biens.
```

## Intégration dans PropertyForm

Le composant est utilisé conditionnellement :

```typescript
} else if (currentSubTab === 'cashflow') {
  return investmentData.sciId ? (
    <SCICashFlowDisplay
      investment={investmentData}
    />
  ) : (
    <CashFlowDisplay
      investment={investmentData}
    />
  );
}
```

- **Si `sciId` existe** → `SCICashFlowDisplay` (vue SCI)
- **Sinon** → `CashFlowDisplay` (vue nom propre)

## Section explicative

En bas du tableau, une section détaille les calculs :

### Revenus
- Location meublée : Loyer meublé + Charges locataires
- Location nue : Loyer nu + Aide fiscale + Charges locataires
- Ajustés au prorata temporel pour les années incomplètes

### Dépenses
Liste complète incluant :
- Charges de gestion courante
- **Remboursement du prêt** (souligné)
- **Assurance emprunteur** (souligné)

### Cash Flow Net
`Revenus - Dépenses (hors imposition)`

Note sur l'IS calculé au niveau de la SCI.

### Mensualisé
`Cash Flow Net / Nombre de mois effectifs`

Explication de la différence entre années complètes et partielles.

## Exemples de calculs

### Année complète (2026)

**Données** :
- Durée : 12 mois (coverage = 1.0)
- Loyer nu annuel : 12 000 €
- Aide fiscale : 2 000 €
- Charges locataires : 1 200 €
- Charges gestion : 3 000 €
- Remboursement prêt : 8 000 €
- Assurance : 400 €

**Calculs** :
- Revenus = (12 000 + 2 000 + 1 200) × 1.0 = **15 200 €**
- Dépenses = (3 000 × 1.0) + 8 000 + 400 = **11 400 €**
- Cash flow = 15 200 - 11 400 = **3 800 €**
- Mensualisé = 3 800 / 12 = **316,67 €/mois**

### Année partielle (2025) - 1.5 mois

**Données** :
- Durée : 1.5 mois (coverage = 0.125)
- Loyer nu annuel : 12 000 €
- Aide fiscale : 2 000 €
- Charges locataires : 1 200 €
- Charges gestion : 3 000 €
- Prêt calculé sur 1.5 mois

**Calculs** :
- Revenus = (12 000 + 2 000 + 1 200) × 0.125 = **1 900 €**
- Charges gestion = 3 000 × 0.125 = **375 €**
- Coûts prêt (1.5 mois) ≈ **1 050 €**
- Dépenses = 375 + 1 050 = **1 425 €**
- Cash flow = 1 900 - 1 425 = **475 €**
- Mensualisé = 475 / 1.5 = **316,67 €/mois**

> **Note** : Le mensualisé est identique car il est calculé sur le nombre de mois réels.

## Fichiers créés/modifiés

### Créé
- ✅ `src/components/SCICashFlowDisplay.tsx` (374 lignes)

### Modifiés
- ✅ `src/components/PropertyForm.tsx`
  - Import de `SCICashFlowDisplay`
  - Logique conditionnelle pour utiliser le bon composant

## Tests recommandés

### Test 1 : Affichage de base
1. Ouvrir un bien en SCI
2. Aller dans "Rentabilité" > "Cashflow"
3. Vérifier la bannière bleue d'information
4. Vérifier que seulement 2 onglets sont présents

### Test 2 : Coûts du prêt
1. Vérifier que la colonne "Dépenses" inclut les coûts du prêt
2. Comparer avec le tableau d'amortissement dans "Acquisition"
3. Les montants doivent être cohérents

### Test 3 : Année complète
1. Regarder une année complète (2026-2044)
2. Vérifier que les montants correspondent aux valeurs annuelles
3. Mensualisé = Cash flow / 12

### Test 4 : Première année partielle
1. Regarder l'année 2025
2. Vérifier que tous les montants sont au prorata (~1.5 mois)
3. Mensualisé = Cash flow / 1.5

### Test 5 : Dernière année partielle
1. Regarder l'année 2045
2. Vérifier que tous les montants sont au prorata (~10.5 mois)
3. Mensualisé = Cash flow / 10.5

### Test 6 : Comparaison nue/meublée
1. Cliquer sur "Location nue"
2. Noter les valeurs
3. Cliquer sur "Location meublée"
4. Vérifier que les valeurs changent (revenus différents)

### Test 7 : Graphique
1. Vérifier que le graphique affiche 2 courbes
2. Vérifier que les courbes correspondent aux données du tableau
3. Survoler les points pour voir les valeurs

## Cohérence avec les autres vues

Cette vue est cohérente avec :
- ✅ **Rentabilité SCI** (`SCIResultsDisplay`) - mêmes calculs de base
- ✅ **Imposition SCI** - cash flow hors IS
- ✅ **Bilan** - utilise aussi le prorata

## Comparaison avec l'ancienne vue (nom propre)

### Avant (nom propre)
```
┌─────────────────────────────────────────────┐
│ [Micro-foncier] [Réel-foncier]             │
│ [Micro-BIC]     [Réel-BIC]                 │ ← 4 onglets
├─────────────────────────────────────────────┤
│ Revenus | Dépenses | Cash Flow | Mensualisé│
└─────────────────────────────────────────────┘
```

### Maintenant (SCI)
```
┌─────────────────────────────────────────────┐
│ ℹ️  Bien détenu en SCI à l'IS              │
├─────────────────────────────────────────────┤
│ [Location nue] [Location meublée]          │ ← 2 onglets
├─────────────────────────────────────────────┤
│ Revenus | Dépenses | Cash Flow | Mensualisé│
│         │ (+ prêt) │           │ (prorata) │
└─────────────────────────────────────────────┘
```

## Avantages

1. **Simplicité** : Seulement 2 choix au lieu de 4
2. **Précision** : Coûts prêt calculés dynamiquement
3. **Réalisme** : Prorata temporel appliqué
4. **Clarté** : Bannière explicative
5. **Cohérence** : Même logique que la rentabilité

## Conclusion

La vue Cash Flow pour les SCI est maintenant :
- ✅ Adaptée à la fiscalité SCI (IS)
- ✅ Précise (coûts prêt dynamiques)
- ✅ Réaliste (prorata temporel)
- ✅ Cohérente avec les autres vues
- ✅ Simple à comprendre (2 onglets)

Les utilisateurs peuvent maintenant analyser le cash flow de leurs biens en SCI de manière appropriée ! 🎉


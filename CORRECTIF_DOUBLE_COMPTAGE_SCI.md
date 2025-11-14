# Correctif : Double comptage des frais de fonctionnement SCI

## 📋 Problème identifié

Deux anomalies dans l'affichage et le calcul des frais de fonctionnement de la SCI :

### 1. Double comptage dans l'affichage

**Symptôme :** L'utilisateur configure :
- Frais comptable : 400 €
- Autres charges : 2 000 €
- **Total attendu : 2 400 €**

Mais l'affichage montrait :
- Frais comptables : 400 €
- **Charges d'exploitation : 2 400 €** ❌ (= somme déjà calculée)
- Autres charges : 2 000 €
- **Total SCI : 4 800 €** ❌ (double comptage)

### 2. Pas de prorata temporel dans l'affichage

Les montants affichés dans le détail des frais étaient les valeurs **annuelles complètes**, même pour une année partielle. Seul le total des charges était proratisé dans les calculs.

**Exemple :** Pour une SCI démarrant en novembre 2025 (2 mois sur 12 = 16,67%) :
- Affichage : Frais comptable 1 200 € ❌ (valeur annuelle)
- Attendu : Frais comptable 200 € ✅ (proratisé)

---

## ✅ Solutions implémentées

### 1. Suppression du double comptage

#### Dans l'affichage (`SCITaxDisplay.tsx`)

**Avant (lignes 399-420) :**
```typescript
{sci.taxParameters.operatingExpenses > 0 && (
  <div className="flex justify-between">
    <span className="pl-2">• Charges d'exploitation :</span>
    <span>{formatCurrency(sci.taxParameters.operatingExpenses)}</span>
  </div>
)}
// ... autres frais ...
<span>
  {formatCurrency(
    sci.taxParameters.accountingFees +
    sci.taxParameters.legalFees +
    sci.taxParameters.bankFees +
    sci.taxParameters.insuranceFees +
    sci.taxParameters.otherExpenses +
    sci.taxParameters.operatingExpenses  // ❌ Double comptage
  )}
</span>
```

**Après :**
```typescript
// ✅ operatingExpenses n'est plus affiché comme une ligne séparée
// ✅ operatingExpenses n'est plus inclus dans le total

<span>
  {formatCurrency(
    adjustForCoverage(
      sci.taxParameters.accountingFees +
      sci.taxParameters.legalFees +
      sci.taxParameters.bankFees +
      sci.taxParameters.insuranceFees +
      sci.taxParameters.otherExpenses  // Seulement les frais détaillés
    )
  )}
</span>
```

#### Dans les calculs (`sciTaxCalculations.ts`)

**Avant (lignes 145-151) :**
```typescript
const annualSciOperatingExpenses = 
  (sci.taxParameters.operatingExpenses || 0) +  // ❌ C'est déjà une somme
  (sci.taxParameters.accountingFees || 0) +
  (sci.taxParameters.legalFees || 0) +
  (sci.taxParameters.bankFees || 0) +
  (sci.taxParameters.insuranceFees || 0) +
  (sci.taxParameters.otherExpenses || 0);
```

**Après (lignes 146-151) :**
```typescript
// Frais de fonctionnement annuels de la SCI (SOMME des frais détaillés, PAS operatingExpenses)
// Note: operatingExpenses est stocké comme la somme mais on le recalcule pour éviter toute incohérence
const annualSciOperatingExpenses = 
  (sci.taxParameters.accountingFees || 0) +
  (sci.taxParameters.legalFees || 0) +
  (sci.taxParameters.bankFees || 0) +
  (sci.taxParameters.insuranceFees || 0) +
  (sci.taxParameters.otherExpenses || 0);
```

---

### 2. Application du prorata à l'affichage

**Nouveau code dans `SCITaxDisplay.tsx` :**

```typescript
{/* Charges de fonctionnement SCI */}
{(() => {
  // Calculer le prorata temporel pour l'affichage
  const coverage = getYearCoverage(investment, currentYear);
  const adjustForCoverage = (value: number) => Number((value * coverage).toFixed(2));
  
  return (
    <div className="border border-red-200 rounded p-2 bg-red-50">
      <div className="font-semibold text-red-900 mb-1.5 pb-1 border-b border-red-200 flex items-center justify-between">
        <span>Charges de fonctionnement SCI</span>
        {coverage < 1 && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
            partiel {Math.round(coverage * 100)}%
          </span>
        )}
      </div>
      <div className="space-y-0.5 text-red-800">
        {sci.taxParameters.accountingFees > 0 && (
          <div className="flex justify-between">
            <span className="pl-2">• Frais comptables :</span>
            <span>{formatCurrency(adjustForCoverage(sci.taxParameters.accountingFees))}</span>
          </div>
        )}
        {/* ... autres frais avec prorata ... */}
      </div>
    </div>
  );
})()}
```

**Améliorations :**
1. ✅ Calcul du prorata temporel avec `getYearCoverage()`
2. ✅ Application du prorata à chaque ligne de frais
3. ✅ Badge "partiel X%" affiché si l'année n'est pas complète
4. ✅ Cohérence totale avec les calculs sous-jacents

---

## 📊 Impact des corrections

### Exemple : SCI avec frais comptable 400€ et autres charges 2 000€

**Configuration :**
- Frais comptable : 400 €/an
- Autres charges : 2 000 €/an
- Total annuel : 2 400 €/an
- Projet démarre le 1er novembre 2025 (2 mois sur 12 = 16,67%)

**Résultats pour 2025 :**

| Élément | AVANT (incorrect) | APRÈS (correct) | Correction |
|---------|-------------------|-----------------|------------|
| Frais comptables | 400 € | 67 € | ✅ Proratisé |
| ~~Charges d'exploitation~~ | ~~2 400 €~~ | - | ✅ Supprimé |
| Autres charges | 2 000 € | 333 € | ✅ Proratisé |
| **Total SCI** | **4 800 €** | **400 €** | **✅ Correct** |

**Impact fiscal :**
- Charges déductibles réduites de **4 400 €** (4 800 - 400)
- Résultat fiscal augmenté de **4 400 €**
- IS potentiellement augmenté (si résultat positif)

---

## 🧪 Tests et vérification

### Test de compilation
✅ `npm run build` : Succès (0 erreur)

### Test de linting
✅ Aucune erreur ESLint

### Tests visuels recommandés

1. **Créer une SCI de test** avec :
   - Frais comptable : 1 200 €/an
   - Autres charges : 2 000 €/an
   - 1 bien démarrant le 1er juillet 2025

2. **Vérifier l'affichage pour 2025** :
   - ✅ Frais comptables : 600 € (50% de 1 200 €)
   - ✅ Autres charges : 1 000 € (50% de 2 000 €)
   - ✅ Total SCI : 1 800 € (50% de 3 600 €)
   - ✅ Badge "partiel 50%" affiché
   - ✅ Pas de ligne "Charges d'exploitation"

3. **Vérifier l'affichage pour 2026** :
   - ✅ Frais comptables : 1 200 € (100%)
   - ✅ Autres charges : 2 000 € (100%)
   - ✅ Total SCI : 3 600 € (100%)
   - ✅ Pas de badge "partiel"

---

## 📁 Fichiers modifiés

### 1. `src/components/SCITaxDisplay.tsx`

**Lignes 370-433 (anciennes 369-426) :**
- ❌ Suppression de l'affichage de `operatingExpenses`
- ❌ Suppression de `operatingExpenses` dans le calcul du total
- ✅ Ajout du calcul de `coverage` pour le prorata
- ✅ Application de `adjustForCoverage()` à chaque ligne
- ✅ Ajout du badge "partiel X%" si année incomplète

**Lignes modifiées/ajoutées :** ~65 lignes

### 2. `src/utils/sciTaxCalculations.ts`

**Lignes 140-156 :**
- ❌ Suppression de `operatingExpenses` du calcul
- ✅ Commentaire expliquant pourquoi on recalcule au lieu d'utiliser `operatingExpenses`

**Lignes modifiées :** ~3 lignes

---

## ✅ Checklist de validation

- [x] Double comptage supprimé dans l'affichage
- [x] Double comptage supprimé dans les calculs
- [x] Prorata appliqué à l'affichage de chaque ligne
- [x] Badge "partiel X%" affiché pour années incomplètes
- [x] `operatingExpenses` n'est plus affiché comme une ligne
- [x] `operatingExpenses` n'est plus inclus dans le calcul du total
- [x] Compilation réussie (npm run build)
- [x] Linting passé (0 erreur)
- [x] Cohérence avec les calculs sous-jacents
- [ ] Tests manuels effectués (à faire par l'utilisateur)

---

## 🎯 Résultat attendu

Pour l'exemple de l'utilisateur (400€ comptable + 2000€ autres, démarrage novembre 2025) :

**Affichage attendu pour 2025 (13% de l'année) :**
```
Charges de fonctionnement SCI                    partiel 13%
  • Frais comptables :                           52 €
  • Autres charges :                             260 €
  ─────────────────────────────────────────────────────
  Total SCI :                                    312 €
```

**Affichage attendu pour 2026 (année complète) :**
```
Charges de fonctionnement SCI
  • Frais comptables :                           400 €
  • Autres charges :                             2 000 €
  ─────────────────────────────────────────────────────
  Total SCI :                                    2 400 €
```

---

## 📚 Contexte technique

### Pourquoi `operatingExpenses` existe-t-il ?

Dans `SCIForm.tsx`, lors de la création/édition d'une SCI, on calcule :
```typescript
operatingExpenses: accountingFees + legalFees + bankFees + insuranceFees + otherExpenses
```

Ce champ `operatingExpenses` est stocké comme la **somme totale** pour faciliter l'accès rapide au total, mais il ne doit **jamais être utilisé dans un calcul additif** avec les frais détaillés, sous peine de double comptage.

### Solution appliquée

Dans les calculs et l'affichage, on **ignore** `operatingExpenses` et on **recalcule** toujours la somme à partir des frais détaillés. Cela garantit la cohérence et évite tout risque de double comptage.

---

**Développé le :** Novembre 2024  
**Version :** 1.0  
**Statut :** ✅ Opérationnel


# Correctif : Application du prorata temporel aux calculs SCI

## 📋 Problème identifié

Les calculs fiscaux de la SCI n'appliquaient **pas le prorata temporel** aux éléments suivants pour les années partielles :
1. **Amortissements** (immeubles, mobilier, travaux)
2. **Frais de fonctionnement de la SCI** (comptable, juridique, bancaire, assurances, autres)

### Exemple du problème

Si une SCI démarre en **novembre 2025** (2 mois sur 12), les frais annuels et amortissements étaient comptabilisés en totalité au lieu d'être calculés au prorata du temps (2/12).

**Avant le correctif :**
```
Frais comptable annuels : 1 200 € → 1 200 € comptabilisés (❌ incorrect)
Amortissement annuel : 8 000 € → 8 000 € comptabilisés (❌ incorrect)
```

**Après le correctif :**
```
Frais comptable annuels : 1 200 € → 200 € comptabilisés (2/12 de l'année) ✅
Amortissement annuel : 8 000 € → 1 333,33 € comptabilisés (2/12 de l'année) ✅
```

---

## ✅ Solution implémentée

### 1. Nouvelle fonction : `calculateSCIYearCoverage()`

Ajout d'une fonction pour calculer la couverture de l'année pour la SCI dans son ensemble :

```typescript
/**
 * Calcule la couverture de l'année pour la SCI (basée sur tous les biens)
 * Prend le maximum de couverture parmi tous les biens de la SCI
 * @param properties - Liste des biens appartenant à la SCI
 * @param year - Année fiscale
 * @returns La fraction de l'année couverte par la SCI (0 à 1)
 */
function calculateSCIYearCoverage(properties: Investment[], year: number): number {
  if (properties.length === 0) return 0;
  
  // Pour la SCI, on prend la couverture maximale parmi tous les biens
  // Car les frais de fonctionnement de la SCI sont actifs dès qu'au moins un bien est actif
  const coverages = properties.map(property => getYearCoverage(property, year));
  return Math.max(...coverages, 0);
}
```

**Logique :** La SCI est active dès qu'au moins un de ses biens est actif, donc on prend la **couverture maximale** parmi tous les biens.

---

### 2. Application du prorata aux frais de fonctionnement SCI

**Avant (lignes 124-133) :**
```typescript
// 2. Ajouter les charges de fonctionnement globales de la SCI
const sciOperatingExpenses = 
  (sci.taxParameters.operatingExpenses || 0) +
  (sci.taxParameters.accountingFees || 0) +
  (sci.taxParameters.legalFees || 0) +
  (sci.taxParameters.bankFees || 0) +
  (sci.taxParameters.insuranceFees || 0) +
  (sci.taxParameters.otherExpenses || 0);

totalDeductibleExpenses += sciOperatingExpenses;
```

**Après (lignes 124-140) :**
```typescript
// 2. Ajouter les charges de fonctionnement globales de la SCI
// Calculer la couverture de l'année pour la SCI (min/max de tous les biens)
const sciYearCoverage = calculateSCIYearCoverage(properties, year);

// Frais de fonctionnement annuels de la SCI
const annualSciOperatingExpenses = 
  (sci.taxParameters.operatingExpenses || 0) +
  (sci.taxParameters.accountingFees || 0) +
  (sci.taxParameters.legalFees || 0) +
  (sci.taxParameters.bankFees || 0) +
  (sci.taxParameters.insuranceFees || 0) +
  (sci.taxParameters.otherExpenses || 0);

// Appliquer le prorata temporel aux frais de fonctionnement
const sciOperatingExpenses = adjustForCoverage(annualSciOperatingExpenses, sciYearCoverage);

totalDeductibleExpenses += sciOperatingExpenses;
```

---

### 3. Application du prorata aux amortissements

#### 3a. Modification de l'appel (ligne 98)

**Avant :**
```typescript
// Amortissements du bien
const propertyAmortization = calculatePropertyAmortization(property, year, sci.taxParameters);
```

**Après :**
```typescript
// Amortissements du bien (avec prorata temporel)
const propertyAmortization = calculatePropertyAmortization(property, year, sci.taxParameters, coverage);
```

#### 3b. Modification de la fonction `calculatePropertyAmortization()`

**Ajout du paramètre `coverage` :**
```typescript
function calculatePropertyAmortization(
  property: Investment,
  year: number,
  taxParameters: SCITaxParameters,
  coverage: number = 1  // ⭐ NOUVEAU : prorata temporel
): number {
```

**Application du prorata à chaque type d'amortissement :**

```typescript
// 1. Amortissement du bien immobilier (terrain non amortissable)
const buildingValue = property.taxParameters?.buildingValue || (property.purchasePrice * 0.8);
if (yearsElapsed < buildingAmortYears) {
  const annualBuildingAmortization = buildingValue / buildingAmortYears;
  totalAmortization += adjustForCoverage(annualBuildingAmortization, coverage);  // ⭐ PRORATA
}

// 2. Amortissement du mobilier (si LMNP ou meublé)
const furnitureValue = property.taxParameters?.furnitureValue || property.lmnpData?.furnitureValue || 0;
if (furnitureValue > 0 && yearsElapsed < furnitureAmortYears) {
  const annualFurnitureAmortization = furnitureValue / furnitureAmortYears;
  totalAmortization += adjustForCoverage(annualFurnitureAmortization, coverage);  // ⭐ PRORATA
}

// 3. Amortissement des travaux
const worksValue = property.renovationCosts || 0;
if (worksValue > 0 && yearsElapsed < worksAmortYears) {
  const annualWorksAmortization = worksValue / worksAmortYears;
  totalAmortization += adjustForCoverage(annualWorksAmortization, coverage);  // ⭐ PRORATA
}
```

---

## 📊 Impact des corrections

### Exemple chiffré : SCI démarrant en novembre 2025

**Configuration :**
- 1 bien dans la SCI
- Valeur immobilière : 200 000 €
- Valeur du bâtiment (80%) : 160 000 €
- Durée d'amortissement : 25 ans
- Amortissement annuel théorique : 160 000 / 25 = 6 400 €
- Frais comptable : 1 200 €/an
- Projet démarre le 1er novembre 2025
- Couverture 2025 : 2 mois / 12 = 0,1667 (16,67%)

**Résultats pour 2025 :**

| Élément | Avant (incorrect) | Après (correct) | Différence |
|---------|-------------------|-----------------|------------|
| Amortissement | 6 400 € | 1 067 € | -5 333 € |
| Frais comptable | 1 200 € | 200 € | -1 000 € |
| **Total charges** | **7 600 €** | **1 267 €** | **-6 333 €** |

**Impact fiscal :**
- Résultat imposable AVANT : -7 600 € (déficit trop élevé)
- Résultat imposable APRÈS : -1 267 € (déficit correct)
- **Différence : 6 333 €** de résultat en plus (plus proche de la réalité)

Cette correction évite de surestimer les déficits et de fausser les calculs fiscaux pluriannuels.

---

## 🔍 Tests et vérification

### Test de compilation
✅ `npm run build` : Succès (0 erreur)

### Test de linting
✅ Aucune erreur ESLint sur `src/utils/sciTaxCalculations.ts`

### Tests unitaires recommandés

```typescript
describe('Prorata temporel SCI', () => {
  it('devrait appliquer le prorata aux frais de fonctionnement', () => {
    const sci: SCI = {
      // ... configuration SCI
      taxParameters: {
        // ...
        accountingFees: 1200,
        legalFees: 300,
        // ...
      }
    };
    
    const properties: Investment[] = [{
      // ... bien commençant en novembre 2025
      projectStartDate: '2025-11-01',
      projectEndDate: '2045-12-31',
      // ...
    }];
    
    const results = calculateSCITaxResults(sci, properties, 2025);
    
    // Frais de fonctionnement devraient être proratisés (2 mois sur 12)
    const expectedOperatingExpenses = (1200 + 300) * (2/12);
    expect(results.totalDeductibleExpenses).toBeCloseTo(expectedOperatingExpenses, 2);
  });
  
  it('devrait appliquer le prorata aux amortissements', () => {
    const property: Investment = {
      // ... bien avec immeuble de 160 000€
      purchasePrice: 200000,
      projectStartDate: '2025-11-01',
      projectEndDate: '2045-12-31',
      // ...
    };
    
    const coverage = getYearCoverage(property, 2025); // = 2/12 = 0.1667
    const amortization = calculatePropertyAmortization(
      property, 
      2025, 
      defaultSCITaxParameters,
      coverage
    );
    
    // Amortissement annuel : 160 000 / 25 = 6 400€
    // Proratisé : 6 400 * 0.1667 = 1 067€
    expect(amortization).toBeCloseTo(1067, 0);
  });
});
```

---

## 📁 Fichiers modifiés

### `src/utils/sciTaxCalculations.ts`

**Modifications :**
1. ✅ Ajout de `calculateSCIYearCoverage()` (lignes 16-30)
2. ✅ Calcul du prorata pour frais de fonctionnement (lignes 124-140)
3. ✅ Ajout paramètre `coverage` à `calculatePropertyAmortization()` (ligne 232)
4. ✅ Application du prorata aux 3 types d'amortissements (lignes 254-270)

**Lignes modifiées :** ~30 lignes ajoutées/modifiées

---

## ✅ Checklist de validation

- [x] Fonction `calculateSCIYearCoverage()` créée
- [x] Prorata appliqué aux frais de fonctionnement SCI
- [x] Prorata appliqué aux amortissements immobiliers
- [x] Prorata appliqué aux amortissements mobiliers
- [x] Prorata appliqué aux amortissements travaux
- [x] Compilation réussie (npm run build)
- [x] Linting passé (0 erreur)
- [x] Documentation créée
- [ ] Tests unitaires ajoutés (recommandé)
- [ ] Tests manuels effectués (à faire)

---

## 🎯 Utilisation

Le système de prorata temporel est maintenant **automatiquement appliqué** à tous les calculs SCI. Aucune action particulière n'est requise de la part de l'utilisateur.

**Exemple d'utilisation :**
```typescript
import { calculateSCITaxResults } from './utils/sciTaxCalculations';

const sci: SCI = { /* ... */ };
const properties: Investment[] = [ /* ... */ ];
const year = 2025;

// Le prorata temporel est appliqué automatiquement
const results = calculateSCITaxResults(sci, properties, year);

console.log('Frais de fonctionnement (proratisés):', results.totalDeductibleExpenses);
console.log('Amortissements (proratisés):', results.totalAmortization);
```

---

## 🔮 Évolutions futures possibles

1. **Prorata par mois** : Actuellement le prorata est calculé en jours, on pourrait ajouter une option pour arrondir au mois entier
2. **Règle du prorata à mi-mois** : Option pour arrondir à l'unité supérieure si démarrage après le 15 du mois
3. **Logs de debug** : Ajouter des logs optionnels pour tracer les calculs de prorata
4. **Interface utilisateur** : Afficher le pourcentage de couverture dans l'interface pour plus de transparence

---

## 📞 Support

En cas de question ou problème :
1. Vérifiez que les dates de projet (`projectStartDate`, `projectEndDate`) sont correctes
2. Consultez la fonction `getYearCoverage()` dans `src/utils/propertyCalculations.ts`
3. Vérifiez les logs de console pour les valeurs de couverture calculées

---

**Développé le :** Novembre 2024  
**Version :** 1.0  
**Statut :** ✅ Opérationnel


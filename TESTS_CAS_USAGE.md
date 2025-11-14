# Documentation des Cas d'Usage - Tests Automatisés

Ce document recense tous les cas d'usage utilisés dans les tests automatisés avec leurs valeurs réelles. Il sert de référence pour comprendre les scénarios testés et les résultats attendus.

---

## 📋 Table des matières

1. [Calculs Financiers](#1-calculs-financiers)
2. [Calculs Fiscaux](#2-calculs-fiscaux)
3. [Calcul IRR](#3-calcul-irr)
4. [Plus-values](#4-plus-values)
5. [Composant CashFlowDisplay](#5-composant-cashflowdisplay)
6. [Formulaire d'Acquisition](#6-formulaire-dacquisition)

---

## 1. CALCULS FINANCIERS

### 1.1 Mensualité de prêt classique

**Fichier** : `src/utils/__tests__/calculations.test.ts`

#### Cas 1 : Prêt standard 20 ans

```typescript
{
  loanAmount: 200000,      // Capital emprunté
  interestRate: 1.5,       // Taux annuel
  loanDuration: 20         // Durée en années
}
```

**Résultat attendu** : 965,02 €/mois

**Formule** :
```
M = C × (t/12) × (1 + t/12)^n / ((1 + t/12)^n - 1)
où :
- C = 200 000 € (capital)
- t = 1,5% = 0,015 (taux annuel)
- n = 240 mois (20 ans × 12)
```

#### Cas 2 : Prêt court terme

```typescript
{
  loanAmount: 100000,
  interestRate: 2.0,
  loanDuration: 10
}
```

**Résultat attendu** : 920,13 €/mois

#### Cas 3 : Prêt long terme faible taux

```typescript
{
  loanAmount: 300000,
  interestRate: 1.0,
  loanDuration: 25
}
```

**Résultat attendu** : 1 129,94 €/mois

### 1.2 Tableau d'amortissement

**Fichier** : `src/utils/__tests__/calculations.test.ts`

#### Cas : Prêt de base

```typescript
{
  loanAmount: 150000,
  interestRate: 1.8,
  loanDuration: 15
}
```

**Vérifications** :
- Nombre de lignes : 180 (15 ans × 12 mois)
- Capital restant initial : 150 000 €
- Capital restant final : 0 €
- Somme capital remboursé : 150 000 €
- Chaque ligne contient : date, principal, interest, remainingBalance

### 1.3 Métriques financières complètes

**Fichier** : `src/utils/__tests__/calculations.test.ts`

```typescript
{
  loanAmount: 200000,
  interestRate: 1.5,
  insuranceRate: 0.36,
  loanDuration: 20,
  propertyTax: 1200,
  condoFees: 800,
  propertyInsurance: 300,
  managementFees: 600,
  unpaidRentInsurance: 400
}
```

**Résultats attendus** :
- Mensualité crédit : 965,02 €
- Mensualité assurance : 60,00 €
- Mensualité totale : 1 025,02 €
- Charges mensuelles : 275,00 €
- Total mensuel : 1 300,02 €

### 1.4 Revenus avec vacance locative

**Fichier** : `src/utils/__tests__/calculations.test.ts`

#### Cas 1 : 5% de vacance

```typescript
{
  rent: 1000,           // Loyer mensuel
  vacancyRate: 5        // 5% de vacance
}
```

**Résultat** : 11 400 € annuel (1000 × 12 × 0,95)

#### Cas 2 : 10% de vacance

```typescript
{
  rent: 1500,
  vacancyRate: 10
}
```

**Résultat** : 16 200 € annuel (1500 × 12 × 0,90)

#### Cas 3 : Pas de vacance

```typescript
{
  rent: 800,
  vacancyRate: 0
}
```

**Résultat** : 9 600 € annuel (800 × 12 × 1,00)

---

## 2. CALCULS FISCAUX

### 2.1 Micro-Foncier (Location Nue)

**Fichier** : `src/utils/__tests__/taxCalculations.test.ts`

#### Cas de base

```typescript
{
  unfurnishedRentRevenue: 12000,    // Loyers annuels
  taxBracket: 30,                   // TMI 30%
  tenantCharges: 600,               // Charges locataires
  taxCredit: 500                    // Réduction Pinel
}
```

**Calculs** :
- Revenus totaux : 12 600 € (12 000 + 600)
- Abattement 30% : -3 780 €
- Base imposable : 8 820 €
- Impôt (30%) : 2 646 €
- Prélèvements sociaux (17,2%) : 1 517 €
- Total avant crédit : 4 163 €
- Après crédit Pinel : 3 663 €

#### Cas non éligible (> 15 000 €)

```typescript
{
  unfurnishedRentRevenue: 16000,
  taxBracket: 30
}
```

**Résultat** : Non éligible au micro-foncier

### 2.2 Réel Foncier (Location Nue)

**Fichier** : `src/utils/__tests__/taxCalculations.test.ts`

```typescript
{
  unfurnishedRentRevenue: 12000,
  taxBracket: 30,
  tenantCharges: 600,
  propertyTax: 800,
  condoFees: 1200,
  propertyInsurance: 300,
  managementFees: 720,           // 6% des loyers
  unpaidRentInsurance: 360,      // 3% des loyers
  repairsAndMaintenance: 500,
  loanInterest: 1500,
  taxCredit: 500
}
```

**Calculs** :
- Revenus totaux : 12 600 €
- Charges déductibles : 5 380 € (somme des charges)
- Base imposable : 7 220 €
- Impôt (30%) : 2 166 €
- Prélèvements sociaux : 1 242 €
- Total avant crédit : 3 408 €
- Après crédit : 2 908 €

### 2.3 Micro-BIC (LMNP)

**Fichier** : `src/utils/__tests__/taxCalculations.test.ts`

#### Cas de base

```typescript
{
  furnishedRentRevenue: 15000,
  taxBracket: 30,
  tenantCharges: 600,
  taxCredit: 1000
}
```

**Calculs** :
- Revenus totaux : 15 600 €
- Abattement 50% : -7 800 €
- Base imposable : 7 800 €
- Impôt (30%) : 2 340 €
- Prélèvements sociaux : 1 342 €
- Total avant crédit : 3 682 €
- Après crédit : 2 682 €

#### Cas non éligible (> 77 700 €)

```typescript
{
  furnishedRentRevenue: 80000,
  taxBracket: 41
}
```

**Résultat** : Non éligible au micro-BIC

### 2.4 Réel BIC (LMNP)

**Fichier** : `src/utils/__tests__/taxCalculations.test.ts`

```typescript
{
  furnishedRentRevenue: 15000,
  taxBracket: 30,
  tenantCharges: 600,
  propertyTax: 800,
  condoFees: 1200,
  propertyInsurance: 300,
  managementFees: 900,
  unpaidRentInsurance: 450,
  repairsAndMaintenance: 500,
  loanInterest: 1500,
  depreciation: 5000,         // Point clé du réel BIC
  taxCredit: 1000
}
```

**Calculs** :
- Revenus totaux : 15 600 €
- Charges déductibles : 5 650 €
- **Amortissements : 5 000 €**
- Base imposable : 4 950 €
- Impôt (30%) : 1 485 €
- Prélèvements sociaux : 851 €
- Total avant crédit : 2 336 €
- Après crédit : 1 336 €

### 2.5 Rendements bruts

**Fichier** : `src/utils/__tests__/taxCalculations.test.ts`

```typescript
{
  purchasePrice: 200000,
  furnishedRentRevenue: 15000,
  unfurnishedRentRevenue: 12000
}
```

**Résultats** :
- Rendement brut meublé : 7,50% (15 000 / 200 000)
- Rendement brut nu : 6,00% (12 000 / 200 000)

---

## 3. CALCUL IRR (Taux de Rendement Interne)

**Fichier** : `src/utils/__tests__/irrCalculations.test.ts`

### Cas 1 : Investissement rentable

```typescript
{
  cashFlows: [-100000, 10000, 10000, 10000, 10000, 110000]
}
```

**Résultat** : IRR ≈ 10%

**Interprétation** :
- Investissement initial : -100 000 €
- Cash flows annuels : +10 000 € pendant 4 ans
- Revente : +110 000 € (année 5)
- Rendement interne : 10% annuel

### Cas 2 : Cash flows négatifs uniquement

```typescript
{
  cashFlows: [-1000, -500, -300]
}
```

**Résultat** : null (pas de solution)

### Cas 3 : Investissement immédiat

```typescript
{
  cashFlows: [-10000, 11000]
}
```

**Résultat** : IRR = 10%

### Cas 4 : Projet long terme

```typescript
{
  cashFlows: [-200000, 5000, 5000, ..., 250000]  // 20 ans
}
```

**Résultat** : IRR ≈ 5,5%

---

## 4. PLUS-VALUES

### 4.1 Plus-value immobilière classique

**Fichier** : `src/utils/__tests__/capitalGainCalculations.test.ts`

#### Cas 1 : Détention 10 ans

```typescript
{
  salePrice: 300000,
  purchasePrice: 200000,
  yearsOwned: 10,
  acquisitionFees: 15000,
  renovationCosts: 20000,
  sellingCosts: 12000
}
```

**Calculs** :
- Prix acquisition corrigé : 235 000 € (200 000 + 15 000 + 20 000)
- Prix vente net : 288 000 € (300 000 - 12 000)
- Plus-value brute : 53 000 €
- Abattement IR (10 ans = 60%) : 31 800 €
- PV imposable IR : 21 200 €
- Abattement PS (10 ans = 16,5%) : 8 745 €
- PV imposable PS : 44 255 €
- Impôt IR (19%) : 4 028 €
- PS (17,2%) : 7 612 €
- Surtaxe (PV > 50K) : 53 €
- **Total fiscalité : 11 693 €**
- **Plus-value nette : 41 307 €**

#### Cas 2 : Détention 22 ans (exonération IR)

```typescript
{
  salePrice: 400000,
  purchasePrice: 200000,
  yearsOwned: 22
}
```

**Résultat** :
- Exonération totale IR
- PS réduits (abattement 22% pour 22 ans)
- Fiscalité minimale

#### Cas 3 : Détention 30 ans (exonération totale)

```typescript
{
  salePrice: 500000,
  purchasePrice: 200000,
  yearsOwned: 30
}
```

**Résultat** :
- Exonération totale IR et PS
- Plus-value nette = Plus-value brute

### 4.2 Plus-value LMNP

**Fichier** : `src/utils/__tests__/capitalGainCalculations.test.ts`

#### Cas LMNP avec amortissements

```typescript
{
  salePrice: 250000,
  purchasePrice: 200000,
  yearsOwned: 10,
  totalDepreciation: 50000,    // Amortissements pratiqués
  sellingCosts: 10000
}
```

**Calculs spécifiques LMNP** :
- Prix acquisition corrigé : 150 000 € (200 000 - 50 000 amort.)
- Plus-value brute : 90 000 €
- **Plus-value court terme** : 50 000 € (= amortissements)
  - Imposée comme BIC : TMI + 17,2% PS
- **Plus-value long terme** : 40 000 € (reste)
  - Imposée à 19% + 17,2% PS
- Fiscalité totale plus élevée qu'immobilier classique

---

## 5. COMPOSANT CASHFLOWDISPLAY

**Fichier** : `src/components/__tests__/CashFlowDisplay.test.tsx`

### Cas de test : Investissement avec 3 années d'historique

```typescript
{
  name: "Test Investment",
  purchasePrice: 200000,
  loanAmount: 180000,
  downPayment: 20000,
  interestRate: 1.5,
  insuranceRate: 0.36,
  loanDuration: 20,
  
  // Location
  furnishedRentRevenue: 15000,
  unfurnishedRentRevenue: 12000,
  tenantCharges: 600,
  vacancyRate: 5,
  
  // Fiscalité
  taxBracket: 30,
  taxCredit: 1000,
  depreciation: 5000,
  
  // Charges
  propertyTax: 800,
  condoFees: 1200,
  propertyInsurance: 300,
  managementFees: 900,
  unpaidRentInsurance: 450,
  repairsAndMaintenance: 500,
  
  // Dates
  projectStartDate: "2023-01-01",
  projectEndDate: "2025-12-31",
  
  // Historique détaillé
  expenses: [
    {
      year: 2023,
      loanInterest: 2700,
      totalExpenses: 5200,
      ...
    },
    {
      year: 2024,
      loanInterest: 2650,
      totalExpenses: 5100,
      ...
    },
    {
      year: 2025,
      loanInterest: 2600,
      totalExpenses: 5000,
      ...
    }
  ]
}
```

**Tests effectués** :
- Affichage des 4 régimes fiscaux
- Tableau avec années 2023, 2024, 2025
- Colonnes : Année, Revenus, Dépenses, Cash Flow Net, Mensualisé
- Bascule entre régimes
- Descriptions spécifiques à chaque régime
- Graphique d'évolution
- Persistance dans localStorage

---

## 6. FORMULAIRE D'ACQUISITION

**Fichier** : `src/components/__tests__/AcquisitionForm.test.tsx`

### 6.1 Cas de base : Investissement standard

```typescript
{
  purchasePrice: 200000,
  agencyFees: 10000,
  notaryFees: 15000,
  bankFees: 800,
  renovationCosts: 20000,
  downPayment: 50000,
  loanAmount: 195800,
  interestRate: 1.5,
  insuranceRate: 0.36,
  loanDuration: 20,
  startDate: "2023-01-01"
}
```

**Vérifications** :
- Coût total = 245 800 €
- Équation : 50 000 + 195 800 = 245 800 ✓
- Mensualité ≈ 943 €

### 6.2 Cas réel : Pinel Bagnolet

```typescript
{
  name: "Pinel Bagnolet",
  purchasePrice: 129668,
  agencyFees: 0,
  notaryFees: 0,
  bankFees: 800,
  renovationCosts: 0,
  downPayment: 800,
  loanAmount: 129668,
  interestRate: 1.5,
  insuranceRate: 0.36,
  loanDuration: 20,
  hasDeferral: true,
  deferralType: "total",
  deferredPeriod: 24,
  startDate: "2017-05-01"
}
```

**Vérifications spécifiques** :
- Coût total = 130 468 € (129 668 + 800)
- Équation : 800 + 129 668 = 130 468 ✓
- Mensualité après différé ≈ 698 €
- Intérêts différés ≈ 4 461 €
- Différé total : 24 mois sans remboursement capital

### 6.3 Tests d'interaction

#### Test 1 : Modification apport → recalcul emprunt

**Action** :
```typescript
// Valeurs initiales
downPayment: 50000
loanAmount: 195800
totalCost: 245800

// Modification
downPayment: 100000
```

**Résultat attendu** :
```typescript
loanAmount: 145800  // Recalculé automatiquement
// Équation maintenue : 100000 + 145800 = 245800 ✓
```

#### Test 2 : Modification emprunt → recalcul apport

**Action** :
```typescript
// Valeurs initiales
downPayment: 50000
loanAmount: 195800
totalCost: 245800

// Modification
loanAmount: 200000
```

**Résultat attendu** :
```typescript
downPayment: 45800  // Recalculé automatiquement
// Équation maintenue : 45800 + 200000 = 245800 ✓
```

#### Test 3 : Modification prix d'achat

**Action** :
```typescript
// Valeurs initiales
purchasePrice: 200000
totalCost: 245800
downPayment: 50000
loanAmount: 195800

// Modification
purchasePrice: 300000
```

**Résultat attendu** :
```typescript
totalCost: 345800      // +100000
loanAmount: 295800     // Recalculé si apport modifié
// Équation maintenue
```

#### Test 4 : Activation/désactivation différé

**Action** :
```typescript
// Activation
hasDeferral: true
deferralType: "total"
deferredPeriod: 24
```

**Résultat attendu** :
- Champs différé visibles
- Intérêts différés calculés
- Mensualité ajustée
- Tableau amortissement modifié

**Désactivation** :
```typescript
hasDeferral: false
```

**Résultat attendu** :
- Champs différé masqués
- deferralType: "none"
- deferredPeriod: 0
- deferredInterest: 0

### 6.4 Validation des inputs

#### Test inputs numériques

```typescript
// Valeur valide
purchasePrice: 250000  ✓

// Valeur zéro
agencyFees: 0  ✓

// Valeur décimale
interestRate: 1.75  ✓
```

#### Test tableau d'amortissement

**Actions** :
- Clic sur "Voir tableau d'amortissement"
- Modal s'ouvre avec 240 lignes (20 ans)
- Colonnes : Date, Capital, Intérêts, Restant dû
- Graphique capital/intérêts par année

---

## 7. RÉSUMÉ DES VALEURS TYPES

### Prix d'achat

| Type | Fourchette | Exemple test |
|------|-----------|--------------|
| Studio | 80K - 120K | 100 000 € |
| T2 | 120K - 180K | 150 000 € |
| T3/T4 | 180K - 300K | 200 000 € |
| Pinel | 130K - 250K | 129 668 € |

### Taux d'intérêt

| Période | Taux | Usage test |
|---------|------|------------|
| 2017-2019 | 1,5% - 2,0% | 1,5% |
| 2020-2022 | 0,8% - 1,2% | 1,0% |
| 2023-2025 | 2,5% - 4,0% | 3,0% |

### Durées de prêt

| Durée | Cas d'usage | Mensualité (200K à 1,5%) |
|-------|-------------|---------------------------|
| 10 ans | Court terme | ~1 840 € |
| 15 ans | Moyen | ~1 288 € |
| 20 ans | Standard | ~965 € |
| 25 ans | Long terme | ~800 € |

### Loyers moyens

| Type | Nu | Meublé | Rendement |
|------|-----|--------|-----------|
| Studio | 600€ | 700€ | 7-9% |
| T2 | 1000€ | 1150€ | 6-8% |
| T3 | 1400€ | 1600€ | 5-7% |

### Charges types

| Charge | Montant annuel | % loyers |
|--------|----------------|----------|
| Taxe foncière | 650 - 1200€ | - |
| Copropriété | 800 - 1500€ | - |
| Assurance | 250 - 500€ | - |
| Gestion | 720 - 900€ | 6% |
| Impayés | 360 - 450€ | 3% |
| Entretien | 500 - 1000€ | - |

---

## 8. CORRESPONDANCE TESTS ↔ FICHIERS

| Test | Fichier | Lignes | Cas testés |
|------|---------|--------|------------|
| Calculs financiers | `calculations.test.ts` | ~150 | 15 cas |
| Fiscalité | `taxCalculations.test.ts` | ~300 | 30 cas |
| IRR | `irrCalculations.test.ts` | ~100 | 24 cas |
| Plus-values | `capitalGainCalculations.test.ts` | ~450 | 20 cas |
| CashFlow | `CashFlowDisplay.test.tsx` | ~200 | 10 cas |
| Acquisition | `AcquisitionForm.test.tsx` | ~350 | 25 cas |

**Total** : ~1 550 lignes de tests, ~124 cas

---

## 9. COMMANDES UTILES

```bash
# Lancer tous les tests
npm test

# Tests spécifiques
npm test calculations
npm test taxCalculations
npm test AcquisitionForm

# Mode interactif
npm run test:ui

# Avec couverture
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## 10. RÉFÉRENCES

- **Cas complet** : `CAS_TEST_PINEL_BAGNOLET.md`
- **Guide tests** : `GUIDE_TESTS.md`
- **Documentation** : `DOCUMENTATION.md`
- **Code source** : `src/utils/`, `src/components/`

---

**Dernière mise à jour** : 6 novembre 2025  
**Version** : 1.0  
**Statut** : ✅ Complet










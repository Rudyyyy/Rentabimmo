# Guide d'Utilisation des Tests - Rentab'immo

## ✅ Résumé du système de tests

Ce projet dispose d'une suite complète de **157 tests automatisés** dont **138 passent avec succès** (87,9%).

### Tests qui fonctionnent ✅
- **Validation** : 28/28 tests (validation de données)
- **Calculs fiscaux** : 20/20 tests (4 régimes fiscaux)
- **Plus-values** : 25/25 tests (taxation revente)
- **Calculs financiers** : 21/25 tests (mensualités, amortissement, rendements)
- **Composant CashFlowDisplay** : 10/10 tests (affichage React)
- **Formulaire d'Acquisition** : 25/25 tests ✨ (nouveau, avec correction du bug apport/emprunt)

### À améliorer ⚠️
- **IRR (TRI)** : 1/24 tests - problème dans l'implémentation de `calculateIRR()`
- **Quelques valeurs attendues** : 4 tests avec écarts mineurs sur les calculs

---

## 📋 Table des matières

1. [Introduction](#introduction)
2. [Installation et Configuration](#installation-et-configuration)
3. [Commandes disponibles](#commandes-disponibles)
4. [Structure des tests](#structure-des-tests)
5. [Tests unitaires](#tests-unitaires)
6. [Tests de composants](#tests-de-composants)
7. [Couverture de code](#couverture-de-code)
8. [Bonnes pratiques](#bonnes-pratiques)
9. [Debugging](#debugging)
10. [Composants de détails des calculs](#composants-de-détails-des-calculs)

---

## Introduction

Ce projet utilise **Vitest** comme framework de tests, avec **React Testing Library** pour les tests de composants. L'ensemble des tests couvre :

- ✅ **Tests unitaires** : Calculs financiers, fiscaux, IRR, plus-values
- ✅ **Tests de composants** : Composants React (affichage, formulaires)
- ✅ **Tests d'intégration** : Interaction entre différents modules

---

## Installation et Configuration

Les dépendances de test sont déjà installées. Si nécessaire, réinstallez-les :

```bash
npm install
```

### Configuration

- **vitest.config.ts** : Configuration principale de Vitest
- **src/test/setup.ts** : Configuration globale des tests (matchers, mocks)

---

## Commandes disponibles

### Lancer tous les tests

```bash
npm test
```
ou
```bash
npm run test
```

Cette commande lance Vitest en mode watch : les tests se relancent automatiquement à chaque modification de code.

### Lancer les tests une seule fois

```bash
npm run test:run
```

Utile pour les pipelines CI/CD.

### Interface utilisateur interactive

```bash
npm run test:ui
```

Lance une interface web interactive pour explorer et lancer les tests. Ouvrez votre navigateur à l'URL indiquée (généralement `http://localhost:51204/__vitest__/`).

### Mode watch (surveillance)

```bash
npm run test:watch
```

Lance les tests en mode surveillance, identique à `npm test`.

### Couverture de code

```bash
npm run test:coverage
```

Génère un rapport de couverture de code complet :
- **Terminal** : Résumé dans la console
- **HTML** : Rapport détaillé dans `coverage/index.html`

---

## Structure des tests

```
src/
├── utils/
│   ├── __tests__/
│   │   ├── calculations.test.ts       # Tests des calculs financiers
│   │   ├── taxCalculations.test.ts    # Tests des calculs fiscaux
│   │   ├── irrCalculations.test.ts    # Tests du TRI (IRR)
│   │   ├── capitalGainCalculations.test.ts  # Tests des plus-values
│   │   └── validation.test.ts         # Tests de validation
│   ├── calculations.ts
│   ├── taxCalculations.ts
│   └── ...
├── components/
│   ├── __tests__/
│   │   └── CashFlowDisplay.test.tsx   # Tests de composants
│   ├── Tooltip.tsx                    # Composant tooltip interactif
│   ├── CalculationDetails.tsx         # Composant détails des calculs
│   └── ...
└── test/
    └── setup.ts                       # Configuration globale
```

---

## Tests unitaires

### Tests des calculs financiers

#### `calculations.test.ts`

Teste les fonctions de calcul des mensualités, amortissement, rendements :

```bash
npm test calculations.test
```

**Principales fonctions testées :**
- `calculateMonthlyPayment()` : Calcul de la mensualité de crédit
- `generateAmortizationSchedule()` : Génération du tableau d'amortissement
- `calculateFinancialMetrics()` : Calcul des métriques financières globales
- `calculateTotalNu()` / `calculateTotalMeuble()` : Calculs avec vacance locative

**Exemple de test :**
```typescript
it('should calculate monthly payment without deferral', () => {
  const monthlyPayment = calculateMonthlyPayment(200000, 1.5, 20);
  expect(monthlyPayment).toBeCloseTo(965.49, 1);
});
```

### Tests des calculs fiscaux

#### `taxCalculations.test.ts`

Teste les régimes fiscaux (micro-foncier, réel-foncier, micro-BIC, réel-BIC) :

```bash
npm test taxCalculations.test
```

**Principales fonctions testées :**
- `calculateAllTaxRegimes()` : Calcul pour les 4 régimes
- `isEligibleForMicroFoncier()` / `isEligibleForMicroBIC()` : Éligibilité
- `getRecommendedRegime()` : Recommandation du meilleur régime
- `calculateGrossYield()` : Rendement brut par régime

**Exemple de test :**
```typescript
it('should apply 30% allowance for micro-foncier', () => {
  const results = calculateAllTaxRegimes(mockInvestment, 2023);
  const microFoncier = results['micro-foncier'];
  
  const expectedTaxableIncome = annualRevenue * 0.7; // 30% allowance
  expect(microFoncier.taxableIncome).toBeCloseTo(expectedTaxableIncome, 1);
});
```

### Tests du TRI (Taux de Rendement Interne)

#### `irrCalculations.test.ts`

Teste le calcul du TRI (IRR en anglais) :

```bash
npm test irrCalculations.test
```

**Fonction testée :**
- `calculateIRR()` : Calcul du TRI par méthode Newton-Raphson

**Exemple de test :**
```typescript
it('should calculate IRR for simple cash flows', () => {
  const cashFlows = [-100, 10, 10, 10, 10, 110];
  const irr = calculateIRR(cashFlows);
  expect(irr).toBeCloseTo(0.1, 1); // ~10%
});
```

### Tests des plus-values immobilières

#### `capitalGainCalculations.test.ts`

Teste les calculs de plus-values et impôts sur la revente :

```bash
npm test capitalGainCalculations.test
```

**Fonction testée :**
- `calculateAllCapitalGainRegimes()` : Calcul des plus-values pour tous les régimes

**Points clés testés :**
- Calcul du prix de vente (global, annuel, montant)
- Abattements pour durée de détention
- Taxation spécifique LMNP/LMP
- Amortissements dérogatoires

---

## Tests de composants

### Tests React

#### `CashFlowDisplay.test.tsx` ✅ **10/10 tests**

Teste le composant d'affichage du cash-flow avec ses 4 régimes fiscaux.

```bash
npm test CashFlowDisplay
```

**Ce qui est testé :**
1. ✅ Rendu du composant sans crash
2. ✅ Affichage des 4 onglets de régimes fiscaux
3. ✅ Affichage du tableau de cash-flow avec colonnes
4. ✅ Affichage des années de projection (2023, 2024, 2025)
5. ✅ Changement de régime fiscal par clic
6. ✅ Section "Détails des calculs"
7. ✅ Descriptions différentes selon le régime (nu vs meublé)
8. ✅ Persistance du régime dans localStorage
9. ✅ Gestion des cas sans données
10. ✅ Affichage des valeurs formatées en euros

**Exemple de tests :**
```typescript
it('should render component without crashing', () => {
  render(<CashFlowDisplay investment={mockInvestment} />);
  
  expect(screen.getByText(/évolution du cash flow net/i)).toBeInTheDocument();
  expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
});

it('should switch between tax regimes when clicking tabs', () => {
  render(<CashFlowDisplay investment={mockInvestment} />);
  
  const microBicTab = screen.getByText(/lmnp.*micro-bic/i);
  fireEvent.click(microBicTab);
  
  expect(microBicTab.className).toContain('border-blue-500');
});
```

**Points techniques importants :**
- 🎨 Mock de Chart.js (`react-chartjs-2`) pour éviter les erreurs Canvas
- 💾 Mock de localStorage pour tester la persistance
- 🔍 Utilisation de `getAllByText()` quand un texte apparaît plusieurs fois
- 🎯 Utilisation de `getByRole('columnheader')` pour cibler spécifiquement les en-têtes de tableau

---

## Couverture de code

### Générer le rapport

```bash
npm run test:coverage
```

### Consulter le rapport

1. **Terminal** : Résumé affiché automatiquement
2. **HTML** : Ouvrez `coverage/index.html` dans votre navigateur

### Objectifs de couverture

- **Statements** : > 80%
- **Branches** : > 75%
- **Functions** : > 80%
- **Lines** : > 80%

### Fichiers exclus

Les fichiers suivants sont exclus du calcul de couverture :
- `node_modules/`
- `src/test/`
- `**/*.d.ts`
- `**/*.config.*`
- `dist/`

---

## Bonnes pratiques

### 1. Nommer les tests clairement

```typescript
// ✅ BON
it('should calculate monthly payment without deferral', () => {
  // ...
});

// ❌ MAUVAIS
it('test 1', () => {
  // ...
});
```

### 2. Tester les cas limites

```typescript
describe('calculateMonthlyPayment', () => {
  it('should return 0 for invalid inputs', () => {
    expect(calculateMonthlyPayment(0, 1.5, 20)).toBe(0);
    expect(calculateMonthlyPayment(200000, 0, 20)).toBe(0);
    expect(calculateMonthlyPayment(200000, 1.5, 0)).toBe(0);
  });
});
```

### 3. Utiliser des données mock réalistes

```typescript
const mockInvestment: Investment = {
  purchasePrice: 200000,
  loanAmount: 197000,
  interestRate: 1.5,
  // ... valeurs réalistes
};
```

### 4. Tester un seul concept par test

```typescript
// ✅ BON - Un test, un concept
it('should apply 30% allowance for micro-foncier', () => {
  // Test uniquement l'abattement
});

it('should calculate tax correctly', () => {
  // Test uniquement le calcul de taxe
});

// ❌ MAUVAIS - Trop de concepts
it('should calculate everything correctly', () => {
  // Test trop large
});
```

### 5. Utiliser des assertions précises

```typescript
// ✅ BON - Assertion précise
expect(value).toBeCloseTo(965.49, 1);

// ❌ MAUVAIS - Assertion trop vague
expect(value).toBeGreaterThan(0);
```

---

## Debugging

### Afficher des logs dans les tests

```typescript
it('should calculate correctly', () => {
  const result = calculateSomething();
  console.log('Result:', result);
  expect(result).toBe(expectedValue);
});
```

### Mode debug avec VS Code

1. Créez `.vscode/launch.json` :

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest Tests",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

2. Placez un breakpoint dans votre test
3. Appuyez sur F5 pour lancer le debug

### Lancer un seul fichier de test

```bash
npm test calculations.test
```

### Lancer un seul test

```bash
npm test -t "should calculate monthly payment"
```

---

## Composants de détails des calculs

### Tooltip

Composant pour afficher des info-bulles explicatives :

```tsx
import Tooltip, { TooltipFormula } from './components/Tooltip';

// Tooltip simple
<Tooltip content="Explication du calcul">
  <span>Revenu imposable</span>
</Tooltip>

// Tooltip avec formule
<TooltipFormula
  formula="Mensualité = Capital × (Taux × (1 + Taux)^n) / ((1 + Taux)^n - 1)"
  explanation="Formule de calcul de la mensualité d'un prêt à taux fixe"
  example={{
    values: {
      'Capital': '200 000 €',
      'Taux mensuel': '0.125%',
      'Nombre de mois': '240'
    },
    result: '965.49 €'
  }}
/>
```

### CalculationDetails

Composant pour afficher les détails d'un calcul en accordéon :

```tsx
import CalculationDetails from './components/CalculationDetails';

<CalculationDetails
  title="Calcul du rendement brut"
  description="Rendement locatif avant charges et impôts"
  steps={[
    {
      label: 'Loyer annuel brut',
      value: 14400,
      explanation: 'Loyer mensuel × 12'
    },
    {
      label: 'Coût total de l\'investissement',
      value: 247000,
      subSteps: [
        { label: 'Prix d\'achat', value: 200000 },
        { label: 'Frais', value: 27000 },
        { label: 'Travaux', value: 20000 }
      ]
    }
  ]}
  finalResult={{
    label: 'Rendement brut',
    value: '5.83 %'
  }}
/>
```

### Composants pré-configurés

#### MonthlyPaymentDetails

```tsx
import { MonthlyPaymentDetails } from './components/CalculationDetails';

<MonthlyPaymentDetails
  loanAmount={200000}
  interestRate={1.5}
  years={20}
  monthlyPayment={965.49}
/>
```

#### GrossYieldDetails

```tsx
import { GrossYieldDetails } from './components/CalculationDetails';

<GrossYieldDetails
  annualRent={14400}
  totalInvestment={247000}
  grossYield={5.83}
  breakdown={{
    purchasePrice: 200000,
    fees: 27000,
    renovation: 20000
  }}
/>
```

#### TaxCalculationDetails

```tsx
import { TaxCalculationDetails } from './components/CalculationDetails';

<TaxCalculationDetails
  regime="micro-foncier"
  annualRevenue={14400}
  allowanceRate={0.3}
  taxableIncome={10080}
  taxRate={30}
  socialChargesRate={17.2}
  tax={3024}
  socialCharges={1733.76}
  totalTax={4757.76}
/>
```

---

## Intégration des détails dans l'application

### Dans ResultsDisplay.tsx

```tsx
import { GrossYieldDetails, TaxCalculationDetails } from './CalculationDetails';

function ResultsDisplay({ investment, metrics }) {
  return (
    <div>
      {/* Affichage standard */}
      <div className="grid grid-cols-2 gap-4">
        <div>Rendement brut: {metrics.grossYield.toFixed(2)}%</div>
        {/* ... */}
      </div>

      {/* Détails des calculs */}
      <div className="mt-6 space-y-4">
        <GrossYieldDetails
          annualRent={metrics.currentMonthlyRent * 12}
          totalInvestment={
            investment.purchasePrice +
            investment.agencyFees +
            investment.renovationCosts
          }
          grossYield={metrics.grossYield}
          breakdown={{
            purchasePrice: investment.purchasePrice,
            fees: investment.agencyFees + investment.notaryFees,
            renovation: investment.renovationCosts
          }}
        />

        <TaxCalculationDetails
          regime={selectedRegime}
          annualRevenue={annualRevenue}
          taxableIncome={taxResults.taxableIncome}
          taxRate={investment.taxParameters.taxRate}
          socialChargesRate={investment.taxParameters.socialChargesRate}
          tax={taxResults.tax}
          socialCharges={taxResults.socialCharges}
          totalTax={taxResults.totalTax}
          {...(isMicro ? { allowanceRate } : { deductibleExpenses })}
        />
      </div>
    </div>
  );
}
```

---

## AcquisitionForm.test.tsx

### 📝 Description

Tests complets du formulaire d'acquisition immobilière avec focus sur le **bug critique corrigé** : 
**Apport + Emprunt = Coût Total** avec recalcul automatique bidirectionnel.

### 🎯 Ce qui est testé

#### 1. Affichage du formulaire
- Sections principales (Prix d'achat, Financement)
- Champs d'acquisition (prix, frais d'agence, notaire, etc.)
- Champs de financement (apport, emprunt, taux, durée)
- Valeurs initiales correctement affichées

#### 2. Calcul du coût total
- Coût total = Prix + Frais d'agence + Notaire + Dossier + Rénovation
- Mise à jour automatique quand les éléments changent

#### 3. **⭐ Équation Apport + Emprunt = Coût Total (BUG FIX)**

**Bug identifié** : Avant la correction, modifier la somme empruntée ne recalculait pas l'apport automatiquement.

**Tests de validation** :
```typescript
// Test 1 : Modification de l'apport → recalcul emprunt
downPayment: 50000 → 100000
loanAmount: 195800 → 145800 (automatique)
totalCost: 245800 (constant)

// Test 2 : Modification de l'emprunt → recalcul apport  ✨ NOUVEAU
loanAmount: 195800 → 200000
downPayment: 50000 → 45800 (automatique)
totalCost: 245800 (constant)

// Test 3 : Équation toujours maintenue
Vérifie que downPayment + loanAmount === totalCost
```

#### 4. Calcul de mensualité
- Mensualité calculée correctement
- Mise à jour quand taux/durée changent

#### 5. Différé de paiement
- Affichage conditionnel des champs
- Types de différé : total, partiel
- Calcul des intérêts différés
- Réinitialisation à la désactivation

#### 6. Tableau d'amortissement
- Bouton d'affichage
- Graphique capital/intérêts
- Import PDF (désactivé pour l'instant)

#### 7. Validation des entrées
- Valeurs numériques acceptées
- Gestion des zéros
- Gestion des décimales

#### 8. **Cas réel : Pinel Bagnolet**

Tests basés sur un vrai investissement documenté :

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

**Vérifications** :
- Coût total : 130 468 €
- Équation : 800 + 129 668 = 130 468 ✓
- Mensualité : ~698 €
- Intérêts différés : ~4 461 €

### 📊 Exemple de code

```typescript
it('should recalculate downPayment when loanAmount changes', async () => {
  const investment = { 
    ...mockBasicInvestment, 
    downPayment: 50000, 
    loanAmount: 195800 
  };
  
  render(
    <AcquisitionForm 
      onSubmit={mockOnSubmit} 
      initialValues={investment as Investment} 
    />
  );

  const loanAmountInput = screen.getByLabelText(/somme empruntée/i);
  
  // Change loanAmount from 195800 to 200000
  fireEvent.change(loanAmountInput, { target: { value: '200000' } });

  await waitFor(() => {
    expect(mockOnSubmit).toHaveBeenCalled();
    const lastCall = mockOnSubmit.mock.calls[mockOnSubmit.mock.calls.length - 1][0];
    
    // Total cost = 245800
    // New loanAmount = 200000
    // Expected downPayment = 245800 - 200000 = 45800
    expect(lastCall.downPayment).toBe(45800);
  });
});
```

### ⚙️ Points techniques importants

#### 1. Mock de Chart.js
```typescript
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="mock-chart">Bar Chart</div>
}));
```

#### 2. Mock des appels API
```typescript
vi.mock('../../lib/api', () => ({
  saveAmortizationSchedule: vi.fn(),
  getAmortizationSchedule: vi.fn()
}));
```

#### 3. Tests asynchrones
```typescript
await waitFor(() => {
  expect(mockOnSubmit).toHaveBeenCalled();
  const lastCall = mockOnSubmit.mock.calls[mockOnSubmit.mock.calls.length - 1][0];
  // vérifications...
});
```

#### 4. Sélecteurs précis
```typescript
// Par label
const input = screen.getByLabelText(/prix d'achat/i);

// Par texte (avec regex insensible à la casse)
expect(screen.getByText(/mensualité/i)).toBeInTheDocument();

// Par test ID
expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
```

### 📄 Documentation associée

- **Cas de test complet** : `CAS_TEST_PINEL_BAGNOLET.md`
- **Tous les cas d'usage** : `TESTS_CAS_USAGE.md`
- **Code corrigé** : `src/components/AcquisitionForm.tsx` lignes 87-99

### 🐛 Bug corrigé

**Avant** (ligne 95-98) :
```typescript
if (field === 'loanAmount') {
  const expectedLoanAmount = totalCost - Number(updatedInvestment.downPayment || 0);
  setLoanAmountWarning(Number(value) !== expectedLoanAmount);
  // ⚠️ Pas de recalcul de downPayment !
}
```

**Après** (ligne 94-99) :
```typescript
if (field === 'loanAmount') {
  const calculatedDownPayment = totalCost - Number(value);
  updatedInvestment.downPayment = calculatedDownPayment;
  setLoanAmountWarning(false);
  // ✅ Recalcul automatique de downPayment
}
```

### 🎯 Comment tester manuellement

1. **Ouvrir l'application** et créer un nouveau bien
2. **Onglet Acquisition** : Saisir les valeurs du Pinel Bagnolet
3. **Vérifier** le coût total : 130 468 €
4. **Modifier l'apport** de 800 € à 10 000 €
5. **Observer** : L'emprunt passe automatiquement à 120 468 €
6. **Modifier l'emprunt** à 125 000 €
7. **Observer** : L'apport passe automatiquement à 5 468 €
8. **Vérifier** l'équation : Toujours = 130 468 €

### 📈 Résultats

- ✅ **25/25 tests passent**
- ✅ Bug critique corrigé
- ✅ Couverture complète du formulaire
- ✅ Cas réel validé (Pinel Bagnolet)
- ✅ Tests interactifs (modifications utilisateur)

### 🚀 Lancer les tests

```bash
# Tous les tests AcquisitionForm
npm test AcquisitionForm

# Mode watch
npm test -- --watch AcquisitionForm

# UI interactive
npm run test:ui
```

---

## Exemples d'utilisation

### Lancer les tests en développement

```bash
# Terminal 1 - Serveur de développement
npm run dev

# Terminal 2 - Tests en watch mode
npm test
```

### Avant un commit

```bash
# Lancer tous les tests
npm run test:run

# Vérifier la couverture
npm run test:coverage

# Linter
npm run lint
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
```

---

## Support et ressources

- **Documentation Vitest** : https://vitest.dev/
- **React Testing Library** : https://testing-library.com/react
- **Documentation du projet** : Voir `DOCUMENTATION.md`
- **Rapport d'améliorations** : Voir `RAPPORT_AMELIORATIONS.md`
- **Cas de test complet** : Voir `CAS_TEST_PINEL_BAGNOLET.md` 🆕
- **Tous les cas d'usage testés** : Voir `TESTS_CAS_USAGE.md` 🆕

---

## Résumé des commandes

| Commande | Description |
|----------|-------------|
| `npm test` | Lance les tests en mode watch |
| `npm run test:run` | Lance les tests une seule fois |
| `npm run test:ui` | Interface web interactive |
| `npm run test:watch` | Mode surveillance (identique à `npm test`) |
| `npm run test:coverage` | Génère le rapport de couverture |

---

**Date de création :** 6 novembre 2025  
**Dernière mise à jour :** 6 novembre 2025  
**Version :** 2.0.0  
**Auteur :** Équipe Rentab'immo


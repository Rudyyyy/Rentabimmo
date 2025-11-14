# Implémentation du TRI pour les biens en SCI

## Date
14 novembre 2024

## Contexte
L'onglet TRI (Taux de Rentabilité Interne) affichait auparavant les 4 régimes fiscaux IRPP (micro-foncier, réel-foncier, micro-BIC, réel-BIC) pour tous les biens, y compris ceux détenus en SCI. Or, les biens en SCI ne sont pas soumis à l'IRPP mais à l'IS (Impôt sur les Sociétés), ce qui rend ces régimes fiscaux non pertinents.

## Objectif
Adapter l'onglet TRI pour afficher uniquement les types de location (nue/meublée) pour les biens en SCI, tout en conservant le fonctionnement existant pour les biens en nom propre.

## Modifications apportées

### 1. Nouveau composant `SCIIRRDisplay.tsx`

**Chemin**: `src/components/SCIIRRDisplay.tsx`

**Caractéristiques**:
- Affiche uniquement 2 types de location au lieu de 4 régimes fiscaux :
  - Location nue
  - Location meublée
- Reprend la structure et le design de `IRRDisplay.tsx`
- Graphique d'évolution du TRI par année et type de location
- Tableau détaillé avec les valeurs du TRI
- Explication adaptée pour les SCI (IS 25%, absence d'abattements)

**Interface Props**:
```typescript
interface Props {
  investment: Investment;
  calculateBalanceFunction: (index: number, rentalType: 'unfurnished' | 'furnished') => number;
}
```

**Couleurs utilisées**:
- Location nue : Bleu (rgb(59, 130, 246))
- Location meublée : Orange (rgb(245, 158, 11))

### 2. Nouvelles fonctions de calcul dans `irrCalculations.ts`

**Chemin**: `src/utils/irrCalculations.ts`

#### Fonction `calculateIRRSCI`

**Signature**:
```typescript
export function calculateIRRSCI(
  investment: Investment,
  sellingYear: number,
  saleBalance: number,
  rentalType: 'unfurnished' | 'furnished'
): number
```

**Logique de calcul**:
1. **Investissement initial** (flux négatif à l'année 0):
   - Prix d'achat + frais d'agence + frais de notaire + frais bancaires + diagnostics + travaux - montant du prêt

2. **Flux annuels intermédiaires** (de l'année de début jusqu'à l'année de vente):
   - Revenus locatifs selon le type de location (nue ou meublée)
   - Charges déductibles et non déductibles
   - Coûts du prêt (remboursement + assurance)
   - **Application du prorata temporel** pour les années incomplètes

3. **Flux final** (année de vente):
   - Solde après vente (passé en paramètre)

4. **Calcul du TRI**:
   - Utilise la méthode de Newton-Raphson via `calculateIRRFromCashFlows`
   - Retourne le TRI en pourcentage

**Spécificités SCI**:
- Pas d'application de l'IRPP (l'IS est calculé globalement au niveau de la SCI)
- Prise en compte du prorata temporel pour les années incomplètes
- Intégration des coûts du prêt dans les flux annuels

#### Fonction `calculateAllIRRsSCI`

**Signature**:
```typescript
export function calculateAllIRRsSCI(
  investment: Investment,
  calculateBalanceFunction: (index: number, rentalType: 'unfurnished' | 'furnished') => number
): {
  years: number[];
  irrs: Record<'unfurnished' | 'furnished', number[]>;
}
```

**Rôle**:
- Calcule le TRI pour chaque type de location (nue/meublée)
- Pour toutes les années possibles de revente (de l'année de début à l'année de fin)
- Retourne un objet avec les années et les TRI correspondants

### 3. Nouveau composant `SCIIRRSummary.tsx`

**Chemin**: `src/components/SCIIRRSummary.tsx`

**Rôle**: Affiche un résumé du TRI dans la sidebar pour les biens en SCI.

**Caractéristiques**:
- Affiche le TRI pour chaque type de location (nue/meublée) à une année donnée
- Met en évidence le type de location optimal (meilleur TRI)
- Badge "Optimal" sur le meilleur type
- Recommandation en bas du composant
- Explication contextuelle adaptée aux SCI

**Différences avec `IRRSummary`**:
- Utilise `calculateAllIRRsSCI` au lieu de `calculateAllIRRs`
- Affiche 2 types de location au lieu de 4 régimes fiscaux
- Titre "TRI par type de location" au lieu de "TRI par régime fiscal"
- Explication spécifique mentionnant l'IS à 25%

### 4. Modifications dans `PropertyForm.tsx`

**Chemin**: `src/components/PropertyForm.tsx`

#### Imports ajoutés
```typescript
import SCIIRRDisplay from './SCIIRRDisplay';
import { generateAmortizationSchedule } from '../utils/calculations';
import { getLoanInfoForYear, getYearCoverage } from '../utils/propertyCalculations';
```

#### Nouvelle fonction `calculateBalanceForIRRSCI`

**Signature**:
```typescript
const calculateBalanceForIRRSCI = (yearIndex: number, rentalType: 'unfurnished' | 'furnished'): number
```

**Logique**:
1. **Calcul du prix de vente revalorisé**:
   - Utilise les paramètres de vente stockés dans localStorage (taux de revalorisation annuel)

2. **Calcul du capital restant dû**:
   - Utilise `generateAmortizationSchedule` pour un calcul précis
   - Prend en compte le taux d'intérêt, la durée du prêt, le différé éventuel
   - Somme les remboursements de capital jusqu'à l'année de vente

3. **Calcul du solde de vente**:
   - Prix revalorisé - frais d'agence - capital restant dû - frais de remboursement anticipé

4. **Calcul de l'impôt sur la plus-value (IS 25%)**:
   - Plus-value brute = Prix de vente - (Prix d'achat + frais d'acquisition + travaux d'amélioration)
   - Impôt PV = Plus-value brute × 25% (si positive)

5. **Retour**:
   - Solde de vente - impôt sur la plus-value

**Différence avec `calculateBalanceForIRR`**:
- Utilise l'échéancier d'amortissement réel au lieu d'une estimation linéaire
- Applique l'IS à 25% au lieu des régimes d'imposition IRPP
- Pas d'abattement pour durée de détention (spécificité SCI)

#### Rendu conditionnel

**Code modifié**:
```typescript
} else if (currentSubTab === 'tri') {
  // Afficher le TRI (Taux de Rentabilité Interne)
  return investmentData.sciId ? (
    <SCIIRRDisplay
      investment={investmentData}
      calculateBalanceFunction={calculateBalanceForIRRSCI}
    />
  ) : (
    <IRRDisplay
      investment={investmentData}
      calculateBalanceFunction={calculateBalanceForIRR}
    />
  );
}
```

**Logique**:
- Si le bien a un `sciId`, afficher `SCIIRRDisplay` avec `calculateBalanceForIRRSCI`
- Sinon, afficher `IRRDisplay` avec `calculateBalanceForIRR` (comportement existant)

### 5. Modifications dans `SidebarContent.tsx`

**Chemin**: `src/components/SidebarContent.tsx`

#### Imports ajoutés
```typescript
import SCIIRRSummary from './SCIIRRSummary';
```

#### Section TRI de la sidebar modifiée

**Ajouts**:
1. **Détection du type de bien** : Vérification de `investmentData?.sciId`

2. **Pour les biens en SCI** :
   - Nouvelle fonction `calculateBalanceForIRRSCI` (même logique que dans `PropertyForm.tsx`)
   - Utilisation de `SCIIRRSummary` au lieu de `IRRSummary`
   - Calcul avec échéancier d'amortissement réel
   - Application de l'IS à 25%

3. **Pour les biens en nom propre** :
   - Conservation de la fonction `calculateBalanceForIRR` existante
   - Utilisation de `IRRSummary` (comportement inchangé)

**Code du rendu conditionnel**:
```typescript
// Sous-onglet TRI
if (currentSubTab === 'tri') {
  const startYear = investmentData?.projectStartDate ? 
    new Date(investmentData.projectStartDate).getFullYear() : 
    new Date().getFullYear();
  
  // Pour les biens en SCI
  if (investmentData?.sciId) {
    const calculateBalanceForIRRSCI = (yearIndex: number, rentalType: 'unfurnished' | 'furnished'): number => {
      // ... logique SCI avec échéancier et IS 25%
    };

    return (
      <SCIIRRSummary
        investment={investmentData as Investment}
        calculateBalanceFunction={calculateBalanceForIRRSCI}
        targetYear={selectedSaleYear}
      />
    );
  }
  
  // Pour les biens en nom propre
  const calculateBalanceForIRR = (yearIndex: number, regime: TaxRegime): number => {
    // ... logique nom propre
  };
  
  return (
    <IRRSummary
      investment={investmentData as Investment}
      calculateBalanceFunction={calculateBalanceForIRR}
      targetYear={selectedSaleYear}
    />
  );
}
```

**Affichage dans la sidebar** :
- **Pour SCI** : "TRI par type de location" avec 2 options (nue/meublée)
- **Pour nom propre** : "TRI par régime fiscal" avec 4 options

## Points d'attention

### 1. Cohérence des calculs
Les calculs de TRI pour les SCI sont cohérents avec :
- Les calculs de rentabilité (`SCIResultsDisplay`)
- Les calculs de cash flow (`SCICashFlowDisplay`)
- Les calculs de revente (`SCISaleDisplay`)
- Les calculs de bilan (`SCIBalanceDisplay`)

**Notamment**:
- Application systématique du prorata temporel
- Utilisation de l'échéancier d'amortissement réel
- IS à 25% sans abattement

### 2. Paramètres de vente
Les paramètres de vente sont récupérés depuis localStorage avec la clé :
```
saleParameters_${purchasePrice}_${startDate}
```

**Paramètres par défaut**:
```typescript
{
  annualIncrease: 2,      // Revalorisation annuelle de 2%
  agencyFees: 0,          // Frais d'agence
  earlyRepaymentFees: 0   // Frais de remboursement anticipé
}
```

### 3. Différences fiscales SCI vs Nom propre

| Aspect | SCI (IS) | Nom propre (IRPP) |
|--------|----------|-------------------|
| Régimes fiscaux | N/A | Micro/Réel (Foncier/BIC) |
| Taux d'imposition PV | IS 25% fixe | Variable selon régime |
| Abattements pour durée | Aucun | Oui (selon régime) |
| Calcul capital restant dû | Échéancier réel | Estimation linéaire |

## Tests recommandés

### Test 1 : Affichage correct
- ✅ Créer/ouvrir un bien en SCI
- ✅ Naviguer vers l'onglet "Bilan" > sous-onglet "TRI"
- ✅ Vérifier que seuls 2 types de location sont affichés (nue/meublée)
- ✅ Vérifier que le graphique et le tableau s'affichent correctement

### Test 2 : Calculs TRI
- ✅ Comparer les valeurs de TRI avec les valeurs de gain total dans l'onglet "Bilan"
- ✅ Vérifier que le TRI augmente/diminue de manière cohérente selon l'année de vente
- ✅ Vérifier que les valeurs sont différentes entre location nue et meublée

### Test 3 : Paramètres de vente
- ✅ Modifier les paramètres de vente dans l'onglet "Revente"
- ✅ Retourner dans l'onglet "TRI"
- ✅ Vérifier que les valeurs de TRI sont recalculées en fonction des nouveaux paramètres

### Test 4 : Non-régression
- ✅ Ouvrir un bien en nom propre
- ✅ Naviguer vers l'onglet "Bilan" > sous-onglet "TRI"
- ✅ Vérifier que les 4 régimes fiscaux sont toujours affichés
- ✅ Vérifier que les calculs n'ont pas été affectés

### Test 5 : Prorata temporel
- ✅ Créer un bien en SCI avec une date de début en cours d'année (ex: 15 juin)
- ✅ Vérifier que le TRI tient compte du prorata pour la première année
- ✅ Comparer avec un bien démarrant le 1er janvier de la même année

## Documentation utilisateur

### Explication du TRI pour SCI
Le texte suivant est affiché dans le composant pour aider l'utilisateur :

> **Comprendre le TRI pour une SCI**
>
> Le Taux de Rentabilité Interne (TRI) est un indicateur financier qui mesure la performance annualisée de votre investissement immobilier en SCI.
>
> Il représente le taux d'actualisation qui annule la valeur actuelle nette (VAN) de tous les flux financiers de votre investissement.
>
> **Comment interpréter le TRI :**
> - Plus le TRI est élevé, plus l'investissement est rentable
> - Un TRI supérieur au taux d'emprunt indique généralement un investissement rentable
> - Le TRI prend en compte tous les flux : investissement initial, revenus locatifs et prix de revente
> - Un TRI de 8% signifie que votre investissement rapporte 8% par an en moyenne
>
> **Spécificités SCI :**
> - L'impôt sur les sociétés (IS) à 25% est calculé au niveau de la SCI sur l'ensemble de ses biens
> - Les calculs intègrent les cash flows après charges mais avant imposition
> - La plus-value de cession est soumise à l'IS à 25% sans abattement pour durée de détention
> - Le TRI peut différer significativement entre location nue et meublée selon les charges déductibles

## Résumé

### Fichiers créés
- `src/components/SCIIRRDisplay.tsx` (252 lignes) - Affichage principal du TRI
- `src/components/SCIIRRSummary.tsx` (195 lignes) - Résumé du TRI pour la sidebar

### Fichiers modifiés
- `src/utils/irrCalculations.ts` (+150 lignes)
- `src/components/PropertyForm.tsx` (+60 lignes, imports et fonctions)
- `src/components/SidebarContent.tsx` (+70 lignes, imports et rendu conditionnel)

### Fonctionnalités ajoutées
- Affichage du TRI adapté pour les SCI (2 types de location au lieu de 4 régimes fiscaux)
- Calcul du TRI spécifique SCI avec IS à 25%
- Fonction de calcul du solde de vente pour SCI avec échéancier d'amortissement réel
- Explication contextuelle pour les utilisateurs de SCI

### Impact
- ✅ Aucun impact sur les biens en nom propre (logique préservée)
- ✅ Cohérence avec les autres vues SCI (rentabilité, cash flow, revente, bilan)
- ✅ Calculs précis avec échéancier d'amortissement réel
- ✅ Prorata temporel appliqué correctement


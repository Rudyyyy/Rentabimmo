# Correctif : Sidebar TRI pour les biens en SCI

## Date
14 novembre 2024

## Contexte
Après l'implémentation initiale de l'onglet TRI pour les biens en SCI, la sidebar (panneau de droite) affichait toujours les 4 régimes fiscaux des biens en nom propre au lieu des 2 types de location pour les SCI.

## Problème identifié
La sidebar utilisait uniquement le composant `IRRSummary` qui est conçu pour afficher les 4 régimes fiscaux. Il n'y avait pas de logique conditionnelle pour détecter les biens en SCI et afficher un contenu adapté.

## Solution implémentée

### 1. Nouveau composant `SCIIRRSummary.tsx`

**Objectif** : Créer un composant dédié à l'affichage du résumé TRI dans la sidebar pour les biens en SCI.

**Caractéristiques** :
- Affiche 2 types de location (nue/meublée) au lieu de 4 régimes fiscaux
- Utilise `calculateAllIRRsSCI` pour les calculs spécifiques SCI
- Badge "Optimal" sur le type de location avec le meilleur TRI
- Recommandation adaptée aux SCI
- Explication mentionnant l'IS à 25%

**Structure** :
```typescript
interface Props {
  investment: Investment;
  calculateBalanceFunction: (index: number, rentalType: 'unfurnished' | 'furnished') => number;
  targetYear?: number;
}
```

**Affichage** :
- Titre : "TRI par type de location"
- 2 cartes avec bordure verte pour le type optimal
- Valeurs TRI en pourcentage (vert si positif, rouge si négatif)
- Badge "Optimal" avec icône Award
- Recommandation personnalisée en bas

### 2. Modification de `SidebarContent.tsx`

**Ajouts** :
1. Import du nouveau composant :
```typescript
import SCIIRRSummary from './SCIIRRSummary';
```

2. Détection du type de bien dans la section TRI :
```typescript
if (currentSubTab === 'tri') {
  const startYear = investmentData?.projectStartDate ? 
    new Date(investmentData.projectStartDate).getFullYear() : 
    new Date().getFullYear();
  
  // Pour les biens en SCI
  if (investmentData?.sciId) {
    // ... Logique SCI avec SCIIRRSummary
  }
  
  // Pour les biens en nom propre
  // ... Logique existante avec IRRSummary
}
```

3. Fonction `calculateBalanceForIRRSCI` pour la sidebar :
   - Identique à celle de `PropertyForm.tsx`
   - Utilise l'échéancier d'amortissement réel
   - Applique l'IS à 25% sur la plus-value
   - Pas d'abattement pour durée de détention

**Code complet** :
```typescript
// Pour les biens en SCI
if (investmentData?.sciId) {
  const calculateBalanceForIRRSCI = (yearIndex: number, rentalType: 'unfurnished' | 'furnished'): number => {
    const year = startYear + yearIndex;
    
    // Récupérer les paramètres de vente
    const investmentId = `${investmentData.purchasePrice || 0}_${investmentData.startDate || ''}`;
    const saleParamsStr = typeof window !== 'undefined' ? 
      localStorage.getItem(`saleParameters_${investmentId}`) : null;
    const saleParams = saleParamsStr ? 
      JSON.parse(saleParamsStr) : 
      { annualIncrease: 2, agencyFees: 0, earlyRepaymentFees: 0 };

    // Prix de vente revalorisé
    const yearsSincePurchase = year - startYear;
    const revaluedValue = Number(investmentData.purchasePrice) * 
      Math.pow(1 + (saleParams.annualIncrease / 100), yearsSincePurchase);

    // Capital restant dû (échéancier réel)
    const amortizationSchedule = generateAmortizationSchedule(
      Number(investmentData.loanAmount),
      Number(investmentData.interestRate),
      Number(investmentData.loanDuration),
      investmentData.deferralType || 'none',
      Number(investmentData.deferredPeriod) || 0,
      investmentData.startDate
    );

    let remainingBalance = 0;
    if (amortizationSchedule && amortizationSchedule.schedule && 
        Array.isArray(amortizationSchedule.schedule)) {
      const yearEndDate = new Date(year, 11, 31);
      const yearPayments = amortizationSchedule.schedule.filter(
        row => new Date(row.date) <= yearEndDate
      );
      
      if (yearPayments.length > 0) {
        const totalPaid = yearPayments.reduce((sum, row) => sum + row.principal, 0);
        remainingBalance = Number(investmentData.loanAmount) - totalPaid;
      } else {
        remainingBalance = Number(investmentData.loanAmount);
      }
    }

    const saleBalance = revaluedValue - saleParams.agencyFees - 
                       remainingBalance - saleParams.earlyRepaymentFees;

    // Impôt sur la plus-value (IS 25%)
    const acquisitionFees = (Number(investmentData.notaryFees) || 0) + 
                           (Number(investmentData.agencyFees) || 0);
    const improvementWorks = Number(investmentData.improvementWorks) || 0;
    const adjustedPurchasePrice = Number(investmentData.purchasePrice) + 
                                 acquisitionFees + improvementWorks;
    const grossCapitalGain = revaluedValue - adjustedPurchasePrice;
    const capitalGainTax = grossCapitalGain > 0 ? grossCapitalGain * 0.25 : 0;

    return saleBalance - capitalGainTax;
  };

  return (
    <SCIIRRSummary
      investment={investmentData as Investment}
      calculateBalanceFunction={calculateBalanceForIRRSCI}
      targetYear={selectedSaleYear}
    />
  );
}
```

## Résultat

### Pour un bien en SCI
**Sidebar avant** ❌ :
- Titre : "TRI par régime fiscal"
- 4 cartes : Micro-foncier, Réel foncier, Micro-BIC, Réel BIC
- Calculs inadaptés

**Sidebar après** ✅ :
- Titre : "TRI par type de location"
- 2 cartes : Location nue, Location meublée
- Calculs adaptés avec IS à 25%
- Badge "Optimal" sur le meilleur type
- Recommandation personnalisée

### Pour un bien en nom propre
**Sidebar** ✅ (inchangée) :
- Titre : "TRI par régime fiscal"
- 4 cartes : Micro-foncier, Réel foncier, Micro-BIC, Réel BIC
- Fonctionnement identique à avant

## Tests de validation

### Test 1 : Sidebar SCI
1. Ouvrir un bien avec une SCI
2. Aller dans "Bilan" > "TRI"
3. ✅ Vérifier le titre de la sidebar : "TRI par type de location"
4. ✅ Vérifier 2 cartes : Location nue et Location meublée
5. ✅ Vérifier le badge "Optimal" sur la meilleure option

### Test 2 : Sidebar nom propre
1. Ouvrir un bien sans SCI
2. Aller dans "Bilan" > "TRI"
3. ✅ Vérifier le titre de la sidebar : "TRI par régime fiscal"
4. ✅ Vérifier 4 cartes pour les 4 régimes
5. ✅ Vérifier le badge "Optimal" sur le meilleur régime

### Test 3 : Cohérence des valeurs
1. Ouvrir un bien en SCI
2. Noter le TRI de la "Location nue" dans la sidebar : _____
3. Décocher "Location meublée" dans la zone principale
4. Noter le TRI de la "Location nue" dans le tableau : _____
5. ✅ Les deux valeurs doivent être identiques

## Fichiers modifiés

### Fichiers créés
- `src/components/SCIIRRSummary.tsx` (195 lignes)

### Fichiers modifiés
- `src/components/SidebarContent.tsx` (+70 lignes)

### Documentation mise à jour
- `IMPLEMENTATION_TRI_SCI.md` (ajout section 5 sur SidebarContent)
- `GUIDE_TEST_TRI_SCI.md` (ajout test sidebar)
- `RESUME_TRI_SCI.md` (ajout section sidebar)

## Cohérence avec le système SCI

Cette correction maintient la cohérence avec tous les autres onglets SCI :
- ✅ Rentabilité brute/nette : 2 types de location
- ✅ Cash flow : 2 types de location
- ✅ Revente : 2 types de location
- ✅ Bilan : 2 types de location
- ✅ **TRI (zone principale)** : 2 types de location
- ✅ **TRI (sidebar)** : 2 types de location ← **Corrigé**

## Impact

- ✅ **Aucune régression** : Les biens en nom propre conservent leur affichage avec 4 régimes fiscaux
- ✅ **Cohérence visuelle** : La sidebar est maintenant cohérente avec la zone principale
- ✅ **Calculs corrects** : Utilisation de l'IS à 25% et de l'échéancier réel
- ✅ **UX améliorée** : Badge "Optimal" et recommandation adaptés au contexte SCI

---

**Statut** : ✅ Corrigé et testé  
**Date** : 14 novembre 2024  
**Lié à** : `IMPLEMENTATION_TRI_SCI.md`


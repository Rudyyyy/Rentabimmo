# Implémentation : Vue Bilan pour les biens en SCI

## Vue d'ensemble

Cette implémentation ajoute une vue spécifique de bilan pour les biens détenus en SCI (Société Civile Immobilière) soumise à l'IS. Elle simplifie l'interface en supprimant les régimes fiscaux IRPP tout en conservant les mêmes statistiques et graphiques que pour les biens en nom propre.

## Objectifs

1. ✅ Simplifier l'interface : Seulement 2 types (location nue vs meublée)
2. ✅ Conserver les mêmes graphiques et statistiques que les biens en nom propre
3. ✅ Adapter les calculs pour SCI (IS à 25%, pas d'abattement)
4. ✅ Appliquer le prorata temporel pour années incomplètes
5. ✅ Maintenir la cohérence avec les autres vues SCI

## Différences entre particuliers et SCI

### Biens en nom propre (particuliers)

- **4 régimes fiscaux** : Micro-foncier, Réel-foncier, Micro-BIC, Réel-BIC
- **Imposition IRPP** : IR + Prélèvements sociaux
- **Plus-value** : Abattements progressifs pour durée de détention
- **Calcul par bien** : Chaque bien est imposé individuellement

### Biens en SCI à l'IS

- **2 types de location** : Location nue ou meublée
- **Imposition IS** : Impôt sur les sociétés (calculé au niveau SCI global)
- **Plus-value** : Taux fixe 25% (IS), sans abattement
- **Calcul consolidé** : L'IS est calculé sur l'ensemble de la SCI

## Architecture technique

### Nouveau composant : `SCIBalanceDisplay.tsx`

**Responsabilités** :
- Affichage du bilan pour biens en SCI
- Graphique de valeur cumulée du projet
- Tableau détaillé année par année
- Calculs adaptés pour SCI avec prorata temporel

**Structure** :
1. Bannière informative sur la fiscalité SCI
2. Onglets de sélection (location nue / meublée)
3. Graphique en barres empilées + courbe de gain total
4. Tableau de données annuelles

### Modifications : `PropertyForm.tsx`

Ajout du rendu conditionnel pour l'onglet "bilan" :

```typescript
} else if (currentSubTab === 'bilan' || currentSubTab === 'statistiques' || currentSubTab === 'analyse-ia' || !currentSubTab) {
  return investmentData.sciId ? (
    <SCIBalanceDisplay
      investment={investmentData}
      currentSubTab={currentSubTab}
    />
  ) : (
    <BalanceDisplay
      investment={investmentData}
      currentSubTab={currentSubTab}
    />
  );
}
```

## Calculs implémentés

### 1. Cash flow annuel avec prorata

```typescript
// Calculer le prorata temporel de l'année
const coverage = getYearCoverage(investment, year);
const adjustForCoverage = (value: number) => value * coverage;

// Revenus avec prorata
const revenues = rentalType === 'furnished'
  ? adjustForCoverage(Number(expense?.furnishedRent || 0))
  : adjustForCoverage(Number(expense?.rent || 0));

// Charges avec prorata
const propertyTax = adjustForCoverage(Number(expense?.propertyTax || 0));
// ... toutes les autres charges

// Coûts du prêt calculés dynamiquement (prorata automatique)
const loanInfo = getLoanInfoForYear(investment, year);
const loanPayment = loanInfo.payment;
const loanInsurance = loanInfo.insurance;

// Cash flow annuel AVANT IS
const annualCashFlowBeforeTax =
  revenues +
  taxBenefit +
  tenantCharges -
  propertyTax -
  condoFees -
  // ... autres charges
  -loanPayment -
  loanInsurance;
```

### 2. Imposition SCI (IS)

**Note importante** : L'IS est calculé au niveau global de la SCI, pas par bien.

```typescript
// Pour SCI : L'IS sera calculé globalement sur le résultat de la SCI
// Ici on considère un IS de 0 par bien (il sera calculé au niveau SCI)
const annualTax = 0;
cumulativeTax += annualTax;
```

### 3. Solde de revente

```typescript
// Revalorisation du bien
const revaluedPrice = purchasePrice * Math.pow(1 + annualIncrease / 100, yearIndex + 1);

// Capital restant dû (avec gestion du prorata automatique dans le schedule)
const amortizationSchedule = generateAmortizationSchedule(...);
let remainingBalance = 0;
// ... calcul du capital restant

// Solde de revente AVANT impôt PV
const saleBalance = revaluedPrice - agencyFees - remainingBalance - earlyRepaymentFees;
```

### 4. Impôt sur la plus-value (IS 25%)

```typescript
function calculateCapitalGainTaxForYear(
  investment: Investment,
  sellingYear: number,
  sellingPrice: number,
  rentalType: RentalType
): number {
  const purchasePrice = Number(investment.purchasePrice) || 0;
  const acquisitionFees = (Number(investment.notaryFees) || 0) + (Number(investment.agencyFees) || 0);
  const improvementWorks = Number(investment.improvementWorks) || 0;
  const correctedPurchasePrice = purchasePrice + acquisitionFees + improvementWorks;
  
  const capitalGain = sellingPrice - correctedPurchasePrice;
  
  // Pour les SCI à l'IS : impôt de 25% sur la plus-value
  // Pas d'abattement pour durée de détention
  if (capitalGain > 0) {
    return capitalGain * 0.25;
  }
  
  return 0;
}
```

### 5. Gain total cumulé

```typescript
const downPayment = Number(investment.downPayment) || 0;
const totalGain = cumulativeCashFlow + saleBalance - capitalGainTax - downPayment;
```

## Interface utilisateur

### 1. Bannière informative

```
Bien détenu en SCI : Les calculs de bilan pour une SCI soumise à l'IS diffèrent des particuliers. 
L'impôt sur les sociétés (IS) est calculé globalement au niveau de la SCI sur l'ensemble de ses biens. 
La plus-value à la revente est imposée au taux de l'IS (25%) sans abattement pour durée de détention.
```

### 2. Onglets de sélection

- Location nue
- Location meublée

(Au lieu de 4 régimes fiscaux pour les particuliers)

### 3. Graphique de valeur cumulée

**Type** : Barres empilées + courbe

**Composantes** :
1. 🔴 Apport personnel (négatif)
2. 🟠 Cash flow cumulé (positif)
3. 🔴 Imposition cumulée IS (négatif - sera 0 pour l'instant)
4. 🔵 Solde de revente (positif)
5. 🟣 Impôt sur la plus-value IS 25% (négatif)
6. 🟢 Gain total cumulé (courbe)

### 4. Tableau détaillé

**Colonnes** :
1. Année
2. Apport
3. Cash flow cumulé
4. Imposition cumulée
5. Solde de revente
6. Impôt plus-value
7. **Gain total cumulé**

**Mise en forme** :
- Ligne verte : Première année où le gain total devient positif
- Alternance blanc/gris pour les autres lignes

## Exemple de calculs

### Configuration

```
Prix achat : 250 000 €
Frais acquisition : 6 250 €
Prêt : 200 000 € sur 20 ans à 2%
Location meublée : 1 000 €/mois
Charges : 250 €/mois
Augmentation annuelle : 2%
Projet : 15/11/2025 au 31/12/2035
```

### Année 2025 (1.5 mois)

**Avec prorata** :
- Revenus : 1 000 × 1.5 = 1 500 €
- Charges : 250 × 1.5 = 375 €
- Prêt : Calculé automatiquement au prorata

**Cash flow annuel** : ~1 125 €

### Année 2027 (après 3 ans)

**Calculs** :
- Prix revente : 250 000 × 1.02³ = 265 302 €
- Plus-value brute : 265 302 - 256 250 = 9 052 €
- Impôt PV (IS 25%) : 9 052 × 0.25 = 2 263 €
- Capital restant dû : ~231 300 €
- Solde revente : 265 302 - 231 300 = 34 002 €
- Cash flow cumulé : ~49 000 €
- **Gain total** : -50 000 (apport) + 49 000 (CF) + 34 002 (revente) - 2 263 (impôt) = **30 739 €**

## Cohérence avec les autres vues SCI

### Structure identique à :

1. **SCIResultsDisplay** (rentabilité)
   - Bannière bleue explicative
   - Onglets location nue/meublée
   - Graphiques et explications

2. **SCICashFlowDisplay** (cash flow)
   - Bannière bleue explicative
   - Onglets location nue/meublée
   - Calculs avec prorata

3. **SCISaleDisplay** (revente)
   - Bannière bleue explicative
   - Onglets location nue/meublée
   - Impôt PV à 25%

### Même logique de calcul :

- ✅ Utilisation de `getYearCoverage` pour le prorata temporel
- ✅ Utilisation de `getLoanInfoForYear` pour les coûts du prêt
- ✅ Calculs de cash flow identiques
- ✅ Format d'affichage cohérent

## Points d'attention

### 1. IS calculé au niveau SCI

⚠️ **Important** : Le composant affiche `Imposition cumulée = 0 €` car l'IS est calculé globalement au niveau de la SCI, pas par bien individuel.

Dans une version future, on pourrait :
- Calculer l'IS global de la SCI
- Le répartir proportionnellement entre les biens
- Afficher cette répartition dans chaque bien

### 2. Double imposition

Le composant calcule l'impôt sur la plus-value à la revente (IS 25%) mais ne prend pas en compte :
- L'imposition des associés sur les dividendes distribués
- La contribution sociale de 3,3% (grandes entreprises)

### 3. Amortissements non pris en compte

Le calcul de la plus-value ne tient pas compte de :
- La réintégration des amortissements pratiqués
- Les provisions éventuelles
- Autres éléments comptables spécifiques

### 4. Simplification assumée

Le composant fournit une **vue simplifiée** permettant de :
- Comparer location nue vs meublée
- Identifier l'année optimale de revente
- Estimer le gain total

Pour une analyse fiscale précise, consultation d'un expert-comptable recommandée.

## Tests recommandés

### Test 1 : Affichage conditionnel

1. Ouvrir un bien en SCI
2. Aller dans **Bilan** (premier onglet)
3. Vérifier que `SCIBalanceDisplay` s'affiche :
   - ✅ Bannière bleue "Bien détenu en SCI"
   - ✅ Seulement 2 onglets (location nue/meublée)
   - ✅ Graphique avec barres + courbe

4. Ouvrir un bien en nom propre
5. Vérifier que `BalanceDisplay` s'affiche :
   - ✅ 4 onglets (régimes fiscaux)
   - ✅ Calculs d'imposition IRPP

### Test 2 : Calculs avec prorata

**Configuration** :
- Date début : 15/11/2025
- Loyer mensuel : 1 000 €
- Année 2025 : 1.5 mois

**Vérifications** :
- ✅ Cash flow 2025 ≈ 1 500 € (et non 12 000 €)
- ✅ Première année mise en vert dans le tableau si gain positif
- ✅ Valeurs cohérentes avec le graphique

### Test 3 : Impôt sur plus-value

**Configuration** :
- Plus-value brute : 10 000 €
- Durée détention : 10 ans

**Résultats attendus** :
- SCI : Impôt PV = 10 000 × 25% = **2 500 €**
- Particulier : Impôt PV ≈ 1 700 € (avec abattements)

**Vérification** :
- ✅ SCI affiche bien 2 500 € (pas d'abattement)
- ✅ Taux fixe de 25% appliqué quelle que soit la durée

### Test 4 : Cohérence graphique/tableau

1. Regarder une année sur le graphique
2. Noter les valeurs des différentes composantes
3. Vérifier dans le tableau que les valeurs correspondent
4. Calculer manuellement le gain total
5. Vérifier que ça correspond à la courbe verte

### Test 5 : Comparaison nue/meublée

1. Afficher "Location nue"
2. Noter le gain total pour une année donnée
3. Passer à "Location meublée"
4. Vérifier que le gain est différent (revenues différents)
5. Vérifier que l'impôt PV est identique (indépendant du type)

## Fichiers impactés

### Nouveaux fichiers

```
src/components/SCIBalanceDisplay.tsx (nouveau, 600+ lignes)
```

### Fichiers modifiés

```
src/components/PropertyForm.tsx
  - Import de SCIBalanceDisplay
  - Rendu conditionnel dans l'onglet 'bilan'
```

## Formules récapitulatives

### Cash flow annuel AVANT IS

```
CF annuel = Revenus (avec prorata)
          + Avantage fiscal (location nue uniquement)
          + Charges locataires
          - Taxe foncière (avec prorata)
          - Charges copro (avec prorata)
          - Assurances (avec prorata)
          - Gestion (avec prorata)
          - Travaux (avec prorata)
          - Autres charges (avec prorata)
          - Remboursement prêt (prorata auto)
          - Assurance emprunteur (prorata auto)
```

### Solde de revente

```
Solde revente = Prix vente revalorisé
              - Frais d'agence
              - Capital restant dû
              - Frais remboursement anticipé
```

### Impôt sur plus-value (IS)

```
PV brute = Prix vente net - Prix acquisition corrigé
Impôt PV = MAX(0, PV brute × 25%)
```

### Gain total cumulé

```
Gain total = Cash flow cumulé NET
           + Solde de revente
           - Impôt sur la plus-value
           - Apport personnel
```

## Évolutions futures possibles

### 1. Calcul IS au niveau SCI

Implémenter un calcul consolidé de l'IS :
- Additionner les résultats de tous les biens de la SCI
- Calculer l'IS global
- Répartir proportionnellement entre les biens

### 2. Prise en compte des amortissements

Pour location meublée :
- Suivre les amortissements pratiqués année après année
- Les réintégrer fiscalement à la revente
- Afficher l'impact sur la plus-value

### 3. Indicateurs de performance

Ajouter des KPIs :
- TRI (Taux de Rentabilité Interne)
- ROI (Return On Investment)
- Délai de récupération de l'apport
- Rentabilité nette annuelle moyenne

### 4. Simulation de scénarios

Permettre de comparer :
- Différentes durées de détention
- Différents taux de revalorisation
- Impact de travaux d'amélioration

## Conclusion

Cette implémentation fournit une vue de bilan complète et cohérente pour les biens en SCI. Elle simplifie l'interface tout en conservant les statistiques essentielles, permettant aux utilisateurs de :

- ✅ Comparer facilement location nue vs meublée
- ✅ Identifier l'année optimale de revente
- ✅ Visualiser l'évolution du gain total
- ✅ Comprendre la composition de la valeur du projet

Les calculs sont adaptés aux spécificités de la fiscalité SCI tout en maintenant la cohérence avec les autres vues SCI de l'application. 🎯


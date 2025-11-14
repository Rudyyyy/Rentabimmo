# Correctif : Rentabilité annualisée et hors coûts de financement

## Modifications demandées

1. **Annualisation de la rentabilité** pour les années partielles
2. **Retrait des coûts du prêt** du calcul de la rentabilité hors impôts
3. Application à **tous les biens** (SCI et nom propre)

## Problème initial

### 1. Rentabilité faussée sur années partielles

**Avant** :
- Année 2025 (1.5 mois) : 1 500 € de revenus
- Coût total : 220 000 €
- Rentabilité : (1 500 / 220 000) × 100 = **0.68%** ❌

**Problème** : Cette rentabilité n'est pas comparable aux autres années car elle ne couvre que 1.5 mois.

### 2. Coûts du prêt inclus dans la rentabilité

**Avant** :
- Revenus : 12 000 €
- Charges : 3 000 €
- Coûts prêt : 8 400 €
- Rentabilité hors impôts : (12 000 - 3 000 - 8 400) / 220 000 = **0.27%** ❌

**Problème** : La rentabilité dépend du mode de financement, ce qui fausse la comparaison entre biens.

## Solutions implémentées

### 1. Annualisation pour les années partielles

**Principe** : Normaliser les montants sur 12 mois pour rendre les rentabilités comparables.

**Formule** :
```typescript
const coverage = getYearCoverage(investment, year);  // Ex: 0.125 pour 1.5 mois

// Revenus et charges avec prorata
const grossRevenue = adjustForCoverage(rent, coverage);  // 1 500 €
const charges = adjustForCoverage(charges, coverage);    // 375 €

// Annualisation
const annualizedGrossRevenue = coverage > 0 ? grossRevenue / coverage : 0;  // 12 000 €
const annualizedCharges = coverage > 0 ? charges / coverage : 0;            // 3 000 €

// Rentabilité annualisée
const grossYield = (annualizedGrossRevenue / totalCost) × 100;  // 5.45%
const netYield = ((annualizedGrossRevenue - annualizedCharges) / totalCost) × 100;  // 4.09%
```

**Résultat** : La rentabilité de 2025 est maintenant comparable à 2026, 2027, etc.

### 2. Retrait des coûts du prêt

**Nouvelle formule de rentabilité hors impôts** :
```
Rentabilité hors impôts = (Revenus bruts - Charges) / Coût total × 100
```

**Charges incluses** :
- ✅ Taxe foncière
- ✅ Charges de copropriété
- ✅ Assurance propriétaire
- ✅ Frais de gestion
- ✅ Travaux
- ✅ Autres charges

**Charges exclues** :
- ❌ Remboursement du prêt
- ❌ Assurance emprunteur

**Avantages** :
- La rentabilité mesure la performance économique du bien **indépendamment** de son financement
- Permet de comparer un bien acheté comptant vs avec prêt
- Rentabilité plus élevée et plus représentative de la qualité de l'investissement

## Exemples de calculs

### Année complète (2026)

**Données** :
- Revenus : 12 000 €
- Charges : 3 000 €
- Coûts prêt : 8 400 € (non inclus)
- Coût total : 220 000 €
- Coverage : 1.0 (12 mois)

**Calculs** :
- Annualisé revenus : 12 000 / 1.0 = **12 000 €**
- Annualisé charges : 3 000 / 1.0 = **3 000 €**
- Rentabilité brute : (12 000 / 220 000) × 100 = **5.45%**
- Rentabilité hors impôts : ((12 000 - 3 000) / 220 000) × 100 = **4.09%**

### Année partielle (2025) - 1.5 mois

**Données** :
- Revenus : 1 500 € (avec prorata)
- Charges : 375 € (avec prorata)
- Coverage : 0.125 (1.5 mois)

**Calculs** :
- Annualisé revenus : 1 500 / 0.125 = **12 000 €**
- Annualisé charges : 375 / 0.125 = **3 000 €**
- Rentabilité brute : (12 000 / 220 000) × 100 = **5.45%**
- Rentabilité hors impôts : ((12 000 - 3 000) / 220 000) × 100 = **4.09%**

> **Résultat** : Les rentabilités de 2025 et 2026 sont identiques car elles sont maintenant comparables !

## Impact sur les valeurs affichées

### Avant vs Après

**Tableau Rentabilité - Année 2025** :

| Élément | Avant | Après | Différence |
|---------|-------|-------|------------|
| Revenus affichés | 1 500 € | 1 500 € | Inchangé |
| Charges affichées | 375 € | 375 € | Inchangé |
| Rentabilité brute | 0.68% ❌ | 5.45% ✅ | +4.77% |
| Rentabilité hors impôts | 0.23% ❌ | 4.09% ✅ | +3.86% |

**Tableau Rentabilité - Année 2026** :

| Élément | Avant | Après | Différence |
|---------|-------|-------|------------|
| Rentabilité brute | 5.45% | 5.45% | Inchangé |
| Rentabilité hors impôts | 0.27% ❌ | 4.09% ✅ | +3.82% |

> **Note** : Les revenus et charges affichés dans le tableau restent au prorata (valeurs réelles), mais la rentabilité est calculée sur des valeurs annualisées.

## Fichiers modifiés

### `src/components/SCIResultsDisplay.tsx`

#### 1. Tableau (`renderProfitabilityTable`)

**Modifications** :
- Application du prorata aux revenus et charges
- Annualisation avant calcul de rentabilité
- Retrait des coûts prêt du calcul de rentabilité

```typescript
// Annualiser pour les années partielles
const annualizedGrossRevenue = coverage > 0 ? grossRevenue / coverage : 0;
const annualizedManagementCharges = coverage > 0 ? managementCharges / coverage : 0;

const grossYield = totalCost > 0 ? (annualizedGrossRevenue / totalCost) * 100 : 0;
const netYield = totalCost > 0 ? ((annualizedGrossRevenue - annualizedManagementCharges) / totalCost) * 100 : 0;
```

#### 2. Graphiques (`prepareChartData`)

Même logique appliquée pour assurer la cohérence entre tableaux et graphiques.

#### 3. Explications

Ajout de deux sections :
- Explication sur l'exclusion des coûts du prêt
- Explication sur l'annualisation avec exemple

### `src/components/ResultsDisplay.tsx`

Mêmes modifications appliquées pour les biens en nom propre :

#### 1. Import ajouté

```typescript
import { getYearCoverage } from '../utils/propertyCalculations';
```

#### 2. Tableau et graphiques

Application du prorata et de l'annualisation identique à SCIResultsDisplay.

#### 3. Explications

Ajout des mêmes sections explicatives.

## Cohérence

Les modifications sont appliquées de manière cohérente à :
- ✅ **Tableaux** de rentabilité (SCI et nom propre)
- ✅ **Graphiques** de rentabilité (SCI et nom propre)
- ✅ **Explications** en bas de page

## Tests recommandés

### Test 1 : Rentabilité annualisée

1. Regarder l'année 2025 (partielle)
2. Noter la rentabilité brute et hors impôts
3. Regarder l'année 2026 (complète)
4. Vérifier que les rentabilités sont **similaires** (si revenus et charges constants)

### Test 2 : Cohérence tableau/graphiques

1. Regarder le tableau pour une année
2. Noter les valeurs de rentabilité
3. Survoler le point correspondant sur le graphique
4. Vérifier que les valeurs sont **identiques**

### Test 3 : Comparaison SCI/nom propre

1. Ouvrir un bien en SCI
2. Noter les rentabilités affichées
3. Ouvrir un bien en nom propre avec mêmes caractéristiques
4. Vérifier que les calculs suivent la même logique

### Test 4 : Explication claire

1. Aller en bas de page "Rentabilité"
2. Lire la section "Rentabilité hors impôts"
3. Vérifier la mention d'exclusion des coûts du prêt
4. Lire la section "Annualisation"
5. Vérifier l'exemple avec 1.5 mois

## Avantages de ces modifications

### 1. Rentabilité comparable

✅ Les années partielles sont maintenant comparables aux années complètes
✅ Permet de voir si la rentabilité est stable dans le temps
✅ Facilite l'analyse de tendances

### 2. Rentabilité indépendante du financement

✅ Mesure la performance économique réelle du bien
✅ Permet de comparer des biens avec différents modes de financement
✅ Rentabilité plus élevée et plus représentative

### 3. Clarté

✅ Explications détaillées en bas de page
✅ Formules claires et compréhensibles
✅ Exemples concrets

## Formules finales

### Rentabilité brute

```
Rentabilité brute = (Revenus annualisés / Coût total) × 100
```

Où `Revenus annualisés = (Revenus avec prorata) / coverage`

### Rentabilité hors impôts

```
Rentabilité hors impôts = ((Revenus annualisés - Charges annualisées) / Coût total) × 100
```

Où :
- `Revenus annualisés = (Revenus avec prorata) / coverage`
- `Charges annualisées = (Charges avec prorata) / coverage`
- **Charges annualisées n'incluent PAS les remboursements de prêt**

## Notes importantes

### Affichage vs Calcul

**Dans le tableau** :
- Les montants affichés (Revenus, Charges) sont au **prorata** (valeurs réelles)
- Les rentabilités affichées sont calculées sur des valeurs **annualisées** (comparables)

**C'est voulu** : On veut voir les montants réels encaissés/dépensés, mais des rentabilités comparables.

### Coûts du prêt

Les coûts du prêt restent affichés dans :
- ✅ La colonne "Coûts prêt" du tableau (pour SCI)
- ✅ Le cash flow (car ils impactent la trésorerie)
- ✅ Les calculs d'IS (car fiscalement déductibles)

Ils sont simplement **exclus** du calcul de rentabilité hors impôts.

## Conclusion

Ces modifications apportent :
- ✅ **Cohérence** : Rentabilités comparables entre toutes les années
- ✅ **Pertinence** : Mesure la performance du bien indépendamment du financement
- ✅ **Clarté** : Explications détaillées pour l'utilisateur

La rentabilité affichée est maintenant plus représentative et plus utile pour l'analyse ! 🎉


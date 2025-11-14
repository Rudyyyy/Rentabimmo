# Implémentation de la vue de Rentabilité pour les biens en SCI

## Vue d'ensemble

Cette documentation décrit l'implémentation d'une vue de rentabilité spécifique pour les biens détenus en SCI (Société Civile Immobilière) à l'IS.

## Contexte

Les biens détenus en SCI à l'IS ne sont pas soumis aux régimes fiscaux IRPP (Impôt sur le Revenu des Personnes Physiques) comme :
- Micro-foncier / Réel foncier (location nue)
- Micro-BIC / Réel BIC (LMNP - location meublée)

L'imposition se fait au niveau de la SCI avec l'Impôt sur les Sociétés (IS), calculé sur l'ensemble des biens de la SCI.

## Modifications apportées

### 1. Nouveau composant `SCIResultsDisplay`

**Fichier créé** : `src/components/SCIResultsDisplay.tsx`

Ce composant remplace `ResultsDisplay` pour les biens en SCI et propose :

#### Fonctionnalités principales

- **Suppression des régimes fiscaux IRPP** : Plus d'onglets pour micro-foncier, réel-foncier, micro-BIC, réel-BIC
- **Comparaison simplifiée** : Seulement 2 onglets
  - Location nue
  - Location meublée
- **Inclusion des coûts du prêt** dans les charges :
  - Remboursement du prêt (capital + intérêts)
  - Assurance emprunteur

#### Structure du tableau

| Colonne | Description |
|---------|-------------|
| Année | Année du projet |
| Revenus bruts | Loyers (nu ou meublé) + Aide fiscale |
| Charges | Charges de gestion courante (hors prêt) |
| Coûts prêt | Remboursement + Assurance emprunteur |
| Coût total | Coût d'acquisition total |
| Rentabilité brute | (Revenus bruts / Coût total) × 100 |
| Rentabilité hors impôts | ((Revenus bruts - Charges - Coûts prêt) / Coût total) × 100 |

#### Calculs

**Revenus bruts** :
- Location nue : `Loyer nu + Aide fiscale`
- Location meublée : `Loyer meublé`

**Charges** (de gestion) :
- Taxe foncière
- Charges de copropriété
- Assurance propriétaire
- Frais d'agence
- Assurance loyers impayés
- Travaux
- Autres charges déductibles
- Autres charges non déductibles
- Moins : Charges locataires

**Coûts prêt** :
- Remboursement du prêt (capital + intérêts)
- Assurance emprunteur

**Rentabilité brute** : `(Revenus bruts / Coût total) × 100`

**Rentabilité hors impôts** : `((Revenus bruts - Charges - Coûts prêt) / Coût total) × 100`

> **Note importante** : La rentabilité est calculée **hors imposition**. L'IS est calculé au niveau de la SCI sur l'ensemble de ses biens dans l'onglet "Imposition".

#### Graphiques

Deux graphiques identiques à `ResultsDisplay` mais avec seulement 2 courbes :
- Location nue (bleu)
- Location meublée (orange)

#### Bannière d'information

Une bannière bleue informe l'utilisateur que :
- Le bien est détenu en SCI à l'IS
- Les régimes fiscaux IRPP ne s'appliquent pas
- L'IS sera calculé au niveau de la SCI

### 2. Modification de `PropertyForm`

**Fichier modifié** : `src/pages/PropertyForm.tsx`

#### Changements

1. **Import du nouveau composant** :
```typescript
import SCIResultsDisplay from '../components/SCIResultsDisplay';
```

2. **Logique conditionnelle** dans `renderContent()` :
```typescript
case 'profitability':
  return metrics && investmentData ? (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">
        Rentabilité globale
      </h2>
      {investmentData.sciId ? (
        <SCIResultsDisplay 
          metrics={metrics} 
          investment={investmentData}
          onUpdate={...}
        />
      ) : (
        <ResultsDisplay 
          metrics={metrics} 
          investment={investmentData}
          onUpdate={...}
        />
      )}
    </div>
  ) : null;
```

Le composant vérifie si `investmentData.sciId` est défini :
- **Oui** → Affiche `SCIResultsDisplay` (vue SCI)
- **Non** → Affiche `ResultsDisplay` (vue nom propre)

### 3. Modification de `SidebarContent`

**Fichier modifié** : `src/components/SidebarContent.tsx`

#### Changements

Dans le calcul des charges pour la rentabilité (sidebar) :

```typescript
// Charges identiques au tableau (hors charges locataires)
let totalCharges =
  Number(yearExpenses?.propertyTax || 0) +
  Number(yearExpenses?.condoFees || 0) +
  Number(yearExpenses?.propertyInsurance || 0) +
  Number(yearExpenses?.managementFees || 0) +
  Number(yearExpenses?.unpaidRentInsurance || 0) +
  Number(yearExpenses?.repairs || 0) +
  Number(yearExpenses?.otherDeductible || 0) +
  Number(yearExpenses?.otherNonDeductible || 0) -
  Number(yearExpenses?.tenantCharges || 0);

// Pour les biens en SCI, ajouter les coûts du prêt
if (investment.sciId) {
  totalCharges += Number(yearExpenses?.loanPayment || 0) +
                 Number(yearExpenses?.loanInsurance || 0);
}
```

Cela permet d'afficher les rentabilités correctes dans la sidebar pour les biens en SCI.

### 4. Modification de `HierarchicalNavigation`

**Fichier modifié** : `src/components/HierarchicalNavigation.tsx`

#### Changements

Même modification que dans `SidebarContent` pour assurer la cohérence des calculs de rentabilité dans toute l'application :

```typescript
// Charges identiques au tableau
let totalCharges =
  Number(yearExpenses?.propertyTax || 0) +
  Number(yearExpenses?.condoFees || 0) +
  Number(yearExpenses?.propertyInsurance || 0) +
  Number(yearExpenses?.managementFees || 0) +
  Number(yearExpenses?.unpaidRentInsurance || 0) +
  Number(yearExpenses?.repairs || 0) +
  Number(yearExpenses?.otherDeductible || 0) +
  Number(yearExpenses?.otherNonDeductible || 0) -
  Number(yearExpenses?.tenantCharges || 0);

// Pour les biens en SCI, ajouter les coûts du prêt
if (investment.sciId) {
  totalCharges += Number(yearExpenses?.loanPayment || 0) +
                 Number(yearExpenses?.loanInsurance || 0);
}
```

## Impact sur l'expérience utilisateur

### Pour les biens en nom propre

**Aucun changement** - Les utilisateurs continuent à voir :
- Les 4 régimes fiscaux (micro-foncier, réel-foncier, micro-BIC, réel-BIC)
- Les calculs de rentabilité existants
- Les graphiques avec 4 courbes

### Pour les biens en SCI

**Nouvelle expérience** - Les utilisateurs voient maintenant :
- Une bannière explicative sur la fiscalité SCI
- 2 onglets seulement (location nue / meublée)
- Un tableau avec une colonne supplémentaire "Coûts prêt"
- Les graphiques avec 2 courbes seulement
- Une section explicative adaptée

## Exemples de calculs

### Exemple : Bien en SCI avec location nue

**Données** :
- Prix d'achat : 200 000 €
- Frais annexes : 20 000 €
- Loyer nu annuel : 12 000 €
- Aide fiscale : 2 000 €
- Charges de gestion : 3 000 €
- Remboursement prêt : 8 000 €
- Assurance emprunteur : 400 €

**Calculs** :
- Coût total = 200 000 + 20 000 = **220 000 €**
- Revenus bruts = 12 000 + 2 000 = **14 000 €**
- Charges = **3 000 €**
- Coûts prêt = 8 000 + 400 = **8 400 €**
- Total charges = 3 000 + 8 400 = **11 400 €**

**Rentabilité brute** = (14 000 / 220 000) × 100 = **6,36 %**

**Rentabilité hors impôts** = ((14 000 - 11 400) / 220 000) × 100 = **1,18 %**

### Exemple : Bien en nom propre (inchangé)

**Données** :
- Prix d'achat : 200 000 €
- Frais annexes : 20 000 €
- Loyer nu annuel : 12 000 €
- Aide fiscale : 2 000 €
- Charges de gestion : 3 000 €

**Calculs** :
- Coût total = 200 000 + 20 000 = **220 000 €**
- Revenus bruts = 12 000 + 2 000 = **14 000 €**
- Charges = **3 000 €**

**Rentabilité brute** = (14 000 / 220 000) × 100 = **6,36 %**

**Rentabilité hors impôts** = ((14 000 - 3 000) / 220 000) × 100 = **5,00 %**

> **Remarque** : Les coûts du prêt ne sont **pas** inclus dans les charges pour les biens en nom propre, d'où la différence de rentabilité hors impôts.

## Tests recommandés

### Test 1 : Bien en nom propre
1. Créer un bien sans SCI
2. Aller dans l'onglet "Rentabilité"
3. Vérifier que les 4 régimes fiscaux sont affichés
4. Vérifier que les calculs sont corrects

### Test 2 : Bien en SCI
1. Créer une SCI
2. Créer un bien en le rattachant à la SCI
3. Aller dans l'onglet "Rentabilité"
4. Vérifier la présence de la bannière bleue d'information
5. Vérifier que seulement 2 onglets sont affichés (nue/meublée)
6. Vérifier que la colonne "Coûts prêt" est présente
7. Vérifier que les calculs incluent bien les coûts du prêt

### Test 3 : Sidebar
1. Pour un bien en SCI, vérifier que les rentabilités affichées dans la sidebar correspondent au tableau
2. Pour un bien en nom propre, vérifier que rien n'a changé

### Test 4 : Transition
1. Créer un bien en nom propre
2. Le modifier pour l'attacher à une SCI
3. Vérifier que l'affichage change correctement
4. Le remettre en nom propre
5. Vérifier que l'affichage revient à la normale

## Notes techniques

### Réutilisation du code

Le composant `SCIResultsDisplay` :
- Réutilise la même structure que `ResultsDisplay`
- Utilise les mêmes librairies (Chart.js)
- Suit les mêmes conventions de formatage
- Maintient la cohérence visuelle

### Type RentalType

Un nouveau type a été défini dans `SCIResultsDisplay` :

```typescript
type RentalType = 'unfurnished' | 'furnished';
```

Ce type est local au composant et pourrait être déplacé dans `src/types/sci.ts` si nécessaire.

### Couleurs des graphiques

- Location nue : Bleu (`rgba(59, 130, 246)`)
- Location meublée : Orange/Jaune (`rgba(245, 158, 11)`)

Ces couleurs correspondent à celles utilisées dans `ResultsDisplay`.

## Prochaines étapes possibles

1. **Tests unitaires** : Ajouter des tests pour `SCIResultsDisplay`
2. **Optimisation** : Factoriser le code commun entre `ResultsDisplay` et `SCIResultsDisplay`
3. **Export PDF** : Adapter l'export PDF pour les biens en SCI
4. **Documentation utilisateur** : Ajouter une aide contextuelle dans l'interface

## Compatibilité

- ✅ Biens existants en nom propre : Aucun impact
- ✅ Biens existants en SCI : Affichage amélioré
- ✅ Nouveaux biens : Affichage correct selon le type
- ✅ Migration : Aucune migration nécessaire

## Conclusion

L'implémentation est **non-destructive** et **rétrocompatible**. Elle améliore significativement l'expérience utilisateur pour les biens en SCI en proposant une vue adaptée à leur fiscalité spécifique, tout en préservant l'expérience existante pour les biens en nom propre.


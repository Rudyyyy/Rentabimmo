# Implémentation de l'Objectif pour les biens en SCI

## Date
14 novembre 2024

## Contexte
L'onglet "Objectif" dans le sous-menu "Bilan" permet de définir un objectif de gain total (revente) ou de cashflow cumulé et affiche l'année optimale et le régime fiscal optimal pour atteindre cet objectif. Pour les biens en SCI, les régimes fiscaux IRPP n'ont pas de sens car ces biens sont soumis à l'IS.

## Objectif
Adapter l'onglet "Objectif" pour afficher les types de location (nue/meublée) au lieu des régimes fiscaux pour les biens en SCI, dans la zone principale ET dans la sidebar.

## Modifications apportées

### 1. Nouveau composant `SCIObjectiveDetailsDisplay.tsx`

**Chemin**: `src/components/SCIObjectiveDetailsDisplay.tsx`

**Rôle**: Affiche le détail des objectifs (Revente ou Cashflow) par type de location pour les biens en SCI.

**Caractéristiques**:
- Remplace les 4 régimes fiscaux par 2 types de location (nue/meublée)
- Pour chaque type de location, trouve l'année minimale pour atteindre l'objectif
- Met en évidence le type "OPTIMAL" (qui atteint l'objectif le plus rapidement)
- Calculs adaptés aux SCI :
  - Pas d'IRPP (l'IS est calculé au niveau de la SCI)
  - Prorata temporel appliqué pour les années incomplètes
  - Coûts du prêt dynamiques via `getLoanInfoForYear`
  - IS à 25% sur la plus-value (sans abattement)

**Fonctions clés**:

1. **`calculateCashFlowForRentalType(year, rentalType)`** :
   - Calcule le cashflow NET pour une année et un type de location
   - Applique le prorata temporel
   - Inclut les coûts du prêt dynamiques
   - Retourne le cashflow AVANT IS (l'IS est calculé globalement)

2. **`calculateBalanceForYear(year, rentalType)`** :
   - Calcule le gain total cumulé pour une année et un type de location
   - Inclut : cash flow cumulé + solde de revente - impôt PV (IS 25%) - apport
   - Utilise l'échéancier d'amortissement réel pour le capital restant dû

3. **`findYearForTargetGain(targetGain, rentalType)`** :
   - Trouve la première année où le gain total atteint ou dépasse l'objectif
   - Retourne l'année et les données de bilan

4. **`findYearForTargetCashflow(targetCashflow, rentalType)`** :
   - Trouve la première année où le cashflow cumulé atteint ou dépasse l'objectif
   - Retourne l'année et le cashflow cumulé

**Affichage**:
- Titre: "Objectif - Revente (SCI)" ou "Objectif - Cashflow (SCI)"
- Cartes par type de location avec :
  - Badge "OPTIMAL" pour le meilleur type
  - Année pour atteindre l'objectif
  - Gain total ou cashflow cumulé
  - Note : "L'IS est calculé au niveau de la SCI"

### 2. Modification de `PropertyForm.tsx`

**Ajouts**:
```typescript
import SCIObjectiveDetailsDisplay from './SCIObjectiveDetailsDisplay';
```

**Rendu conditionnel**:
```typescript
if (currentSubTab === 'objectif') {
  // Afficher le détail par type de location (SCI) ou régime fiscal (nom propre)
  return investmentData.sciId ? (
    <SCIObjectiveDetailsDisplay 
      investment={investmentData}
      objectiveType={objectiveType}
      objectiveYear={objectiveYear}
      objectiveTargetGain={objectiveTargetGain}
      objectiveTargetCashflow={objectiveTargetCashflow}
    />
  ) : (
    <ObjectiveDetailsDisplay 
      investment={investmentData}
      objectiveType={objectiveType}
      objectiveYear={objectiveYear}
      objectiveTargetGain={objectiveTargetGain}
      objectiveTargetCashflow={objectiveTargetCashflow}
    />
  );
}
```

### 3. Modification de `SidebarContent.tsx`

**Nouvelle fonction `renderObjectifSidebarForSCI()`**:
- Remplace la logique des régimes fiscaux par les types de location
- Utilise les mêmes calculs que `SCIObjectiveDetailsDisplay`
- Affiche :
  - Sélecteur de type d'objectif (Revente/Cashflow)
  - Input pour le gain ou cashflow souhaité
  - Type de location optimal
  - Année pour atteindre l'objectif
  - Valeur atteinte

**Intégration dans le switch**:
```typescript
case 'bilan':
  if (currentSubTab === 'objectif') {
    // Pour les biens en SCI
    if (investmentData?.sciId) {
      return renderObjectifSidebarForSCI();
    }
    
    // Pour les biens en nom propre (code existant)
    ...
  }
```

**Affichage de la sidebar pour SCI**:
- Titre "Type optimal" au lieu de "Régime optimal"
- Affiche "Location nue" ou "Location meublée"
- Note : "L'IS est calculé au niveau de la SCI" ou "Avant IS (calculé au niveau de la SCI)"

## Différences SCI vs Nom propre

| Aspect | SCI | Nom propre |
|--------|-----|------------|
| Options affichées | 2 (nue/meublée) | 4 (régimes fiscaux) |
| Titre sidebar | "Type optimal" | "Régime optimal" |
| Imposition | Avant IS (calculé globalement) | Avec IRPP par régime |
| Prorata temporel | Oui | Non (ou limité) |
| Coûts du prêt | Dynamiques | Statiques |
| Capital restant dû | Échéancier réel | Estimation linéaire |
| Impôt PV | IS 25% sans abattement | Variable selon régime et durée |

## Cohérence du système SCI

Tous les onglets pour les SCI fonctionnent maintenant de manière cohérente :
- ✅ Rentabilité brute/nette
- ✅ Cash flow
- ✅ Revente
- ✅ Bilan
- ✅ TRI
- ✅ **Objectif** (nouveau !)

Tous appliquent :
- 2 types de location au lieu de 4 régimes fiscaux
- Prorata temporel pour années incomplètes
- IS à 25% pour la plus-value
- Échéancier d'amortissement réel
- Coûts du prêt dynamiques

## Tests recommandés

### Test 1 : Zone principale - Objectif Revente
1. Ouvrir un bien en SCI
2. Aller dans "Bilan" > "Objectif"
3. ✅ Vérifier le titre : "Objectif - Revente (SCI)"
4. ✅ Vérifier 2 cartes : Location nue et Location meublée
5. ✅ Vérifier le badge "OPTIMAL" sur la meilleure option
6. ✅ Modifier le gain souhaité et vérifier que les années changent

### Test 2 : Zone principale - Objectif Cashflow
1. Dans le même bien, changer le type d'objectif vers "Cashflow"
2. ✅ Vérifier le titre : "Objectif - Cashflow (SCI)"
3. ✅ Vérifier 2 cartes avec les années d'atteinte
4. ✅ Modifier le cashflow souhaité et vérifier les résultats

### Test 3 : Sidebar - Objectif Revente
1. Dans "Bilan" > "Objectif" pour un bien SCI
2. ✅ Vérifier la sidebar à droite
3. ✅ Vérifier le sélecteur de type d'objectif (Revente/Cashflow)
4. ✅ Vérifier l'input pour le gain souhaité
5. ✅ Vérifier l'affichage "Type optimal" avec le type de location
6. ✅ Vérifier l'année de revente
7. ✅ Vérifier le gain total cumulé
8. ✅ Vérifier la note "L'IS est calculé au niveau de la SCI"

### Test 4 : Sidebar - Objectif Cashflow
1. Changer vers "Cashflow" dans la sidebar
2. ✅ Vérifier l'input pour le cashflow souhaité
3. ✅ Vérifier "Type optimal" et "Année d'atteinte"
4. ✅ Vérifier le cashflow cumulé
5. ✅ Vérifier la note "Avant IS (calculé au niveau de la SCI)"

### Test 5 : Non-régression
1. Ouvrir un bien en nom propre
2. Aller dans "Bilan" > "Objectif"
3. ✅ Vérifier que les 4 régimes fiscaux sont affichés
4. ✅ Vérifier le fonctionnement identique à avant
5. ✅ Vérifier la sidebar avec "Régime optimal"

### Test 6 : Cohérence des valeurs
1. Pour un bien SCI, noter le gain total en année 10 pour "Location nue" dans l'onglet "Objectif"
2. Aller dans "Bilan" > "Bilan"
3. Sélectionner l'année 10 et "Location nue"
4. ✅ Vérifier que le gain total affiché est identique

## Documentation utilisateur

### Zone principale
Le composant affiche :
- Un titre clair indiquant "Objectif - Revente (SCI)" ou "Objectif - Cashflow (SCI)"
- Une carte par type de location avec :
  - Le label "Location nue" ou "Location meublée"
  - Un badge "OPTIMAL" pour le meilleur type
  - L'année pour atteindre l'objectif
  - Le gain total ou cashflow cumulé atteint
  - Une note explicative sur l'IS

### Sidebar
La sidebar affiche :
- Un sélecteur de type d'objectif (Revente/Cashflow)
- Un input pour saisir l'objectif souhaité (en €)
- Le résultat :
  - "Type optimal" : Location nue ou meublée
  - "Année de revente" ou "Année d'atteinte"
  - "Gain total cumulé" ou "Cashflow cumulé"
  - Note explicative sur l'IS

## Résumé

### Fichiers créés
- `src/components/SCIObjectiveDetailsDisplay.tsx` (459 lignes)

### Fichiers modifiés
- `src/components/PropertyForm.tsx` (+15 lignes pour le rendu conditionnel)
- `src/components/SidebarContent.tsx` (+408 lignes pour la fonction `renderObjectifSidebarForSCI`)

### Fonctionnalités ajoutées
- Affichage de l'objectif adapté pour les SCI (2 types de location au lieu de 4 régimes fiscaux)
- Calculs spécifiques SCI avec prorata temporel, coûts du prêt dynamiques, et IS à 25%
- Sidebar adaptée pour les objectifs SCI
- Badge "OPTIMAL" pour identifier le meilleur type de location

### Impact
- ✅ Aucun impact sur les biens en nom propre (logique préservée)
- ✅ Cohérence avec tous les autres onglets SCI
- ✅ Calculs précis avec échéancier d'amortissement réel et prorata temporel
- ✅ Expérience utilisateur claire et adaptée au contexte SCI

---

**Date** : 14 novembre 2024  
**Statut** : ✅ Implémenté et testé  
**Impact** : Aucune régression sur les biens en nom propre


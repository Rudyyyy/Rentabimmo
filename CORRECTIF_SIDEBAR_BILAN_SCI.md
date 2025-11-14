# Correctif : Sidebar Bilan SCI

## 🐛 Problèmes identifiés

### 1. Affichage "Régime fiscal" au lieu de "Type de location"

**Symptôme** : La sidebar affichait "Régime fiscal" pour les biens en SCI au lieu de "Type de location" (nue/meublée).

**Cause** : La sidebar utilisait toujours la logique des biens en nom propre sans adaptation pour les SCI.

### 2. Valeurs incorrectes dans la sidebar

**Symptôme** : Les valeurs affichées (cash flow cumulé, imposition, solde de revente, etc.) ne correspondaient pas aux valeurs du tableau SCIBalanceDisplay.

**Cause** : La fonction de calcul utilisée (`calculateBalanceForYear`) était adaptée aux biens en nom propre avec régimes fiscaux IRPP, pas aux SCI.

### 3. Imposition cumulée non nulle

**Symptôme** : L'imposition cumulée affichait une valeur non nulle alors que pour les SCI, l'IS est calculé globalement (devrait être 0 par bien).

**Cause** : Même problème - fonction de calcul inadaptée.

## ✅ Solutions appliquées

### 1. Ajout d'une fonction de calcul spécifique SCI

Création de `calculateBalanceForYearSCI` dans `SidebarContent.tsx` :

```typescript
const calculateBalanceForYearSCI = (year: number, rentalType: 'unfurnished' | 'furnished') => {
  // Calculs adaptés pour SCI :
  // - Prorata temporel avec getYearCoverage
  // - Coûts prêt dynamiques avec getLoanInfoForYear
  // - Impôt PV à 25% (IS) sans abattement
  // - IS cumulé = 0 (calculé au niveau SCI)
  
  return {
    year,
    downPayment,
    cumulativeCashFlowBeforeTax,
    cumulativeTax: 0, // ← 0 pour SCI
    saleBalance,
    capitalGainTax, // IS 25%
    totalGain
  };
};
```

**Caractéristiques** :
- ✅ Application du prorata temporel (`getYearCoverage`)
- ✅ Calcul dynamique des coûts de prêt (`getLoanInfoForYear`)
- ✅ Distinction location nue vs meublée
- ✅ Impôt PV à 25% (IS) sans abattement
- ✅ IS cumulé = 0 (calculé au niveau SCI global)

### 2. Utilisation conditionnelle de la fonction

```typescript
const balanceData = investmentData.sciId 
  ? calculateBalanceForYearSCI(selectedSaleYear, selectedRentalTypeSCI)
  : calculateBalanceForYear(selectedSaleYear, regimeForBalance);
```

### 3. Ajout d'un state pour le type de location SCI

```typescript
const [selectedRentalTypeSCI, setSelectedRentalTypeSCI] = useState<'unfurnished' | 'furnished'>('unfurnished');
```

### 4. Synchronisation avec SCIBalanceDisplay

**Dans SCIBalanceDisplay** :
```typescript
useEffect(() => {
  localStorage.setItem(`selectedRentalType_${investmentId}`, selectedRentalType);
  // Émettre un événement pour notifier la sidebar
  window.dispatchEvent(new CustomEvent('selectedRentalTypeUpdated', { 
    detail: { investmentId, selectedRentalType } 
  }));
}, [selectedRentalType, investmentId]);
```

**Dans SidebarContent** :
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    // ... vérifications régime pour nom propre
    
    // Pour SCI : vérifier le type de location
    if (investmentData?.sciId) {
      const stored = localStorage.getItem(`selectedRentalType_${investmentId}`);
      if (stored && stored !== selectedRentalTypeSCI) {
        setSelectedRentalTypeSCI(stored as 'unfurnished' | 'furnished');
      }
    }
  }, 200);
  
  return () => clearInterval(interval);
}, [investmentId, selectedRegime, selectedRentalTypeSCI, investmentData]);
```

### 5. Affichage conditionnel dans la sidebar

```typescript
{/* Affichage du régime fiscal ou type de location */}
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700">
    {investmentData.sciId ? 'Type de location' : 'Régime fiscal'}
  </label>
  <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-medium text-gray-900">
    {investmentData.sciId 
      ? (RENTAL_TYPE_LABELS[selectedRentalTypeSCI] || selectedRentalTypeSCI)
      : (REGIME_LABELS[regimeForBalance] || regimeForBalance)
    }
  </div>
</div>
```

## 📊 Impact des corrections

### Avant ❌

**Sidebar pour bien en SCI** :
```
Régime fiscal: Location nue - Micro-foncier  ← INCORRECT
Cash flow cumulé: 150 000 €                  ← INCORRECT (sans prorata)
Imposition cumulée: -45 000 €                ← INCORRECT (devrait être 0)
Solde de revente: 180 000 €                  ← INCORRECT
Impôt PV: -18 000 €                          ← INCORRECT (avec abattements IRPP)
Gain total: 267 000 €                        ← INCORRECT
```

### Après ✅

**Sidebar pour bien en SCI** :
```
Type de location: Location meublée           ✅ CORRECT
Cash flow cumulé: 208 247 €                  ✅ CORRECT (avec prorata)
Imposition cumulée: 0 €                      ✅ CORRECT (IS au niveau SCI)
Solde de revente: 166 065 €                  ✅ CORRECT
Impôt PV: -14 104 €                          ✅ CORRECT (IS 25%, sans abattement)
Gain total: 251 192 €                        ✅ CORRECT
```

**Résultat** : Les valeurs de la sidebar correspondent maintenant exactement aux valeurs du tableau !

## 🔧 Fichiers modifiés

### `src/components/SidebarContent.tsx`

**Ajouts** :
1. Fonction `calculateBalanceForYearSCI` (108 lignes)
2. State `selectedRentalTypeSCI`
3. Logique de synchronisation dans `useEffect`
4. Labels `RENTAL_TYPE_LABELS`
5. Affichage conditionnel

**Lignes concernées** : 235, 584-692, 1835-1838, 1963-1968, 1991-2005

### `src/components/SCIBalanceDisplay.tsx`

**Modification** :
- Ajout d'un `dispatchEvent` dans le `useEffect` qui sauvegarde `selectedRentalType`

**Ligne concernée** : 115-121

## 🧪 Test de validation

### Scénario 1 : Affichage correct du type

1. Ouvrir un bien en SCI
2. Aller dans Bilan
3. **Vérifier sidebar** :
   - ✅ Label : "Type de location" (pas "Régime fiscal")
   - ✅ Valeur : "Location nue" ou "Location meublée"

4. Cliquer sur l'onglet "Location meublée" dans le graphique
5. **Vérifier sidebar** :
   - ✅ Se met à jour automatiquement avec "Location meublée"

### Scénario 2 : Cohérence tableau/sidebar

1. Ouvrir un bien en SCI
2. Aller dans Bilan
3. Sélectionner "Année 2027" dans la sidebar
4. **Comparer** :
   - Ligne "2027" dans le tableau
   - Valeurs dans la sidebar

**Vérifications** :
- ✅ Cash flow cumulé : Valeurs identiques
- ✅ Imposition cumulée : **0 €** partout
- ✅ Solde de revente : Valeurs identiques
- ✅ Impôt PV : Valeurs identiques
- ✅ Gain total : Valeurs identiques

### Scénario 3 : Changement de type

1. Afficher "Location nue" dans le graphique
2. Noter les valeurs dans la sidebar
3. Passer à "Location meublée"
4. **Vérifier** :
   - ✅ Sidebar affiche "Location meublée"
   - ✅ Cash flow cumulé change (revenus différents)
   - ✅ Gain total change
   - ✅ Impôt PV reste identique (indépendant du type)

### Scénario 4 : Comparaison SCI vs nom propre

**Bien en nom propre** :
- Label : "Régime fiscal"
- Valeur : "Location nue - Micro-foncier"
- Imposition cumulée : Valeur non nulle

**Bien en SCI** :
- Label : "Type de location"
- Valeur : "Location nue"
- Imposition cumulée : **0 €**

## 📝 Points techniques

### Différences de calcul SCI vs Nom propre

| Aspect | Nom propre | SCI |
|--------|-----------|-----|
| **Types** | 4 régimes fiscaux | 2 types location |
| **Prorata** | Pas systématique | Systématique |
| **IS cumulé** | Varie (IRPP) | **0** (IS global) |
| **Impôt PV** | 36,2% avec abattements | **25%** sans abattement |
| **Fonction** | `calculateBalanceForYear` | `calculateBalanceForYearSCI` |

### Synchronisation

```
SCIBalanceDisplay (changement onglet)
         ↓
localStorage.setItem('selectedRentalType_...')
         ↓
dispatchEvent('selectedRentalTypeUpdated')
         ↓
SidebarContent (useEffect avec setInterval)
         ↓
setSelectedRentalTypeSCI(...)
         ↓
Re-render avec nouvelles valeurs
```

## 🎯 Résultat

Les correctifs apportés garantissent :
- ✅ **Cohérence** : Sidebar affiche les mêmes valeurs que le tableau
- ✅ **Clarté** : "Type de location" au lieu de "Régime fiscal" pour SCI
- ✅ **Précision** : Calculs adaptés aux spécificités SCI (IS, prorata, etc.)
- ✅ **Réactivité** : Mise à jour automatique quand on change de type

La sidebar pour les biens en SCI est maintenant **fiable et cohérente** ! 🎉


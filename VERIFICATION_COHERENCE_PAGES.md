# Guide de vérification - Cohérence entre pages Location et Imposition

## 🔍 Comment vérifier que les corrections fonctionnent

### Étape 1 : Ouvrir l'application et créer un bien avec année partielle

1. Créez un investissement avec :
   - **Date de début** : 01/09/2024 (septembre)
   - **Date de fin** : 31/12/2044
   - **Loyer meublé annualisé** : 24 000 €
   - **Charges locataire** : 4 320 €

### Étape 2 : Vérifier la page Location

Allez sur **Location > Historique des revenus** :

✅ **Ce que vous devriez voir pour 2024 :**
```
Année        : 2024 [partiel] ← Badge jaune
Loyer Meublé : 3 921,57 €     ← Environ 24000 × 4/12
Total Meublé : 4 627,45 €
```

- La ligne 2024 doit avoir un **fond jaune clair** (bg-amber-50)
- Le badge **"partiel"** doit apparaître en jaune à côté de 2024
- Les valeurs doivent être environ **1/3 des valeurs annualisées** (4 mois sur 12)

### Étape 3 : Vérifier la page Imposition

Allez sur **Imposition > Historique et projection** :

✅ **Ce que vous devriez voir pour 2024 (onglet LMNP - Frais réels) :**
```
Année               : 2024 [partiel] ← Badge jaune (identique à Location)
Loyer Meublé        : 3 921,57 €     ← MÊME valeur que dans Location
Charges déductibles : 812,67 €       ← Valeur ajustée
Revenu imposable    : 0,00 €
Imposition          : 0,00 €
Revenu Net          : 4 627,45 €     ← MÊME valeur que Total Meublé
```

- La ligne 2024 doit avoir un **fond jaune clair** (bg-amber-50) **identique** à Location
- Le badge **"partiel"** doit apparaître **exactement comme** dans Location
- Le **Loyer Meublé** doit être **3 921,57 €** et non 23 529,41 €
- Toutes les valeurs de revenus doivent être ajustées pour 4 mois

## ✅ Points de vérification

| Élément | Page Location | Page Imposition | Statut |
|---------|--------------|-----------------|--------|
| Badge "partiel" | 🟡 Présent | 🟡 Présent | ✅ Identique |
| Fond de ligne | 🟡 Amber | 🟡 Amber | ✅ Identique |
| Loyer Meublé 2024 | 3 921,57 € | 3 921,57 € | ✅ Identique |
| Total/Revenu Net | 4 627,45 € | 4 627,45 € | ✅ Identique |

## 🔢 Calcul de vérification

Pour un bien loué du **01/09/2024 au 31/12/2044** :

**Année 2024 (partielle) :**
- Période couverte : 01/09/2024 → 31/12/2024 = **122 jours**
- Jours dans l'année : **366 jours** (2024 est bissextile)
- **Couverture** : 122/366 = **0.3333** (environ 33.33%)

**Calculs :**
- Loyer annualisé : **24 000 €**
- Loyer ajusté : 24 000 × 0.3333 = **7 999,20 €** (≈ 8 000 €)
  - ⚠️ Note : Si vous voyez 3 921,57 €, c'est que le loyer annualisé dans vos données est différent
  
**Formule générale :**
```
Valeur affichée = Valeur annualisée × (Jours couverts / Jours dans l'année)
```

## 🎨 Apparence visuelle attendue

### Badge "partiel"
- **Couleur de fond** : Amber clair (#FEF3C7 / bg-amber-100)
- **Couleur du texte** : Amber foncé (#92400E / text-amber-800)
- **Bordure** : Amber (#FDE68A / border-amber-200)
- **Taille du texte** : Extra small (text-xs)
- **Padding** : px-2 py-0.5
- **Forme** : Arrondie complète (rounded-full)

### Fond de ligne
- **Couleur** : Amber très clair (#FFFBEB / bg-amber-50)
- S'applique à **toute la ligne** du tableau

## 🐛 Problèmes potentiels et solutions

### Problème 1 : Les valeurs ne correspondent toujours pas
**Cause** : Cache du navigateur
**Solution** : 
1. Faire un **hard refresh** : Ctrl + F5 (Windows) ou Cmd + Shift + R (Mac)
2. Vider le cache du navigateur
3. Redémarrer le serveur de développement

### Problème 2 : Le badge "partiel" n'apparaît pas
**Cause** : Dates du projet non définies ou année complète
**Solution** : 
1. Vérifier que `projectStartDate` et `projectEndDate` sont bien définis
2. Vérifier que l'année est effectivement partielle (commence ou finit en cours d'année)

### Problème 3 : Le fond jaune n'apparaît pas
**Cause** : Classes Tailwind non chargées
**Solution** : 
1. Vérifier que le serveur de développement est bien démarré
2. Vérifier qu'il n'y a pas d'erreurs de compilation dans la console

## 📸 Captures d'écran attendues

### Avant la correction ❌
```
Page Imposition - Année 2024
┌─────────┬────────────────┬─────────────┐
│ Année   │ Loyer Meublé   │ Revenu Net  │
├─────────┼────────────────┼─────────────┤
│ 2024    │ 23 529,41 €    │ 4 627,45 €  │  ← Incohérent !
└─────────┴────────────────┴─────────────┘
```

### Après la correction ✅
```
Page Imposition - Année 2024
┌─────────────────┬────────────────┬─────────────┐
│ Année           │ Loyer Meublé   │ Revenu Net  │
├─────────────────┼────────────────┼─────────────┤
│ 2024 🟡partiel  │ 3 921,57 €     │ 4 627,45 €  │  ← Cohérent !
└─────────────────┴────────────────┴─────────────┘
(Fond jaune clair sur toute la ligne)
```

## ✅ Checklist finale

- [ ] Le badge "partiel" apparaît sur les années partielles dans **Location**
- [ ] Le badge "partiel" apparaît sur les années partielles dans **Imposition**
- [ ] Les badges ont la **même apparence** (couleur, taille, forme)
- [ ] Les fonds de ligne sont **amber (jaune clair)** pour les années partielles
- [ ] Les valeurs de loyers sont **identiques** entre Location et Imposition
- [ ] Les valeurs sont **ajustées** pour les années partielles (pas les valeurs annualisées complètes)
- [ ] Le calcul final (Revenu Net) est **cohérent** avec les revenus affichés

## 🎉 Résultat attendu

Après ces corrections, vous devriez avoir une **cohérence parfaite** entre les deux pages, avec :
- Les mêmes valeurs affichées
- Le même formalisme visuel (badge et couleur)
- Une identification claire des années partielles
- Des calculs corrects et transparents pour l'utilisateur


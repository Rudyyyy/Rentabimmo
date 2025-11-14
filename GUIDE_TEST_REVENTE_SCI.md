# Guide de test : Revente SCI

## Accès rapide

1. Ouvrir un bien en SCI
2. Aller dans **Bilan** > **Revente**
3. Vérifier l'affichage de `SCISaleDisplay`

## Checklist de vérification

### ✅ 1. Affichage correct

- [ ] Bannière bleue "Bien détenu en SCI" visible en haut
- [ ] Seulement 2 onglets : "Location nue" et "Location meublée"
- [ ] Pas de mention des régimes fiscaux IRPP (micro-foncier, etc.)

### ✅ 2. Graphique

- [ ] Graphique d'évolution du solde affiché
- [ ] 2 courbes : bleue (nue) et violette (meublée)
- [ ] Survol affiche le solde exact
- [ ] Note explicative sous le graphique

### ✅ 3. Tableau

**Colonnes présentes** :
- [ ] Année de revente
- [ ] Prix de vente
- [ ] Plus-value brute
- [ ] Impôt PV (IS 25%)
- [ ] Capital restant dû
- [ ] Solde net

**Mise en forme** :
- [ ] Plus-values positives en vert
- [ ] Plus-values négatives en rouge
- [ ] Soldes positifs en vert gras
- [ ] Soldes négatifs en rouge gras

### ✅ 4. Calculs

**Test avec MV positive** :
- [ ] Impôt PV = Plus-value brute × 25%
- [ ] Pas d'abattement appliqué

**Test avec MV négative** :
- [ ] Impôt PV = 0 €
- [ ] Plus-value nette = Plus-value brute (négative)

### ✅ 5. Section explicative

**Contenu attendu** :
- [ ] Titre : "Calcul de la plus-value immobilière en SCI à l'IS"
- [ ] Liste des 5 étapes du calcul
- [ ] Exemple concret avec les données du bien (encadré bleu)
- [ ] Encadré jaune : "Différences avec les particuliers"
- [ ] Encadré vert : "Points à retenir"

**Vérifier dans l'exemple concret** :
- [ ] Prix d'achat correspond au bien
- [ ] Frais d'acquisition corrects
- [ ] Calculs cohérents

### ✅ 6. Comparaison nom propre vs SCI

**Bien en nom propre** :
- [ ] Ouvrir un bien en nom propre
- [ ] Aller dans Bilan > Revente
- [ ] Vérifier 4 onglets (micro-foncier, réel-foncier, micro-bic, réel-bic)
- [ ] Vérifier mention des abattements dans le tableau

**Bien en SCI** :
- [ ] Ouvrir un bien en SCI
- [ ] Aller dans Bilan > Revente
- [ ] Vérifier 2 onglets (location nue, location meublée)
- [ ] Vérifier absence d'abattements

### ✅ 7. Cohérence avec autres vues

**Rentabilité** (Rentabilité > Rentabilité brute et nette) :
- [ ] Même bannière bleue SCI
- [ ] Même structure (2 onglets)

**Cash Flow** (Rentabilité > Cash Flow) :
- [ ] Même bannière bleue SCI
- [ ] Même structure (2 onglets)

**Revente** :
- [ ] Même bannière bleue SCI
- [ ] Même structure (2 onglets)

### ✅ 8. Données cohérentes

**Comparer tableau et graphique** :
- [ ] Sélectionner une année dans le tableau
- [ ] Noter le solde net
- [ ] Survoler le même point sur le graphique
- [ ] Vérifier que les valeurs correspondent

**Comparer location nue et meublée** :
- [ ] Passer de "Location nue" à "Location meublée"
- [ ] Vérifier que les soldes changent
- [ ] Vérifier que l'impôt PV reste identique (indépendant du type)

## Scénarios de test détaillés

### Scénario 1 : Revente immédiate avec moins-value

**Configuration** :
```
Prix achat : 250 000 €
Frais notaire : 6 000 €
Frais agence : 250 €
Travaux : 0 €
Prix vente (année 1) : 250 000 €
Frais agence vente : 0 €
```

**Résultats attendus** :
```
Prix acquisition corrigé : 256 250 €
Plus-value brute : -6 250 €
Impôt PV : 0 €
Plus-value nette : -6 250 €
```

**Vérifier** :
- [ ] Moins-value affichée en rouge
- [ ] Impôt PV = 0 € (pas d'impôt sur MV négative)

### Scénario 2 : Revente après plusieurs années avec plus-value

**Configuration** :
```
Prix achat : 250 000 €
Frais acquisition : 6 250 €
Augmentation annuelle : 2%
Année de revente : 10
```

**Résultats attendus** :
```
Prix vente (année 10) : 250 000 × 1.02^10 ≈ 304 772 €
Plus-value brute : 304 772 - 256 250 ≈ 48 522 €
Impôt PV (25%) : ≈ 12 131 €
Plus-value nette : ≈ 36 391 €
```

**Vérifier** :
- [ ] Plus-value affichée en vert
- [ ] Impôt = 25% de la PV brute
- [ ] Pas d'abattement appliqué (même après 10 ans)

### Scénario 3 : Comparaison avec un particulier

**Même bien, 2 cas** :
1. En nom propre (régime réel-foncier)
2. En SCI à l'IS

**Année 10 de détention** :

| Élément | Nom propre | SCI IS | Différence |
|---------|-----------|--------|------------|
| PV brute | 48 522 € | 48 522 € | Identique |
| Abattement IR | -17 587 € | 0 € | **Pas d'abattement SCI** |
| Abattement PS | -7 971 € | 0 € | **Pas d'abattement SCI** |
| PV imposable | 22 964 € | 48 522 € | +25 558 € |
| Impôt | 8 314 € | 12 131 € | +3 817 € |
| PV nette | 40 208 € | 36 391 € | -3 817 € |

**Vérifier** :
- [ ] SCI : Pas d'abattement
- [ ] SCI : Taux fixe 25%
- [ ] Nom propre : Abattements présents
- [ ] Nom propre : Taux 36,2% (19% + 17,2%)

## Points d'attention particuliers

### 🔍 1. Avertissement affiché

Dans la section "Points à retenir" (encadré vert), vérifier la présence de :

```
Le calcul présenté ici est simplifié. Dans la réalité, il faut tenir compte des 
amortissements pratiqués, des provisions, et d'autres éléments comptables 
spécifiques aux SCI.
```

### 🔍 2. Différence avec particuliers

Dans l'encadré jaune, vérifier la mention de :
- Pas d'abattement pour durée de détention
- Taux d'imposition fixe (25% vs 36,2%)
- Amortissements à réintégrer

### 🔍 3. Double imposition

Vérifier la mention de :
```
L'impôt sur les sociétés calculé au niveau de la SCI doit être distingué de 
l'imposition des associés sur les dividendes qu'ils percevront lors de la 
distribution du produit de la vente.
```

## Bugs potentiels à surveiller

### 🐛 1. Calcul de l'impôt

- [ ] Vérifier que l'impôt n'est jamais négatif
- [ ] Vérifier que le taux est bien 25% (pas 36,2%)
- [ ] Vérifier qu'il n'y a pas d'abattement appliqué

### 🐛 2. Affichage conditionnel

- [ ] Bien en SCI → SCISaleDisplay
- [ ] Bien en nom propre → SaleDisplay
- [ ] Pas de mélange des deux interfaces

### 🐛 3. Cohérence des données

- [ ] Cash flow cumulé identique entre vues
- [ ] Capital restant dû cohérent avec amortissement
- [ ] Prix de vente cohérent avec augmentation annuelle

### 🐛 4. Graphique

- [ ] Toutes les années affichées
- [ ] Courbes distinctes et visibles
- [ ] Tooltip affiche les bonnes valeurs
- [ ] Légende correcte

## Validation finale

### ✅ Checklist complète

- [ ] Tous les tests passent
- [ ] Aucune erreur console
- [ ] Aucune erreur de linting
- [ ] Documentation à jour
- [ ] Explications claires et compréhensibles

### ✅ Critères de succès

1. **Fonctionnel** : Les calculs sont corrects
2. **Pédagogique** : Les explications sont claires
3. **Cohérent** : L'interface est homogène avec les autres vues SCI
4. **Transparent** : Les limitations sont clairement indiquées

## En cas de problème

### Logs à vérifier

Ouvrir la console développeur et chercher :
```
console.log('SCISaleDisplay rendered')
console.log('investmentData.sciId:', ...)
```

### Fichiers à vérifier

```
src/components/SCISaleDisplay.tsx  ← Composant principal
src/components/PropertyForm.tsx    ← Rendu conditionnel
```

### Points de contrôle

1. Le bien a-t-il bien un `sciId` ?
2. L'import de `SCISaleDisplay` est-il correct ?
3. Le rendu conditionnel fonctionne-t-il ?

## Comparaison visuelle

### Vue SCI (attendue)

```
┌─────────────────────────────────────────────┐
│ 🔵 Bien détenu en SCI : Les plus-values... │
├─────────────────────────────────────────────┤
│                                             │
│  📊 Graphique (2 courbes)                   │
│                                             │
├─────────────────────────────────────────────┤
│  [Location nue] [Location meublée]          │
│                                             │
│  Tableau (6 colonnes)                       │
│                                             │
├─────────────────────────────────────────────┤
│  📖 Calcul de la plus-value en SCI          │
│     - Étapes du calcul                      │
│     - Exemple concret 🔵                    │
│     - Différences particuliers 🟡           │
│     - Points à retenir 🟢                   │
└─────────────────────────────────────────────┘
```

### Vue nom propre (existante)

```
┌─────────────────────────────────────────────┐
│  📊 Graphique (4 courbes)                   │
│                                             │
├─────────────────────────────────────────────┤
│  [Micro-foncier] [Réel] [Micro-BIC] [...]  │
│                                             │
│  Tableau (avec abattements)                 │
│                                             │
├─────────────────────────────────────────────┤
│  📖 Calcul de la plus-value particulier     │
│     - Règles IRPP                           │
│     - Abattements progressifs               │
└─────────────────────────────────────────────┘
```

## Résumé

Cette vue permet de simuler la revente d'un bien en SCI avec :
- ✅ Calculs conformes aux règles de l'IS
- ✅ Interface simplifiée (2 types vs 4 régimes)
- ✅ Explications claires et pédagogiques
- ✅ Avertissements sur les limitations

L'utilisateur peut comparer facilement :
- Location nue vs meublée
- SCI vs nom propre (en changeant de bien)
- Différentes années de revente

🎯 **Objectif atteint** : Fournir un outil de simulation clair et transparent pour les biens en SCI !


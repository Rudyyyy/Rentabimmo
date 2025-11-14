# Guide de test : Bilan SCI

## Accès rapide

1. Ouvrir un bien en SCI
2. Aller dans **Bilan** (premier onglet sous "Bilan")
3. Vérifier l'affichage de `SCIBalanceDisplay`

## Checklist de vérification

### ✅ 1. Affichage correct

- [ ] Bannière bleue "Bien détenu en SCI" visible en haut
- [ ] Seulement 2 onglets : "Location nue" et "Location meublée"
- [ ] Pas de mention des régimes fiscaux IRPP (micro-foncier, etc.)
- [ ] Graphique en barres empilées + courbe visible
- [ ] Tableau détaillé affiché dessous

### ✅ 2. Graphique de valeur cumulée

**Éléments attendus** :
- [ ] Barres grises (négatives) : Apport personnel
- [ ] Barres orange : Cash flow cumulé
- [ ] Barres rouges (négatives) : Imposition cumulée (devrait être 0 pour l'instant)
- [ ] Barres bleues : Solde de revente
- [ ] Barres violettes (négatives) : Impôt sur la plus-value (IS 25%)
- [ ] Courbe verte : Gain total cumulé

**Interactivité** :
- [ ] Survol affiche les valeurs exactes
- [ ] Légende affichée en haut
- [ ] Années sur l'axe X lisibles

### ✅ 3. Tableau détaillé

**Colonnes présentes** :
- [ ] Année
- [ ] Apport
- [ ] Cash flow cumulé
- [ ] Imposition cumulée
- [ ] Solde de revente
- [ ] Impôt plus-value
- [ ] Gain total cumulé

**Mise en forme** :
- [ ] Première année avec gain positif : Ligne verte avec barre verte à gauche
- [ ] Autres lignes : Alternance blanc/gris
- [ ] Valeurs monétaires formatées en euros

### ✅ 4. Calculs

**Test avec bien simple** :
- Prix achat : 250 000 €
- Prêt : 200 000 € sur 20 ans
- Location : 1 000 €/mois
- Charges : 250 €/mois

**Vérifier année complète (ex: 2026)** :
- [ ] Cash flow annuel ≈ 9 000 € (12 mois × 750 €)
- [ ] Cash flow cumulé augmente chaque année
- [ ] Capital restant dû diminue chaque année
- [ ] Solde de revente augmente avec le temps (revalorisation)

**Vérifier première année partielle (ex: 2025 depuis 15/11)** :
- [ ] Cash flow ≈ 1 125 € (1.5 mois × 750 €)
- [ ] Pas 12 mois complets comptabilisés

### ✅ 5. Impôt sur plus-value

**Configuration test** :
- Prix achat : 250 000 €
- Frais acquisition : 6 250 €
- Prix vente année 3 : 265 302 €

**Calcul attendu** :
```
Plus-value brute = 265 302 - 256 250 = 9 052 €
Impôt PV (IS 25%) = 9 052 × 25% = 2 263 €
```

**Vérifier** :
- [ ] Impôt PV = 25% de la PV brute
- [ ] Pas d'abattement appliqué (même après plusieurs années)
- [ ] Taux fixe de 25% pour toutes les années

### ✅ 6. Comparaison location nue vs meublée

**Passer d'un onglet à l'autre** :
- [ ] Les revenus changent (nue vs meublée)
- [ ] Le cash flow cumulé est différent
- [ ] Le gain total est différent
- [ ] L'impôt PV reste identique (indépendant du type)
- [ ] Le graphique se met à jour
- [ ] Le tableau se met à jour

### ✅ 7. Cohérence graphique/tableau

**Pour une année donnée** :
- [ ] Valeur "Cash flow cumulé" identique dans graphique et tableau
- [ ] Valeur "Solde de revente" identique
- [ ] Valeur "Impôt PV" identique
- [ ] Gain total dans tableau = Somme des composantes

**Calcul manuel** :
```
Gain total = -Apport + CF cumulé - Imposition + Solde revente - Impôt PV
```

### ✅ 8. Comparaison nom propre vs SCI

**Ouvrir un bien en nom propre** :
- [ ] Aller dans Bilan
- [ ] Vérifier 4 onglets (micro-foncier, réel-foncier, micro-BIC, réel-BIC)
- [ ] Vérifier mention d'imposition IRPP + PS
- [ ] Vérifier abattements pour durée de détention

**Ouvrir un bien en SCI** :
- [ ] Aller dans Bilan
- [ ] Vérifier 2 onglets (location nue, location meublée)
- [ ] Vérifier mention "SCI à l'IS"
- [ ] Vérifier impôt PV à 25% fixe

## Scénarios de test détaillés

### Scénario 1 : Première année de rentabilité

**Configuration** :
```
Prix achat : 200 000 €
Apport : 50 000 €
Prêt : 150 000 €
Loyer : 900 €/mois
Charges : 200 €/mois
Revalorisation : 2%/an
```

**Objectif** : Trouver l'année où le gain total devient positif

**Étapes** :
1. Ouvrir le bien en SCI
2. Aller dans Bilan
3. Chercher la première ligne verte dans le tableau
4. Noter l'année
5. Vérifier que le gain total > 0 pour cette année
6. Vérifier que les années précédentes sont négatives

**Résultat attendu** :
- [ ] Une ligne verte identifiable
- [ ] Gain total positif à partir de cette année
- [ ] Courbe verte du graphique franchit l'axe 0 à cette année

### Scénario 2 : Impact du type de location

**Configuration identique, changer seulement** :
- Location nue : 800 €/mois
- Location meublée : 1 000 €/mois

**Test** :
1. Afficher "Location nue"
   - Noter gain total année 5
   - Exemple : 15 000 €

2. Afficher "Location meublée"
   - Noter gain total année 5
   - Exemple : 25 000 €

**Vérifications** :
- [ ] Gain meublé > Gain nu (revenus supérieurs)
- [ ] Différence cohérente (environ 200 €/mois × 12 mois × 5 ans × 80% = 9 600 €)
- [ ] Impôt PV identique dans les deux cas

### Scénario 3 : Revente à différentes dates

**Configuration** :
- Bien acheté en 2025
- Revente possible de 2026 à 2035

**Test** :
1. Regarder le tableau
2. Pour chaque année, noter :
   - Solde de revente
   - Impôt PV
   - Gain total

**Vérifications** :
- [ ] Solde de revente augmente (revalorisation + remboursement prêt)
- [ ] Impôt PV augmente (plus-value plus importante)
- [ ] Gain total augmente globalement
- [ ] Courbe verte croissante sur le graphique

### Scénario 4 : Comparaison avec particulier

**Même configuration, 2 biens** :
1. Un en nom propre (régime réel-foncier)
2. Un en SCI

**Année 10 de détention** :

| Élément | Nom propre | SCI IS | Différence |
|---------|-----------|--------|------------|
| PV brute | 50 000 € | 50 000 € | Identique |
| Abattement IR | -21 000 € | 0 € | **Pas d'abattement SCI** |
| Abattement PS | -9 750 € | 0 € | **Pas d'abattement SCI** |
| PV imposable | 19 250 € | 50 000 € | +30 750 € |
| Impôt PV | 6 969 € | 12 500 € | +5 531 € |

**Vérifier** :
- [ ] SCI : Impôt = 25% de PV brute (12 500 €)
- [ ] Particulier : Impôt moindre grâce aux abattements (6 969 €)
- [ ] Différence significative sur long terme

## Bugs potentiels à surveiller

### 🐛 1. Calculs

- [ ] Cash flow toujours à 0
- [ ] Capital restant dû ne diminue pas
- [ ] Impôt PV != 25% de la PV brute
- [ ] Gain total incohérent

### 🐛 2. Affichage

- [ ] Graphique ne s'affiche pas
- [ ] Tableau vide
- [ ] Onglets ne changent rien
- [ ] Erreur console

### 🐛 3. Prorata

- [ ] Première année = 12 mois (au lieu du prorata)
- [ ] Dernière année = 12 mois (au lieu du prorata)
- [ ] Cash flow incohérent sur années partielles

### 🐛 4. Cohérence

- [ ] Graphique != Tableau
- [ ] Location nue = Location meublée (devrait différer)
- [ ] Régimes fiscaux IRPP encore affichés

## Validation finale

### ✅ Checklist complète

- [ ] Affichage conditionnel fonctionne (SCI vs nom propre)
- [ ] 2 onglets seulement pour SCI
- [ ] Bannière bleue informative présente
- [ ] Graphique complet et interactif
- [ ] Tableau détaillé correct
- [ ] Calculs avec prorata appliqué
- [ ] Impôt PV à 25% fixe (SCI)
- [ ] Cohérence graphique/tableau
- [ ] Aucune erreur console
- [ ] Aucune erreur linting

### ✅ Critères de succès

1. **Fonctionnel** : Tous les calculs sont corrects
2. **Visuel** : Interface claire et cohérente avec autres vues SCI
3. **Pédagogique** : Bannière explicative claire
4. **Précis** : Prorata appliqué correctement

## En cas de problème

### Logs à vérifier

Ouvrir la console développeur et chercher :
```
SCIBalanceDisplay rendered
investment.sciId: ...
selectedRentalType: ...
```

### Fichiers à vérifier

```
src/components/SCIBalanceDisplay.tsx    ← Composant principal
src/components/PropertyForm.tsx         ← Rendu conditionnel
```

### Points de contrôle

1. Le bien a-t-il un `sciId` ?
2. L'import de `SCIBalanceDisplay` est-il correct ?
3. Le rendu conditionnel fonctionne-t-il ?
4. Les fonctions `getYearCoverage` et `getLoanInfoForYear` sont-elles importées ?

## Comparaison visuelle

### Vue SCI (attendue)

```
┌─────────────────────────────────────────────┐
│ 🔵 Bien détenu en SCI : Les calculs...     │
├─────────────────────────────────────────────┤
│  [Location nue] [Location meublée]          │
├─────────────────────────────────────────────┤
│                                             │
│  📊 Graphique barres + courbe               │
│     - Barres empilées (positives/négatives) │
│     - Courbe gain total                     │
│                                             │
├─────────────────────────────────────────────┤
│  📋 Tableau année par année                 │
│     7 colonnes de données                   │
│     Ligne verte = première rentabilité      │
└─────────────────────────────────────────────┘
```

### Vue nom propre (existante)

```
┌─────────────────────────────────────────────┐
│  [Micro-foncier] [Réel] [Micro-BIC] [Réel] │
├─────────────────────────────────────────────┤
│                                             │
│  📊 Graphique barres + courbe               │
│     - Avec imposition IRPP                  │
│     - Avec abattements PV                   │
│                                             │
├─────────────────────────────────────────────┤
│  📋 Tableau année par année                 │
│     Avec calculs IRPP                       │
└─────────────────────────────────────────────┘
```

## Résumé

Cette vue permet de visualiser le bilan complet d'un bien en SCI avec :
- ✅ Interface simplifiée (2 types vs 4 régimes)
- ✅ Calculs adaptés à la fiscalité SCI (IS 25%)
- ✅ Mêmes statistiques que les biens en nom propre
- ✅ Prorata temporel appliqué
- ✅ Visualisation claire de la rentabilité

🎯 **Objectif atteint** : Fournir un outil d'analyse complet et cohérent pour les biens en SCI !


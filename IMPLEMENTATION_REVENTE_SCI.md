# Implémentation : Vue Revente pour les biens en SCI

## Vue d'ensemble

Cette implémentation ajoute une vue spécifique pour la simulation de revente des biens détenus en SCI (Société Civile Immobilière) soumise à l'IS (Impôt sur les Sociétés). Contrairement aux biens en nom propre, les SCI ne bénéficient pas des abattements IRPP et sont imposées selon les règles de l'IS.

## Objectifs

1. ✅ Créer une interface simplifiée pour les biens en SCI (location nue vs meublée uniquement)
2. ✅ Appliquer les règles fiscales de l'IS pour le calcul de plus-value
3. ✅ Fournir des explications claires et pédagogiques sur le calcul
4. ✅ Maintenir la cohérence avec les autres vues SCI

## Différences entre particuliers et SCI

### Biens en nom propre (particuliers)

- **4 régimes fiscaux** : Micro-foncier, Réel-foncier, Micro-BIC, Réel-BIC
- **Abattements pour durée de détention** :
  - IR : 6% par an de la 6e à la 21e année, 4% la 22e année (exonération totale après 22 ans)
  - PS : 1,65% par an de la 6e à la 21e année, 1,6% la 22e, puis 9% jusqu'à la 30e (exonération après 30 ans)
- **Taux d'imposition** : 19% IR + 17,2% PS = 36,2% (sans abattement)
- **Réintégration amortissements** : Uniquement pour LMNP en réel-BIC

### Biens en SCI à l'IS

- **2 types de location** : Location nue ou meublée
- **Pas d'abattement** : Aucun abattement pour durée de détention
- **Taux d'imposition fixe** : 25% (IS)
- **Réintégration amortissements** : Systématique (mais non calculé dans cette version simplifiée)

## Architecture technique

### Nouveau composant : `SCISaleDisplay.tsx`

```
src/components/SCISaleDisplay.tsx
```

**Responsabilités** :
- Affichage des simulations de revente pour biens en SCI
- Calcul de la plus-value selon les règles de l'IS
- Comparaison location nue vs meublée
- Explications pédagogiques du calcul

**Structure** :
1. Bannière informative sur la fiscalité SCI
2. Graphique d'évolution du solde après revente
3. Tableau comparatif par année et type de location
4. Section explicative détaillée du calcul

### Modifications : `PropertyForm.tsx`

Ajout du rendu conditionnel pour l'onglet "revente" :

```typescript
} else if (currentSubTab === 'revente') {
  return investmentData.sciId ? (
    <SCISaleDisplay 
      investment={investmentData} 
      onUpdate={handleInvestmentUpdate}
    />
  ) : (
    <SaleDisplay 
      investment={investmentData} 
      onUpdate={handleInvestmentUpdate}
    />
  );
}
```

## Calculs implémentés

### 1. Prix d'acquisition corrigé

```
Prix d'acquisition corrigé = Prix d'achat + Frais d'acquisition + Travaux d'amélioration
```

Où :
- **Frais d'acquisition** = Frais de notaire + Frais d'agence à l'achat
- **Travaux d'amélioration** = Travaux non déduits

### 2. Prix de vente net

```
Prix de vente net = Prix de vente - Frais d'agence à la revente
```

### 3. Plus-value brute

```
Plus-value brute = Prix de vente net - Prix d'acquisition corrigé
```

### 4. Impôt sur la plus-value (IS)

```
Impôt PV = Plus-value brute × 25%
```

**Note** : Pas d'abattement, taux fixe de 25% (IS).

### 5. Solde net après revente

```
Solde net = Prix de vente net 
          - Capital restant dû 
          - Frais remboursement anticipé 
          - Impôt PV 
          + Cash flow cumulé 
          - Apport initial
```

## Interface utilisateur

### 1. Bannière informative

Une bannière bleue en haut de page explique les spécificités de la fiscalité SCI :

```
Bien détenu en SCI : Les plus-values immobilières réalisées par une SCI soumise à l'IS 
sont imposées au taux de l'impôt sur les sociétés (25%). Contrairement aux particuliers, 
il n'existe pas d'abattement pour durée de détention.
```

### 2. Graphique d'évolution

**Type** : Graphique en ligne (Line chart)

**Axes** :
- X : Années de revente possibles
- Y : Solde net en euros

**Courbes** :
- Bleue : Location nue
- Violette : Location meublée

**Interactivité** :
- Survol : Affiche le solde exact pour une année donnée

### 3. Tableau comparatif

**Onglets** :
- Location nue
- Location meublée

**Colonnes** :
1. Année de revente
2. Prix de vente
3. Plus-value brute
4. Impôt PV (IS 25%)
5. Capital restant dû
6. Solde net

**Mise en forme** :
- Plus-values positives : Texte vert
- Plus-values négatives : Texte rouge
- Soldes positifs : Texte vert gras
- Soldes négatifs : Texte rouge gras

### 4. Section explicative

**Structure** :
1. Introduction aux règles SCI
2. Étapes du calcul (liste numérotée)
3. Exemple concret avec données du bien
4. Différences avec les particuliers (encadré jaune)
5. Points à retenir (encadré vert)

**Encadrés colorés** :
- 🔵 Bleu : Exemple concret chiffré
- 🟡 Jaune : Différences avec particuliers
- 🟢 Vert : Points importants à retenir

## Exemple de calcul

### Données d'entrée

```
Prix d'achat : 250 000 €
Frais de notaire : 6 000 €
Frais d'agence achat : 250 €
Travaux d'amélioration : 0 €
Prix de vente (année 1) : 250 000 €
Frais d'agence vente : 0 €
```

### Calcul

```
1. Prix d'acquisition corrigé = 250 000 + 6 000 + 250 + 0 = 256 250 €
2. Prix de vente net = 250 000 - 0 = 250 000 €
3. Plus-value brute = 250 000 - 256 250 = -6 250 €
4. Impôt PV = -6 250 × 25% = 0 € (pas d'impôt sur MV négative)
5. Plus-value nette = -6 250 - 0 = -6 250 €
```

### Résultat

**Moins-value de 6 250 €** sur une revente immédiate, due aux frais d'acquisition.

## Limitations et simplifications

### 1. Réintégration des amortissements

**Non implémenté** : La réintégration fiscale des amortissements pratiqués par la SCI n'est pas calculée dans cette version.

**Impact** : Pour une SCI qui amortit son bien (location meublée), la plus-value imposable réelle serait supérieure à celle affichée.

**Justification** : Calcul complexe nécessitant un historique comptable complet des amortissements.

### 2. Contribution sociale IS

**Non implémenté** : La contribution sociale de 3,3% sur l'IS (pour les grandes sociétés) n'est pas prise en compte.

**Impact** : Taux réel légèrement supérieur à 25% pour certaines SCI.

### 3. Taux réduit IS

**Non implémenté** : Le taux réduit de 15% sur les 38 120 premiers euros de bénéfice n'est pas appliqué.

**Impact** : Légère surestimation de l'impôt pour les petites plus-values.

### 4. Provisions et autres éléments comptables

**Non implémenté** : Les provisions, charges à payer, etc. ne sont pas prises en compte.

**Impact** : Le calcul est une approximation du résultat fiscal réel.

## Points d'attention

### 1. Avertissement utilisateur

La section explicative inclut un avertissement clair :

```
Le calcul présenté ici est simplifié. Dans la réalité, il faut tenir compte des 
amortissements pratiqués, des provisions, et d'autres éléments comptables spécifiques 
aux SCI. Pour une analyse fiscale précise, il est recommandé de consulter un 
expert-comptable ou un conseiller en gestion de patrimoine spécialisé dans les SCI.
```

### 2. Double imposition

L'explication précise que :

```
L'impôt sur les sociétés calculé au niveau de la SCI doit être distingué de l'imposition 
des associés sur les dividendes qu'ils percevront lors de la distribution du produit de 
la vente.
```

### 3. Choix du type de location

Le type de location (nue/meublée) impacte :
- Le cash flow cumulé (revenus différents)
- Potentiellement les amortissements (non calculé ici)

## Cohérence avec les autres vues SCI

### Même structure que :

1. **SCIResultsDisplay** (rentabilité)
   - Bannière bleue explicative
   - Onglets location nue/meublée
   - Explications détaillées en bas

2. **SCICashFlowDisplay** (cash flow)
   - Bannière bleue explicative
   - Onglets location nue/meublée
   - Graphiques et tableaux cohérents

### Même logique de calcul :

- Utilisation de `getYearCoverage` pour le prorata temporel
- Calculs de cash flow identiques
- Format d'affichage cohérent

## Tests recommandés

### Test 1 : Affichage conditionnel

1. Ouvrir un bien en SCI
2. Aller dans l'onglet "Bilan" > "Revente"
3. Vérifier que `SCISaleDisplay` s'affiche (bannière bleue SCI visible)
4. Ouvrir un bien en nom propre
5. Vérifier que `SaleDisplay` s'affiche (4 régimes fiscaux)

### Test 2 : Calcul de plus-value

1. Bien avec MV positive
   - Vérifier que l'impôt = PV brute × 25%
   - Vérifier que PV nette = PV brute - Impôt

2. Bien avec MV négative
   - Vérifier que l'impôt = 0 €
   - Vérifier que PV nette = PV brute (négative)

### Test 3 : Comparaison location nue/meublée

1. Passer d'un onglet à l'autre
2. Vérifier que les soldes diffèrent (due au cash flow cumulé)
3. Vérifier que les impôts PV sont identiques (indépendants du type)

### Test 4 : Cohérence graphique/tableau

1. Regarder une année sur le graphique
2. Noter le solde affiché au survol
3. Regarder la même année dans le tableau
4. Vérifier que les valeurs correspondent

### Test 5 : Section explicative

1. Lire la section "Calcul de la plus-value immobilière en SCI à l'IS"
2. Vérifier la présence de :
   - Étapes du calcul
   - Exemple concret avec les données du bien
   - Encadré jaune "Différences avec les particuliers"
   - Encadré vert "Points à retenir"
3. Vérifier que l'exemple concret utilise les vraies données du premier bien

## Formules récapitulatives

### Pour un bien en SCI à l'IS

```
Prix d'acquisition corrigé = Prix achat + Frais acquisition + Travaux amélioration

Prix de vente net = Prix vente - Frais agence vente

Plus-value brute = Prix vente net - Prix acquisition corrigé

Impôt PV = MAX(0, Plus-value brute × 25%)

Plus-value nette = Plus-value brute - Impôt PV

Solde net = Prix vente net 
          - Capital restant dû 
          - Frais remboursement anticipé 
          - Impôt PV 
          + Cash flow cumulé 
          - Apport initial
```

## Évolutions futures possibles

### 1. Calcul des amortissements

Ajouter un module de calcul des amortissements :
- Linéaire sur la durée fiscale
- Historique des amortissements pratiqués
- Réintégration à la revente

### 2. Optimisation fiscale

Comparer différents scénarios :
- Vente avec distribution immédiate
- Vente avec conservation en compte courant
- Impact de l'IS sur les associés (PFU vs barème progressif)

### 3. Simulation de cession de parts

Ajouter une option pour simuler :
- Cession de parts sociales (au lieu du bien)
- Impact fiscal sur l'associé cédant
- Droits d'enregistrement pour l'acquéreur

### 4. Calcul précis du taux IS

Implémenter :
- Taux réduit 15% sur les 38 120 premiers euros
- Contribution sociale 3,3% (si applicable)
- Calcul au réel du bénéfice imposable

## Fichiers impactés

### Nouveaux fichiers

```
src/components/SCISaleDisplay.tsx (nouveau, 550+ lignes)
```

### Fichiers modifiés

```
src/components/PropertyForm.tsx
  - Import de SCISaleDisplay
  - Rendu conditionnel dans l'onglet 'revente'
```

## Conclusion

Cette implémentation fournit une vue claire et pédagogique de la simulation de revente pour les biens en SCI. Les calculs sont simplifiés mais conformes aux règles générales de l'IS. Les utilisateurs sont clairement avertis des limitations et invités à consulter des professionnels pour une analyse précise.

La cohérence avec les autres vues SCI (rentabilité, cash flow) est assurée, offrant une expérience utilisateur uniforme pour la gestion des biens en SCI. 🎯


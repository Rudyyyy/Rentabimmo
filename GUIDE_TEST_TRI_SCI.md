# Guide de test : TRI pour biens en SCI

## Test rapide (5 minutes)

### 1. Ouvrir un bien en SCI
- Accéder à un bien existant avec une SCI associée
- Ou créer un nouveau bien et l'associer à une SCI

### 2. Naviguer vers l'onglet TRI
- Cliquer sur "Bilan" dans le menu principal
- Cliquer sur "TRI" dans le sous-menu

### 3. Vérifications visuelles
✅ **Checkboxes** : Seulement 2 options visibles
- [ ] Location nue
- [ ] Location meublée

✅ **Graphique** : Courbes d'évolution du TRI
- Axe X : Années de revente
- Axe Y : TRI en pourcentage
- 2 courbes maximum (selon les sélections)

✅ **Tableau** : Valeurs détaillées
- Colonne "Année"
- Colonnes pour chaque type de location sélectionné
- Valeurs en vert (positives) ou rouge (négatives)

✅ **Explication** : Bloc d'aide en bas
- Titre "Comprendre le TRI pour une SCI"
- Encadré bleu "Comment interpréter le TRI"
- Encadré orange "Spécificités SCI"

✅ **Sidebar** : Résumé du TRI à droite
- Titre "TRI par type de location"
- Année de revente affichée
- 2 cartes (Location nue, Location meublée)
- Badge "Optimal" sur le meilleur type
- Recommandation en bas

### 4. Test d'interactivité
- Décocher une option → La courbe disparaît du graphique
- Décocher les 2 options → Message "Sélectionnez au moins un type de location"
- Recocher une option → La courbe réapparaît

### 5. Vérification des valeurs
- Noter le TRI pour l'année 10 en location nue : _____
- Aller dans l'onglet "Bilan" > "Bilan"
- Sélectionner l'année 10
- Comparer le gain total avec le TRI noté
- ✅ Le TRI doit être cohérent avec le gain total (positif si gain positif)

## Test de la sidebar (2 minutes)

### 1. Ouvrir un bien en SCI
- Naviguer vers "Bilan" > "TRI"

### 2. Vérifier la sidebar à droite
✅ **Titre** : "TRI par type de location" (et non "TRI par régime fiscal")

✅ **Contenu** :
- Année de revente affichée (ex: "Année de revente : 2034")
- 2 cartes : Location nue et Location meublée
- Valeurs de TRI en % pour chaque type
- Badge "Optimal" sur la carte avec le meilleur TRI
- Message "Meilleur rendement annualisé" sous le badge

✅ **Recommandation en bas** :
- Encadré bleu avec icône d'information
- Texte "Recommandation : La location [type] offre le meilleur TRI (X.XX%) pour une revente en [année]."

### 3. Modifier l'année de revente dans le bilan principal
- Aller dans "Bilan" > "Bilan"
- Choisir une autre année de revente
- Retourner dans "Bilan" > "TRI"
- ✅ Vérifier que la sidebar affiche les TRI pour la nouvelle année

## Test de non-régression (3 minutes)

### 1. Ouvrir un bien en nom propre (sans SCI)
- Sélectionner un bien non associé à une SCI

### 2. Naviguer vers l'onglet TRI
- Cliquer sur "Bilan" dans le menu principal
- Cliquer sur "TRI" dans le sous-menu

### 3. Vérifications
✅ **Checkboxes** : 4 options visibles
- [ ] Location nue - Micro-foncier
- [ ] Location nue - Frais réels
- [ ] LMNP - Micro-BIC
- [ ] LMNP - Frais réels

✅ **Fonctionnement** : Identique à avant
- Graphique avec jusqu'à 4 courbes
- Tableau avec les 4 régimes fiscaux
- Explication standard (pas de mention de SCI)

✅ **Sidebar** : 
- Titre "TRI par régime fiscal" (et non "par type de location")
- 4 cartes pour les 4 régimes fiscaux
- Badge "Optimal" sur le meilleur régime
- Recommandation mentionnant le régime fiscal

## Test avec paramètres de vente (5 minutes)

### 1. Configuration initiale
- Ouvrir un bien en SCI
- Noter le TRI de l'année 10 en location nue : _____

### 2. Modifier les paramètres de vente
- Aller dans l'onglet "Rentabilité" > "Revente"
- Modifier la revalorisation annuelle (ex: passer de 2% à 5%)
- Enregistrer

### 3. Retourner au TRI
- Aller dans l'onglet "Bilan" > "TRI"
- Noter le nouveau TRI de l'année 10 en location nue : _____

### 4. Vérification
✅ Le TRI doit avoir augmenté (revalorisation plus élevée = meilleure rentabilité)

## Test du prorata temporel (5 minutes)

### 1. Créer deux biens en SCI similaires
**Bien A** :
- Date de début : 01/01/2024
- Prix : 200 000 €
- Loyer mensuel : 1000 €

**Bien B** :
- Date de début : 01/07/2024 (milieu d'année)
- Prix : 200 000 €
- Loyer mensuel : 1000 €

### 2. Comparer les TRI
- Noter le TRI année 1 du Bien A : _____
- Noter le TRI année 1 du Bien B : _____

### 3. Vérification
✅ Le TRI du Bien B doit être inférieur (car seulement 6 mois de loyers la première année)

## Problèmes courants et solutions

### Problème 1 : Badge SCI non visible
**Symptôme** : Le badge "SCI: [Nom]" n'apparaît pas dans l'en-tête  
**Cause** : Le bien n'est pas correctement associé à une SCI  
**Solution** :
1. Vérifier que `investmentData.sciId` existe
2. Vérifier dans la base de données que `sci_id` est renseigné
3. Recharger la page

### Problème 2 : 4 régimes fiscaux affichés au lieu de 2
**Symptôme** : Les 4 régimes IRPP sont affichés pour un bien SCI  
**Cause** : Le composant `IRRDisplay` est utilisé au lieu de `SCIIRRDisplay`  
**Solution** :
1. Vérifier que le bien a bien un `sciId`
2. Vérifier les logs de la console pour les erreurs
3. Vider le cache du navigateur et recharger

### Problème 3 : Valeurs de TRI incohérentes
**Symptôme** : Les valeurs de TRI semblent incorrectes ou trop élevées/basses  
**Cause possible** : Paramètres de vente non configurés ou incorrects  
**Solution** :
1. Vérifier dans l'onglet "Revente" que les paramètres sont corrects
2. Vérifier que les charges annuelles sont bien renseignées
3. Vérifier que le prêt est correctement configuré

### Problème 4 : TRI toujours à 0% ou N/A
**Symptôme** : Le TRI est systématiquement 0% ou N/A  
**Cause possible** : Données de cash flow manquantes ou nulles  
**Solution** :
1. Vérifier que les revenus locatifs sont renseignés
2. Vérifier que l'investissement initial est > 0
3. Vérifier que la durée du projet est > 0 ans

## Validation finale

### Checklist de validation

- [ ] Le badge SCI apparaît correctement dans l'en-tête du bien
- [ ] L'onglet TRI affiche 2 types de location (nue/meublée) pour un bien SCI
- [ ] L'onglet TRI affiche 4 régimes fiscaux pour un bien en nom propre
- [ ] Le graphique affiche les courbes correctement
- [ ] Le tableau affiche les valeurs en pourcentage
- [ ] **La sidebar affiche "TRI par type de location" avec 2 cartes pour un bien SCI**
- [ ] **La sidebar affiche "TRI par régime fiscal" avec 4 cartes pour un bien en nom propre**
- [ ] **Le badge "Optimal" s'affiche sur le meilleur type/régime dans la sidebar**
- [ ] Les valeurs de TRI sont cohérentes avec le gain total dans l'onglet Bilan
- [ ] La modification des paramètres de vente impacte les valeurs de TRI
- [ ] Le prorata temporel est appliqué pour les années incomplètes
- [ ] L'explication spécifique aux SCI s'affiche en bas de page
- [ ] Aucune régression sur les biens en nom propre

### Résultat attendu
Si tous les points de la checklist sont validés, l'implémentation est fonctionnelle. ✅


# Guide de Test : Rentabilité des biens en SCI

## 🎯 Objectif

Vérifier que la nouvelle vue de rentabilité pour les biens en SCI fonctionne correctement et n'impacte pas les biens en nom propre.

## ✅ Checklist de test

### Test 1 : Bien en nom propre (régression)

**Objectif** : S'assurer que rien n'a changé pour les biens existants.

1. ✅ Aller sur un bien en nom propre existant
2. ✅ Cliquer sur l'onglet "Rentabilité"
3. ✅ Vérifier que les **4 onglets** sont présents :
   - Location nue - Micro-foncier
   - Location nue - Frais réels
   - LMNP - Micro-BIC
   - LMNP - Frais réels
4. ✅ Vérifier que les **graphiques** affichent **4 courbes**
5. ✅ Vérifier que le **tableau** n'a **pas** de colonne "Coûts prêt"
6. ✅ Vérifier que les calculs sont corrects
7. ✅ Vérifier la **sidebar** : rentabilités identiques à avant

**Résultat attendu** : Aucun changement visible

---

### Test 2 : Bien en SCI - Affichage de base

**Objectif** : Vérifier que la nouvelle vue s'affiche correctement.

1. ✅ Créer ou ouvrir une SCI
2. ✅ Créer ou ouvrir un bien rattaché à cette SCI
3. ✅ Aller dans l'onglet "Rentabilité"
4. ✅ Vérifier la présence de la **bannière bleue** en haut :
   - Icône d'information
   - Texte expliquant la fiscalité SCI
5. ✅ Vérifier que seulement **2 onglets** sont présents :
   - Location nue
   - Location meublée
6. ✅ Vérifier que les **graphiques** affichent **2 courbes** :
   - Location nue (bleu)
   - Location meublée (orange)

**Résultat attendu** : Interface simplifiée avec 2 onglets

---

### Test 3 : Bien en SCI - Tableau et colonnes

**Objectif** : Vérifier la présence de la colonne "Coûts prêt".

1. ✅ Dans le même bien en SCI
2. ✅ Regarder le tableau de rentabilité
3. ✅ Vérifier que les colonnes suivantes sont présentes :
   - Année
   - Revenus bruts
   - Charges
   - **Coûts prêt** ← NOUVELLE COLONNE
   - Coût total
   - Rentabilité brute
   - Rentabilité hors impôts
4. ✅ Vérifier que les valeurs sont cohérentes :
   - Coûts prêt = Remboursement prêt + Assurance emprunteur
   - Les montants correspondent aux données saisies

**Résultat attendu** : Colonne "Coûts prêt" visible avec les bonnes valeurs

---

### Test 4 : Bien en SCI - Calculs

**Objectif** : Vérifier que les calculs incluent les coûts du prêt.

**Données de test** :
- Prix d'achat : 200 000 €
- Frais annexes : 20 000 € (notaire, agence, etc.)
- Loyer nu annuel : 12 000 €
- Aide fiscale : 2 000 €
- Charges de gestion : 3 000 €
- Remboursement prêt annuel : 8 000 €
- Assurance emprunteur annuelle : 400 €

**Calculs attendus** :
1. ✅ Coût total = 200 000 + 20 000 = **220 000 €**
2. ✅ Revenus bruts = 12 000 + 2 000 = **14 000 €**
3. ✅ Charges = **3 000 €**
4. ✅ Coûts prêt = 8 000 + 400 = **8 400 €**
5. ✅ Rentabilité brute = (14 000 / 220 000) × 100 = **6,36 %**
6. ✅ Rentabilité hors impôts = ((14 000 - 3 000 - 8 400) / 220 000) × 100 = **1,18 %**

**Résultat attendu** : Les calculs du tableau correspondent aux valeurs attendues

---

### Test 5 : Bien en SCI - Sidebar

**Objectif** : Vérifier la cohérence entre le tableau et la sidebar.

1. ✅ Dans le même bien en SCI
2. ✅ Regarder les indicateurs de rentabilité dans la **sidebar** (à droite)
3. ✅ Vérifier que les valeurs affichées correspondent au tableau principal
4. ✅ Vérifier pour les 2 types de location :
   - Location nue
   - Location meublée

**Résultat attendu** : Valeurs identiques entre le tableau et la sidebar

---

### Test 6 : Bien en SCI - Section explicative

**Objectif** : Vérifier que l'aide contextuelle est correcte.

1. ✅ Faire défiler jusqu'en bas du tableau
2. ✅ Vérifier la section "Détail des calculs"
3. ✅ Vérifier que les formules sont correctes :
   - Revenus bruts
   - Charges (avec la liste complète)
   - **Coûts prêt** (avec Remboursement + Assurance)
   - Coût total
   - Rentabilité brute
   - Rentabilité hors impôts (avec la note sur l'IS)

**Résultat attendu** : Documentation claire et précise

---

### Test 7 : Transition nom propre ↔ SCI

**Objectif** : Vérifier que le basculement fonctionne correctement.

**Partie A : Nom propre → SCI**
1. ✅ Créer un nouveau bien en **nom propre**
2. ✅ Aller dans "Rentabilité" → vérifier 4 onglets
3. ✅ Retourner dans "Acquisition"
4. ✅ Changer "Type de propriété" pour le rattacher à une **SCI**
5. ✅ Sauvegarder
6. ✅ Retourner dans "Rentabilité"
7. ✅ Vérifier que maintenant il n'y a que **2 onglets**
8. ✅ Vérifier la présence de la **bannière bleue**
9. ✅ Vérifier la présence de la colonne **"Coûts prêt"**

**Partie B : SCI → Nom propre**
1. ✅ Dans le même bien
2. ✅ Retourner dans "Acquisition"
3. ✅ Changer "Type de propriété" pour **"Nom propre"**
4. ✅ Sauvegarder
5. ✅ Retourner dans "Rentabilité"
6. ✅ Vérifier que maintenant il y a **4 onglets**
7. ✅ Vérifier que la **bannière bleue** a disparu
8. ✅ Vérifier que la colonne **"Coûts prêt"** a disparu

**Résultat attendu** : Le basculement fonctionne dans les deux sens sans erreur

---

### Test 8 : Bien en SCI - Graphiques

**Objectif** : Vérifier que les graphiques sont corrects.

1. ✅ Dans un bien en SCI
2. ✅ Regarder le **graphique de rentabilité brute** (gauche)
3. ✅ Vérifier qu'il y a **2 courbes** :
   - Location nue (bleu)
   - Location meublée (orange)
4. ✅ Regarder le **graphique de rentabilité hors impôts** (droite)
5. ✅ Vérifier qu'il y a **2 courbes** :
   - Location nue (bleu)
   - Location meublée (orange)
6. ✅ Vérifier que les courbes évoluent logiquement dans le temps
7. ✅ Survoler les points → vérifier que les **tooltips** affichent :
   - Le nom de la série (Location nue / meublée)
   - La valeur avec le format "XX,XX %"

**Résultat attendu** : Graphiques clairs avec 2 courbes et tooltips informatifs

---

### Test 9 : Bien en SCI - Comparaison nu/meublé

**Objectif** : Vérifier que la comparaison entre location nue et meublée fonctionne.

1. ✅ Dans un bien en SCI
2. ✅ Cliquer sur l'onglet **"Location nue"**
3. ✅ Noter les valeurs de rentabilité affichées
4. ✅ Cliquer sur l'onglet **"Location meublée"**
5. ✅ Vérifier que les valeurs changent
6. ✅ Vérifier que :
   - Les revenus bruts changent (loyer nu vs loyer meublé)
   - Les charges restent identiques
   - Les coûts prêt restent identiques
   - La rentabilité change en conséquence

**Résultat attendu** : Les deux onglets affichent des calculs différents mais cohérents

---

### Test 10 : Erreurs et cas limites

**Objectif** : Vérifier que l'application gère les cas limites.

1. ✅ Bien en SCI **sans prêt** :
   - Vérifier que "Coûts prêt" affiche 0 €
   - Vérifier que les calculs restent corrects
   
2. ✅ Bien en SCI **sans charges** :
   - Vérifier que "Charges" affiche 0 €
   - Vérifier que les calculs restent corrects
   
3. ✅ Bien en SCI **sans revenus** :
   - Vérifier que la rentabilité affiche 0,00 %
   - Pas d'erreur JavaScript
   
4. ✅ Bien en SCI avec **projet sur 1 seule année** :
   - Vérifier que le tableau affiche 1 ligne
   - Les graphiques fonctionnent
   
5. ✅ Bien en SCI avec **projet sur 30+ années** :
   - Vérifier que le tableau est scrollable
   - Les graphiques restent lisibles

**Résultat attendu** : Aucune erreur, affichage correct dans tous les cas

---

## 📊 Résultats

| Test | Statut | Commentaires |
|------|--------|--------------|
| Test 1 - Régression nom propre | ⏳ | |
| Test 2 - Affichage SCI | ⏳ | |
| Test 3 - Tableau SCI | ⏳ | |
| Test 4 - Calculs SCI | ⏳ | |
| Test 5 - Sidebar SCI | ⏳ | |
| Test 6 - Explications SCI | ⏳ | |
| Test 7 - Transition | ⏳ | |
| Test 8 - Graphiques SCI | ⏳ | |
| Test 9 - Comparaison nu/meublé | ⏳ | |
| Test 10 - Cas limites | ⏳ | |

**Légende** : ✅ Réussi | ❌ Échec | ⏳ En attente

---

## 🐛 Bugs identifiés

*À compléter lors des tests*

---

## 💡 Améliorations suggérées

*À compléter lors des tests*

---

## 📝 Notes

*Notes libres pendant les tests*


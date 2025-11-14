# Résumé : Vue de Rentabilité pour les biens en SCI

## ✅ Ce qui a été fait

### 1. Nouveau composant de rentabilité pour les SCI

J'ai créé un composant **`SCIResultsDisplay`** qui remplace la vue standard pour les biens en SCI :

**Différences principales** :
- ❌ **Plus de régimes fiscaux IRPP** (micro-foncier, LMNP, etc.) - ils ne s'appliquent pas aux SCI
- ✅ **2 onglets seulement** : Location nue / Location meublée
- ✅ **Colonne "Coûts prêt"** ajoutée dans le tableau
- ✅ **Inclusion automatique** des remboursements de prêt et assurance emprunteur dans les charges
- ✅ **Bannière d'information** expliquant la fiscalité SCI

### 2. Logique conditionnelle dans PropertyForm

Le système détecte automatiquement si un bien est en SCI (`investment.sciId`) et affiche :
- **`SCIResultsDisplay`** pour les biens en SCI
- **`ResultsDisplay`** (inchangé) pour les biens en nom propre

### 3. Mise à jour des calculs dans la sidebar

Les rentabilités affichées dans la sidebar incluent maintenant les coûts du prêt pour les biens en SCI.

## 📊 Calculs de rentabilité

### Pour les biens en SCI (NOUVEAU)

**Rentabilité brute** = `(Revenus bruts / Coût total) × 100`

**Rentabilité hors impôts** = `((Revenus bruts - Charges - Coûts prêt) / Coût total) × 100`

Où :
- **Revenus bruts** = Loyers + Aide fiscale
- **Charges** = Charges de gestion (taxe foncière, copro, assurances, etc.)
- **Coûts prêt** = Remboursement prêt + Assurance emprunteur

> **Note** : L'IS n'est pas pris en compte ici car il est calculé au niveau de la SCI sur tous ses biens (voir onglet "Imposition")

### Pour les biens en nom propre (INCHANGÉ)

Aucune modification - les 4 régimes fiscaux sont toujours affichés.

## 🎨 Interface utilisateur

### Tableau de rentabilité SCI

| Année | Revenus bruts | Charges | **Coûts prêt** | Coût total | Rentabilité brute | Rentabilité hors impôts |
|-------|---------------|---------|----------------|------------|-------------------|------------------------|
| 2025  | 14 000 €      | 3 000 € | **8 400 €**    | 220 000 €  | 6,36 %           | 1,18 %                |

### Graphiques

- **2 courbes** seulement (vs 4 pour les biens en nom propre)
- Location nue (bleu)
- Location meublée (orange)

## 🔧 Fichiers modifiés/créés

1. ✅ **Créé** : `src/components/SCIResultsDisplay.tsx` (460 lignes)
2. ✅ **Modifié** : `src/pages/PropertyForm.tsx` (ajout logique conditionnelle)
3. ✅ **Modifié** : `src/components/SidebarContent.tsx` (inclusion coûts prêt pour SCI)
4. ✅ **Modifié** : `src/components/HierarchicalNavigation.tsx` (inclusion coûts prêt pour SCI)
5. ✅ **Créé** : `IMPLEMENTATION_RENTABILITE_SCI.md` (documentation détaillée)

## ✨ Impact

- ✅ **Non-destructif** : Les biens en nom propre ne sont pas affectés
- ✅ **Rétrocompatible** : Les biens SCI existants bénéficient immédiatement de la nouvelle vue
- ✅ **Cohérent** : Les calculs sont identiques dans tous les composants
- ✅ **Informatif** : Bannière explicative pour les utilisateurs

## 🧪 Tests recommandés

1. **Créer un bien en SCI** → Vérifier l'affichage de la rentabilité
2. **Créer un bien en nom propre** → Vérifier que rien n'a changé
3. **Comparer les calculs** entre le tableau et la sidebar
4. **Basculer un bien** de nom propre vers SCI et vice-versa

## 📚 Documentation

Voir `IMPLEMENTATION_RENTABILITE_SCI.md` pour :
- Détails techniques complets
- Exemples de calculs
- Diagrammes
- Notes de développement

---

**Statut** : ✅ Implémentation terminée et fonctionnelle


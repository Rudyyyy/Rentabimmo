# Cas de Test Complet : Pinel Bagnolet

Ce document présente un cas de test complet qui peut être exécuté manuellement dans l'application ou utilisé pour les tests automatisés.

## 📋 Vue d'ensemble

**Nom du bien** : Pinel Bagnolet  
**Type d'investissement** : Location meublée (LMNP) avec dispositif Pinel  
**Date d'acquisition** : Mai 2017  
**Durée du projet** : 20 ans  

---

## 1️⃣ ACQUISITION

### Informations d'achat

| Champ | Valeur | Notes |
|-------|---------|-------|
| Prix d'achat | 129 668 € | Prix du bien neuf |
| Frais d'agence | 0 € | Inclus dans le prix |
| Frais de notaire | 0 € | Pinel neuf |
| Frais de dossier bancaire | 800 € | Frais fixes |
| Frais de garantie bancaire | 0 € | Aucun |
| Diagnostics obligatoires | 0 € | Bien neuf |
| Coûts de rénovation | 0 € | Bien neuf |
| **COÛT TOTAL** | **130 468 €** | **Prix + frais** |

### Financement

| Champ | Valeur | Notes |
|-------|---------|-------|
| Apport personnel | 800 € | Uniquement les frais de dossier |
| Somme empruntée | 129 668 € | Montant du crédit |
| Durée du prêt | 20 ans | 240 mois |
| Taux d'intérêt | 1,50 % | Taux fixe annuel |
| Taux d'assurance | 0,36 % | Assurance emprunteur |
| Type de différé | Total | Différé total pendant travaux |
| Période de différé | 24 mois | 2 ans de différé |
| Date de début | 01/05/2017 | Date de signature |

### ✅ Vérifications automatiques

**Équation fondamentale** : Apport + Emprunt = Coût Total
```
800 € + 129 668 € = 130 468 € ✓
```

**Calculs mensuels** :
- Mensualité de crédit (hors différé) : ~698,46 €
- Mensualité d'assurance : ~38,90 €
- **Mensualité totale** : ~737,36 €

**Intérêts différés** :
- Durée du différé : 24 mois
- Intérêts accumulés pendant le différé : ~4 460,58 €
- Ces intérêts seront capitalisés et ajoutés au capital

---

## 2️⃣ LOCATION

### Informations générales

| Champ | Valeur | Notes |
|-------|---------|-------|
| Type de location | Meublé | LMNP + Pinel |
| Surface habitable | 40 m² | T2 |
| Date de début | 01/05/2019 | Après 24 mois de différé |
| Date de fin de projet | 01/05/2037 | 20 ans après début |

### Revenus locatifs

| Champ | Valeur annuelle | Valeur mensuelle | Notes |
|-------|-----------------|------------------|-------|
| Loyer meublé | 12 600 € | 1 050 € | Plafond Pinel respecté |
| Loyer nu | 11 455 € | 954,58 € | -10% vs meublé |
| Charges locataires | 600 € | 50 € | Récupérables |
| Taux de vacance | 5 % | - | Risque locatif |

**Revenus avec vacance** :
- Loyer meublé net : 11 970 € (12 600 × 0,95)
- Loyer nu net : 10 882,25 € (11 455 × 0,95)

### Dépenses annuelles

| Catégorie | Montant | Notes |
|-----------|---------|-------|
| Taxe foncière | 650 € | Stable |
| Charges de copropriété | 800 € | Estimées |
| Assurance propriétaire | 250 € | PNO |
| Frais de gestion | 756 € | 6% des loyers (12 600 × 0,06) |
| Assurance loyers impayés | 378 € | 3% des loyers (12 600 × 0,03) |
| Frais d'entretien | 500 € | Provisions |
| **TOTAL DÉPENSES** | **3 334 €** | Hors crédit |

---

## 3️⃣ FISCALITÉ

### Régimes fiscaux comparés

#### A. Location Nue - Micro-Foncier

| Élément | Calcul | Montant |
|---------|--------|---------|
| Revenus bruts | 10 882 € | Loyer nu avec vacance |
| Abattement micro | 30% | -3 265 € |
| Revenus imposables | 70% | 7 617 € |
| TMI (supposée) | 30% | - |
| Impôts sur le revenu | 7 617 × 0,30 | 2 285 € |
| Prélèvements sociaux | 7 617 × 0,172 | 1 310 € |
| **TOTAL FISCAL** | | **3 595 €** |

#### B. Location Nue - Réel Foncier

| Élément | Calcul | Montant |
|---------|--------|---------|
| Revenus bruts | 10 882 € | Loyer nu avec vacance |
| Charges déductibles | 3 334 € | Dépenses réelles |
| Intérêts d'emprunt | ~1 500 € | Variable selon année |
| Revenus imposables | 10 882 - 4 834 | 6 048 € |
| Impôts sur le revenu | 6 048 × 0,30 | 1 814 € |
| Prélèvements sociaux | 6 048 × 0,172 | 1 040 € |
| **TOTAL FISCAL** | | **2 854 €** |

#### C. LMNP - Micro-BIC

| Élément | Calcul | Montant |
|---------|--------|---------|
| Revenus bruts | 11 970 € | Loyer meublé avec vacance |
| Abattement micro | 50% | -5 985 € |
| Revenus imposables | 50% | 5 985 € |
| TMI (supposée) | 30% | - |
| Impôts sur le revenu | 5 985 × 0,30 | 1 796 € |
| Prélèvements sociaux | 5 985 × 0,172 | 1 029 € |
| **TOTAL FISCAL** | | **2 825 €** |

#### D. LMNP - Réel BIC (OPTIMAL pour ce cas)

| Élément | Calcul | Montant |
|---------|--------|---------|
| Revenus bruts | 11 970 € | Loyer meublé avec vacance |
| Charges déductibles | 3 334 € | Dépenses réelles |
| Intérêts d'emprunt | ~1 500 € | Variable selon année |
| **Amortissements** | ~6 500 € | Point clé du réel BIC |
| Base imposable | 11 970 - 11 334 | **636 €** |
| Impôts sur le revenu | 636 × 0,30 | 191 € |
| Prélèvements sociaux | 636 × 0,172 | 109 € |
| **TOTAL FISCAL** | | **300 €** |

### Réduction d'impôt Pinel

| Année | Taux | Montant annuel |
|-------|------|----------------|
| Années 1-6 | 2% | 2 593 € |
| Années 7-9 | 1% | 1 297 € |
| Année 10-12 | 1% | 1 297 € (si prolongation) |

**Total réductions Pinel (12 ans)** : 23 346 €

---

## 4️⃣ CASH FLOW NET

### Cash Flow Année Type (après différé)

**LMNP Réel BIC** (régime optimal) :

| Élément | Annuel | Mensuel |
|---------|---------|---------|
| **REVENUS** | | |
| Loyer meublé net | 11 970 € | 998 € |
| Charges locataires | 600 € | 50 € |
| Réduction Pinel | 2 593 € | 216 € |
| **Total revenus** | **15 163 €** | **1 264 €** |
| | | |
| **DÉPENSES** | | |
| Mensualité crédit | 8 848 € | 737 € |
| Dépenses courantes | 3 334 € | 278 € |
| Fiscalité | 300 € | 25 € |
| **Total dépenses** | **12 482 €** | **1 040 €** |
| | | |
| **CASH FLOW NET** | **+2 681 €** | **+224 €** |

### Evolution sur 20 ans

**Phase 1 : Différé (Années 1-2)**
- Pas de loyers
- Paiement des intérêts différés
- Cash flow négatif

**Phase 2 : Remboursement + Pinel (Années 3-12)**
- Loyers + Réduction Pinel
- Cash flow positif : ~200-250 €/mois
- Cumul positif grâce à Pinel

**Phase 3 : Sans Pinel (Années 13-20)**
- Loyers sans aide fiscale
- Mensualité crédit identique
- Cash flow neutre à légèrement positif

---

## 5️⃣ RENTABILITÉ

### Rendement brut

```
Rendement brut = (Loyer annuel / Prix d'achat) × 100
Rendement brut = (12 600 / 129 668) × 100 = 9,72%
```

### Rendement net de charges

```
Rendement net = ((Loyers - Charges) / Prix d'achat) × 100
Rendement net = ((11 970 - 3 334) / 129 668) × 100 = 6,66%
```

### TRI (Taux de Rendement Interne)

Paramètres pour le calcul :
- Investissement initial : -130 468 €
- Cash flows annuels : Variable selon phase
- Valeur de revente (année 20) : ~180 000 € (estimation +3%/an)
- Plus-value nette : ~35 000 € (après fiscalité)

**TRI estimé** : ~4,5 à 5,5% (selon hypothèses de revente)

### ROI (Return On Investment)

```
Apport initial : 800 €
Cumul cash flow sur 20 ans : ~40 000 €
Plus-value nette : ~35 000 €
Total gain : 75 000 €

ROI = (75 000 / 800) × 100 = 9 375%
```
*Note : ROI très élevé car apport minimal (effet de levier)*

---

## 6️⃣ REVENTE (Simulation année 20)

### Calcul de la plus-value

| Élément | Montant | Notes |
|---------|---------|-------|
| Prix de revente | 180 000 € | +3%/an sur 20 ans |
| Prix d'acquisition | 129 668 € | Prix d'origine |
| Plus-value brute | 50 332 € | Différence |
| Abattement (20 ans) | 12% IR, 1,65% PS | Selon durée détention |
| Plus-value imposable IR | 44 292 € | 88% de la PV |
| Plus-value imposable PS | 49 502 € | 98,35% de la PV |
| Impôt sur le revenu (19%) | 8 415 € | 44 292 × 0,19 |
| Prélèvements sociaux (17,2%) | 8 514 € | 49 502 × 0,172 |
| **Fiscalité totale** | **16 929 €** | |
| **Plus-value nette** | **33 403 €** | |

### Bilan complet sur 20 ans

| Élément | Montant |
|---------|---------|
| Apport initial | -800 € |
| Cumul cash flows | +40 000 € |
| Plus-value nette | +33 403 € |
| Réductions fiscales Pinel | +23 346 € |
| **GAIN TOTAL NET** | **+95 949 €** |

---

## 7️⃣ SCÉNARIOS DE TEST

### Test 1 : Modification de l'apport

**Action** : Changer l'apport de 800 € à 10 000 €

**Résultat attendu** :
- Emprunt recalculé automatiquement : 120 468 €
- Équation vérifiée : 10 000 + 120 468 = 130 468 ✓
- Mensualité réduite à ~648 €

### Test 2 : Modification de l'emprunt

**Action** : Changer l'emprunt de 129 668 € à 125 000 €

**Résultat attendu** :
- Apport recalculé automatiquement : 5 468 €
- Équation vérifiée : 5 468 + 125 000 = 130 468 ✓
- Mensualité réduite à ~673 €

### Test 3 : Changement de taux d'intérêt

**Action** : Passer le taux de 1,5% à 2,5%

**Résultat attendu** :
- Mensualité augmente à ~819 €
- Intérêts différés augmentent à ~7 479 €
- Cash flow mensuel réduit

### Test 4 : Modification du différé

**Action** : Passer de différé total 24 mois à différé partiel 12 mois

**Résultat attendu** :
- Mensualités pendant différé : ~351 € (capital seul)
- Intérêts différés réduits
- Tableau d'amortissement ajusté

### Test 5 : Comparaison des régimes fiscaux

**Action** : Basculer entre les 4 régimes dans l'onglet Cash Flow

**Résultats attendus** :
- Micro-Foncier : Fiscalité ~3 595 €, Cash flow neutre
- Réel Foncier : Fiscalité ~2 854 €, Cash flow légèrement positif
- Micro-BIC : Fiscalité ~2 825 €, Cash flow légèrement positif
- **Réel BIC : Fiscalité ~300 €, Cash flow fortement positif** ⭐

---

## 8️⃣ UTILISATION DANS LES TESTS AUTOMATISÉS

Ce cas de test est implémenté dans :
- `src/components/__tests__/AcquisitionForm.test.tsx`
- Voir section "Real World Case: Pinel Bagnolet"

### Exécuter les tests

```bash
# Tous les tests
npm test

# Tests d'acquisition uniquement
npm test AcquisitionForm

# Mode interactif
npm run test:ui

# Avec couverture
npm run test:coverage
```

### Valider manuellement dans l'application

1. **Créer un nouveau bien** avec le nom "Pinel Bagnolet"
2. **Onglet Acquisition** : Saisir toutes les valeurs ci-dessus
3. **Vérifier** : Le coût total doit afficher 130 468 €
4. **Modifier l'apport** : Constater le recalcul automatique de l'emprunt
5. **Modifier l'emprunt** : Constater le recalcul automatique de l'apport
6. **Onglet Location** : Saisir les revenus et dépenses
7. **Onglet Cash Flow** : Comparer les 4 régimes fiscaux
8. **Onglet Résumé** : Vérifier les indicateurs clés

---

## 9️⃣ POINTS D'ATTENTION

### ⚠️ Bug corrigé
**Avant** : Modifier le montant emprunté ne recalculait pas l'apport  
**Après** : L'équation Apport + Emprunt = Coût Total est maintenue automatiquement

### ✅ Comportements attendus

1. **Modification des coûts** : Si on change le prix d'achat, le coût total et l'équation doivent se mettre à jour
2. **Différé total vs partiel** : Les mensualités et intérêts différés doivent être différents
3. **Amortissements LMNP** : Le réel BIC doit montrer une fiscalité très réduite grâce aux amortissements
4. **Pinel** : La réduction doit apparaître dans les revenus

---

## 📚 RÉFÉRENCES

- Documentation fiscale : `DOCUMENTATION.md`
- Guide des tests : `GUIDE_TESTS.md`
- Code source : `src/components/AcquisitionForm.tsx`
- Tests : `src/components/__tests__/AcquisitionForm.test.tsx`

---

**Dernière mise à jour** : 6 novembre 2025  
**Version** : 1.0  
**Statut** : ✅ Validé













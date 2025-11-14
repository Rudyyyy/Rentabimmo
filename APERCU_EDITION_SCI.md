# Aperçu visuel de l'édition des SCI

## 🖼️ Interface utilisateur

### 1. Dashboard - Carte SCI avec bouton d'édition

```
┌─────────────────────────────────────────────────────────────┐
│  🏢 SCI Ma SCI Familiale  ⚙️  ← Bouton apparaît au survol  │
│                                          2 bien(s)           │
│─────────────────────────────────────────────────────────────│
│  Description de ma SCI familiale pour investissement        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📦 Bien 1 - Paris 15e                       Inclus  │  │
│  │  Régime: SCI à l'IS                                 ✏️ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📦 Bien 2 - Lyon 6e                         Inclus  │  │
│  │  Régime: SCI à l'IS                                 ✏️ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │          ➕ Ajouter un bien à cette SCI                ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Changements :**
- Le bouton ⚙️ (Settings) apparaît au survol de la carte
- Classe CSS : `opacity-0 group-hover:opacity-100 transition-opacity`
- Au clic : ouvre la modale en mode édition

---

### 2. Modale d'édition de la SCI

```
╔═══════════════════════════════════════════════════════════╗
║  Modifier la SCI                                      ✕  ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  📝 Informations générales                                ║
║  ┌─────────────────────┐  ┌─────────────────────────┐   ║
║  │ Nom: Ma SCI Familia │  │ SIRET: 12345678901234  │   ║
║  └─────────────────────┘  └─────────────────────────┘   ║
║  ┌─────────────────────┐  ┌─────────────────────────┐   ║
║  │ Date: 01/01/2023    │  │ Capital: 1 000 €       │   ║
║  └─────────────────────┘  └─────────────────────────┘   ║
║                                                           ║
║  💰 Paramètres fiscaux (IS)                               ║
║  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐      ║
║  │ T. réduit:  │ │ Seuil:       │ │ T. normal:   │      ║
║  │ 15 %        │ │ 42 500 €     │ │ 25 %         │      ║
║  └─────────────┘ └──────────────┘ └──────────────┘      ║
║                                                           ║
║  📅 Durées d'amortissement                                ║
║  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐      ║
║  │ Immeubles:  │ │ Mobilier:    │ │ Travaux:     │      ║
║  │ 25 ans      │ │ 10 ans       │ │ 10 ans       │      ║
║  └─────────────┘ └──────────────┘ └──────────────┘      ║
║                                                           ║
║  🏠 Type de location                                      ║
║  ┌────────────────────────────────────────────────────┐  ║
║  │ [v] Location nue     [ ] Location meublée         │  ║
║  └────────────────────────────────────────────────────┘  ║
║                                                           ║
║  ━━━━━━━━━━━━━━ NOUVELLE SECTION ━━━━━━━━━━━━━━━━       ║
║                                                           ║
║  💼 Frais de fonctionnement de la SCI                     ║
║  ┌───────────────────────────────────────────────────┐   ║
║  │ ℹ️ Ces frais annuels seront déduits du résultat   │   ║
║  │   fiscal de la SCI. Ils viennent s'ajouter aux    │   ║
║  │   charges déductibles des biens.                  │   ║
║  └───────────────────────────────────────────────────┘   ║
║                                                           ║
║  ┌──────────────────────┐  ┌──────────────────────┐     ║
║  │ Honoraires comptable │  │ Frais juridiques    │     ║
║  │ 1 200 € /an         │  │ 300 € /an           │     ║
║  │ Frais d'expertise   │  │ Avocat, AGM...      │     ║
║  └──────────────────────┘  └──────────────────────┘     ║
║                                                           ║
║  ┌──────────────────────┐  ┌──────────────────────┐     ║
║  │ Frais bancaires     │  │ Assurances SCI      │     ║
║  │ 120 € /an           │  │ 250 € /an           │     ║
║  │ Tenue de compte     │  │ RC, etc.            │     ║
║  └──────────────────────┘  └──────────────────────┘     ║
║                                                           ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ Autres frais                                        │ ║
║  │ 200 € /an                                           │ ║
║  │ Autres charges de fonctionnement déductibles       │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                           ║
║  ┌─────────────────────────────────────────────────────┐ ║
║  │ Total des frais de fonctionnement annuels :         │ ║
║  │                                         2 070 €      │ ║
║  └─────────────────────────────────────────────────────┘ ║
║                                                           ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║                                                           ║
║               [ Annuler ]  [ Mettre à jour ]             ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🎨 Palette de couleurs

### Section "Frais de fonctionnement"
- **Fond d'alerte** : `bg-green-50 border-green-200`
- **Texte alerte** : `text-green-800`
- **Fond résumé** : `bg-gray-50 border-gray-200`
- **Total** : `text-lg font-semibold text-gray-900`

### Bouton Settings sur carte SCI
- **Icône** : `Settings` (lucide-react)
- **Couleur** : `text-blue-600`
- **Fond hover** : `hover:bg-blue-100`
- **Animation** : `opacity-0 group-hover:opacity-100 transition-opacity`

---

## 📱 Responsive Design

### Desktop (> 768px)
- Grille 2 colonnes pour les frais : `grid-cols-1 md:grid-cols-2`
- Champ "Autres frais" sur toute la largeur : `md:col-span-2`

### Mobile (< 768px)
- Tous les champs en colonne unique
- Bouton Settings toujours visible (pas de hover)

---

## 🔄 États interactifs

### 1. Création d'une SCI
```
Titre : "Créer une SCI"
Bouton : "Créer la SCI"
État : editingSCI = null
```

### 2. Édition d'une SCI
```
Titre : "Modifier la SCI"
Bouton : "Mettre à jour"
État : editingSCI = {...données SCI}
Champs : Pré-remplis avec les valeurs existantes
```

### 3. Chargement
```
Bouton : "Enregistrement..."
État : loading = true
Champs : disabled = true
```

---

## 🎯 Flux utilisateur

### Scénario 1 : Création complète
1. Clic sur "Créer une SCI"
2. Remplir nom, SIRET, capital, etc.
3. **Nouveau** : Remplir les frais de fonctionnement
4. Visualiser le total calculé automatiquement
5. Clic sur "Créer la SCI"
6. ✅ SCI créée et dashboard rechargé

### Scénario 2 : Édition des frais
1. Survol de la carte SCI
2. Clic sur ⚙️
3. Scroll jusqu'à "Frais de fonctionnement"
4. Modifier les montants (ex: comptable 1200€ → 1500€)
5. Observer le total se mettre à jour : 2070€ → 2370€
6. Clic sur "Mettre à jour"
7. ✅ SCI mise à jour et dashboard rechargé

### Scénario 3 : Consultation uniquement
1. Survol de la carte SCI
2. Clic sur ⚙️
3. Consulter tous les paramètres
4. Clic sur "Annuler"
5. Modale fermée, aucune modification

---

## 💾 Données sauvegardées

### Structure dans la base de données (scis table)

```json
{
  "id": "uuid-1234-5678",
  "name": "Ma SCI Familiale",
  "siret": "12345678901234",
  "date_creation": "2023-01-01",
  "capital": 1000,
  "tax_parameters": {
    "standardRate": 25,
    "reducedRate": 15,
    "reducedRateThreshold": 42500,
    "buildingAmortizationYears": 25,
    "furnitureAmortizationYears": 10,
    "worksAmortizationYears": 10,
    "rentalType": "unfurnished",
    
    // ⭐ NOUVEAUX CHAMPS DÉTAILLÉS
    "accountingFees": 1200,     // Honoraires comptable
    "legalFees": 300,           // Frais juridiques
    "bankFees": 120,            // Frais bancaires
    "insuranceFees": 250,       // Assurances
    "otherExpenses": 200,       // Autres frais
    
    // TOTAL CALCULÉ
    "operatingExpenses": 2070,  // = somme des 5 champs ci-dessus
    
    "previousDeficits": 0,
    "advancePaymentRate": 0
  }
}
```

---

## 🧪 Tests à effectuer

### Tests fonctionnels
- ✅ Création d'une SCI avec frais de fonctionnement
- ✅ Édition d'une SCI existante
- ✅ Modification des frais uniquement
- ✅ Calcul automatique du total
- ✅ Sauvegarde en base de données
- ✅ Rechargement du dashboard après modification

### Tests visuels
- ✅ Bouton Settings apparaît au survol
- ✅ Couleurs cohérentes (palette bleue pour SCI)
- ✅ Animation de transition fluide
- ✅ Responsive sur mobile
- ✅ Affichage du formatage monétaire (1 200 € au lieu de 1200)

### Tests de validation
- ✅ Nom de SCI obligatoire
- ✅ Capital > 0
- ✅ Frais >= 0 (pas de valeurs négatives)
- ✅ Total calculé correctement

---

## 🚀 Prochaines étapes

1. **Tester en conditions réelles** :
   - Créer une vraie SCI
   - Ajouter des frais réalistes
   - Vérifier l'impact sur le calcul d'IS

2. **Documenter pour les utilisateurs** :
   - Ajouter une info-bulle expliquant à quoi servent ces frais
   - Exemples de montants typiques

3. **Optimisations futures** :
   - Historique des modifications
   - Frais variables par année
   - Import depuis un fichier comptable

---

## 📞 Support

Si vous rencontrez un problème :
1. Vérifiez la console du navigateur (F12)
2. Consultez `GUIDE_EDITION_SCI.md` pour le dépannage
3. Vérifiez que les données sont bien sauvegardées dans Supabase


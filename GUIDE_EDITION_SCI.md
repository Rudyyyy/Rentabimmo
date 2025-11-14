# Guide d'édition des SCI depuis le Dashboard

## 📋 Résumé des fonctionnalités

Ce guide explique comment éditer les détails d'une SCI directement depuis le Dashboard, notamment pour gérer les frais spécifiques de fonctionnement.

## ✨ Nouvelles fonctionnalités

### 1. Édition des SCI depuis le Dashboard

- **Bouton d'édition** : Un bouton avec l'icône ⚙️ (Settings) apparaît au survol sur chaque carte SCI
- **Modale d'édition** : Cliquer sur le bouton ouvre la même modale que pour la création, mais en mode édition
- **Sauvegarde** : Les modifications sont sauvegardées dans la base de données via l'API `updateSCI`

### 2. Frais spécifiques de fonctionnement de la SCI

Une nouvelle section "Frais de fonctionnement de la SCI" a été ajoutée au formulaire avec les champs suivants :

#### Champs disponibles :
- **Honoraires comptable** (€/an) : Frais d'expertise comptable annuels
- **Frais juridiques** (€/an) : Frais d'avocat, publications, AGM...
- **Frais bancaires** (€/an) : Frais de tenue de compte de la SCI
- **Assurances SCI** (€/an) : Responsabilité civile, etc.
- **Autres frais** (€/an) : Autres charges de fonctionnement déductibles

#### Calcul automatique :
- Le total des frais de fonctionnement est affiché en temps réel
- Ces frais sont stockés dans `taxParameters.operatingExpenses` (somme totale)
- Chaque type de frais est également stocké séparément pour permettre leur édition future

#### Impact fiscal :
Ces frais annuels seront **déduits du résultat fiscal de la SCI** lors du calcul de l'IS. Ils viennent s'ajouter aux charges déductibles des biens individuels.

## 🔧 Modifications techniques

### Fichiers modifiés :

#### 1. `src/components/SCIForm.tsx`
- Ajout des états pour les 5 types de frais de fonctionnement
- Nouvelle section UI "Frais de fonctionnement de la SCI"
- Affichage du total calculé automatiquement
- Mise à jour de la logique de sauvegarde pour inclure tous les frais

#### 2. `src/pages/Dashboard.tsx`
- Import de `updateSCI` depuis `lib/api`
- Ajout de l'état `editingSCI` pour gérer la SCI en cours d'édition
- Nouvelle fonction `handleEditSCI` pour ouvrir la modale en mode édition
- Nouvelle fonction `handleCloseSCIForm` pour réinitialiser l'état
- Modification de `handleSCISave` pour gérer création ET mise à jour
- Ajout du bouton Settings sur chaque carte SCI avec effet au survol
- Passage des props `initialData` et `title` au composant SCIForm

#### 3. `src/types/sci.ts` (déjà existant)
Les types suivants étaient déjà définis :
```typescript
interface SCITaxParameters {
  operatingExpenses: number;      // Total des frais
  accountingFees: number;         // Détail : comptabilité
  legalFees: number;              // Détail : juridique
  bankFees: number;               // Détail : bancaire
  insuranceFees: number;          // Détail : assurances
  otherExpenses: number;          // Détail : autres
  // ... autres champs
}
```

#### 4. `src/lib/api.ts` (déjà existant)
La fonction `updateSCI` était déjà implémentée et permet de mettre à jour une SCI existante.

## 📖 Utilisation

### Créer une SCI
1. Cliquer sur "Créer une SCI" dans le Dashboard
2. Remplir tous les champs (informations générales, paramètres fiscaux, durées d'amortissement, type de location)
3. **NOUVEAU** : Renseigner les frais de fonctionnement dans la nouvelle section
4. Cliquer sur "Créer la SCI"

### Éditer une SCI
1. Dans le Dashboard, survoler la carte d'une SCI
2. Cliquer sur le bouton ⚙️ (Settings) qui apparaît
3. Modifier les champs souhaités (y compris les frais de fonctionnement)
4. Cliquer sur "Mettre à jour"

### Visualiser les frais
Le total des frais de fonctionnement annuels est affiché en bas de la section avec un formatage monétaire en euros.

## 🎯 Cas d'usage

### Exemple concret
Vous avez créé une SCI "Ma SCI Familiale" avec 3 biens. Vous venez de recevoir les factures annuelles :
- Expert-comptable : 1 200 €/an
- Frais AGM et publicité : 300 €/an
- Frais bancaires : 120 €/an
- Assurance RC SCI : 250 €/an

**Total : 1 870 € de frais annuels**

Ces frais seront automatiquement déduits du résultat fiscal consolidé de la SCI lors du calcul de l'IS.

## 💡 Bonnes pratiques

1. **Actualiser régulièrement** : Pensez à mettre à jour les frais de fonctionnement chaque année
2. **Détailler les frais** : Utilisez les différents champs pour mieux suivre vos dépenses
3. **Conserver les justificatifs** : Gardez les factures pour justifier ces charges déductibles
4. **Anticiper les évolutions** : Si vous prévoyez une augmentation des frais comptables, mettez à jour vos paramètres

## 🔮 Évolutions futures possibles

- Historique des modifications des frais
- Frais variables par année (au lieu d'un montant fixe)
- Alertes si les frais réels diffèrent significativement des prévisions
- Export des frais pour le comptable
- Frais de gestion locative mutualisés au niveau SCI

## 🐛 Dépannage

### Le bouton d'édition n'apparaît pas
- Vérifiez que vous survolez bien la carte SCI avec la souris
- Le bouton apparaît au survol grâce à la classe CSS `group-hover:opacity-100`

### Les frais ne sont pas pris en compte
- Vérifiez que vous avez bien cliqué sur "Mettre à jour" après modification
- Les frais doivent être stockés dans `taxParameters.operatingExpenses` et les champs détaillés

### Erreur lors de la sauvegarde
- Vérifiez votre connexion internet
- Consultez la console du navigateur pour plus de détails
- Vérifiez que tous les champs obligatoires sont remplis (nom, capital, date de création)

## 📚 Ressources

- Types TypeScript : `src/types/sci.ts`
- API : `src/lib/api.ts` (fonctions `createSCI`, `updateSCI`)
- Composant formulaire : `src/components/SCIForm.tsx`
- Page Dashboard : `src/pages/Dashboard.tsx`


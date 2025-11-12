# Guide du Tour Guidé (Onboarding)

## 📖 Vue d'ensemble

Le tour guidé (onboarding) est une fonctionnalité qui présente l'application aux nouveaux utilisateurs à travers une série d'étapes interactives et pédagogiques.

## 🎯 Objectifs

- **Accueillir** les nouveaux utilisateurs de manière conviviale
- **Expliquer** les fonctionnalités principales de l'application
- **Vulgariser** les concepts d'investissement immobilier
- **Guider** pas à pas dans l'utilisation de l'outil

## 🚀 Fonctionnement

### Déclenchement automatique

Le tour guidé s'affiche automatiquement lors de la première visite de l'utilisateur sur le Dashboard. Une fois terminé ou passé, il ne s'affichera plus, sauf demande explicite.

### Relancement manuel

Un bouton **"Guide de démarrage"** est disponible dans le header du Dashboard pour relancer le tour guidé à tout moment.

## 📚 Les 9 étapes du tour

### 1. Bienvenue 👋
- Présentation générale de l'application
- Objectifs principaux de Rentab'immo
- Points clés : calculs, fiscalité, objectifs

### 2. Ajout de biens 🏠
- Comment créer son premier bien immobilier
- Gestion de plusieurs propriétés
- Possibilité de modification ultérieure

### 3. Acquisition 💰
- Renseigner le prix d'achat
- Frais de notaire et d'agence
- Travaux et rénovations

### 4. Financement 🏦
- Configuration du prêt bancaire
- Taux d'intérêt et durée
- Calcul automatique des mensualités

### 5. Location 🏠
- Définir le loyer mensuel
- Charges et dépenses annuelles
- Prise en compte de la vacance locative

### 6. Fiscalité 📋
- Choix du régime fiscal optimal
- Location nue vs location meublée
- Comparaison automatique des régimes

### 7. Visualisation 📊
- Graphiques de rentabilité
- Évolution du patrimoine
- Dashboard interactif

### 8. Objectifs 🎯
- Définir ses objectifs financiers
- Projection dans le temps
- Optimisation de la stratégie

### 9. Prêt à commencer ✨
- Récapitulatif final
- Encouragement à expérimenter
- Sauvegarde automatique

## 🎨 Caractéristiques techniques

### Design
- Interface moderne et intuitive
- Animations fluides
- Icônes colorées pour chaque étape
- Responsive (adapté mobile et desktop)

### Navigation
- **Suivant/Précédent** : navigation entre les étapes
- **Passer le guide** : fermeture immédiate
- **Fermer (X)** : fermeture avec possibilité de retour
- **Barre de progression** : visualisation de l'avancement

### Persistance
- Utilisation du **localStorage** pour mémoriser la préférence
- Clé : `onboarding_completed`
- Case à cocher "Ne plus afficher ce guide"

## 🔧 Implémentation technique

### Composant principal
```typescript
src/components/OnboardingTour.tsx
```

### Intégration
Le composant est intégré dans le Dashboard :
```typescript
{showOnboarding && (
  <OnboardingTour onClose={() => setShowOnboarding(false)} />
)}
```

### Props
- `onClose`: Callback appelé à la fermeture du tour

### État local
- `currentStep`: Étape actuelle (0 à 8)
- `dontShowAgain`: Préférence utilisateur

## 💡 Conseils d'utilisation

### Pour les développeurs
- Le contenu des étapes est facilement modifiable dans l'array `steps`
- Ajoutez ou supprimez des étapes selon les besoins
- Personnalisez les icônes et couleurs pour chaque étape

### Pour les utilisateurs
- Prenez le temps de lire chaque étape
- Utilisez les "Points clés" pour retenir l'essentiel
- Relancez le guide si besoin via le bouton du header

## 🔄 Évolutions futures possibles

1. **Tour guidé contextuel** : afficher des tooltips sur les vrais éléments de l'interface
2. **Personnalisation** : adapter le contenu selon le profil utilisateur
3. **Vidéos** : intégrer des tutoriels vidéo
4. **Multi-langues** : traduire le guide en plusieurs langues
5. **Analytics** : suivre les étapes où les utilisateurs abandonnent

## 📝 Maintenance

### Modifier le contenu
Les étapes sont définies dans l'array `steps` du composant `OnboardingTour.tsx`. Chaque étape contient :
```typescript
{
  title: string;        // Titre de l'étape
  description: string;  // Description détaillée
  icon: ReactNode;      // Icône illustrative
  tips?: string[];      // Points clés (optionnel)
}
```

### Réinitialiser pour tous les utilisateurs
Pour forcer l'affichage du tour pour tous les utilisateurs, il suffit de changer la clé localStorage :
```typescript
// Remplacer 'onboarding_completed' par 'onboarding_completed_v2'
```

## 🎯 Métriques de succès

- **Taux de complétion** : pourcentage d'utilisateurs qui vont jusqu'au bout
- **Temps moyen** : durée moyenne du parcours
- **Réactivation** : nombre de fois où les utilisateurs relancent le guide
- **Taux de "Ne plus afficher"** : indicateur de pertinence

---

Créé pour améliorer l'expérience utilisateur et faciliter la prise en main de Rentab'immo ! 🚀


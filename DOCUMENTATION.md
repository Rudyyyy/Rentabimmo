# Documentation Complète - Rentab'immo

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture technique](#architecture-technique)
3. [Installation et configuration](#installation-et-configuration)
4. [Structure du projet](#structure-du-projet)
5. [Fonctionnalités principales](#fonctionnalités-principales)
6. [Composants et modules](#composants-et-modules)
7. [Calculs financiers](#calculs-financiers)
8. [Gestion des données](#gestion-des-données)
9. [Interface utilisateur](#interface-utilisateur)
10. [API et services](#api-et-services)
11. [Guide d'utilisation](#guide-dutilisation)
12. [Développement](#développement)

---

## Vue d'ensemble

**Rentab'immo** est une application web moderne de gestion et d'analyse d'investissements immobiliers. Elle permet aux investisseurs de :

- Gérer plusieurs biens immobiliers
- Calculer la rentabilité de leurs investissements
- Analyser les aspects fiscaux (micro-foncier, réel-foncier, LMNP)
- Simuler des scénarios de revente
- Visualiser les projections financières
- Importer des tableaux d'amortissement depuis des PDF

### Objectifs de l'application

L'application vise à fournir aux investisseurs immobiliers un outil complet pour :
- Évaluer la rentabilité d'un investissement avant achat
- Optimiser la fiscalité selon différents régimes
- Suivre l'évolution de leur portefeuille immobilier
- Prendre des décisions éclairées basées sur des calculs précis

---

## Architecture technique

### Stack technologique

#### Frontend
- **React 18.3.1** - Bibliothèque UI
- **TypeScript** - Typage statique
- **Vite 5.4.2** - Build tool et dev server
- **Tailwind CSS 3.4.1** - Framework CSS utilitaire
- **React Router 6.22.2** - Routage côté client
- **React Hook Form 7.51.0** - Gestion de formulaires
- **Chart.js 4.4.9** / **React-Chartjs-2 5.3.0** - Visualisation de données
- **Lucide React 0.344.0** - Bibliothèque d'icônes

#### Backend & Base de données
- **Supabase** - Backend as a Service (BaaS)
  - PostgreSQL - Base de données relationnelle
  - Authentication - Gestion des utilisateurs
  - Row Level Security (RLS) - Sécurité au niveau des lignes

#### Services externes
- **OpenAI API** - Analyse intelligente d'investissements (optionnel)
- **Mistral AI** - Alternative pour l'analyse IA (optionnel)

#### Outils de développement
- **ESLint** - Linter JavaScript/TypeScript
- **TypeScript ESLint** - Règles TypeScript
- **PostCSS** / **Autoprefixer** - Traitement CSS

### Architecture de l'application

```
┌─────────────────────────────────────────┐
│         React Application               │
├─────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐   │
│  │   Contexts   │  │  Components  │   │
│  │  - Auth      │  │  - Forms     │   │
│  │  - Investment│  │  - Displays  │   │
│  └──────────────┘  └──────────────┘   │
├─────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐   │
│  │   Services   │  │    Utils     │   │
│  │  - API       │  │  - Calc      │   │
│  │  - Analysis  │  │  - Format    │   │
│  └──────────────┘  └──────────────┘   │
├─────────────────────────────────────────┤
│         Supabase Client                 │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐ │
│  │      Supabase Backend             │ │
│  │  - PostgreSQL Database            │ │
│  │  - Authentication                 │ │
│  │  - Row Level Security             │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Installation et configuration

### Prérequis

- **Node.js** >= 18.x
- **npm** ou **yarn**
- Compte **Supabase** (pour la base de données)

### Installation

1. **Cloner le repository**
```bash
git clone https://github.com/Rudyyyy/Rentabimmo.git
cd rentabimmo
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**

Créer un fichier `.env` à la racine du projet :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anon_supabase
VITE_OPENAI_API_KEY=votre_clé_openai (optionnel)
VITE_MISTRAL_API_KEY=votre_clé_mistral (optionnel)
```

4. **Configurer Supabase**

- Créer un projet sur [Supabase](https://supabase.com)
- Exécuter la migration SQL dans `supabase/migrations/`
- Configurer les politiques RLS (Row Level Security)

5. **Lancer l'application en développement**

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### Scripts disponibles

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Compile l'application pour la production
- `npm run preview` - Prévisualise la build de production
- `npm run lint` - Exécute le linter ESLint

---

## Structure du projet

```
rentabimmo/
├── public/                 # Assets statiques
│   ├── logo.png
│   ├── background-pattern.png
│   └── ...
├── src/
│   ├── components/         # Composants React
│   │   ├── PropertyForm.tsx        # Formulaire principal de bien
│   │   ├── AcquisitionForm.tsx    # Formulaire d'acquisition
│   │   ├── ExpensesForm.tsx       # Formulaire de charges
│   │   ├── RevenuesForm.tsx        # Formulaire de revenus
│   │   ├── TaxForm.tsx             # Formulaire fiscal
│   │   ├── ResultsDisplay.tsx     # Affichage des résultats
│   │   ├── CashFlowDisplay.tsx    # Affichage du cash flow
│   │   ├── BalanceDisplay.tsx      # Affichage du bilan
│   │   ├── SaleDisplay.tsx         # Affichage de la revente
│   │   ├── AmortizationTable.tsx  # Tableau d'amortissement
│   │   ├── Dashboard.tsx           # Tableau de bord
│   │   └── ...
│   ├── pages/              # Pages de l'application
│   │   ├── Login.tsx              # Page de connexion
│   │   ├── Dashboard.tsx          # Tableau de bord principal
│   │   ├── PropertyForm.tsx       # Page de formulaire de bien
│   │   ├── GlobalProfitability.tsx # Page de rentabilité globale
│   │   └── Analysis.tsx           # Page d'analyse IA
│   ├── contexts/           # Contextes React
│   │   ├── AuthContext.tsx        # Contexte d'authentification
│   │   └── InvestmentContext.tsx  # Contexte d'investissement
│   ├── lib/                # Bibliothèques et clients
│   │   ├── supabase.ts            # Client Supabase
│   │   └── api.ts                 # Fonctions API
│   ├── services/           # Services métier
│   │   ├── analysis.ts            # Service d'analyse IA
│   │   ├── openai.ts              # Service OpenAI
│   │   └── mistral.ts             # Service Mistral
│   ├── types/              # Définitions TypeScript
│   │   ├── investment.ts          # Types d'investissement
│   │   ├── tax.ts                 # Types fiscaux
│   │   ├── amortization.ts        # Types d'amortissement
│   │   └── supabase.ts            # Types Supabase
│   ├── utils/              # Utilitaires
│   │   ├── calculations.ts         # Calculs financiers
│   │   ├── taxCalculations.ts     # Calculs fiscaux
│   │   ├── capitalGainCalculations.ts # Calculs de plus-value
│   │   ├── irrCalculations.ts     # Calculs TRI/IRR
│   │   ├── financialCalculations.ts # Calculs financiers avancés
│   │   ├── formatters.ts          # Formatage de données
│   │   ├── pdfExtractor.ts        # Extraction PDF
│   │   ├── pdfWorkerSetup.ts      # Configuration worker PDF
│   │   └── investmentFactory.ts   # Factory d'investissement
│   ├── App.tsx             # Composant racine
│   ├── main.tsx            # Point d'entrée
│   └── index.css           # Styles globaux
├── supabase/
│   └── migrations/         # Migrations SQL
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## Fonctionnalités principales

### 1. Authentification

- **Inscription** : Création de compte avec email et mot de passe
- **Connexion** : Authentification sécurisée via Supabase Auth
- **Déconnexion** : Gestion de la session utilisateur
- **Protection des routes** : Routes protégées nécessitant une authentification

**Fichiers concernés** :
- `src/pages/Login.tsx`
- `src/contexts/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`

### 2. Gestion des biens immobiliers

#### Création et édition
- Formulaire complet pour créer un nouveau bien
- Formulaire rapide depuis le dashboard
- Édition des biens existants
- Suppression de biens

#### Données gérées
- **Informations générales** : Nom, description, dates
- **Acquisition** : Prix, frais (notaire, agence, banque), travaux
- **Financement** : Apport, emprunt, taux, durée, différé
- **Charges** : Taxe foncière, charges de copropriété, assurances, etc.
- **Revenus** : Loyer nu, loyer meublé, charges locatives
- **Fiscalité** : Régime fiscal, paramètres d'imposition
- **Revente** : Date, estimation, frais de vente

**Fichiers concernés** :
- `src/components/PropertyForm.tsx`
- `src/components/AcquisitionForm.tsx`
- `src/components/ExpensesForm.tsx`
- `src/components/RevenuesForm.tsx`
- `src/components/TaxForm.tsx`
- `src/components/SaleDisplay.tsx`

### 3. Calculs financiers

#### Métriques calculées
- **Rendement brut** : (Loyers annuels / Prix d'achat) × 100
- **Rendement net** : (Revenus nets / Prix d'achat) × 100
- **Cash flow mensuel** : Revenus - Charges - Mensualité
- **Cash flow annuel** : Cumul des cash flows mensuels
- **ROI (Return on Investment)** : Retour sur investissement
- **TRI (Taux de Rendement Interne)** : Calcul du taux de rendement interne
- **IRR** : Internal Rate of Return

#### Tableau d'amortissement
- Génération automatique du tableau d'amortissement
- Support des différés (partiel et total)
- Calcul des intérêts différés
- Import depuis PDF bancaire

**Fichiers concernés** :
- `src/utils/calculations.ts`
- `src/utils/financialCalculations.ts`
- `src/utils/irrCalculations.ts`
- `src/components/AmortizationTable.tsx`
- `src/components/PDFAmortizationImporter.tsx`

### 4. Calculs fiscaux

#### Régimes fiscaux supportés

1. **Location nue - Micro-foncier**
   - Abattement forfaitaire de 30%
   - Plafond de 15 000€ de revenus fonciers

2. **Location nue - Frais réels**
   - Déduction des charges réelles
   - Déficit foncier reportable (plafond 10 700€/an)

3. **LMNP - Micro-BIC**
   - Abattement forfaitaire de 50% ou 71%
   - Plafond de 72 600€ de revenus

4. **LMNP - Frais réels**
   - Amortissement du bien et du mobilier
   - Déficit reportable
   - Gestion des amortissements dérogatoires

#### Calculs effectués
- Revenus imposables
- Impôt sur le revenu
- Prélèvements sociaux (17,2%)
- Revenu net après impôt
- Déficit reportable
- Amortissements (bâtiment, mobilier, travaux)

**Fichiers concernés** :
- `src/utils/taxCalculations.ts`
- `src/components/TaxForm.tsx`
- `src/components/TaxDisplay.tsx`

### 5. Calculs de plus-value

#### Calculs de revente
- Plus-value brute
- Abattements selon la durée de détention
- Impôt sur la plus-value (IR)
- Prélèvements sociaux
- Plus-value nette

#### Cas spéciaux
- **LMP (Location Meublée Professionnelle)** : Traitement particulier
- **Amortissements réintégrés** : Pour les régimes LMNP
- **Plus-value à court terme** : < 2 ans pour LMP
- **Plus-value à long terme** : > 2 ans

**Fichiers concernés** :
- `src/utils/capitalGainCalculations.ts`
- `src/components/SaleDisplay.tsx`
- `src/components/SaleEstimation.tsx`

### 6. Projections financières

#### Projections annuelles
- Projection des revenus avec augmentation annuelle
- Projection des charges avec augmentation annuelle
- Projection du cash flow
- Projection de l'imposition
- Projection de la valeur de revente

#### Paramètres de projection
- Taux d'augmentation des loyers
- Taux d'augmentation des charges
- Taux de vacance locative
- Taux de réévaluation du bien

**Fichiers concernés** :
- `src/utils/calculations.ts`
- `src/components/LocationTables.tsx`
- `src/components/AnnualSummaryTable.tsx`

### 7. Dashboard

#### Visualisations
- Graphique de gain total cumulé par bien
- Graphique empilé par bien
- Courbe de total global
- Tableau de revente avec cumul

#### Fonctionnalités
- Affichage/masquage de biens
- Réorganisation par drag & drop
- Objectif de gain total
- Calculs en temps réel

**Fichiers concernés** :
- `src/pages/Dashboard.tsx`
- `src/components/TotalGainGoal.tsx`

### 8. Analyse IA (optionnel)

#### Fonctionnalités
- Analyse automatique de l'investissement
- Suggestions d'optimisation
- Détection de points d'attention
- Chat interactif avec l'IA

**Fichiers concernés** :
- `src/pages/Analysis.tsx`
- `src/components/AnalysisChat.tsx`
- `src/services/analysis.ts`
- `src/services/openai.ts`
- `src/services/mistral.ts`

### 9. Import PDF

#### Extraction de tableau d'amortissement
- Import depuis PDF bancaire
- Extraction automatique des données
- Validation et correction manuelle
- Sauvegarde dans l'investissement

**Fichiers concernés** :
- `src/components/PDFAmortizationImporter.tsx`
- `src/utils/pdfExtractor.ts`
- `src/utils/pdfWorkerSetup.ts`

---

## Composants et modules

### Composants principaux

#### PropertyForm
**Fichier** : `src/components/PropertyForm.tsx`

Composant principal pour la gestion d'un bien immobilier. Il orchestre tous les sous-composants et gère l'état global de l'investissement.

**Responsabilités** :
- Gestion de l'état de l'investissement
- Navigation entre les sections
- Sauvegarde dans Supabase
- Calculs en temps réel
- Affichage des résultats

**Sections** :
1. Acquisition
2. Location (charges et revenus)
3. Imposition
4. Rentabilité
5. Bilan

#### AcquisitionForm
**Fichier** : `src/components/AcquisitionForm.tsx`

Formulaire pour saisir les données d'acquisition du bien.

**Champs** :
- Prix d'achat
- Frais de notaire
- Frais d'agence
- Frais bancaires
- Frais de garantie
- Diagnostics obligatoires
- Coûts de rénovation
- Dates (début projet, fin projet, début emprunt)

#### ExpensesForm
**Fichier** : `src/components/ExpensesForm.tsx`

Formulaire pour gérer les charges annuelles et leurs projections.

**Fonctionnalités** :
- Saisie des charges par année
- Projection automatique avec taux d'augmentation
- Gestion de la vacance locative
- Calcul des charges totales

**Charges gérées** :
- Taxe foncière
- Charges de copropriété
- Assurance propriétaire
- Frais de gestion
- Assurance impayés
- Réparations
- Autres charges déductibles/non déductibles

#### RevenuesForm
**Fichier** : `src/components/RevenuesForm.tsx`

Formulaire pour gérer les revenus locatifs.

**Champs** :
- Loyer nu
- Loyer meublé
- Charges locatives
- Aides fiscales
- Taux d'augmentation annuel
- Taux d'occupation

#### TaxForm
**Fichier** : `src/components/TaxForm.tsx`

Formulaire pour configurer la fiscalité.

**Options** :
- Type de taxation (direct, LMNP, SCI)
- Méthode (réel, micro)
- Régime sélectionné
- Taux d'imposition
- Paramètres d'amortissement (LMNP)
- Déficit reporté

#### ResultsDisplay
**Fichier** : `src/components/ResultsDisplay.tsx`

Affichage des résultats de rentabilité.

**Métriques affichées** :
- Rendement brut
- Rendement net
- Cash flow mensuel/annuel
- ROI
- TRI/IRR

#### CashFlowDisplay
**Fichier** : `src/components/CashFlowDisplay.tsx`

Visualisation du cash flow sur plusieurs années.

**Fonctionnalités** :
- Graphique du cash flow annuel
- Tableau détaillé par année
- Cumul du cash flow

#### BalanceDisplay
**Fichier** : `src/components/BalanceDisplay.tsx`

Affichage du bilan de l'investissement.

**Informations** :
- Apport initial
- Emprunt
- Cash flow cumulé
- Solde de revente
- Gain total

#### SaleDisplay
**Fichier** : `src/components/SaleDisplay.tsx`

Simulation de revente du bien.

**Calculs** :
- Estimation de la valeur de revente
- Solde après remboursement
- Plus-value
- Impôt sur la plus-value
- Gain net de revente

#### AmortizationTable
**Fichier** : `src/components/AmortizationTable.tsx`

Affichage et gestion du tableau d'amortissement.

**Fonctionnalités** :
- Affichage du tableau complet
- Filtrage par année
- Export des données
- Import depuis PDF

### Composants de navigation

#### HierarchicalNavigation
**Fichier** : `src/components/HierarchicalNavigation.tsx`

Navigation hiérarchique avec fil d'Ariane.

#### MobileNavigation
**Fichier** : `src/components/MobileNavigation.tsx`

Navigation adaptée pour mobile.

#### SidebarContent
**Fichier** : `src/components/SidebarContent.tsx`

Contenu de la barre latérale avec navigation par onglets.

### Composants utilitaires

#### Notification
**Fichier** : `src/components/Notification.tsx`

Système de notifications pour les actions utilisateur.

#### QuickPropertyForm
**Fichier** : `src/components/QuickPropertyForm.tsx`

Formulaire rapide pour créer un bien depuis le dashboard.

---

## Calculs financiers

### Calculs de base

#### Mensualité d'emprunt
```typescript
function calculateMonthlyPayment(
  loanAmount: number,
  annualRate: number,
  years: number,
  deferralType: DeferralType,
  deferredPeriod: number
): number
```

**Formule** :
- Sans différé : `M = C × (r × (1 + r)^n) / ((1 + r)^n - 1)`
- Avec différé : Ajustement de la durée et du capital

#### Tableau d'amortissement
```typescript
function generateAmortizationSchedule(
  loanAmount: number,
  annualRate: number,
  years: number,
  deferralType: DeferralType,
  deferredPeriod: number,
  startDate: string
): { schedule: AmortizationRow[]; deferredInterest: number }
```

**Types de différé** :
- **Aucun** : Paiement normal dès le début
- **Partiel** : Paiement des intérêts uniquement pendant le différé
- **Total** : Aucun paiement pendant le différé (intérêts capitalisés)

### Calculs de rentabilité

#### Rendement brut
```
Rendement brut = (Loyers annuels / Prix d'achat) × 100
```

#### Rendement net
```
Rendement net = (Revenus nets après impôt / Prix d'achat) × 100
```

#### Cash flow
```
Cash flow = Revenus - Charges - Mensualité - Impôts
```

#### ROI (Return on Investment)
```
ROI = (Gain total / Apport initial) × 100
```

### Calculs TRI/IRR

#### Taux de Rendement Interne
```typescript
function calculateIRR(cashFlows: number[]): number
```

**Méthode** : Méthode de Newton-Raphson pour trouver le taux qui annule la VAN.

**Formule VAN** :
```
VAN = Σ(CFt / (1 + r)^t) - Investissement initial
```

### Calculs fiscaux

Voir section [Calculs fiscaux](#4-calculs-fiscaux) pour les détails.

### Calculs de plus-value

Voir section [Calculs de plus-value](#5-calculs-de-plus-value) pour les détails.

---

## Gestion des données

### Structure de données

#### Investment
**Fichier** : `src/types/investment.ts`

Interface principale représentant un investissement immobilier.

**Propriétés principales** :
- `id` : Identifiant unique
- `name` : Nom du bien
- `purchasePrice` : Prix d'achat
- `loanAmount` : Montant emprunté
- `expenses` : Tableau des charges annuelles
- `expenseProjection` : Paramètres de projection
- `taxResults` : Résultats fiscaux par régime
- `amortizationSchedule` : Tableau d'amortissement

### Stockage Supabase

#### Table `properties`
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  investment_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Row Level Security (RLS)
```sql
-- Les utilisateurs ne peuvent voir que leurs propres biens
CREATE POLICY "Users can view own properties"
  ON properties FOR SELECT
  USING (auth.uid() = user_id);

-- Les utilisateurs ne peuvent créer que leurs propres biens
CREATE POLICY "Users can insert own properties"
  ON properties FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Les utilisateurs ne peuvent modifier que leurs propres biens
CREATE POLICY "Users can update own properties"
  ON properties FOR UPDATE
  USING (auth.uid() = user_id);

-- Les utilisateurs ne peuvent supprimer que leurs propres biens
CREATE POLICY "Users can delete own properties"
  ON properties FOR DELETE
  USING (auth.uid() = user_id);
```

### API Supabase

#### Sauvegarde d'un bien
```typescript
const { data, error } = await supabase
  .from('properties')
  .upsert({
    id: propertyId,
    user_id: user.id,
    name: investment.name,
    investment_data: investment
  });
```

#### Chargement des biens
```typescript
const { data, error } = await supabase
  .from('properties')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false });
```

---

## Interface utilisateur

### Design System

#### Couleurs
- **Primaire** : Bleu (`blue-600`, `blue-700`)
- **Succès** : Vert (`green-600`)
- **Erreur** : Rouge (`red-600`)
- **Avertissement** : Jaune (`yellow-600`)
- **Info** : Indigo (`indigo-600`)

#### Typographie
- **Titres** : `font-bold`, `text-2xl` / `text-xl`
- **Sous-titres** : `font-semibold`, `text-lg`
- **Corps** : `text-base`, `text-sm`
- **Labels** : `text-sm`, `text-gray-600`

#### Composants UI
- **Boutons** : `bg-blue-600 text-white rounded-lg px-4 py-2`
- **Inputs** : `border border-gray-300 rounded-md px-3 py-2`
- **Cards** : `bg-white rounded-lg shadow p-6`
- **Tables** : `min-w-full divide-y divide-gray-200`

### Responsive Design

#### Breakpoints Tailwind
- `sm` : 640px
- `md` : 768px
- `lg` : 1024px
- `xl` : 1280px

#### Adaptations mobiles
- Navigation mobile avec menu hamburger
- Formulaires adaptés aux petits écrans
- Tableaux avec défilement horizontal
- Graphiques responsives

### Accessibilité

- Labels associés aux inputs
- Contraste de couleurs respecté
- Navigation au clavier
- Messages d'erreur clairs

---

## API et services

### Service Supabase

**Fichier** : `src/lib/supabase.ts`

Client Supabase configuré avec :
- Auto-refresh des tokens
- Persistance de session
- Logging des requêtes (dev)

### Service API

**Fichier** : `src/lib/api.ts`

Fonctions utilitaires pour interagir avec Supabase :
- `saveAmortizationSchedule()` : Sauvegarde du tableau d'amortissement
- `getAmortizationSchedule()` : Récupération du tableau d'amortissement
- `saveTargetSaleYear()` : Sauvegarde de l'année de revente
- `saveTargetGain()` : Sauvegarde de l'objectif de gain
- `saveTargetCashflow()` : Sauvegarde de l'objectif de cashflow

### Service d'analyse IA

**Fichier** : `src/services/analysis.ts`

Service pour analyser un investissement avec l'IA.

**Fonctionnalités** :
- Préparation des données d'investissement
- Appel à l'API IA (OpenAI ou Mistral)
- Formatage de la réponse
- Gestion des erreurs

### Service OpenAI

**Fichier** : `src/services/openai.ts`

Intégration avec l'API OpenAI pour l'analyse d'investissements.

### Service Mistral

**Fichier** : `src/services/mistral.ts`

Intégration avec l'API Mistral AI (alternative à OpenAI).

---

## Guide d'utilisation

### Première utilisation

1. **Créer un compte**
   - Aller sur la page de connexion
   - Cliquer sur "S'inscrire"
   - Entrer email et mot de passe
   - Valider

2. **Créer un premier bien**
   - Depuis le dashboard, cliquer sur le bouton "+"
   - Remplir le formulaire rapide ou détaillé
   - Sauvegarder

3. **Compléter les informations**
   - Section Acquisition : Prix, frais, travaux
   - Section Location : Charges et revenus
   - Section Imposition : Régime fiscal
   - Section Rentabilité : Voir les résultats
   - Section Bilan : Vue d'ensemble

### Workflow typique

1. **Création du bien**
   - Nom et description
   - Dates de début et fin de projet

2. **Acquisition**
   - Prix d'achat
   - Frais (notaire, agence, banque)
   - Coûts de rénovation
   - Financement (apport, emprunt)

3. **Location**
   - Charges annuelles
   - Revenus locatifs
   - Projections (taux d'augmentation)

4. **Fiscalité**
   - Choix du régime
   - Paramètres d'imposition
   - Amortissements (si LMNP)

5. **Analyse**
   - Consultation des résultats
   - Analyse de rentabilité
   - Simulation de revente

### Conseils d'utilisation

#### Pour une analyse précise
- Renseigner tous les frais d'acquisition
- Inclure tous les coûts de rénovation
- Estimer les charges au plus juste
- Configurer correctement le régime fiscal

#### Pour optimiser la fiscalité
- Comparer les différents régimes
- Utiliser les amortissements (LMNP)
- Optimiser le déficit foncier
- Planifier la revente

#### Pour le suivi
- Mettre à jour régulièrement les données
- Utiliser le dashboard pour la vue d'ensemble
- Définir des objectifs de gain
- Suivre l'évolution du cash flow

---

## Développement

### Architecture des composants

#### Pattern utilisé
- **Composants fonctionnels** avec hooks React
- **Context API** pour l'état global
- **React Hook Form** pour les formulaires
- **Composition** plutôt qu'héritage

#### Gestion d'état
- **Contexts** : AuthContext, InvestmentContext
- **Local state** : useState pour l'état local
- **Supabase** : Source de vérité pour la persistance

### Bonnes pratiques

#### Code
- **TypeScript strict** : Typage complet
- **ESLint** : Respect des règles de code
- **Composants réutilisables** : DRY principle
- **Séparation des responsabilités** : Utils, Services, Components

#### Performance
- **Lazy loading** : Chargement à la demande
- **Memoization** : useMemo, useCallback
- **Code splitting** : Vite automatique
- **Optimisation des re-renders** : React.memo si nécessaire

#### Tests (à implémenter)
- Tests unitaires des calculs
- Tests d'intégration des composants
- Tests E2E des workflows

### Améliorations futures

#### Fonctionnalités prévues
- [ ] Assistant IA réactivé (chatbot)
- [ ] Export PDF des rapports
- [ ] Export Excel des données
- [ ] Comparaison de scénarios
- [ ] Notifications et rappels
- [ ] Mode hors ligne
- [ ] Application mobile

#### Optimisations techniques
- [ ] Cache des calculs
- [ ] Optimisation des requêtes Supabase
- [ ] Progressive Web App (PWA)
- [ ] Service Worker pour le cache
- [ ] Tests automatisés

### Contribution

#### Workflow
1. Fork le repository
2. Créer une branche feature
3. Développer la fonctionnalité
4. Tester
5. Créer une Pull Request

#### Standards de code
- Respecter le style ESLint
- Documenter le code complexe
- Ajouter des types TypeScript
- Tester les nouvelles fonctionnalités

---

## Conclusion

Cette documentation couvre l'ensemble des aspects de l'application **Rentab'immo**. Pour toute question ou suggestion d'amélioration, n'hésitez pas à ouvrir une issue sur le repository GitHub.

**Version de la documentation** : 1.0  
**Dernière mise à jour** : 2024


# Rentab'immo

Une application web moderne développée avec **React**, **Vite**, **Tailwind CSS** et **Supabase**.  
Ce projet permet de suivre ses investissements immobiliers et calculer la rentabilité des prochains investissements.

## 📚 Documentation

- **[Documentation complète](./DOCUMENTATION.md)** - Documentation détaillée de l'application
- **[Guide de démarrage rapide](./GUIDE_DEMARRAGE.md)** - Guide pour démarrer rapidement
- **[Guide du tour guidé](./GUIDE_ONBOARDING.md)** - Documentation du système d'onboarding

## 🚀 Tech Stack

- ⚛️ React 18.3.1
- ⚡ Vite 5.4.2
- 🎨 Tailwind CSS 3.4.1
- 🧭 React Router 6.22.2
- 📝 React Hook Form 7.51.0
- 📊 Chart.js 4.4.9 / React-Chartjs-2 5.3.0
- 🎯 Lucide React (icônes)
- 🛠 Supabase (PostgreSQL + Auth + RLS)
- 📄 PDF.js (extraction de tableaux d'amortissement)

## 🧪 Fonctionnalités principales

- ✅ Authentification utilisateur sécurisée via Supabase
- ✅ **Tour guidé interactif** pour les nouveaux utilisateurs
- ✅ Gestion de plusieurs biens immobiliers
- ✅ Calculs de rentabilité (rendement brut, net, cash flow, ROI, TRI)
- ✅ Calculs fiscaux (micro-foncier, réel-foncier, LMNP)
- ✅ Calculs de plus-value de revente
- ✅ Tableaux d'amortissement avec support des différés
- ✅ Import de tableaux d'amortissement depuis PDF
- ✅ Projections financières multi-années
- ✅ Dashboard avec visualisations graphiques
- ✅ Analyse IA des investissements (optionnel)
- ✅ Visualisation de données avec Chart.js
- ✅ Sécurité via Row Level Security (RLS)

## 🔧 Installation locale

1. **Cloner le repository** :

```bash
git clone https://github.com/Rudyyyy/Rentabimmo.git
cd rentabimmo
```

2. **Installer les dépendances** :

```bash
npm install
```

3. **Configurer Supabase** :

   - Créer un compte sur [Supabase](https://supabase.com)
   - Créer un nouveau projet
   - Exécuter la migration SQL dans `supabase/migrations/`
   - Configurer les politiques RLS

4. **Configurer les variables d'environnement** :

   Créer un fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_clé_anon_supabase
```

5. **Lancer l'application** :

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

> 📖 Pour plus de détails, consultez le [Guide de démarrage rapide](./GUIDE_DEMARRAGE.md)

## 📖 Scripts disponibles

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Compile l'application pour la production
- `npm run preview` - Prévisualise la build de production
- `npm run lint` - Exécute le linter ESLint

## 🎯 Utilisation

1. **Créer un compte** : Inscription avec email et mot de passe
2. **Créer un bien** : Utiliser le formulaire rapide ou détaillé
3. **Renseigner les informations** :
   - Acquisition (prix, frais, travaux)
   - Location (charges et revenus)
   - Imposition (régime fiscal)
4. **Consulter les résultats** : Rentabilité, cash flow, bilan

> 📖 Pour plus de détails, consultez la [Documentation complète](./DOCUMENTATION.md)

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

Ce projet est sous licence MIT.

# Guide de Démarrage Rapide - Rentab'immo

## 🚀 Démarrage en 5 minutes

### 1. Installation

```bash
# Cloner le repository
git clone https://github.com/Rudyyyy/Rentabimmo.git
cd rentabimmo

# Installer les dépendances
npm install
```

### 2. Configuration Supabase

1. Créer un compte sur [Supabase](https://supabase.com)
2. Créer un nouveau projet
3. Exécuter la migration SQL :
   - Aller dans l'éditeur SQL
   - Copier le contenu de `supabase/migrations/20250221084222_fragrant_temple.sql`
   - Exécuter la migration

4. Configurer les politiques RLS (Row Level Security) :
   - Aller dans Authentication > Policies
   - Activer RLS sur la table `properties`
   - Les politiques sont créées automatiquement par la migration

### 3. Variables d'environnement

Créer un fichier `.env` à la racine :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_clé_anon
```

**Où trouver ces valeurs** :
- Aller dans Settings > API de votre projet Supabase
- `VITE_SUPABASE_URL` = Project URL
- `VITE_SUPABASE_ANON_KEY` = anon public key

### 4. Lancer l'application

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173`

### 5. Créer un compte

1. Aller sur `http://localhost:5173`
2. Cliquer sur "S'inscrire"
3. Entrer email et mot de passe
4. Valider

### 6. Créer votre premier bien

1. Depuis le dashboard, cliquer sur le bouton "+" (en bas à droite)
2. Remplir les informations de base :
   - Nom du bien
   - Prix d'achat
   - Apport
   - Montant emprunté
   - Taux d'intérêt
   - Durée de l'emprunt
3. Cliquer sur "Sauvegarder"

### 7. Compléter les informations

Naviguer dans les sections du formulaire :

1. **Acquisition** : Frais (notaire, agence, banque), travaux
2. **Location** : Charges et revenus locatifs
3. **Imposition** : Choisir le régime fiscal
4. **Rentabilité** : Consulter les résultats
5. **Bilan** : Vue d'ensemble

## 📋 Checklist de configuration

- [ ] Node.js installé (>= 18.x)
- [ ] Compte Supabase créé
- [ ] Projet Supabase créé
- [ ] Migration SQL exécutée
- [ ] RLS activé sur la table `properties`
- [ ] Fichier `.env` créé avec les bonnes valeurs
- [ ] Dépendances installées (`npm install`)
- [ ] Application lancée (`npm run dev`)

## 🔧 Dépannage

### Erreur de connexion Supabase

**Symptôme** : "Missing environment variable: VITE_SUPABASE_URL"

**Solution** :
1. Vérifier que le fichier `.env` existe
2. Vérifier que les variables commencent par `VITE_`
3. Redémarrer le serveur de développement

### Erreur d'authentification

**Symptôme** : Impossible de se connecter

**Solution** :
1. Vérifier que l'email de confirmation n'est pas requis (désactiver dans Supabase Auth settings)
2. Vérifier que les politiques RLS sont correctement configurées

### Erreur de migration

**Symptôme** : Erreur lors de l'exécution de la migration SQL

**Solution** :
1. Vérifier que vous êtes connecté à Supabase
2. Vérifier que la table `properties` n'existe pas déjà
3. Exécuter la migration manuellement dans l'éditeur SQL

## 📚 Ressources

- **Documentation complète** : Voir `DOCUMENTATION.md`
- **Supabase Docs** : https://supabase.com/docs
- **React Docs** : https://react.dev
- **Vite Docs** : https://vitejs.dev

## 💡 Astuces

### Pour les développeurs

- Utiliser les DevTools React pour inspecter les composants
- Les logs Supabase sont visibles dans la console du navigateur
- Activer le mode debug dans `src/lib/supabase.ts` pour plus de logs

### Pour les utilisateurs

- Commencer par un bien simple pour comprendre le fonctionnement
- Utiliser le formulaire rapide pour créer rapidement un bien
- Consulter les résultats en temps réel dans la section "Rentabilité"

## 🆘 Support

En cas de problème :
1. Vérifier la console du navigateur (F12)
2. Vérifier les logs Supabase
3. Consulter la documentation complète
4. Ouvrir une issue sur GitHub


/**
 * Composant ProtectedRoute
 * 
 * Ce composant sert de garde pour les routes qui nécessitent une authentification.
 * Il vérifie si l'utilisateur est connecté et :
 * - Affiche un loader pendant la vérification de l'authentification
 * - Redirige vers la page de connexion si l'utilisateur n'est pas authentifié
 * - Affiche le contenu protégé si l'utilisateur est authentifié
 * 
 * Utilisé pour protéger les routes comme le dashboard, la création/modification
 * de biens immobiliers, et les analyses de rentabilité.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Récupération de l'état d'authentification depuis le contexte
  const { user, loading } = useAuth();

  // Affichage d'un loader pendant la vérification de l'authentification
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirection vers la page de connexion si l'utilisateur n'est pas authentifié
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Affichage du contenu protégé si l'utilisateur est authentifié
  return <>{children}</>;
}
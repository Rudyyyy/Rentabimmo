import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { user, signIn, signUp, error } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      await signUp(email, password);
    } else {
      await signIn(email, password);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img
          src="/logo.png"
          alt="Rentab'immo"
        />
        <p className="mt-2 text-center text-sm text-gray-600">
          {isSignUp ? 'Créez votre compte' : 'Connectez-vous à votre compte'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Image de fond */}
            <div className="hidden md:block md:w-1/2 relative">
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: 'url("/connexion.png")' }}
              >
                <div className="absolute inset-0 bg-black/30"></div>
              </div>
              <div className="relative h-full p-8 flex items-center justify-center">
                <h2 className="text-3xl font-bold text-white text-center">
                  Bienvenue sur Rentab'immo
                </h2>
              </div>
            </div>

            {/* Formulaire */}
            <div className="w-full md:w-1/2 p-8">
              {error && (
                <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Mot de passe
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {isSignUp ? 'Créer un compte' : 'Se connecter'}
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="w-full text-sm text-blue-600 hover:text-blue-500"
                >
                  {isSignUp ? 'Déjà un compte ? Connectez-vous' : 'Pas de compte ? Créez-en un'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
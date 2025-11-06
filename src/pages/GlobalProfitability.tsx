import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const GlobalProfitability: React.FC = () => {
  const navigate = useNavigate();

  // Cette page nécessite une refonte pour fonctionner avec le nouveau système
  // Elle sera améliorée dans une prochaine version
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rentabilité globale</h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          Retour au dashboard
        </button>
      </div>
      <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4" role="alert">
        <p className="font-bold mb-2">Page en cours de refonte</p>
        <p>Cette page sera bientôt disponible avec de nouvelles fonctionnalités.</p>
        <p className="mt-2">En attendant, vous pouvez consulter la rentabilité de chaque bien depuis le dashboard.</p>
      </div>
    </div>
  );
};

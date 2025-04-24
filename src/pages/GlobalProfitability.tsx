import React from 'react';
import { useInvestment } from '../contexts/InvestmentContext';
import { useNavigate } from 'react-router-dom';
import { BarChart2, Brain } from 'lucide-react';

export const GlobalProfitability: React.FC = () => {
  const { investment } = useInvestment();
  const navigate = useNavigate();

  if (!investment) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Rentabilité globale</h1>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4" role="alert">
          <p>Aucune donnée d'investissement disponible. Veuillez d'abord créer un investissement.</p>
        </div>
      </div>
    );
  }

  // Calculer le rendement brut
  const grossYield = ((investment.expenses[0]?.rent || 0) / (investment.purchasePrice + investment.agencyFees + investment.renovationCosts) * 100).toFixed(2);

  // Calculer le rendement net en utilisant les résultats fiscaux
  const netYield = ((investment.taxResults[investment.selectedRegime].netIncome) / (investment.purchasePrice + investment.agencyFees + investment.renovationCosts) * 100).toFixed(2);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Rentabilité globale</h1>
        <button
          onClick={() => navigate('/analysis')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 transition-colors"
        >
          <Brain size={20} />
          Analyse IA Détaillée
        </button>
      </div>
      
      <div className="grid gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart2 className="text-blue-600" />
            Indicateurs de Performance
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Rendement brut</p>
              <p className="text-3xl font-bold text-blue-600">
                {grossYield}%
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Revenus locatifs / Prix d'achat total
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Rendement net</p>
              <p className="text-3xl font-bold text-green-600">
                {netYield}%
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Revenus nets après charges et impôts
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Résumé de l'Investissement</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Prix d'achat</p>
              <p className="text-xl font-semibold">{investment.purchasePrice.toLocaleString()}€</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Loyer mensuel</p>
              <p className="text-xl font-semibold">{investment.expenses[0]?.rent.toLocaleString()}€</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Charges annuelles</p>
              <p className="text-xl font-semibold">{(investment.propertyTax + investment.condoFees * 12).toLocaleString()}€</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 
import React from 'react';
import { useInvestment } from '../contexts/InvestmentContext';

export const GlobalProfitability: React.FC = () => {
  const { investment } = useInvestment();

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
      <h1 className="text-2xl font-bold mb-6">Rentabilité globale</h1>
      
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Rendement brut</p>
            <p className="text-2xl font-bold text-blue-600">
              {grossYield}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Rendement net</p>
            <p className="text-2xl font-bold text-green-600">
              {netYield}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 
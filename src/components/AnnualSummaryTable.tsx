/**
 * Composant AnnualSummaryTable
 * 
 * Ce composant affiche un tableau récapitulatif des résultats fiscaux annuels pour un investissement immobilier.
 * Il permet de :
 * 1. Comparer les différents régimes fiscaux (micro-foncier, réel-foncier, micro-BIC, réel-BIC)
 * 2. Visualiser l'évolution des revenus et charges sur plusieurs années
 * 3. Calculer automatiquement les impôts et charges sociales selon le régime choisi
 * 
 * Fonctionnalités principales :
 * - Navigation entre les régimes fiscaux via des onglets
 * - Affichage des loyers (nus ou meublés selon le régime)
 * - Calcul des revenus imposables
 * - Calcul des impôts et charges sociales
 * - Affichage des revenus nets
 * 
 * Le tableau est mis à jour automatiquement à chaque changement de régime fiscal
 * et prend en compte les évolutions des revenus et charges sur la période.
 */

import React, { useState } from 'react';
import { Investment, TaxRegime, TaxResults } from '../types/investment';
import { calculateTaxResults } from '../utils/taxCalculations';

// Labels pour les différents régimes fiscaux
const TAX_REGIME_LABELS: Record<TaxRegime, string> = {
  'micro-foncier': 'Micro-foncier',
  'reel-foncier': 'Réel-foncier',
  'micro-bic': 'Micro-BIC',
  'reel-bic': 'Réel-BIC'
};

interface AnnualSummaryTableProps {
  investment: Investment; // Données de l'investissement
}

export const AnnualSummaryTable: React.FC<AnnualSummaryTableProps> = ({ investment }) => {
  // État pour le régime fiscal sélectionné
  const [selectedRegime, setSelectedRegime] = useState<TaxRegime>('micro-foncier');

  // Logging pour le débogage
  //useEffect(() => {
  //  console.log('AnnualSummaryTable mounted with investment:', investment);
  //}, [investment]);

  // Génération de la liste des années à afficher
  const startYear = new Date(investment.startDate).getFullYear();
  const endYear = new Date(investment.projectEndDate).getFullYear();
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  );

  // Fonction pour obtenir les résultats fiscaux d'une année donnée
  const getTaxResults = (year: number): TaxResults => {
    const results = calculateTaxResults(investment, year);
    return results[selectedRegime];
  };

  // Fonction pour obtenir le loyer en fonction du régime fiscal
  const getRent = (year: number) => {
    const yearExpenses = investment.expenses.find(e => e.year === year);
    if (!yearExpenses) return 0;

    // Retourne le loyer nu pour les régimes de location nue
    if (selectedRegime === 'micro-foncier' || selectedRegime === 'reel-foncier') {
      return Number(yearExpenses.rent || 0);
    }
    
    // Retourne le loyer meublé pour les régimes de location meublée
    if (selectedRegime === 'micro-bic' || selectedRegime === 'reel-bic') {
      return Number(yearExpenses.furnishedRent || 0);
    }

    return 0;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Récapitulatif annuel</h2>
      
      {/* Navigation des régimes fiscaux */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {Object.entries(TAX_REGIME_LABELS).map(([regime, label]) => (
            <button
              key={regime}
              onClick={() => setSelectedRegime(regime as TaxRegime)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${selectedRegime === regime
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tableau des résultats fiscaux */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Année
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Loyer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenu imposable
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Impôt
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Charges sociales
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total impôts
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenu net
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {years.map((year) => {
              const results = getTaxResults(year);
              const rent = getRent(year);

              return (
                <tr key={year}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {results.taxableIncome.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {results.tax.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {results.socialCharges.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {results.totalTax.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {results.netIncome.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 
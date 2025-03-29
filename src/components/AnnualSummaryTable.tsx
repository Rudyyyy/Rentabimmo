import React, { useState, useEffect } from 'react';
import { Investment, TaxRegime, TaxResults } from '../types/investment';
import { calculateTaxResults } from '../utils/taxCalculations';

interface AnnualSummaryTableProps {
  investment: Investment;
}

const TAX_REGIME_LABELS: Record<TaxRegime, string> = {
  'micro-foncier': 'Micro-foncier',
  'reel-foncier': 'Réel-foncier',
  'micro-bic': 'Micro-BIC',
  'reel-bic': 'Réel-BIC'
};

export const AnnualSummaryTable: React.FC<AnnualSummaryTableProps> = ({ investment }) => {
  console.log('AnnualSummaryTable rendering with investment:', {
    startDate: investment.startDate,
    projectEndDate: investment.projectEndDate,
    expenses: investment.expenses,
    taxParameters: investment.taxParameters
  });

  const [selectedRegime, setSelectedRegime] = useState<TaxRegime>('micro-foncier');

  useEffect(() => {
    console.log('AnnualSummaryTable mounted with investment:', investment);
  }, [investment]);

  // Générer les années
  const startYear = new Date(investment.startDate).getFullYear();
  const endYear = new Date(investment.projectEndDate).getFullYear();
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, i) => startYear + i
  );

  console.log('Years to display:', years);

  // Obtenir les résultats fiscaux pour l'année sélectionnée
  const getTaxResults = (year: number): TaxResults => {
    const results = calculateTaxResults(investment, year);
    console.log(`Tax results for year ${year}:`, results);
    return results[selectedRegime];
  };

  // Obtenir le loyer en fonction du régime
  const getRent = (year: number) => {
    const yearExpenses = investment.expenses.find(e => e.year === year);
    if (!yearExpenses) {
      console.log(`No expenses found for year ${year}`);
      return 0;
    }

    console.log(`Expenses for year ${year}:`, yearExpenses);

    // Pour les régimes de location nue
    if (selectedRegime === 'micro-foncier' || selectedRegime === 'reel-foncier') {
      return Number(yearExpenses.rent || 0);
    }
    
    // Pour les régimes de location meublée
    if (selectedRegime === 'micro-bic' || selectedRegime === 'reel-bic') {
      return Number(yearExpenses.furnishedRent || 0);
    }

    return 0;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Récapitulatif annuel</h2>
      {/* Onglets des régimes */}
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

      {/* Tableau des résultats */}
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
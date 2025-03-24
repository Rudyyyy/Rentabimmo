import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { HelpCircle } from 'lucide-react';
import { Investment, TaxRegime, TaxResults } from '../types/investment';
import { calculateAllTaxRegimes, getRecommendedRegime } from '../utils/taxCalculations';

interface Props {
  investment: Investment;
  onUpdate: (updatedInvestment: Investment) => void;
}

const REGIME_LABELS = {
  'micro-foncier': 'Location nue - Micro-foncier',
  'reel-foncier': 'Location nue - Frais réels',
  'micro-bic': 'LMNP - Micro-BIC',
  'reel-bic': 'LMNP - Frais réels'
};

export default function TaxForm({ investment, onUpdate }: Props) {
  const [currentYear] = useState(new Date().getFullYear());
  const [selectedRegime, setSelectedRegime] = useState<TaxRegime>(investment.selectedRegime);
  const [currentView, setCurrentView] = useState<'parameters' | 'projection'>('parameters');
  const [projectionRegime, setProjectionRegime] = useState<TaxRegime>('micro-foncier');

  useEffect(() => {
    const results = calculateAllTaxRegimes(investment, currentYear);
    
    onUpdate({
      ...investment,
      selectedRegime: selectedRegime,
      taxResults: results
    });
  }, [investment.taxParameters, selectedRegime]);

  const handleTaxParameterChange = (field: keyof Investment['taxParameters'], value: number) => {
    onUpdate({
      ...investment,
      taxParameters: {
        ...investment.taxParameters,
        [field]: value
      }
    });
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const formatPercent = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2 }).format(value / 100);

  // Données pour le graphique de comparaison
  const chartData = {
    labels: Object.values(REGIME_LABELS),
    datasets: [
      {
        label: 'Revenu imposable',
        data: Object.values(investment.taxResults).map(result => result.taxableIncome),
        backgroundColor: 'rgba(59, 130, 246, 0.5)', // blue
      },
      {
        label: 'Impôt sur le revenu',
        data: Object.values(investment.taxResults).map(result => result.tax),
        backgroundColor: 'rgba(239, 68, 68, 0.5)', // red
      },
      {
        label: 'Prélèvements sociaux',
        data: Object.values(investment.taxResults).map(result => result.socialCharges),
        backgroundColor: 'rgba(245, 158, 11, 0.5)', // yellow
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Comparaison des régimes fiscaux'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  const renderProjectionTable = () => {
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const rows = [];

    for (let year = currentYear + 1; year <= endYear; year++) {
      const yearResults = calculateAllTaxRegimes(investment, year);
      const yearExpense = investment.expenses.find(e => e.year === year);
      
      if (!yearExpense) continue;

      rows.push(
        <tr key={year}>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            {year}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(yearExpense.rent || 0)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(yearResults[projectionRegime].taxableIncome)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(yearResults[projectionRegime].tax)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(yearResults[projectionRegime].socialCharges)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(yearResults[projectionRegime].totalTax)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
            {formatCurrency(yearResults[projectionRegime].netIncome)}
          </td>
          {projectionRegime === 'reel-foncier' && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults[projectionRegime].deficit || 0)}
            </td>
          )}
          {projectionRegime === 'reel-bic' && yearResults[projectionRegime].amortization && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults[projectionRegime].amortization.total)}
            </td>
          )}
        </tr>
      );
    }

    return rows;
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex space-x-4">
          <button
            onClick={() => setCurrentView('parameters')}
            className={`px-4 py-2 rounded-md ${
              currentView === 'parameters'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Paramètres
          </button>
          <button
            onClick={() => setCurrentView('projection')}
            className={`px-4 py-2 rounded-md ${
              currentView === 'projection'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Projection
          </button>
        </div>
      </div>

      {currentView === 'parameters' ? (
        <>
          {/* Paramètres fiscaux communs */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Paramètres fiscaux communs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Taux marginal d'imposition (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={investment.taxParameters.taxRate}
                  onChange={(e) => handleTaxParameterChange('taxRate', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Taux des prélèvements sociaux (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={investment.taxParameters.socialChargesRate}
                  onChange={(e) => handleTaxParameterChange('socialChargesRate', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Paramètres LMNP */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Paramètres LMNP</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Valeur du bien (hors terrain)
                </label>
                <input
                  type="number"
                  value={investment.taxParameters.buildingValue}
                  onChange={(e) => handleTaxParameterChange('buildingValue', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Durée d'amortissement du bien (années)
                </label>
                <input
                  type="number"
                  value={investment.taxParameters.buildingAmortizationYears}
                  onChange={(e) => handleTaxParameterChange('buildingAmortizationYears', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Valeur du mobilier
                </label>
                <input
                  type="number"
                  value={investment.taxParameters.furnitureValue}
                  onChange={(e) => handleTaxParameterChange('furnitureValue', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Durée d'amortissement du mobilier (années)
                </label>
                <input
                  type="number"
                  value={investment.taxParameters.furnitureAmortizationYears}
                  onChange={(e) => handleTaxParameterChange('furnitureAmortizationYears', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Paramètres Location Nue */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Paramètres Location Nue</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Déficit foncier reporté
                </label>
                <input
                  type="number"
                  value={investment.taxParameters.previousDeficit}
                  onChange={(e) => handleTaxParameterChange('previousDeficit', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Plafond de déduction du déficit
                </label>
                <input
                  type="number"
                  value={investment.taxParameters.deficitLimit}
                  onChange={(e) => handleTaxParameterChange('deficitLimit', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Graphique de comparaison */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Résultats détaillés */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Résultats détaillés</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Régime
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenu imposable
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Impôt sur le revenu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prélèvements sociaux
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
                  {Object.entries(investment.taxResults).map(([regime, results]) => (
                    <tr 
                      key={regime}
                      className={regime === selectedRegime ? 'bg-blue-50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {REGIME_LABELS[regime as TaxRegime]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(results.taxableIncome)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(results.tax)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(results.socialCharges)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(results.totalTax)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                        {formatCurrency(results.netIncome)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Onglets de projection */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {Object.entries(REGIME_LABELS).map(([regime, label]) => (
                  <button
                    key={regime}
                    onClick={() => setProjectionRegime(regime as TaxRegime)}
                    className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                      ${projectionRegime === regime
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="mt-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Année
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenus
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenu imposable
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Impôt sur le revenu
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prélèvements sociaux
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total impôts
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenu net
                      </th>
                      {projectionRegime === 'reel-foncier' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Déficit reporté
                        </th>
                      )}
                      {projectionRegime === 'reel-bic' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amortissements
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {renderProjectionTable()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
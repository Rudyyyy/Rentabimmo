/**
 * Composant TaxForm
 * 
 * Ce composant gère la partie fiscale d'un investissement immobilier. Il permet de :
 * 1. Configurer les paramètres fiscaux (taux d'imposition, prélèvements sociaux, etc.)
 * 2. Comparer les différents régimes fiscaux (micro-foncier, réel, LMNP, etc.)
 * 3. Visualiser les projections fiscales sur plusieurs années
 * 
 * Fonctionnalités principales :
 * - Calcul automatique des impôts selon le régime choisi
 * - Comparaison visuelle des régimes via graphiques
 * - Projection des revenus et charges sur plusieurs années
 * - Gestion des amortissements pour le régime LMNP
 * 
 * Les calculs prennent en compte :
 * - Les revenus locatifs (nus et meublés)
 * - Les charges déductibles
 * - Les amortissements
 * - Les déficits reportables
 * - Les prélèvements sociaux
 */

import { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Investment, TaxRegime, TaxResults, YearlyExpenses } from '../types/investment';
import { calculateAllTaxRegimes } from '../utils/taxCalculations';

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
  // État local pour gérer l'année courante et le régime sélectionné
  const [currentYear] = useState(new Date().getFullYear());
  const [selectedRegime, setSelectedRegime] = useState<TaxRegime>(investment.selectedRegime);
  const [currentView, setCurrentView] = useState<'parameters' | 'projection'>('parameters');
  const [projectionRegime, setProjectionRegime] = useState<TaxRegime>(investment.selectedRegime || 'micro-foncier');

  // Mise à jour des résultats fiscaux à chaque changement de paramètres
  useEffect(() => {
    const results = calculateAllTaxRegimes(investment, currentYear);
    
    onUpdate({
      ...investment,
      selectedRegime: selectedRegime,
      taxRegime: selectedRegime,
      taxResults: results
    });
  }, [investment.taxParameters, selectedRegime, currentYear, investment.expenses]);

  // Synchronisation de projectionRegime avec selectedRegime
  useEffect(() => {
    setProjectionRegime(selectedRegime);
  }, [selectedRegime]);

  // Synchronisation des revenus avec les paramètres fiscaux
  useEffect(() => {
    const currentYearExpense = investment.expenses.find(e => e.year === currentYear);
    if (currentYearExpense && (!investment.taxParameters.rent || !investment.taxParameters.furnishedRent || !investment.taxParameters.tenantCharges || !investment.taxParameters.taxBenefit)) {
      onUpdate({
        ...investment,
        taxParameters: {
          ...investment.taxParameters,
          rent: currentYearExpense.rent || 0,
          furnishedRent: currentYearExpense.furnishedRent || 0,
          tenantCharges: currentYearExpense.tenantCharges || 0,
          taxBenefit: currentYearExpense.taxBenefit || 0
        }
      });
    }
  }, [currentYear, investment.expenses]);

  // Gestionnaires d'événements pour les changements de paramètres
  const handleTaxParameterChange = (field: keyof Investment['taxParameters'], value: number) => {
    onUpdate({
      ...investment,
      taxParameters: {
        ...investment.taxParameters,
        [field]: value
      }
    });
  };

  const handleExpenseProjectionChange = (field: keyof Investment['expenseProjection'], value: number) => {
    onUpdate({
      ...investment,
      expenseProjection: {
        ...investment.expenseProjection,
        [field]: value
      }
    });
  };

  // Formatage des montants en euros
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  // Données pour le graphique de comparaison
  const chartData = {
    labels: Object.values(REGIME_LABELS),
    datasets: [
      {
        label: 'Revenu net',
        data: Object.values(investment.taxResults).map(result => result.netIncome),
        backgroundColor: 'rgba(16, 185, 129, 0.5)', // emerald
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

  const handleProjectionRegimeChange = (regime: TaxRegime) => {
    setProjectionRegime(regime);
  };

  const renderHistoricalAndProjectionTable = () => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const rows = [];

    // On va stocker les résultats de l'année précédente pour les utiliser dans le calcul de l'année suivante
    let previousYearResults: Record<TaxRegime, TaxResults> | undefined;

    for (let year = startYear; year <= endYear; year++) {
      // On passe les résultats de l'année précédente à calculateAllTaxRegimes
      const yearResults = calculateAllTaxRegimes(investment, year, previousYearResults);
      const yearExpense = investment.expenses.find(e => e.year === year);
      
      if (!yearExpense) continue;

      rows.push(
        <tr key={year} className={year === currentYear ? 'bg-blue-50' : ''}>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            {year}
          </td>
          {(projectionRegime === 'micro-foncier' || projectionRegime === 'reel-foncier') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearExpense.rent || 0)}
            </td>
          )}
          {(projectionRegime === 'micro-bic' || projectionRegime === 'reel-bic') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearExpense.furnishedRent || 0)}
            </td>
          )}
          {(projectionRegime === 'micro-foncier' || projectionRegime === 'reel-foncier') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearExpense.tenantCharges || 0)}
            </td>
          )}
          {(projectionRegime === 'micro-foncier' || projectionRegime === 'reel-foncier') && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearExpense.taxBenefit || 0)}
            </td>
          )}
          {projectionRegime === 'reel-foncier' && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults['reel-foncier'].deductibleExpenses || 0)}
            </td>
          )}
          {projectionRegime === 'reel-foncier' && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults['reel-foncier'].usedDeficit || 0)}
            </td>
          )}
          {projectionRegime === 'reel-foncier' && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults['reel-foncier'].deficit || 0)}
            </td>
          )}
          {projectionRegime === 'reel-bic' && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults['reel-bic'].deductibleExpenses || 0)}
            </td>
          )}
          {projectionRegime === 'reel-bic' && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults['reel-bic'].amortization?.total || 0)}
            </td>
          )}
          {projectionRegime === 'reel-bic' && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults['reel-bic'].amortization?.used || 0)}
            </td>
          )}
          {projectionRegime === 'reel-bic' && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults['reel-bic'].amortization?.carriedForward || 0)}
            </td>
          )}
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(yearResults[projectionRegime].taxableIncome)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {yearResults[projectionRegime].totalTax > 0 ? (
              <div>
                <div className="text-sm font-medium">{formatCurrency(yearResults[projectionRegime].totalTax)}</div>
                <div className="text-xs text-gray-400">
                  IR: {formatCurrency(yearResults[projectionRegime].tax)} + PS: {formatCurrency(yearResults[projectionRegime].socialCharges)}
                </div>
              </div>
            ) : (
              formatCurrency(0)
            )}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {formatCurrency(yearResults[projectionRegime].netIncome)}
          </td>
        </tr>
      );

      // On stocke les résultats de cette année pour les utiliser l'année suivante
      previousYearResults = yearResults;
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Année</th>
              {(projectionRegime === 'micro-foncier' || projectionRegime === 'reel-foncier') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loyer nu</th>
              )}
              {(projectionRegime === 'micro-bic' || projectionRegime === 'reel-bic') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loyer meublé</th>
              )}
              {(projectionRegime === 'micro-foncier' || projectionRegime === 'reel-foncier') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charges locataires</th>
              )}
              {(projectionRegime === 'micro-foncier' || projectionRegime === 'reel-foncier') && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aide fiscale</th>
              )}
              {projectionRegime === 'reel-foncier' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charges déductibles</th>
              )}
              {projectionRegime === 'reel-foncier' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Déficit utilisé</th>
              )}
              {projectionRegime === 'reel-foncier' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Déficit reporté</th>
              )}
              {projectionRegime === 'reel-bic' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Charges déductibles</th>
              )}
              {projectionRegime === 'reel-bic' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amortissement disponible</th>
              )}
              {projectionRegime === 'reel-bic' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amortissement utilisé</th>
              )}
              {projectionRegime === 'reel-bic' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amortissement reporté</th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenu imposable</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imposition</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenu net</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows}
          </tbody>
        </table>
      </div>
    );
  };

  // Calculer les totaux cumulés pour chaque régime
  const calculateCumulativeTotals = () => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const totals: Record<TaxRegime, { netIncome: number; tax: number; socialCharges: number }> = {
      'micro-foncier': { netIncome: 0, tax: 0, socialCharges: 0 },
      'reel-foncier': { netIncome: 0, tax: 0, socialCharges: 0 },
      'micro-bic': { netIncome: 0, tax: 0, socialCharges: 0 },
      'reel-bic': { netIncome: 0, tax: 0, socialCharges: 0 }
    };

    // On garde les résultats de l'année précédente pour chaque régime
    const previousResults: Record<TaxRegime, TaxResults> = {
      'micro-foncier': {} as TaxResults,
      'reel-foncier': {} as TaxResults,
      'micro-bic': {} as TaxResults,
      'reel-bic': {} as TaxResults
    };

    for (let year = startYear; year <= endYear; year++) {
      // On calcule les résultats de l'année en utilisant les résultats de l'année précédente
      const yearResults = calculateAllTaxRegimes(investment, year, previousResults);
      
      // On met à jour les totaux
      Object.keys(totals).forEach(regime => {
        const regimeType = regime as TaxRegime;
        totals[regimeType].netIncome += yearResults[regimeType].netIncome;
        totals[regimeType].tax += yearResults[regimeType].tax;
        totals[regimeType].socialCharges += yearResults[regimeType].socialCharges;
      });

      // On sauvegarde les résultats pour l'année suivante
      Object.keys(previousResults).forEach(regime => {
        previousResults[regime as TaxRegime] = yearResults[regime as TaxRegime];
      });
    }

    return totals;
  };

  // Données pour le graphique de comparaison des totaux cumulés
  const cumulativeTotals = calculateCumulativeTotals();
  const cumulativeChartData = {
    labels: Object.values(REGIME_LABELS),
    datasets: [
      {
        label: 'Revenu net total',
        data: Object.values(cumulativeTotals).map(result => result.netIncome),
        backgroundColor: 'rgba(16, 185, 129, 0.5)', // emerald
      },
      {
        label: 'Impôt sur le revenu total',
        data: Object.values(cumulativeTotals).map(result => result.tax),
        backgroundColor: 'rgba(239, 68, 68, 0.5)', // red
      },
      {
        label: 'Prélèvements sociaux totaux',
        data: Object.values(cumulativeTotals).map(result => result.socialCharges),
        backgroundColor: 'rgba(245, 158, 11, 0.5)', // yellow
      }
    ]
  };

  const cumulativeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Comparaison des régimes fiscaux - Totaux cumulés'
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

  // Données pour le graphique d'évolution des revenus nets
  const netIncomeEvolutionData = {
    labels: (() => {
      const startYear = new Date(investment.projectStartDate).getFullYear();
      const endYear = new Date(investment.projectEndDate).getFullYear();
      return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    })(),
    datasets: Object.entries(REGIME_LABELS).map(([regime, label], index) => {
      const colors = [
        'rgba(59, 130, 246, 0.5)', // blue
        'rgba(16, 185, 129, 0.5)', // green
        'rgba(139, 92, 246, 0.5)', // purple
        'rgba(245, 158, 11, 0.5)'  // yellow
      ];
      
      // On recalcule les revenus nets pour chaque année pour s'assurer d'utiliser les bonnes valeurs
      const startYear = new Date(investment.projectStartDate).getFullYear();
      const endYear = new Date(investment.projectEndDate).getFullYear();
      
      // On garde les résultats de l'année précédente pour chaque régime
      let previousYearResults: Record<TaxRegime, TaxResults> | undefined;
      
      const netIncomeData = [];
      for (let year = startYear; year <= endYear; year++) {
        // On calcule avec les résultats de l'année précédente
        const yearResults = calculateAllTaxRegimes(investment, year, previousYearResults);
        const taxResults = yearResults[regime as TaxRegime];
        netIncomeData.push(taxResults?.netIncome || 0);
                        
        // On sauvegarde les résultats pour l'année suivante
        previousYearResults = yearResults;
      }
      
      return {
        label,
        data: netIncomeData,
        borderColor: colors[index],
        backgroundColor: colors[index],
        fill: false,
        tension: 0.4
      };
    })
  };
  
    const netIncomeEvolutionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Évolution des revenus nets par régime'
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
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => setCurrentView('parameters')}
            className={`px-4 py-2 rounded-md ${
              currentView === 'parameters'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Année courante
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('projection')}
            className={`px-4 py-2 rounded-md ${
              currentView === 'projection'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Historique et projection
          </button>
        </div>
      </div>

      {/* Sélection du régime fiscal */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Régime fiscal
        </label>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="radio"
              id="micro-foncier"
              name="taxRegime"
              value="micro-foncier"
              checked={selectedRegime === 'micro-foncier'}
              onChange={(e) => setSelectedRegime(e.target.value as TaxRegime)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="micro-foncier" className="ml-3 block text-sm font-medium text-gray-700">
              Location nue - Micro-foncier
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              id="reel-foncier"
              name="taxRegime"
              value="reel-foncier"
              checked={selectedRegime === 'reel-foncier'}
              onChange={(e) => setSelectedRegime(e.target.value as TaxRegime)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="reel-foncier" className="ml-3 block text-sm font-medium text-gray-700">
              Location nue - Frais réels
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              id="micro-bic"
              name="taxRegime"
              value="micro-bic"
              checked={selectedRegime === 'micro-bic'}
              onChange={(e) => setSelectedRegime(e.target.value as TaxRegime)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="micro-bic" className="ml-3 block text-sm font-medium text-gray-700">
              LMNP - Micro-BIC
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              id="reel-bic"
              name="taxRegime"
              value="reel-bic"
              checked={selectedRegime === 'reel-bic'}
              onChange={(e) => setSelectedRegime(e.target.value as TaxRegime)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <label htmlFor="reel-bic" className="ml-3 block text-sm font-medium text-gray-700">
              LMNP - Frais réels
            </label>
          </div>
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
                  placeholder="5 ans par défaut"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Valeur des travaux
                </label>
                <input
                  type="number"
                  value={investment.taxParameters.worksValue}
                  onChange={(e) => handleTaxParameterChange('worksValue', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Durée d'amortissement des travaux (années)
                </label>
                <input
                  type="number"
                  value={investment.taxParameters.worksAmortizationYears}
                  onChange={(e) => handleTaxParameterChange('worksAmortizationYears', Number(e.target.value))}
                  placeholder="10 ans par défaut"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Valeur des autres éléments
                </label>
                <input
                  type="number"
                  value={investment.taxParameters.otherValue}
                  onChange={(e) => handleTaxParameterChange('otherValue', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Durée d'amortissement des autres éléments (années)
                </label>
                <input
                  type="number"
                  value={investment.taxParameters.otherAmortizationYears}
                  onChange={(e) => handleTaxParameterChange('otherAmortizationYears', Number(e.target.value))}
                  placeholder="5 ans par défaut"
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
                  Plafond de déduction du déficit foncier
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

          {/* Nouvelle section d'explications avec onglets */}
          <div className="bg-white p-6 rounded-lg shadow-md mt-6">
            <h3 className="text-lg font-semibold mb-4">Explications et calculs</h3>
            
            {/* Navigation des onglets */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {Object.entries(REGIME_LABELS).map(([regime, label]) => (
                  <button
                    key={regime}
                    type="button"
                    onClick={() => handleProjectionRegimeChange(regime as TaxRegime)}
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

            <div className="space-y-6">
              {/* Contenu de l'onglet Micro-foncier */}
              {projectionRegime === 'micro-foncier' && (
                <div>
                  <div className="pl-4 border-l-2 border-blue-200 space-y-2">
                    <p>Le régime micro-foncier est le plus simple. Il s'applique automatiquement si vos revenus fonciers sont inférieurs à 15 000 € par an.</p>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h5 className="font-medium mb-2">Algorithme de calcul :</h5>
                      <ol className="list-decimal pl-5 space-y-1 text-sm">
                        <li>Revenu brut = Loyer nu uniquement : {formatCurrency(investment.expenses.find(e => e.year === currentYear)?.rent || 0)}</li>
                        <li>Abattement forfaitaire de 30% : {formatCurrency((investment.expenses.find(e => e.year === currentYear)?.rent || 0) * 0.3)}</li>
                        <li>Revenu imposable = 70% du revenu brut : {formatCurrency((investment.expenses.find(e => e.year === currentYear)?.rent || 0) * 0.7)}</li>
                        <li>Impôt = Revenu imposable × Taux d'imposition ({investment.taxParameters.taxRate}%)</li>
                        <li>Prélèvements sociaux = Revenu imposable × 17.2%</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {/* Contenu de l'onglet Réel Foncier */}
              {projectionRegime === 'reel-foncier' && (
                <div>
                  <div className="pl-4 border-l-2 border-green-200 space-y-2">
                    <p>Le régime réel permet de déduire les charges réelles et de créer un déficit foncier imputable sur vos revenus.</p>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h5 className="font-medium mb-2">Algorithme de calcul :</h5>
                      <ol className="list-decimal pl-5 space-y-1 text-sm">
                        <li>Revenu brut = Loyer nu uniquement : {formatCurrency(investment.expenses.find(e => e.year === currentYear)?.rent || 0)}</li>
                        <li>Charges déductibles :</li>
                        <ul className="list-disc pl-5 space-y-1 text-sm ml-4">
                          {(() => {
                            const yearExpenses: YearlyExpenses = investment.expenses.find(e => e.year === currentYear) || {
                              year: currentYear,
                              propertyTax: 0,
                              condoFees: 0,
                              propertyInsurance: 0,
                              managementFees: 0,
                              unpaidRentInsurance: 0,
                              repairs: 0,
                              otherDeductible: 0,
                              otherNonDeductible: 0,
                              rent: 0,
                              furnishedRent: 0,
                              tenantCharges: 0,
                              tax: 0,
                              deficit: 0,
                              loanPayment: 0,
                              loanInsurance: 0,
                              taxBenefit: 0,
                              interest: 0
                            };
                            return (
                              <>
                                <li>Taxe foncière : {formatCurrency(yearExpenses.propertyTax || 0)}</li>
                                <li>Charges de copropriété : {formatCurrency(yearExpenses.condoFees || 0)}</li>
                                <li>Assurance PNO : {formatCurrency(yearExpenses.propertyInsurance || 0)}</li>
                                <li>Frais de gestion : {formatCurrency(yearExpenses.managementFees || 0)}</li>
                                <li>Assurance loyers impayés : {formatCurrency(yearExpenses.unpaidRentInsurance || 0)}</li>
                                <li>Réparations : {formatCurrency(yearExpenses.repairs || 0)}</li>
                                <li>Autres charges déductibles : {formatCurrency(yearExpenses.otherDeductible || 0)}</li>
                                <li>Assurance emprunt : {formatCurrency(yearExpenses.loanInsurance || 0)}</li>
                                <li>Intérêts d'emprunt : {formatCurrency(yearExpenses.interest || 0)}</li>
                                <li className="text-red-600">Moins charges locataires : -{formatCurrency(yearExpenses.tenantCharges || 0)}</li>
                              </>
                            );
                          })()}
                        </ul>
                        <li>Déficit antérieur reporté : {formatCurrency(investment.taxParameters.previousDeficit || 0)}</li>
                        <li>Revenu imposable = Revenu brut - Charges déductibles - Déficit reporté</li>
                        <li>Si résultat négatif : création d'un déficit (plafonné à {formatCurrency(investment.taxParameters.deficitLimit)})</li>
                        <li>Impôt = Revenu imposable × Taux d'imposition ({investment.taxParameters.taxRate}%)</li>
                        <li>Prélèvements sociaux = Revenu imposable × 17.2%</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {/* Contenu de l'onglet Micro-BIC */}
              {projectionRegime === 'micro-bic' && (
                <div>
                  <div className="pl-4 border-l-2 border-purple-200 space-y-2">
                    <p>Le régime micro-BIC s'applique aux locations meublées avec des recettes annuelles inférieures à 72 600 €.</p>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h5 className="font-medium mb-2">Algorithme de calcul :</h5>
                      <ol className="list-decimal pl-5 space-y-1 text-sm">
                        <li>Revenu brut = Loyer meublé uniquement : {formatCurrency(investment.expenses.find(e => e.year === currentYear)?.furnishedRent || 0)}</li>
                        <li>Abattement forfaitaire de 50% : {formatCurrency((investment.expenses.find(e => e.year === currentYear)?.furnishedRent || 0) * 0.5)}</li>
                        <li>Revenu imposable = 50% du revenu brut : {formatCurrency((investment.expenses.find(e => e.year === currentYear)?.furnishedRent || 0) * 0.5)}</li>
                        <li>Impôt = Revenu imposable × Taux d'imposition ({investment.taxParameters.taxRate}%)</li>
                        <li>Prélèvements sociaux = Revenu imposable × 17.2%</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {/* Contenu de l'onglet Réel BIC */}
              {projectionRegime === 'reel-bic' && (
                <div>
                  <div className="pl-4 border-l-2 border-orange-200 space-y-2">
                    <p>Le régime réel BIC permet de déduire toutes les charges et d'amortir les biens.</p>
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h5 className="font-medium mb-2">Algorithme de calcul :</h5>
                      <ol className="list-decimal pl-5 space-y-1 text-sm">
                        <li>Revenu brut = Loyer meublé uniquement : {formatCurrency(investment.expenses.find(e => e.year === currentYear)?.furnishedRent || 0)}</li>
                        <li>Charges déductibles :</li>
                        <ul className="list-disc pl-5 space-y-1 text-sm ml-4">
                          {(() => {
                            const yearExpenses: YearlyExpenses = investment.expenses.find(e => e.year === currentYear) || {
                              year: currentYear,
                              propertyTax: 0,
                              condoFees: 0,
                              propertyInsurance: 0,
                              managementFees: 0,
                              unpaidRentInsurance: 0,
                              repairs: 0,
                              otherDeductible: 0,
                              otherNonDeductible: 0,
                              rent: 0,
                              furnishedRent: 0,
                              tenantCharges: 0,
                              tax: 0,
                              deficit: 0,
                              loanPayment: 0,
                              loanInsurance: 0,
                              taxBenefit: 0,
                              interest: 0
                            };
                            return (
                              <>
                                <li>Taxe foncière : {formatCurrency(yearExpenses.propertyTax || 0)}</li>
                                <li>Charges de copropriété : {formatCurrency(yearExpenses.condoFees || 0)}</li>
                                <li>Assurance PNO : {formatCurrency(yearExpenses.propertyInsurance || 0)}</li>
                                <li>Frais de gestion : {formatCurrency(yearExpenses.managementFees || 0)}</li>
                                <li>Assurance loyers impayés : {formatCurrency(yearExpenses.unpaidRentInsurance || 0)}</li>
                                <li>Réparations : {formatCurrency(yearExpenses.repairs || 0)}</li>
                                <li>Autres charges déductibles : {formatCurrency(yearExpenses.otherDeductible || 0)}</li>
                                <li>Assurance emprunt : {formatCurrency(yearExpenses.loanInsurance || 0)}</li>
                                <li>Intérêts d'emprunt : {formatCurrency(yearExpenses.interest || 0)}</li>
                                <li className="text-red-600">Moins charges locataires : -{formatCurrency(yearExpenses.tenantCharges || 0)}</li>
                              </>
                            );
                          })()}
                        </ul>
                        <li>Amortissements :</li>
                        <ul className="list-disc pl-5 space-y-1 text-sm ml-4">
                          <li>Immeuble ({investment.taxParameters.buildingAmortizationYears} ans) : {formatCurrency(investment.taxParameters.buildingValue / investment.taxParameters.buildingAmortizationYears)}</li>
                          <li>Meubles ({investment.taxParameters.furnitureAmortizationYears} ans) : {formatCurrency(investment.taxParameters.furnitureValue / investment.taxParameters.furnitureAmortizationYears)}</li>
                          <li>Travaux ({investment.taxParameters.worksAmortizationYears} ans) : {formatCurrency(investment.taxParameters.worksValue / investment.taxParameters.worksAmortizationYears)}</li>
                          <li>Autres ({investment.taxParameters.otherAmortizationYears} ans) : {formatCurrency(investment.taxParameters.otherValue / investment.taxParameters.otherAmortizationYears)}</li>
                          <li className="font-bold text-blue-700">Amortissement total disponible : {formatCurrency(
                            (investment.taxParameters.buildingValue / investment.taxParameters.buildingAmortizationYears) +
                            (investment.taxParameters.furnitureValue / investment.taxParameters.furnitureAmortizationYears) +
                            (investment.taxParameters.worksValue / investment.taxParameters.worksAmortizationYears) +
                            (investment.taxParameters.otherValue / investment.taxParameters.otherAmortizationYears)
                          )}</li>
                        </ul>
                        <li>Résultat avant amortissement = Revenu brut - Charges déductibles</li>
                        <li className="font-bold text-blue-700">Amortissement utilisé = Min(Amortissement total, Résultat avant amortissement)</li>
                        <li className="italic text-gray-500">Note : Les amortissements ne peuvent pas créer de déficit fiscal, ils sont limités au montant du résultat avant amortissement.</li>
                        <li>Revenu imposable = Revenu brut - Charges déductibles - Amortissements utilisés</li>
                        <li>Impôt = Revenu imposable × Taux d'imposition ({investment.taxParameters.taxRate}%)</li>
                        <li>Prélèvements sociaux = Revenu imposable × 17.2%</li>
                      </ol>
                    </div>
                    
                    <div className="bg-yellow-50 p-4 rounded-md border-l-4 border-yellow-500 mt-2">
                      <p className="font-semibold">Important :</p>
                      <p>Les amortissements qui n'ont pas pu être utilisés une année ne sont pas perdus. Par contre, ils seront réintégrés et imposés lors de la revente du bien.</p>
                      <p>Cette colonne "Amortissement utilisé" vous permet donc de suivre le montant d'amortissement effectivement déduit chaque année, et de calculer le montant qui devra être réintégré à la revente.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Note sur les prélèvements sociaux (toujours visible) */}
              <div className="mt-4 bg-gray-50 p-4 rounded-md">
                <h4 className="text-md font-semibold text-gray-700 mb-2">Note sur les prélèvements sociaux</h4>
                <p className="text-sm text-gray-600">Les prélèvements sociaux (17.2%) s'appliquent sur le revenu imposable, quel que soit le régime choisi. Ils se décomposent en :</p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600 mt-2">
                  <li>CSG (Contribution Sociale Généralisée) : 9.2%</li>
                  <li>CRDS (Contribution au Remboursement de la Dette Sociale) : 0.5%</li>
                  <li>Prélèvement de solidarité : 7.5%</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Paramètres de projection */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Paramètres de projection</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Augmentation annuelle du loyer nu (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={investment.expenseProjection.rentIncrease}
                  onChange={(e) => handleExpenseProjectionChange('rentIncrease', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Augmentation annuelle du loyer meublé (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={investment.expenseProjection.furnishedRentIncrease}
                  onChange={(e) => handleExpenseProjectionChange('furnishedRentIncrease', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Augmentation annuelle des charges locataire (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={investment.expenseProjection.tenantChargesIncrease}
                  onChange={(e) => handleExpenseProjectionChange('tenantChargesIncrease', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Augmentation annuelle de l'aide fiscale (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={investment.expenseProjection.taxBenefitIncrease}
                  onChange={(e) => handleExpenseProjectionChange('taxBenefitIncrease', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Graphique d'évolution des revenus nets */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="h-96">
              <Line data={netIncomeEvolutionData} options={netIncomeEvolutionOptions} />
            </div>
          </div>

          {/* Graphique de comparaison des totaux cumulés */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="h-96">
              <Bar data={cumulativeChartData} options={cumulativeChartOptions} />
            </div>
          </div>

          {/* Onglets de régime */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {Object.entries(REGIME_LABELS).map(([regime, label]) => (
                  <button
                    key={regime}
                    type="button"
                    onClick={() => handleProjectionRegimeChange(regime as TaxRegime)}
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

            {/* Table de projection */}
            <div className="mt-6">
              {renderHistoricalAndProjectionTable()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
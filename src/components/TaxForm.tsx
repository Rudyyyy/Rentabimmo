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
  currentSubTab: 'annee-courante' | 'historique-projection';
}

const REGIME_LABELS: { [key in TaxRegime]: string } = {
  'micro-foncier': 'Location nue - Micro-foncier',
  'reel-foncier': 'Location nue - Frais réels',
  'micro-bic': 'LMNP - Micro-BIC',
  'reel-bic': 'LMNP - Frais réels'
};

export default function TaxForm({ investment, onUpdate, currentSubTab }: Props) {
  const [selectedRegime, setSelectedRegime] = useState<TaxRegime>(investment.selectedRegime || 'micro-foncier');
  const [projectionRegime, setProjectionRegime] = useState<TaxRegime>('micro-foncier');
  const currentYear = new Date().getFullYear();

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

  // Synchronisation avec la sélection provenant de l'extérieur (sidebar)
  useEffect(() => {
    if (investment.selectedRegime && investment.selectedRegime !== selectedRegime) {
      setSelectedRegime(investment.selectedRegime);
    }
  }, [investment.selectedRegime]);

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
      {/* Section 1: Année courante */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Année courante</h3>
        <div className="h-96">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Section 2: Historique et projection */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Historique et projection</h3>

        {/* Graphiques de projection */}
        <div className="mt-6 space-y-6">
          {/* Graphique des totaux cumulés */}
          <div className="h-96">
            <Bar data={cumulativeChartData} options={cumulativeChartOptions} />
          </div>

          {/* Graphique d'évolution des revenus nets */}
          <div className="h-96">
            <Line 
              data={netIncomeEvolutionData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: true,
                    text: 'Évolution des revenus nets par régime fiscal'
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
                    ticks: {
                      callback: function(value: any) {
                        return formatCurrency(value);
                      }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Sélection du régime juste au-dessus du tableau */}
        <div className="mt-6 border-b border-gray-200">
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
    </div>
  );
}
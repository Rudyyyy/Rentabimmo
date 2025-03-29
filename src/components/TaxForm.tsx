import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { HelpCircle } from 'lucide-react';
import { Investment, TaxRegime, TaxResults, YearlyExpenses } from '../types/investment';
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
  }, [investment.taxParameters, selectedRegime, currentYear, investment.expenses]);

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

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  const formatPercent = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2 }).format(value / 100);

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
          {projectionRegime === 'reel-bic' && yearResults[projectionRegime].amortization && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults[projectionRegime].amortization.used || 0)}
            </td>
          )}
        </tr>
      );
    }

    return rows;
  };

  const renderHistoricalAndProjectionTable = () => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const rows = [];

    for (let year = startYear; year <= endYear; year++) {
      const yearResults = calculateAllTaxRegimes(investment, year);
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
          {projectionRegime === 'reel-bic' && yearResults[projectionRegime].amortization && (
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
              {formatCurrency(yearResults[projectionRegime].amortization.used || 0)}
            </td>
          )}
        </tr>
      );
    }

    return rows;
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

    for (let year = startYear; year <= endYear; year++) {
      const yearResults = calculateAllTaxRegimes(investment, year);
      Object.keys(totals).forEach(regime => {
        totals[regime as TaxRegime].netIncome += yearResults[regime as TaxRegime].netIncome;
        totals[regime as TaxRegime].tax += yearResults[regime as TaxRegime].tax;
        totals[regime as TaxRegime].socialCharges += yearResults[regime as TaxRegime].socialCharges;
      });
    }

    return totals;
  };

  // Données pour le graphique de comparaison des totaux cumulés
  const cumulativeChartData = {
    labels: Object.values(REGIME_LABELS),
    datasets: [
      {
        label: 'Revenu net total',
        data: Object.values(calculateCumulativeTotals()).map(result => result.netIncome),
        backgroundColor: 'rgba(16, 185, 129, 0.5)', // emerald
      },
      {
        label: 'Impôt sur le revenu total',
        data: Object.values(calculateCumulativeTotals()).map(result => result.tax),
        backgroundColor: 'rgba(239, 68, 68, 0.5)', // red
      },
      {
        label: 'Prélèvements sociaux totaux',
        data: Object.values(calculateCumulativeTotals()).map(result => result.socialCharges),
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

  const handleProjectionRegimeChange = (regime: TaxRegime) => {
    setProjectionRegime(regime);
  };

  const renderRevenueSection = () => {
    const currentYearExpense = investment.expenses.find(e => e.year === currentYear) || {
      rent: 0,
      furnishedRent: 0,
      tenantCharges: 0,
      taxBenefit: 0
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Loyer nu
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">€</span>
              </div>
              <input
                type="number"
                name="rent"
                value={currentYearExpense.rent || ''}
                onChange={(e) => handleExpenseChange(currentYear, 'rent', Number(e.target.value))}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Loyer meublé
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">€</span>
              </div>
              <input
                type="number"
                name="furnishedRent"
                value={currentYearExpense.furnishedRent || ''}
                onChange={(e) => handleExpenseChange(currentYear, 'furnishedRent', Number(e.target.value))}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Charges imputées au locataire
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">€</span>
              </div>
              <input
                type="number"
                name="tenantCharges"
                value={currentYearExpense.tenantCharges || ''}
                onChange={(e) => handleExpenseChange(currentYear, 'tenantCharges', Number(e.target.value))}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Aide fiscale aux loyers
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">€</span>
              </div>
              <input
                type="number"
                name="taxBenefit"
                value={currentYearExpense.taxBenefit || ''}
                onChange={(e) => handleExpenseChange(currentYear, 'taxBenefit', Number(e.target.value))}
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleExpenseChange = (year: number, field: keyof YearlyExpenses, value: number) => {
    const updatedExpenses = [...investment.expenses];
    const expenseIndex = updatedExpenses.findIndex(e => e.year === year);
    
    if (expenseIndex === -1) {
      updatedExpenses.push({
        year,
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
        interest: 0,
        [field]: value
      });
    } else {
      updatedExpenses[expenseIndex] = {
        ...updatedExpenses[expenseIndex],
        [field]: value
      };
    }

    onUpdate({
      ...investment,
      expenses: updatedExpenses.sort((a, b) => a.year - b.year)
    });
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
      return {
        label,
        data: (() => {
          const startYear = new Date(investment.projectStartDate).getFullYear();
          const endYear = new Date(investment.projectEndDate).getFullYear();
          return Array.from({ length: endYear - startYear + 1 }, (_, i) => {
            const year = startYear + i;
            const yearResults = calculateAllTaxRegimes(investment, year);
            return yearResults[regime as TaxRegime].netIncome;
          });
        })(),
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

          {/* Section des revenus */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-4">Revenus</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Loyer nu
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">€</span>
                  </div>
                  <input
                    type="number"
                    name="rent"
                    value={investment.taxParameters.rent || ''}
                    onChange={(e) => handleTaxParameterChange('rent', Number(e.target.value))}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Loyer meublé
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">€</span>
                  </div>
                  <input
                    type="number"
                    name="furnishedRent"
                    value={investment.taxParameters.furnishedRent || ''}
                    onChange={(e) => handleTaxParameterChange('furnishedRent', Number(e.target.value))}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Charges imputées au locataire
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">€</span>
                  </div>
                  <input
                    type="number"
                    name="tenantCharges"
                    value={investment.taxParameters.tenantCharges || ''}
                    onChange={(e) => handleTaxParameterChange('tenantCharges', Number(e.target.value))}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Aide fiscale aux loyers
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">€</span>
                  </div>
                  <input
                    type="number"
                    name="taxBenefit"
                    value={investment.taxParameters.taxBenefit || ''}
                    onChange={(e) => handleTaxParameterChange('taxBenefit', Number(e.target.value))}
                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Graphique de comparaison */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="h-96">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Graphique d'évolution des revenus nets */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="h-96">
              <Line data={netIncomeEvolutionData} options={netIncomeEvolutionOptions} />
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
                    onClick={() => setSelectedRegime(regime as TaxRegime)}
                    className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                      ${selectedRegime === regime
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
              {selectedRegime === 'micro-foncier' && (
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
              {selectedRegime === 'reel-foncier' && (
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
              {selectedRegime === 'micro-bic' && (
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
              {selectedRegime === 'reel-bic' && (
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
                          <li className="font-bold text-blue-700">Amortissement total disponible : {formatCurrency((investment.taxParameters.buildingValue / investment.taxParameters.buildingAmortizationYears) + (investment.taxParameters.furnitureValue / investment.taxParameters.furnitureAmortizationYears))}</li>
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

          {/* Graphique de comparaison des totaux cumulés */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="h-96">
              <Bar data={cumulativeChartData} options={cumulativeChartOptions} />
            </div>
          </div>

          {/* Graphique d'évolution des revenus nets */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="h-96">
              <Line data={netIncomeEvolutionData} options={netIncomeEvolutionOptions} />
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
                    onClick={(e) => {
                      e.preventDefault();
                      handleProjectionRegimeChange(regime as TaxRegime);
                    }}
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
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Année
                      </th>
                      {(projectionRegime === 'micro-foncier' || projectionRegime === 'reel-foncier') && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Loyer nu
                        </th>
                      )}
                      {(projectionRegime === 'micro-bic' || projectionRegime === 'reel-bic') && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Loyer meublé
                        </th>
                      )}
                      {(projectionRegime === 'micro-foncier' || projectionRegime === 'reel-foncier') && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Charges locataire
                        </th>
                      )}
                      {(projectionRegime === 'micro-foncier' || projectionRegime === 'reel-foncier') && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aide fiscale
                        </th>
                      )}
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
                          Déficit
                        </th>
                      )}
                      {projectionRegime === 'reel-bic' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amortissement
                        </th>
                      )}
                      {projectionRegime === 'reel-bic' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amortissement utilisé
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {renderHistoricalAndProjectionTable()}
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
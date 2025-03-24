import React from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { HelpCircle } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { FinancialMetrics, Investment } from '../types/investment';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface Props {
  metrics: FinancialMetrics;
  investment: Investment;
  currentYearData: {
    rent: number;
    expenses: number;
    totalInvestmentCost: number;
  };
  historicalData: {
    years: number[];
    cashFlow: number[];
    revenue: number[];
  };
  projectionData: {
    years: number[];
    cashFlow: number[];
    revenue: number[];
  };
}

export default function ResultsDisplay({ 
  metrics, 
  investment,
  currentYearData,
  historicalData,
  projectionData
}: Props) {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const formatPercent = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2 }).format(value / 100);

  const cashFlowData = {
    labels: [...historicalData.years, ...projectionData.years],
    datasets: [
      {
        label: 'Cash-flow historique',
        data: historicalData.cashFlow,
        borderColor: 'rgb(45, 212, 191)', // turquoise
        backgroundColor: 'rgba(45, 212, 191, 0.1)',
        tension: 0.1,
        fill: true
      },
      {
        label: 'Cash-flow projeté',
        data: Array(historicalData.cashFlow.length).fill(null).concat(projectionData.cashFlow),
        borderColor: 'rgb(168, 85, 247)', // pourpre
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.1,
        fill: true
      }
    ]
  };

  const revenueData = {
    labels: [...historicalData.years, ...projectionData.years],
    datasets: [
      {
        label: 'Revenus historiques',
        data: historicalData.revenue,
        borderColor: 'rgb(34, 197, 94)', // vert
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.1,
        fill: true
      },
      {
        label: 'Revenus projetés',
        data: Array(historicalData.revenue.length).fill(null).concat(projectionData.revenue),
        borderColor: 'rgb(249, 115, 22)', // orange
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.1,
        fill: true
      }
    ]
  };

  const expenseBreakdownData = {
    labels: ['Prêt', 'Charges', 'Travaux', 'Impôts', 'Autres'],
    datasets: [{
      data: [
        currentYearData.expenses * 0.4,
        currentYearData.expenses * 0.25,
        currentYearData.expenses * 0.15,
        currentYearData.expenses * 0.1,
        currentYearData.expenses * 0.1
      ],
      backgroundColor: [
        'rgb(59, 130, 246)', // bleu
        'rgb(234, 179, 8)',  // jaune
        'rgb(239, 68, 68)',  // rouge
        'rgb(168, 85, 247)', // pourpre
        'rgb(107, 114, 128)' // gris
      ]
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y);
            }
            return label;
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

  const getCashFlowColor = (value: number) => {
    if (value >= 0) return 'text-emerald-600';
    if (value >= -1200) return 'text-orange-600';
    return 'text-red-600';
  };

  const calculateTaxForYear = (year: number, previousYearDeficit: number = 0) => {
    const expense = investment.expenses.find(e => e.year === year);
    if (!expense) return { tax: 0, deficit: 0 };

    const rentalIncome = Number(expense.rent || 0);
    const tenantCharges = Number(expense.tenantCharges || 0);
    const totalIncome = rentalIncome + tenantCharges;

    if (investment.taxationMethod === 'micro') {
      // Régime micro-foncier : abattement forfaitaire de 30%
      const taxableAmount = totalIncome * 0.7;
      return {
        tax: taxableAmount * (investment.taxRate / 100),
        deficit: 0
      };
    } else {
      // Régime réel
      const deductibleExpenses = 
        Number(expense.propertyTax || 0) +
        Number(expense.condoFees || 0) +
        Number(expense.propertyInsurance || 0) +
        Number(expense.managementFees || 0) +
        Number(expense.unpaidRentInsurance || 0) +
        Number(expense.repairs || 0) +
        Number(expense.otherDeductible || 0) +
        Number(expense.loanInsurance || 0) +
        Number(expense.interest || 0);

      const taxableAmount = totalIncome - deductibleExpenses - previousYearDeficit;

      if (taxableAmount <= 0) {
        return {
          tax: 0,
          deficit: Math.abs(taxableAmount)
        };
      }

      return {
        tax: taxableAmount * (investment.taxRate / 100),
        deficit: 0
      };
    }
  };

  const renderSummaryTable = () => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const currentYear = new Date().getFullYear();
    let previousYearDeficit = 0;

    return Array.from({ length: endYear - startYear + 1 }, (_, index) => {
      const year = startYear + index;
      const expense = investment.expenses.find(e => e.year === year);
      
      if (!expense) return null;

      const totalRevenue = Number(expense.rent || 0);

      const totalExpenses = Number(expense.propertyTax || 0) +
                          Number(expense.condoFees || 0) +
                          Number(expense.propertyInsurance || 0) +
                          Number(expense.managementFees || 0) +
                          Number(expense.unpaidRentInsurance || 0) +
                          Number(expense.repairs || 0) +
                          Number(expense.otherDeductible || 0) +
                          Number(expense.otherNonDeductible || 0) +
                          Number(expense.loanPayment || 0) +
                          Number(expense.loanInsurance || 0);

      const { tax, deficit } = calculateTaxForYear(year, previousYearDeficit);
      previousYearDeficit = deficit;

      const cashFlow = totalRevenue - totalExpenses - tax;

      console.log(`Année ${year}:`, {
        revenus: totalRevenue,
        charges: totalExpenses,
        impot: tax,
        deficit: deficit,
        cashflow: cashFlow
      });

      return (
        <tr key={year} className={year === currentYear ? 'bg-blue-50' : ''}>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            {year}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
            {formatCurrency(totalRevenue)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-800">
            {formatCurrency(totalExpenses)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-800">
            {formatCurrency(tax)}
          </td>
          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getCashFlowColor(cashFlow)}`}>
            {formatCurrency(cashFlow)}
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">Rendement brut actuel</h3>
            <div className="group relative">
              <HelpCircle className="h-5 w-5 text-gray-400 cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-gray-900 text-white text-sm rounded-lg p-3 z-10">
                <p className="mb-2">Calcul : (Loyer annuel actuel / Prix d'achat total) × 100</p>
                <hr className="border-gray-600 my-2" />
                <p>Loyer annuel actuel : {formatCurrency(currentYearData.rent * 12)}</p>
                <p>Prix total : {formatCurrency(currentYearData.totalInvestmentCost)}</p>
              </div>
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-600">{formatPercent(metrics.grossYield)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">Rendement net actuel</h3>
            <div className="group relative">
              <HelpCircle className="h-5 w-5 text-gray-400 cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-gray-900 text-white text-sm rounded-lg p-3 z-10">
                <p className="mb-2">Calcul : ((Loyer annuel actuel - Charges annuelles actuelles) / Prix d'achat total) × 100</p>
                <hr className="border-gray-600 my-2" />
                <p>Loyer annuel actuel : {formatCurrency(currentYearData.rent * 12)}</p>
                <p>Charges annuelles actuelles : {formatCurrency(currentYearData.expenses * 12)}</p>
                <p>Prix total : {formatCurrency(currentYearData.totalInvestmentCost)}</p>
              </div>
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-600">{formatPercent(metrics.netYield)}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900">Cash-flow mensuel</h3>
            <div className="group relative">
              <HelpCircle className="h-5 w-5 text-gray-400 cursor-help" />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-72 bg-gray-900 text-white text-sm rounded-lg p-3 z-10">
                <p>Différence entre les revenus et les charges mensuels</p>
                <hr className="border-gray-600 my-2" />
                <p>Revenus mensuels : {formatCurrency(currentYearData.rent)}</p>
                <p>Charges mensuelles : {formatCurrency(currentYearData.expenses)}</p>
              </div>
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-600">{formatCurrency(metrics.monthlyCashFlow)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution du cash-flow</h3>
          <div className="h-64">
            <Line data={cashFlowData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution des revenus</h3>
          <div className="h-64">
            <Line data={revenueData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition des charges actuelles</h3>
          <div className="h-64">
            <Doughnut 
              data={expenseBreakdownData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: function(context: any) {
                        return `${context.label}: ${formatCurrency(context.raw)}`;
                      }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Analyse de sensibilité</h3>
          <div className="h-64">
            <Line 
              data={{
                labels: ['Taux actuel', '+0.5%', '+1%', '+1.5%', '+2%'],
                datasets: [
                  {
                    label: 'Impact sur les revenus',
                    data: [
                      currentYearData.rent * 12,
                      currentYearData.rent * 12 * 1.005,
                      currentYearData.rent * 12 * 1.01,
                      currentYearData.rent * 12 * 1.015,
                      currentYearData.rent * 12 * 1.02
                    ],
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.1,
                    fill: true
                  },
                  {
                    label: 'Impact sur les charges',
                    data: [
                      currentYearData.expenses * 12,
                      currentYearData.expenses * 12 * 1.005,
                      currentYearData.expenses * 12 * 1.01,
                      currentYearData.expenses * 12 * 1.015,
                      currentYearData.expenses * 12 * 1.02
                    ],
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.1,
                    fill: true
                  }
                ]
              }}
              options={chartOptions}
            />
          </div>
        </div>
      </div>

      {/* Tableau récapitulatif */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Récapitulatif annuel</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Année
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-emerald-600 uppercase tracking-wider">
                  Total recettes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">
                  Total dépenses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">
                  Imposition
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cash-flow
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {renderSummaryTable()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
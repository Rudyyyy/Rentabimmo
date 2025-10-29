import React from 'react';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Investment, TaxRegime } from '../types/investment';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface GeneralInfoSummaryProps {
  investment: Investment;
}

const regimeLabels: Record<TaxRegime, string> = {
  'micro-foncier': 'Location nue - Micro-foncier',
  'reel-foncier': 'Location nue - Frais réels',
  'micro-bic': 'LMNP - Micro-BIC',
  'reel-bic': 'LMNP - Frais réels',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);
}

function formatPercent(value: number) {
  return `${(value || 0).toFixed(2)}%`;
}

const GeneralInfoSummary: React.FC<GeneralInfoSummaryProps> = ({ investment }) => {
  // Années du projet
  const startYear = new Date(investment.projectStartDate).getFullYear();
  const endYear = new Date(investment.projectEndDate).getFullYear();
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  // Récupération des données annuelles
  const revenues: number[] = [];
  const expenses: number[] = [];
  const taxes: number[] = [];
  const cashFlows: number[] = [];

  years.forEach((year) => {
    const expense = investment.expenses.find((e) => e.year === year);
    if (expense) {
      const revenue = Number(expense.rent || 0) + Number(expense.tenantCharges || 0) + Number(expense.taxBenefit || 0);
      const expenseTotal =
        Number(expense.propertyTax || 0) +
        Number(expense.condoFees || 0) +
        Number(expense.propertyInsurance || 0) +
        Number(expense.managementFees || 0) +
        Number(expense.unpaidRentInsurance || 0) +
        Number(expense.repairs || 0) +
        Number(expense.otherDeductible || 0) +
        Number(expense.otherNonDeductible || 0) +
        Number(expense.loanPayment || 0) +
        Number(expense.loanInsurance || 0);
      // Imposition
      const tax = investment.taxResults?.[investment.selectedRegime]?.totalTax || 0;
      const cashFlow = revenue - expenseTotal - tax;
      revenues.push(revenue);
      expenses.push(expenseTotal);
      taxes.push(tax);
      cashFlows.push(cashFlow);
    } else {
      revenues.push(0);
      expenses.push(0);
      taxes.push(0);
      cashFlows.push(0);
    }
  });

  // Indicateurs synthétiques
  const regime = regimeLabels[investment.selectedRegime] || investment.selectedRegime;
  const netYield = investment.netYield || 0;
  const cashFlowNetAnnual = cashFlows[0] || 0; // année en cours = première année
  const cashFlowFinal = cashFlows[cashFlows.length - 1] || 0;
  // Solde de revente (fin d'opération)
  const saleBalance = investment.capitalGainResults?.[investment.selectedRegime]?.netCapitalGain || 0;

  // Préparation des données pour le graphique
  const chartData = {
    labels: years.map((y) => y.toString()),
    datasets: [
      {
        type: 'bar' as const,
        label: 'Revenus',
        data: revenues,
        backgroundColor: 'rgba(253, 224, 71, 0.7)', // jaune
        borderColor: 'rgba(202, 138, 4, 1)',
        borderWidth: 1,
        stack: 'stack1',
      },
      {
        type: 'bar' as const,
        label: 'Frais',
        data: expenses.map((v) => -v),
        backgroundColor: 'rgba(239, 68, 68, 0.7)', // rouge
        borderColor: 'rgba(153, 27, 27, 1)',
        borderWidth: 1,
        stack: 'stack1',
      },
      {
        type: 'bar' as const,
        label: 'Imposition',
        data: taxes.map((v) => -v),
        backgroundColor: 'rgba(120, 53, 15, 0.7)', // marron
        borderColor: 'rgba(120, 53, 15, 1)',
        borderWidth: 1,
        stack: 'stack1',
      },
      {
        type: 'line' as const,
        label: 'Cash flow net',
        data: cashFlows,
        borderColor: 'rgba(34,197,94,1)', // vert
        backgroundColor: 'rgba(34,197,94,0.2)',
        borderWidth: 3,
        pointRadius: 3,
        fill: false,
        yAxisID: 'y',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text: 'Revenus, Charges & Cash flow - Projection',
        font: { size: 18, weight: 700 },
        color: '#1e293b',
        padding: { top: 10, bottom: 20 },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Montant (€)' },
        ticks: {
          callback: function (value: any) {
            return formatCurrency(value);
          },
        },
      },
      x: {
        title: { display: true, text: 'Année' },
      },
    },
  };

  return (
    <div className="flex flex-row gap-6 w-full mt-4">
      {/* Carte synthèse */}
      <div className="w-1/4 min-w-[220px] max-w-[340px] bg-blue-50 rounded-xl shadow-lg p-7 flex flex-col gap-4 justify-between">
        <div>
          <div className="text-xs text-blue-900 font-medium uppercase tracking-wide mb-1">Régime</div>
          <div className="text-xl font-bold text-blue-900 mb-4 leading-tight">{regime}</div>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Rentabilité nette (année en cours)</span>
              <span className="text-lg font-bold {netYield >= 0 ? 'text-green-700' : 'text-red-600'}">{formatPercent(netYield)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cash-flow net annuel (année en cours)</span>
              <span className={`text-lg font-bold ${cashFlowNetAnnual >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(cashFlowNetAnnual)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Solde de revente (fin d'opération)</span>
              <span className="text-lg font-bold text-blue-700">{formatCurrency(saleBalance)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cash-flow en fin d'opération</span>
              <span className={`text-lg font-bold ${cashFlowFinal >= 0 ? 'text-green-700' : 'text-red-600'}`}>{formatCurrency(cashFlowFinal)}</span>
            </div>
          </div>
        </div>
      </div>
      {/* Carte graphique */}
      <div className="w-3/4 min-h-[320px] bg-white rounded-xl shadow-lg p-6 flex flex-col justify-between">
        <h3 className="text-base font-semibold text-gray-800 mb-2">Revenus, Charges & Cash flow - Projection</h3>
        <div className="flex-1">
          <Chart type="bar" data={chartData} options={chartOptions} height={320} />
        </div>
      </div>
    </div>
  );
};

export default GeneralInfoSummary; 
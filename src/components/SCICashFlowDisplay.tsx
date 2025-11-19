/**
 * Composant SCICashFlowDisplay
 * 
 * Ce composant affiche une analyse détaillée des flux de trésorerie pour les biens détenus en SCI.
 * Contrairement aux biens en nom propre, les régimes fiscaux IRPP ne s'appliquent pas.
 * 
 * Fonctionnalités principales :
 * - Comparaison entre location nue et location meublée uniquement
 * - Calcul du cash flow net (revenus - charges - coûts prêt)
 * - Application du prorata temporel pour les années incomplètes
 * - Inclusion automatique des coûts du prêt calculés dynamiquement
 * - Visualisation graphique de l'évolution du cash flow
 */

import { useState } from 'react';
import { Investment } from '../types/investment';
import { getLoanInfoForYear, getYearCoverage, isPartialYear } from '../utils/propertyCalculations';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  investment: Investment;
}

type RentalType = 'unfurnished' | 'furnished';

const RENTAL_TYPE_LABELS: Record<RentalType, string> = {
  'unfurnished': 'Location nue',
  'furnished': 'Location meublée'
};

export default function SCICashFlowDisplay({ investment }: Props) {
  // État pour le type de location sélectionné
  const [selectedRentalType, setSelectedRentalType] = useState<RentalType>('unfurnished');

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  /**
   * Ajuste une valeur selon le prorata temporel de l'année
   * @param value - Valeur annuelle à ajuster
   * @param coverage - Pourcentage de couverture de l'année (0-1)
   * @returns Valeur ajustée au prorata temporel
   */
  const adjustForCoverage = (value: number, coverage: number): number => {
    return value * coverage;
  };

  /**
   * Prépare les données pour le graphique de cash flow
   */
  const prepareChartData = () => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const years = Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => startYear + i
    );

    const datasets = (['unfurnished', 'furnished'] as RentalType[]).map(rentalType => {
      const data = years.map(year => {
        const yearExpense = investment.expenses.find(e => e.year === year);
        if (!yearExpense) return 0;

        // Calculer le prorata temporel
        const coverage = getYearCoverage(investment, year);

        // Revenus avec prorata
        const rent = adjustForCoverage(Number(yearExpense.rent || 0), coverage);
        const furnishedRent = adjustForCoverage(Number(yearExpense.furnishedRent || 0), coverage);
        const taxBenefit = adjustForCoverage(Number(yearExpense.taxBenefit || 0), coverage);
        const tenantCharges = adjustForCoverage(Number(yearExpense.tenantCharges || 0), coverage);
        
        const revenues = rentalType === 'furnished'
          ? furnishedRent + tenantCharges
          : rent + taxBenefit + tenantCharges;

        // Charges de gestion avec prorata
        const managementExpenses = 
          adjustForCoverage(Number(yearExpense.propertyTax || 0), coverage) +
          adjustForCoverage(Number(yearExpense.condoFees || 0), coverage) +
          adjustForCoverage(Number(yearExpense.propertyInsurance || 0), coverage) +
          adjustForCoverage(Number(yearExpense.managementFees || 0), coverage) +
          adjustForCoverage(Number(yearExpense.unpaidRentInsurance || 0), coverage) +
          adjustForCoverage(Number(yearExpense.repairs || 0), coverage) +
          adjustForCoverage(Number(yearExpense.otherDeductible || 0), coverage) +
          adjustForCoverage(Number(yearExpense.otherNonDeductible || 0), coverage);

        // Coûts du prêt calculés dynamiquement
        const loanInfo = getLoanInfoForYear(investment, year);
        const loanCosts = loanInfo.payment + loanInfo.insurance;

        const totalExpenses = managementExpenses + loanCosts;
        const cashFlow = revenues - totalExpenses;

        return cashFlow;
      });

      return {
        label: RENTAL_TYPE_LABELS[rentalType],
        data: data,
        borderColor: getRentalTypeColor(rentalType),
        backgroundColor: getRentalTypeColor(rentalType, 0.1),
        tension: 0.4
      };
    });

    return {
      labels: years,
      datasets
    };
  };

  const getRentalTypeColor = (rentalType: RentalType, alpha: number = 1) => {
    const colors = {
      'unfurnished': `rgba(59, 130, 246, ${alpha})`, // blue
      'furnished': `rgba(245, 158, 11, ${alpha})`    // yellow/orange
    };
    return colors[rentalType];
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
        text: 'Évolution du cash flow net'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  /**
   * Rendu du tableau de cash flow
   */
  const renderCashFlowTable = (rentalType: RentalType) => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const years = Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => startYear + i
    );

    return (
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
                Dépenses
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cash Flow Net
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mensualisé
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {years.map(year => {
              const yearExpense = investment.expenses.find(e => e.year === year);
              if (!yearExpense) return null;

              // Calculer le prorata temporel
              const coverage = getYearCoverage(investment, year);

              // Revenus avec prorata
              const rent = adjustForCoverage(Number(yearExpense.rent || 0), coverage);
              const furnishedRent = adjustForCoverage(Number(yearExpense.furnishedRent || 0), coverage);
              const taxBenefit = adjustForCoverage(Number(yearExpense.taxBenefit || 0), coverage);
              const tenantCharges = adjustForCoverage(Number(yearExpense.tenantCharges || 0), coverage);
              
              const revenues = rentalType === 'furnished'
                ? furnishedRent + tenantCharges
                : rent + taxBenefit + tenantCharges;

              // Charges de gestion avec prorata
              const managementExpenses = 
                adjustForCoverage(Number(yearExpense.propertyTax || 0), coverage) +
                adjustForCoverage(Number(yearExpense.condoFees || 0), coverage) +
                adjustForCoverage(Number(yearExpense.propertyInsurance || 0), coverage) +
                adjustForCoverage(Number(yearExpense.managementFees || 0), coverage) +
                adjustForCoverage(Number(yearExpense.unpaidRentInsurance || 0), coverage) +
                adjustForCoverage(Number(yearExpense.repairs || 0), coverage) +
                adjustForCoverage(Number(yearExpense.otherDeductible || 0), coverage) +
                adjustForCoverage(Number(yearExpense.otherNonDeductible || 0), coverage);

              // Coûts du prêt calculés dynamiquement
              const loanInfo = getLoanInfoForYear(investment, year);
              const loanCosts = loanInfo.payment + loanInfo.insurance;

              const totalExpenses = managementExpenses + loanCosts;
              const cashFlow = revenues - totalExpenses;
              
              // Calculer le mensualisé en fonction de la couverture
              const monthsInYear = coverage * 12;
              const monthlyCashFlow = monthsInYear > 0 ? cashFlow / monthsInYear : 0;

              const isPartial = isPartialYear(investment, year);

              return (
                <tr key={year} className={isPartial ? 'bg-amber-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{year}</span>
                      {isPartial && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">partiel</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(revenues)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(totalExpenses)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                    cashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(cashFlow)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                    monthlyCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(monthlyCashFlow)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const handleRentalTypeChange = (rentalType: RentalType) => {
    setSelectedRentalType(rentalType);
  };

  const chartData = prepareChartData();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Bannière d'information SCI */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <span className="font-medium">Bien détenu en SCI à l'IS</span> - Le cash flow est calculé hors imposition. 
              L'IS sera calculé au niveau de la SCI sur l'ensemble de ses biens.
            </p>
          </div>
        </div>
      </div>

      {/* Graphique d'évolution du cash flow net */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-lg font-semibold mb-4">Évolution du cash flow net</h3>
        <div className="h-80">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Onglets des types de location */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex" aria-label="Tabs">
            {(['unfurnished', 'furnished'] as RentalType[]).map((rentalType) => (
              <div
                key={rentalType}
                onClick={() => handleRentalTypeChange(rentalType)}
                className={`
                  flex-1 py-4 px-4 text-center border-b-2 font-medium text-sm cursor-pointer
                  ${selectedRentalType === rentalType
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {RENTAL_TYPE_LABELS[rentalType]}
              </div>
            ))}
          </nav>
        </div>

        {/* Contenu de l'onglet */}
        <div className="p-6">
          {renderCashFlowTable(selectedRentalType)}
          
          {/* Section explicative */}
          <div className="mt-8 bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Détail des calculs</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Revenus</h4>
                <p className="text-sm text-gray-600">
                  {selectedRentalType === 'furnished' 
                    ? 'Loyer meublé + Charges locataires'
                    : 'Loyer nu + Aide fiscale + Charges locataires'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Les montants sont ajustés au prorata temporel pour les années incomplètes.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Dépenses</h4>
                <p className="text-sm text-gray-600">
                  Charges de gestion + Coûts du prêt :
                  <ul className="list-disc ml-6 mt-2">
                    <li>Taxe foncière</li>
                    <li>Charges de copropriété</li>
                    <li>Assurance propriétaire</li>
                    <li>Frais d'agence</li>
                    <li>Assurance loyers impayés</li>
                    <li>Travaux</li>
                    <li>Autres charges déductibles</li>
                    <li>Autres charges non déductibles</li>
                    <li className="font-semibold text-blue-700">Remboursement du prêt</li>
                    <li className="font-semibold text-blue-700">Assurance emprunteur</li>
                  </ul>
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Cash Flow Net</h4>
                <p className="text-sm text-gray-600">
                  Revenus - Dépenses (hors imposition)
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Note : L'impôt sur les sociétés (IS) est calculé au niveau de la SCI sur l'ensemble 
                  de ses biens dans l'onglet "Imposition".
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Mensualisé</h4>
                <p className="text-sm text-gray-600">
                  Cash Flow Net / Nombre de mois effectifs dans l'année
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Pour les années complètes : divisé par 12. Pour les années partielles : divisé par le nombre de mois réels.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


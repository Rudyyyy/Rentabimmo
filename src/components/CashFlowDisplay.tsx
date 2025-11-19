/**
 * Composant CashFlowDisplay
 * 
 * Ce composant affiche une analyse détaillée des flux de trésorerie d'un investissement immobilier :
 * 1. Un graphique montrant l'évolution du cash flow net par régime fiscal
 * 2. Un tableau détaillé des revenus, dépenses et cash flow pour chaque année
 * 3. Une section explicative des calculs effectués
 * 
 * Fonctionnalités principales :
 * - Comparaison des différents régimes fiscaux (micro-foncier, réel-foncier, micro-bic, réel-bic)
 * - Calcul automatique des revenus et dépenses selon le régime
 * - Visualisation de l'évolution du cash flow dans le temps
 * - Persistance du régime fiscal sélectionné
 * 
   * Les calculs prennent en compte :
   * - Les revenus locatifs (nu ou meublé selon le régime)
   * - Les charges et dépenses déductibles et non déductibles
   * - Les remboursements de prêt
 */

import { useState, useEffect } from 'react';
import { Investment, TaxResults } from '../types/investment';
import { TaxRegime } from '../types/tax';
import { calculateAllTaxRegimes } from '../utils/taxCalculations';
import { calculateRevenuesWithVacancy } from '../utils/calculations';
import { getYearCoverage, getLoanInfoForYear, adjustForCoverage, isPartialYear } from '../utils/propertyCalculations';
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

// Configuration de Chart.js pour le graphique
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Interface définissant les props du composant
interface Props {
  investment: Investment;
}

// Labels pour les différents régimes fiscaux
const REGIME_LABELS: Record<TaxRegime, string> = {
  'micro-foncier': 'Location nue - Micro-foncier',
  'reel-foncier': 'Location nue - Frais réels',
  'micro-bic': 'LMNP - Micro-BIC',
  'reel-bic': 'LMNP - Frais réels'
};

export default function CashFlowDisplay({ investment }: Props) {
  // État du régime fiscal sélectionné, persistant dans le localStorage
  const [selectedRegime, setSelectedRegime] = useState<TaxRegime>(investment.selectedRegime || 'micro-foncier');

  // Créer un identifiant unique basé sur le prix d'achat et la date de début
  const investmentId = `${investment.purchasePrice}_${investment.startDate}`;

  // Sauvegarde du régime sélectionné dans le localStorage
  useEffect(() => {
    localStorage.setItem(`selectedRegime_${investmentId}`, selectedRegime);
  }, [selectedRegime, investmentId]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  /**
   * Prépare les données pour le graphique de cash flow
   * Calcule le cash flow net pour chaque année et régime fiscal
   * Maintient les résultats fiscaux de chaque année pour chaque régime
   */
  const prepareChartData = () => {
    // Générer les années du projet
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const years = Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => startYear + i
    );

    // Plus de calcul ni d'utilisation de l'imposition dans le cash flow

    const datasets = (Object.keys(REGIME_LABELS) as TaxRegime[]).map(regime => {
      const data = years.map(year => {
        const yearExpense = investment.expenses.find(e => e.year === year);
        if (!yearExpense) return 0;

        // Calculer le prorata temporel de l'année
        const coverage = getYearCoverage(investment, year);

        // Ajuster les valeurs de revenus pour la couverture avant de calculer avec vacance
        const adjustedRent = adjustForCoverage(Number(yearExpense.rent || 0), coverage);
        const adjustedFurnishedRent = adjustForCoverage(Number(yearExpense.furnishedRent || 0), coverage);
        const adjustedTenantCharges = adjustForCoverage(Number(yearExpense.tenantCharges || 0), coverage);
        const adjustedTaxBenefit = adjustForCoverage(Number(yearExpense.taxBenefit || 0), coverage);
        
        // Créer un yearExpense ajusté temporaire pour calculateRevenuesWithVacancy
        const adjustedYearExpense = {
          ...yearExpense,
          rent: adjustedRent,
          furnishedRent: adjustedFurnishedRent,
          tenantCharges: adjustedTenantCharges,
          taxBenefit: adjustedTaxBenefit
        };
        
        // Calcul des revenus selon le régime avec vacance locative (sur valeurs ajustées)
        const revenues = calculateRevenuesWithVacancy(
          adjustedYearExpense,
          regime,
          investment.expenseProjection.vacancyRate || 0
        );

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

        // Coûts du prêt calculés dynamiquement (prorata automatique)
        const loanInfo = getLoanInfoForYear(investment, year);
        const loanCosts = loanInfo.payment + loanInfo.insurance;

        const totalExpenses = managementExpenses + loanCosts;

        // Cash flow (sans imposition)
        const cashFlow = revenues - totalExpenses;
        return cashFlow;
      });

      return {
        label: REGIME_LABELS[regime],
        data: data,
        borderColor: getRegimeColor(regime),
        backgroundColor: getRegimeColor(regime, 0.1),
        tension: 0.4
      };
    });

    return {
      labels: years,
      datasets
    };
  };

  /**
   * Fonction utilitaire pour obtenir la couleur associée à un régime fiscal
   * @param regime Le régime fiscal
   * @param alpha La transparence (0-1)
   */
  const getRegimeColor = (regime: TaxRegime, alpha: number = 1) => {
    const colors = {
      'micro-foncier': `rgba(59, 130, 246, ${alpha})`, // blue
      'reel-foncier': `rgba(16, 185, 129, ${alpha})`, // emerald
      'micro-bic': `rgba(245, 158, 11, ${alpha})`,    // yellow
      'reel-bic': `rgba(239, 68, 68, ${alpha})`       // red
    };
    return colors[regime];
  };

  /**
   * Configuration des options du graphique
   * Définit l'apparence et le comportement du graphique
   */
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Évolution du cash flow par régime fiscal'
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
        beginAtZero: false,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  const chartData = prepareChartData();

  /**
   * Rendu du tableau de cash flow pour un régime fiscal donné
   * Affiche les détails année par année
   */
  const renderCashFlowTable = (regime: TaxRegime) => {
    // Générer les années du projet
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const years = Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => startYear + i
    );

    // Plus de calcul ni de journalisation liés à l'imposition pour le tableau

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

              // Calculer le prorata temporel de l'année
              const coverage = getYearCoverage(investment, year);

              // Ajuster les valeurs de revenus pour la couverture avant de calculer avec vacance
              const adjustedRent = adjustForCoverage(Number(yearExpense.rent || 0), coverage);
              const adjustedFurnishedRent = adjustForCoverage(Number(yearExpense.furnishedRent || 0), coverage);
              const adjustedTenantCharges = adjustForCoverage(Number(yearExpense.tenantCharges || 0), coverage);
              const adjustedTaxBenefit = adjustForCoverage(Number(yearExpense.taxBenefit || 0), coverage);
              
              // Créer un yearExpense ajusté temporaire pour calculateRevenuesWithVacancy
              const adjustedYearExpense = {
                ...yearExpense,
                rent: adjustedRent,
                furnishedRent: adjustedFurnishedRent,
                tenantCharges: adjustedTenantCharges,
                taxBenefit: adjustedTaxBenefit
              };
              
              // Calcul des revenus selon le régime avec vacance locative (sur valeurs ajustées)
              const revenues = calculateRevenuesWithVacancy(
                adjustedYearExpense,
                regime,
                investment.expenseProjection.vacancyRate || 0
              );

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

              // Coûts du prêt calculés dynamiquement (prorata automatique)
              const loanInfo = getLoanInfoForYear(investment, year);
              const loanCosts = loanInfo.payment + loanInfo.insurance;

              const totalExpenses = managementExpenses + loanCosts;

              // Cash flow (sans imposition)
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

  /**
   * Gestionnaire de changement de régime fiscal
   */
  const handleRegimeChange = (regime: TaxRegime) => {
    setSelectedRegime(regime);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Graphique d'évolution du cash flow net */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-lg font-semibold mb-4">Évolution du cash flow net par régime fiscal</h3>
        <div className="h-80">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Onglets des régimes */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex" aria-label="Tabs">
            {(Object.keys(REGIME_LABELS) as TaxRegime[]).map((regime) => (
              <div
                key={regime}
                onClick={() => handleRegimeChange(regime)}
                className={`
                  flex-1 py-4 px-4 text-center border-b-2 font-medium text-sm cursor-pointer
                  ${selectedRegime === regime
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {REGIME_LABELS[regime]}
              </div>
            ))}
          </nav>
        </div>

        {/* Contenu de l'onglet */}
        <div className="p-6">
          {renderCashFlowTable(selectedRegime)}
          
          {/* Section explicative */}
          <div className="mt-8 bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Détail des calculs</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Revenus</h4>
                <p className="text-sm text-gray-600">
                  {selectedRegime === 'micro-bic' || selectedRegime === 'reel-bic' 
                    ? 'Loyer meublé + Charges locataires'
                    : 'Loyer nu + Aide fiscale + Charges locataires'}
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Dépenses</h4>
                <p className="text-sm text-gray-600">
                  Total des dépenses de l'année :
                  <ul className="list-disc ml-6 mt-2">
                    <li>Taxe foncière</li>
                    <li>Charges de copropriété</li>
                    <li>Assurance propriétaire</li>
                    <li>Frais d'agence</li>
                    <li>Assurance loyers impayés</li>
                    <li>Travaux</li>
                    <li>Autres charges déductibles</li>
                    <li>Autres charges non déductibles</li>
                  </ul>
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900">Cash Flow</h4>
                <p className="text-sm text-gray-600">
                  Revenus - Dépenses
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
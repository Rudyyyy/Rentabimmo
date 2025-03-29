/**
 * Composant BalanceDisplay
 * 
 * Ce composant affiche une analyse complète de la rentabilité d'un investissement immobilier :
 * 1. Une synthèse avec le meilleur scénario de revente
 * 2. Un graphique montrant l'évolution du rendement annuel par régime fiscal
 * 3. Un tableau détaillé des résultats année par année
 * 
 * Fonctionnalités principales :
 * - Calcul du rendement optimal en tenant compte de tous les régimes fiscaux
 * - Visualisation de l'évolution du rendement annuel
 * - Analyse détaillée des flux de trésorerie et des gains
 * - Persistance du régime fiscal sélectionné
 * 
 * Les calculs prennent en compte :
 * - Les revenus locatifs
 * - Les charges et dépenses
 * - L'imposition selon le régime fiscal
 * - La revente du bien avec revalorisation
 * - Le remboursement du prêt
 */

import React, { useState, useEffect } from 'react';
import { Investment, TaxRegime } from '../types/investment';
import { calculateAllTaxRegimes } from '../utils/taxCalculations';
import { generateAmortizationSchedule } from '../utils/calculations';
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

interface BalanceData {
  years: number[];
  data: Record<TaxRegime, Array<{
    annualCashFlow: number;
    cumulativeCashFlow: number;
    saleBalance: number;
    totalGain: number;
  }>>;
}

// Labels pour les différents régimes fiscaux
const REGIME_LABELS: Record<TaxRegime, string> = {
  'micro-foncier': 'Location nue - Micro-foncier',
  'reel-foncier': 'Location nue - Frais réels',
  'micro-bic': 'LMNP - Micro-BIC',
  'reel-bic': 'LMNP - Frais réels'
};

const BalanceDisplay: React.FC<Props> = ({ investment }) => {
  // Identifiant unique pour le stockage local
  const investmentId = `${investment.purchasePrice}_${investment.startDate}`;
  
  // État du régime fiscal sélectionné, persistant dans le localStorage
  const [selectedRegime, setSelectedRegime] = useState<TaxRegime>(() => {
    const stored = localStorage.getItem(`selectedRegime_${investmentId}`);
    return (stored as TaxRegime) || 'micro-foncier';
  });

  // Sauvegarde du régime sélectionné dans le localStorage
  useEffect(() => {
    localStorage.setItem(`selectedRegime_${investmentId}`, selectedRegime);
  }, [selectedRegime, investmentId]);

  // État pour stocker les données calculées pour chaque année et régime
  const [balanceData, setBalanceData] = useState<BalanceData>({
    years: [],
    data: {
      'micro-foncier': [],
      'reel-foncier': [],
      'micro-bic': [],
      'reel-bic': []
    }
  });

   // Fonctions utilitaires pour le formatage
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  const formatPercent = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  /**
   * Calcul des données de balance pour chaque année et régime fiscal
   * Cette fonction est mémorisée pour éviter les recalculs inutiles
   */
  const calculateBalanceData = React.useCallback(() => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    
    const data: Record<TaxRegime, Array<{
      saleBalance: number;
      cumulativeCashFlow: number;
      annualCashFlow: number;
      totalGain: number;
    }>> = {
      'micro-foncier': [],
      'reel-foncier': [],
      'micro-bic': [],
      'reel-bic': []
    };

    // Calculer pour chaque régime
    (Object.keys(REGIME_LABELS) as TaxRegime[]).forEach((regime) => {
      let cumulativeCashFlow = 0;
      
      years.forEach((year) => {
        // Récupérer les dépenses de l'année
        const yearExpense = investment.expenses.find(e => e.year === year);
        
        // Calculer le cash flow annuel comme dans la page Cash Flow
        let annualCashFlow = 0;
        if (yearExpense) {
          const revenues = Number(yearExpense.rent || 0) + 
                         Number(yearExpense.tenantCharges || 0) + 
                         Number(yearExpense.taxBenefit || 0);
          const expenses = 
            Number(yearExpense.propertyTax || 0) +
            Number(yearExpense.condoFees || 0) +
            Number(yearExpense.propertyInsurance || 0) +
            Number(yearExpense.managementFees || 0) +
            Number(yearExpense.unpaidRentInsurance || 0) +
            Number(yearExpense.repairs || 0) +
            Number(yearExpense.otherDeductible || 0) +
            Number(yearExpense.otherNonDeductible || 0) +
            Number(yearExpense.loanPayment || 0) +
            Number(yearExpense.loanInsurance || 0);

          // Calculer l'imposition pour ce régime et cette année
          const yearResults = calculateAllTaxRegimes(investment, year);
          const taxation = yearResults[regime].totalTax;
          
          annualCashFlow = revenues - expenses - taxation;
        }
        cumulativeCashFlow += annualCashFlow;

        // Calculer le solde de revente pour chaque année
        // Récupérer les paramètres de vente du localStorage
        const storedParams = localStorage.getItem(`saleParameters_${investmentId}`);
        const saleParams = storedParams ? JSON.parse(storedParams) : {
          annualIncrease: 2,
          agencyFees: 0,
          earlyRepaymentFees: 0
        };

        // Calculer le prix de vente revalorisé
        const yearsSincePurchase = year - new Date(investment.projectStartDate).getFullYear();
        const revaluedValue = Number(investment.purchasePrice) * Math.pow(1 + (saleParams.annualIncrease / 100), yearsSincePurchase);
        const netSellingPrice = revaluedValue - Number(saleParams.agencyFees);

        // Calculer le capital restant dû
        const amortizationSchedule = generateAmortizationSchedule(
          Number(investment.loanAmount),
          Number(investment.interestRate),
          Number(investment.loanDuration),
          investment.deferralType,
          Number(investment.deferredPeriod),
          investment.startDate
        );

        // Trouver le dernier paiement de l'année
        const yearEndDate = new Date(year, 11, 31);
        const lastPayment = amortizationSchedule.schedule
          .filter(row => new Date(row.date) <= yearEndDate)
          .pop();

        // Utiliser le capital restant du dernier paiement ou le montant initial du prêt
        const remainingBalance = lastPayment ? lastPayment.remainingBalance : Number(investment.loanAmount);
        const totalDebt = remainingBalance + Number(saleParams.earlyRepaymentFees);

        const saleBalance = netSellingPrice - totalDebt;

        // Calculer le gain total
        const totalGain = cumulativeCashFlow + saleBalance;

        data[regime].push({
          saleBalance,
          cumulativeCashFlow,
          annualCashFlow,
          totalGain
        });
      });
    });

    setBalanceData({ years, data });
  }, [investment, investmentId]);

  // Calcul des données à chaque changement d'investissement
  useEffect(() => {
    calculateBalanceData();
  }, [calculateBalanceData]);

  /**
   * Configuration des données pour le graphique
   * Affiche l'évolution du rendement annuel pour chaque régime
   * Les 2 premières années sont ignorées pour une meilleure lisibilité
   */
  const chartData = {
    labels: balanceData.years.slice(2), // Ignorer les 2 premières années
    datasets: Object.entries(REGIME_LABELS).map(([regime, label], index) => {
      const colors = [
        'rgba(59, 130, 246, 1)', // blue
        'rgba(16, 185, 129, 1)', // green
        'rgba(139, 92, 246, 1)', // purple
        'rgba(245, 158, 11, 1)'  // yellow
      ];
      
      return {
        label,
        data: balanceData.years.slice(2).map((year, yearIndex) => {
          const startYear = new Date(investment.projectStartDate).getFullYear();
          const numberOfYears = year - startYear + 1;
          const index = yearIndex + 2; // Ajouter 2 pour compenser le slice
          
          const cashFlow = balanceData.data[regime as TaxRegime]?.[index]?.cumulativeCashFlow || 0;
          const saleBalance = balanceData.data[regime as TaxRegime]?.[index]?.saleBalance || 0;
          const downPayment = Number(investment.downPayment) || 0;
          
          const revenues = cashFlow >= 0 ? saleBalance + cashFlow : saleBalance;
          const effort = cashFlow > 0 ? downPayment : downPayment - cashFlow;
          
          // Calculer le rendement annuel
          return effort !== 0 ? (Math.pow(revenues / effort, 1 / numberOfYears) - 1) * 100 : 0;
        }),
        borderColor: colors[index],
        backgroundColor: colors[index],
        tension: 0.4,
        fill: false
      };
    })
  };

  /**
   * Options de configuration du graphique
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
        text: 'Évolution du rendement annuel par régime fiscal'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${context.raw.toFixed(2)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          }
        },
        title: {
          display: true,
          text: 'Rendement annuel (%)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Année'
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Section de synthèse avec le meilleur scénario */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-900">Solde en fin d'opération</h2>
        
        {(() => {
          // Trouver le meilleur rendement parmi tous les régimes et années (après la 2ème année)
          let bestReturn = -Infinity;
          let bestYear = 0;
          let bestRegime: TaxRegime = 'micro-foncier';
          let bestSaleBalance = 0;
          let bestCashFlow = 0;
          let bestNumberOfYears = 0;

          Object.entries(balanceData.data).forEach(([regime, data]) => {
            data.forEach((yearData, index) => {
              const year = balanceData.years[index];
              const startYear = new Date(investment.projectStartDate).getFullYear();
              const numberOfYears = year - startYear + 1;
              
              if (numberOfYears > 2) { // Ignorer les 2 premières années
                const cashFlow = yearData.cumulativeCashFlow;
                const saleBalance = yearData.saleBalance;
                const downPayment = Number(investment.downPayment) || 0;
                const revenues = cashFlow >= 0 ? saleBalance + cashFlow : saleBalance;
                const effort = cashFlow > 0 ? downPayment : downPayment - cashFlow;
                const annualReturn = effort !== 0 ? Math.pow(revenues / effort, 1 / numberOfYears) - 1 : 0;

                if (annualReturn > bestReturn) {
                  bestReturn = annualReturn;
                  bestYear = year;
                  bestRegime = regime as TaxRegime;
                  bestSaleBalance = saleBalance;
                  bestCashFlow = cashFlow;
                  bestNumberOfYears = numberOfYears;
                }
              }
            });
          });

          const monthlyCashFlow = bestCashFlow / bestNumberOfYears / 12;

          return (
            <p className="mt-4 text-gray-600 text-lg">
              Le projet apportera un rendement optimal avec une revente en <span className="font-bold">{bestYear}</span>. 
              Il générera un solde de <span className="font-bold">{formatCurrency(bestSaleBalance)}</span>, 
              pour un cash flow mensuel moyen de <span className="font-bold">{formatCurrency(monthlyCashFlow)}</span> et 
              un rendement de <span className="font-bold">{formatPercent(bestReturn)}</span> avec le régime {REGIME_LABELS[bestRegime]}.
            </p>
          );
        })()}

        <p className="mt-1 text-sm text-gray-500">
          Analyse du gain total (revente + cash flow) selon l'année de sortie et le régime fiscal
        </p>
      </div>

      {/* Graphique d'évolution du rendement annuel */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="h-96">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Navigation des régimes fiscaux et tableau détaillé */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {(Object.entries(REGIME_LABELS) as [TaxRegime, string][]).map(([regime, label]) => (
              <button
                key={regime}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedRegime(regime);
                }}
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

        {/* Tableau des résultats */}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Année
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Apport
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Effort
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cash Flow annuel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cash Flow cumulé
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Solde revente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gain total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenus
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % de gain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % annuel
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {balanceData.years.map((year, index) => {
                const downPayment = Number(investment.downPayment) || 0;
                const totalGain = balanceData.data[selectedRegime]?.[index]?.totalGain || 0;
                const cashFlow = balanceData.data[selectedRegime]?.[index]?.cumulativeCashFlow || 0;
                const annualCashFlow = balanceData.data[selectedRegime]?.[index]?.annualCashFlow || 0;
                const saleBalance = balanceData.data[selectedRegime]?.[index]?.saleBalance || 0;
                const revenues = cashFlow >= 0 ? saleBalance + cashFlow : saleBalance;
                const effort = cashFlow > 0 ? downPayment : downPayment - cashFlow;
                const gainPercent = effort !== 0 ? revenues / effort : 0;
                
                // Calcul du taux de rendement annuel composé
                const startYear = new Date(investment.projectStartDate).getFullYear();
                const numberOfYears = year - startYear + 1;
                const annualReturn = effort !== 0 ? Math.pow(revenues / effort, 1 / numberOfYears) - 1 : 0;
                
                return (
                  <tr key={year} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(downPayment)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(effort)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(annualCashFlow)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(cashFlow)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(saleBalance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(totalGain)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                      {formatCurrency(revenues)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                      {formatPercent(gainPercent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600">
                      {formatPercent(annualReturn)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BalanceDisplay; 
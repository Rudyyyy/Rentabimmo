/**
 * Composant SCIBalanceDisplay
 * 
 * Ce composant affiche une analyse complète de la rentabilité d'un bien en SCI :
 * 1. Une synthèse avec le meilleur scénario de revente
 * 2. Un graphique montrant l'évolution du rendement annuel
 * 3. Un tableau détaillé des résultats année par année
 * 
 * Différences avec les biens en nom propre :
 * - Seulement 2 types : location nue / location meublée (pas de régimes fiscaux IRPP)
 * - Impôt sur la plus-value calculé selon les règles de l'IS (25%)
 * - Pas d'abattement pour durée de détention
 * - Prorata temporel appliqué pour les années incomplètes
 */

import React, { useState, useEffect } from 'react';
import { Investment } from '../types/investment';
import { generateAmortizationSchedule, calculateRevenuesWithVacancy } from '../utils/calculations';
import { getLoanInfoForYear, getYearCoverage } from '../utils/propertyCalculations';
import { Line } from 'react-chartjs-2';
import { Chart as ReactChart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Interface définissant les props du composant
interface Props {
  investment: Investment;
  currentSubTab?: string;
}

// Type de location pour SCI
type RentalType = 'unfurnished' | 'furnished';

// Interface pour stocker les données de balance calculées
interface BalanceData {
  years: number[];
  data: Record<RentalType, Array<BalanceYearResult>>;
}

// Interface pour les résultats annuels de balance
interface BalanceYearResult {
  annualCashFlow: number; // Cash flow net annuel
  cumulativeCashFlow: number; // Cash flow cumulé NET
  cumulativeCashFlowBeforeTax: number; // Cash flow cumulé SANS imposition
  cumulativeTax: number; // IS cumulé (sera calculé au niveau SCI global, pas par bien)
  saleBalance: number; // Solde de revente AVANT impôt sur plus-value
  capitalGainTax: number; // Impôt sur la plus-value (IS 25%)
  totalGain: number;
}

// Labels pour les types de location
const RENTAL_TYPE_LABELS: Record<RentalType, string> = {
  'unfurnished': 'Location nue',
  'furnished': 'Location meublée'
};

/**
 * Calcule l'impôt sur la plus-value pour une année de vente donnée (SCI à l'IS)
 */
function calculateCapitalGainTaxForYear(
  investment: Investment,
  sellingYear: number,
  sellingPrice: number,
  rentalType: RentalType
): number {
  // Prix d'achat initial ajusté
  const purchasePrice = Number(investment.purchasePrice) || 0;
  const acquisitionFees = (Number(investment.notaryFees) || 0) + (Number(investment.agencyFees) || 0);
  const improvementWorks = Number(investment.improvementWorks) || 0;
  const correctedPurchasePrice = purchasePrice + acquisitionFees + improvementWorks;
  
  // Calculer la plus-value brute
  const capitalGain = sellingPrice - correctedPurchasePrice;
  
  // Pour les SCI à l'IS : impôt de 25% sur la plus-value
  // Pas d'abattement pour durée de détention
  if (capitalGain > 0) {
    return capitalGain * 0.25;
  }
  
  return 0;
}

const SCIBalanceDisplay: React.FC<Props> = ({ investment, currentSubTab }) => {
  // Identifiant unique pour le stockage local
  const investmentId = `${investment.purchasePrice}_${investment.startDate}`;
  
  // État pour le type de location sélectionné
  const [selectedRentalType, setSelectedRentalType] = useState<RentalType>(() => {
    const stored = localStorage.getItem(`selectedRentalType_${investmentId}`);
    return (stored as RentalType) || 'unfurnished';
  });

  // Sauvegarder le type sélectionné et notifier
  useEffect(() => {
    localStorage.setItem(`selectedRentalType_${investmentId}`, selectedRentalType);
    window.dispatchEvent(new CustomEvent('selectedRentalTypeUpdated', { 
      detail: { investmentId, selectedRentalType } 
    }));
  }, [selectedRentalType, investmentId]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(value || 0);

  /**
   * Calcule les données de balance pour tous les types de location
   */
  const calculateBalanceData = (): BalanceData => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

    // Paramètres de revente (on utilise ceux sauvegardés dans localStorage si disponibles)
    const storedParams = localStorage.getItem(`saleParameters_${investmentId}`);
    const saleParams = storedParams ? JSON.parse(storedParams) : {
      annualIncrease: 2,
      agencyFees: 0,
      earlyRepaymentFees: 0
    };

    const rentalTypes: RentalType[] = ['unfurnished', 'furnished'];
    const data: Record<RentalType, Array<BalanceYearResult>> = {
      unfurnished: [],
      furnished: []
    };

    rentalTypes.forEach(rentalType => {
      let cumulativeCashFlowBeforeTax = 0;
      let cumulativeTax = 0; // Pour SCI, l'IS sera calculé globalement

      years.forEach((year, yearIndex) => {
        const expense = investment.expenses.find(e => e.year === year);
        
        // Calculer le prorata temporel de l'année
        const coverage = getYearCoverage(investment, year);
        const adjustForCoverage = (value: number) => value * coverage;

        // Revenus avec prorata
        const revenues = rentalType === 'furnished'
          ? adjustForCoverage(Number(expense?.furnishedRent || 0))
          : adjustForCoverage(Number(expense?.rent || 0));

        const taxBenefit = rentalType === 'unfurnished' 
          ? adjustForCoverage(Number(expense?.taxBenefit || 0)) 
          : 0;

        const tenantCharges = adjustForCoverage(Number(expense?.tenantCharges || 0));

        // Charges avec prorata
        const propertyTax = adjustForCoverage(Number(expense?.propertyTax || 0));
        const condoFees = adjustForCoverage(Number(expense?.condoFees || 0));
        const propertyInsurance = adjustForCoverage(Number(expense?.propertyInsurance || 0));
        const managementFees = adjustForCoverage(Number(expense?.managementFees || 0));
        const unpaidRentInsurance = adjustForCoverage(Number(expense?.unpaidRentInsurance || 0));
        const repairs = adjustForCoverage(Number(expense?.repairs || 0));
        const otherDeductible = adjustForCoverage(Number(expense?.otherDeductible || 0));
        const otherNonDeductible = adjustForCoverage(Number(expense?.otherNonDeductible || 0));

        // Coûts du prêt calculés dynamiquement (prorata automatique)
        const loanInfo = getLoanInfoForYear(investment, year);
        const loanPayment = loanInfo.payment;
        const loanInsurance = loanInfo.insurance;

        // Cash flow annuel AVANT IS
        const annualCashFlowBeforeTax =
          revenues +
          taxBenefit +
          tenantCharges -
          propertyTax -
          condoFees -
          propertyInsurance -
          managementFees -
          unpaidRentInsurance -
          repairs -
          otherDeductible -
          otherNonDeductible -
          loanPayment -
          loanInsurance;

        cumulativeCashFlowBeforeTax += annualCashFlowBeforeTax;

        // Pour SCI : L'IS sera calculé globalement sur le résultat de la SCI
        // Ici on considère un IS de 0 par bien (il sera calculé au niveau SCI)
        const annualTax = 0;
        cumulativeTax += annualTax;

        const annualCashFlow = annualCashFlowBeforeTax - annualTax;
        const cumulativeCashFlow = cumulativeCashFlowBeforeTax - cumulativeTax;

        // Calcul du solde de revente
        const purchasePrice = Number(investment.purchasePrice) || 0;
        const revaluedPrice = purchasePrice * Math.pow(1 + saleParams.annualIncrease / 100, yearIndex + 1);
        
        // Capital restant dû
        const amortizationSchedule = generateAmortizationSchedule(
          Number(investment.loanAmount),
          Number(investment.interestRate),
          Number(investment.loanDuration),
          investment.deferralType || 'none',
          Number(investment.deferredPeriod) || 0,
          investment.startDate
        );

        let remainingBalance = 0;
        if (amortizationSchedule && amortizationSchedule.schedule && Array.isArray(amortizationSchedule.schedule)) {
          const yearEndDate = new Date(year, 11, 31);
          const yearPayments = amortizationSchedule.schedule.filter(row => new Date(row.date) <= yearEndDate);
          
          if (yearPayments.length > 0) {
            const totalPaid = yearPayments.reduce((sum, row) => sum + row.principal, 0);
            remainingBalance = Number(investment.loanAmount) - totalPaid;
          } else {
            remainingBalance = Number(investment.loanAmount);
          }
        }

        const saleBalance = revaluedPrice - saleParams.agencyFees - remainingBalance - saleParams.earlyRepaymentFees;

        // Impôt sur la plus-value (IS 25%)
        const capitalGainTax = calculateCapitalGainTaxForYear(investment, year, revaluedPrice, rentalType);

        // Gain total
        const downPayment = Number(investment.downPayment) || 0;
        const totalGain = cumulativeCashFlow + saleBalance - capitalGainTax - downPayment;

        data[rentalType].push({
          annualCashFlow,
          cumulativeCashFlow,
          cumulativeCashFlowBeforeTax,
          cumulativeTax,
          saleBalance,
          capitalGainTax,
          totalGain
        });
      });
    });

    return { years, data };
  };

  const balanceData = calculateBalanceData();

  // Trouver la première année où le gain total devient positif
  const findFirstPositiveYearIndex = () => {
    const data = balanceData.data[selectedRentalType];
    return data.findIndex(d => d.totalGain >= 0);
  };

  return (
    <div className="space-y-6">
      {/* Bannière explicative SCI */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Bien détenu en SCI :</strong> Les calculs de bilan pour une SCI soumise à l'IS diffèrent des particuliers. 
              L'impôt sur les sociétés (IS) est calculé globalement au niveau de la SCI sur l'ensemble de ses biens. 
              La plus-value à la revente est imposée au taux de l'IS (25%) sans abattement pour durée de détention.
            </p>
          </div>
        </div>
      </div>

      {/* Onglets de sélection du type de location */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-4">
            {(Object.entries(RENTAL_TYPE_LABELS) as [RentalType, string][]).map(([type, label]) => (
              <button
                key={type}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedRentalType(type);
                }}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${selectedRentalType === type
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Graphique cumulatif: CF, Impôts, Solde revente + courbe total */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Valeur cumulée du projet</h3>
        <div className="h-[28rem]">
          <ReactChart
            type="bar"
            data={{
              labels: balanceData.years,
              datasets: [
                {
                  type: 'bar' as const,
                  label: 'Apport personnel',
                  data: balanceData.years.map(() => -(Number(investment.downPayment) || 0)),
                  backgroundColor: 'rgba(107, 114, 128, 0.7)',
                  borderColor: 'rgba(107, 114, 128, 1)'
                },
                {
                  type: 'bar' as const,
                  label: 'Cash flow cumulé',
                  data: balanceData.years.map((_, i) => {
                    const d = balanceData.data[selectedRentalType]?.[i];
                    if (!d) return 0;
                    return d.cumulativeCashFlowBeforeTax || 0;
                  }),
                  backgroundColor: 'rgba(245, 158, 11, 0.8)',
                  borderColor: 'rgba(245, 158, 11, 1)'
                },
                {
                  type: 'bar' as const,
                  label: 'Imposition cumulée (IS)',
                  data: balanceData.years.map((_, i) => -(balanceData.data[selectedRentalType]?.[i]?.cumulativeTax || 0)),
                  backgroundColor: 'rgba(239, 68, 68, 0.7)',
                  borderColor: 'rgba(239, 68, 68, 1)'
                },
                {
                  type: 'bar' as const,
                  label: 'Solde de revente',
                  data: balanceData.years.map((_, i) => balanceData.data[selectedRentalType]?.[i]?.saleBalance || 0),
                  backgroundColor: 'rgba(59, 130, 246, 0.7)',
                  borderColor: 'rgba(59, 130, 246, 1)'
                },
                {
                  type: 'bar' as const,
                  label: 'Impôt sur la plus-value (IS 25%)',
                  data: balanceData.years.map((_, i) => -(balanceData.data[selectedRentalType]?.[i]?.capitalGainTax || 0)),
                  backgroundColor: 'rgba(168, 85, 247, 0.7)',
                  borderColor: 'rgba(168, 85, 247, 1)'
                },
                {
                  type: 'line' as const,
                  label: 'Gain total cumulé',
                  data: balanceData.years.map((_, i) => {
                    const d = balanceData.data[selectedRentalType]?.[i];
                    if (!d) return 0;
                    return d.totalGain;
                  }),
                  borderColor: 'rgba(34, 197, 94, 1)',
                  backgroundColor: 'rgba(34, 197, 94, 1)',
                  tension: 0.3,
                  yAxisID: 'y'
                }
              ]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'top' as const },
                tooltip: {
                  callbacks: {
                    label: function(context: any) {
                      return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                    }
                  }
                }
              },
              scales: {
                x: { stacked: true },
                y: {
                  stacked: true,
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
        <div className="mt-4 p-4 bg-gray-50 rounded-md text-sm">
          <p>
            <strong>Note :</strong> Ce graphique montre la composition du gain total cumulé pour chaque année de revente. 
            Pour une SCI à l'IS, l'imposition est calculée au niveau de la société et non par bien individuel.
          </p>
        </div>
      </div>

      {/* Tableau de données - reprend les valeurs du graphique */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Tableau des résultats */}
        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Année
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apport</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cash flow cumulé</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imposition cumulée</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solde de revente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impôt plus-value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gain total cumulé</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(() => {
                // Trouver la première année où le gain total cumulé devient positif
                const firstPositiveYearIndex = findFirstPositiveYearIndex();
                const downPayment = Number(investment.downPayment) || 0;

                
                return balanceData.years.map((year, index) => {
                  const cfBeforeTax = balanceData.data[selectedRentalType]?.[index]?.cumulativeCashFlowBeforeTax;
                  const cumulativeTax = balanceData.data[selectedRentalType]?.[index]?.cumulativeTax || 0;
                  const saleBalance = balanceData.data[selectedRentalType]?.[index]?.saleBalance || 0;
                  const capitalGainTax = balanceData.data[selectedRentalType]?.[index]?.capitalGainTax || 0;
                  const totalGain = balanceData.data[selectedRentalType]?.[index]?.totalGain || 0;

                  const isFirstPositiveYear = index === firstPositiveYearIndex;
                  
                  return (
                    <tr 
                      key={year} 
                      className={`${
                        isFirstPositiveYear 
                          ? 'bg-green-100 border-l-4 border-green-500' 
                          : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(downPayment)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cfBeforeTax)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(-cumulativeTax)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(saleBalance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(-capitalGainTax)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(totalGain)}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SCIBalanceDisplay;


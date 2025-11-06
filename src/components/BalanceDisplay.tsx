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
import { Investment, TaxRegime, TaxResults, CapitalGainResults } from '../types/investment';
import { calculateAllTaxRegimes } from '../utils/taxCalculations';
import { generateAmortizationSchedule, calculateRevenuesWithVacancy } from '../utils/calculations';
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

// Interface pour stocker les données de balance calculées
interface BalanceData {
  years: number[];
  data: Record<TaxRegime, Array<BalanceYearResult>>;
}

// Interface pour les résultats annuels de balance
interface BalanceYearResult {
  annualCashFlow: number; // Cash flow net annuel (avec imposition)
  cumulativeCashFlow: number; // Cash flow cumulé NET (avec imposition)
  cumulativeCashFlowBeforeTax: number; // Cash flow cumulé SANS imposition (comme dans CashFlowDisplay)
  cumulativeTax: number;
  saleBalance: number; // Solde de revente AVANT impôt sur plus-value
  capitalGainTax: number; // Impôt sur la plus-value
  totalGain: number;
}

// Labels pour les différents régimes fiscaux
const REGIME_LABELS: Record<TaxRegime, string> = {
  'micro-foncier': 'Location nue - Micro-foncier',
  'reel-foncier': 'Location nue - Frais réels',
  'micro-bic': 'LMNP - Micro-BIC',
  'reel-bic': 'LMNP - Frais réels'
};

/**
 * Calcule l'impôt sur la plus-value pour une année de vente donnée
 */
function calculateCapitalGainTaxForYear(
  investment: Investment,
  sellingYear: number,
  sellingPrice: number,
  regime: TaxRegime
): number {
  // Prix d'achat initial ajusté
  const purchasePrice = Number(investment.purchasePrice) || 0;
  const acquisitionFees = (Number(investment.notaryFees) || 0) + (Number(investment.agencyFees) || 0);
  const improvementWorks = Number(investment.improvementWorks) || 0;
  
  // Date d'achat et de vente
  const purchaseDate = new Date(investment.projectStartDate);
  
  // Durée de détention en années jusqu'à l'année de vente
  const holdingPeriodYears = sellingYear - purchaseDate.getFullYear();
  
  // Prix d'acquisition corrigé
  const correctedPurchasePrice = purchasePrice + acquisitionFees + improvementWorks;
  
  // Plus-value brute
  const grossCapitalGain = sellingPrice - correctedPurchasePrice;
  
  if (grossCapitalGain <= 0) {
    return 0;
  }
  
  // Calcul des abattements pour durée de détention (IR)
  let irDiscount = 0;
  if (holdingPeriodYears > 5) {
    if (holdingPeriodYears <= 21) {
      irDiscount = Math.min(1, (holdingPeriodYears - 5) * 0.06);
    } else {
      irDiscount = 1; // Exonération totale après 22 ans
    }
  }
  
  // Calcul des abattements pour durée de détention (prélèvements sociaux)
  let socialDiscount = 0;
  if (holdingPeriodYears > 5) {
    if (holdingPeriodYears <= 21) {
      socialDiscount = (holdingPeriodYears - 5) * 0.0165;
    } else if (holdingPeriodYears <= 30) {
      socialDiscount = (16 * 0.0165) + 0.016 + Math.min(8, holdingPeriodYears - 22) * 0.09;
    } else {
      socialDiscount = 1; // Exonération totale après 30 ans
    }
  }
  
  // Plus-values imposables
  const taxableCapitalGainIR = grossCapitalGain * (1 - irDiscount);
  const taxableCapitalGainSocial = grossCapitalGain * (1 - socialDiscount);
  
  // Calcul des impositions
  let incomeTax = taxableCapitalGainIR * 0.19; // 19% d'IR pour location nue
  let socialCharges = taxableCapitalGainSocial * 0.172; // 17.2% de prélèvements sociaux
  
  // Pour les régimes LMNP (meublé), traitement spécial
  if (regime === 'micro-bic' || regime === 'reel-bic') {
    const isLMP = investment.isLMP || false;
    const businessTaxRate = Number(investment.taxParameters?.taxRate) || 30;
    const accumulatedDepreciation = Number(investment.accumulatedDepreciation) || 0;
    
    if (isLMP) {
      // LMP - Plus-values professionnelles
      if (holdingPeriodYears <= 2) {
        // Court terme - Taux marginal sur toute la plus-value
        return grossCapitalGain * (businessTaxRate / 100);
      } else {
        // Calcul du cumul d'amortissement (utiliser la valeur de l'investment)
        // Court terme - Correspond aux amortissements pratiqués (dans la limite de la plus-value)
        const shortTermGain = Math.min(accumulatedDepreciation, grossCapitalGain);
        // Long terme - Le reste de la plus-value
        const longTermGain = Math.max(0, grossCapitalGain - shortTermGain);
        
        // Court terme - Taux marginal
        const shortTermTax = shortTermGain * (businessTaxRate / 100);
        // Long terme - 12.8% (PFU) + 17.2% de prélèvements sociaux
        const longTermIncomeTax = longTermGain * 0.128;
        const longTermSocialCharges = longTermGain * 0.172;
        
        return shortTermTax + longTermIncomeTax + longTermSocialCharges;
      }
    } else {
      // LMNP (non-professionnel) - Règles des plus-values immobilières classiques
      // Pour reel-bic, ajout de la taxation des amortissements
      if (regime === 'reel-bic' && accumulatedDepreciation > 0) {
        // Les amortissements sont réintégrés et taxés au barème progressif de l'IR
        const depreciationTaxable = Math.min(accumulatedDepreciation, grossCapitalGain);
        const depreciationTax = depreciationTaxable * (businessTaxRate / 100);
        
        // Impôt standard sur la plus-value immobilière + impôt sur amortissements
        return incomeTax + socialCharges + depreciationTax;
      }
      // Pour micro-bic ou reel-bic sans amortissements: règles classiques
    }
  }
  
  return incomeTax + socialCharges;
}

const BalanceDisplay: React.FC<Props> = ({ investment, currentSubTab }) => {
  // Identifiant unique pour le stockage local
  const investmentId = `${investment.purchasePrice}_${investment.startDate}`;
  
  // État du régime fiscal sélectionné, persistant dans le localStorage
  const [selectedRegimeLocal, setSelectedRegimeLocal] = useState<TaxRegime>(() => {
    const stored = localStorage.getItem(`selectedRegime_${investmentId}`);
    return (stored as TaxRegime) || 'micro-foncier';
  });

  const [balanceData, setBalanceData] = useState<BalanceData>({ years: [], data: {} as Record<TaxRegime, Array<BalanceYearResult>> });


  // Sauvegarde du régime sélectionné dans le localStorage
  useEffect(() => {
    localStorage.setItem(`selectedRegime_${investmentId}`, selectedRegimeLocal);
  }, [selectedRegimeLocal, investmentId]);

  // Fonction pour formater les montants en euros
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  // Fonction pour formater les pourcentages
  const formatPercent = (value: number) => 
    `${(value * 100).toFixed(1)}%`;

  /**
   * Calcul des données de balance pour chaque année et régime fiscal
   * Cette fonction est mémorisée pour éviter les recalculs inutiles
   */
  const calculateBalanceData = React.useCallback(() => {
    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    
    const data: Record<TaxRegime, BalanceYearResult[]> = {
      'micro-foncier': [],
      'reel-foncier': [],
      'micro-bic': [],
      'reel-bic': []
    };

    // On va maintenir les résultats fiscaux de chaque année pour chaque régime
    const yearlyResults: Record<number, Record<TaxRegime, TaxResults>> = {};

    // Calcul des résultats fiscaux de manière séquentielle
    years.forEach(year => {
      // Pour la première année, on calcule les résultats fiscaux sans données antérieures
      if (year === startYear) {
        yearlyResults[year] = calculateAllTaxRegimes(investment, year);
      } else {
        // Pour les années suivantes, on passe les résultats de l'année précédente
        yearlyResults[year] = calculateAllTaxRegimes(investment, year, yearlyResults[year - 1]);
      }
    });

    // Calculer pour chaque régime
    (Object.keys(REGIME_LABELS) as TaxRegime[]).forEach((regime) => {
      let cumulativeCashFlowBeforeTax = 0; // Cash flow cumulé SANS imposition (comme dans CashFlowDisplay)
      let cumulativeTax = 0;
      let cumulativeCashFlowNet = 0; // Cash flow cumulé NET (avec imposition)
      
      years.forEach((year) => {
        // Récupérer les dépenses de l'année
        const yearExpense = investment.expenses.find(e => e.year === year);
        
        // Calculer le cash flow annuel comme dans la page Cash Flow (Rentabilité/Cashflow)
        let annualCashFlowBeforeTax = 0;
        let annualCashFlowNet = 0;
        if (yearExpense) {
          // Calcul des revenus selon le régime avec vacance locative
          const revenues = calculateRevenuesWithVacancy(
            yearExpense,
            regime,
            investment.expenseProjection?.vacancyRate || 0
          );

          // Total des dépenses (identique à CashFlowDisplay)
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

          // Cash flow SANS imposition (comme dans CashFlowDisplay tableau "CASH FLOW NET")
          annualCashFlowBeforeTax = revenues - expenses;
          
          // Imposition
          const taxation = yearlyResults[year][regime].totalTax;
          cumulativeTax += taxation;
          
          // Cash flow NET (avec imposition) pour le cumul
          annualCashFlowNet = annualCashFlowBeforeTax - taxation;
        }
        cumulativeCashFlowBeforeTax += annualCashFlowBeforeTax;
        cumulativeCashFlowNet += annualCashFlowNet;

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

        // Solde de revente AVANT impôt sur la plus-value
        const saleBalance = netSellingPrice - totalDebt;

        // Calculer l'impôt sur la plus-value pour cette année de vente
        const capitalGainTax = calculateCapitalGainTaxForYear(
          investment,
          year,
          netSellingPrice,
          regime
        );

        // Calculer le gain total (cumulativeCashFlowNet inclut déjà l'imposition sur revenus)
        // Le gain total inclut maintenant aussi l'impôt sur la plus-value et l'apport personnel
        const downPayment = Number(investment.downPayment) || 0;
        const totalGain = cumulativeCashFlowNet + saleBalance - capitalGainTax - downPayment;

        data[regime].push({
          saleBalance,
          capitalGainTax,
          cumulativeCashFlow: cumulativeCashFlowNet,
          cumulativeCashFlowBeforeTax,
          cumulativeTax,
          annualCashFlow: annualCashFlowNet,
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

  
  // Fonction utilitaire pour calculer le rendement annuel comme il apparaît dans le tableau
  const calculateAnnualReturn = (revenues: number, effort: number, numberOfYears: number) => {
    // Si le bilan est négatif
    if (revenues < 0) {
      return -1; // Retourner -100% en cas de perte
    }
    
    // Si l'effort ou le nombre d'années est nul ou invalide
    if (effort <= 0 || numberOfYears <= 0) {
      return 0;
    }
    
    // Pour tous les cas, utiliser la méthode simplifiée (Gain annuel moyen / Effort)
    // Cette méthode semble correspondre aux valeurs que vous avez dans votre tableau
    const annualGain = (revenues - effort) / numberOfYears;
    return annualGain / effort;
  };

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
          
          const revenues = saleBalance + cashFlow;
          
          // Calcul de l'effort basé sur le minimum de cash flow cumulé jusqu'à l'année en cours
          let minCumulativeCashFlow = 0;
          for (let i = 0; i <= index; i++) {
            const yearCashFlow = balanceData.data[regime as TaxRegime]?.[i]?.cumulativeCashFlow || 0;
            if (i === 0 || yearCashFlow < minCumulativeCashFlow) {
              minCumulativeCashFlow = yearCashFlow;
            }
          }
          
          // Si le minimum de cash flow est négatif, ajuster l'effort
          const effort = minCumulativeCashFlow < 0 
            ? downPayment - minCumulativeCashFlow // Addition car minCumulativeCashFlow est négatif
            : downPayment;
          
          // Utiliser notre fonction personnalisée pour le calcul du rendement annuel
          const annualReturn = calculateAnnualReturn(revenues, effort, numberOfYears);
                    
          return annualReturn * 100;
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

  // Calcul de l'effort pour le tableau
  const getEffortValueForTable = (regimeData: BalanceYearResult[], year: number) => {
    const downPayment = Number(investment.downPayment) || 0;
    
    // Minimum du cash flow cumulé jusqu'à l'année spécifiée
    let minCumulativeCashFlow = 0;
    for (let i = 0; i <= year; i++) {
      const yearCashFlow = regimeData[i]?.cumulativeCashFlow || 0;
      if (i === 0 || yearCashFlow < minCumulativeCashFlow) {
        minCumulativeCashFlow = yearCashFlow;
      }
    }
    
    // Si le minimum de cash flow est négatif, ajuster l'effort
    return minCumulativeCashFlow < 0 
      ? downPayment - minCumulativeCashFlow // Addition car minCumulativeCashFlow est négatif
      : downPayment;
  };

  // Calcul des données statistiques pour l'analyse IA
  const getStatisticsData = () => {
    const currentYear = new Date().getFullYear();
    const yearIndex = balanceData.years.findIndex(year => year === currentYear);
    
    if (yearIndex === -1 || !balanceData.data[selectedRegimeLocal]) {
      return null;
    }

    const regimeData = balanceData.data[selectedRegimeLocal];
    const currentYearData = regimeData[yearIndex];

    // Calcul de l'effort (apport + cash flow négatif cumulé)
    const downPayment = Number(investment.downPayment);
    let minCumulativeCashFlow = 0;
    for (let i = 0; i <= yearIndex; i++) {
      const yearCashFlow = regimeData[i]?.cumulativeCashFlow || 0;
      if (i === 0 || yearCashFlow < minCumulativeCashFlow) {
        minCumulativeCashFlow = yearCashFlow;
      }
    }
    const effort = minCumulativeCashFlow < 0 
      ? downPayment - minCumulativeCashFlow
      : downPayment;

    // Cash flow annuel moyen
    const cashFlow = currentYearData.annualCashFlow;

    // Bilan de revente
    const saleBalance = currentYearData.saleBalance;

    // Rendement total et annuel
    const totalReturn = (currentYearData.totalGain / effort) * 100;
    const annualReturn = totalReturn / yearIndex;

    return {
      effort,
      cashFlow,
      saleBalance,
      totalReturn,
      annualReturn
    };
  };

  return (
    <div className="space-y-6">
      {/* Onglets de sélection du régime fiscal */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-4">
            {(Object.entries(REGIME_LABELS) as [TaxRegime, string][]).map(([regime, label]) => (
              <button
                key={regime}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedRegimeLocal(regime);
                }}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${selectedRegimeLocal === regime
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
                    const d = balanceData.data[selectedRegimeLocal]?.[i];
                    if (!d) return 0;
                    // Cash flow cumulé SANS imposition (comme dans CashFlowDisplay)
                    return d.cumulativeCashFlowBeforeTax || 0;
                  }),
                  backgroundColor: 'rgba(245, 158, 11, 0.8)',
                  borderColor: 'rgba(245, 158, 11, 1)'
                },
                {
                  type: 'bar' as const,
                  label: 'Imposition cumulée',
                  data: balanceData.years.map((_, i) => -(balanceData.data[selectedRegimeLocal]?.[i]?.cumulativeTax || 0)),
                  backgroundColor: 'rgba(239, 68, 68, 0.7)',
                  borderColor: 'rgba(239, 68, 68, 1)'
                },
                {
                  type: 'bar' as const,
                  label: 'Solde de revente',
                  data: balanceData.years.map((_, i) => balanceData.data[selectedRegimeLocal]?.[i]?.saleBalance || 0),
                  backgroundColor: 'rgba(59, 130, 246, 0.7)',
                  borderColor: 'rgba(59, 130, 246, 1)'
                },
                {
                  type: 'bar' as const,
                  label: 'Impôt sur la plus-value',
                  data: balanceData.years.map((_, i) => -(balanceData.data[selectedRegimeLocal]?.[i]?.capitalGainTax || 0)),
                  backgroundColor: 'rgba(168, 85, 247, 0.7)',
                  borderColor: 'rgba(168, 85, 247, 1)'
                },
                {
                  type: 'line' as const,
                  label: 'Gain total cumulé',
                  data: balanceData.years.map((_, i) => {
                    const d = balanceData.data[selectedRegimeLocal]?.[i];
                    if (!d) return 0;
                    const downPayment = Number(investment.downPayment) || 0;
                    // Gain total = Cash flow net + Solde revente - Impôt plus-value - Apport
                    return d.cumulativeCashFlow + d.saleBalance - d.capitalGainTax - downPayment;
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
                    label: (ctx: any) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                  }
                },
                title: {
                  display: false
                }
              },
              scales: {
                x: { stacked: true },
                y: {
                  stacked: true,
                  ticks: { callback: (v: any) => formatCurrency(v) },
                  title: { display: true, text: 'Euros (€)' }
                }
              }
            }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-500">Barres empilées: apport personnel (en négatif), cash flow cumulé, impôts cumulés (en négatif), solde de revente et impôt sur la plus-value (en négatif). Courbe: gain total cumulé net (après tous les coûts et impôts).</p>
      </div>

      {/* Graphiques d'analyse du gain total par régime */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Graphique 1: Gain total cumulé par régime fiscal */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Gain total cumulé par régime fiscal</h3>
          <div className="h-80">
            <Line 
              data={{
                labels: balanceData.years,
                datasets: (Object.keys(REGIME_LABELS) as TaxRegime[]).map((regime, index) => {
                  const colors = [
                    'rgba(59, 130, 246, 1)', // blue
                    'rgba(16, 185, 129, 1)', // green
                    'rgba(139, 92, 246, 1)', // purple
                    'rgba(245, 158, 11, 1)'  // yellow
                  ];
                  
                  const downPayment = Number(investment.downPayment) || 0;
                  
                  return {
                    label: REGIME_LABELS[regime],
                    data: balanceData.years.map((_, i) => {
                      const d = balanceData.data[regime]?.[i];
                      if (!d) return 0;
                      return d.cumulativeCashFlow + d.saleBalance - d.capitalGainTax - downPayment;
                    }),
                    borderColor: colors[index],
                    backgroundColor: colors[index],
                    tension: 0.4,
                    fill: false
                  };
                })
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: (context: any) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                    }
                  }
                },
                scales: {
                  y: {
                    ticks: {
                      callback: (value: any) => formatCurrency(value)
                    },
                    title: {
                      display: true,
                      text: 'Gain total cumulé (€)'
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: 'Année'
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Graphique 2: Dérivée du gain total (variation annuelle) */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Variation annuelle du gain total (dérivée)</h3>
          <div className="h-80">
            <Line 
              data={{
                labels: balanceData.years.slice(1), // Commence à l'année 1 car on calcule la différence
                datasets: (Object.keys(REGIME_LABELS) as TaxRegime[]).map((regime, index) => {
                  const colors = [
                    'rgba(59, 130, 246, 1)', // blue
                    'rgba(16, 185, 129, 1)', // green
                    'rgba(139, 92, 246, 1)', // purple
                    'rgba(245, 158, 11, 1)'  // yellow
                  ];
                  
                  const downPayment = Number(investment.downPayment) || 0;
                  
                  // Calculer la dérivée (variation annuelle) et trouver les maxima
                  const derivativeData: number[] = [];
                  const maxPointIndices: Set<number> = new Set();
                  
                  let previousGain = 0;
                  
                  balanceData.years.forEach((year, i) => {
                    const d = balanceData.data[regime]?.[i];
                    if (d) {
                      const currentGain = d.cumulativeCashFlow + d.saleBalance - d.capitalGainTax - downPayment;
                      
                      if (i > 0) {
                        // Dérivée = différence entre l'année actuelle et l'année précédente
                        const derivative = currentGain - previousGain;
                        derivativeData.push(derivative);
                      }
                      
                      previousGain = currentGain;
                    }
                  });
                  
                  // Trouver les maxima : points où la dérivée passe de croissante à décroissante
                  // Le maximum de rentabilité correspond au maximum de la dérivée
                  for (let i = 1; i < derivativeData.length; i++) {
                    const prevDerivative = derivativeData[i - 1];
                    const currDerivative = derivativeData[i];
                    const nextDerivative = derivativeData[i + 1];
                    
                    // Maximum local : dérivée croissante puis décroissante
                    if (currDerivative > prevDerivative && (nextDerivative === undefined || currDerivative > nextDerivative)) {
                      maxPointIndices.add(i);
                    }
                    // Cas spécial : si on est au dernier point et que c'est plus grand que le précédent
                    else if (nextDerivative === undefined && currDerivative > prevDerivative) {
                      maxPointIndices.add(i);
                    }
                  }
                  
                  // Si aucun maximum local trouvé, prendre le maximum global
                  if (maxPointIndices.size === 0 && derivativeData.length > 0) {
                    let maxIndex = 0;
                    let maxValue = derivativeData[0];
                    derivativeData.forEach((value, index) => {
                      if (value > maxValue) {
                        maxValue = value;
                        maxIndex = index;
                      }
                    });
                    maxPointIndices.add(maxIndex);
                  }
                  
                  return {
                    label: REGIME_LABELS[regime],
                    data: derivativeData,
                    borderColor: colors[index],
                    backgroundColor: colors[index],
                    tension: 0.4,
                    fill: false,
                    maxPointIndices: maxPointIndices, // Stocker les indices pour le tooltip
                    pointRadius: (context: any) => {
                      // Mettre en évidence les points maximaux
                      return maxPointIndices.has(context.dataIndex) ? 8 : 3;
                    },
                    pointBackgroundColor: (context: any) => {
                      return maxPointIndices.has(context.dataIndex) ? 'rgba(239, 68, 68, 1)' : colors[index];
                    },
                    pointBorderColor: (context: any) => {
                      return maxPointIndices.has(context.dataIndex) ? 'rgba(239, 68, 68, 1)' : colors[index];
                    },
                    pointBorderWidth: (context: any) => {
                      return maxPointIndices.has(context.dataIndex) ? 3 : 1;
                    }
                  };
                })
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  title: {
                    display: false
                  },
                  tooltip: {
                    callbacks: {
                      label: (context: any) => {
                        const value = context.raw;
                        // Vérifier si c'est un point maximum en utilisant maxPointIndices stocké dans le dataset
                        const dataset = context.dataset as any;
                        const isMax = dataset.maxPointIndices?.has(context.dataIndex) || false;
                        const maxText = isMax ? ' (Maximum)' : '';
                        return `${context.dataset.label}: ${formatCurrency(value)}${maxText}`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    ticks: {
                      callback: (value: any) => formatCurrency(value)
                    },
                    title: {
                      display: true,
                      text: 'Variation annuelle (€)'
                    }
                  },
                  x: {
                    title: {
                      display: true,
                      text: 'Année'
                    }
                  }
                }
              }}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">Les points rouges indiquent les maxima de rentabilité (dérivée maximale).</p>
        </div>
      </div>

      {/* (Cartes "Solde en fin d'opération" et graphique rendement annuel supprimés) */}

      {/* (Cartes projection et graphiques revenus/effort supprimés à la demande) */}

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
                const downPayment = Number(investment.downPayment) || 0;
                let firstPositiveYearIndex = -1;
                
                for (let i = 0; i < balanceData.years.length; i++) {
                  const d = balanceData.data[selectedRegimeLocal]?.[i];
                  if (d) {
                    const cashFlowNetCumulative = d.cumulativeCashFlow || 0;
                    const totalGain = cashFlowNetCumulative + d.saleBalance - d.capitalGainTax - downPayment;
                    if (totalGain >= 0 && firstPositiveYearIndex === -1) {
                      firstPositiveYearIndex = i;
                      break;
                    }
                  }
                }
                
                return balanceData.years.map((year, index) => {
                  const cfBeforeTax = balanceData.data[selectedRegimeLocal]?.[index]?.cumulativeCashFlowBeforeTax || 0;
                  const cumulativeTax = balanceData.data[selectedRegimeLocal]?.[index]?.cumulativeTax || 0;
                  const saleBalance = balanceData.data[selectedRegimeLocal]?.[index]?.saleBalance || 0;
                  const capitalGainTax = balanceData.data[selectedRegimeLocal]?.[index]?.capitalGainTax || 0;
                  const cashFlowNetCumulative = balanceData.data[selectedRegimeLocal]?.[index]?.cumulativeCashFlow || 0;
                  const totalGain = cashFlowNetCumulative + saleBalance - capitalGainTax - downPayment;
                  
                  // Mettre en évidence la première année où le gain total est positif
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

export default BalanceDisplay; 
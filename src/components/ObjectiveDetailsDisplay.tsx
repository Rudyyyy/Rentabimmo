/**
 * Composant ObjectiveDetailsDisplay
 * 
 * Affiche le détail des objectifs (Revente ou Cashflow) par régime fiscal
 * dans la zone principale de la page Objectif.
 */

import { Investment, TaxRegime } from '../types/investment';
import { calculateAllTaxRegimes } from '../utils/taxCalculations';
import { generateAmortizationSchedule } from '../utils/calculations';

interface Props {
  investment: Investment;
  objectiveType: 'revente' | 'cashflow';
  objectiveYear: number;
  objectiveTargetGain?: number;
  objectiveTargetCashflow?: number;
}

const REGIME_LABELS: Record<TaxRegime, string> = {
  'micro-foncier': 'Location nue - Micro-foncier',
  'reel-foncier': 'Location nue - Frais réels',
  'micro-bic': 'LMNP - Micro-BIC',
  'reel-bic': 'LMNP - Frais réels'
};

export default function ObjectiveDetailsDisplay({ investment, objectiveType, objectiveYear, objectiveTargetGain = 50000, objectiveTargetCashflow = 10000 }: Props) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  // Vérifier si les données sont suffisamment renseignées pour les calculs
  const hasMinimumData = () => {
    if (!investment) return false;
    const hasAcquisitionData = investment.purchasePrice && investment.purchasePrice > 0;
    if (!hasAcquisitionData) return false;
    
    const hasExpenseData = investment.expenses && investment.expenses.length > 0;
    if (!hasExpenseData) return false;
    
    // Vérifier qu'il existe des données pour l'année sélectionnée ou pour des années précédentes
    const startYear = investment.projectStartDate ? new Date(investment.projectStartDate).getFullYear() : new Date().getFullYear();
    
    // Pour la revente, on a besoin d'au moins une année de données
    // Pour le cashflow, on a besoin des données pour l'année exacte
    if (objectiveType === 'cashflow') {
      return investment.expenses.some((e: any) => e.year === objectiveYear);
    } else {
      // Pour la revente, on doit avoir des données pour au moins une année
      return investment.expenses.some((e: any) => {
        const expenseYear = e.year;
        return expenseYear >= startYear;
      });
    }
  };

  const canCalculate = hasMinimumData();

  // Fonction pour calculer le cashflow net avec imposition pour un régime donné
  const calculateCashFlowForRegime = (year: number, regime: TaxRegime): number => {
    if (!investment?.expenses) return 0;
    
    const startYear = investment?.projectStartDate ? new Date(investment.projectStartDate).getFullYear() : new Date().getFullYear();
    const years = Array.from({ length: year - startYear + 1 }, (_, i) => startYear + i);
    
    // Calculer les résultats fiscaux pour toutes les années jusqu'à l'année sélectionnée
    const yearlyResults: Record<number, Record<TaxRegime, any>> = {};
    years.forEach(yr => {
      const yearExpense = investment.expenses?.find((e: any) => e.year === yr);
      
      if (!yearExpense && yr === startYear) {
        yearlyResults[yr] = {
          'micro-foncier': { totalTax: 0 },
          'reel-foncier': { totalTax: 0 },
          'micro-bic': { totalTax: 0 },
          'reel-bic': { totalTax: 0 }
        } as Record<TaxRegime, any>;
      } else if (yearExpense) {
        try {
          if (yr === startYear) {
            yearlyResults[yr] = calculateAllTaxRegimes(investment, yr);
          } else {
            yearlyResults[yr] = calculateAllTaxRegimes(investment, yr, yearlyResults[yr - 1]);
          }
        } catch (error) {
          yearlyResults[yr] = yearlyResults[yr - 1] || {
            'micro-foncier': { totalTax: 0 },
            'reel-foncier': { totalTax: 0 },
            'micro-bic': { totalTax: 0 },
            'reel-bic': { totalTax: 0 }
          } as Record<TaxRegime, any>;
        }
      } else {
        yearlyResults[yr] = yearlyResults[yr - 1] || {
          'micro-foncier': { totalTax: 0 },
          'reel-foncier': { totalTax: 0 },
          'micro-bic': { totalTax: 0 },
          'reel-bic': { totalTax: 0 }
        } as Record<TaxRegime, any>;
      }
    });

    // Pour l'objectif cashflow, on veut le cashflow annuel NET pour l'année donnée
    const expense = investment.expenses.find((e: any) => e.year === year);
    if (!expense) return 0;

    // Calcul des revenus selon le régime
    const rent = Number(expense.rent || 0);
    const furnishedRent = Number(expense.furnishedRent || 0);
    const tenantCharges = Number(expense.tenantCharges || 0);
    const taxBenefit = Number(expense.taxBenefit || 0);

    const revenues = (regime === 'micro-bic' || regime === 'reel-bic')
      ? furnishedRent + tenantCharges
      : rent + taxBenefit + tenantCharges;

    // Total des dépenses
    const expenses = 
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

    // Cash flow SANS imposition pour cette année
    const cashFlowBeforeTax = revenues - expenses;

    // Calculer l'imposition pour cette année et ce régime
    const taxation = yearlyResults[year]?.[regime]?.totalTax || 0;

    // Cash flow NET (avec imposition) pour cette année
    return cashFlowBeforeTax - taxation;
  };

  // Fonction pour calculer le gain total cumulé pour une année et un régime donnés
  const calculateBalanceForYear = (year: number, regime: TaxRegime) => {
    if (!investment) return null;

    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    
    if (year < startYear || year > endYear) return null;

    // Calculer les résultats fiscaux pour toutes les années jusqu'à l'année sélectionnée
    const yearlyResults: Record<number, Record<TaxRegime, any>> = {};
    years.forEach(yr => {
      if (yr > year) return;
      
      const yearExpense = investment.expenses?.find((e: any) => e.year === yr);
      
      if (!yearExpense) {
        if (yr === startYear) {
          yearlyResults[yr] = {
            'micro-foncier': { totalTax: 0 },
            'reel-foncier': { totalTax: 0 },
            'micro-bic': { totalTax: 0 },
            'reel-bic': { totalTax: 0 }
          } as Record<TaxRegime, any>;
        } else {
          yearlyResults[yr] = yearlyResults[yr - 1] || {
            'micro-foncier': { totalTax: 0 },
            'reel-foncier': { totalTax: 0 },
            'micro-bic': { totalTax: 0 },
            'reel-bic': { totalTax: 0 }
          } as Record<TaxRegime, any>;
        }
        return;
      }
      
      try {
        if (yr === startYear) {
          yearlyResults[yr] = calculateAllTaxRegimes(investment, yr);
        } else {
          yearlyResults[yr] = calculateAllTaxRegimes(investment, yr, yearlyResults[yr - 1]);
        }
      } catch (error) {
        yearlyResults[yr] = yearlyResults[yr - 1] || {
          'micro-foncier': { totalTax: 0 },
          'reel-foncier': { totalTax: 0 },
          'micro-bic': { totalTax: 0 },
          'reel-bic': { totalTax: 0 }
        } as Record<TaxRegime, any>;
      }
    });

    // Calculer les valeurs cumulées jusqu'à l'année sélectionnée
    let cumulativeCashFlowBeforeTax = 0;
    let cumulativeTax = 0;
    let cumulativeCashFlowNet = 0;

    years.forEach((yr) => {
      if (yr > year) return;
      
      const yearExpense = investment.expenses?.find((e: any) => e.year === yr);
      if (!yearExpense) return;

      // Calcul des revenus selon le régime
      const rent = Number(yearExpense.rent || 0);
      const furnishedRent = Number(yearExpense.furnishedRent || 0);
      const tenantCharges = Number(yearExpense.tenantCharges || 0);
      const taxBenefit = Number(yearExpense.taxBenefit || 0);
      
      const revenues = (regime === 'micro-bic' || regime === 'reel-bic')
        ? furnishedRent + tenantCharges
        : rent + taxBenefit + tenantCharges;

      // Total des dépenses
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

      // Cash flow SANS imposition
      const annualCashFlowBeforeTax = revenues - expenses;
      
      // Imposition
      const taxation = yearlyResults[yr]?.[regime]?.totalTax || 0;
      cumulativeTax += taxation;
      
      // Cash flow NET (avec imposition)
      const annualCashFlowNet = annualCashFlowBeforeTax - taxation;
      
      cumulativeCashFlowBeforeTax += annualCashFlowBeforeTax;
      cumulativeCashFlowNet += annualCashFlowNet;
    });

    // Récupérer les paramètres de vente depuis localStorage
    const investmentId = `${investment.purchasePrice || 0}_${investment.startDate || ''}`;
    const saleParamsStr = typeof window !== 'undefined' ? localStorage.getItem(`saleParameters_${investmentId}`) : null;
    const saleParams = saleParamsStr ? JSON.parse(saleParamsStr) : { annualIncrease: 2, agencyFees: 0, earlyRepaymentFees: 0 };

    // Calculer le solde de revente pour l'année sélectionnée
    const yearsSincePurchase = year - startYear;
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

    const yearEndDate = new Date(year, 11, 31);
    const lastPayment = amortizationSchedule.schedule
      .filter(row => new Date(row.date) <= yearEndDate)
      .pop();

    const remainingBalance = lastPayment ? lastPayment.remainingBalance : Number(investment.loanAmount);
    const totalDebt = remainingBalance + Number(saleParams.earlyRepaymentFees);
    const saleBalance = netSellingPrice - totalDebt;

    // Calculer l'impôt sur la plus-value
    const purchasePrice = Number(investment.purchasePrice) || 0;
    const acquisitionFees = (Number(investment.notaryFees) || 0) + (Number(investment.agencyFees) || 0);
    const improvementWorks = Number(investment.improvementWorks) || 0;
    const correctedPurchasePrice = purchasePrice + acquisitionFees + improvementWorks;
    const grossCapitalGain = netSellingPrice - correctedPurchasePrice;
    
    let capitalGainTax = 0;
    if (grossCapitalGain > 0) {
      const holdingPeriodYears = year - startYear;
      let irDiscount = 0;
      if (holdingPeriodYears > 5) {
        if (holdingPeriodYears <= 21) {
          irDiscount = Math.min(1, (holdingPeriodYears - 5) * 0.06);
        } else {
          irDiscount = 1;
        }
      }
      
      let socialDiscount = 0;
      if (holdingPeriodYears > 5) {
        if (holdingPeriodYears <= 21) {
          socialDiscount = (holdingPeriodYears - 5) * 0.0165;
        } else if (holdingPeriodYears <= 30) {
          socialDiscount = (16 * 0.0165) + 0.016 + Math.min(8, holdingPeriodYears - 22) * 0.09;
        } else {
          socialDiscount = 1;
        }
      }
      
      const taxableCapitalGainIR = grossCapitalGain * (1 - irDiscount);
      const taxableCapitalGainSocial = grossCapitalGain * (1 - socialDiscount);
      const incomeTax = taxableCapitalGainIR * 0.19;
      const socialCharges = taxableCapitalGainSocial * 0.172;
      capitalGainTax = incomeTax + socialCharges;
      
      // Traitement spécial pour LMNP
      if (regime === 'micro-bic' || regime === 'reel-bic') {
        const isLMP = investment.isLMP || false;
        const businessTaxRate = Number(investment.taxParameters?.taxRate) || 30;
        const accumulatedDepreciation = Number(investment.accumulatedDepreciation) || 0;
        
        if (isLMP) {
          if (holdingPeriodYears <= 2) {
            capitalGainTax = grossCapitalGain * (businessTaxRate / 100);
          } else {
            const shortTermGain = Math.min(accumulatedDepreciation, grossCapitalGain);
            const longTermGain = Math.max(0, grossCapitalGain - shortTermGain);
            capitalGainTax = shortTermGain * (businessTaxRate / 100) + longTermGain * 0.128 + longTermGain * 0.172;
          }
        } else if (regime === 'reel-bic' && accumulatedDepreciation > 0) {
          const depreciationTaxable = Math.min(accumulatedDepreciation, grossCapitalGain);
          const depreciationTax = depreciationTaxable * (businessTaxRate / 100);
          capitalGainTax = incomeTax + socialCharges + depreciationTax;
        }
      }
    }

    // Gain total cumulé
    const downPayment = Number(investment.downPayment) || 0;
    const totalGain = cumulativeCashFlowNet + saleBalance - capitalGainTax - downPayment;

    return {
      year,
      downPayment,
      cumulativeCashFlowBeforeTax,
      cumulativeTax,
      saleBalance,
      capitalGainTax,
      totalGain
    };
  };

  // Fonction pour trouver l'année minimale pour atteindre un gain total souhaité pour un régime donné
  const findYearForTargetGain = (targetGain: number, regime: TaxRegime): { year: number | null; balanceData: any } => {
    if (!investment) return { year: null, balanceData: null };
    
    const startYear = investment.projectStartDate ? new Date(investment.projectStartDate).getFullYear() : new Date().getFullYear();
    const endYear = investment.projectEndDate ? new Date(investment.projectEndDate).getFullYear() : startYear;
    
    // Parcourir toutes les années pour trouver la première où le gain total atteint ou dépasse le gain souhaité
    for (let year = startYear; year <= endYear; year++) {
      const balanceData = calculateBalanceForYear(year, regime);
      if (balanceData && balanceData.totalGain >= targetGain) {
        return { year, balanceData };
      }
    }
    
    // Si on n'a pas trouvé, retourner la dernière année disponible
    const lastYearBalance = calculateBalanceForYear(endYear, regime);
    return { year: null, balanceData: lastYearBalance };
  };

  // Fonction pour calculer le cashflow cumulé net jusqu'à une année donnée pour un régime
  const calculateCumulativeCashflowForRegime = (year: number, regime: TaxRegime): number => {
    if (!investment) return 0;
    
    const startYear = investment.projectStartDate ? new Date(investment.projectStartDate).getFullYear() : new Date().getFullYear();
    const years = Array.from({ length: year - startYear + 1 }, (_, i) => startYear + i);
    
    // Calculer les résultats fiscaux pour toutes les années jusqu'à l'année sélectionnée
    const yearlyResults: Record<number, Record<TaxRegime, any>> = {};
    years.forEach(yr => {
      const yearExpense = investment.expenses?.find((e: any) => e.year === yr);
      
      if (!yearExpense && yr === startYear) {
        yearlyResults[yr] = {
          'micro-foncier': { totalTax: 0 },
          'reel-foncier': { totalTax: 0 },
          'micro-bic': { totalTax: 0 },
          'reel-bic': { totalTax: 0 }
        } as Record<TaxRegime, any>;
      } else if (yearExpense) {
        try {
          if (yr === startYear) {
            yearlyResults[yr] = calculateAllTaxRegimes(investment, yr);
          } else {
            yearlyResults[yr] = calculateAllTaxRegimes(investment, yr, yearlyResults[yr - 1]);
          }
        } catch (error) {
          yearlyResults[yr] = yearlyResults[yr - 1] || {
            'micro-foncier': { totalTax: 0 },
            'reel-foncier': { totalTax: 0 },
            'micro-bic': { totalTax: 0 },
            'reel-bic': { totalTax: 0 }
          } as Record<TaxRegime, any>;
        }
      } else {
        yearlyResults[yr] = yearlyResults[yr - 1] || {
          'micro-foncier': { totalTax: 0 },
          'reel-foncier': { totalTax: 0 },
          'micro-bic': { totalTax: 0 },
          'reel-bic': { totalTax: 0 }
        } as Record<TaxRegime, any>;
      }
    });

    // Calculer le cashflow cumulé net
    let cumulativeCashflowNet = 0;
    
    years.forEach(yr => {
      const yearExpense = investment.expenses?.find((e: any) => e.year === yr);
      if (!yearExpense) return;

      // Calcul des revenus selon le régime
      const rent = Number(yearExpense.rent || 0);
      const furnishedRent = Number(yearExpense.furnishedRent || 0);
      const tenantCharges = Number(yearExpense.tenantCharges || 0);
      const taxBenefit = Number(yearExpense.taxBenefit || 0);

      const revenues = (regime === 'micro-bic' || regime === 'reel-bic')
        ? furnishedRent + tenantCharges
        : rent + taxBenefit + tenantCharges;

      // Total des dépenses
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

      // Cash flow SANS imposition pour cette année
      const cashFlowBeforeTax = revenues - expenses;

      // Calculer l'imposition pour cette année et ce régime
      const taxation = yearlyResults[yr]?.[regime]?.totalTax || 0;

      // Cash flow NET (avec imposition) pour cette année
      const annualCashFlowNet = cashFlowBeforeTax - taxation;
      
      cumulativeCashflowNet += annualCashFlowNet;
    });

    return cumulativeCashflowNet;
  };

  // Fonction pour trouver l'année minimale pour atteindre un cashflow cumulé souhaité pour un régime donné
  const findYearForTargetCashflow = (targetCashflow: number, regime: TaxRegime): { year: number | null; cashflow: number | null } => {
    if (!investment) return { year: null, cashflow: null };
    
    const startYear = investment.projectStartDate ? new Date(investment.projectStartDate).getFullYear() : new Date().getFullYear();
    const endYear = investment.projectEndDate ? new Date(investment.projectEndDate).getFullYear() : startYear;
    
    // Parcourir toutes les années pour trouver la première où le cashflow cumulé atteint ou dépasse le cashflow souhaité
    for (let year = startYear; year <= endYear; year++) {
      const cashflow = calculateCumulativeCashflowForRegime(year, regime);
      if (cashflow >= targetCashflow) {
        return { year, cashflow };
      }
    }
    
    // Si on n'a pas trouvé, retourner null
    return { year: null, cashflow: null };
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Objectif - {objectiveType === 'revente' ? 'Revente' : 'Cashflow'}</h2>
      
      {!canCalculate && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Calculs non disponibles
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Les calculs ne peuvent pas être réalisés tant que les données nécessaires ne sont pas suffisamment renseignées.
                </p>
                <p className="mt-2">
                  Veuillez compléter au minimum :
                </p>
                <ul className="mt-1 list-disc list-inside space-y-1">
                  <li>Les informations d'acquisition (prix d'achat, frais...)</li>
                            <li>Les données de location (revenus et frais)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {canCalculate && objectiveType === 'revente' && (() => {
        // Calculer l'année minimale pour chaque régime pour atteindre le gain souhaité
        const regimes: TaxRegime[] = ['micro-foncier', 'reel-foncier', 'micro-bic', 'reel-bic'];
        const results = regimes.map(regime => {
          const result = findYearForTargetGain(objectiveTargetGain, regime);
          return { regime, ...result };
        });
        
        // Trouver le régime optimal (année minimale)
        const validResults = results.filter(r => r.year !== null);
        const optimalRegime = validResults.length > 0 
          ? validResults.reduce((best, current) => {
              if (!best || !current.year) return current;
              if (!current.year) return best;
              return current.year < best.year ? current : best;
            })
          : null;
        
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Année de revente pour atteindre {formatCurrency(objectiveTargetGain)} par régime fiscal
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {results.map((result) => {
                const isOptimal = optimalRegime && result.regime === optimalRegime.regime;
                
                return (
                  <div
                    key={result.regime}
                    className={`border rounded-lg p-4 ${
                      isOptimal 
                        ? 'bg-blue-50 border-blue-300 border-2' 
                        : result.balanceData && result.balanceData.totalGain >= 0 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${
                          isOptimal 
                            ? 'text-blue-900' 
                            : result.balanceData && result.balanceData.totalGain >= 0 
                              ? 'text-green-900' 
                              : 'text-red-900'
                        }`}>
                          {REGIME_LABELS[result.regime]}
                        </span>
                        {isOptimal && (
                          <span className="text-xs font-bold text-blue-700 bg-blue-200 px-2 py-1 rounded">
                            OPTIMAL
                          </span>
                        )}
                      </div>
                      {result.year ? (
                        <span className={`text-xl font-bold ${
                          isOptimal ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          Année {result.year}
                        </span>
                      ) : (
                        <span className="text-sm font-medium text-gray-500">
                          Objectif non atteignable
                        </span>
                      )}
                    </div>
                    {result.balanceData && (
                      <>
                        <div className={`text-lg font-bold mb-2 ${
                          result.balanceData.totalGain >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          Gain total : {formatCurrency(result.balanceData.totalGain)}
                        </div>
                        <div className="text-xs text-gray-600 mt-2 space-y-1">
                          <div>Cash flow cumulé net : {formatCurrency(result.balanceData.cumulativeCashFlowBeforeTax)}</div>
                          <div>Solde de revente : {formatCurrency(result.balanceData.saleBalance)}</div>
                          <div>Impôt sur la plus-value : {formatCurrency(-result.balanceData.capitalGainTax)}</div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {canCalculate && objectiveType === 'cashflow' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Année d'atteinte pour {formatCurrency(objectiveTargetCashflow)} de cashflow cumulé par régime fiscal
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {(Object.keys(REGIME_LABELS) as TaxRegime[]).map((regime) => {
              const result = findYearForTargetCashflow(objectiveTargetCashflow, regime);
              const isOptimal = result.year !== null && (() => {
                const allResults = (Object.keys(REGIME_LABELS) as TaxRegime[]).map(r => findYearForTargetCashflow(objectiveTargetCashflow, r));
                const validResults = allResults.filter(r => r.year !== null);
                if (validResults.length === 0) return false;
                const minYear = Math.min(...validResults.map(r => r.year!));
                return result.year === minYear;
              })();
              
              return (
                <div
                  key={regime}
                  className={`border rounded-lg p-4 ${
                    isOptimal ? 'bg-blue-50 border-blue-300 border-2' : result.year !== null ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-semibold ${
                      isOptimal ? 'text-blue-900' : result.year !== null ? 'text-green-900' : 'text-gray-600'
                    }`}>
                      {REGIME_LABELS[regime]}
                      {isOptimal && <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">Optimal</span>}
                    </span>
                    {result.year !== null ? (
                      <span className={`text-xl font-bold ${
                        isOptimal ? 'text-blue-900' : 'text-green-900'
                      }`}>
                        Année {result.year}
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-gray-500">
                        Non atteignable
                      </span>
                    )}
                  </div>
                  {result.cashflow !== null && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Cashflow cumulé:</span>
                        <span className={`text-sm font-semibold ${
                          result.cashflow >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {formatCurrency(result.cashflow)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

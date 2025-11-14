/**
 * Composant SCIObjectiveDetailsDisplay
 * 
 * Affiche le détail des objectifs (Revente ou Cashflow) par type de location
 * pour les biens détenus en SCI dans la zone principale de la page Objectif.
 */

import { Investment } from '../types/investment';
import { generateAmortizationSchedule } from '../utils/calculations';
import { getLoanInfoForYear, getYearCoverage } from '../utils/propertyCalculations';

interface Props {
  investment: Investment;
  objectiveType: 'revente' | 'cashflow';
  objectiveYear: number;
  objectiveTargetGain?: number;
  objectiveTargetCashflow?: number;
}

type RentalType = 'unfurnished' | 'furnished';

const RENTAL_TYPE_LABELS: Record<RentalType, string> = {
  'unfurnished': 'Location nue',
  'furnished': 'Location meublée'
};

export default function SCIObjectiveDetailsDisplay({ 
  investment, 
  objectiveType, 
  objectiveYear, 
  objectiveTargetGain = 50000, 
  objectiveTargetCashflow = 10000 
}: Props) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  // Vérifier si les données sont suffisamment renseignées pour les calculs
  const hasMinimumData = () => {
    if (!investment) return false;
    const hasAcquisitionData = investment.purchasePrice && investment.purchasePrice > 0;
    if (!hasAcquisitionData) return false;
    
    const hasExpenseData = investment.expenses && investment.expenses.length > 0;
    if (!hasExpenseData) return false;
    
    const startYear = investment.projectStartDate ? new Date(investment.projectStartDate).getFullYear() : new Date().getFullYear();
    
    if (objectiveType === 'cashflow') {
      return investment.expenses.some((e: any) => e.year === objectiveYear);
    } else {
      return investment.expenses.some((e: any) => {
        const expenseYear = e.year;
        return expenseYear >= startYear;
      });
    }
  };

  const canCalculate = hasMinimumData();

  // Fonction pour calculer le cashflow net pour un type de location donné
  // Pour SCI, pas d'IRPP, donc on calcule avant IS (l'IS est calculé au niveau de la SCI)
  const calculateCashFlowForRentalType = (year: number, rentalType: RentalType): number => {
    if (!investment?.expenses) return 0;
    
    const expense = investment.expenses.find((e: any) => e.year === year);
    if (!expense) return 0;

    // Calculer le prorata temporel pour cette année
    const coverage = getYearCoverage(investment, year);
    const adjustForCoverage = (value: number) => value * coverage;

    // Revenus selon le type de location
    const revenues = rentalType === 'furnished' 
      ? adjustForCoverage(Number(expense.furnishedRent || 0))
      : adjustForCoverage(Number(expense.rent || 0));
    
    const tenantCharges = adjustForCoverage(Number(expense.tenantCharges || 0));
    const taxBenefit = adjustForCoverage(Number(expense.taxBenefit || 0));

    // Charges
    const charges = 
      adjustForCoverage(Number(expense.propertyTax || 0)) +
      adjustForCoverage(Number(expense.condoFees || 0)) +
      adjustForCoverage(Number(expense.insurance || 0)) +
      adjustForCoverage(Number(expense.maintenance || 0)) +
      adjustForCoverage(Number(expense.managementFees || 0)) +
      adjustForCoverage(Number(expense.otherDeductible || 0)) +
      adjustForCoverage(Number(expense.otherNonDeductible || 0)) -
      adjustForCoverage(Number(expense.tenantCharges || 0));

    // Coûts du prêt (dynamiques)
    const loanInfo = getLoanInfoForYear(investment, year);
    const loanCosts = loanInfo.payment + loanInfo.insurance;

    // Cash flow AVANT IS (l'IS est calculé au niveau de la SCI, pas par bien)
    return revenues + taxBenefit + tenantCharges - charges - loanCosts;
  };

  // Fonction pour calculer le gain total cumulé pour une année et un type de location donnés
  const calculateBalanceForYear = (year: number, rentalType: RentalType) => {
    if (!investment) return null;

    const startYear = new Date(investment.projectStartDate).getFullYear();
    const endYear = new Date(investment.projectEndDate).getFullYear();
    const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
    
    if (year < startYear || year > endYear) return null;

    // Calculer les valeurs cumulées jusqu'à l'année sélectionnée (avant IS)
    let cumulativeCashFlow = 0;

    years.forEach((yr) => {
      if (yr > year) return;
      
      const yearExpense = investment.expenses?.find((e: any) => e.year === yr);
      if (!yearExpense) return;

      const coverage = getYearCoverage(investment, yr);
      const adjustForCoverage = (value: number) => value * coverage;

      // Revenus selon le type de location
      const revenues = rentalType === 'furnished' 
        ? adjustForCoverage(Number(yearExpense.furnishedRent || 0))
        : adjustForCoverage(Number(yearExpense.rent || 0));
      
      const tenantCharges = adjustForCoverage(Number(yearExpense.tenantCharges || 0));
      const taxBenefit = adjustForCoverage(Number(yearExpense.taxBenefit || 0));

      // Charges
      const charges = 
        adjustForCoverage(Number(yearExpense.propertyTax || 0)) +
        adjustForCoverage(Number(yearExpense.condoFees || 0)) +
        adjustForCoverage(Number(yearExpense.insurance || 0)) +
        adjustForCoverage(Number(yearExpense.maintenance || 0)) +
        adjustForCoverage(Number(yearExpense.managementFees || 0)) +
        adjustForCoverage(Number(yearExpense.otherDeductible || 0)) +
        adjustForCoverage(Number(yearExpense.otherNonDeductible || 0)) -
        adjustForCoverage(Number(yearExpense.tenantCharges || 0));

      // Coûts du prêt
      const loanInfo = getLoanInfoForYear(investment, yr);
      const loanCosts = loanInfo.payment + loanInfo.insurance;

      // Cash flow annuel avant IS
      const annualCashFlow = revenues + taxBenefit + tenantCharges - charges - loanCosts;
      
      cumulativeCashFlow += annualCashFlow;
    });

    // Récupérer les paramètres de vente depuis localStorage
    const investmentId = `${investment.purchasePrice || 0}_${investment.startDate || ''}`;
    const saleParamsStr = typeof window !== 'undefined' ? localStorage.getItem(`saleParameters_${investmentId}`) : null;
    const saleParams = saleParamsStr ? JSON.parse(saleParamsStr) : { annualIncrease: 2, agencyFees: 0, earlyRepaymentFees: 0 };

    // Calculer le solde de revente pour l'année sélectionnée
    const yearsSincePurchase = year - startYear;
    const revaluedValue = Number(investment.purchasePrice) * Math.pow(1 + (saleParams.annualIncrease / 100), yearsSincePurchase);

    // Calculer le capital restant dû
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

    const saleBalance = revaluedValue - saleParams.agencyFees - remainingBalance - saleParams.earlyRepaymentFees;

    // Calculer l'impôt sur la plus-value (IS 25% pour SCI, sans abattement)
    const purchasePrice = Number(investment.purchasePrice) || 0;
    const acquisitionFees = (Number(investment.notaryFees) || 0) + (Number(investment.agencyFees) || 0);
    const improvementWorks = Number(investment.improvementWorks) || 0;
    const adjustedPurchasePrice = purchasePrice + acquisitionFees + improvementWorks;
    const grossCapitalGain = revaluedValue - adjustedPurchasePrice;
    
    const capitalGainTax = grossCapitalGain > 0 ? grossCapitalGain * 0.25 : 0;

    // Gain total cumulé (cash flow cumulé + solde de vente - impôt PV - apport)
    const downPayment = Number(investment.downPayment) || 0;
    const totalGain = cumulativeCashFlow + saleBalance - capitalGainTax - downPayment;

    return {
      year,
      downPayment,
      cumulativeCashFlow,
      cumulativeTax: 0, // L'IS est calculé au niveau de la SCI, pas par bien
      saleBalance,
      capitalGainTax,
      totalGain
    };
  };

  // Fonction pour trouver l'année minimale pour atteindre un gain total souhaité pour un type de location donné
  const findYearForTargetGain = (targetGain: number, rentalType: RentalType): { year: number | null; balanceData: any } => {
    if (!investment) return { year: null, balanceData: null };
    
    const startYear = investment.projectStartDate ? new Date(investment.projectStartDate).getFullYear() : new Date().getFullYear();
    const endYear = investment.projectEndDate ? new Date(investment.projectEndDate).getFullYear() : startYear;
    
    // Parcourir toutes les années pour trouver la première où le gain total atteint ou dépasse le gain souhaité
    for (let year = startYear; year <= endYear; year++) {
      const balanceData = calculateBalanceForYear(year, rentalType);
      if (balanceData && balanceData.totalGain >= targetGain) {
        return { year, balanceData };
      }
    }
    
    // Si on n'a pas trouvé, retourner la dernière année disponible
    const lastYearBalance = calculateBalanceForYear(endYear, rentalType);
    return { year: null, balanceData: lastYearBalance };
  };

  // Fonction pour calculer le cashflow cumulé jusqu'à une année donnée pour un type de location
  const calculateCumulativeCashflowForRentalType = (year: number, rentalType: RentalType): number => {
    if (!investment) return 0;
    
    const startYear = investment.projectStartDate ? new Date(investment.projectStartDate).getFullYear() : new Date().getFullYear();
    const years = Array.from({ length: year - startYear + 1 }, (_, i) => startYear + i);
    
    // Calculer le cashflow cumulé
    let cumulativeCashflow = 0;
    
    years.forEach(yr => {
      const yearExpense = investment.expenses?.find((e: any) => e.year === yr);
      if (!yearExpense) return;

      const coverage = getYearCoverage(investment, yr);
      const adjustForCoverage = (value: number) => value * coverage;

      // Revenus selon le type de location
      const revenues = rentalType === 'furnished' 
        ? adjustForCoverage(Number(yearExpense.furnishedRent || 0))
        : adjustForCoverage(Number(yearExpense.rent || 0));
      
      const tenantCharges = adjustForCoverage(Number(yearExpense.tenantCharges || 0));
      const taxBenefit = adjustForCoverage(Number(yearExpense.taxBenefit || 0));

      // Charges
      const charges = 
        adjustForCoverage(Number(yearExpense.propertyTax || 0)) +
        adjustForCoverage(Number(yearExpense.condoFees || 0)) +
        adjustForCoverage(Number(yearExpense.insurance || 0)) +
        adjustForCoverage(Number(yearExpense.maintenance || 0)) +
        adjustForCoverage(Number(yearExpense.managementFees || 0)) +
        adjustForCoverage(Number(yearExpense.otherDeductible || 0)) +
        adjustForCoverage(Number(yearExpense.otherNonDeductible || 0)) -
        adjustForCoverage(Number(yearExpense.tenantCharges || 0));

      // Coûts du prêt
      const loanInfo = getLoanInfoForYear(investment, yr);
      const loanCosts = loanInfo.payment + loanInfo.insurance;

      // Cash flow annuel avant IS
      const annualCashFlow = revenues + taxBenefit + tenantCharges - charges - loanCosts;
      
      cumulativeCashflow += annualCashFlow;
    });

    return cumulativeCashflow;
  };

  // Fonction pour trouver l'année minimale pour atteindre un cashflow cumulé souhaité pour un type de location donné
  const findYearForTargetCashflow = (targetCashflow: number, rentalType: RentalType): { year: number | null; cashflow: number | null } => {
    if (!investment) return { year: null, cashflow: null };
    
    const startYear = investment.projectStartDate ? new Date(investment.projectStartDate).getFullYear() : new Date().getFullYear();
    const endYear = investment.projectEndDate ? new Date(investment.projectEndDate).getFullYear() : startYear;
    
    // Parcourir toutes les années pour trouver la première où le cashflow cumulé atteint ou dépasse le cashflow souhaité
    for (let year = startYear; year <= endYear; year++) {
      const cashflow = calculateCumulativeCashflowForRentalType(year, rentalType);
      if (cashflow >= targetCashflow) {
        return { year, cashflow };
      }
    }
    
    // Si on n'a pas trouvé, retourner null
    return { year: null, cashflow: null };
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Objectif - {objectiveType === 'revente' ? 'Revente' : 'Cashflow'} (SCI)
      </h2>
      
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
        // Calculer l'année minimale pour chaque type de location pour atteindre le gain souhaité
        const rentalTypes: RentalType[] = ['unfurnished', 'furnished'];
        const results = rentalTypes.map(rentalType => {
          const result = findYearForTargetGain(objectiveTargetGain, rentalType);
          return { rentalType, ...result };
        });
        
        // Trouver le type de location optimal (année minimale)
        const validResults = results.filter(r => r.year !== null);
        const optimalRentalType = validResults.length > 0 
          ? validResults.reduce((best, current) => {
              if (!best || !current.year) return current;
              if (!current.year) return best;
              return current.year < best.year ? current : best;
            })
          : null;
        
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Année de revente pour atteindre {formatCurrency(objectiveTargetGain)} par type de location
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {results.map((result) => {
                const isOptimal = optimalRentalType && result.rentalType === optimalRentalType.rentalType;
                
                return (
                  <div
                    key={result.rentalType}
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
                          {RENTAL_TYPE_LABELS[result.rentalType]}
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
                          <div>Cash flow cumulé (avant IS) : {formatCurrency(result.balanceData.cumulativeCashFlow)}</div>
                          <div>Solde de revente : {formatCurrency(result.balanceData.saleBalance)}</div>
                          <div>Impôt sur la plus-value (IS 25%) : {formatCurrency(-result.balanceData.capitalGainTax)}</div>
                        </div>
                        <div className="text-xs text-amber-600 mt-2 italic">
                          Note : L'IS est calculé au niveau de la SCI sur l'ensemble de ses biens
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
            Année d'atteinte pour {formatCurrency(objectiveTargetCashflow)} de cashflow cumulé par type de location
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {(Object.keys(RENTAL_TYPE_LABELS) as RentalType[]).map((rentalType) => {
              const result = findYearForTargetCashflow(objectiveTargetCashflow, rentalType);
              const isOptimal = result.year !== null && (() => {
                const allResults = (Object.keys(RENTAL_TYPE_LABELS) as RentalType[]).map(rt => findYearForTargetCashflow(objectiveTargetCashflow, rt));
                const validResults = allResults.filter(r => r.year !== null);
                if (validResults.length === 0) return false;
                const minYear = Math.min(...validResults.map(r => r.year!));
                return result.year === minYear;
              })();
              
              return (
                <div
                  key={rentalType}
                  className={`border rounded-lg p-4 ${
                    isOptimal ? 'bg-blue-50 border-blue-300 border-2' : result.year !== null ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-semibold ${
                      isOptimal ? 'text-blue-900' : result.year !== null ? 'text-green-900' : 'text-gray-600'
                    }`}>
                      {RENTAL_TYPE_LABELS[rentalType]}
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
                        <span className="text-xs text-gray-600">Cashflow cumulé (avant IS):</span>
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
          <div className="text-xs text-amber-600 mt-4 italic">
            Note : L'IS est calculé au niveau de la SCI sur l'ensemble de ses biens, pas par bien individuellement.
          </div>
        </div>
      )}
    </div>
  );
}


import { Investment, TaxRegime, TaxResults } from '../types/investment';

const TAX_CONSTANTS = {
  MICRO_FONCIER_ALLOWANCE: 0.3, // 30% d'abattement
  MICRO_BIC_ALLOWANCE: 0.5, // 50% d'abattement pour LMNP
  MICRO_FONCIER_THRESHOLD: 15000, // Seuil du régime micro-foncier
  MICRO_BIC_THRESHOLD: 72600, // Seuil du régime micro-BIC
};

function calculateDeductibleExpenses(investment: Investment, year: number): number {
  const yearExpenses = investment.expenses.find(e => e.year === year);
  if (!yearExpenses) return 0;

  return (
    Number(yearExpenses.propertyTax || 0) +
    Number(yearExpenses.condoFees || 0) +
    Number(yearExpenses.propertyInsurance || 0) +
    Number(yearExpenses.managementFees || 0) +
    Number(yearExpenses.unpaidRentInsurance || 0) +
    Number(yearExpenses.repairs || 0) +
    Number(yearExpenses.otherDeductible || 0) +
    Number(yearExpenses.loanInsurance || 0) +
    Number(yearExpenses.interest || 0)
  );
}

function calculateAnnualRevenue(investment: Investment, year: number): number {
  const yearExpenses = investment.expenses.find(e => e.year === year);
  if (!yearExpenses) return 0;

  return Number(yearExpenses.rent || 0) + Number(yearExpenses.tenantCharges || 0);
}

function calculateMicroFoncier(
  investment: Investment,
  year: number
): TaxResults {
  const annualRevenue = calculateAnnualRevenue(investment, year);
  const taxableIncome = annualRevenue * (1 - TAX_CONSTANTS.MICRO_FONCIER_ALLOWANCE);
  const tax = taxableIncome * (investment.taxParameters.taxRate / 100);
  const socialCharges = taxableIncome * (investment.taxParameters.socialChargesRate / 100);

  return {
    regime: 'micro-foncier',
    taxableIncome,
    tax,
    socialCharges,
    totalTax: tax + socialCharges,
    netIncome: annualRevenue - tax - socialCharges
  };
}

function calculateReelFoncier(
  investment: Investment,
  year: number
): TaxResults {
  const annualRevenue = calculateAnnualRevenue(investment, year);
  const deductibleExpenses = calculateDeductibleExpenses(investment, year);
  const previousDeficit = investment.taxParameters.previousDeficit;

  let taxableIncome = annualRevenue - deductibleExpenses - previousDeficit;
  let deficit = 0;

  if (taxableIncome < 0) {
    deficit = Math.min(Math.abs(taxableIncome), investment.taxParameters.deficitLimit);
    taxableIncome = 0;
  }

  const tax = taxableIncome * (investment.taxParameters.taxRate / 100);
  const socialCharges = taxableIncome * (investment.taxParameters.socialChargesRate / 100);

  return {
    regime: 'reel-foncier',
    taxableIncome,
    tax,
    socialCharges,
    totalTax: tax + socialCharges,
    netIncome: annualRevenue - tax - socialCharges,
    deficit
  };
}

function calculateMicroBIC(
  investment: Investment,
  year: number
): TaxResults {
  const annualRevenue = calculateAnnualRevenue(investment, year);
  const taxableIncome = annualRevenue * (1 - TAX_CONSTANTS.MICRO_BIC_ALLOWANCE);
  const tax = taxableIncome * (investment.taxParameters.taxRate / 100);
  const socialCharges = taxableIncome * (investment.taxParameters.socialChargesRate / 100);

  return {
    regime: 'micro-bic',
    taxableIncome,
    tax,
    socialCharges,
    totalTax: tax + socialCharges,
    netIncome: annualRevenue - tax - socialCharges
  };
}

function calculateReelBIC(
  investment: Investment,
  year: number
): TaxResults {
  const annualRevenue = calculateAnnualRevenue(investment, year);
  const deductibleExpenses = calculateDeductibleExpenses(investment, year);

  // Calcul des amortissements
  const buildingAmortization = investment.taxParameters.buildingValue / 
    investment.taxParameters.buildingAmortizationYears;
  
  const furnitureAmortization = investment.taxParameters.furnitureValue /
    investment.taxParameters.furnitureAmortizationYears;

  const totalAmortization = buildingAmortization + furnitureAmortization;
  
  const taxableIncome = Math.max(0, annualRevenue - deductibleExpenses - totalAmortization);
  const tax = taxableIncome * (investment.taxParameters.taxRate / 100);
  const socialCharges = taxableIncome * (investment.taxParameters.socialChargesRate / 100);

  return {
    regime: 'reel-bic',
    taxableIncome,
    tax,
    socialCharges,
    totalTax: tax + socialCharges,
    netIncome: annualRevenue - tax - socialCharges,
    amortization: {
      building: buildingAmortization,
      furniture: furnitureAmortization,
      total: totalAmortization
    }
  };
}

export function calculateAllTaxRegimes(
  investment: Investment,
  year: number
): Record<TaxRegime, TaxResults> {
  return {
    'micro-foncier': calculateMicroFoncier(investment, year),
    'reel-foncier': calculateReelFoncier(investment, year),
    'micro-bic': calculateMicroBIC(investment, year),
    'reel-bic': calculateReelBIC(investment, year)
  };
}

export function isEligibleForMicroFoncier(investment: Investment, year: number): boolean {
  const annualRevenue = calculateAnnualRevenue(investment, year);
  return annualRevenue <= TAX_CONSTANTS.MICRO_FONCIER_THRESHOLD;
}

export function isEligibleForMicroBIC(investment: Investment, year: number): boolean {
  const annualRevenue = calculateAnnualRevenue(investment, year);
  return annualRevenue <= TAX_CONSTANTS.MICRO_BIC_THRESHOLD;
}

export function getRecommendedRegime(
  investment: Investment,
  year: number
): TaxRegime {
  const results = calculateAllTaxRegimes(investment, year);
  
  // Vérifier l'éligibilité aux régimes micro
  const canUseMicroFoncier = isEligibleForMicroFoncier(investment, year);
  const canUseMicroBIC = isEligibleForMicroBIC(investment, year);

  // Comparer les résultats nets
  const netIncomes = {
    'micro-foncier': canUseMicroFoncier ? results['micro-foncier'].netIncome : -Infinity,
    'reel-foncier': results['reel-foncier'].netIncome,
    'micro-bic': canUseMicroBIC ? results['micro-bic'].netIncome : -Infinity,
    'reel-bic': results['reel-bic'].netIncome
  };

  // Trouver le régime avec le revenu net le plus élevé
  return Object.entries(netIncomes).reduce((a, b) => 
    b[1] > a[1] ? b : a
  )[0] as TaxRegime;
}
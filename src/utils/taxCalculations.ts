import { Investment, TaxRegime, TaxResults, YearlyExpenses } from '../types/investment';

const TAX_CONSTANTS = {
  MICRO_FONCIER_ALLOWANCE: 0.3, // 30% d'abattement
  MICRO_BIC_ALLOWANCE: 0.5, // 50% d'abattement pour LMNP
  MICRO_FONCIER_THRESHOLD: 15000, // Seuil du régime micro-foncier
  MICRO_BIC_THRESHOLD: 72600, // Seuil du régime micro-BIC
};

function calculateDeductibleExpenses(investment: Investment, year: number): number {
  const yearExpenses = investment.expenses.find(e => e.year === year);
  if (!yearExpenses) return 0;

  // Calcul du total des charges déductibles
  const totalDeductibleExpenses = (
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

  // Soustraction des charges locataires
  const tenantCharges = Number(yearExpenses.tenantCharges || 0);

  return totalDeductibleExpenses - tenantCharges;
}

function calculateAnnualRevenue(investment: Investment, year: number, regime?: TaxRegime): number {
  const yearExpenses = investment.expenses.find(e => e.year === year);
  if (!yearExpenses) return 0;

  // Pour les régimes de location nue (micro-foncier et réel-foncier), on utilise uniquement le loyer nu
  if (regime === 'micro-foncier' || regime === 'reel-foncier') {
    return Number(yearExpenses.rent || 0);
  }
  
  // Pour les régimes de location meublée (micro-bic et réel-bic), on utilise uniquement le loyer meublé
  if (regime === 'micro-bic' || regime === 'reel-bic') {
    return Number(yearExpenses.furnishedRent || 0);
  }

  // Si aucun régime n'est spécifié, on utilise la somme des deux
  return Number(yearExpenses.rent || 0) + Number(yearExpenses.furnishedRent || 0);
}

function calculateMicroFoncier(
  investment: Investment,
  year: number,
  yearExpenses: YearlyExpenses
): TaxResults {
  const annualRevenue = calculateAnnualRevenue(investment, year, 'micro-foncier');
  const taxableIncome = annualRevenue * (1 - TAX_CONSTANTS.MICRO_FONCIER_ALLOWANCE);
  const tax = taxableIncome * (investment.taxParameters.taxRate / 100);
  const socialCharges = taxableIncome * (investment.taxParameters.socialChargesRate / 100);

  // Calcul du revenu net
  const netIncome = annualRevenue + 
                   Number(yearExpenses.tenantCharges || 0) + 
                   Number(yearExpenses.taxBenefit || 0) - 
                   (tax + socialCharges);

  return {
    regime: 'micro-foncier',
    taxableIncome,
    tax,
    socialCharges,
    totalTax: tax + socialCharges,
    netIncome,
    deficit: undefined,
    amortization: undefined
  };
}

function calculateReelFoncier(
  investment: Investment,
  year: number,
  yearExpenses: YearlyExpenses
): TaxResults {
  const annualRevenue = calculateAnnualRevenue(investment, year, 'reel-foncier');
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

  // Calcul du revenu net
  const netIncome = annualRevenue + 
                   Number(yearExpenses.tenantCharges || 0) + 
                   Number(yearExpenses.taxBenefit || 0) - 
                   (tax + socialCharges);

  return {
    regime: 'reel-foncier',
    taxableIncome,
    tax,
    socialCharges,
    totalTax: tax + socialCharges,
    netIncome,
    deficit,
    amortization: undefined
  };
}

function calculateMicroBIC(
  investment: Investment,
  year: number,
  yearExpenses: YearlyExpenses
): TaxResults {
  const annualRevenue = calculateAnnualRevenue(investment, year, 'micro-bic');
  const taxableIncome = annualRevenue * (1 - TAX_CONSTANTS.MICRO_BIC_ALLOWANCE);
  const tax = taxableIncome * (investment.taxParameters.taxRate / 100);
  const socialCharges = taxableIncome * (investment.taxParameters.socialChargesRate / 100);

  // Calcul du revenu net
  const netIncome = annualRevenue + 
                   Number(yearExpenses.tenantCharges || 0) - 
                   (tax + socialCharges);

  return {
    regime: 'micro-bic',
    taxableIncome,
    tax,
    socialCharges,
    totalTax: tax + socialCharges,
    netIncome,
    deficit: undefined,
    amortization: undefined
  };
}

function calculateReelBIC(
  investment: Investment,
  year: number,
  yearExpenses: YearlyExpenses
): TaxResults {
  const annualRevenue = calculateAnnualRevenue(investment, year, 'reel-bic');
  const deductibleExpenses = calculateDeductibleExpenses(investment, year);

  // Calcul des amortissements
  const buildingAmortization = investment.taxParameters.buildingValue / 
    investment.taxParameters.buildingAmortizationYears;
  
  const furnitureAmortization = investment.taxParameters.furnitureValue /
    investment.taxParameters.furnitureAmortizationYears;

  const totalAmortization = buildingAmortization + furnitureAmortization;
  
  // Revenus moins charges
  const revenueMinusExpenses = annualRevenue - deductibleExpenses;
  
  // L'amortissement utilisé est limité par le montant du résultat avant amortissement
  // On ne peut pas créer de déficit fiscal avec les amortissements
  const usedAmortization = Math.min(totalAmortization, Math.max(0, revenueMinusExpenses));
  
  const taxableIncome = Math.max(0, revenueMinusExpenses - usedAmortization);
  const tax = taxableIncome * (investment.taxParameters.taxRate / 100);
  const socialCharges = taxableIncome * (investment.taxParameters.socialChargesRate / 100);

  // Calcul du revenu net
  const netIncome = annualRevenue + 
                   Number(yearExpenses.tenantCharges || 0) - 
                   (tax + socialCharges);

  return {
    regime: 'reel-bic',
    taxableIncome,
    tax,
    socialCharges,
    totalTax: tax + socialCharges,
    netIncome,
    deficit: undefined,
    amortization: {
      building: buildingAmortization,
      furniture: furnitureAmortization,
      total: totalAmortization,
      used: usedAmortization
    }
  };
}

export function calculateAllTaxRegimes(
  investment: Investment,
  year: number
): Record<TaxRegime, TaxResults> {
  const yearExpenses = investment.expenses.find(e => e.year === year);
  if (!yearExpenses) {
    const defaultExpenses: YearlyExpenses = {
      year,
      propertyTax: 0,
      condoFees: 0,
      propertyInsurance: 0,
      managementFees: 0,
      unpaidRentInsurance: 0,
      repairs: 0,
      otherDeductible: 0,
      otherNonDeductible: 0,
      rent: 0,
      furnishedRent: 0,
      tenantCharges: 0,
      tax: 0,
      deficit: 0,
      loanPayment: 0,
      loanInsurance: 0,
      taxBenefit: 0,
      interest: 0
    };

    return {
      'micro-foncier': calculateMicroFoncier(investment, year, defaultExpenses),
      'reel-foncier': calculateReelFoncier(investment, year, defaultExpenses),
      'micro-bic': calculateMicroBIC(investment, year, defaultExpenses),
      'reel-bic': calculateReelBIC(investment, year, defaultExpenses)
    };
  }

  return {
    'micro-foncier': calculateMicroFoncier(investment, year, yearExpenses),
    'reel-foncier': calculateReelFoncier(investment, year, yearExpenses),
    'micro-bic': calculateMicroBIC(investment, year, yearExpenses),
    'reel-bic': calculateReelBIC(investment, year, yearExpenses)
  };
}

export function isEligibleForMicroFoncier(investment: Investment, year: number): boolean {
  const annualRevenue = calculateAnnualRevenue(investment, year, 'micro-foncier');
  return annualRevenue <= TAX_CONSTANTS.MICRO_FONCIER_THRESHOLD;
}

export function isEligibleForMicroBIC(investment: Investment, year: number): boolean {
  const annualRevenue = calculateAnnualRevenue(investment, year, 'micro-bic');
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

export function calculateTaxResults(
  investment: Investment,
  year: number
): Record<TaxRegime, TaxResults> {
  return calculateAllTaxRegimes(investment, year);
}

export function calculateGrossYield(
  investment: Investment,
  year: number,
  regime: TaxRegime,
  yearExpenses: YearlyExpenses
): number {
  // Calculer le revenu annuel selon le régime
  const annualRevenue = calculateAnnualRevenue(investment, year, regime);
  
  // Calculer le total des revenus (incluant les charges locataires et l'aide fiscale)
  let totalRevenue = annualRevenue;
  
  // Pour les régimes de location nue, on ajoute les charges locataires et l'aide fiscale
  if (regime === 'micro-foncier' || regime === 'reel-foncier') {
    totalRevenue += Number(yearExpenses.tenantCharges || 0) + Number(yearExpenses.taxBenefit || 0);
  }
  
  // Pour les régimes LMNP, on ajoute uniquement les charges locataires
  if (regime === 'micro-bic' || regime === 'reel-bic') {
    totalRevenue += Number(yearExpenses.tenantCharges || 0);
  }

  // Calculer le total de l'investissement initial
  const totalInvestment = investment.purchasePrice + 
                         investment.agencyFees + 
                         investment.renovationCosts;

  // Calculer le rendement brut en pourcentage
  const grossYield = (totalRevenue / totalInvestment) * 100;

  console.log(`Gross yield calculation for ${regime} in ${year}:`, {
    annualRevenue,
    totalRevenue,
    totalInvestment,
    grossYield
  });

  return grossYield;
}

export function calculateAllGrossYields(
  investment: Investment,
  year: number
): Record<TaxRegime, number> {
  const yearExpenses = investment.expenses.find(e => e.year === year);
  if (!yearExpenses) {
    const defaultExpenses: YearlyExpenses = {
      year,
      propertyTax: 0,
      condoFees: 0,
      propertyInsurance: 0,
      managementFees: 0,
      unpaidRentInsurance: 0,
      repairs: 0,
      otherDeductible: 0,
      otherNonDeductible: 0,
      rent: 0,
      furnishedRent: 0,
      tenantCharges: 0,
      tax: 0,
      deficit: 0,
      loanPayment: 0,
      loanInsurance: 0,
      taxBenefit: 0,
      interest: 0
    };

    return {
      'micro-foncier': calculateGrossYield(investment, year, 'micro-foncier', defaultExpenses),
      'reel-foncier': calculateGrossYield(investment, year, 'reel-foncier', defaultExpenses),
      'micro-bic': calculateGrossYield(investment, year, 'micro-bic', defaultExpenses),
      'reel-bic': calculateGrossYield(investment, year, 'reel-bic', defaultExpenses)
    };
  }

  return {
    'micro-foncier': calculateGrossYield(investment, year, 'micro-foncier', yearExpenses),
    'reel-foncier': calculateGrossYield(investment, year, 'reel-foncier', yearExpenses),
    'micro-bic': calculateGrossYield(investment, year, 'micro-bic', yearExpenses),
    'reel-bic': calculateGrossYield(investment, year, 'reel-bic', yearExpenses)
  };
}
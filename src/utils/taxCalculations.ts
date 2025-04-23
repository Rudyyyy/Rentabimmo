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

  // Calcul du revenu imposable avant prise en compte des déficits
  const taxableIncomeBeforeDeficit = Math.max(0, annualRevenue - deductibleExpenses);
  
  // Le déficit utilisé est limité par le revenu imposable avant déficit
  const usableDeficit = Math.min(previousDeficit, taxableIncomeBeforeDeficit);
  
  // Le déficit reporté est uniquement le déficit de l'année précédente non utilisé
  const carriedForwardDeficit = previousDeficit - usableDeficit;

  // Calcul du revenu imposable final
  const taxableIncome = taxableIncomeBeforeDeficit - usableDeficit;

  // Calcul de l'impôt et des charges sociales
  const tax = Math.max(0, taxableIncome * (investment.taxParameters.taxRate / 100));
  const socialCharges = Math.max(0, taxableIncome * (investment.taxParameters.socialChargesRate / 100));
  const totalTax = tax + socialCharges;

  // Calcul du revenu net
  // Formule : Loyer nu + charges locataires + aide fiscale - impôts totaux
  const netIncome = annualRevenue + 
                   Number(yearExpenses.tenantCharges || 0) + 
                   Number(yearExpenses.taxBenefit || 0) - 
                   totalTax;
                   
    // Vérification des valeurs d'imposition
  if (tax === 0 && socialCharges === 0 && totalTax === 0 && taxableIncome > 0) {
    console.error(`ANOMALIE: Imposition à zéro avec revenu imposable positif - Année ${year}`, {
      taxableIncome,
      taxRate: investment.taxParameters.taxRate,
      socialChargesRate: investment.taxParameters.socialChargesRate
    });
  }

  return {
    regime: 'reel-foncier',
    taxableIncome,
    taxableIncomeBeforeDeficit,
    deductibleExpenses,
    tax,
    socialCharges,
    totalTax,
    netIncome,
    deficit: carriedForwardDeficit,
    usedDeficit: usableDeficit,
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

function calculateReelBIC(investment: Investment, year: number): TaxResults {
  const yearExpenses = investment.expenses.find(e => e.year === year);
  if (!yearExpenses) {
    throw new Error(`No expenses found for year ${year}`);
  }

  // Calcul des revenus bruts
  const grossIncome = yearExpenses.furnishedRent || 0;
  const tenantCharges = yearExpenses.tenantCharges || 0;

  // Calcul des charges déductibles
  const deductibleExpenses = (
    (yearExpenses.propertyTax || 0) +
    (yearExpenses.condoFees || 0) +
    (yearExpenses.propertyInsurance || 0) +
    (yearExpenses.managementFees || 0) +
    (yearExpenses.unpaidRentInsurance || 0) +
    (yearExpenses.repairs || 0) +
    (yearExpenses.otherDeductible || 0) +
    (yearExpenses.loanInsurance || 0) +
    (yearExpenses.interest || 0) -
    tenantCharges
  );

  // Calcul des années d'amortissement
  const startDate = new Date(investment.startDate);
  const currentYear = year;
  
  // Récupération des valeurs d'amortissement avec valeurs par défaut
  const {
    buildingValue = 0,
    buildingAmortizationYears = 25,
    furnitureValue = 0,
    furnitureAmortizationYears = 5,
    worksValue = 0,
    worksAmortizationYears = 10,
    otherValue = 0,
    otherAmortizationYears = 5
  } = investment.taxParameters;
  
  // Calcul des amortissements en fonction des durées
  const buildingAmortization = currentYear >= startDate.getFullYear() && 
    currentYear < startDate.getFullYear() + buildingAmortizationYears
    ? buildingValue / buildingAmortizationYears
    : 0;

  const furnitureAmortization = currentYear >= startDate.getFullYear() && 
    currentYear < startDate.getFullYear() + furnitureAmortizationYears
    ? furnitureValue / furnitureAmortizationYears
    : 0;

  const worksAmortization = currentYear >= startDate.getFullYear() && 
    currentYear < startDate.getFullYear() + worksAmortizationYears
    ? worksValue / worksAmortizationYears
    : 0;

  const otherAmortization = currentYear >= startDate.getFullYear() && 
    currentYear < startDate.getFullYear() + otherAmortizationYears
    ? otherValue / otherAmortizationYears
    : 0;

  

  const totalAmortization = buildingAmortization + furnitureAmortization + worksAmortization + otherAmortization;

  // Résultat avant amortissement
  const resultBeforeAmortization = grossIncome - deductibleExpenses;

  // L'amortissement utilisé ne peut pas créer de déficit
  const usedAmortization = Math.min(totalAmortization, Math.max(0, resultBeforeAmortization));

  // L'amortissement reporté est la différence entre l'amortissement total et l'amortissement utilisé
  const carriedForwardAmortization = totalAmortization - usedAmortization;

  // Calcul du revenu imposable
  const taxableIncome = resultBeforeAmortization - usedAmortization;

  // Calcul des impôts et charges sociales
  const tax = Math.max(0, taxableIncome * (investment.taxParameters.taxRate / 100));
  const socialCharges = Math.max(0, taxableIncome * (investment.taxParameters.socialChargesRate / 100));
  const totalTax = tax + socialCharges;

  // Calcul du revenu net selon la formule : loyer meublé + charges locataires - total impôt
  const netIncome = grossIncome + tenantCharges - totalTax;

  return {
    regime: 'reel-bic',
    taxableIncome,
    deductibleExpenses,
    tax,
    socialCharges,
    totalTax,
    netIncome,
    amortization: {
      building: buildingAmortization,
      furniture: furnitureAmortization,
      works: worksAmortization,
      other: otherAmortization,
      total: totalAmortization,
      used: usedAmortization,
      carriedForward: carriedForwardAmortization
    }
  };
}

export function calculateAllTaxRegimes(
  investment: Investment,
  year: number,
  previousYearResults?: Record<TaxRegime, TaxResults>
): Record<TaxRegime, TaxResults> {
  const yearExpenses = investment.expenses.find(e => e.year === year);
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

  // Pour la première année, on utilise le déficit initial de l'investissement
  // Pour les années suivantes, on utilise le déficit reporté calculé l'année précédente
  const previousDeficit = previousYearResults 
    ? previousYearResults['reel-foncier'].deficit || 0
    : investment.taxParameters.previousDeficit;

  // On crée une copie de l'investissement avec le déficit mis à jour
  const investmentWithUpdatedDeficit = {
    ...investment,
    taxParameters: {
      ...investment.taxParameters,
      previousDeficit: previousDeficit
    }
  };

  let results: Record<TaxRegime, TaxResults>;

  if (!yearExpenses) {
    results = {
      'micro-foncier': calculateMicroFoncier(investmentWithUpdatedDeficit, year, defaultExpenses),
      'reel-foncier': calculateReelFoncier(investmentWithUpdatedDeficit, year, defaultExpenses),
      'micro-bic': calculateMicroBIC(investmentWithUpdatedDeficit, year, defaultExpenses),
      'reel-bic': calculateReelBIC(investmentWithUpdatedDeficit, year)
    };
  } else {
    results = {
      'micro-foncier': calculateMicroFoncier(investmentWithUpdatedDeficit, year, yearExpenses),
      'reel-foncier': calculateReelFoncier(investmentWithUpdatedDeficit, year, yearExpenses),
      'micro-bic': calculateMicroBIC(investmentWithUpdatedDeficit, year, yearExpenses),
      'reel-bic': calculateReelBIC(investmentWithUpdatedDeficit, year)
    };
  }

  // Vérifier les valeurs extrêmes, particulièrement pour reel-foncier
  detectExtremeValues(results, year, investment.name);

  return results;
}

// Fonction pour détecter et signaler des valeurs anormales
function detectExtremeValues(results: Record<TaxRegime, TaxResults>, year: number, investmentName: string = 'inconnu') {
  // Vérifier spécifiquement le régime reel-foncier
  const reelFoncier = results['reel-foncier'];
  
  if (reelFoncier) {
    // Vérifier si les valeurs d'imposition sont incorrectes
    if (isNaN(reelFoncier.tax) || isNaN(reelFoncier.socialCharges) || isNaN(reelFoncier.totalTax)) {
      console.error(`ANOMALIE: Valeurs NaN pour ${investmentName} en ${year}, régime reel-foncier`, {
        tax: reelFoncier.tax,
        socialCharges: reelFoncier.socialCharges,
        totalTax: reelFoncier.totalTax
      });
    }
    
    // Vérifier si la somme tax + socialCharges = totalTax
    const calculatedTotal = (reelFoncier.tax || 0) + (reelFoncier.socialCharges || 0);
    if (Math.abs(calculatedTotal - (reelFoncier.totalTax || 0)) > 0.01) {
      console.error(`ANOMALIE: Incohérence totalTax pour ${investmentName} en ${year}, régime reel-foncier`, {
        tax: reelFoncier.tax,
        socialCharges: reelFoncier.socialCharges,
        calculatedTotal,
        totalTax: reelFoncier.totalTax,
        difference: calculatedTotal - (reelFoncier.totalTax || 0)
      });
      
      // Correction automatique de l'incohérence
      reelFoncier.totalTax = calculatedTotal;
    }
    
    // Vérifier si revenu imposable > 0 mais impôt = 0
    if (reelFoncier.taxableIncome > 0 && reelFoncier.totalTax === 0) {
      console.warn(`AVERTISSEMENT: Taxe nulle avec revenu imposable positif pour ${investmentName} en ${year}`, {
        taxableIncome: reelFoncier.taxableIncome,
        tax: reelFoncier.tax,
        socialCharges: reelFoncier.socialCharges,
        totalTax: reelFoncier.totalTax
      });
    }
  }
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
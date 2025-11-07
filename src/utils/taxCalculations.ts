import { Investment, TaxRegime, TaxResults, YearlyExpenses } from '../types/investment';
import { calculateTotalNu, calculateTotalMeuble } from './calculations';

const TAX_CONSTANTS = {
  MICRO_FONCIER_ALLOWANCE: 0.3, // 30% d'abattement
  MICRO_BIC_ALLOWANCE: 0.5, // 50% d'abattement pour LMNP
  MICRO_FONCIER_THRESHOLD: 15000, // Seuil du régime micro-foncier
  MICRO_BIC_THRESHOLD: 72600, // Seuil du régime micro-BIC
};

/**
 * Calcule la fraction de l'année couverte par le projet pour une année donnée
 * Retourne 1 pour les années complètes, une fraction pour les années partielles
 * @param investment - L'investissement
 * @param year - L'année à calculer
 * @returns Un nombre entre 0 et 1 représentant la couverture de l'année
 */
function getYearCoverage(investment: Investment, year: number): number {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
  const projectStart = new Date(investment.projectStartDate);
  const projectEnd = new Date(investment.projectEndDate);
  const start = projectStart > startOfYear ? projectStart : startOfYear;
  const end = projectEnd < endOfYear ? projectEnd : endOfYear;
  if (end < start) return 0;
  const msInDay = 1000 * 60 * 60 * 24;
  const daysInYear = Math.round((new Date(year + 1, 0, 1).getTime() - new Date(year, 0, 1).getTime()) / msInDay);
  const coveredDays = Math.floor((end.getTime() - start.getTime()) / msInDay) + 1;
  return Math.min(1, Math.max(0, coveredDays / daysInYear));
}

/**
 * Ajuste une valeur annualisée en fonction de la couverture réelle de l'année
 * @param value - La valeur annualisée
 * @param coverage - La couverture de l'année (0 à 1)
 * @returns La valeur ajustée
 */
function adjustForCoverage(value: number, coverage: number): number {
  return Number((Number(value || 0) * coverage).toFixed(2));
}

function calculateDeductibleExpenses(investment: Investment, year: number): number {
  const yearExpenses = investment.expenses.find(e => e.year === year);
  if (!yearExpenses) return 0;

  // Obtenir la couverture de l'année pour les années partielles
  const coverage = getYearCoverage(investment, year);

  // Calcul du total des charges déductibles (valeurs annualisées ajustées pour la couverture)
  const totalDeductibleExpenses = (
    adjustForCoverage(Number(yearExpenses.propertyTax || 0), coverage) +
    adjustForCoverage(Number(yearExpenses.condoFees || 0), coverage) +
    adjustForCoverage(Number(yearExpenses.propertyInsurance || 0), coverage) +
    adjustForCoverage(Number(yearExpenses.managementFees || 0), coverage) +
    adjustForCoverage(Number(yearExpenses.unpaidRentInsurance || 0), coverage) +
    adjustForCoverage(Number(yearExpenses.repairs || 0), coverage) +
    adjustForCoverage(Number(yearExpenses.otherDeductible || 0), coverage) +
    adjustForCoverage(Number(yearExpenses.loanInsurance || 0), coverage) +
    adjustForCoverage(Number(yearExpenses.interest || 0), coverage)
  );

  // Soustraction des charges locataires (également ajustées)
  const tenantCharges = adjustForCoverage(Number(yearExpenses.tenantCharges || 0), coverage);

  return totalDeductibleExpenses - tenantCharges;
}

function calculateAnnualRevenue(investment: Investment, year: number, regime?: TaxRegime): number {
  const yearExpenses = investment.expenses.find(e => e.year === year);
  if (!yearExpenses) return 0;

  // Obtenir la couverture de l'année pour les années partielles
  const coverage = getYearCoverage(investment, year);
  const vacancyRate = investment.expenseProjection?.vacancyRate || 0;

  // Pour les régimes de location nue (micro-foncier et réel-foncier), on utilise uniquement le loyer nu avec vacance
  if (regime === 'micro-foncier' || regime === 'reel-foncier') {
    const rent = adjustForCoverage(Number(yearExpenses.rent || 0), coverage);
    return rent * (1 - vacancyRate / 100);
  }
  
  // Pour les régimes de location meublée (micro-bic et réel-bic), on utilise uniquement le loyer meublé avec vacance
  if (regime === 'micro-bic' || regime === 'reel-bic') {
    const furnishedRent = adjustForCoverage(Number(yearExpenses.furnishedRent || 0), coverage);
    return furnishedRent * (1 - vacancyRate / 100);
  }

  // Si aucun régime n'est spécifié, on utilise la somme des deux avec vacance
  const rent = adjustForCoverage(Number(yearExpenses.rent || 0), coverage);
  const furnishedRent = adjustForCoverage(Number(yearExpenses.furnishedRent || 0), coverage);
  return (rent + furnishedRent) * (1 - vacancyRate / 100);
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

  // Calcul du revenu net avec vacance locative (utilise le total nu avec vacance)
  // Les valeurs sont ajustées pour la couverture de l'année (années partielles)
  const coverage = getYearCoverage(investment, year);
  const vacancyRate = investment.expenseProjection?.vacancyRate || 0;
  const totalNuWithVacancy = calculateTotalNu(
    adjustForCoverage(Number(yearExpenses.rent || 0), coverage),
    adjustForCoverage(Number(yearExpenses.taxBenefit || 0), coverage),
    adjustForCoverage(Number(yearExpenses.tenantCharges || 0), coverage),
    vacancyRate
  );
  const netIncome = totalNuWithVacancy - (tax + socialCharges);

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

  // Calcul du revenu net avec vacance locative (utilise le total nu avec vacance)
  // Les valeurs sont ajustées pour la couverture de l'année (années partielles)
  const coverage = getYearCoverage(investment, year);
  const vacancyRate = investment.expenseProjection?.vacancyRate || 0;
  const totalNuWithVacancy = calculateTotalNu(
    adjustForCoverage(Number(yearExpenses.rent || 0), coverage),
    adjustForCoverage(Number(yearExpenses.taxBenefit || 0), coverage),
    adjustForCoverage(Number(yearExpenses.tenantCharges || 0), coverage),
    vacancyRate
  );
  const netIncome = totalNuWithVacancy - totalTax;
                   
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

  // Calcul du revenu net avec vacance locative (utilise le total meublé avec vacance)
  // Les valeurs sont ajustées pour la couverture de l'année (années partielles)
  const coverage = getYearCoverage(investment, year);
  const vacancyRate = investment.expenseProjection?.vacancyRate || 0;
  const totalMeubleWithVacancy = calculateTotalMeuble(
    adjustForCoverage(Number(yearExpenses.furnishedRent || 0), coverage),
    adjustForCoverage(Number(yearExpenses.tenantCharges || 0), coverage),
    vacancyRate
  );
  const netIncome = totalMeubleWithVacancy - (tax + socialCharges);

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

  // Obtenir la couverture de l'année pour les années partielles
  const coverage = getYearCoverage(investment, year);

  // Calcul des revenus bruts avec vacance locative et couverture d'année
  const vacancyRate = investment.expenseProjection?.vacancyRate || 0;
  const furnishedRent = adjustForCoverage(Number(yearExpenses.furnishedRent || 0), coverage);
  const grossIncome = furnishedRent * (1 - vacancyRate / 100);
  const tenantCharges = adjustForCoverage(yearExpenses.tenantCharges || 0, coverage);

  // Calcul des charges déductibles (avec ajustement pour couverture)
  const deductibleExpenses = (
    adjustForCoverage((yearExpenses.propertyTax || 0), coverage) +
    adjustForCoverage((yearExpenses.condoFees || 0), coverage) +
    adjustForCoverage((yearExpenses.propertyInsurance || 0), coverage) +
    adjustForCoverage((yearExpenses.managementFees || 0), coverage) +
    adjustForCoverage((yearExpenses.unpaidRentInsurance || 0), coverage) +
    adjustForCoverage((yearExpenses.repairs || 0), coverage) +
    adjustForCoverage((yearExpenses.otherDeductible || 0), coverage) +
    adjustForCoverage((yearExpenses.loanInsurance || 0), coverage) +
    adjustForCoverage((yearExpenses.interest || 0), coverage) -
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

  // Calcul du revenu net avec vacance locative (utilise le total meublé avec vacance)
  // furnishedRent et tenantCharges sont déjà ajustés pour la couverture
  const totalMeubleWithVacancy = calculateTotalMeuble(
    furnishedRent,
    Number(tenantCharges || 0),
    vacancyRate
  );
  const netIncome = totalMeubleWithVacancy - totalTax;

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
  // Calculer le total des revenus avec vacance locative
  const vacancyRate = investment.expenseProjection?.vacancyRate || 0;
  let totalRevenue: number;
  
  // Pour les régimes de location nue, on utilise le total nu avec vacance
  if (regime === 'micro-foncier' || regime === 'reel-foncier') {
    totalRevenue = calculateTotalNu(
      Number(yearExpenses.rent || 0),
      Number(yearExpenses.taxBenefit || 0),
      Number(yearExpenses.tenantCharges || 0),
      vacancyRate
    );
  } else {
    // Pour les régimes LMNP, on utilise le total meublé avec vacance
    totalRevenue = calculateTotalMeuble(
      Number(yearExpenses.furnishedRent || 0),
      Number(yearExpenses.tenantCharges || 0),
      vacancyRate
    );
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
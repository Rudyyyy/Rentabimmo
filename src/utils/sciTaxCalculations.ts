/**
 * Calculs fiscaux pour les SCI à l'IS
 * 
 * Une SCI à l'IS a un régime fiscal particulier :
 * - Les résultats sont calculés de manière consolidée (tous les biens ensemble)
 * - L'IS est calculé sur le résultat consolidé
 * - L'IS est ensuite réparti par prorata sur chaque bien
 * - Les déficits sont reportables sans limite de temps
 * - Les amortissements sont déductibles
 */

import { SCI, SCITaxResults, PropertyContribution, SCITaxParameters } from '../types/sci';
import { Investment } from '../types/investment';
import { getYearCoverage, getInterestForYear, getLoanInfoForYear, adjustForCoverage } from './propertyCalculations';

/**
 * Calcule les résultats fiscaux consolidés d'une SCI pour une année donnée
 * @param sci - La SCI
 * @param properties - Liste des biens appartenant à la SCI
 * @param year - Année fiscale
 * @param previousYearResults - Résultats de l'année précédente (pour les déficits reportables)
 * @returns Les résultats fiscaux consolidés de la SCI
 */
export function calculateSCITaxResults(
  sci: SCI,
  properties: Investment[],
  year: number,
  previousYearResults?: SCITaxResults
): SCITaxResults {
  
  // 1. Consolider tous les revenus et charges de tous les biens
  let totalRevenues = 0;
  let totalDeductibleExpenses = 0;
  let totalAmortization = 0;
  
  const propertyContributions: Record<string, PropertyContribution> = {};
  
  // Calculer la valeur totale des biens de la SCI (pour le prorata)
  const totalPropertyValue = properties.reduce(
    (sum, prop) => sum + (prop.sciPropertyValue || prop.purchasePrice), 
    0
  );
  
  // Pour chaque bien de la SCI
  properties.forEach(property => {
    const yearExpense = property.expenses?.find(e => e.year === year);
    
    // Calculer le prorata de l'année (pour les années partielles)
    const coverage = getYearCoverage(property, year);
    
    // Calculer les intérêts et assurances du prêt (toujours calculés dynamiquement)
    const yearlyInterest = getInterestForYear(property, year);
    const loanInfo = getLoanInfoForYear(property, year);
    const adjustedLoanInterest = adjustForCoverage(yearlyInterest, coverage);
    const adjustedLoanInsurance = adjustForCoverage(loanInfo.insurance, coverage);
    
    if (!yearExpense) {
      // Si pas de dépenses pour cette année, on met des valeurs à 0
      const propertyValue = property.sciPropertyValue || property.purchasePrice;
      const prorataWeight = totalPropertyValue > 0 ? propertyValue / totalPropertyValue : 0;
      
      propertyContributions[property.id] = {
        propertyId: property.id,
        propertyName: property.name,
        revenues: 0,
        expenses: adjustedLoanInterest + adjustedLoanInsurance,
        amortization: 0,
        contributionToResult: -(adjustedLoanInterest + adjustedLoanInsurance),
        propertyValue,
        prorataWeight,
        allocatedIS: 0
      };
      
      totalDeductibleExpenses += adjustedLoanInterest + adjustedLoanInsurance;
      return;
    }
    
    // Appliquer le prorata aux revenus (selon le type de location de la SCI)
    const rentAmount = sci.taxParameters.rentalType === 'unfurnished' 
      ? Number(yearExpense.rent || 0) 
      : Number(yearExpense.furnishedRent || 0);
    const propertyRevenues = adjustForCoverage(rentAmount, coverage);
    
    // Appliquer le prorata aux charges déductibles du bien
    const propertyExpenses = 
      adjustForCoverage(Number(yearExpense.propertyTax || 0), coverage) +
      adjustForCoverage(Number(yearExpense.condoFees || 0), coverage) +
      adjustForCoverage(Number(yearExpense.propertyInsurance || 0), coverage) +
      adjustForCoverage(Number(yearExpense.managementFees || 0), coverage) +
      adjustForCoverage(Number(yearExpense.unpaidRentInsurance || 0), coverage) +
      adjustForCoverage(Number(yearExpense.repairs || 0), coverage) +
      adjustForCoverage(Number(yearExpense.otherDeductible || 0), coverage) +
      adjustedLoanInsurance + // Déjà ajusté
      adjustedLoanInterest - // Déjà ajusté
      adjustForCoverage(Number(yearExpense.tenantCharges || 0), coverage); // Les charges locataires sont soustraites
    
    // Amortissements du bien
    const propertyAmortization = calculatePropertyAmortization(property, year, sci.taxParameters);
    
    // Contribution au résultat (peut être négatif)
    const contributionToResult = propertyRevenues - propertyExpenses - propertyAmortization;
    
    // Prorata du bien dans la SCI (basé sur la valeur)
    const propertyValue = property.sciPropertyValue || property.purchasePrice;
    const prorataWeight = totalPropertyValue > 0 ? propertyValue / totalPropertyValue : 0;
    
    propertyContributions[property.id] = {
      propertyId: property.id,
      propertyName: property.name,
      revenues: propertyRevenues,
      expenses: propertyExpenses,
      amortization: propertyAmortization,
      contributionToResult,
      propertyValue,
      prorataWeight,
      allocatedIS: 0 // Sera calculé après
    };
    
    totalRevenues += propertyRevenues;
    totalDeductibleExpenses += propertyExpenses;
    totalAmortization += propertyAmortization;
  });
  
  // 2. Ajouter les charges de fonctionnement globales de la SCI
  const sciOperatingExpenses = 
    (sci.taxParameters.operatingExpenses || 0) +
    (sci.taxParameters.accountingFees || 0) +
    (sci.taxParameters.legalFees || 0) +
    (sci.taxParameters.bankFees || 0) +
    (sci.taxParameters.insuranceFees || 0) +
    (sci.taxParameters.otherExpenses || 0);
  
  totalDeductibleExpenses += sciOperatingExpenses;
  
  // 3. Calculer le résultat fiscal avant imputation des déficits
  const resultBeforeDeficit = totalRevenues - totalDeductibleExpenses - totalAmortization;
  
  // 4. Gestion des déficits reportables
  const previousDeficit = previousYearResults?.deficitCarriedForward || sci.taxParameters.previousDeficits;
  
  let deficitUsed = 0;
  let deficitGenerated = 0;
  let taxableIncome = 0;
  
  if (resultBeforeDeficit < 0) {
    // Année déficitaire : pas d'IS, déficit reportable sans limite de temps
    deficitGenerated = Math.abs(resultBeforeDeficit);
    taxableIncome = 0;
  } else {
    // Année bénéficiaire : utiliser les déficits antérieurs
    deficitUsed = Math.min(previousDeficit, resultBeforeDeficit);
    taxableIncome = resultBeforeDeficit - deficitUsed;
  }
  
  const deficitCarriedForward = previousDeficit - deficitUsed + deficitGenerated;
  
  // 5. Calcul de l'IS avec barème progressif
  let isAtReducedRate = 0;
  let isAtStandardRate = 0;
  let totalIS = 0;
  
  if (taxableIncome > 0) {
    // Taux réduit (15%) jusqu'au seuil (généralement 42 500€)
    const reducedRatePart = Math.min(taxableIncome, sci.taxParameters.reducedRateThreshold);
    isAtReducedRate = reducedRatePart * (sci.taxParameters.reducedRate / 100);
    
    // Taux normal (25%) au-delà du seuil
    const standardRatePart = Math.max(0, taxableIncome - sci.taxParameters.reducedRateThreshold);
    isAtStandardRate = standardRatePart * (sci.taxParameters.standardRate / 100);
    
    totalIS = isAtReducedRate + isAtStandardRate;
  }
  
  // 6. Répartir l'IS par prorata sur chaque bien
  Object.keys(propertyContributions).forEach(propertyId => {
    const contribution = propertyContributions[propertyId];
    contribution.allocatedIS = totalIS * contribution.prorataWeight;
  });
  
  return {
    year,
    totalRevenues,
    totalDeductibleExpenses,
    totalAmortization,
    resultBeforeDeficit,
    taxableIncome,
    deficitUsed,
    deficitGenerated,
    deficitCarriedForward,
    isAtReducedRate,
    isAtStandardRate,
    totalIS,
    propertyContributions
  };
}

/**
 * Calcule l'amortissement d'un bien pour une année donnée
 * @param property - Le bien immobilier
 * @param year - Année fiscale
 * @param taxParameters - Paramètres fiscaux de la SCI
 * @returns Le montant d'amortissement pour l'année
 */
function calculatePropertyAmortization(
  property: Investment,
  year: number,
  taxParameters: SCITaxParameters
): number {
  const startDate = new Date(property.startDate);
  const startYear = startDate.getFullYear();
  
  // Calcul des années écoulées depuis l'acquisition
  const yearsElapsed = year - startYear;
  
  // Si l'année est avant le début du bien, pas d'amortissement
  if (yearsElapsed < 0) return 0;
  
  let totalAmortization = 0;
  
  // 1. Amortissement du bien immobilier (terrain non amortissable)
  // Utiliser la valeur définie dans taxParameters, sinon 80% du prix d'achat par défaut
  const buildingValue = property.taxParameters?.buildingValue || (property.purchasePrice * 0.8);
  if (yearsElapsed < taxParameters.buildingAmortizationYears) {
    totalAmortization += buildingValue / taxParameters.buildingAmortizationYears;
  }
  
  // 2. Amortissement du mobilier (si LMNP ou meublé)
  // Utiliser la valeur définie dans taxParameters, sinon lmnpData
  const furnitureValue = property.taxParameters?.furnitureValue || property.lmnpData?.furnitureValue || 0;
  if (furnitureValue > 0 && yearsElapsed < taxParameters.furnitureAmortizationYears) {
    totalAmortization += furnitureValue / taxParameters.furnitureAmortizationYears;
  }
  
  // 3. Amortissement des travaux
  const worksValue = property.renovationCosts || 0;
  if (worksValue > 0 && yearsElapsed < taxParameters.worksAmortizationYears) {
    totalAmortization += worksValue / taxParameters.worksAmortizationYears;
  }
  
  return totalAmortization;
}

/**
 * Calcule tous les résultats fiscaux d'une SCI pour toutes les années du projet
 * @param sci - La SCI
 * @param properties - Liste des biens appartenant à la SCI
 * @returns Un objet avec les résultats par année
 */
export function calculateAllSCITaxResults(
  sci: SCI,
  properties: Investment[]
): Record<number, SCITaxResults> {
  
  // Déterminer la plage d'années à calculer
  const years = new Set<number>();
  properties.forEach(property => {
    const startYear = new Date(property.projectStartDate).getFullYear();
    const endYear = new Date(property.projectEndDate).getFullYear();
    for (let year = startYear; year <= endYear; year++) {
      years.add(year);
    }
  });
  
  const sortedYears = Array.from(years).sort((a, b) => a - b);
  const results: Record<number, SCITaxResults> = {};
  
  // Calculer les résultats pour chaque année, en tenant compte des déficits reportables
  sortedYears.forEach((year, index) => {
    const previousYearResults = index > 0 ? results[sortedYears[index - 1]] : undefined;
    results[year] = calculateSCITaxResults(sci, properties, year, previousYearResults);
  });
  
  return results;
}

/**
 * Obtient l'IS alloué à un bien spécifique pour une année donnée
 * @param sciTaxResults - Résultats fiscaux de la SCI pour l'année
 * @param propertyId - ID du bien
 * @returns Le montant d'IS alloué au bien
 */
export function getPropertyAllocatedIS(
  sciTaxResults: SCITaxResults,
  propertyId: string
): number {
  return sciTaxResults.propertyContributions[propertyId]?.allocatedIS || 0;
}

/**
 * Calcule le résultat net d'un bien dans une SCI (après IS)
 * @param property - Le bien
 * @param year - Année fiscale
 * @param sciTaxResults - Résultats fiscaux de la SCI pour l'année
 * @returns Le résultat net du bien après IS
 */
export function calculatePropertyNetResultInSCI(
  property: Investment,
  year: number,
  sciTaxResults: SCITaxResults
): number {
  const contribution = sciTaxResults.propertyContributions[property.id];
  if (!contribution) return 0;
  
  const grossResult = contribution.revenues - contribution.expenses;
  const allocatedIS = contribution.allocatedIS;
  
  return grossResult - allocatedIS;
}


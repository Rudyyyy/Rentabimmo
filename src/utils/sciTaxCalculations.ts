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
 * Calcule la couverture de l'année pour la SCI (basée sur tous les biens)
 * Prend le maximum de couverture parmi tous les biens de la SCI
 * @param properties - Liste des biens appartenant à la SCI
 * @param year - Année fiscale
 * @returns La fraction de l'année couverte par la SCI (0 à 1)
 */
function calculateSCIYearCoverage(properties: Investment[], year: number): number {
  if (properties.length === 0) return 0;
  
  // Pour la SCI, on prend la couverture maximale parmi tous les biens
  // Car les frais de fonctionnement de la SCI sont actifs dès qu'au moins un bien est actif
  const coverages = properties.map(property => getYearCoverage(property, year));
  return Math.max(...coverages, 0);
}

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
    
    // Amortissements du bien (avec prorata temporel)
    const propertyAmortization = calculatePropertyAmortization(property, year, sci.taxParameters, coverage);
    
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
  // Calculer la couverture de l'année pour la SCI (min/max de tous les biens)
  const sciYearCoverage = calculateSCIYearCoverage(properties, year);
  
  // Frais de fonctionnement annuels de la SCI (SOMME des frais détaillés, PAS operatingExpenses)
  // Note: operatingExpenses est stocké comme la somme mais on le recalcule pour éviter toute incohérence
  const annualSciOperatingExpenses = 
    (sci.taxParameters.accountingFees || 0) +
    (sci.taxParameters.legalFees || 0) +
    (sci.taxParameters.bankFees || 0) +
    (sci.taxParameters.insuranceFees || 0) +
    (sci.taxParameters.otherExpenses || 0);
  
  // Appliquer le prorata temporel aux frais de fonctionnement
  const sciOperatingExpenses = adjustForCoverage(annualSciOperatingExpenses, sciYearCoverage);
  
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
 * @param taxParameters - Paramètres fiscaux de la SCI (fallback si le bien n'a pas ses propres paramètres)
 * @param coverage - Fraction de l'année couverte (0 à 1) pour le prorata temporel
 * @returns Le montant d'amortissement pour l'année (ajusté au prorata)
 */
function calculatePropertyAmortization(
  property: Investment,
  year: number,
  taxParameters: SCITaxParameters,
  coverage: number = 1
): number {
  // Utiliser projectStartDate au lieu de startDate pour cohérence
  const startDate = new Date(property.projectStartDate);
  const startYear = startDate.getFullYear();
  
  // Calcul des années écoulées depuis l'acquisition
  const yearsElapsed = year - startYear;
  
  // Si l'année est avant le début du bien, pas d'amortissement
  if (yearsElapsed < 0) return 0;
  
  let totalAmortization = 0;
  
  // Utiliser les paramètres du bien en priorité, sinon ceux de la SCI
  const buildingAmortYears = property.taxParameters?.buildingAmortizationYears || taxParameters.buildingAmortizationYears;
  const furnitureAmortYears = property.taxParameters?.furnitureAmortizationYears || taxParameters.furnitureAmortizationYears;
  const worksAmortYears = property.taxParameters?.worksAmortizationYears || taxParameters.worksAmortizationYears;
  
  // 1. Amortissement du bien immobilier (terrain non amortissable)
  const buildingValue = property.taxParameters?.buildingValue || (property.purchasePrice * 0.8);
  if (yearsElapsed < buildingAmortYears) {
    const annualBuildingAmortization = buildingValue / buildingAmortYears;
    totalAmortization += adjustForCoverage(annualBuildingAmortization, coverage);
  }
  
  // 2. Amortissement du mobilier (si LMNP ou meublé)
  const furnitureValue = property.taxParameters?.furnitureValue || property.lmnpData?.furnitureValue || 0;
  if (furnitureValue > 0 && yearsElapsed < furnitureAmortYears) {
    const annualFurnitureAmortization = furnitureValue / furnitureAmortYears;
    totalAmortization += adjustForCoverage(annualFurnitureAmortization, coverage);
  }
  
  // 3. Amortissement des travaux
  const worksValue = property.renovationCosts || 0;
  if (worksValue > 0 && yearsElapsed < worksAmortYears) {
    const annualWorksAmortization = worksValue / worksAmortYears;
    totalAmortization += adjustForCoverage(annualWorksAmortization, coverage);
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


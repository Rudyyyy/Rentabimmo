import { Investment, FinancialMetrics, AmortizationRow, DeferralType, YearlyExpenses } from '../types/investment';
import { safeAmount, safeNumber, safeRate, safePercentage, toFixed } from './validation';

export function calculateMonthlyPayment(
  loanAmount: number,
  annualRate: number,
  years: number,
  deferralType: DeferralType = 'none',
  deferredPeriod: number = 0
): number {
  // Validation et conversion sécurisée des nombres
  const amount = safeAmount(loanAmount);
  const rate = safeRate(annualRate);
  const duration = safeNumber(years, 0, 1, 50); // Durée entre 1 et 50 ans
  const deferred = safeNumber(deferredPeriod, 0, 0);

  if (amount <= 0 || rate <= 0 || duration <= 0) return 0;
  
  const monthlyRate = rate / 12 / 100;
  
  if (deferralType === 'none' || deferred === 0) {
    // Calcul de la mensualité standard sans différé
    const numberOfPayments = duration * 12;
    return toFixed((amount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
           (Math.pow(1 + monthlyRate, numberOfPayments) - 1));
  } else if (deferralType === 'partial') {
    // Différé partiel : on paie les intérêts pendant le différé
    // La mensualité est calculée sur la durée totale moins le différé
    const numberOfPayments = (duration * 12) - deferred;
    if (numberOfPayments <= 0) return 0;
    
    return toFixed((amount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
           (Math.pow(1 + monthlyRate, numberOfPayments) - 1));
  } else if (deferralType === 'total') {
    // Différé total : on ne paie rien pendant le différé
    // Les intérêts s'accumulent et sont ajoutés au capital
    // On doit calculer le montant total dû après le différé (capital + intérêts différés)
    
    // Calcul des intérêts différés (intérêts composés sur la période de différé)
    let deferredInterest = 0;
    let currentAmount = amount;
    for (let month = 1; month <= deferred; month++) {
      const monthlyInterest = currentAmount * monthlyRate;
      deferredInterest += monthlyInterest;
      currentAmount += monthlyInterest; // Les intérêts s'ajoutent au capital
    }
    
    // Le capital restant dû après le différé = capital initial + intérêts différés
    const totalAmountAfterDeferral = amount + deferredInterest;
    
    // La mensualité est calculée sur le montant total dû après le différé
    // sur la durée totale moins le différé
    const numberOfPayments = (duration * 12) - deferred;
    if (numberOfPayments <= 0) return 0;
    
    return toFixed((totalAmountAfterDeferral * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
           (Math.pow(1 + monthlyRate, numberOfPayments) - 1));
  }
  
  return 0;
}

export function generateAmortizationSchedule(
  loanAmount: number,
  annualRate: number,
  years: number,
  deferralType: DeferralType = 'none',
  deferredPeriod: number = 0,
  startDate: string = new Date().toISOString().split('T')[0]
): { schedule: AmortizationRow[]; deferredInterest: number } {
  const schedule: AmortizationRow[] = [];
  
  // Validation et conversion sécurisée des nombres
  const amount = safeAmount(loanAmount);
  const rate = safeRate(annualRate);
  const duration = safeNumber(years, 0, 1, 50);
  const deferred = safeNumber(deferredPeriod, 0, 0);

  const monthlyRate = rate / 12 / 100;
  let totalDue = toFixed(amount);
  let remainingPrincipal = toFixed(amount);
  let totalPaid = 0;
  let deferredInterest = 0;
  
  // Validate and parse the start date
  let startDateTime: Date;
  try {
    startDateTime = new Date(startDate);
    if (isNaN(startDateTime.getTime())) {
      startDateTime = new Date();
    }
  } catch {
    startDateTime = new Date();
  }

  // Calculate monthly payment for the total duration (loan duration + deferral period)
  const monthlyPayment = toFixed(calculateMonthlyPayment(amount, rate, duration, deferralType, deferred));

  // Période de différé
  for (let month = 1; month <= deferred; month++) {
    const interest = toFixed(remainingPrincipal * monthlyRate);
    const currentDate = new Date(startDateTime);
    currentDate.setMonth(startDateTime.getMonth() + month - 1);

    if (deferralType === 'total') {
      deferredInterest = toFixed(deferredInterest + interest);
      totalDue = toFixed(totalDue + interest);

      schedule.push({
        month,
        date: currentDate.toISOString().split('T')[0],
        remainingBalance: toFixed(totalDue),
        remainingPrincipal: toFixed(remainingPrincipal),
        monthlyPayment: 0,
        principal: 0,
        interest: toFixed(interest),
        totalPaid: toFixed(totalPaid),
        isDeferred: true
      });
    } else if (deferralType === 'partial') {
      totalPaid = toFixed(totalPaid + interest);

      schedule.push({
        month,
        date: currentDate.toISOString().split('T')[0],
        remainingBalance: toFixed(totalDue),
        remainingPrincipal: toFixed(remainingPrincipal),
        monthlyPayment: toFixed(interest),
        principal: 0,
        interest: toFixed(interest),
        totalPaid: toFixed(totalPaid),
        isDeferred: true
      });
    }
  }

  // Période d'amortissement
  if (deferralType === 'total' && deferredInterest > 0) {
    // Add deferred interest to remaining balance
    totalDue = toFixed(remainingPrincipal + deferredInterest);
    
    // Calculate new monthly payment with updated balance
    const updatedMonthlyPayment = toFixed(calculateMonthlyPayment(totalDue, rate, duration, 'none', 0));

    // Regular amortization period
    for (let month = deferred + 1; month <= (duration * 12) + deferred; month++) {
      const currentDate = new Date(startDateTime);
      currentDate.setMonth(startDateTime.getMonth() + month - 1);

      const interest = toFixed(remainingPrincipal * monthlyRate);
      const principal = toFixed(updatedMonthlyPayment - interest);
      remainingPrincipal = toFixed(Math.max(0, remainingPrincipal - principal));
      totalPaid = toFixed(totalPaid + updatedMonthlyPayment);
      totalDue = toFixed(remainingPrincipal + deferredInterest);

      schedule.push({
        month,
        date: currentDate.toISOString().split('T')[0],
        remainingBalance: toFixed(totalDue),
        remainingPrincipal: toFixed(remainingPrincipal),
        monthlyPayment: toFixed(updatedMonthlyPayment),
        principal: toFixed(principal),
        interest: toFixed(interest),
        totalPaid: toFixed(totalPaid),
        isDeferred: false
      });
    }
  } else {
    // Regular amortization period (for cases without deferral or partial deferral)
    for (let month = deferred + 1; month <= (duration * 12) + deferred; month++) {
      const currentDate = new Date(startDateTime);
      currentDate.setMonth(startDateTime.getMonth() + month - 1);

      const interest = toFixed(remainingPrincipal * monthlyRate);
      const principal = toFixed(monthlyPayment - interest);
      remainingPrincipal = toFixed(Math.max(0, remainingPrincipal - principal));
      totalPaid = toFixed(totalPaid + monthlyPayment);
      totalDue = toFixed(Math.max(0, totalDue - principal));

      schedule.push({
        month,
        date: currentDate.toISOString().split('T')[0],
        remainingBalance: toFixed(totalDue),
        remainingPrincipal: toFixed(remainingPrincipal),
        monthlyPayment: toFixed(monthlyPayment),
        principal: toFixed(principal),
        interest: toFixed(interest),
        totalPaid: toFixed(totalPaid),
        isDeferred: false
      });
    }
  }

  return { schedule, deferredInterest };
}

function calculateSaleMetrics(
  investment: Investment,
  remainingBalance: number
): { saleProfit: number; capitalGain: number; estimatedSalePrice: number } {
  let salePrice = 0;
  const purchasePrice = safeAmount(investment.purchasePrice);

  // Validate sale date
  let saleDate: Date;
  try {
    saleDate = new Date(investment.saleDate);
    if (isNaN(saleDate.getTime())) {
      return { saleProfit: 0, capitalGain: 0, estimatedSalePrice: 0 };
    }
  } catch {
    return { saleProfit: 0, capitalGain: 0, estimatedSalePrice: 0 };
  }

  switch (investment.appreciationType) {
    case 'global':
      salePrice = purchasePrice * (1 + safeRate(investment.appreciationValue) / 100);
      break;
    case 'annual': {
      const startDate = new Date(investment.startDate);
      if (!isNaN(startDate.getTime())) {
        const years = (saleDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        salePrice = purchasePrice * Math.pow(1 + safeRate(investment.appreciationValue) / 100, years);
      } else {
        salePrice = purchasePrice;
      }
      break;
    }
    case 'amount':
      salePrice = safeAmount(investment.appreciationValue);
      break;
    default:
      salePrice = purchasePrice;
  }

  const saleAgencyFees = safeAmount(investment.saleAgencyFees);
  const netSalePrice = salePrice - saleAgencyFees;

  return {
    saleProfit: netSalePrice - remainingBalance,
    capitalGain: netSalePrice - purchasePrice,
    estimatedSalePrice: salePrice
  };
}

function calculateAdjustedRent(
  baseRent: number,
  annualIncrease: number,
  years: number
): number {
  return toFixed(safeAmount(baseRent) * Math.pow(1 + safeRate(annualIncrease) / 100, safeNumber(years)));
}

function calculateRentalProjection(
  investment: Investment,
  startDate: Date,
  years: number = 5
): { annualRentalIncome: number[]; rentalYears: string[] } {
  const annualRentalIncome: number[] = [];
  const rentalYears: string[] = [];
  
  for (let year = 0; year < years; year++) {
    const adjustedRent = calculateAdjustedRent(
      safeAmount(investment.monthlyRent),
      safeRate(investment.annualRentIncrease),
      year
    );
    
    const yearlyIncome = adjustedRent * 12 * (safePercentage(investment.occupancyRate) / 100);
    annualRentalIncome.push(yearlyIncome);
    
    const yearDate = new Date(startDate);
    yearDate.setFullYear(startDate.getFullYear() + year);
    rentalYears.push(yearDate.getFullYear().toString());
  }
  
  return { annualRentalIncome, rentalYears };
}

export function calculateFinancialMetrics(investment: Investment): FinancialMetrics {
  // Calcul du coût total de l'opération
  const totalInvestmentCost = 
    safeAmount(investment.purchasePrice) +
    safeAmount(investment.agencyFees) +
    safeAmount(investment.notaryFees) +
    safeAmount(investment.bankFees) +
    safeAmount(investment.renovationCosts);

  // Calcul des charges annuelles totales
  const annualCosts = 
    safeAmount(investment.propertyTax) +
    safeAmount(investment.condoFees) +
    safeAmount(investment.propertyInsurance) +
    safeAmount(investment.managementFees) +
    safeAmount(investment.unpaidRentInsurance);

  // Calcul des charges mensuelles
  const monthlyCosts = annualCosts / 12;

  // Calcul de la mensualité du crédit
  const monthlyPayment = calculateMonthlyPayment(
    safeAmount(investment.loanAmount),
    safeRate(investment.interestRate),
    safeNumber(investment.loanDuration, 20, 1, 50),
    investment.deferralType || 'none',
    safeNumber(investment.deferredPeriod, 0, 0)
  );

  // Assurance mensuelle : taux annuel appliqué mensuellement
  const monthlyInsurance = (safeAmount(investment.loanAmount) * safeRate(investment.insuranceRate) / 100) / 12;
  const totalMonthlyPayment = monthlyPayment + monthlyInsurance;

  // Calculate adjusted rent based on annual increase
  const currentDate = new Date();
  const startDate = new Date(investment.startDate);
  const yearsSinceStart = Math.max(0, (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
  const adjustedMonthlyRent = calculateAdjustedRent(
    safeAmount(investment.monthlyRent),
    safeRate(investment.annualRentIncrease),
    yearsSinceStart
  );

  // Calcul des rendements selon les formules spécifiées
  const grossYield = (adjustedMonthlyRent * 12 / totalInvestmentCost) * 100;
  const netYield = ((adjustedMonthlyRent * 12 - annualCosts) / totalInvestmentCost) * 100;
  const monthlyCashFlow = adjustedMonthlyRent - monthlyCosts - totalMonthlyPayment;
  const annualCashFlow = monthlyCashFlow * 12;

  // ROI basé sur le cash flow annuel et l'apport personnel
  const downPayment = safeAmount(investment.downPayment);
  const roi = downPayment > 0 ? (annualCashFlow / downPayment) * 100 : 0;

  // Calcul des métriques de vente si une date de vente est spécifiée
  let saleMetrics = {};
  let remainingBalance = 0;
  let deferredInterest = 0;
  if (investment.saleDate) {
    const result = generateAmortizationSchedule(
      safeAmount(investment.loanAmount),
      safeRate(investment.interestRate),
      safeNumber(investment.loanDuration, 20, 1, 50),
      investment.deferralType,
      safeNumber(investment.deferredPeriod, 0, 0),
      investment.startDate
    );

    const saleDate = new Date(investment.saleDate);
    if (!isNaN(saleDate.getTime())) {
      const lastRow = result.schedule.find(row => {
        const rowDate = new Date(row.date);
        return rowDate.getMonth() === saleDate.getMonth() && 
               rowDate.getFullYear() === saleDate.getFullYear();
      });
      remainingBalance = lastRow?.remainingBalance || 0;
      deferredInterest = result.deferredInterest;
      saleMetrics = calculateSaleMetrics(investment, remainingBalance);
    }
  }

  // Calcul de la projection des revenus locatifs
  const rentalStartDate = new Date(investment.rentalStartDate || startDate);
  const { annualRentalIncome, rentalYears } = calculateRentalProjection(investment, rentalStartDate);

  return {
    grossYield,
    netYield,
    monthlyPayment: totalMonthlyPayment,
    monthlyCashFlow,
    annualCashFlow,
    roi,
    annualRentalIncome,
    rentalYears,
    monthlyCosts,
    currentMonthlyRent: adjustedMonthlyRent,
    remainingBalance,
    deferredInterest,
    ...saleMetrics
  };
}

/**
 * Calcule le total nu (location nue) en tenant compte de la vacance locative
 * @param rent Loyer nu
 * @param taxBenefit Aide fiscale
 * @param tenantCharges Charges locataires
 * @param vacancyRate Pourcentage de vacance locative
 * @returns Total nu avec vacance appliquée
 */
export function calculateTotalNu(
  rent: number,
  taxBenefit: number,
  tenantCharges: number,
  vacancyRate: number = 0
): number {
  const total = safeAmount(rent) + safeAmount(taxBenefit) + safeAmount(tenantCharges);
  return toFixed(total * (1 - (safePercentage(vacancyRate) / 100)));
}

/**
 * Calcule le total meublé (location meublée) en tenant compte de la vacance locative
 * @param furnishedRent Loyer meublé
 * @param tenantCharges Charges locataires
 * @param vacancyRate Pourcentage de vacance locative
 * @returns Total meublé avec vacance appliquée
 */
export function calculateTotalMeuble(
  furnishedRent: number,
  tenantCharges: number,
  vacancyRate: number = 0
): number {
  const total = safeAmount(furnishedRent) + safeAmount(tenantCharges);
  return toFixed(total * (1 - (safePercentage(vacancyRate) / 100)));
}

/**
 * Calcule les revenus selon le régime fiscal en tenant compte de la vacance locative
 * @param yearExpense Dépenses annuelles
 * @param regime Régime fiscal
 * @param vacancyRate Pourcentage de vacance locative
 * @returns Revenus calculés avec vacance
 */
export function calculateRevenuesWithVacancy(
  yearExpense: YearlyExpenses,
  regime: 'micro-foncier' | 'reel-foncier' | 'micro-bic' | 'reel-bic',
  vacancyRate: number = 0
): number {
  if (regime === 'micro-bic' || regime === 'reel-bic') {
    return calculateTotalMeuble(
      yearExpense.furnishedRent || 0,
      yearExpense.tenantCharges || 0,
      vacancyRate
    );
  } else {
    return calculateTotalNu(
      yearExpense.rent || 0,
      yearExpense.taxBenefit || 0,
      yearExpense.tenantCharges || 0,
      vacancyRate
    );
  }
}
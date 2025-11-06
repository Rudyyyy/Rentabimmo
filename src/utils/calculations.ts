import { Investment, FinancialMetrics, AmortizationRow, DeferralType, YearlyExpenses } from '../types/investment';

export function calculateMonthlyPayment(
  loanAmount: number,
  annualRate: number,
  years: number,
  deferralType: DeferralType = 'none',
  deferredPeriod: number = 0
): number {
  // Conversion explicite en nombres
  const amount = Number(loanAmount);
  const rate = Number(annualRate);
  const duration = Number(years);
  const deferred = Number(deferredPeriod);

  if (amount <= 0 || rate <= 0 || duration <= 0) return 0;
  
  const monthlyRate = rate / 12 / 100;
  
  if (deferralType === 'none' || deferred === 0) {
    // Calcul de la mensualité standard sans différé
    const numberOfPayments = duration * 12;
    return Number(((amount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
           (Math.pow(1 + monthlyRate, numberOfPayments) - 1)).toFixed(2));
  } else if (deferralType === 'partial') {
    // Différé partiel : on paie les intérêts pendant le différé
    // La mensualité est calculée sur la durée totale moins le différé
    const numberOfPayments = (duration * 12) - deferred;
    if (numberOfPayments <= 0) return 0;
    
    return Number(((amount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
           (Math.pow(1 + monthlyRate, numberOfPayments) - 1)).toFixed(2));
  } else if (deferralType === 'total') {
    // Différé total : on ne paie rien pendant le différé
    // La mensualité est calculée sur la durée totale moins le différé
    const numberOfPayments = (duration * 12) - deferred;
    if (numberOfPayments <= 0) return 0;
    
    return Number(((amount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
           (Math.pow(1 + monthlyRate, numberOfPayments) - 1)).toFixed(2));
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
  
  // Conversion explicite en nombres
  const amount = Number(loanAmount);
  const rate = Number(annualRate);
  const duration = Number(years);
  const deferred = Number(deferredPeriod);

  const monthlyRate = rate / 12 / 100;
  let totalDue = Number(amount.toFixed(2));
  let remainingPrincipal = Number(amount.toFixed(2));
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
  const monthlyPayment = Number(calculateMonthlyPayment(amount, rate, duration, deferralType, deferred).toFixed(2));

  // Période de différé
  for (let month = 1; month <= deferred; month++) {
    const interest = Number((remainingPrincipal * monthlyRate).toFixed(2));
    const currentDate = new Date(startDateTime);
    currentDate.setMonth(startDateTime.getMonth() + month - 1);

    if (deferralType === 'total') {
      deferredInterest = Number((deferredInterest + interest).toFixed(2));
      totalDue = Number((totalDue + interest).toFixed(2));

      schedule.push({
        month,
        date: currentDate.toISOString().split('T')[0],
        remainingBalance: Number(totalDue.toFixed(2)),
        remainingPrincipal: Number(remainingPrincipal.toFixed(2)),
        monthlyPayment: 0,
        principal: 0,
        interest: Number(interest.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        isDeferred: true
      });
    } else if (deferralType === 'partial') {
      totalPaid = Number((totalPaid + interest).toFixed(2));

      schedule.push({
        month,
        date: currentDate.toISOString().split('T')[0],
        remainingBalance: Number(totalDue.toFixed(2)),
        remainingPrincipal: Number(remainingPrincipal.toFixed(2)),
        monthlyPayment: Number(interest.toFixed(2)),
        principal: 0,
        interest: Number(interest.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        isDeferred: true
      });
    }
  }

  // Période d'amortissement
  if (deferralType === 'total' && deferredInterest > 0) {
    // Add deferred interest to remaining balance
    totalDue = Number((remainingPrincipal + deferredInterest).toFixed(2));
    
    // Calculate new monthly payment with updated balance
    const updatedMonthlyPayment = Number(calculateMonthlyPayment(totalDue, rate, duration, 'none', 0).toFixed(2));

    // Regular amortization period
    for (let month = deferred + 1; month <= (duration * 12) + deferred; month++) {
      const currentDate = new Date(startDateTime);
      currentDate.setMonth(startDateTime.getMonth() + month - 1);

      const interest = Number((remainingPrincipal * monthlyRate).toFixed(2));
      const principal = Number((updatedMonthlyPayment - interest).toFixed(2));
      remainingPrincipal = Number(Math.max(0, remainingPrincipal - principal).toFixed(2));
      totalPaid = Number((totalPaid + updatedMonthlyPayment).toFixed(2));
      totalDue = Number((remainingPrincipal + deferredInterest).toFixed(2));

      schedule.push({
        month,
        date: currentDate.toISOString().split('T')[0],
        remainingBalance: Number(totalDue.toFixed(2)),
        remainingPrincipal: Number(remainingPrincipal.toFixed(2)),
        monthlyPayment: Number(updatedMonthlyPayment.toFixed(2)),
        principal: Number(principal.toFixed(2)),
        interest: Number(interest.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        isDeferred: false
      });
    }
  } else {
    // Regular amortization period (for cases without deferral or partial deferral)
    for (let month = deferred + 1; month <= (duration * 12) + deferred; month++) {
      const currentDate = new Date(startDateTime);
      currentDate.setMonth(startDateTime.getMonth() + month - 1);

      const interest = Number((remainingPrincipal * monthlyRate).toFixed(2));
      const principal = Number((monthlyPayment - interest).toFixed(2));
      remainingPrincipal = Number(Math.max(0, remainingPrincipal - principal).toFixed(2));
      totalPaid = Number((totalPaid + monthlyPayment).toFixed(2));
      totalDue = Number(Math.max(0, totalDue - principal).toFixed(2));

      schedule.push({
        month,
        date: currentDate.toISOString().split('T')[0],
        remainingBalance: Number(totalDue.toFixed(2)),
        remainingPrincipal: Number(remainingPrincipal.toFixed(2)),
        monthlyPayment: Number(monthlyPayment.toFixed(2)),
        principal: Number(principal.toFixed(2)),
        interest: Number(interest.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
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
  const purchasePrice = Number(investment.purchasePrice);

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
      salePrice = purchasePrice * (1 + Number(investment.appreciationValue) / 100);
      break;
    case 'annual': {
      const startDate = new Date(investment.startDate);
      if (!isNaN(startDate.getTime())) {
        const years = (saleDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        salePrice = purchasePrice * Math.pow(1 + Number(investment.appreciationValue) / 100, years);
      } else {
        salePrice = purchasePrice;
      }
      break;
    }
    case 'amount':
      salePrice = Number(investment.appreciationValue);
      break;
    default:
      salePrice = purchasePrice;
  }

  const saleAgencyFees = Number(investment.saleAgencyFees) || 0;
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
  return Number(baseRent) * Math.pow(1 + Number(annualIncrease) / 100, Number(years));
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
      Number(investment.monthlyRent),
      Number(investment.annualRentIncrease || 0),
      year
    );
    
    const yearlyIncome = adjustedRent * 12 * (Number(investment.occupancyRate) / 100);
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
    Number(investment.purchasePrice) +
    Number(investment.agencyFees) +
    Number(investment.notaryFees) +
    Number(investment.bankFees) +
    Number(investment.renovationCosts);

  // Calcul des charges annuelles totales
  const annualCosts = 
    Number(investment.propertyTax) +
    Number(investment.condoFees) +
    Number(investment.propertyInsurance) +
    Number(investment.managementFees) +
    Number(investment.unpaidRentInsurance);

  // Calcul des charges mensuelles
  const monthlyCosts = annualCosts / 12;

  // Calcul de la mensualité du crédit
  const monthlyPayment = calculateMonthlyPayment(
    Number(investment.loanAmount),
    Number(investment.interestRate),
    Number(investment.loanDuration),
    investment.deferralType || 'none',
    Number(investment.deferredPeriod || 0)
  );

  const monthlyInsurance = (Number(investment.loanAmount) * Number(investment.insuranceRate) / 100) / (Number(investment.loanDuration) * 12);
  const totalMonthlyPayment = monthlyPayment + monthlyInsurance;

  // Calculate adjusted rent based on annual increase
  const currentDate = new Date();
  const startDate = new Date(investment.startDate);
  const yearsSinceStart = Math.max(0, (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
  const adjustedMonthlyRent = calculateAdjustedRent(
    Number(investment.monthlyRent),
    Number(investment.annualRentIncrease || 0),
    yearsSinceStart
  );

  // Calcul des rendements selon les formules spécifiées
  const grossYield = (adjustedMonthlyRent * 12 / totalInvestmentCost) * 100;
  const netYield = ((adjustedMonthlyRent * 12 - annualCosts) / totalInvestmentCost) * 100;
  const monthlyCashFlow = adjustedMonthlyRent - monthlyCosts - totalMonthlyPayment;
  const annualCashFlow = monthlyCashFlow * 12;

  // ROI basé sur le cash flow annuel et l'apport personnel
  const roi = (annualCashFlow / Number(investment.downPayment)) * 100;

  // Calcul des métriques de vente si une date de vente est spécifiée
  let saleMetrics = {};
  let remainingBalance = 0;
  let deferredInterest = 0;
  if (investment.saleDate) {
    const result = generateAmortizationSchedule(
      Number(investment.loanAmount),
      Number(investment.interestRate),
      Number(investment.loanDuration),
      investment.deferralType,
      Number(investment.deferredPeriod),
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
  const total = Number(rent || 0) + Number(taxBenefit || 0) + Number(tenantCharges || 0);
  return total * (1 - (Number(vacancyRate || 0) / 100));
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
  const total = Number(furnishedRent || 0) + Number(tenantCharges || 0);
  return total * (1 - (Number(vacancyRate || 0) / 100));
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
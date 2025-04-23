export interface FinancialMetrics {
  grossYield: number;
  netYield: number;
  monthlyPayment: number;
  monthlyCashFlow: number;
  annualCashFlow: number;
  roi: number;
  annualRentalIncome: number[];
  rentalYears: string[];
  monthlyCosts: number;
  currentMonthlyRent: number;
  remainingBalance: number;
  deferredInterest: number;
  saleProfit?: number;
  capitalGain?: number;
  estimatedSalePrice?: number;
}

export interface AmortizationRow {
  month: number;
  date: string;
  remainingBalance: number;
  remainingPrincipal: number;
  monthlyPayment: number;
  principal: number;
  interest: number;
  totalPaid: number;
  isDeferred: boolean;
}

export interface YearlyExpenses {
  year: number;
  propertyTax: number;
  condoFees: number;
  propertyInsurance: number;
  managementFees: number;
  unpaidRentInsurance: number;
  repairs: number;
  otherDeductible: number;
  otherNonDeductible: number;
  rent: number;
  furnishedRent: number;
  tenantCharges: number;
  tax: number;
  deficit: number;
  loanPayment: number;
  loanInsurance: number;
  taxBenefit: number;
  interest: number;
}

export interface ExpenseProjection {
  propertyTaxIncrease: number;
  condoFeesIncrease: number;
  propertyInsuranceIncrease: number;
  managementFeesIncrease: number;
  unpaidRentInsuranceIncrease: number;
  repairsIncrease: number;
  otherDeductibleIncrease: number;
  otherNonDeductibleIncrease: number;
  rentIncrease: number;
  furnishedRentIncrease: number;
  tenantChargesIncrease: number;
  taxBenefitIncrease: number;
  baseYear: {
    propertyTax: number;
    condoFees: number;
    propertyInsurance: number;
    managementFees: number;
    unpaidRentInsurance: number;
    repairs: number;
    otherDeductible: number;
    otherNonDeductible: number;
    rent: number;
    furnishedRent: number;
    tenantCharges: number;
    taxBenefit: number;
  };
}

export type TaxRegime = 'micro-foncier' | 'reel-foncier' | 'micro-bic' | 'reel-bic';

export interface TaxParameters {
  // Paramètres communs
  taxRate: number; // Taux marginal d'imposition
  socialChargesRate: number; // Taux des prélèvements sociaux
  
  // Paramètres spécifiques LMNP
  buildingValue: number; // Valeur du bien immobilier (hors terrain)
  buildingAmortizationYears: number; // Durée d'amortissement du bien
  furnitureValue: number; // Valeur du mobilier
  furnitureAmortizationYears: number; // Durée d'amortissement du mobilier (5 ans par défaut)
  worksValue: number; // Valeur des travaux
  worksAmortizationYears: number; // Durée d'amortissement des travaux (10 ans par défaut)
  otherValue: number; // Valeur des autres éléments amortissables
  otherAmortizationYears: number; // Durée d'amortissement des autres éléments (5 ans par défaut)
  
  // Paramètres spécifiques location nue
  previousDeficit: number; // Déficit foncier reporté des années précédentes
  deficitLimit: number; // Plafond de déduction du déficit foncier (10 700€ par défaut)

  // Paramètres de revenus
  rent: number; // Loyer nu
  furnishedRent: number; // Loyer meublé
  tenantCharges: number; // Charges imputées au locataire
  taxBenefit: number; // Aide fiscale aux loyers
}

export interface TaxResults {
  regime: TaxRegime;
  taxableIncome: number;
  taxableIncomeBeforeDeficit?: number;
  deductibleExpenses?: number;
  tax: number;
  socialCharges: number;
  totalTax: number;
  netIncome: number;
  deficit?: number;
  usedDeficit?: number;
  amortization?: {
    building: number;
    furniture: number;
    works: number;
    other: number;
    total: number;
    used: number;
    carriedForward: number;
  };
}

export interface CapitalGainResults {
  regime: TaxRegime;
  grossCapitalGain: number;
  taxableCapitalGainIR: number;
  taxableCapitalGainSocial: number;
  incomeTax: number;
  socialCharges: number;
  totalTax: number;
  netCapitalGain: number;
  depreciationTaxable?: number;
  depreciationTax?: number;
  shortTermGain?: number;
  longTermGain?: number;
  shortTermTax?: number;
  longTermIncomeTax?: number;
  longTermSocialCharges?: number;
}

export interface LMNPData {
  buildingValue: number;
  furnitureValue: number;
  buildingAmortizationYears: number;
  furnitureAmortizationYears: number;
  deficitHistory: Record<number, number>;
  excessAmortization: Record<number, number>;
}

export type DeferralType = 'none' | 'partial' | 'total';

export interface Investment {
  id: string;
  name: string;
  projectStartDate: string;
  projectEndDate: string;
  purchasePrice: number;
  agencyFees: number;
  notaryFees: number;
  bankFees: number;
  bankGuaranteeFees: number;
  mandatoryDiagnostics: number;
  renovationCosts: number;
  startDate: string;
  hasDeferral: boolean;
  deferralType: DeferralType;
  deferredPeriod: number;
  deferredInterest: number;
  downPayment: number;
  loanAmount: number;
  loanDuration: number;
  interestRate: number;
  insuranceRate: number;
  propertyTax: number;
  condoFees: number;
  propertyInsurance: number;
  managementFees: number;
  unpaidRentInsurance: number;
  expenses: YearlyExpenses[];
  expenseProjection: ExpenseProjection;
  saleDate: string;
  appreciationType: 'global' | 'annual' | 'amount';
  appreciationValue: number;
  saleAgencyFees: number;
  improvementWorks: number;
  isLMP: boolean;
  accumulatedDepreciation: number;
  monthlyRent: number;
  annualRentIncrease: number;
  occupancyRate: number;
  rentalStartDate: string;
  remainingBalance: number;
  description?: string;
  amortizationSchedule?: AmortizationRow[];
  
  // Tax properties
  taxType: 'direct' | 'lmnp' | 'sci';
  taxationMethod: 'real' | 'micro';
  taxRate: number;
  manualDeficit: number;
  lmnpData?: LMNPData;
  
  selectedRegime: TaxRegime;
  taxParameters: TaxParameters;
  taxResults: Record<TaxRegime, TaxResults>;
  capitalGainResults?: Record<TaxRegime, CapitalGainResults>;
  taxRegime: TaxRegime;
}

export const defaultTaxParameters: TaxParameters = {
  taxRate: 30,
  socialChargesRate: 17.2,
  buildingValue: 0,
  buildingAmortizationYears: 25,
  furnitureValue: 0,
  furnitureAmortizationYears: 10,
  worksValue: 0,
  worksAmortizationYears: 10,
  otherValue: 0,
  otherAmortizationYears: 5,
  previousDeficit: 0,
  deficitLimit: 10700,
  rent: 0,
  furnishedRent: 0,
  tenantCharges: 0,
  taxBenefit: 0
};

export const defaultExpenseProjection: ExpenseProjection = {
  propertyTaxIncrease: 2,
  condoFeesIncrease: 2,
  propertyInsuranceIncrease: 1,
  managementFeesIncrease: 1,
  unpaidRentInsuranceIncrease: 1,
  repairsIncrease: 2,
  otherDeductibleIncrease: 1,
  otherNonDeductibleIncrease: 1,
  rentIncrease: 2,
  furnishedRentIncrease: 2,
  tenantChargesIncrease: 2,
  taxBenefitIncrease: 1,
  baseYear: {
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
    taxBenefit: 0
  }
};

export const defaultInvestment: Investment = {
  id: '',
  name: '',
  projectStartDate: new Date().toISOString().split('T')[0],
  projectEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 20)).toISOString().split('T')[0],
  purchasePrice: 0,
  agencyFees: 0,
  notaryFees: 0,
  bankFees: 0,
  bankGuaranteeFees: 0,
  mandatoryDiagnostics: 0,
  renovationCosts: 0,
  startDate: new Date().toISOString().split('T')[0],
  hasDeferral: false,
  deferralType: 'none',
  deferredPeriod: 0,
  deferredInterest: 0,
  downPayment: 0,
  loanAmount: 0,
  loanDuration: 20,
  interestRate: 0,
  insuranceRate: 0,
  propertyTax: 0,
  condoFees: 0,
  propertyInsurance: 0,
  managementFees: 0,
  unpaidRentInsurance: 0,
  expenses: [],
  expenseProjection: defaultExpenseProjection,
  saleDate: '',
  appreciationType: 'global',
  appreciationValue: 0,
  saleAgencyFees: 0,
  improvementWorks: 0,
  isLMP: false,
  accumulatedDepreciation: 0,
  monthlyRent: 0,
  annualRentIncrease: 0,
  occupancyRate: 0,
  rentalStartDate: '',
  remainingBalance: 0,
  description: '',
  amortizationSchedule: [],
  taxType: 'direct',
  taxationMethod: 'real',
  taxRate: 30,
  manualDeficit: 0,
  selectedRegime: 'micro-foncier',
  taxParameters: defaultTaxParameters,
  taxResults: {
    'micro-foncier': {
      regime: 'micro-foncier',
      taxableIncome: 0,
      tax: 0,
      socialCharges: 0,
      totalTax: 0,
      netIncome: 0
    },
    'reel-foncier': {
      regime: 'reel-foncier',
      taxableIncome: 0,
      tax: 0,
      socialCharges: 0,
      totalTax: 0,
      netIncome: 0
    },
    'micro-bic': {
      regime: 'micro-bic',
      taxableIncome: 0,
      tax: 0,
      socialCharges: 0,
      totalTax: 0,
      netIncome: 0
    },
    'reel-bic': {
      regime: 'reel-bic',
      taxableIncome: 0,
      tax: 0,
      socialCharges: 0,
      totalTax: 0,
      netIncome: 0
    }
  },
  taxRegime: 'micro-foncier'
};

const handleResetAmortization = () => {
  // Logique pour réinitialiser le tableau d'amortissement
};
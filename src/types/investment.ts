import { Database } from './supabase';

export interface AmortizationRow {
  month: number;
  date: string;
  remainingBalance: number;
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
  tenantChargesIncrease: number;
  taxIncrease: number;
  taxBenefitIncrease: number;
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
  furnitureAmortizationYears: number; // Durée d'amortissement du mobilier
  
  // Paramètres spécifiques location nue
  previousDeficit: number; // Déficit foncier reporté des années précédentes
  deficitLimit: number; // Plafond de déduction du déficit foncier (10 700€ par défaut)
}

export interface TaxResults {
  regime: TaxRegime;
  taxableIncome: number;
  tax: number;
  socialCharges: number;
  totalTax: number;
  netIncome: number;
  deficit?: number;
  amortization?: {
    building: number;
    furniture: number;
    total: number;
  };
}

export type DeferralType = 'none' | 'partial' | 'total';

export interface Investment {
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
  
  selectedRegime: TaxRegime;
  taxParameters: TaxParameters;
  taxResults: Record<TaxRegime, TaxResults>;
}

export const defaultTaxParameters: TaxParameters = {
  taxRate: 30,
  socialChargesRate: 17.2,
  buildingValue: 0,
  buildingAmortizationYears: 25,
  furnitureValue: 0,
  furnitureAmortizationYears: 10,
  previousDeficit: 0,
  deficitLimit: 10700
};

export const defaultInvestment: Investment = {
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
  expenseProjection: {
    propertyTaxIncrease: 2,
    condoFeesIncrease: 2,
    propertyInsuranceIncrease: 1,
    managementFeesIncrease: 1,
    unpaidRentInsuranceIncrease: 1,
    repairsIncrease: 2,
    otherDeductibleIncrease: 1,
    otherNonDeductibleIncrease: 1,
    rentIncrease: 2,
    tenantChargesIncrease: 2,
    taxIncrease: 1,
    taxBenefitIncrease: 1
  },
  saleDate: '',
  appreciationType: 'global',
  appreciationValue: 0,
  saleAgencyFees: 0,
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
  }
};
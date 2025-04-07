import { Investment } from '../types/investment';

export function createInvestment(name: string): Investment {
  const currentYear = new Date().getFullYear();
  
  return {
    name,
    projectStartDate: new Date().toISOString(),
    projectEndDate: new Date(currentYear + 20, 11, 31).toISOString(),
    purchasePrice: 0,
    agencyFees: 0,
    notaryFees: 0,
    bankFees: 0,
    bankGuaranteeFees: 0,
    mandatoryDiagnostics: 0,
    renovationCosts: 0,
    startDate: new Date().toISOString(),
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
      propertyTaxIncrease: 0,
      condoFeesIncrease: 0,
      propertyInsuranceIncrease: 0,
      managementFeesIncrease: 0,
      unpaidRentInsuranceIncrease: 0,
      repairsIncrease: 0,
      otherDeductibleIncrease: 0,
      otherNonDeductibleIncrease: 0,
      rentIncrease: 0,
      furnishedRentIncrease: 0,
      tenantChargesIncrease: 0,
      taxBenefitIncrease: 0,
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
    },
    saleDate: new Date(currentYear + 20, 11, 31).toISOString(),
    appreciationType: 'annual',
    appreciationValue: 0,
    saleAgencyFees: 0,
    improvementWorks: 0,
    isLMP: false,
    accumulatedDepreciation: 0,
    monthlyRent: 0,
    annualRentIncrease: 0,
    occupancyRate: 100,
    rentalStartDate: new Date().toISOString(),
    remainingBalance: 0,
    taxType: 'direct',
    taxationMethod: 'real',
    taxRate: 30,
    manualDeficit: 0,
    selectedRegime: 'micro-foncier',
    taxRegime: 'micro-foncier',
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
        netIncome: 0,
        deductibleExpenses: 0,
        deficit: 0
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
        netIncome: 0,
        deductibleExpenses: 0,
        amortization: {
          building: 0,
          furniture: 0,
          works: 0,
          other: 0,
          total: 0,
          used: 0,
          carriedForward: 0
        }
      }
    },
    taxParameters: {
      taxRate: 30,
      socialChargesRate: 17.2,
      buildingValue: 0,
      buildingAmortizationYears: 25,
      furnitureValue: 0,
      furnitureAmortizationYears: 5,
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
    }
  };
} 
import React, { createContext, useContext, useState } from 'react';
import { Investment, defaultTaxParameters } from '../types/investment';

interface InvestmentContextType {
  investment: Investment;
  setInvestment: (investment: Investment) => void;
}

const InvestmentContext = createContext<InvestmentContextType | undefined>(undefined);

export const InvestmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [investment, setInvestment] = useState<Investment>({
    projectStartDate: new Date().toISOString(),
    projectEndDate: new Date(new Date().getFullYear() + 10).toISOString(),
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
  });

  return (
    <InvestmentContext.Provider value={{ investment, setInvestment }}>
      {children}
    </InvestmentContext.Provider>
  );
};

export const useInvestment = () => {
  const context = useContext(InvestmentContext);
  if (context === undefined) {
    throw new Error('useInvestment must be used within an InvestmentProvider');
  }
  return context;
}; 
import { useMemo } from 'react';
import { Investment, FinancialMetrics } from '../types/investment';
import { calculateFinancialMetrics } from '../utils/calculations';

/**
 * Hook personnalisé pour calculer les métriques financières avec memoization
 * Les calculs ne sont refaits que si l'objet Investment change
 * 
 * @param investment - Objet Investment contenant toutes les données
 * @returns Métriques financières calculées
 */
export function useFinancialMetrics(investment: Investment): FinancialMetrics {
  return useMemo(() => {
    return calculateFinancialMetrics(investment);
  }, [
    // Dépendances critiques qui affectent les calculs
    investment.purchasePrice,
    investment.agencyFees,
    investment.notaryFees,
    investment.bankFees,
    investment.renovationCosts,
    investment.loanAmount,
    investment.interestRate,
    investment.loanDuration,
    investment.insuranceRate,
    investment.deferralType,
    investment.deferredPeriod,
    investment.downPayment,
    investment.monthlyRent,
    investment.annualRentIncrease,
    investment.occupancyRate,
    investment.propertyTax,
    investment.condoFees,
    investment.propertyInsurance,
    investment.managementFees,
    investment.unpaidRentInsurance,
    investment.startDate,
    investment.saleDate,
    investment.appreciationType,
    investment.appreciationValue,
    investment.saleAgencyFees,
  ]);
}

/**
 * Hook pour vérifier si un investissement est valide pour les calculs
 * 
 * @param investment - Objet Investment à valider
 * @returns true si l'investissement est valide
 */
export function useIsValidInvestment(investment: Investment): boolean {
  return useMemo(() => {
    // Vérifications de base
    return (
      investment.purchasePrice > 0 &&
      investment.loanDuration > 0 &&
      investment.interestRate >= 0
    );
  }, [investment.purchasePrice, investment.loanDuration, investment.interestRate]);
}


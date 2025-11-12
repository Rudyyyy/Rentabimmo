/**
 * Utilitaires de calcul pour les propriétés
 * Fonctions communes utilisées par LocationTables et sciTaxCalculations
 */

import { Investment } from '../types/investment';
import { generateAmortizationSchedule } from './calculations';

/**
 * Calcule la fraction de l'année couverte par le projet
 * @param property - Le bien immobilier
 * @param year - L'année à évaluer
 * @returns Un nombre entre 0 et 1 représentant la fraction d'année couverte
 */
export function getYearCoverage(property: Investment, year: number): number {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);
  const projectStart = new Date(property.projectStartDate);
  const projectEnd = new Date(property.projectEndDate);
  
  const start = projectStart > startOfYear ? projectStart : startOfYear;
  const end = projectEnd < endOfYear ? projectEnd : endOfYear;
  
  if (end < start) return 0;
  
  const msInDay = 1000 * 60 * 60 * 24;
  const daysInYear = Math.round((new Date(year + 1, 0, 1).getTime() - new Date(year, 0, 1).getTime()) / msInDay);
  const coveredDays = Math.floor((end.getTime() - start.getTime()) / msInDay) + 1;
  
  return Math.min(1, Math.max(0, coveredDays / daysInYear));
}

/**
 * Ajuste une valeur selon le prorata de l'année couverte
 * @param value - La valeur à ajuster
 * @param coverage - Le prorata (entre 0 et 1)
 * @returns La valeur ajustée
 */
export function adjustForCoverage(value: number, coverage: number): number {
  return Number((Number(value || 0) * coverage).toFixed(2));
}

/**
 * Calcule les intérêts du prêt pour une année donnée
 * @param property - Le bien immobilier
 * @param year - L'année fiscale
 * @returns Les intérêts annuels
 */
export function getInterestForYear(property: Investment, year: number): number {
  if (!property.loanAmount || !property.interestRate || !property.loanDuration) {
    return 0;
  }
  
  const amortizationResult = generateAmortizationSchedule(
    property.loanAmount,
    property.interestRate,
    property.loanDuration,
    property.deferralType,
    property.deferredPeriod,
    property.startDate
  );
  
  const projectStart = new Date(property.projectStartDate);
  const projectEnd = new Date(property.projectEndDate);
  
  const yearlyPayments = amortizationResult.schedule
    .filter(row => {
      const d = new Date(row.date);
      return d.getFullYear() === year && d >= projectStart && d <= projectEnd;
    })
    .reduce((sum, row) => sum + row.interest, 0);
  
  return yearlyPayments;
}

/**
 * Calcule les informations de prêt pour une année donnée
 * @param property - Le bien immobilier
 * @param year - L'année fiscale
 * @returns Les informations de prêt (mensualité, assurance)
 */
export function getLoanInfoForYear(property: Investment, year: number): { payment: number; insurance: number } {
  if (!property.loanAmount || !property.interestRate || !property.loanDuration) {
    return { payment: 0, insurance: 0 };
  }
  
  const amortizationResult = generateAmortizationSchedule(
    property.loanAmount,
    property.interestRate,
    property.loanDuration,
    property.deferralType,
    property.deferredPeriod,
    property.startDate
  );
  
  const projectStart = new Date(property.projectStartDate);
  const projectEnd = new Date(property.projectEndDate);
  
  const yearlyPayments = amortizationResult.schedule
    .filter(row => {
      const d = new Date(row.date);
      return d.getFullYear() === year && d >= projectStart && d <= projectEnd;
    })
    .reduce((acc, row) => {
      acc.payment += row.monthlyPayment;
      acc.insurance += (property.loanAmount * (property.insuranceRate || 0)) / (100 * 12);
      return acc;
    }, { payment: 0, insurance: 0 });

  return yearlyPayments;
}

/**
 * Vérifie si une année est partielle pour un bien
 * @param property - Le bien immobilier
 * @param year - L'année à vérifier
 * @returns true si l'année est partielle
 */
export function isPartialYear(property: Investment, year: number): boolean {
  const c = getYearCoverage(property, year);
  return c > 0 && c < 1;
}


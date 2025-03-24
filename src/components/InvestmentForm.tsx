import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Investment } from '../types/investment';
import AmortizationTable from './AmortizationTable';
import { generateAmortizationSchedule } from '../utils/calculations';

interface Props {
  onSubmit: (data: Investment) => void;
  initialValues?: Investment;
}

export default function InvestmentForm({ onSubmit, initialValues }: Props) {
  const [showAmortization, setShowAmortization] = useState(false);
  const [showMonthlyChart, setShowMonthlyChart] = useState(false);
  const { register, watch, reset } = useForm<Investment>();
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Initialize form with initial values or defaults
  useEffect(() => {
    reset({
      ...initialValues,
      startDate: initialValues?.startDate || new Date().toISOString().split('T')[0],
      deferredPeriod: initialValues?.deferredPeriod || 0,
      saleDate: initialValues?.saleDate || '',
      appreciationType: initialValues?.appreciationType || 'global',
      appreciationValue: initialValues?.appreciationValue || 0
    });
  }, [initialValues, reset]);

  // Watch all form values
  const values = watch();
  
  // Memoize calculations to prevent unnecessary re-renders
  const calculations = useCallback(() => {
    const {
      purchasePrice = 0,
      agencyFees = 0,
      notaryFees = 0,
      bankFees = 0,
      renovationCosts = 0,
      loanAmount = 0,
      interestRate = 0,
      loanDuration = 0,
      insuranceRate = 0,
      deferredPeriod = 0,
      startDate = new Date().toISOString().split('T')[0],
      propertyTax = 0,
      condoFees = 0,
      propertyInsurance = 0,
      managementFees = 0,
      unpaidRentInsurance = 0,
    } = values;

    // Calculate totals
    const totalInvestmentCost = 
      Number(purchasePrice) +
      Number(agencyFees) +
      Number(notaryFees) +
      Number(bankFees) +
      Number(renovationCosts);

    const monthlyPayment = loanAmount && interestRate && loanDuration
      ? (loanAmount * (interestRate / 1200) * Math.pow(1 + interestRate / 1200, loanDuration * 12)) /
        (Math.pow(1 + interestRate / 1200, loanDuration * 12) - 1)
      : 0;

    const totalInsuranceCost = loanAmount && insuranceRate && loanDuration
      ? (loanAmount * (insuranceRate / 100) * loanDuration)
      : 0;

    const monthlyInsurance = totalInsuranceCost / (loanDuration * 12) || 0;

    const annualCosts = 
      Number(propertyTax) +
      Number(condoFees) +
      Number(propertyInsurance) +
      Number(managementFees) +
      Number(unpaidRentInsurance);

    const monthlyCosts = annualCosts / 12;

    const amortizationSchedule = loanAmount && interestRate && loanDuration
      ? generateAmortizationSchedule(
          loanAmount,
          interestRate,
          loanDuration,
          Number(deferredPeriod),
          startDate
        )
      : [];

    return {
      totalInvestmentCost,
      monthlyPayment,
      totalInsuranceCost,
      monthlyInsurance,
      monthlyCosts,
      amortizationSchedule
    };
  }, [values]);

  const {
    totalInvestmentCost,
    monthlyPayment,
    monthlyInsurance,
    monthlyCosts,
    amortizationSchedule
  } = calculations();

  // Trigger calculations when form values change with debounce
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const hasValues = Object.values(values).some(value => 
      value !== undefined && value !== 0 && value !== ''
    );
    
    if (hasValues) {
      timeoutRef.current = setTimeout(() => {
        onSubmit(values);
      }, 500);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [values, onSubmit]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  return (
    <div className="space-y-6">
      {/* Project Dates */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Dates du projet</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date de début
            </label>
            <input
              type="date"
              {...register('projectStartDate')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date de fin
            </label>
            <input
              type="date"
              {...register('projectEndDate')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Purchase Details */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Détails d'acquisition</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Prix d'achat
            </label>
            <input
              type="number"
              {...register('purchasePrice')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Frais d'agence
            </label>
            <input
              type="number"
              {...register('agencyFees')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Frais de notaire
            </label>
            <input
              type="number"
              {...register('notaryFees')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Frais de dossier bancaire
            </label>
            <input
              type="number"
              {...register('bankFees')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Travaux
            </label>
            <input
              type="number"
              {...register('renovationCosts')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <div className="bg-gray-50 p-4 rounded-md w-full">
              <p className="text-sm text-gray-600">Coût total de l'opération</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(totalInvestmentCost)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Financing */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Financement</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date de début
            </label>
            <input
              type="date"
              {...register('startDate')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Différé (mois)
            </label>
            <input
              type="number"
              min="0"
              {...register('deferredPeriod')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Apport
            </label>
            <input
              type="number"
              {...register('downPayment')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Somme empruntée
            </label>
            <input
              type="number"
              {...register('loanAmount')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Durée (années)
            </label>
            <input
              type="number"
              {...register('loanDuration')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Taux d'intérêt (%)
            </label>
            <input
              type="number"
              step="0.01"
              {...register('interestRate')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Assurance (%)
            </label>
            <input
              type="number"
              step="0.01"
              {...register('insuranceRate')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <div className="bg-gray-50 p-4 rounded-md w-full">
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">Mensualité (hors assurance)</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(monthlyPayment)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Assurance mensuelle</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(monthlyInsurance)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Mensualité totale</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(monthlyPayment + monthlyInsurance)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Annual Expenses */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Charges annuelles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Taxe foncière
            </label>
            <input
              type="number"
              {...register('propertyTax')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Charges de copropriété
            </label>
            <input
              type="number"
              {...register('condoFees')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Assurance propriétaire
            </label>
            <input
              type="number"
              {...register('propertyInsurance')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Frais d'agence
            </label>
            <input
              type="number"
              {...register('managementFees')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Assurance loyer impayé
            </label>
            <input
              type="number"
              {...register('unpaidRentInsurance')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <div className="bg-gray-50 p-4 rounded-md w-full">
              <p className="text-sm text-gray-600">Charges mensuelles</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(monthlyCosts)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showAmortization && (
        <AmortizationTable
          schedule={amortizationSchedule}
          onClose={() => setShowAmortization(false)}
        />
      )}
    </div>
  );
}
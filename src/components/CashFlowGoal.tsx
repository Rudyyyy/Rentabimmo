import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';

interface CashFlowGoalProps {
  cashFlowData: {
    year: number;
    total: number;
  }[];
  onGoalChange: (monthlyGoal: number) => void;
}

export default function CashFlowGoal({ cashFlowData, onGoalChange }: CashFlowGoalProps) {
  const [monthlyGoal, setMonthlyGoal] = useState<number>(() => {
    const savedGoal = localStorage.getItem('cashFlowGoal');
    return savedGoal ? parseFloat(savedGoal) : 0;
  });
  const [targetYear, setTargetYear] = useState<number | null>(null);

  useEffect(() => {
    if (monthlyGoal > 0) {
      // Trouver l'année où l'objectif est atteint
      const targetYear = cashFlowData.find(data => 
        data.total >= monthlyGoal * 12
      )?.year || null;
      setTargetYear(targetYear);
    } else {
      setTargetYear(null);
    }
  }, [monthlyGoal, cashFlowData]);

  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setMonthlyGoal(value);
    onGoalChange(value);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
      <h3 className="text-lg font-semibold mb-4">Objectif de cash flow</h3>
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label htmlFor="monthlyGoal" className="block text-sm font-medium text-gray-700">
              Cash flow mensuel cible
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                name="monthlyGoal"
                id="monthlyGoal"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-12 sm:text-sm border-gray-300 rounded-md"
                placeholder="0"
                value={monthlyGoal || ''}
                onChange={handleGoalChange}
                min="0"
                step="100"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">€</span>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">
              Cash flow annuel cible
            </label>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {formatCurrency(monthlyGoal * 12)}
            </div>
          </div>
        </div>
        
        {targetYear && (
          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-700">
              Votre objectif de {formatCurrency(monthlyGoal)}/mois sera atteint en {targetYear}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 
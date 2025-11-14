import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';

interface TotalGainGoalProps {
  totalGainData: {
    year: number;
    totalGain: number;
  }[];
  onGoalChange: (goal: number) => void;
  initialGoal?: number;
  tabLabel?: string;
}

export default function TotalGainGoal({ totalGainData, onGoalChange, initialGoal = 0, tabLabel }: TotalGainGoalProps) {
  const [goal, setGoal] = useState<number>(initialGoal);
  const [targetYear, setTargetYear] = useState<number | null>(null);

  // Mettre à jour le goal local quand initialGoal change (changement d'onglet)
  useEffect(() => {
    setGoal(initialGoal);
  }, [initialGoal]);

  useEffect(() => {
    if (goal > 0) {
      // Trouver l'année où l'objectif est atteint
      const foundYear = totalGainData.find(data => 
        data.totalGain >= goal
      )?.year || null;
      setTargetYear(foundYear);
    } else {
      setTargetYear(null);
    }
  }, [goal, totalGainData]);

  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setGoal(value);
    onGoalChange(value);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
      <h3 className="text-lg font-semibold mb-4">
        Objectif de gain total cumulé
        {tabLabel && <span className="text-sm font-normal text-gray-600 ml-2">({tabLabel})</span>}
      </h3>
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label htmlFor="totalGainGoal" className="block text-sm font-medium text-gray-700">
              Gain total cumulé cible
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                name="totalGainGoal"
                id="totalGainGoal"
                className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-3 pr-12 sm:text-sm border-gray-300 rounded-md"
                placeholder="0"
                value={goal || ''}
                onChange={handleGoalChange}
                min="0"
                step="1000"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">€</span>
              </div>
            </div>
          </div>
        </div>
        
        {targetYear ? (
          <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-200">
            <p className="text-sm font-medium text-green-800">
              ✅ Votre objectif de {formatCurrency(goal)} sera atteint en {targetYear}
            </p>
          </div>
        ) : goal > 0 ? (
          <div className="mt-4 p-4 bg-yellow-50 rounded-md border border-yellow-200">
            <p className="text-sm font-medium text-yellow-800">
              ⚠️ L'objectif de {formatCurrency(goal)} ne sera pas atteint avec la projection actuelle
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}


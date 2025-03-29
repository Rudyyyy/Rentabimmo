import React from 'react';
import { formatCurrency } from '../utils/formatters';

interface Props {
  title: string;
  value: number;
  description: string;
  isPercentage?: boolean;
}

export default function MetricsCard({ title, value, description, isPercentage = false }: Props) {
  const formattedValue = isPercentage 
    ? `${(value * 100).toFixed(2)}%`
    : formatCurrency(value);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-2 text-3xl font-semibold text-blue-600">
        {formattedValue}
      </p>
      <p className="mt-1 text-sm text-gray-500">
        {description}
      </p>
    </div>
  );
} 
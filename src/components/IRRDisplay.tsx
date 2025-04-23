import React, { useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Investment } from '../types/investment';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Internal IRR calculation utility functions
function calculateNPV(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((npv, cf, t) => npv + cf / Math.pow(1 + rate, t), 0);
}

function calculateNPVDerivative(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((npv, cf, t) => {
    if (t === 0) return npv; // The derivative of the t=0 term is zero
    return npv - (t * cf) / Math.pow(1 + rate, t + 1);
  }, 0);
}

// Utility function to check if a value is a valid number
function ensureNumber(value: any, defaultValue: number = 0): number {
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

// Function to calculate IRR
function calculateIRR(
  cashFlows: number[],
  guess: number = 0.1,
  tolerance: number = 1e-7,
  maxIterations: number = 100
): number {
  if (!cashFlows || cashFlows.length < 2) {
    console.error("IRR calculation needs at least 2 cash flows");
    return 0;
  }
  
  // Check if all cash flows are of the same sign (impossible to calculate IRR)
  const hasPositive = cashFlows.some(cf => cf > 0);
  const hasNegative = cashFlows.some(cf => cf < 0);
  if (!hasPositive || !hasNegative) {
    console.error("IRR calculation requires both positive and negative cash flows");
    return 0;
  }
  
  let rate = guess;
  
  for (let i = 0; i < maxIterations; i++) {
    const npv = calculateNPV(cashFlows, rate);
    
    if (Math.abs(npv) < tolerance) {
      return rate; // Convergence reached
    }
    
    const derivative = calculateNPVDerivative(cashFlows, rate);
    if (derivative === 0) {
      break; // Avoid division by zero
    }
    
    // Newton-Raphson method: r_n+1 = r_n - f(r_n) / f'(r_n)
    const newRate = rate - npv / derivative;
    
    // Check convergence
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }
    
    rate = newRate;
    
    // If rate becomes too extreme, break
    if (rate > 1000 || rate < -0.99) {
      return 0;
    }
  }
  
  // If no solution is found after the maximum number of iterations
  console.warn(`Max iterations (${maxIterations}) reached without convergence, returning best approximation: ${rate}`);
  return rate;
}

interface Props {
  investment: Investment;
}

export default function IRRDisplay({ investment }: Props) {
  // Define tax regimes
  const taxRegimes = ['LMNP Micro-BIC', 'LMNP Réel', 'LMP', 'Nu-propriété'];
  
  // State for selected tax regimes and IRR data
  const [selectedRegimes, setSelectedRegimes] = useState<string[]>(['LMNP Micro-BIC', 'LMNP Réel']);
  const [irrData, setIrrData] = useState<{ [regime: string]: number[] }>({});
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  
  // Get investment start and end dates
  const startDate = new Date(investment.projectStartDate);
  const endDate = new Date(investment.projectEndDate);
  const projectDuration = endDate.getFullYear() - startDate.getFullYear() + 1;
  
  // Generate years array for x-axis
  const years = Array.from({ length: projectDuration }, (_, i) => startDate.getFullYear() + i);
  
  // Calculate IRR for each regime and year
  useEffect(() => {
    const calculateIRRData = () => {
      
      const result: { [regime: string]: number[] } = {};
      
      taxRegimes.forEach(regime => {
        const regimeIRRs = years.map(year => {
          // Get cash flows up to this year
          const cashFlows = getCashFlowsUntil(year, regime);
          // Add final balance after sale if it's the final year
          if (year === endDate.getFullYear()) {
            const balanceAfterSale = getBalanceAfterSale(regime);
            cashFlows.push(balanceAfterSale);
          }
          
          // Calculate IRR for this regime and year
          return calculateIRR(cashFlows);
        });
        
        result[regime] = regimeIRRs;
      });
      
      setIrrData(result);
      // Set the selected year to the final year by default
      if (selectedYear === null) {
        setSelectedYear(endDate.getFullYear());
      }
    };
    
    calculateIRRData();
  }, [investment]);
  
  // Function to get cash flows until a specific year for a given regime
  const getCashFlowsUntil = (endYear: number, regime: string) => {
    const cashFlows: number[] = [];
    
    // Initial investment as negative cash flow
    const initialInvestment = -(
      ensureNumber(investment.purchasePrice) + 
      ensureNumber(investment.notaryFees) + 
      ensureNumber(investment.renovationCosts)
    );
   cashFlows.push(initialInvestment);
    
    // Add yearly cash flows
    for (let year = startDate.getFullYear(); year <= endYear; year++) {
      const yearlyExpenses = investment.expenses.filter(e => new Date(e.year, 0).getFullYear() === year);
      let yearlyCashFlow = 0;
      
      yearlyExpenses.forEach(expense => {
        // Calculate revenue
        const revenue = ensureNumber(expense.rent);
         
        // Calculate expenses based on regime
        let totalExpenses = 0;
        if (regime === 'LMNP Micro-BIC') {
          // Micro-BIC: 50% tax deduction on revenue
          const taxableIncome = revenue * 0.5;
          const tax = taxableIncome * (ensureNumber(investment.taxParameters.taxRate) / 100);
          totalExpenses = 
            ensureNumber(expense.propertyTax) +
            ensureNumber(expense.condoFees) +
            ensureNumber(expense.propertyInsurance) +
            ensureNumber(expense.managementFees) +
            ensureNumber(expense.unpaidRentInsurance) +
            ensureNumber(expense.repairs) +
            ensureNumber(expense.otherNonDeductible) +
            ensureNumber(expense.loanPayment) +
            ensureNumber(expense.loanInsurance) +
            tax;
        } else if (regime === 'LMNP Réel' || regime === 'LMP') {
          // Real regime: all expenses deductible + amortization
          // Note: amortization not directly available in YearlyExpenses, it's a calculated value
          // For simplicity, we'll use accumulated depreciation divided by project duration
          const amortizationEstimate = ensureNumber(investment.accumulatedDepreciation) / projectDuration;
         
          const taxableIncome = revenue - 
            ensureNumber(expense.propertyTax) -
            ensureNumber(expense.condoFees) -
            ensureNumber(expense.propertyInsurance) -
            ensureNumber(expense.managementFees) -
            ensureNumber(expense.unpaidRentInsurance) -
            ensureNumber(expense.repairs) -
            ensureNumber(expense.otherDeductible) -
            ensureNumber(expense.loanInsurance) -
            amortizationEstimate;
          
          const tax = Math.max(0, taxableIncome * (ensureNumber(investment.taxParameters.taxRate) / 100));
          
          totalExpenses = 
            ensureNumber(expense.propertyTax) +
            ensureNumber(expense.condoFees) +
            ensureNumber(expense.propertyInsurance) +
            ensureNumber(expense.managementFees) +
            ensureNumber(expense.unpaidRentInsurance) +
            ensureNumber(expense.repairs) +
            ensureNumber(expense.otherDeductible) +
            ensureNumber(expense.otherNonDeductible) +
            ensureNumber(expense.loanPayment) +
            ensureNumber(expense.loanInsurance) +
            tax;
        } else if (regime === 'Nu-propriété') {
          // Nu-propriété: no revenue, only expenses
          totalExpenses = 
            ensureNumber(expense.propertyTax) +
            ensureNumber(expense.condoFees) +
            ensureNumber(expense.propertyInsurance) +
            ensureNumber(expense.otherNonDeductible) +
            ensureNumber(expense.loanPayment) +
            ensureNumber(expense.loanInsurance);
        }
        
        yearlyCashFlow += revenue - totalExpenses;
      });
      
      cashFlows.push(yearlyCashFlow);
    }
    
    return cashFlows;
  };
  
  // Function to calculate balance after sale for a given regime
  const getBalanceAfterSale = (regime: string) => {
    // Calculate sale price based on appreciation
    let salePrice = 0;
    if (investment.appreciationType === 'global') {
      salePrice = ensureNumber(investment.purchasePrice) * (1 + ensureNumber(investment.appreciationValue) / 100);
    } else if (investment.appreciationType === 'annual') {
      const years = endDate.getFullYear() - startDate.getFullYear();
      salePrice = ensureNumber(investment.purchasePrice) * Math.pow(1 + ensureNumber(investment.appreciationValue) / 100, years);
    } else if (investment.appreciationType === 'amount') {
      salePrice = ensureNumber(investment.appreciationValue);
    }
    
    // Subtract agency fees
    const agencyFeesPercent = ensureNumber(investment.saleAgencyFees);
    const agencyFeesAmount = salePrice * (agencyFeesPercent / 100);
    const netSalePrice = salePrice - agencyFeesAmount;
    (`Net sale price: salePrice: ${salePrice}, agencyFees: ${agencyFeesPercent}%, amount: ${agencyFeesAmount}, netSalePrice: ${netSalePrice}`);
   
    // Calculate remaining mortgage
    // This would normally use principalRepayment but it's not in YearlyExpenses
    // We'll estimate it as a fraction of loan paid off
    const loanDuration = ensureNumber(investment.loanDuration);
    const yearsPassed = Math.min(
      endDate.getFullYear() - startDate.getFullYear(),
      loanDuration
    );
    const remainingMortgage = yearsPassed < loanDuration
      ? ensureNumber(investment.loanAmount) * (1 - yearsPassed / loanDuration)
      : 0;
    
    // Early repayment fees (not directly in Investment)
    // Using a reasonable default value for early repayment fee percentage
    const earlyRepaymentFeePercent = 3; // Assuming 3% as a default
    const earlyRepaymentFee = remainingMortgage * (earlyRepaymentFeePercent / 100);
    const totalDebt = remainingMortgage + earlyRepaymentFee;
    
    // Calculate capital gain and tax (simplified)
    const correctedPurchasePrice = ensureNumber(investment.purchasePrice) + ensureNumber(investment.notaryFees);
    const capitalGain = netSalePrice - correctedPurchasePrice;
      
    // Adjust tax based on regime
    let capitalGainTax = 0;
    let amortizationReintegration = 0;
    
    if (capitalGain > 0) {
      if (regime === 'LMNP Réel' || regime === 'LMP') {
        // Calculate total amortization used
        // For simplicity, use accumulated depreciation
        const totalAmortization = ensureNumber(investment.accumulatedDepreciation);
        
        // Reintegration of amortization
        amortizationReintegration = Math.min(capitalGain, totalAmortization) * (ensureNumber(investment.taxParameters.taxRate) / 100);
        
        // Standard capital gain tax (19% + 17.2% social charges)
        const taxableCapitalGain = Math.max(0, capitalGain - totalAmortization);
        capitalGainTax = taxableCapitalGain * 0.362; // 19% + 17.2%
      } else {
        // Standard capital gain tax for other regimes
        capitalGainTax = capitalGain * 0.362; // 19% + 17.2%
     }
    }
    
    // Final balance
    const finalBalance = netSalePrice - totalDebt - capitalGainTax - amortizationReintegration;
    return finalBalance;
  };
  
  // Prepare chart data
  const chartData = {
    labels: years,
    datasets: selectedRegimes.map((regime, index) => ({
      label: regime,
      data: irrData[regime] || Array(years.length).fill(0),
      borderColor: getChartColor(index),
      backgroundColor: `rgba(${getChartColorRGB(index)}, 0.1)`,
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 3,
    })),
  };
  
  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${(context.raw * 100).toFixed(2)}%`;
          }
        }
      },
      title: {
        display: true,
        text: 'Évolution du TRI par année et par régime fiscal',
      },
    },
    scales: {
      y: {
        ticks: {
          callback: function(value: any) {
            return (value * 100).toFixed(2) + '%';
          }
        },
        title: {
          display: true,
          text: 'TRI (%)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Année'
        }
      }
    },
  };
  
  // Helper function to get chart colors
  function getChartColor(index: number) {
    const colors = ['#4c51bf', '#38a169', '#e53e3e', '#d69e2e', '#805ad5', '#3182ce'];
    return colors[index % colors.length];
  }
  
  function getChartColorRGB(index: number) {
    const rgbColors = ['76, 81, 191', '56, 161, 105', '229, 62, 62', '214, 158, 46', '128, 90, 213', '49, 130, 206'];
    return rgbColors[index % rgbColors.length];
  }
  
  // Handle regime selection
  const toggleRegime = (regime: string) => {
    setSelectedRegimes(prev => 
      prev.includes(regime)
        ? prev.filter(r => r !== regime)
        : [...prev, regime]
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Taux de Rentabilité Interne (TRI)</h3>
        
        {/* Regime selection checkboxes */}
        <div className="flex flex-wrap gap-4 mb-4">
          {taxRegimes.map(regime => (
            <label key={regime} className="inline-flex items-center">
              <input
                type="checkbox"
                checked={selectedRegimes.includes(regime)}
                onChange={() => toggleRegime(regime)}
                className="form-checkbox h-4 w-4 text-blue-600"
              />
              <span className="ml-2">{regime}</span>
            </label>
          ))}
        </div>
        
        {/* Chart */}
        <div className="h-80">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
      
      {/* TRI Table */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Détail du TRI par année</h3>
        
        {/* Tax regime tabs */}
        <div className="border-b border-gray-200 mb-4">
          <nav className="-mb-px flex space-x-4">
            {taxRegimes.map(regime => (
              <button
                key={regime}
                className={`whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm ${
                  selectedYear === endDate.getFullYear() && selectedRegimes.includes(regime)
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => {
                  if (!selectedRegimes.includes(regime)) {
                    setSelectedRegimes(prev => [...prev, regime]);
                  }
                }}
              >
                {regime}
              </button>
            ))}
          </nav>
        </div>
        
        {/* TRI table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Année
                </th>
                {selectedRegimes.map(regime => (
                  <th key={regime} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {regime}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {years.map((year, idx) => (
                <tr key={year} className={year === selectedYear ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {year}
                  </td>
                  {selectedRegimes.map(regime => (
                    <td key={`${regime}-${year}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {irrData[regime] && irrData[regime][idx] 
                        ? `${(irrData[regime][idx] * 100).toFixed(2)}%` 
                        : 'N/A'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Explanation */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Comprendre le TRI</h3>
        <p className="text-sm text-gray-600 mb-2">
          Le Taux de Rentabilité Interne (TRI) est un indicateur financier qui mesure la performance d'un investissement.
          Il représente le taux d'actualisation qui annule la valeur actuelle nette des flux financiers.
        </p>
        <p className="text-sm text-gray-600 mb-2">
          <strong>Comment interpréter le TRI :</strong>
        </p>
        <ul className="list-disc pl-5 text-sm text-gray-600 mb-2">
          <li>Plus le TRI est élevé, plus l'investissement est rentable</li>
          <li>Un TRI supérieur au taux d'emprunt indique généralement un investissement rentable</li>
          <li>Le TRI prend en compte tous les flux financiers : investissement initial, revenus locatifs, impôts, et prix de revente</li>
        </ul>
        <p className="text-sm text-gray-600">
          Notre calcul tient compte des spécificités fiscales de chaque régime, des frais d'agence à la revente, ainsi que des éventuelles pénalités de remboursement anticipé du prêt.
        </p>
      </div>
    </div>
  );
} 
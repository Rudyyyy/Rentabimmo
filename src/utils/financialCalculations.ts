/**
 * Calculates the Internal Rate of Return (IRR) for an investment based on cash flows
 * Uses Newton-Raphson method to find the root of the NPV = 0 equation
 * 
 * @param cashFlows Array of cash flows, where the first element is typically the initial investment (negative)
 * @param guess Initial estimate of IRR
 * @param tolerance Tolerance for convergence
 * @param maxIterations Maximum number of iterations
 * @returns The IRR as a decimal (e.g. 0.08 for 8%)
 */
export function calculateIRR(
  cashFlows: number[],
  guess: number = 0.1,
  tolerance: number = 1e-7,
  maxIterations: number = 100
): number {
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
  }
  
  // If no solution is found after the maximum number of iterations
  // Return the best approximation
  return rate;
}

/**
 * Calculates the Net Present Value (NPV) for a series of cash flows at a given rate
 * 
 * @param cashFlows Array of cash flows
 * @param rate Discount rate
 * @returns The NPV
 */
function calculateNPV(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((npv, cf, t) => npv + cf / Math.pow(1 + rate, t), 0);
}

/**
 * Calculates the derivative of NPV with respect to the rate
 * 
 * @param cashFlows Array of cash flows
 * @param rate Discount rate
 * @returns The derivative of NPV
 */
function calculateNPVDerivative(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((npv, cf, t) => {
    if (t === 0) return npv; // The derivative of the t=0 term is zero
    return npv - (t * cf) / Math.pow(1 + rate, t + 1);
  }, 0);
} 
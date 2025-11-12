import { Investment, TaxRegime } from '../types/investment';
import { calculateAllTaxRegimes } from './taxCalculations';

/**
 * Calcule le Taux de Rentabilité Interne (TRI) d'un investissement immobilier
 * en cas de revente à une année donnée
 * 
 * @param investment Objet contenant les données de l'investissement
 * @param sellingYear Année de revente pour le calcul
 * @param saleBalance Solde obtenu en cas de vente
 * @param regime Régime fiscal à utiliser pour les calculs
 * @returns Le TRI exprimé en pourcentage
 */
export function calculateIRR(
  investment: Investment,
  sellingYear: number,
  saleBalance: number,
  regime: TaxRegime
): number {
  // Récupérer l'année de début de l'investissement
  const startYear = new Date(investment.projectStartDate).getFullYear();
  
  // Calculer la durée de l'investissement en années
  const investmentDuration = sellingYear - startYear;
  
  if (investmentDuration <= 0) {
    return 0; // Retourner 0 si la durée est négative ou nulle
  }
  
  // 1. Calculer l'investissement initial (flux négatif à l'année 0)
  const initialInvestment = -(
    Number(investment.purchasePrice || 0) +
    Number(investment.agencyFees || 0) +
    Number(investment.notaryFees || 0) +
    Number(investment.bankFees || 0) +
    Number(investment.bankGuaranteeFees || 0) +
    Number(investment.mandatoryDiagnostics || 0) +
    Number(investment.renovationCosts || 0) - 
    Number(investment.loanAmount || 0) // Soustraire le montant du prêt car c'est un flux positif
  );
  
  // 2. Créer un tableau de flux de trésorerie pour chaque année
  // Le premier élément est l'investissement initial
  const cashFlows = [initialInvestment];
  
  // 3. Ajouter les flux intermédiaires pour chaque année jusqu'à la vente
  for (let year = startYear; year < sellingYear; year++) {
    // Récupérer les résultats fiscaux pour l'année en cours
    const yearResults = calculateAllTaxRegimes(investment, year);
    
    // Récupérer les charges financières (remboursement du prêt) pour l'année
    const yearExpense = investment.expenses.find(e => e.year === year);
    
    // Calculer le flux net pour l'année = revenu net - remboursement du prêt
    let yearlyPayment = 0;
    if (yearExpense) {
      yearlyPayment = (yearExpense.loanPayment || 0) + (yearExpense.loanInsurance || 0);
    }
    
    // Calcul du cash flow annuel = revenu net après impôts - remboursement du prêt
    const yearlyNetIncome = yearResults[regime].netIncome;
    const yearlyNetCashFlow = yearlyNetIncome - yearlyPayment;
    
    // Ajouter le flux de trésorerie au tableau
    cashFlows.push(yearlyNetCashFlow);
  }
  
  // 4. Ajouter le flux final (solde après vente) à la dernière année
  cashFlows.push(saleBalance);
  
  // 5. Calculer le TRI en utilisant la méthode de Newton-Raphson
  return calculateIRRFromCashFlows(cashFlows) * 100; // Convertir en pourcentage
}

/**
 * Calcule le TRI à partir d'une série de flux de trésorerie
 * Utilise la méthode de Newton-Raphson pour trouver la racine de l'équation NPV = 0
 * 
 * @param cashFlows Tableau des flux de trésorerie, où le premier élément est l'investissement initial (négatif)
 * @param guess Estimation initiale du TRI
 * @param tolerance Tolérance pour la convergence
 * @param maxIterations Nombre maximum d'itérations
 * @returns Le TRI en décimal (ex: 0.08 pour 8%)
 */
export function calculateIRRFromCashFlows(
  cashFlows: number[],
  guess: number = 0.1,
  tolerance: number = 1e-7,
  maxIterations: number = 100
): number {
  // Validation des entrées
  if (!cashFlows || cashFlows.length < 2) {
    console.error('IRR calculation requires at least 2 cash flows');
    return 0;
  }
  
  // Vérifier que tous les flux sont des nombres valides
  if (cashFlows.some(cf => !isFinite(cf))) {
    console.error('IRR calculation requires all cash flows to be finite numbers');
    return 0;
  }
  
  // Vérifier qu'il y a au moins un flux positif et un flux négatif
  const hasPositive = cashFlows.some(cf => cf > 0);
  const hasNegative = cashFlows.some(cf => cf < 0);
  
  if (!hasPositive || !hasNegative) {
    console.error('IRR calculation requires both positive and negative cash flows');
    return 0;
  }
  
  let rate = guess;
  
  for (let i = 0; i < maxIterations; i++) {
    const npv = calculateNPV(cashFlows, rate);
    
    // Vérifier que la NPV est un nombre valide
    if (!isFinite(npv)) {
      console.error('NPV calculation resulted in non-finite value');
      return 0;
    }
    
    if (Math.abs(npv) < tolerance) {
      return rate; // Convergence atteinte
    }
    
    const derivative = calculateNPVDerivative(cashFlows, rate);
    
    // Vérifier que la dérivée est valide
    if (!isFinite(derivative) || Math.abs(derivative) < 1e-10) {
      // Dérivée trop petite ou invalide, essayer avec un autre guess
      rate = guess * 2;
      continue;
    }
    
    // Méthode de Newton-Raphson: r_n+1 = r_n - f(r_n) / f'(r_n)
    const newRate = rate - npv / derivative;
    
    // Vérifier que le nouveau taux est valide
    if (!isFinite(newRate)) {
      console.error('New rate calculation resulted in non-finite value');
      return 0;
    }
    
    // Limiter le taux à des valeurs raisonnables
    if (newRate > 10 || newRate < -0.99) {
      // Taux trop extrême, réinitialiser avec un guess différent
      rate = guess / 2;
      continue;
    }
    
    // Vérifier la convergence
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }
    
    rate = newRate;
  }
  
  // Si aucune solution n'est trouvée après le nombre maximum d'itérations
  // Vérifier que le rate final est valide avant de le retourner
  if (!isFinite(rate)) {
    console.warn('IRR calculation did not converge to a finite value');
    return 0;
  }
  
  return rate;
}

/**
 * Calcule la Valeur Actuelle Nette (VAN) pour une série de flux et un taux donné
 * 
 * @param cashFlows Tableau des flux de trésorerie
 * @param rate Taux d'actualisation
 * @returns La VAN
 */
function calculateNPV(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((npv, cf, t) => npv + cf / Math.pow(1 + rate, t), 0);
}

/**
 * Calcule la dérivée de la VAN par rapport au taux
 * 
 * @param cashFlows Tableau des flux de trésorerie
 * @param rate Taux d'actualisation
 * @returns La dérivée de la VAN
 */
function calculateNPVDerivative(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((npv, cf, t) => {
    if (t === 0) return npv; // La dérivée du terme t=0 est nulle
    return npv - (t * cf) / Math.pow(1 + rate, t + 1);
  }, 0);
}

/**
 * Calcule le TRI pour tous les régimes fiscaux et pour chaque année possible de revente
 * 
 * @param investment Objet contenant les données de l'investissement
 * @param calculateBalanceFunction Fonction pour calculer le solde après vente
 * @returns Un tableau contenant le TRI pour chaque régime et chaque année
 */
export function calculateAllIRRs(
  investment: Investment,
  calculateBalanceFunction: (index: number, regime: TaxRegime) => number
): {
  years: number[];
  irrs: Record<TaxRegime, number[]>;
} {
  // Récupérer les années du projet
  const startYear = new Date(investment.projectStartDate).getFullYear();
  const endYear = new Date(investment.projectEndDate).getFullYear();
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  
  // Définir les régimes fiscaux
  const regimes: TaxRegime[] = ['micro-foncier', 'reel-foncier', 'micro-bic', 'reel-bic'];
  
  // Initialiser l'objet de résultats
  const irrs: Record<TaxRegime, number[]> = {
    'micro-foncier': [],
    'reel-foncier': [],
    'micro-bic': [],
    'reel-bic': []
  };
  
  // Calculer le TRI pour chaque régime et chaque année
  regimes.forEach(regime => {
    irrs[regime] = years.map((year, index) => {
      // Calculer le solde après vente pour cette année et ce régime
      const saleBalance = calculateBalanceFunction(index, regime);
      
      // Calculer le TRI
      return calculateIRR(investment, year, saleBalance, regime);
    });
  });
  
  return {
    years,
    irrs
  };
} 
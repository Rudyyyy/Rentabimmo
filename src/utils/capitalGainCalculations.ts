import { Investment, TaxRegime, CapitalGainResults } from '../types/investment';

/**
 * Calcule la plus-value immobilière pour une location nue (micro-foncier et réel foncier)
 */
function calculatePropertySaleTax(
  investment: Investment,
  sellingPrice: number,
  regimeType: TaxRegime = 'micro-foncier'
): CapitalGainResults {
  // Prix d'achat initial ajusté
  const purchasePrice = Number(investment.purchasePrice) || 0;
  const acquisitionFees = (Number(investment.notaryFees) || 0) + (Number(investment.agencyFees) || 0);
  const improvementWorks = Number(investment.improvementWorks) || 0;
  
  // Date d'achat et de vente
  const purchaseDate = new Date(investment.projectStartDate);
  const saleDate = new Date(investment.projectEndDate);
  
  // Durée de détention en années
  const holdingPeriodYears = saleDate.getFullYear() - purchaseDate.getFullYear();
  
  // 1. Calcul du prix d'acquisition corrigé
  const correctedPurchasePrice = purchasePrice + acquisitionFees + improvementWorks;
  
  // 2. Calcul de la plus-value brute
  const grossCapitalGain = sellingPrice - correctedPurchasePrice;
  
  if (grossCapitalGain <= 0) {
    return {
      regime: regimeType,
      grossCapitalGain: 0,
      taxableCapitalGainIR: 0,
      taxableCapitalGainSocial: 0,
      incomeTax: 0,
      socialCharges: 0,
      totalTax: 0,
      netCapitalGain: grossCapitalGain
    };
  }
  
  // 3. Calcul des abattements pour durée de détention (IR)
  let irDiscount = 0;
  if (holdingPeriodYears > 5) {
    // 6% par an de la 6e à la 21e année
    if (holdingPeriodYears <= 21) {
      irDiscount = Math.min(1, (holdingPeriodYears - 5) * 0.06);
    } else {
      // 4% pour la 22e année (exonération totale au bout de 22 ans)
      irDiscount = 1; // 100% d'abattement = exonération
    }
  }
  
  // 4. Calcul des abattements pour durée de détention (prélèvements sociaux)
  let socialDiscount = 0;
  if (holdingPeriodYears > 5) {
    // 1.65% par an de la 6e à la 21e année
    if (holdingPeriodYears <= 21) {
      socialDiscount = (holdingPeriodYears - 5) * 0.0165;
    } else if (holdingPeriodYears <= 30) {
      // 1.6% pour la 22e année
      // 9% par an de la 23e à la 30e année
      socialDiscount = (16 * 0.0165) + 0.016 + Math.min(8, holdingPeriodYears - 22) * 0.09;
    } else {
      // Exonération totale au bout de 30 ans
      socialDiscount = 1; // 100% d'abattement = exonération
    }
  }
  
  // 5. Calcul des plus-values imposables
  const taxableCapitalGainIR = grossCapitalGain * (1 - irDiscount);
  const taxableCapitalGainSocial = grossCapitalGain * (1 - socialDiscount);
  
  // 6. Calcul des impositions
  const incomeTax = taxableCapitalGainIR * 0.19; // 19% d'IR
  const socialCharges = taxableCapitalGainSocial * 0.172; // 17.2% de prélèvements sociaux
  const totalTax = incomeTax + socialCharges;
  
  // 7. Calcul de la plus-value nette
  const netCapitalGain = grossCapitalGain - totalTax;
  
  return {
    regime: regimeType,
    grossCapitalGain,
    taxableCapitalGainIR,
    taxableCapitalGainSocial,
    incomeTax,
    socialCharges,
    totalTax,
    netCapitalGain
  };
}

/**
 * Calcule la plus-value immobilière pour une location meublée (LMNP/LMP - micro-BIC et réel BIC)
 */
function calculateFurnishedPropertySaleTax(
  investment: Investment,
  sellingPrice: number,
  regimeType: 'micro-bic' | 'reel-bic'
): CapitalGainResults {
  // Prix d'achat initial ajusté
  const purchasePrice = Number(investment.purchasePrice) || 0;
  const acquisitionFees = (Number(investment.notaryFees) || 0) + (Number(investment.agencyFees) || 0);
  
  // Date d'achat et de vente
  const purchaseDate = new Date(investment.projectStartDate);
  const saleDate = new Date(investment.projectEndDate);
  
  // Durée de détention en années
  const holdingPeriodYears = saleDate.getFullYear() - purchaseDate.getFullYear();
  
  // Variables spécifiques au Meublé
  const isLMP = Boolean(investment.isLMP);
  const accumulatedDepreciation = Number(investment.accumulatedDepreciation) || 0;
  const businessTaxRate = Number(investment.taxParameters.taxRate) || 0;
  
  // 1. Cas du Loueur en Meublé Professionnel (LMP)
  if (isLMP) {
    // Pour les LMP, on est dans le cadre des BIC professionnels
    // Les plus-values sont distinguées entre court terme et long terme
    
    let shortTermGain = 0;
    let longTermGain = 0;
    
    if (holdingPeriodYears <= 2) {
      // Plus-value à court terme (totalité)
      shortTermGain = sellingPrice - purchasePrice - acquisitionFees;
    } else {
      // Plus-value à long terme pour la partie excédant l'amortissement
      const taxableBase = purchasePrice + acquisitionFees - accumulatedDepreciation;
      
      // La partie correspondant aux amortissements est une PV à court terme
      shortTermGain = Math.min(accumulatedDepreciation, sellingPrice - taxableBase);
      
      // Le reste est une PV à long terme
      longTermGain = Math.max(0, sellingPrice - taxableBase - shortTermGain);
    }
    
    // Calcul des taxes
    // Court terme : imposé au barème progressif de l'IR
    const shortTermTax = shortTermGain * (businessTaxRate / 100);
    
    // Long terme : imposé à 12.8% + 17.2% de prélèvements sociaux
    const longTermIncomeTax = longTermGain * 0.128;
    const longTermSocialCharges = longTermGain * 0.172;
    
    const totalTax = shortTermTax + longTermIncomeTax + longTermSocialCharges;
    const netCapitalGain = (shortTermGain + longTermGain) - totalTax;
    
    return {
      regime: regimeType,
      grossCapitalGain: shortTermGain + longTermGain,
      taxableCapitalGainIR: shortTermGain + longTermGain,
      taxableCapitalGainSocial: longTermGain,
      incomeTax: shortTermTax + longTermIncomeTax,
      socialCharges: longTermSocialCharges,
      totalTax,
      netCapitalGain,
      shortTermGain,
      longTermGain,
      shortTermTax,
      longTermIncomeTax,
      longTermSocialCharges
    };
  }
  
  // 2. Cas du Loueur en Meublé Non Professionnel (LMNP)
  // Pour les LMNP, on suit les règles des plus-values immobilières des particuliers
  // SAUF pour la partie correspondant aux amortissements en régime réel
  
  // 2.1 Calcul comme pour une location nue (base)
  const basePropertySaleTax = calculatePropertySaleTax(
    investment,
    sellingPrice,
    regimeType
  );
  
  // 2.2 Pour le régime réel, ajout de la taxation des amortissements
  if (regimeType === 'reel-bic' && accumulatedDepreciation > 0) {
    // Les amortissements sont réintégrés et taxés au barème progressif de l'IR
    const depreciationTaxable = Math.min(
      accumulatedDepreciation,
      basePropertySaleTax.grossCapitalGain
    );
    const depreciationTax = depreciationTaxable * (businessTaxRate / 100);
    
    return {
      ...basePropertySaleTax,
      depreciationTaxable,
      depreciationTax,
      totalTax: basePropertySaleTax.totalTax + depreciationTax,
      netCapitalGain: basePropertySaleTax.netCapitalGain - depreciationTax
    };
  }
  
  return basePropertySaleTax;
}

/**
 * Calcule la plus-value immobilière pour tous les régimes fiscaux
 */
export function calculateAllCapitalGainRegimes(
  investment: Investment
): Record<TaxRegime, CapitalGainResults> {
  // Calcul du prix de vente en fonction du type d'appréciation
  let sellingPrice = 0;
  
  // S'assurer que toutes les valeurs sont traitées comme des nombres
  const purchasePrice = Number(investment.purchasePrice) || 0;
  const appreciationValue = Number(investment.appreciationValue) || 0;
  const saleAgencyFees = Number(investment.saleAgencyFees) || 0;
  
  if (investment.appreciationType === 'amount') {
    // Le montant de vente est directement spécifié
    sellingPrice = appreciationValue;
  } else {
    // Date d'achat et de vente
    const purchaseDate = new Date(investment.projectStartDate);
    const saleDate = new Date(investment.projectEndDate);
    
    // Nombre d'années entre l'achat et la vente
    const years = saleDate.getFullYear() - purchaseDate.getFullYear();
    
    if (investment.appreciationType === 'global') {
      // Pourcentage global sur toute la période
      sellingPrice = purchasePrice * (1 + appreciationValue / 100);
    } else if (investment.appreciationType === 'annual') {
      // Pourcentage annuel composé
      sellingPrice = purchasePrice * Math.pow(1 + appreciationValue / 100, years);
    }
  }
  
  // Déduction des frais d'agence sur la vente
  const netSellingPrice = sellingPrice - saleAgencyFees;
  
  // Calcul pour chaque régime
  const microFoncier = calculatePropertySaleTax(investment, netSellingPrice, 'micro-foncier');
  const reelFoncier = calculatePropertySaleTax(investment, netSellingPrice, 'reel-foncier');
  const microBic = calculateFurnishedPropertySaleTax(investment, netSellingPrice, 'micro-bic');
  const reelBic = calculateFurnishedPropertySaleTax(investment, netSellingPrice, 'reel-bic');
  
  return {
    'micro-foncier': microFoncier,
    'reel-foncier': reelFoncier,
    'micro-bic': microBic,
    'reel-bic': reelBic
  };
} 
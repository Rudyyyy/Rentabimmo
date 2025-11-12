/**
 * Types pour la gestion des SCI (Société Civile Immobilière) à l'IS
 * 
 * Une SCI à l'IS regroupe plusieurs biens immobiliers et les résultats fiscaux
 * sont calculés de manière consolidée au niveau de la SCI, puis répartis par
 * prorata sur chaque bien.
 */

export type RentalType = 'unfurnished' | 'furnished';

export interface SCI {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at?: string;
  
  // Informations juridiques de la SCI
  siret?: string;
  dateCreation: string;
  formeJuridique: 'SCI';
  capital: number;
  
  // Paramètres fiscaux IS
  taxParameters: SCITaxParameters;
  
  // IDs des biens appartenant à cette SCI
  propertyIds: string[];
  
  // Résultats fiscaux consolidés par année
  consolidatedTaxResults?: Record<number, SCITaxResults>;
  
  // Description optionnelle
  description?: string;
}

export interface SCITaxParameters {
  // Taux IS
  standardRate: number; // 25% (taux normal IS)
  reducedRate: number; // 15% (taux réduit pour PME)
  reducedRateThreshold: number; // 42 500€ (seuil du taux réduit)
  
  // Déficits reportables
  previousDeficits: number; // Déficits des années antérieures (reportables sans limite de temps)
  
  // Amortissements (durées en années)
  buildingAmortizationYears: number; // 25-30 ans généralement
  furnitureAmortizationYears: number; // 5-10 ans
  worksAmortizationYears: number; // 10-15 ans
  
  // Charges de fonctionnement de la SCI (annuelles)
  operatingExpenses: number; // Frais de comptabilité, frais bancaires, AGM, etc.
  accountingFees: number; // Honoraires du comptable
  legalFees: number; // Frais juridiques et administratifs
  bankFees: number; // Frais bancaires de la SCI
  insuranceFees: number; // Assurance de la SCI (responsabilité civile, etc.)
  otherExpenses: number; // Autres charges de fonctionnement
  
  // Taux de prélèvement à la source de l'IS (optionnel)
  advancePaymentRate?: number; // Acomptes d'IS (généralement 4 acomptes trimestriels)
  
  // Type de location pour tous les biens de la SCI
  rentalType: RentalType; // 'unfurnished' (nu) ou 'furnished' (meublé)
}

export interface SCITaxResults {
  year: number;
  
  // Résultats consolidés de tous les biens
  totalRevenues: number; // Total des loyers de tous les biens
  totalDeductibleExpenses: number; // Total des charges déductibles
  totalAmortization: number; // Total des amortissements
  
  // Résultat fiscal
  resultBeforeDeficit: number; // Résultat avant imputation des déficits
  taxableIncome: number; // Résultat imposable après imputation des déficits (peut être 0 si déficitaire)
  
  // Gestion des déficits
  deficitUsed: number; // Déficit des années antérieures utilisé cette année
  deficitGenerated: number; // Déficit généré cette année (si résultat négatif)
  deficitCarriedForward: number; // Déficit reportable aux années futures
  
  // Calcul de l'IS avec barème progressif
  isAtReducedRate: number; // Montant d'IS au taux réduit (15%)
  isAtStandardRate: number; // Montant d'IS au taux normal (25%)
  totalIS: number; // Total de l'IS à payer
  
  // Répartition par bien (pour le prorata)
  propertyContributions: Record<string, PropertyContribution>;
}

export interface PropertyContribution {
  propertyId: string;
  propertyName: string;
  
  // Contribution aux revenus/charges consolidés
  revenues: number; // Loyers du bien
  expenses: number; // Charges du bien
  amortization: number; // Amortissements du bien
  
  // Part dans le résultat global
  contributionToResult: number; // Contribution au résultat (peut être négatif)
  
  // Prorata de l'IS
  // Calcul : (valeur du bien / valeur totale des biens de la SCI) * IS total
  propertyValue: number; // Valeur du bien (pour calcul du prorata)
  prorataWeight: number; // Poids du bien dans la SCI (0-1)
  allocatedIS: number; // IS alloué à ce bien (prorata)
}

// Paramètres par défaut pour une nouvelle SCI
export const defaultSCITaxParameters: SCITaxParameters = {
  standardRate: 25, // Taux IS normal
  reducedRate: 15, // Taux IS réduit
  reducedRateThreshold: 42500, // Seuil pour bénéficier du taux réduit
  previousDeficits: 0,
  buildingAmortizationYears: 25,
  furnitureAmortizationYears: 10,
  worksAmortizationYears: 10,
  operatingExpenses: 0,
  accountingFees: 0,
  legalFees: 0,
  bankFees: 0,
  insuranceFees: 0,
  otherExpenses: 0,
  advancePaymentRate: 0,
  rentalType: 'unfurnished' // Par défaut : location nue
};

// SCI par défaut pour la création
export const defaultSCI: Omit<SCI, 'id' | 'user_id' | 'created_at'> = {
  name: '',
  siret: '',
  dateCreation: new Date().toISOString().split('T')[0],
  formeJuridique: 'SCI',
  capital: 1000, // Capital minimum souvent de 1€ symbolique, mais on met 1000€ par défaut
  taxParameters: defaultSCITaxParameters,
  propertyIds: [],
  consolidatedTaxResults: {},
  description: ''
};


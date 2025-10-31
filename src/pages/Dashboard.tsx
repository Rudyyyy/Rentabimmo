import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../types/supabase';
import { Investment, TaxRegime } from '../types/investment';
import { calculateAllTaxRegimes } from '../utils/taxCalculations';
import { generateAmortizationSchedule } from '../utils/calculations';
import { useLocation } from 'react-router-dom';
import QuickPropertyForm from '../components/QuickPropertyForm';
import TotalGainGoal from '../components/TotalGainGoal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type Property = Database['public']['Tables']['properties']['Row'];

interface CashFlowData {
  year: number;
  month: number;
  cashFlow: number;
  propertyName: string;
}

export default function Dashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [showInDashboard, setShowInDashboard] = useState<Record<string, boolean>>(() => {
    const savedPreferences = localStorage.getItem('dashboardPreferences');
    return savedPreferences ? JSON.parse(savedPreferences) : {};
  });
  const [propertyOrder, setPropertyOrder] = useState<string[]>(() => {
    const savedOrder = localStorage.getItem('propertyOrder');
    return savedOrder ? JSON.parse(savedOrder) : [];
  });
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [totalGainGoal, setTotalGainGoal] = useState<number>(() => {
    const savedGoal = localStorage.getItem('totalGainGoal');
    return savedGoal ? parseFloat(savedGoal) : 0;
  });
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const location = useLocation();

  // Sauvegarder les préférences dans le localStorage quand elles changent
  useEffect(() => {
    localStorage.setItem('dashboardPreferences', JSON.stringify(showInDashboard));
  }, [showInDashboard]);

  // Sauvegarder l'ordre des propriétés
  useEffect(() => {
    localStorage.setItem('propertyOrder', JSON.stringify(propertyOrder));
  }, [propertyOrder]);

  // Ajouter un useEffect pour sauvegarder l'objectif
  useEffect(() => {
    localStorage.setItem('totalGainGoal', totalGainGoal.toString());
  }, [totalGainGoal]);

  useEffect(() => {
    // Load properties on mount and navigation
    if (user) {
      loadProperties();
      console.log("Loading properties - path or user changed", location.pathname);
    }
  }, [location.pathname, user]);

  // Add a new useEffect to catch navigation events
  useEffect(() => {
    // This will run when the component mounts
    if (user) {
      console.log("Dashboard mounted - loading properties");
    loadProperties();
    }
    
    // This will run when the component unmounts
    return () => {
      console.log("Dashboard unmounting");
    };
  }, []);

  useEffect(() => {
    calculateCashFlowData();
  }, [properties, showInDashboard]);

  // Calculer les années disponibles depuis tous les biens inclus
  // Utilise targetSaleYear si défini, sinon projectEndDate
  const getAllYears = (): number[] => {
    const allYears = new Set<number>();
    properties.forEach(property => {
      if (!showInDashboard[property.id]) return;
      const investment = property.investment_data as unknown as Investment;
      if (!investment || typeof investment !== 'object') return;
      
      const startYear = new Date(investment.projectStartDate).getFullYear();
      // Utiliser targetSaleYear si défini, sinon projectEndDate
      const endYear = investment.targetSaleYear || new Date(investment.projectEndDate).getFullYear();
      
      for (let year = startYear; year <= endYear; year++) {
        allYears.add(year);
      }
    });
    
    return Array.from(allYears).sort();
  };

  async function loadProperties() {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        console.error("Erreur: Utilisateur non authentifié");
        throw new Error('User not authenticated');
      }

      console.log("🔍 Chargement des biens pour l'utilisateur:", user.id);

      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error("❌ Erreur lors du chargement des biens:", fetchError);
        throw fetchError;
      }
      
      const properties = data || [];
      console.log(`✅ ${properties.length} biens chargés:`, properties.map(p => ({ id: p.id, name: p.name })));
      
      setProperties(properties);
      
      // Initialiser les préférences et l'ordre pour les nouveaux biens
      if (properties.length > 0) {
        // Mettre à jour les préférences
        setShowInDashboard(prev => {
          const newPreferences = { ...prev };
          properties.forEach(property => {
            if (!(property.id in newPreferences)) {
              newPreferences[property.id] = true;
            }
          });
          return newPreferences;
        });

        // Mettre à jour l'ordre des propriétés
        setPropertyOrder(prev => {
          // Garder l'ordre existant pour les propriétés qui existent toujours
          const existingIds = new Set(properties.map(p => p.id));
          const filteredPrev = prev.filter(id => existingIds.has(id));
          
          // Ajouter les nouvelles propriétés à la fin
          const newIds = properties
            .map(p => p.id)
            .filter(id => !filteredPrev.includes(id));
          
          return [...filteredPrev, ...newIds];
        });
      }
    } catch (err) {
      console.error('Error loading properties:', err);
      setError(err instanceof Error ? err.message : 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  }

  function calculateCashFlowData() {
    const allCashFlows: CashFlowData[] = [];
    const currentDate = new Date();

    properties.forEach(property => {
      // Ne calculer que pour les biens affichés dans le dashboard
      if (!showInDashboard[property.id]) return;

      const investment = property.investment_data as unknown as Investment;
      if (!investment || typeof investment !== 'object' || !Array.isArray(investment.expenses)) return;
      
      investment.expenses.forEach(expense => {
        // Pour chaque mois de l'année
        for (let month = 0; month < 12; month++) {
          const totalRevenue = (Number(expense.rent || 0) + Number(expense.tenantCharges || 0)) / 12;
          const totalExpenses = (
            Number(expense.propertyTax || 0) +
            Number(expense.condoFees || 0) +
            Number(expense.propertyInsurance || 0) +
            Number(expense.managementFees || 0) +
            Number(expense.unpaidRentInsurance || 0) +
            Number(expense.repairs || 0) +
            Number(expense.otherDeductible || 0) +
            Number(expense.otherNonDeductible || 0) +
            Number(expense.loanPayment || 0) +
            Number(expense.loanInsurance || 0) +
            Number(expense.tax || 0)
          ) / 12;

          allCashFlows.push({
            year: expense.year,
            month,
            cashFlow: totalRevenue - totalExpenses,
            propertyName: property.name
          });
        }
      });
    });

    setCashFlowData(allCashFlows);
  }

  // Calcul des cash-flows pour différentes périodes
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const nextMonth = (currentMonth + 1) % 12;
  const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;

  const currentMonthCashFlow = cashFlowData
    .filter(d => d.year === currentYear && d.month === currentMonth)
    .reduce((sum, d) => sum + d.cashFlow, 0);

  const nextMonthCashFlow = cashFlowData
    .filter(d => d.year === nextMonthYear && d.month === nextMonth)
    .reduce((sum, d) => sum + d.cashFlow, 0);

  const currentYearCashFlow = cashFlowData
    .filter(d => d.year === currentYear)
    .reduce((sum, d) => sum + d.cashFlow, 0);

  const nextYearCashFlow = cashFlowData
    .filter(d => d.year === currentYear + 1)
    .reduce((sum, d) => sum + d.cashFlow, 0);

  // Préparation des données du graphique - Barres empilées par bien et courbe total
  const years = getAllYears();
  const includedProperties = properties.filter(property => showInDashboard[property.id]);
  
  // Couleurs pour chaque bien
  const propertyColors = [
    { bar: 'rgba(59, 130, 246, 0.7)', border: 'rgba(59, 130, 246, 1)' },   // blue
    { bar: 'rgba(16, 185, 129, 0.7)', border: 'rgba(16, 185, 129, 1)' },   // green
    { bar: 'rgba(239, 68, 68, 0.7)', border: 'rgba(239, 68, 68, 1)' },   // red
    { bar: 'rgba(245, 158, 11, 0.7)', border: 'rgba(245, 158, 11, 1)' }, // yellow
    { bar: 'rgba(168, 85, 247, 0.7)', border: 'rgba(168, 85, 247, 1)' }   // purple
  ];
  
  const chartData = {
    labels: years.map(y => y.toString()),
    datasets: [
      // Barres empilées pour chaque bien - Gain total cumulé
      ...includedProperties.map((property, index) => {
        const colors = propertyColors[index % propertyColors.length];
        return {
          type: 'bar' as const,
        label: property.name,
          data: years.map(year => {
            const comps = calculateTotalGainComponentsForYear(property, year);
            return comps.totalGain;
          }),
          backgroundColor: colors.bar,
          borderColor: colors.border,
          borderWidth: 1,
          stack: 'stack1',
          order: 2
        };
      }),
      // Courbe pour le total cumulé (tous les biens)
      {
        type: 'line' as const,
        label: 'Total',
        data: years.map(year =>
          includedProperties.reduce((sum, property) => {
            const comps = calculateTotalGainComponentsForYear(property, year);
            return sum + comps.totalGain;
          }, 0)
        ),
        borderColor: 'rgb(37, 99, 235)', // blue-600
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false,
        tension: 0.1,
        yAxisID: 'y',
        order: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 8
        }
      },
      title: {
        display: true,
        text: 'Gain total cumulé par bien'
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${new Intl.NumberFormat('fr-FR', { 
              style: 'currency', 
              currency: 'EUR' 
            }).format(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        stacked: true, // Stacking pour les barres empilées
        ticks: {
          callback: function(value: any) {
            return new Intl.NumberFormat('fr-FR', { 
              style: 'currency', 
              currency: 'EUR',
              maximumFractionDigits: 0
            }).format(value);
          }
        },
        title: {
          display: true,
          text: 'Euros (€)'
        }
      },
      x: {
        stacked: true,
        title: {
          display: true,
          text: 'Année'
        }
      }
    },
    interaction: {
      mode: 'index' as const,
      intersect: false
    }
  };

  // Fonction pour calculer l'impôt sur la plus-value pour une année de vente donnée
  function calculateCapitalGainTaxForYear(
    investment: Investment,
    sellingYear: number,
    sellingPrice: number,
    regime: TaxRegime
  ): number {
    const purchasePrice = Number(investment.purchasePrice) || 0;
    const acquisitionFees = (Number(investment.notaryFees) || 0) + (Number(investment.agencyFees) || 0);
    const improvementWorks = Number(investment.improvementWorks) || 0;
    
    const purchaseDate = new Date(investment.projectStartDate);
    const holdingPeriodYears = sellingYear - purchaseDate.getFullYear();
    
    const correctedPurchasePrice = purchasePrice + acquisitionFees + improvementWorks;
    const grossCapitalGain = sellingPrice - correctedPurchasePrice;
    
    if (grossCapitalGain <= 0) {
      return 0;
    }
    
    // Calcul des abattements pour durée de détention (IR)
    let irDiscount = 0;
    if (holdingPeriodYears > 5) {
      if (holdingPeriodYears <= 21) {
        irDiscount = Math.min(1, (holdingPeriodYears - 5) * 0.06);
      } else {
        irDiscount = 1;
      }
    }
    
    // Calcul des abattements pour durée de détention (prélèvements sociaux)
    let socialDiscount = 0;
    if (holdingPeriodYears > 5) {
      if (holdingPeriodYears <= 21) {
        socialDiscount = (holdingPeriodYears - 5) * 0.0165;
      } else if (holdingPeriodYears <= 30) {
        socialDiscount = (16 * 0.0165) + 0.016 + Math.min(8, holdingPeriodYears - 22) * 0.09;
      } else {
        socialDiscount = 1;
      }
    }
    
    const taxableCapitalGainIR = grossCapitalGain * (1 - irDiscount);
    const taxableCapitalGainSocial = grossCapitalGain * (1 - socialDiscount);
    
    let incomeTax = taxableCapitalGainIR * 0.19;
    let socialCharges = taxableCapitalGainSocial * 0.172;
    
    // Pour les régimes LMNP (meublé), traitement spécial
    if (regime === 'micro-bic' || regime === 'reel-bic') {
      const isLMP = investment.isLMP || false;
      const businessTaxRate = Number(investment.taxParameters?.taxRate) || 30;
      const accumulatedDepreciation = Number(investment.accumulatedDepreciation) || 0;
      
      if (isLMP) {
        if (holdingPeriodYears <= 2) {
          return grossCapitalGain * (businessTaxRate / 100);
        } else {
          const shortTermGain = Math.min(accumulatedDepreciation, grossCapitalGain);
          const longTermGain = Math.max(0, grossCapitalGain - shortTermGain);
          const shortTermTax = shortTermGain * (businessTaxRate / 100);
          const longTermIncomeTax = longTermGain * 0.128;
          const longTermSocialCharges = longTermGain * 0.172;
          return shortTermTax + longTermIncomeTax + longTermSocialCharges;
        }
      } else {
        if (regime === 'reel-bic' && accumulatedDepreciation > 0) {
          const depreciationTaxable = Math.min(accumulatedDepreciation, grossCapitalGain);
          const depreciationTax = depreciationTaxable * (businessTaxRate / 100);
          return incomeTax + socialCharges + depreciationTax;
        }
      }
    }
    
    return incomeTax + socialCharges;
  }

  // Fonction pour calculer les composants du gain total cumulé pour un bien et une année donnée
  function calculateTotalGainComponentsForYear(property: Property, year: number): {
    downPayment: number;
    cumulativeCashFlowBeforeTax: number;
    cumulativeTax: number;
    saleBalance: number;
    capitalGainTax: number;
    totalGain: number;
  } {
    const investment = property.investment_data as unknown as Investment;
    if (!investment || typeof investment !== 'object') {
      return {
        downPayment: 0,
        cumulativeCashFlowBeforeTax: 0,
        cumulativeTax: 0,
        saleBalance: 0,
        capitalGainTax: 0,
        totalGain: 0
      };
    }
    
    const startYear = new Date(investment.projectStartDate).getFullYear();
    // Utiliser targetSaleYear si défini, sinon projectEndDate
    const endYear = investment.targetSaleYear || new Date(investment.projectEndDate).getFullYear();
    
    if (year < startYear || year > endYear) {
      return {
        downPayment: 0,
        cumulativeCashFlowBeforeTax: 0,
        cumulativeTax: 0,
        saleBalance: 0,
        capitalGainTax: 0,
        totalGain: 0
      };
    }
    
    const regime = investment.selectedRegime || 'micro-foncier';
    
    // Calculer les résultats fiscaux pour toutes les années jusqu'à l'année sélectionnée
    const yearlyResults: Record<number, Record<TaxRegime, any>> = {};
    for (let yr = startYear; yr <= year; yr++) {
      const yearExpense = investment.expenses?.find(e => e.year === yr);
      if (!yearExpense) {
        if (yr === startYear) {
          yearlyResults[yr] = {
            'micro-foncier': { totalTax: 0 },
            'reel-foncier': { totalTax: 0 },
            'micro-bic': { totalTax: 0 },
            'reel-bic': { totalTax: 0 }
          } as Record<TaxRegime, any>;
        } else {
          yearlyResults[yr] = yearlyResults[yr - 1] || {
            'micro-foncier': { totalTax: 0 },
            'reel-foncier': { totalTax: 0 },
            'micro-bic': { totalTax: 0 },
            'reel-bic': { totalTax: 0 }
          } as Record<TaxRegime, any>;
        }
        continue;
      }
      
      if (yr === startYear) {
        yearlyResults[yr] = calculateAllTaxRegimes(investment, yr);
      } else {
        yearlyResults[yr] = calculateAllTaxRegimes(investment, yr, yearlyResults[yr - 1]);
      }
    }
    
    // Calculer le cash flow cumulé avant taxe et le cumul d'impôts
    let cumulativeCashFlowBeforeTax = 0;
    let cumulativeTax = 0;
    let cumulativeCashFlowNet = 0;
    
    for (let yr = startYear; yr <= year; yr++) {
      const yearExpense = investment.expenses?.find(e => e.year === yr);
      if (!yearExpense) continue;
      
      const rent = Number(yearExpense.rent || 0);
      const furnishedRent = Number(yearExpense.furnishedRent || 0);
      const tenantCharges = Number(yearExpense.tenantCharges || 0);
      const taxBenefit = Number(yearExpense.taxBenefit || 0);
      
      const revenues = (regime === 'micro-bic' || regime === 'reel-bic')
        ? furnishedRent + tenantCharges
        : rent + taxBenefit + tenantCharges;
      
      const expenses = 
        Number(yearExpense.propertyTax || 0) +
        Number(yearExpense.condoFees || 0) +
        Number(yearExpense.propertyInsurance || 0) +
        Number(yearExpense.managementFees || 0) +
        Number(yearExpense.unpaidRentInsurance || 0) +
        Number(yearExpense.repairs || 0) +
        Number(yearExpense.otherDeductible || 0) +
        Number(yearExpense.otherNonDeductible || 0) +
        Number(yearExpense.loanPayment || 0) +
        Number(yearExpense.loanInsurance || 0);
      
      const annualCashFlowBeforeTax = revenues - expenses;
      const taxation = yearlyResults[yr]?.[regime]?.totalTax || 0;
      cumulativeTax += taxation;
      const annualCashFlowNet = annualCashFlowBeforeTax - taxation;
      
      cumulativeCashFlowBeforeTax += annualCashFlowBeforeTax;
      cumulativeCashFlowNet += annualCashFlowNet;
    }
    
    // Calculer le solde de revente pour l'année sélectionnée
    const investmentId = `${investment.purchasePrice}_${investment.startDate}`;
    const storedParams = localStorage.getItem(`saleParameters_${investmentId}`);
    const saleParams = storedParams ? JSON.parse(storedParams) : {
      annualIncrease: 2,
      agencyFees: 0,
      earlyRepaymentFees: 0
    };
    
    const yearsSincePurchase = year - startYear;
    const revaluedValue = Number(investment.purchasePrice) * Math.pow(1 + (saleParams.annualIncrease / 100), yearsSincePurchase);
    const netSellingPrice = revaluedValue - Number(saleParams.agencyFees);
    
    const amortizationSchedule = generateAmortizationSchedule(
      Number(investment.loanAmount),
      Number(investment.interestRate),
      Number(investment.loanDuration),
      investment.deferralType,
      Number(investment.deferredPeriod),
      investment.startDate
    );
    
    const yearEndDate = new Date(year, 11, 31);
    const lastPayment = amortizationSchedule.schedule
      .filter(row => new Date(row.date) <= yearEndDate)
      .pop();
    
    const remainingBalance = lastPayment ? lastPayment.remainingBalance : Number(investment.loanAmount);
    const totalDebt = remainingBalance + Number(saleParams.earlyRepaymentFees);
    const saleBalance = netSellingPrice - totalDebt;
    
    // Calculer l'impôt sur la plus-value
    const capitalGainTax = calculateCapitalGainTaxForYear(investment, year, netSellingPrice, regime);
    
    // Calculer le gain total cumulé
    const downPayment = Number(investment.downPayment) || 0;
    const totalGain = cumulativeCashFlowNet + saleBalance - capitalGainTax - downPayment;
    
    return {
      downPayment: -downPayment, // Négatif pour l'affichage
      cumulativeCashFlowBeforeTax,
      cumulativeTax: -cumulativeTax, // Négatif pour l'affichage
      saleBalance,
      capitalGainTax: -capitalGainTax, // Négatif pour l'affichage
      totalGain
    };
  }

  // Fonction pour calculer le gain total cumulé pour un bien et une année donnée
  function calculateTotalGainForYear(property: Property, year: number): number {
    const investment = property.investment_data as unknown as Investment;
    if (!investment || typeof investment !== 'object') return 0;
    
    const startYear = new Date(investment.projectStartDate).getFullYear();
    // Utiliser targetSaleYear si défini, sinon projectEndDate
    const endYear = investment.targetSaleYear || new Date(investment.projectEndDate).getFullYear();
    
    if (year < startYear || year > endYear) return 0;
    
    const regime = investment.selectedRegime || 'micro-foncier';
    
    // Calculer les résultats fiscaux pour toutes les années jusqu'à l'année sélectionnée
    const yearlyResults: Record<number, Record<TaxRegime, any>> = {};
    for (let yr = startYear; yr <= year; yr++) {
      const yearExpense = investment.expenses?.find(e => e.year === yr);
      if (!yearExpense) {
        if (yr === startYear) {
          yearlyResults[yr] = {
            'micro-foncier': { totalTax: 0 },
            'reel-foncier': { totalTax: 0 },
            'micro-bic': { totalTax: 0 },
            'reel-bic': { totalTax: 0 }
          } as Record<TaxRegime, any>;
        } else {
          yearlyResults[yr] = yearlyResults[yr - 1] || {
            'micro-foncier': { totalTax: 0 },
            'reel-foncier': { totalTax: 0 },
            'micro-bic': { totalTax: 0 },
            'reel-bic': { totalTax: 0 }
          } as Record<TaxRegime, any>;
        }
        continue;
      }
      
      if (yr === startYear) {
        yearlyResults[yr] = calculateAllTaxRegimes(investment, yr);
      } else {
        yearlyResults[yr] = calculateAllTaxRegimes(investment, yr, yearlyResults[yr - 1]);
      }
    }
    
    // Calculer le cash flow cumulé net jusqu'à l'année sélectionnée
    let cumulativeCashFlowNet = 0;
    
    for (let yr = startYear; yr <= year; yr++) {
      const yearExpense = investment.expenses?.find(e => e.year === yr);
      if (!yearExpense) continue;
      
      const rent = Number(yearExpense.rent || 0);
      const furnishedRent = Number(yearExpense.furnishedRent || 0);
      const tenantCharges = Number(yearExpense.tenantCharges || 0);
      const taxBenefit = Number(yearExpense.taxBenefit || 0);
      
      const revenues = (regime === 'micro-bic' || regime === 'reel-bic')
        ? furnishedRent + tenantCharges
        : rent + taxBenefit + tenantCharges;
      
      const expenses = 
        Number(yearExpense.propertyTax || 0) +
        Number(yearExpense.condoFees || 0) +
        Number(yearExpense.propertyInsurance || 0) +
        Number(yearExpense.managementFees || 0) +
        Number(yearExpense.unpaidRentInsurance || 0) +
        Number(yearExpense.repairs || 0) +
        Number(yearExpense.otherDeductible || 0) +
        Number(yearExpense.otherNonDeductible || 0) +
        Number(yearExpense.loanPayment || 0) +
        Number(yearExpense.loanInsurance || 0);
      
      const annualCashFlowBeforeTax = revenues - expenses;
      const taxation = yearlyResults[yr]?.[regime]?.totalTax || 0;
      const annualCashFlowNet = annualCashFlowBeforeTax - taxation;
      cumulativeCashFlowNet += annualCashFlowNet;
    }
    
    // Calculer le solde de revente pour l'année sélectionnée
    const investmentId = `${investment.purchasePrice}_${investment.startDate}`;
    const storedParams = localStorage.getItem(`saleParameters_${investmentId}`);
    const saleParams = storedParams ? JSON.parse(storedParams) : {
      annualIncrease: 2,
      agencyFees: 0,
      earlyRepaymentFees: 0
    };
    
    const yearsSincePurchase = year - startYear;
    const revaluedValue = Number(investment.purchasePrice) * Math.pow(1 + (saleParams.annualIncrease / 100), yearsSincePurchase);
    const netSellingPrice = revaluedValue - Number(saleParams.agencyFees);
    
    const amortizationSchedule = generateAmortizationSchedule(
      Number(investment.loanAmount),
      Number(investment.interestRate),
      Number(investment.loanDuration),
      investment.deferralType,
      Number(investment.deferredPeriod),
      investment.startDate
    );
    
    const yearEndDate = new Date(year, 11, 31);
    const lastPayment = amortizationSchedule.schedule
      .filter(row => new Date(row.date) <= yearEndDate)
      .pop();
    
    const remainingBalance = lastPayment ? lastPayment.remainingBalance : Number(investment.loanAmount);
    const totalDebt = remainingBalance + Number(saleParams.earlyRepaymentFees);
    const saleBalance = netSellingPrice - totalDebt;
    
    // Calculer l'impôt sur la plus-value
    const capitalGainTax = calculateCapitalGainTaxForYear(investment, year, netSellingPrice, regime);
    
    // Calculer le gain total cumulé
    const downPayment = Number(investment.downPayment) || 0;
    const totalGain = cumulativeCashFlowNet + saleBalance - capitalGainTax - downPayment;
    
    return totalGain;
  }

  // Fonction pour calculer le cash flow annuel pour un bien donné
  function calculateAnnualCashFlow(property: Property, year: number) {
    const investment = property.investment_data as unknown as Investment;
    if (!investment || typeof investment !== 'object') return 0;
    
    const expense = investment.expenses?.find(e => e.year === year);
    if (!expense) return 0;

    // Calcul des revenus selon le régime
    const rent = Number(expense.rent || 0);
    const furnishedRent = Number(expense.furnishedRent || 0);
    const tenantCharges = Number(expense.tenantCharges || 0);
    const taxBenefit = Number(expense.taxBenefit || 0);
    
    const revenues = (investment.selectedRegime === 'micro-bic' || investment.selectedRegime === 'reel-bic')
      ? furnishedRent + tenantCharges // Total meublé
      : rent + taxBenefit + tenantCharges; // Total nu

    // Total des dépenses
    const expenses = 
      Number(expense.propertyTax || 0) +
      Number(expense.condoFees || 0) +
      Number(expense.propertyInsurance || 0) +
      Number(expense.managementFees || 0) +
      Number(expense.unpaidRentInsurance || 0) +
      Number(expense.repairs || 0) +
      Number(expense.otherDeductible || 0) +
      Number(expense.otherNonDeductible || 0) +
      Number(expense.loanPayment || 0) +
      Number(expense.loanInsurance || 0);

    // Calcul de l'imposition
    const yearResults = calculateAllTaxRegimes(investment, year);
    const tax = yearResults[investment.selectedRegime].totalTax;

    // Cash flow
    const cashFlow = revenues - expenses;
    const cashFlowNet = cashFlow - tax;

    return cashFlowNet;
  }

  // Fonction pour obtenir le label du régime fiscal
  function getRegimeLabel(regime: string) {
    const labels: Record<string, string> = {
      'micro-foncier': 'Location nue - Micro-foncier',
      'reel-foncier': 'Location nue - Frais réels',
      'micro-bic': 'LMNP - Micro-BIC',
      'reel-bic': 'LMNP - Frais réels'
    };
    return labels[regime] || regime;
  }

  // Fonction pour formater les montants en euros
  function formatCurrency(value: number) {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value);
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(propertyOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setPropertyOrder(items);
  };

  // Trier les propriétés selon l'ordre sauvegardé
  const sortedProperties = [...properties].sort((a, b) => {
    const indexA = propertyOrder.indexOf(a.id);
    const indexB = propertyOrder.indexOf(b.id);
    return indexA - indexB;
  });

  const handleQuickPropertySave = async (investment: Investment) => {
    try {
      if (!user) return;
      
      // Créer un nouvel investissement dans la base de données
      const { data, error } = await supabase
        .from('properties')
        .insert([
          {
            user_id: user.id,
            name: `Bien ${properties.length + 1}`,
            investment_data: investment
          }
        ])
        .select()
        .single();
      
      if (error) throw error;
      
      // Recharger les propriétés
      await loadProperties();
      
      // Fermer le formulaire rapide
      setShowQuickForm(false);
      
      // Rediriger vers la page de propriété avec la bonne route
      navigate(`/property/${data.id}`);
    } catch (error) {
      console.error('Erreur lors de la création du bien:', error);
      setError('Erreur lors de la création du bien. Veuillez réessayer.');
    }
  };

  const handleDetailedForm = () => {
    setShowQuickForm(false);
    navigate('/property/new');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar avec la liste des biens */}
        <div className="w-110 min-h-screen bg-white border-r border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Mes biens immobiliers</h2>
          </div>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="properties">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="divide-y divide-gray-200"
                >
                  {sortedProperties.map((property, index) => {
                    const investment = property.investment_data as unknown as Investment;
                    if (!investment || typeof investment !== 'object') return null;
                    
                    const currentYearCashFlow = calculateAnnualCashFlow(property, currentYear);
                    
                    return (
                      <Draggable key={property.id} draggableId={property.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`p-4 group hover:bg-gray-50 relative ${
                              snapshot.isDragging ? 'bg-blue-50 shadow-lg' : ''
                            }`}
                          >
                            {/* Drag handle */}
                            <div
                              {...provided.dragHandleProps}
                              className="absolute left-0 top-0 bottom-0 w-8 cursor-move flex items-center justify-center"
                            >
                              <div className="w-1 h-10 bg-gray-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>

                            {/* Bouton de modification */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/property/${property.id}`);
                              }}
                              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Modifier le bien"
                            >
                              <Pencil className="h-4 w-4 text-gray-500" />
                            </button>

                            {/* Contenu principal */}
                            <div className="pl-8 pr-12">
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="text-base font-medium text-gray-900">{property.name}</h3>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowInDashboard(prev => ({ ...prev, [property.id]: !prev[property.id] }));
                                  }}
                                  className={`text-xs px-2 py-0.5 rounded ${
                                    showInDashboard[property.id] 
                                      ? 'bg-green-50 text-green-700' 
                                      : 'bg-gray-100 text-gray-700'
                                  }`}
                                >
                                  {showInDashboard[property.id] ? 'Inclus' : 'Exclu'}
                                </button>
                              </div>
                              {investment.description && (
                                <p className="text-sm text-gray-500 mb-2 line-clamp-2">
                                  {investment.description}
                                </p>
                              )}
                              <div className="text-sm text-gray-600">
                                <p>Régime : {getRegimeLabel(investment.selectedRegime)}</p>
                                <p className={`font-medium ${currentYearCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  Cash flow {currentYear} : {formatCurrency(currentYearCashFlow)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 min-h-screen">
          <header className="bg-white shadow-sm">
            <div className="flex justify-between items-center px-8 py-4">
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">{user?.email}</span>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </header>

          <main className="p-8">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-700">{error}</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="h-[500px]">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    Barres empilées: gain total cumulé de chaque bien (chaque bien avec sa couleur). Courbe: solde global (total de tous les biens).
                  </p>
                </div>

                {/* Total Gain Goal */}
                <TotalGainGoal 
                  totalGainData={years.map(year => ({
                    year,
                    totalGain: includedProperties.reduce((sum, property) => {
                      const comps = calculateTotalGainComponentsForYear(property, year);
                      return sum + comps.totalGain;
                    }, 0)
                  }))}
                  onGoalChange={setTotalGainGoal}
                />

                {/* Tableau de revente */}
                {includedProperties.length > 0 && (() => {
                  // Préparer les données de revente pour chaque bien
                  const saleData = includedProperties.map(property => {
                    const investment = property.investment_data as unknown as Investment;
                    if (!investment || typeof investment !== 'object') return null;
                    
                    // Utiliser targetSaleYear si disponible, sinon projectEndDate
                    const saleYear = investment.targetSaleYear || new Date(investment.projectEndDate).getFullYear();
                    const saleDate = investment.targetSaleYear 
                      ? new Date(saleYear, 11, 31).toISOString().split('T')[0]
                      : investment.projectEndDate;
                    
                    // Calculer le gain total au moment de la vente
                    const comps = calculateTotalGainComponentsForYear(property, saleYear);
                    
                    return {
                      propertyId: property.id,
                      propertyName: property.name,
                      saleDate: saleDate,
                      saleYear: saleYear,
                      totalGain: comps.totalGain
                    };
                  }).filter((item): item is NonNullable<typeof item> => item !== null);
                  
                  // Trier par date de revente (chronologique)
                  saleData.sort((a, b) => {
                    const dateA = new Date(a.saleDate).getTime();
                    const dateB = new Date(b.saleDate).getTime();
                    return dateA - dateB;
                  });
                  
                  // Calculer la somme cumulative
                  let cumulativeTotal = 0;
                  const saleDataWithCumulative = saleData.map(item => {
                    cumulativeTotal += item.totalGain;
                    return {
                      ...item,
                      cumulativeTotal
                    };
                  });
                  
                  return (
                    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
                      <h3 className="text-lg font-semibold mb-4">Tableau de revente</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Bien
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date de revente
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Gain total estimé au moment de la vente
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Somme cumulative
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {saleDataWithCumulative.length > 0 ? (
                              saleDataWithCumulative.map((item, index) => (
                                <tr key={`${item.propertyId}-${index}`} className="hover:bg-gray-50">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {item.propertyName}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {new Date(item.saleDate).toLocaleDateString('fr-FR', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </td>
                                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                                    item.totalGain >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {formatCurrency(item.totalGain)}
                                  </td>
                                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${
                                    item.cumulativeTotal >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {formatCurrency(item.cumulativeTotal)}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                                  Aucune date de revente définie pour les biens sélectionnés
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Bouton d'ajout de bien */}
      <div className="fixed bottom-6 right-24">
        <button
          onClick={() => setShowQuickForm(true)}
          className="bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
      
      {/* Formulaire rapide */}
      {showQuickForm && (
        <QuickPropertyForm
          onClose={() => setShowQuickForm(false)}
          onSave={handleQuickPropertySave}
          onDetailedForm={handleDetailedForm}
        />
      )}
    </div>
  );
}
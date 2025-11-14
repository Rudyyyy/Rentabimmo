import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Settings } from 'lucide-react';
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
import { generateAmortizationSchedule, calculateRevenuesWithVacancy } from '../utils/calculations';
import { useLocation } from 'react-router-dom';
import QuickPropertyForm from '../components/QuickPropertyForm';
import TotalGainGoal from '../components/TotalGainGoal';
import OnboardingTour from '../components/OnboardingTour';
import { SCI } from '../types/sci';
import { getSCIs, createSCI, updateSCI } from '../lib/api';
import SCIForm from '../components/SCIForm';

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
  const [scis, setSCIs] = useState<SCI[]>([]);
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
  const [showSCIForm, setShowSCIForm] = useState(false);
  const [editingSCI, setEditingSCI] = useState<SCI | null>(null);
  
  // Objectifs de gain total par onglet (personal et par SCI)
  const [totalGainGoals, setTotalGainGoals] = useState<{
    personal: number;
    sci: Record<string, number>;
  }>(() => {
    const savedGoals = localStorage.getItem('totalGainGoals');
    if (savedGoals) {
      return JSON.parse(savedGoals);
    }
    
    // Migration : récupérer l'ancien objectif unique s'il existe
    const oldGoal = localStorage.getItem('totalGainGoal');
    if (oldGoal) {
      const migratedGoals = { personal: parseFloat(oldGoal), sci: {} };
      // Sauvegarder la migration et supprimer l'ancien
      localStorage.setItem('totalGainGoals', JSON.stringify(migratedGoals));
      localStorage.removeItem('totalGainGoal');
      return migratedGoals;
    }
    
    return { personal: 0, sci: {} };
  });
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    const completed = localStorage.getItem('onboarding_completed');
    return completed !== 'true';
  });
  const [activeTab, setActiveTab] = useState<{ type: 'personal' } | { type: 'sci', sciId: string }>({ type: 'personal' });
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

  // Sauvegarder les objectifs dans le localStorage quand ils changent
  useEffect(() => {
    localStorage.setItem('totalGainGoals', JSON.stringify(totalGainGoals));
  }, [totalGainGoals]);

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

  // Gérer le changement automatique d'onglet si l'onglet actif n'a plus de biens
  useEffect(() => {
    if (properties.length === 0) return;
    
    // Vérifier si l'onglet actif a des biens
    const hasPropertiesInCurrentTab = properties.some(property => {
      const investment = property.investment_data as unknown as Investment;
      if (activeTab.type === 'personal') {
        return !investment?.sciId;
      } else {
        return investment?.sciId === activeTab.sciId;
      }
    });
    
    // Si l'onglet actif n'a plus de biens, basculer vers un onglet valide
    if (!hasPropertiesInCurrentTab) {
      // Essayer d'abord les biens en nom propre
      if (propertiesWithoutSCI.length > 0) {
        setActiveTab({ type: 'personal' });
      } else if (scis.length > 0) {
        // Sinon basculer vers le premier SCI qui a des biens
        const firstSCIWithProperties = scis.find(sci => 
          properties.some(p => {
            const inv = p.investment_data as unknown as Investment;
            return inv?.sciId === sci.id;
          })
        );
        if (firstSCIWithProperties) {
          setActiveTab({ type: 'sci', sciId: firstSCIWithProperties.id });
        }
      }
    }
  }, [properties, scis, activeTab]);

  // Fonction helper pour vérifier si une propriété doit être incluse selon l'onglet actif
  const isPropertyInActiveTab = (property: Property): boolean => {
    if (!showInDashboard[property.id]) return false;
    
    const investment = property.investment_data as unknown as Investment;
    
    if (activeTab.type === 'personal') {
      return !investment?.sciId;
    } else {
      return investment?.sciId === activeTab.sciId;
    }
  };

  // Calculer les années disponibles depuis tous les biens inclus
  // Utilise targetSaleYear si défini, sinon projectEndDate
  const getAllYears = (): number[] => {
    const allYears = new Set<number>();
    properties.forEach(property => {
      if (!isPropertyInActiveTab(property)) return;
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
      
      // Charger les SCI
      console.log("🔍 Chargement des SCI pour l'utilisateur:", user.id);
      const loadedSCIs = await getSCIs(user.id);
      console.log(`✅ ${loadedSCIs.length} SCI chargées:`, loadedSCIs.map(s => ({ id: s.id, name: s.name })));
      setSCIs(loadedSCIs);
      
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
  
  // Filtrer les propriétés selon l'onglet actif
  const includedProperties = properties.filter(property => isPropertyInActiveTab(property));
  
  // Couleurs pour chaque bien
  const propertyColors = [
    { bar: 'rgba(59, 130, 246, 0.7)', border: 'rgba(59, 130, 246, 1)' },   // blue
    { bar: 'rgba(16, 185, 129, 0.7)', border: 'rgba(16, 185, 129, 1)' },   // green
    { bar: 'rgba(239, 68, 68, 0.7)', border: 'rgba(239, 68, 68, 1)' },   // red
    { bar: 'rgba(245, 158, 11, 0.7)', border: 'rgba(245, 158, 11, 1)' }, // yellow
    { bar: 'rgba(168, 85, 247, 0.7)', border: 'rgba(168, 85, 247, 1)' }   // purple
  ];
  
  // Calculer les données de vente cumulative pour chaque année (basé sur le tableau de revente)
  const cumulativeSalesData = years.map(year => {
    let cumulativeSales = 0;
    
    // Pour chaque propriété vendue à cette année ou avant, calculer le gain total
    includedProperties.forEach(property => {
      const investment = property.investment_data as unknown as Investment;
      if (!investment || typeof investment !== 'object') return;
      
      const saleYear = investment.targetSaleYear || new Date(investment.projectEndDate).getFullYear();
      
      // Si l'année est >= à l'année de vente, le bien est déjà vendu
      if (year >= saleYear) {
        // Calculer le gain total cumulé pour ce bien à l'année de vente
        // Utiliser saleYear pour garder le gain total au moment de la vente
        const comps = calculateTotalGainComponentsForYear(property, saleYear);
        cumulativeSales += comps.totalGain;
      }
    });
    
    return cumulativeSales;
  });
  
  const chartData = {
    labels: years.map(y => y.toString()),
    datasets: [
      // Barres empilées pour chaque bien - Gain total cumulé (seulement si pas encore vendu)
      ...includedProperties.map((property, index) => {
        const colors = propertyColors[index % propertyColors.length];
        const investment = property.investment_data as unknown as Investment;
        const saleYear = investment && typeof investment === 'object' 
          ? investment.targetSaleYear || new Date(investment.projectEndDate).getFullYear()
          : Infinity;
        
        return {
          type: 'bar' as const,
          label: property.name,
          data: years.map(year => {
            // Si l'année est >= à l'année de vente, ne pas afficher la barre (0)
            if (year >= saleYear) return 0;
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
      // Barre pour la somme cumulative des ventes
      {
        type: 'bar' as const,
        label: 'Somme cumulative des ventes',
        data: cumulativeSalesData,
        backgroundColor: 'rgba(147, 51, 234, 0.8)', // violet-600
        borderColor: 'rgba(147, 51, 234, 1)',
        borderWidth: 2,
        stack: 'stack1', // Même stack que les autres barres
        order: 3
      },
      // Courbe pour le total cumulé (tous les biens + ventes)
      {
        type: 'line' as const,
        label: 'Total',
        data: years.map(year => {
          let total = 0;
          
          // Ajouter les gains des biens non vendus
          includedProperties.forEach(property => {
            const investment = property.investment_data as unknown as Investment;
            if (!investment || typeof investment !== 'object') return;
            
            const saleYear = investment.targetSaleYear || new Date(investment.projectEndDate).getFullYear();
            
            // Si le bien n'est pas encore vendu à cette année
            if (year < saleYear) {
              const comps = calculateTotalGainComponentsForYear(property, year);
              total += comps.totalGain;
            }
          });
          
          // Ajouter la somme cumulative des ventes pour cette année
          const yearIndex = years.indexOf(year);
          total += cumulativeSalesData[yearIndex];
          
          return total;
        }),
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
      
      // Calcul des revenus selon le régime avec vacance locative
      const revenues = calculateRevenuesWithVacancy(
        yearExpense,
        regime,
        investment.expenseProjection?.vacancyRate || 0
      );
      
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
      
      // Calcul des revenus selon le régime avec vacance locative
      const revenues = calculateRevenuesWithVacancy(
        yearExpense,
        regime,
        investment.expenseProjection?.vacancyRate || 0
      );
      
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

    // Calcul des revenus selon le régime avec vacance locative
    const revenues = calculateRevenuesWithVacancy(
      expense,
      investment.selectedRegime,
      investment.expenseProjection?.vacancyRate || 0
    );

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

  const handleSCISave = async (sciData: Omit<SCI, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    
    try {
      if (editingSCI) {
        // Mode édition - mise à jour
        const success = await updateSCI(editingSCI.id, sciData);
        if (success) {
          console.log('✅ SCI mise à jour:', sciData.name);
          await loadProperties(); // Recharger les SCI
          setShowSCIForm(false);
          setEditingSCI(null);
        } else {
          setError('Erreur lors de la mise à jour de la SCI');
        }
      } else {
        // Mode création
        const newSCI = await createSCI(user.id, sciData);
        if (newSCI) {
          console.log('✅ SCI créée:', newSCI);
          await loadProperties(); // Recharger les SCI
          setShowSCIForm(false);
        } else {
          setError('Erreur lors de la création de la SCI');
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la SCI:', error);
      setError('Erreur lors de la sauvegarde de la SCI');
    }
  };
  
  const handleEditSCI = (sci: SCI) => {
    setEditingSCI(sci);
    setShowSCIForm(true);
  };
  
  const handleCloseSCIForm = () => {
    setShowSCIForm(false);
    setEditingSCI(null);
  };

  // Séparer les biens en nom propre et les biens en SCI
  const propertiesWithoutSCI = properties.filter(property => {
    const investment = property.investment_data as unknown as Investment;
    return !investment?.sciId;
  });

  const propertiesBySCI: Record<string, Property[]> = {};
  properties.forEach(property => {
    const investment = property.investment_data as unknown as Investment;
    if (investment?.sciId) {
      if (!propertiesBySCI[investment.sciId]) {
        propertiesBySCI[investment.sciId] = [];
      }
      propertiesBySCI[investment.sciId].push(property);
    }
  });

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Bannière unifiée */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex-1">
            <img
              src="/logo.png"
              alt="Rentab'immo"
              className="h-8 w-auto"
            />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 flex-1 text-center">Dashboard</h1>
          <div className="flex items-center space-x-4 flex-1 justify-end">
            <button
              onClick={() => setShowOnboarding(true)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              title="Revoir le guide de démarrage"
            >
              Guide de démarrage
            </button>
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

      <div className="flex">
        {/* Sidebar avec la liste des biens */}
        <aside className="w-110 min-h-screen bg-gray-100 p-4">
          <div className="sticky top-4 space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
            
            {/* Section : Biens en nom propre */}
            {propertiesWithoutSCI.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">🏠 Biens en nom propre</h2>
                <div className="space-y-3">
                  {propertiesWithoutSCI.map((property) => {
                    const investment = property.investment_data as unknown as Investment;
                    if (!investment || typeof investment !== 'object') return null;
                    
                    return (
                      <div
                        key={property.id}
                        className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 group hover:shadow-md transition-shadow relative"
                      >
                        {/* Bouton de modification */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/property/${property.id}`);
                          }}
                          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Modifier le bien"
                        >
                          <Pencil className="h-4 w-4 text-gray-500" />
                        </button>

                        {/* Contenu principal */}
                        <div className="pr-10">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-base font-semibold text-gray-900">{property.name}</h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowInDashboard(prev => ({ ...prev, [property.id]: !prev[property.id] }));
                              }}
                              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                                showInDashboard[property.id] 
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {showInDashboard[property.id] ? 'Inclus' : 'Exclu'}
                            </button>
                          </div>
                          {investment.description && (
                            <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                              {investment.description}
                            </p>
                          )}
                          <div className="text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Régime</span>
                              <span className="font-medium text-gray-900">{getRegimeLabel(investment.selectedRegime)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowQuickForm(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un bien
                  </button>
                </div>
              </div>
            )}

            {/* Section : SCI */}
            {scis.map((sci) => (
              <div key={sci.id} className="bg-white border border-blue-200 rounded-lg shadow-lg p-6 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-blue-900">🏢 SCI {sci.name}</h2>
                    <button
                      onClick={() => handleEditSCI(sci)}
                      className="p-1.5 rounded-full hover:bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Modifier la SCI"
                    >
                      <Settings className="h-4 w-4 text-blue-600" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">
                    {propertiesBySCI[sci.id]?.length || 0} bien(s)
                  </span>
                </div>
                
                {sci.description && (
                  <p className="text-sm text-gray-600 mb-4">{sci.description}</p>
                )}

                <div className="space-y-3">
                  {propertiesBySCI[sci.id]?.map((property) => {
                    const investment = property.investment_data as unknown as Investment;
                    if (!investment || typeof investment !== 'object') return null;
                    
                    return (
                      <div
                        key={property.id}
                        className="bg-blue-50 border border-blue-200 rounded-lg shadow-sm p-4 group hover:shadow-md transition-shadow relative"
                      >
                        {/* Bouton de modification */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/property/${property.id}`);
                          }}
                          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Modifier le bien"
                        >
                          <Pencil className="h-4 w-4 text-blue-600" />
                        </button>

                        {/* Contenu principal */}
                        <div className="pr-10">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-base font-semibold text-gray-900">{property.name}</h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowInDashboard(prev => ({ ...prev, [property.id]: !prev[property.id] }));
                              }}
                              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                                showInDashboard[property.id] 
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {showInDashboard[property.id] ? 'Inclus' : 'Exclu'}
                            </button>
                          </div>
                          {investment.description && (
                            <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                              {investment.description}
                            </p>
                          )}
                          <div className="text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-600">Régime</span>
                              <span className="font-medium text-gray-900">SCI à l'IS</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <button
                    onClick={() => {
                      // TODO: Ajouter un bien à cette SCI
                      console.log('Ajouter un bien à la SCI:', sci.id);
                      setShowQuickForm(true);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-blue-600 bg-white border border-blue-300 rounded-lg hover:bg-blue-50"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un bien à cette SCI
                  </button>
                </div>
              </div>
            ))}

            {/* Bouton : Créer une nouvelle SCI */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
              <button
                onClick={() => setShowSCIForm(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Plus className="h-5 w-5" />
                Créer une SCI
              </button>
            </div>
          </div>
        </aside>

        {/* Contenu principal */}
        <div className="flex-1 min-h-screen">
          <main className="pt-4 px-8 pb-8">
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
                {/* Onglets pour basculer entre biens en nom propre et SCI */}
                <div className="bg-white rounded-lg shadow">
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-4 px-6" aria-label="Tabs">
                      {/* Onglet Biens en nom propre */}
                      {propertiesWithoutSCI.length > 0 && (
                        <button
                          onClick={() => setActiveTab({ type: 'personal' })}
                          className={`
                            whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm transition-colors
                            ${activeTab.type === 'personal'
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                          `}
                        >
                          🏠 Biens en nom propre
                        </button>
                      )}
                      
                      {/* Onglets SCI */}
                      {scis.map((sci) => (
                        <button
                          key={sci.id}
                          onClick={() => setActiveTab({ type: 'sci', sciId: sci.id })}
                          className={`
                            whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm transition-colors
                            ${activeTab.type === 'sci' && activeTab.sciId === sci.id
                              ? 'border-blue-500 text-blue-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }
                          `}
                        >
                          🏢 SCI {sci.name}
                        </button>
                      ))}
                    </nav>
                  </div>
                </div>

                {/* Message si aucun bien dans l'onglet actif */}
                {includedProperties.length === 0 ? (
                  <div className="bg-white rounded-lg shadow p-8 text-center">
                    <p className="text-gray-500 text-lg">
                      Aucun bien inclus dans cet onglet.
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      Ajoutez des biens ou activez l'affichage des biens existants depuis la barre latérale.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Chart */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="h-[500px]">
                        <Line data={chartData} options={chartOptions} />
                      </div>
                      <p className="text-sm text-gray-500 mt-4">
                        Barres empilées: gain total cumulé de chaque bien (chaque bien avec sa couleur). Barre violette: somme cumulative des ventes. Courbe: solde global (total de tous les biens + ventes).
                      </p>
                    </div>

                {/* Total Gain Goal - spécifique à l'onglet actif */}
                <TotalGainGoal 
                  totalGainData={years.map((year, yearIndex) => {
                    let total = 0;
                    
                    // Ajouter les gains des biens non vendus (comme dans le graphique)
                    includedProperties.forEach(property => {
                      const investment = property.investment_data as unknown as Investment;
                      if (!investment || typeof investment !== 'object') return;
                      
                      const saleYear = investment.targetSaleYear || new Date(investment.projectEndDate).getFullYear();
                      
                      // Si le bien n'est pas encore vendu à cette année
                      if (year < saleYear) {
                        const comps = calculateTotalGainComponentsForYear(property, year);
                        total += comps.totalGain;
                      }
                    });
                    
                    // Ajouter la somme cumulative des ventes pour cette année
                    total += cumulativeSalesData[yearIndex];
                    
                    return {
                      year,
                      totalGain: total
                    };
                  })}
                  onGoalChange={(newGoal) => {
                    setTotalGainGoals(prev => {
                      if (activeTab.type === 'personal') {
                        return { ...prev, personal: newGoal };
                      } else {
                        return {
                          ...prev,
                          sci: { ...prev.sci, [activeTab.sciId]: newGoal }
                        };
                      }
                    });
                  }}
                  initialGoal={activeTab.type === 'personal' 
                    ? totalGainGoals.personal 
                    : (totalGainGoals.sci[activeTab.sciId] || 0)
                  }
                  tabLabel={activeTab.type === 'personal' 
                    ? 'Biens en nom propre' 
                    : `SCI ${scis.find(sci => sci.id === activeTab.sciId)?.name || ''}`
                  }
                  key={activeTab.type === 'personal' ? 'personal' : `sci-${activeTab.sciId}`}
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
                  </>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Formulaire rapide */}
      {showQuickForm && (
        <QuickPropertyForm
          onClose={() => setShowQuickForm(false)}
          onSave={handleQuickPropertySave}
          onDetailedForm={handleDetailedForm}
        />
      )}

      {/* Formulaire de création/édition de SCI */}
      {showSCIForm && (
        <SCIForm
          onClose={handleCloseSCIForm}
          onSave={handleSCISave}
          initialData={editingSCI || undefined}
          title={editingSCI ? 'Modifier la SCI' : 'Créer une SCI'}
        />
      )}

      {/* Tour guidé de démarrage */}
      {showOnboarding && (
        <OnboardingTour onClose={() => setShowOnboarding(false)} />
      )}
    </div>
  );
}
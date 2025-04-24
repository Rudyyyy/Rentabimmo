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
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Database } from '../types/supabase';
import { Investment } from '../types/investment';
import { calculateAllTaxRegimes } from '../utils/taxCalculations';
import { useLocation } from 'react-router-dom';
import QuickPropertyForm from '../components/QuickPropertyForm';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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

  // Préparation des données du graphique
  const years = [...new Set(cashFlowData.map(d => d.year))].sort();
  
  const chartData = {
    labels: years,
    datasets: [
      // Données par bien
      ...properties
        .filter(property => showInDashboard[property.id])
        .map((property, index) => ({
        label: property.name,
        data: years.map(year => 
          cashFlowData
            .filter(d => d.propertyName === property.name && d.year === year)
            .reduce((sum, d) => sum + d.cashFlow, 0)
        ),
        borderColor: [
          'rgb(59, 130, 246)', // blue
          'rgb(16, 185, 129)', // green
          'rgb(239, 68, 68)',  // red
          'rgb(245, 158, 11)', // yellow
          'rgb(168, 85, 247)'  // purple
        ][index % 5],
        backgroundColor: [
          'rgba(59, 130, 246, 0.1)',
          'rgba(16, 185, 129, 0.1)',
          'rgba(239, 68, 68, 0.1)',
          'rgba(245, 158, 11, 0.1)',
          'rgba(168, 85, 247, 0.1)'
        ][index % 5],
        tension: 0.1,
        fill: true
      })),
      // Ligne de total
      {
        label: 'Total',
        data: years.map(year =>
          cashFlowData
            .filter(d => d.year === year)
            .reduce((sum, d) => sum + d.cashFlow, 0)
        ),
        borderColor: 'rgb(0, 0, 0)',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        fill: false
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Évolution du cash-flow par bien'
      },
      tooltip: {
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
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return new Intl.NumberFormat('fr-FR', { 
              style: 'currency', 
              currency: 'EUR',
              maximumFractionDigits: 0
            }).format(value);
          }
        }
      }
    }
  };

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
        <div className="w-80 min-h-screen bg-white border-r border-gray-200">
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
                {/* Cash flow cards */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm text-gray-500">Cash-flow mois en cours</h3>
                    <p className={`text-xl font-semibold ${currentMonthCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(currentMonthCashFlow)}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm text-gray-500">Cash-flow mois prochain</h3>
                    <p className={`text-xl font-semibold ${nextMonthCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(nextMonthCashFlow)}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm text-gray-500">Cash-flow année en cours</h3>
                    <p className={`text-xl font-semibold ${currentYearCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(currentYearCashFlow)}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="text-sm text-gray-500">Cash-flow année prochaine</h3>
                    <p className={`text-xl font-semibold ${nextYearCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(nextYearCashFlow)}
                    </p>
                  </div>
                </div>

                {/* Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="h-[500px]">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                </div>
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
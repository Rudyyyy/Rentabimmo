import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building } from 'lucide-react';
import { Line } from 'react-chartjs-2';
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
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    calculateCashFlowData();
  }, [properties]);

  async function loadProperties() {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      
      setProperties(data || []);
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
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    properties.forEach(property => {
      const investment = property.investment_data as Investment;
      
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
      ...properties.map((property, index) => ({
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

  return (
    <div className="min-h-screen relative">
      {/* Image de fond avec overlay */}
      <div 
        className="fixed inset-0 z-0"
        style={{ 
          backgroundImage: 'url("/rentabimmo.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'repeat',
          opacity: 0.4
        }}
      />
      
      {/* Contenu principal avec fond semi-transparent */}
      <div className="relative z-10 min-h-screen bg-white/80">
        <header className="bg-white/80 backdrop-blur-sm shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Building className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Rentab'immo</span>
              </div>
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
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {/* Dashboard Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Dashboard</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-sm text-gray-600">Cash-flow mois en cours</p>
                <p className={`text-2xl font-semibold ${currentMonthCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR' 
                  }).format(currentMonthCashFlow)}
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-sm text-gray-600">Cash-flow mois prochain</p>
                <p className={`text-2xl font-semibold ${nextMonthCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR' 
                  }).format(nextMonthCashFlow)}
                </p>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-sm text-gray-600">Cash-flow année en cours</p>
                <p className={`text-2xl font-semibold ${currentYearCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR' 
                  }).format(currentYearCashFlow)}
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md">
                <p className="text-sm text-gray-600">Cash-flow année prochaine</p>
                <p className={`text-2xl font-semibold ${nextYearCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR' 
                  }).format(nextYearCashFlow)}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="h-96">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Properties Section */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Mes biens immobiliers</h2>
            <button
              onClick={() => navigate('/property/new')}
              className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              Nouveau bien
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-12">
              <Building className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun bien</h3>
              <p className="mt-1 text-sm text-gray-500">
                Commencez par ajouter votre premier bien immobilier.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => navigate('/property/new')}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Nouveau bien
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {properties.map((property) => (
                <div
                  key={property.id}
                  onClick={() => navigate(`/property/${property.id}`)}
                  className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-200"
                >
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {property.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Créé le {new Date(property.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
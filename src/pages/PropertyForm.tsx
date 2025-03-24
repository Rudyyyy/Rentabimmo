import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { Investment, defaultInvestment } from '../types/investment';
import { useAuth } from '../contexts/AuthContext';
import InvestmentForm from './InvestmentForm';
import ResultsDisplay from './ResultsDisplay';
import SaleEstimation from './SaleEstimation';
import { calculateFinancialMetrics } from '../utils/calculations';

interface PropertyFormData {
  name: string;
  investment_data: Investment;
}

type View = 'form' | 'profitability' | 'sale' | 'tax';

export default function PropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [investmentData, setInvestmentData] = useState<Investment>(defaultInvestment);
  const [currentView, setCurrentView] = useState<View>('form');
  const { register, handleSubmit, reset } = useForm<{ name: string }>();

  useEffect(() => {
    if (id) {
      loadProperty();
    }
  }, [id]);

  async function loadProperty() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) {
        const loadedInvestmentData = {
          ...defaultInvestment,
          ...data.investment_data as Investment
        };
        setInvestmentData(loadedInvestmentData);
        reset({ name: data.name });
        
        // Calculate initial metrics
        const initialMetrics = calculateFinancialMetrics(loadedInvestmentData);
        setMetrics(initialMetrics);
      }
    } catch (error) {
      console.error('Error loading property:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCalculate = (data: Investment) => {
    const updatedInvestment = {
      ...defaultInvestment,
      ...data
    };
    setInvestmentData(updatedInvestment);
    const results = calculateFinancialMetrics(updatedInvestment);
    setMetrics(results);
  };

  const onSubmit = async (formData: { name: string }) => {
    if (!investmentData) return;

    try {
      setLoading(true);
      const propertyData = {
        name: formData.name,
        investment_data: investmentData,
        user_id: user!.id
      };

      if (id) {
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('properties')
          .insert([propertyData]);
        if (error) throw error;
      }
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving property:', error);
    } finally {
      setLoading(false);
    }
  };

  async function handleDelete() {
    if (!id || !window.confirm('Êtes-vous sûr de vouloir supprimer ce bien ?')) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting property:', error);
    } finally {
      setLoading(false);
    }
  }

  const renderContent = () => {
    switch (currentView) {
      case 'profitability':
        return metrics && investmentData ? (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Rentabilité globale
            </h2>
            <ResultsDisplay 
              metrics={metrics} 
              investment={investmentData}
              onUpdate={(updatedInvestment) => {
                const newInvestment = {
                  ...defaultInvestment,
                  ...updatedInvestment
                };
                setInvestmentData(newInvestment);
                const newMetrics = calculateFinancialMetrics(newInvestment);
                setMetrics(newMetrics);
              }}
            />
          </div>
        ) : null;
      case 'sale':
        return metrics && investmentData ? (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Estimation de revente
            </h2>
            <SaleEstimation
              saleProfit={metrics.saleProfit || 0}
              capitalGain={metrics.capitalGain || 0}
              appreciationType={investmentData.appreciationType}
              appreciationValue={investmentData.appreciationValue}
              purchasePrice={investmentData.purchasePrice}
              investment={investmentData}
              onUpdate={(updatedInvestment) => {
                const newInvestment = {
                  ...defaultInvestment,
                  ...updatedInvestment
                };
                setInvestmentData(newInvestment);
                const newMetrics = calculateFinancialMetrics(newInvestment);
                setMetrics(newMetrics);
              }}
            />
          </div>
        ) : null;
      case 'tax':
        return (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900">
              Imposition
            </h2>
            <p className="mt-4 text-gray-600">
              Cette fonctionnalité est en cours de construction.
            </p>
          </div>
        );
      default:
        return (
          <InvestmentForm 
            onSubmit={handleCalculate}
            initialValues={investmentData}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                src="/rentabimmo.png"
                alt="Rentab'immo"
                className="h-8 w-auto"
              />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">
                {id ? 'Modifier le bien' : 'Nouveau bien'}
              </h1>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Nom du bien
                </label>
                <input
                  type="text"
                  {...register('name', { required: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Ex: Appartement Centre-ville"
                />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setCurrentView('form')}
                  className={`px-4 py-2 rounded-md ${
                    currentView === 'form'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Formulaire
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('profitability')}
                  className={`px-4 py-2 rounded-md ${
                    currentView === 'profitability'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Rentabilité globale
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('sale')}
                  className={`px-4 py-2 rounded-md ${
                    currentView === 'sale'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Estimation revente
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('tax')}
                  className={`px-4 py-2 rounded-md ${
                    currentView === 'tax'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Imposition
                </button>
              </div>
            </div>

            {renderContent()}

            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Annuler
              </button>
              
              <div className="flex space-x-4">
                {id && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-5 w-5 mr-2" />
                    Supprimer
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={loading || !investmentData}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {id ? 'Enregistrer les modifications' : 'Créer le bien'}
                </button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
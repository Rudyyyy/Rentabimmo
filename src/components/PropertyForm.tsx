import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { Investment, defaultInvestment } from '../types/investment';
import { useAuth } from '../contexts/AuthContext';
import AcquisitionForm from './AcquisitionForm';
import ExpensesForm from './ExpensesForm';
import RevenuesForm from './RevenuesForm';
import ResultsDisplay from './ResultsDisplay';
import CashFlowDisplay from './CashFlowDisplay';
import SaleEstimation from './SaleEstimation';
import TaxDisplay from './TaxDisplay';
import { calculateFinancialMetrics } from '../utils/calculations';
import SaleDisplay from './SaleDisplay';
import BalanceDisplay from './BalanceDisplay';
import IRRDisplay from './IRRDisplay';
import MetricsCard from './MetricsCard';

interface PropertyFormData {
  name: string;
  investment_data: Investment;
}

type View = 'acquisition' | 'frais' | 'revenus' | 'imposition' | 'profitability' | 'bilan' | 'cashflow' | 'sale';

const PropertyForm: React.FC<{ onSubmit: (data: PropertyFormData) => void; loadedInvestmentData?: Investment }> = ({ onSubmit, loadedInvestmentData }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<any>(null);
  const [investmentData, setInvestmentData] = useState<Investment>(defaultInvestment);
  const [currentView, setCurrentView] = useState<View>('acquisition');
  const { register, handleSubmit, reset } = useForm<PropertyFormData>();

  useEffect(() => {
    if (id) {
      loadProperty();
    } else {
      const initialMetrics = calculateFinancialMetrics(defaultInvestment);
      setMetrics(initialMetrics);
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

  const handleInvestmentUpdate = (updatedInvestment: Investment) => {
    const newInvestment = {
      ...defaultInvestment,
      ...updatedInvestment
    };
    setInvestmentData(newInvestment);
    const newMetrics = calculateFinancialMetrics(newInvestment);
    setMetrics(newMetrics);
  };

  const onSubmitForm = async (formData: PropertyFormData) => {
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
      
      // Suppression de la redirection automatique
      // navigate('/dashboard');
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
    if (!metrics) return null;

    switch (currentView) {
      case 'acquisition':
        return (
          <AcquisitionForm 
            onSubmit={handleCalculate}
            initialValues={investmentData}
          />
        );
      case 'imposition':
        return (
          <TaxDisplay
            investment={investmentData}
            onUpdate={handleInvestmentUpdate}
          />
        );
      case 'frais':
        return (
          <ExpensesForm
            investment={investmentData}
            onUpdate={handleInvestmentUpdate}
          />
        );
      case 'revenus':
        return (
          <RevenuesForm
            investment={investmentData}
            onUpdate={handleInvestmentUpdate}
          />
        );
      case 'profitability':
        return (
          <ResultsDisplay 
            metrics={metrics}
            investment={investmentData}
            currentYearData={getCurrentYearData()}
            historicalData={getHistoricalAndProjectionData().historicalData}
            projectionData={getHistoricalAndProjectionData().projectionData}
          />
        );
      case 'cashflow':
        return (
          <CashFlowDisplay
            investment={investmentData}
            onUpdate={handleInvestmentUpdate}
          />
        );
      case 'bilan':
        return (
          <BalanceDisplay
            investment={investmentData}
          />
        );
      case 'sale':
        return (
          <SaleDisplay
            investment={investmentData}
            onUpdate={handleInvestmentUpdate}
          />
        );
      default:
        return null;
    }
  };

  const getCurrentYearData = () => {
    const currentYear = new Date().getFullYear();
    const currentYearExpense = investmentData.expenses.find(e => e.year === currentYear);

    if (!currentYearExpense) {
      return {
        rent: 0,
        expenses: 0,
        totalInvestmentCost: 0
      };
    }

    const totalInvestmentCost = 
      Number(investmentData.purchasePrice) +
      Number(investmentData.agencyFees) +
      Number(investmentData.notaryFees) +
      Number(investmentData.bankFees) +
      Number(investmentData.renovationCosts);

    const totalExpenses = 
      Number(currentYearExpense.propertyTax || 0) +
      Number(currentYearExpense.condoFees || 0) +
      Number(currentYearExpense.propertyInsurance || 0) +
      Number(currentYearExpense.managementFees || 0) +
      Number(currentYearExpense.unpaidRentInsurance || 0) +
      Number(currentYearExpense.repairs || 0) +
      Number(currentYearExpense.otherDeductible || 0) +
      Number(currentYearExpense.otherNonDeductible || 0) +
      Number(currentYearExpense.tax || 0) +
      Number(currentYearExpense.loanPayment || 0) +
      Number(currentYearExpense.loanInsurance || 0);

    return {
      rent: Number(currentYearExpense.rent || 0),
      expenses: totalExpenses,
      totalInvestmentCost
    };
  };

  const getHistoricalAndProjectionData = () => {
    const startYear = new Date(investmentData.projectStartDate).getFullYear();
    const endYear = new Date(investmentData.projectEndDate).getFullYear();
    const currentYear = new Date().getFullYear();

    const historical = {
      years: [],
      cashFlow: [],
      revenue: []
    };
    const projection = {
      years: [],
      cashFlow: [],
      revenue: []
    };

    const allYears = Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => startYear + i
    );

    allYears.forEach(year => {
      const expense = investmentData.expenses.find(e => e.year === year) || {
        propertyTax: 0,
        condoFees: 0,
        propertyInsurance: 0,
        managementFees: 0,
        unpaidRentInsurance: 0,
        repairs: 0,
        otherDeductible: 0,
        otherNonDeductible: 0,
        tax: 0,
        loanPayment: 0,
        loanInsurance: 0,
        rent: 0,
        tenantCharges: 0,
        taxBenefit: 0
      };

      const totalExpenses = 
        Number(expense.propertyTax || 0) +
        Number(expense.condoFees || 0) +
        Number(expense.propertyInsurance || 0) +
        Number(expense.managementFees || 0) +
        Number(expense.unpaidRentInsurance || 0) +
        Number(expense.repairs || 0) +
        Number(expense.otherDeductible || 0) +
        Number(expense.otherNonDeductible || 0) +
        Number(expense.tax || 0) +
        Number(expense.loanPayment || 0) +
        Number(expense.loanInsurance || 0);

      const totalRevenue = 
        Number(expense.rent || 0) +
        Number(expense.tenantCharges || 0) +
        Number(expense.taxBenefit || 0);

      const cashFlow = totalRevenue - totalExpenses;

      if (year <= currentYear) {
        historical.years.push(year);
        historical.cashFlow.push(cashFlow);
        historical.revenue.push(totalRevenue);
      } else {
        projection.years.push(year);
        projection.cashFlow.push(cashFlow);
        projection.revenue.push(totalRevenue);
      }
    });

    return {
      historicalData: historical,
      projectionData: projection
    };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                src="/logo.png"
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
          <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
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
                  onClick={() => setCurrentView('acquisition')}
                  className={`px-4 py-2 rounded-md ${
                    currentView === 'acquisition'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Acquisition
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('frais')}
                  className={`px-4 py-2 rounded-md ${
                    currentView === 'frais'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Frais
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('revenus')}
                  className={`px-4 py-2 rounded-md ${
                    currentView === 'revenus'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Revenus
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('imposition')}
                  className={`px-4 py-2 rounded-md ${
                    currentView === 'imposition'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Imposition
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
                  onClick={() => setCurrentView('bilan')}
                  className={`px-4 py-2 rounded-md ${
                    currentView === 'bilan'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Bilan
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentView('cashflow')}
                  className={`px-4 py-2 rounded-md ${
                    currentView === 'cashflow'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cash Flow
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
                  Revente
                </button>
              </div>
            </div>

            {renderContent()}

            <div className="grid grid-cols-1 gap-6 mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Résultats</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <MetricsCard
                    title="Cash Flow"
                    value={metrics?.cashFlow}
                    description="Cash flow mensuel moyen"
                  />
                  <MetricsCard
                    title="Rentabilité"
                    value={metrics?.profitability}
                    description="Rentabilité brute"
                    isPercentage
                  />
                  <MetricsCard
                    title="Rendement"
                    value={metrics?.yield}
                    description="Rendement net"
                    isPercentage
                  />
                </div>
              </div>
            </div>

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
                  disabled={loading}
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
};

export default PropertyForm;
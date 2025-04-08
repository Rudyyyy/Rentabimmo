import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { Investment, defaultInvestment, FinancialMetrics } from '../types/investment';
import { useAuth } from '../contexts/AuthContext';
import InvestmentForm from '../components/InvestmentForm';
import ResultsDisplay from '../components/ResultsDisplay';
import SaleEstimation from '../components/SaleEstimation';
import { calculateFinancialMetrics } from '../utils/calculations';

type View = 'form' | 'profitability' | 'sale' | 'tax';

export default function PropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [investmentData, setInvestmentData] = useState<Investment>(defaultInvestment);
  const [currentView, setCurrentView] = useState<View>('form');
  const { register, handleSubmit, reset, formState } = useForm<{ name: string, description?: string }>();

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
        reset({ 
          name: data.name,
          description: loadedInvestmentData.description || ''
        });
        
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

  const onSubmit = async (formData: { name: string, description?: string }) => {
    console.log('onSubmit');
    if (!investmentData) {
      console.error("Données d'investissement manquantes");
      alert("Erreur: Données d'investissement manquantes");
      return;
    }

    if (!user) {
      console.error("Utilisateur non connecté");
      alert("Erreur: Vous devez être connecté pour enregistrer un bien");
      return;
    }

    try {
      console.log('1');
      setLoading(true);
      console.log('2');

      // Vérifier les données minimales requises
      if (!formData.name.trim()) {
        throw new Error("Le nom du bien est requis");
      }

      console.log('3');
      // Mettre à jour l'investissement avec le nom et la description du formulaire
      const updatedInvestment = {
        ...investmentData,
        name: formData.name.trim(),
        description: formData.description?.trim() || ''
      };

      console.log('4');
      // Préparation de l'objet à enregistrer
      const propertyData = {
        name: formData.name.trim(), // Le nom doit être non vide à ce stade grâce à la validation
        investment_data: updatedInvestment,
        user_id: user.id
      };

      console.log('5');
      console.log('Tentative de sauvegarde avec les données:', {
        name: formData.name,
        userId: user.id,
        investmentDataSize: JSON.stringify(updatedInvestment).length,
        taxResults: Boolean(updatedInvestment.taxResults)
      });

      // Loguer les données principales pour comprendre le problème
      console.log('Données principales de l\'investissement:', {
        nom: updatedInvestment.name,
        prixAchat: updatedInvestment.purchasePrice,
        dateDebut: updatedInvestment.startDate,
        nombreDepenses: updatedInvestment.expenses?.length
      });

      if (id) {
        console.log('Mise à jour de la propriété existante avec ID:', id);
        
        // S'assurer que le nom est présent pour la mise à jour
        const updateData = {
          name: formData.name.trim(),
          investment_data: updatedInvestment,
          user_id: user.id
        };
        
        const { data, error } = await supabase
          .from('properties')
          .update(updateData)
          .eq('id', id)
          .select(); // Ajouter .select() pour récupérer les données mises à jour
        
        console.log('Résultat de la mise à jour:', { data, error });
        
        if (error) throw error;
      } else {
        console.log('Création d\'une nouvelle propriété pour utilisateur:', user.id);
        
        // Essai avec une structure minimale pour vérifier l'insertion
        const testData = {
          name: formData.name.trim(),
          investment_data: {
            name: formData.name.trim(),
            description: formData.description?.trim() || '',
            purchasePrice: 0,
            startDate: new Date().toISOString()
          },
          user_id: user.id
        };
        
        console.log('Tentative avec données minimales d\'abord:', testData);
        
        // Essayer avec des données minimales d'abord
        const { data: minimalData, error: minimalError } = await supabase
          .from('properties')
          .insert([testData])
          .select();
          
        if (minimalError) {
          console.error('Erreur même avec données minimales:', minimalError);
          throw new Error(`Erreur d'insertion avec données minimales: ${minimalError.message}`);
        } else {
          console.log('Insertion minimale réussie:', minimalData);
          // Si l'insertion minimale fonctionne, on est face à un problème de structure de données
          alert("Insertion d'un bien minimal réussie. Mais les données complètes posent problème.");
        }
        
        // Maintenant on essaie avec les données complètes
        const { data, error } = await supabase
          .from('properties')
          .insert([propertyData])
          .select();
        
        console.log('Résultat de l\'insertion avec données complètes:', { data, error });
        
        if (error) throw error;
      }
      
      navigate('/dashboard');
    } catch (error) {
      console.log('onSubmit');
      console.error('Error saving property:', error);
      // Affichage d'une alerte utilisateur avec les détails de l'erreur
      let errorMessage = 'Erreur lors de la sauvegarde du bien';
      
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
        console.log('Détails de l\'erreur:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      } else {
        console.log('Erreur non standard:', error);
      }
      
      // Afficher l'erreur à l'utilisateur
      alert(errorMessage);
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
    <div className="min-h-screen relative">
      {/* Image de fond avec overlay */}
      <div 
        className="fixed inset-0 z-0 bg-repeat"
        style={{ 
          backgroundImage: 'url("/fond2.jpg")',
          backgroundSize: '100px 100px',
          opacity: 1
        }}
      />
      
      {/* Contenu principal avec fond semi-transparent */}
      <div className="relative z-10 min-h-screen bg-white/80">
        <header className="bg-white/80 backdrop-blur-sm shadow-sm">
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Nom du bien <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('name', { 
                      required: "Le nom du bien est obligatoire",
                      minLength: { value: 2, message: "Le nom doit comporter au moins 2 caractères" }
                    })}
                    className={`mt-1 block w-full rounded-md ${
                      !formState.errors.name 
                        ? "border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                        : "border-red-300 focus:border-red-500 focus:ring-red-500"
                    } shadow-sm`}
                    placeholder="Ex: Appartement Centre-ville"
                  />
                  {formState.errors.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {formState.errors.name.message?.toString() || "Le nom du bien est obligatoire"}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-md mt-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    {...register('description')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Description du projet d'investissement..."
                    rows={3}
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
                    disabled={loading || !investmentData || !formState.isValid || formState.isSubmitting}
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
    </div>
  );
}
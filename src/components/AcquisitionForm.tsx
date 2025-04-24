/**
 * Composant AcquisitionForm
 * 
 * Ce composant gère le formulaire d'acquisition d'un bien immobilier. Il permet de saisir :
 * 1. Les informations générales du bien (prix, surface, etc.)
 * 2. Les paramètres du prêt (montant, taux, durée, etc.)
 * 3. Les paramètres de revente (augmentation annuelle, frais d'agence, etc.)
 * 
 * Fonctionnalités principales :
 * - Validation des données saisies
 * - Calcul automatique des montants (apport, frais de notaire, etc.)
 * - Sauvegarde des données dans le localStorage
 * - Gestion des différents types de prêts (classique, différé, in fine)
 * 
 * Les calculs prennent en compte :
 * - Les frais de notaire selon le type de bien
 * - Les frais de garantie selon le type de prêt
 * - Les frais de dossier selon le montant du prêt
 * - Les frais d'assurance selon le type de prêt
 */

import { useState, useMemo } from 'react';
import { Investment, defaultInvestment, AmortizationRow } from '../types/investment';
import { generateAmortizationSchedule } from '../utils/calculations';
import AmortizationTable from './AmortizationTable';
import { Bar } from 'react-chartjs-2';
import { HelpCircle } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import PDFAmortizationImporter from './PDFAmortizationImporter';
import { saveAmortizationSchedule, getAmortizationSchedule } from '../lib/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface Props {
  onSubmit: (data: Investment) => void;
  initialValues?: Investment;
}

function AcquisitionForm({ onSubmit, initialValues }: Props) {
  const [showAmortization, setShowAmortization] = useState(false);
  const [loanAmountWarning, setLoanAmountWarning] = useState(false);
  const [showPdfImporter, setShowPdfImporter] = useState(false);
  const [manualAmortizationSchedule, setManualAmortizationSchedule] = useState<AmortizationRow[] | null>(null);

  const handleInputChange = (field: keyof Investment, value: any) => {
    let updatedInvestment = {
      ...defaultInvestment,
      ...initialValues,
      [field]: value
    };

    // Reset deferral-related fields when hasDeferral is set to false
    if (field === 'hasDeferral' && value === false) {
      updatedInvestment = {
        ...updatedInvestment,
        deferralType: 'none',
        deferredPeriod: 0,
        deferredInterest: 0
      };
    }

    // Calculate total investment cost
    const totalCost = 
      Number(updatedInvestment.purchasePrice || 0) +
      Number(updatedInvestment.agencyFees || 0) +
      Number(updatedInvestment.notaryFees || 0) +
      Number(updatedInvestment.bankFees || 0) +
      Number(updatedInvestment.bankGuaranteeFees || 0) +
      Number(updatedInvestment.mandatoryDiagnostics || 0) +
      Number(updatedInvestment.renovationCosts || 0);

    // Auto-calculate loan amount when downPayment changes
    if (field === 'downPayment') {
      const calculatedLoanAmount = totalCost - Number(value);
      updatedInvestment.loanAmount = calculatedLoanAmount;
      setLoanAmountWarning(false);
    }

    // Check loan amount consistency
    if (field === 'loanAmount') {
      const expectedLoanAmount = totalCost - Number(updatedInvestment.downPayment || 0);
      setLoanAmountWarning(Number(value) !== expectedLoanAmount);
    }

    // Recalculate deferredInterest when relevant fields change
    if (['loanAmount', 'interestRate', 'deferredPeriod', 'deferralType'].includes(field)) {
      const { deferredInterest } = generateAmortizationSchedule(
        updatedInvestment.loanAmount,
        updatedInvestment.interestRate,
        updatedInvestment.loanDuration,
        updatedInvestment.deferralType,
        updatedInvestment.deferredPeriod,
        updatedInvestment.startDate
      );
      updatedInvestment.deferredInterest = deferredInterest;
    }

    updatedInvestment.startDate = updatedInvestment.startDate ?? new Date().toISOString().split('T')[0];

    // Si nous avons un tableau d'amortissement modifié manuellement, l'inclure dans l'investissement mis à jour
    if (manualAmortizationSchedule) {
      updatedInvestment.amortizationSchedule = manualAmortizationSchedule;
    }

    onSubmit(updatedInvestment);
  };

  const amortizationResult = useMemo(() => {
    // Si nous avons un tableau d'amortissement modifié manuellement, l'utiliser
    if (manualAmortizationSchedule) {
      return { schedule: manualAmortizationSchedule, deferredInterest: 0 };
    }
    
    if (!initialValues?.loanAmount || !initialValues?.interestRate || !initialValues?.loanDuration) {
      return { schedule: [], deferredInterest: 0 };
    }
    return generateAmortizationSchedule(
      initialValues.loanAmount,
      initialValues.interestRate,
      initialValues.loanDuration,
      initialValues.deferralType,
      initialValues.deferredPeriod,
      initialValues.startDate
    );
  }, [
    initialValues?.loanAmount,
    initialValues?.interestRate,
    initialValues?.loanDuration,
    initialValues?.deferralType,
    initialValues?.deferredPeriod,
    initialValues?.startDate,
    manualAmortizationSchedule
  ]);

  const chartData = {
    labels: amortizationResult.schedule
      .filter((_, index) => index % 12 === 0)
      .map(row => {
        const date = new Date(row.date);
        return `${date.getFullYear()}`;
      }),
    datasets: [
      {
        label: 'Capital',
        data: amortizationResult.schedule
          .filter((_, index) => index % 12 === 0)
          .map(row => row.principal),
        backgroundColor: 'rgb(59, 130, 246)',
        stack: 'Stack 0',
      },
      {
        label: 'Intérêts',
        data: amortizationResult.schedule
          .filter((_, index) => index % 12 === 0)
          .map(row => row.interest),
        backgroundColor: 'rgb(239, 68, 68)',
        stack: 'Stack 0',
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
        text: 'Répartition capital / intérêts par année'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('fr-FR', { 
                style: 'currency', 
                currency: 'EUR' 
              }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
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

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value || 0);

  const totalInvestmentCost = 
    Number(initialValues?.purchasePrice || 0) +
    Number(initialValues?.agencyFees || 0) +
    Number(initialValues?.notaryFees || 0) +
    Number(initialValues?.bankFees || 0) +
    Number(initialValues?.bankGuaranteeFees || 0) +
    Number(initialValues?.mandatoryDiagnostics || 0) +
    Number(initialValues?.renovationCosts || 0);

  const handleSubmitAmortization = async (updatedSchedule: AmortizationRow[]) => {
    console.log('Tableau d\'amortissement correctement ajouté:', updatedSchedule.length, 'lignes');
    
    // Créer une copie profonde pour éviter les problèmes de référence
    const scheduleCopy = JSON.parse(JSON.stringify(updatedSchedule));
    
    // Mettre à jour l'état local
    setManualAmortizationSchedule(scheduleCopy);
    
    // Créer un investissement complet avec toutes les propriétés requises
    const updatedInvestment: Investment = {
      ...defaultInvestment,
      ...initialValues,
      amortizationSchedule: scheduleCopy
    };
    
    // Vérifier explicitement que le tableau d'amortissement a été ajouté
    if (!updatedInvestment.amortizationSchedule || updatedInvestment.amortizationSchedule.length === 0) {
      console.error("❌ ERREUR: Le tableau d'amortissement n'a pas été correctement ajouté à l'investissement");
    } else {
      console.log("✅ Tableau d'amortissement correctement ajouté:", updatedInvestment.amortizationSchedule.length, "lignes");
    }
    
    console.log('AcquisitionForm - Mise à jour de l\'investissement avec le tableau d\'amortissement');
    onSubmit(updatedInvestment);
    
    // Sauvegarde directe du tableau d'amortissement via l'API si un ID est disponible
    if (initialValues?.id) {
      console.log('Sauvegarde directe du tableau via API pour l\'ID:', initialValues.id);
      
      try {
        const success = await saveAmortizationSchedule(initialValues.id, scheduleCopy);
        if (success) {
          console.log('✅ Sauvegarde directe du tableau réussie via API');
        } else {
          console.error('❌ Échec de la sauvegarde directe du tableau via API');
        }
      } catch (error) {
        console.error('❌ Exception lors de la sauvegarde directe:', error);
      }
    } else {
      console.log('ℹ️ Pas d\'ID disponible - Tableau sauvegardé uniquement en mémoire');
      console.log('Le tableau sera sauvegardé en base de données lors de la prochaine sauvegarde complète de l\'investissement');
      
      // Afficher une alerte utilisateur plus explicative
      alert("Le tableau d'amortissement a été enregistré temporairement, mais ne sera persisté en base de données que lorsque le bien sera sauvegardé.\n\nPensez à cliquer sur 'Enregistrer' en haut de la page pour finaliser l'enregistrement du bien et de ses données.");
    }
    
    setShowAmortization(false);
  };

  // Réinitialiser le tableau d'amortissement
  const handleResetAmortization = () => {
    console.log('AcquisitionForm - Réinitialisation du tableau d\'amortissement');
    
    // Effacer le tableau d'amortissement manuel
    setManualAmortizationSchedule(null);
    
    // Mettre à jour l'investissement sans tableau d'amortissement personnalisé
    const updatedInvestment: Investment = {
      ...defaultInvestment,
      ...initialValues,
      amortizationSchedule: undefined
    };
    
    onSubmit(updatedInvestment);
    
    // Réinitialisation directe du tableau d'amortissement via l'API si un ID est disponible
    if (initialValues?.id) {
      console.log('Réinitialisation directe du tableau via API pour l\'ID:', initialValues.id);
      
      // Appel asynchrone sans await pour ne pas bloquer l'interface
      saveAmortizationSchedule(initialValues.id, [])
        .then(success => {
          if (success) {
            console.log('✅ Réinitialisation directe du tableau réussie via API');
          } else {
            console.error('❌ Échec de la réinitialisation directe du tableau via API');
          }
        })
        .catch(error => {
          console.error('❌ Exception lors de la réinitialisation directe:', error);
        });
    }
    
    setShowAmortization(false);
  };

  // Montrer le tableau d'amortissement
  const handleShowAmortization = async () => {
    console.log('AcquisitionForm - Affichage du tableau d\'amortissement');
    
    // Si un ID d'investissement est disponible, essayer de charger les données les plus récentes
    if (initialValues?.id) {
      console.log('Chargement du tableau d\'amortissement à jour depuis la base de données pour ID:', initialValues.id);
      try {
        const latestSchedule = await getAmortizationSchedule(initialValues.id);
        
        if (latestSchedule && latestSchedule.length > 0) {
          console.log('✅ Tableau d\'amortissement récupéré de la base de données:', latestSchedule.length, 'lignes');
          
          // Mettre à jour l'état local avec les données récupérées
          setManualAmortizationSchedule(latestSchedule);
          console.log('✅ État local mis à jour avec les données récentes');
        } else {
          console.log('ℹ️ Pas de tableau personnalisé en base de données, utilisation du tableau calculé');
        }
      } catch (error) {
        console.error('❌ Erreur lors de la récupération du tableau:', error);
        console.log('ℹ️ Utilisation du tableau calculé par défaut');
      }
    }
    
    setShowAmortization(true);
  };

  return (
    <div className="space-y-6">
      {/* Purchase Details */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Détails de l'acquisition</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Prix d'achat
            </label>
            <input
              type="number"
              value={initialValues?.purchasePrice || 0}
              onChange={(e) => handleInputChange('purchasePrice', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              Frais d'agence
              <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
            </label>
            <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-lg p-2 w-72">
              Généralement inclus dans le prix de vente annoncé, sinon compter entre 3 et 8 %. Laisser à 0 s'ils sont inclus dans le prix de vente.
            </div>
            <input
              type="number"
              value={initialValues?.agencyFees || ''}
              onChange={(e) => handleInputChange('agencyFees', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              Frais de notaire
              <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
            </label>
            <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-lg p-2 w-96">
              Montant moyen : environ 7 à 8 % du prix pour l'ancien et 2 à 3 % dans le neuf.<br/>
              Dans le formulaire simplifié, les valeurs utilisées sont :<br/>
              • Bien ancien : 7,5% du prix d'achat<br/>
              • Bien neuf : 2,5% du prix d'achat
            </div>
            <input
              type="number"
              value={initialValues?.notaryFees || 0}
              onChange={(e) => handleInputChange('notaryFees', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              Frais de dossier bancaire
              <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
            </label>
            <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-lg p-2 w-72">
              Généralement entre 500 à 1500 €
            </div>
            <input
              type="number"
              value={initialValues?.bankFees || ''}
              onChange={(e) => handleInputChange('bankFees', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              Frais de garantie bancaire
              <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
            </label>
            <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-lg p-2 w-72">
              Hypothèque ou caution, entre 1 et 2 % du montant emprunté
            </div>
            <input
              type="number"
              value={initialValues?.bankGuaranteeFees || 0}
              onChange={(e) => handleInputChange('bankGuaranteeFees', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              Diagnostics immobiliers obligatoires
              <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
            </label>
            <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-lg p-2 w-72">
              Généralement inclus dans le prix de vente annoncé car il est la plupart du temps à la charge du vendeur. Laisser à 0 si c'est bien le cas.
            </div>
            <input
              type="number"
              value={initialValues?.mandatoryDiagnostics || 0}
              onChange={(e) => handleInputChange('mandatoryDiagnostics', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Travaux
            </label>
            <input
              type="number"
              value={initialValues?.renovationCosts || ''}
              onChange={(e) => handleInputChange('renovationCosts', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <div className="bg-gray-50 p-4 rounded-md w-full">
              <p className="text-sm text-gray-600">Coût total de l'opération</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(totalInvestmentCost)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Financing */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Financement</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date de début
            </label>
            <input
              type="date"
              value={initialValues?.startDate || ''}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={initialValues?.hasDeferral || false}
                onChange={(e) => handleInputChange('hasDeferral', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Différé</span>
            </label>
          </div>

          {initialValues?.hasDeferral && (
            <>
              <div className="relative group">
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                  Type de différé
                  <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
                </label>
                <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-lg p-2 w-96">
                  • Différé total : Pendant cette période, vous ne remboursez ni capital, ni intérêts. Tous les intérêts s'ajoutent au capital restant dû.<br/>
                  • Différé partiel : Vous remboursez uniquement les intérêts du prêt, mais pas le capital.
                </div>
                <div className="mt-2 space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="partial"
                      checked={initialValues.deferralType === 'partial'}
                      onChange={(e) => handleInputChange('deferralType', e.target.value)}
                      className="form-radio h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2">Partiel</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      value="total"
                      checked={initialValues.deferralType === 'total'}
                      onChange={(e) => handleInputChange('deferralType', e.target.value)}
                      className="form-radio h-4 w-4 text-blue-600"
                    />
                    <span className="ml-2">Total</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Différé (mois)
                </label>
                <input
                  type="number"
                  min="0"
                  value={initialValues?.deferredPeriod || ''}
                  onChange={(e) => handleInputChange('deferredPeriod', Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {initialValues.deferralType === 'total' && initialValues.deferredInterest > 0 && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Intérêts du différé
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(initialValues.deferredInterest)}
                    disabled
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                  />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Apport
            </label>
            <input
              type="number"
              value={initialValues?.downPayment || ''}
              onChange={(e) => handleInputChange('downPayment', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              Somme empruntée
              <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
            </label>
            <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-lg p-2 w-72">
              La valeur doit être égale au coût total de l'opération moins l'apport.
            </div>
            <div className="space-y-1">
              <input
                type="number"
                value={initialValues?.loanAmount || ''}
                onChange={(e) => handleInputChange('loanAmount', Number(e.target.value))}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 ${
                  loanAmountWarning ? 'border-red-300' : ''
                }`}
              />
              {loanAmountWarning && (
                <p className="text-sm text-red-600">
                  La valeur donnée est incohérente : la somme empruntée devrait être égale au coût total de l'opération moins l'apport.
                </p>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Durée (années)
            </label>
            <input
              type="number"
              value={initialValues?.loanDuration || ''}
              onChange={(e) => handleInputChange('loanDuration', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Taux d'intérêt (%)
            </label>
            <input
              type="number"
              step="0.01"
              value={initialValues?.interestRate || ''}
              onChange={(e) => handleInputChange('interestRate', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="relative group">
            <label className="block text-sm font-medium text-gray-700 flex items-center">
              Assurance (%)
              <HelpCircle className="ml-1 h-4 w-4 text-gray-400" />
            </label>
            <div className="absolute left-0 -top-2 transform -translate-y-full hidden group-hover:block bg-gray-900 text-white text-sm rounded-lg p-2 w-72">
              Assurance emprunteur (entre 0,1 % et 0,5 % du montant emprunté par an)
            </div>
            <input
              type="number"
              step="0.01"
              value={initialValues?.insuranceRate || ''}
              onChange={(e) => handleInputChange('insuranceRate', Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Affichage des informations de crédit */}
        <div className="mt-4 space-y-4">
          <h4 className="text-md font-semibold">Informations de crédit</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-600">Mensualité du crédit</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
                  initialValues?.loanAmount && initialValues?.interestRate && initialValues?.loanDuration
                    ? (initialValues.loanAmount * (initialValues.interestRate / 1200) * Math.pow(1 + initialValues.interestRate / 1200, initialValues.loanDuration * 12)) /
                      (Math.pow(1 + initialValues.interestRate / 1200, initialValues.loanDuration * 12) - 1)
                    : 0
                )}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-600">Intérêts différés</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
                  initialValues?.deferredInterest || 0
                )}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleShowAmortization()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Voir tableau d'amortissement
              </button>
              
              {/* Nouveau bouton pour importer un PDF */}
              <button
                type="button"
                onClick={() => setShowPdfImporter(!showPdfImporter)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {showPdfImporter ? 'Cacher' : 'Importer un PDF'}
              </button>
            </div>
          </div>
          
          {/* Affichage du tableau d'amortissement */}
          {showAmortization && (
            <div className="mt-4">
              <AmortizationTable 
                schedule={amortizationResult.schedule}
                onClose={() => setShowAmortization(false)}
                onSave={handleSubmitAmortization}
                onReset={handleResetAmortization}
              />
            </div>
          )}
          
          {/* Affichage de l'importateur PDF */}
          {showPdfImporter && (
            <div className="mt-4">
              <PDFAmortizationImporter
                onAmortizationImported={(amortizationRows, interestRate) => {
                  // Fermer l'importateur après avoir importé les données
                  setShowPdfImporter(false);
                  
                  // Récupérer les informations importantes du tableau
                  if (amortizationRows.length > 0) {
                    // Capital restant dû initial (montant du prêt)
                    const loanAmount = amortizationRows[0].remainingBalance;
                    
                    // Durée du prêt en années
                    const loanDuration = Math.ceil(amortizationRows.length / 12);
                    
                    // Mettre à jour l'investissement avec les nouvelles valeurs
                    const updatedInvestment = {
                      ...defaultInvestment,
                      ...initialValues,
                      loanAmount,
                      loanDuration,
                      interestRate,
                      startDate: initialValues?.startDate || new Date().toISOString().split('T')[0], // Default to today's date if undefined
                      // Mise à jour automatique de l'apport
                      downPayment: Math.max(0, 
                        (initialValues?.purchasePrice || 0) + 
                        (initialValues?.agencyFees || 0) + 
                        (initialValues?.notaryFees || 0) + 
                        (initialValues?.bankFees || 0) + 
                        (initialValues?.bankGuaranteeFees || 0) +
                        (initialValues?.renovationCosts || 0) - 
                        loanAmount
                      )
                    };
                    
                    // Notifier le parent des changements
                    onSubmit(updatedInvestment);
                    
                    // Afficher le tableau d'amortissement importé
                    setShowAmortization(true);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Graphique d'amortissement */}
      <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
        <h4 className="text-md font-semibold mb-4">Visualisation de l'amortissement</h4>
        <div className="h-80">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}

export default AcquisitionForm;
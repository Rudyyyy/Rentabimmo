/**
 * Composant InvestmentForm
 * 
 * Ce composant gère le formulaire principal d'un investissement immobilier, permettant de saisir
 * et de calculer tous les paramètres nécessaires pour l'analyse d'un projet d'investissement.
 * 
 * Fonctionnalités principales :
 * - Gestion des dates du projet (début et fin)
 * - Calcul des coûts d'acquisition (prix, frais, travaux)
 * - Configuration du financement (prêt, différé, assurance)
 * - Calcul automatique des mensualités et coûts
 * - Génération du tableau d'amortissement
 * 
 * Le composant utilise react-hook-form pour la gestion du formulaire et effectue
 * des calculs en temps réel pour fournir un retour immédiat à l'utilisateur.
 * Les modifications sont propagées au composant parent via la prop onSubmit.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Investment, AmortizationRow } from '../types/investment';
import AmortizationTable from './AmortizationTable';
import { generateAmortizationSchedule } from '../utils/calculations';
import PDFAmortizationImporter from './PDFAmortizationImporter';
import { saveAmortizationSchedule } from '../lib/api';

interface Props {
  onSubmit: (data: Investment) => void;
  initialValues?: Investment;
}

export default function InvestmentForm({ onSubmit, initialValues }: Props) {
  const [showAmortization, setShowAmortization] = useState(false);
  const [manualAmortizationSchedule, setManualAmortizationSchedule] = useState<AmortizationRow[] | null>(null);
  const { register, watch, reset } = useForm<Investment>();
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Initialize form with initial values or defaults
  useEffect(() => {
    console.log('============ INITIALISATION DES DONNÉES ============');
    console.log('Initial Values:', initialValues);
    
    // Vérifier l'ID
    if (initialValues?.id) {
      console.log('ID de l\'investissement:', initialValues.id);
    } else {
      console.warn('Aucun ID d\'investissement trouvé dans initialValues');
    }
    
    // Examiner en détail le tableau d'amortissement
    if (initialValues?.amortizationSchedule) {
      console.log('Tableau d\'amortissement dans initialValues:', {
        exists: !!initialValues.amortizationSchedule,
        length: initialValues.amortizationSchedule.length || 0,
        firstRow: initialValues.amortizationSchedule[0] || 'Aucune ligne'
      });
    } else {
      console.warn('Aucun tableau d\'amortissement trouvé dans initialValues');
    }
    
    // Réinitialiser le formulaire avec les valeurs de départ
    reset({
      ...initialValues,
      startDate: initialValues?.startDate || new Date().toISOString().split('T')[0],
      deferredPeriod: initialValues?.deferredPeriod || 0,
      saleDate: initialValues?.saleDate || '',
      appreciationType: initialValues?.appreciationType || 'global',
      appreciationValue: initialValues?.appreciationValue || 0
    });
    
    // Si l'investissement a un tableau d'amortissement personnalisé, l'utiliser
    if (initialValues?.amortizationSchedule && initialValues.amortizationSchedule.length > 0) {
      console.log('Tableau d\'amortissement trouvé:', initialValues.amortizationSchedule.length, 'lignes');
      
      // Créer une copie profonde pour éviter les références partagées
      const scheduleCopy = JSON.parse(JSON.stringify(initialValues.amortizationSchedule));
      setManualAmortizationSchedule(scheduleCopy);
      
      console.log('Tableau d\'amortissement chargé avec succès');
    } else {
      console.log('Aucun tableau d\'amortissement personnalisé trouvé');
      setManualAmortizationSchedule(null);
    }
    
    console.log('============ FIN INITIALISATION DES DONNÉES ============');
  }, [initialValues, reset]);

  // Watch all form values
  const values = watch();
  
  // Memoize calculations to prevent unnecessary re-renders
  const calculations = useCallback(() => {
    const {
      purchasePrice = 0,
      agencyFees = 0,
      notaryFees = 0,
      bankFees = 0,
      renovationCosts = 0,
      loanAmount = 0,
      interestRate = 0,
      loanDuration = 0,
      insuranceRate = 0,
      deferredPeriod = 0,
      startDate = new Date().toISOString().split('T')[0],
      propertyTax = 0,
      condoFees = 0,
      propertyInsurance = 0,
      managementFees = 0,
      unpaidRentInsurance = 0,
    } = values;

    // Calculate totals
    const totalInvestmentCost = 
      Number(purchasePrice) +
      Number(agencyFees) +
      Number(notaryFees) +
      Number(bankFees) +
      Number(renovationCosts);

    const monthlyPayment = loanAmount && interestRate && loanDuration
      ? (loanAmount * (interestRate / 1200) * Math.pow(1 + interestRate / 1200, loanDuration * 12)) /
        (Math.pow(1 + interestRate / 1200, loanDuration * 12) - 1)
      : 0;

    // Assurance mensuelle : taux annuel appliqué mensuellement
    const monthlyInsurance = loanAmount && insuranceRate
      ? (loanAmount * (insuranceRate / 100)) / 12
      : 0;

    const annualCosts = 
      Number(propertyTax) +
      Number(condoFees) +
      Number(propertyInsurance) +
      Number(managementFees) +
      Number(unpaidRentInsurance);

    const monthlyCosts = annualCosts / 12;

    // Utiliser le tableau d'amortissement personnalisé s'il existe, sinon calculer
    const amortizationSchedule = manualAmortizationSchedule || (
      loanAmount && interestRate && loanDuration
        ? generateAmortizationSchedule(
            loanAmount,
            interestRate,
            loanDuration,
            values.deferralType || 'none',
            Number(deferredPeriod),
            startDate
          ).schedule
        : []
    );

    return {
      totalInvestmentCost,
      monthlyPayment,
      totalInsuranceCost,
      monthlyInsurance,
      monthlyCosts,
      amortizationSchedule
    };
  }, [values, manualAmortizationSchedule]);

  const {
    totalInvestmentCost,
    monthlyPayment,
    monthlyInsurance,
    monthlyCosts,
    amortizationSchedule
  } = calculations();

  const financingTotal = Number(values.downPayment || 0) + Number(values.loanAmount || 0);
  const financingDifference = totalInvestmentCost - financingTotal;
  const hasFinancingMismatch = Math.abs(financingDifference) > 1;

  const financingInputClasses = hasFinancingMismatch
    ? 'mt-1 block w-full rounded-md border-red-500 shadow-sm focus:border-red-500 focus:ring-red-500'
    : 'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500';

  // Trigger calculations when form values change with debounce
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const hasValues = Object.values(values).some(value => 
      value !== undefined && value !== 0 && value !== ''
    );
    
    if (hasValues) {
      timeoutRef.current = setTimeout(() => {
        onSubmit(values);
      }, 500);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [values, onSubmit]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

  // Fonction pour sauvegarder le tableau d'amortissement
  const handleSaveAmortization = async (updatedSchedule: AmortizationRow[]): Promise<boolean> => {
    console.log('=============== DÉBUT SAVE AMORTIZATION (FORM) ===============');
    console.log('FORM - Nombre de lignes à sauvegarder:', updatedSchedule.length);
    
    if (!updatedSchedule || updatedSchedule.length === 0) {
      console.error('❌ FORM - Le tableau d\'amortissement est vide');
      return false;
    }
    
    // Créer une copie profonde pour éviter les problèmes de référence
    const newSchedule = JSON.parse(JSON.stringify(updatedSchedule));
    
    // Si nous n'avons pas d'ID d'investissement dans les valeurs initiales,
    // essayer de trouver l'ID dans les valeurs actuelles
    if (!initialValues?.id) {
      console.warn('⚠️ FORM - Pas d\'ID dans initialValues, tentative de trouver un ID alternatif');
      
      const investmentId = values?.id;
      if (investmentId) {
        try {
          console.log(`FORM - Tentative de sauvegarde avec ID alternatif: ${investmentId}`);
          console.log(`FORM - Nombre de lignes à sauvegarder: ${newSchedule.length}`);
          
          // Vérifier que chaque ligne a un montant
          let hasInvalidRow = false;
          newSchedule.forEach((row: AmortizationRow, index: number) => {
            if (row.monthlyPayment === undefined || row.monthlyPayment === null) {
              console.error(`❌ FORM - Ligne ${index} invalide:`, row);
              hasInvalidRow = true;
            }
          });
          
          if (hasInvalidRow) {
            console.error('❌ FORM - Des lignes sont invalides, annulation de la sauvegarde');
            return false;
          }
          
          // Afficher quelques lignes d'exemple pour le débogage
          console.log('Exemple des 2 premières lignes à sauvegarder:', 
            newSchedule.slice(0, 2).map((row: AmortizationRow) => ({
              date: row.date,
              monthlyPayment: row.monthlyPayment,
              principal: row.principal,
              interest: row.interest
            }))
          );
          
          // Appel à l'API avec l'ID alternatif
          const saveResult = await saveAmortizationSchedule(investmentId, newSchedule);
          console.log('Résultat de la sauvegarde:', saveResult);
          
          if (saveResult) {
            console.log('✅ FORM - Sauvegarde réussie avec ID alternatif');
            
            // Mettre à jour l'état local
            setManualAmortizationSchedule(newSchedule);
            
            // Mettre à jour l'investissement complet
            const updatedInvestment = {
              ...values,
              amortizationSchedule: newSchedule
            };
            onSubmit(updatedInvestment);
            
            console.log('✅ FORM - État local et état global mis à jour');
            console.log('FORM - Récapitulatif:');
            console.log('- Nombre de lignes sauvegardées:', newSchedule.length);
            console.log('- ID de l\'investissement:', investmentId);
            console.log('=============== FIN SAVE AMORTIZATION (FORM) ===============');
            
            // Afficher un message de confirmation à l'utilisateur
            alert(`Tableau d'amortissement sauvegardé avec succès ! (${newSchedule.length} lignes)`);
            
            return true;
          } else {
            console.error('❌ FORM - Échec de la sauvegarde avec ID alternatif');
            console.log('=============== FIN SAVE AMORTIZATION (FORM) ===============');
            
            // Informer l'utilisateur de l'échec
            alert("Erreur lors de la sauvegarde du tableau d'amortissement. Veuillez réessayer.");
            
            return false;
          }
        } catch (error) {
          console.error('❌ FORM - EXCEPTION lors de la sauvegarde avec ID alternatif:', error);
          console.log('=============== FIN SAVE AMORTIZATION (FORM) ===============');
          
          // Informer l'utilisateur de l'erreur
          alert("Erreur lors de la sauvegarde : " + (error instanceof Error ? error.message : String(error)));
          
          return false;
        }
      } else {
        console.error('❌ FORM - Aucun ID alternatif trouvé, impossible de sauvegarder');
        console.log('=============== FIN SAVE AMORTIZATION (FORM) ===============');
        
        // Informer l'utilisateur de l'erreur
        alert("Impossible de sauvegarder le tableau : aucun identifiant d'investissement trouvé.");
        
        return false;
      }
    }
    
    console.log(`FORM - Tentative de sauvegarde avec ID standard: ${initialValues?.id}`);
    console.log(`FORM - Nombre de lignes à sauvegarder: ${newSchedule.length}`);
    
    // Afficher quelques lignes d'exemple pour le débogage
    console.log('Exemple des 2 premières lignes à sauvegarder:', 
      newSchedule.slice(0, 2).map((row: AmortizationRow) => ({
        date: row.date,
        monthlyPayment: row.monthlyPayment,
        principal: row.principal,
        interest: row.interest
      }))
    );
    
    try {
      const saveResult = await saveAmortizationSchedule(initialValues?.id, newSchedule);
      console.log('Résultat de la sauvegarde:', saveResult);
      
      if (saveResult) {
        console.log('✅ FORM - Sauvegarde réussie');
        
        // Mettre à jour l'état local
        setManualAmortizationSchedule(newSchedule);
        
        // Mettre à jour l'investissement complet
        const updatedInvestment = {
          ...values,
          amortizationSchedule: newSchedule
        };
        onSubmit(updatedInvestment);
        
        console.log('✅ FORM - État local et état global mis à jour');
        console.log('FORM - Récapitulatif:');
        console.log('- Nombre de lignes sauvegardées:', newSchedule.length);
        console.log('- ID de l\'investissement:', initialValues?.id);
        console.log('=============== FIN SAVE AMORTIZATION (FORM) ===============');
        
        // Afficher un message de confirmation à l'utilisateur avec plus de détails
        alert(`Tableau d'amortissement sauvegardé avec succès ! (${newSchedule.length} lignes)`);
        
        return true;
      } else {
        console.error('❌ FORM - Échec de la sauvegarde');
        console.log('=============== FIN SAVE AMORTIZATION (FORM) ===============');
        
        // Informer l'utilisateur de l'échec
        alert("Erreur lors de la sauvegarde du tableau d'amortissement. Veuillez réessayer.");
        
        return false;
      }
    } catch (error) {
      console.error('❌ FORM - EXCEPTION lors de la sauvegarde:', error);
      console.log('=============== FIN SAVE AMORTIZATION (FORM) ===============');
      
      // Informer l'utilisateur de l'erreur
      alert("Erreur lors de la sauvegarde : " + (error instanceof Error ? error.message : String(error)));
      
      return false;
    }
  };

  // Réinitialiser le tableau d'amortissement
  const handleResetAmortization = async () => {
    console.log('Resetting Amortization Schedule');
    setManualAmortizationSchedule(null);
    
    // Mettre à jour l'investissement sans le tableau d'amortissement personnalisé
    onSubmit({
      ...values,
      amortizationSchedule: undefined
    });
    console.log('Amortization Schedule Reset in State');

    // Aussi supprimer de la base de données si un ID est disponible
    try {
      if (initialValues?.id) {
        const success = await saveAmortizationSchedule(initialValues.id, []);
        
        if (success) {
          console.log('Amortization schedule reset in database');
        } else {
          console.error('Failed to reset amortization schedule in database');
        }
      } else {
        console.warn('Cannot reset amortization schedule: No investment ID provided');
      }
    } catch (error) {
      console.error('Error resetting amortization schedule:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Dates */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Dates du projet</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date de début
            </label>
            <input
              type="date"
              {...register('projectStartDate')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date de fin
            </label>
            <input
              type="date"
              {...register('projectEndDate')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Purchase Details */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Détails d'acquisition</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Prix d'achat
            </label>
            <input
              type="number"
              {...register('purchasePrice')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Frais d'agence
            </label>
            <input
              type="number"
              {...register('agencyFees')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Frais de notaire
            </label>
            <input
              type="number"
              {...register('notaryFees')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Frais de dossier bancaire
            </label>
            <input
              type="number"
              {...register('bankFees')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Travaux
            </label>
            <input
              type="number"
              {...register('renovationCosts')}
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

      {/* Loan Calculator */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Crédit et amortissement</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Montant de l'apport
            </label>
            <input
              type="number"
              {...register('downPayment')}
              className={financingInputClasses}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Montant du prêt
            </label>
            <input
              type="number"
              {...register('loanAmount')}
              className={financingInputClasses}
            />
          </div>
          {hasFinancingMismatch && (
            <div className="md:col-span-3">
              <p className="text-xs text-red-600">
                Écart de {formatCurrency(financingDifference)} entre financement et coût total de l'opération.
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Durée du prêt (années)
            </label>
            <input
              type="number"
              {...register('loanDuration')}
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
              {...register('interestRate')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Taux d'assurance (%)
            </label>
            <input
              type="number"
              step="0.01"
              {...register('insuranceRate')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date de début
            </label>
            <input
              type="date"
              {...register('startDate')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              {...register('hasDeferral')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Différé de remboursement</span>
          </label>
        </div>

        {values.hasDeferral && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type de différé
              </label>
              <select
                {...register('deferralType')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="none">Aucun</option>
                <option value="partial">Partiel</option>
                <option value="total">Total</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {values.deferralType === 'partial' && 'Différé partiel: Vous ne remboursez que les intérêts pendant la période de différé.'}
                {values.deferralType === 'total' && 'Différé total: Vous ne remboursez ni le capital ni les intérêts pendant la période de différé.'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Durée du différé (mois)
              </label>
              <input
                type="number"
                {...register('deferredPeriod')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-600">Mensualité du crédit</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(monthlyPayment)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Hors assurance: {formatCurrency(monthlyPayment)}
            </p>
            <p className="text-xs text-gray-500">
              Assurance mensuelle: {formatCurrency(monthlyInsurance)}
            </p>
            <p className="text-xs text-gray-500">
              Total: {formatCurrency(monthlyPayment + monthlyInsurance)}
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => setShowAmortization(!showAmortization)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {showAmortization ? 'Masquer le tableau d\'amortissement' : 'Afficher le tableau d\'amortissement'}
            </button>
          </div>
        </div>

        {/* Tableau d'amortissement */}
        {showAmortization && (
          <div className="mt-4">
            <AmortizationTable 
              schedule={amortizationSchedule} 
              onClose={() => setShowAmortization(false)} 
              onSave={handleSaveAmortization}
              onReset={handleResetAmortization}
            />
            
            {/* Ajout du composant d'importation PDF */}
            <div className="mt-4">
              <h4 className="text-md font-semibold mb-2">Importer depuis un PDF</h4>
              <p className="text-sm text-gray-600 mb-4">
                Vous pouvez importer votre tableau d'amortissement directement depuis un PDF fourni par votre banque.
              </p>
              <PDFAmortizationImporter
                onAmortizationImported={(amortizationRows, interestRate) => {
                  // Mettre à jour les valeurs calculées à partir du tableau d'amortissement importé
                  if (amortizationRows.length > 0) {
                    // Extraire des informations utiles comme le montant du prêt, la durée, etc.
                    const loanAmount = amortizationRows[0].remainingBalance;
                    const loanDuration = Math.ceil(amortizationRows.length / 12);
                    
                    // Mettre à jour le formulaire avec ces valeurs
                    reset({
                      ...values,
                      loanAmount,
                      loanDuration,
                      interestRate
                    });
                    
                    // Notifier de la mise à jour
                    onSubmit({
                      ...values,
                      loanAmount,
                      loanDuration,
                      interestRate
                    });
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Annual Expenses */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Charges annuelles</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Taxe foncière
            </label>
            <input
              type="number"
              {...register('propertyTax')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Charges de copropriété
            </label>
            <input
              type="number"
              {...register('condoFees')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Assurance propriétaire
            </label>
            <input
              type="number"
              {...register('propertyInsurance')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Frais d'agence
            </label>
            <input
              type="number"
              {...register('managementFees')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Assurance loyer impayé
            </label>
            <input
              type="number"
              {...register('unpaidRentInsurance')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <div className="bg-gray-50 p-4 rounded-md w-full">
              <p className="text-sm text-gray-600">Charges mensuelles</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(monthlyCosts)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
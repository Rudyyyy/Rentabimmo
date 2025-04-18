import React, { useState } from 'react';
import { Investment } from '../types/investment';

interface Props {
  onClose: () => void;
  onSave: (investment: Investment) => void;
  onDetailedForm: () => void;
}

const QuickPropertyForm: React.FC<Props> = ({ onClose, onSave, onDetailedForm }) => {
  const defaultName = `Bien ${new Date().getFullYear()}`;
  const defaultDescription = 'Description du bien';

  const [projectStartDate, setProjectStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [isNewProperty, setIsNewProperty] = useState<boolean>(true);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!projectStartDate) {
      newErrors.projectStartDate = 'La date de début du projet est requise';
    }
    
    if (!purchasePrice || isNaN(Number(purchasePrice)) || Number(purchasePrice) <= 0) {
      newErrors.purchasePrice = 'Le prix d\'achat doit être un nombre positif';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    
    const price = Number(purchasePrice);
    const agencyFees = price * 0.04; // 4% du prix d'achat
    const notaryFees = price * (isNewProperty ? 0.025 : 0.075); // 2.5% pour neuf, 7.5% pour ancien
    const bankFees = 1000; // Frais de dossier fixes
    const bankGuaranteeFees = price * 0.01; // 1% du prix d'achat
    const diagnosticFees = 0; // Diagnostic gratuit
    const renovationCosts = price * 0.05; // 5% du prix d'achat
    
    // Calcul du coût total
    const totalCost = price + agencyFees + notaryFees + bankFees + bankGuaranteeFees + diagnosticFees + renovationCosts;
    
    // Calcul de l'apport (10% du coût total)
    const downPayment = totalCost * 0.1;
    
    // Calcul du montant emprunté
    const loanAmount = totalCost - downPayment;
    
    // Calcul de la date de fin (20 ans après la date de début)
    const endDate = new Date(projectStartDate);
    endDate.setFullYear(endDate.getFullYear() + 20);
    
    const investment: Investment = {
      id: '',
      userId: '',
      name: name || defaultName,
      description: description || defaultDescription,
      projectStartDate,
      projectEndDate: endDate.toISOString().split('T')[0],
      purchasePrice: price,
      agencyFees,
      notaryFees,
      bankFees,
      bankGuaranteeFees,
      diagnosticFees,
      renovationCosts,
      loanAmount,
      downPayment,
      interestRate: 3,
      loanDuration: 20,
      insuranceRate: 0.25,
      deferralType: 'none',
      deferredPeriod: 0,
      startDate: projectStartDate,
      rentalStartDate: projectStartDate,
      saleDate: '',
      expenses: [],
      taxParameters: {
        taxType: 'reel-bic',
        taxRate: 30,
        socialChargesRate: 17.2,
        buildingValue: price * 0.8, // 80% du prix d'achat pour le bâtiment
        buildingAmortizationYears: 25,
        furnitureValue: price * 0.1, // 10% du prix d'achat pour les meubles
        furnitureAmortizationYears: 5,
        worksValue: renovationCosts,
        worksAmortizationYears: 10,
        otherValue: 0,
        otherAmortizationYears: 5
      },
      amortizationSchedule: []
    };
    
    onSave(investment);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Création rapide de bien</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du bien
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => {
                if (!name) e.target.placeholder = '';
              }}
              onBlur={(e) => {
                if (!name) e.target.placeholder = defaultName;
              }}
              placeholder={defaultName}
              className="w-full px-3 py-2 border rounded-md border-gray-300 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onFocus={(e) => {
                if (!description) e.target.placeholder = '';
              }}
              onBlur={(e) => {
                if (!description) e.target.placeholder = defaultDescription;
              }}
              placeholder={defaultDescription}
              rows={3}
              className="w-full px-3 py-2 border rounded-md border-gray-300 placeholder-gray-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de début du projet
            </label>
            <input
              type="date"
              value={projectStartDate}
              onChange={(e) => setProjectStartDate(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${errors.projectStartDate ? 'border-red-500' : 'border-gray-300'}`}
            />
            {errors.projectStartDate && (
              <p className="text-red-500 text-xs mt-1">{errors.projectStartDate}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prix d'achat (€)
            </label>
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${errors.purchasePrice ? 'border-red-500' : 'border-gray-300'}`}
              min="0"
              step="1000"
            />
            {errors.purchasePrice && (
              <p className="text-red-500 text-xs mt-1">{errors.purchasePrice}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de bien
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  checked={isNewProperty}
                  onChange={() => setIsNewProperty(true)}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2">Neuf</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  checked={!isNewProperty}
                  onChange={() => setIsNewProperty(false)}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2">Ancien</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <div className="space-x-2">
            <button
              onClick={onDetailedForm}
              className="px-4 py-2 border border-blue-300 rounded-md text-blue-700 hover:bg-blue-50"
            >
              Formulaire détaillé
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Valider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickPropertyForm; 
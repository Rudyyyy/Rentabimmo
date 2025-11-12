/**
 * Composant SCISelector
 * 
 * Permet de sélectionner une SCI pour un bien immobilier et de saisir
 * la valeur du bien pour le calcul du prorata de l'IS.
 */

import { useState, useEffect } from 'react';
import { Building2, AlertCircle } from 'lucide-react';
import { SCI } from '../types/sci';
import { getSCIs } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface SCISelectorProps {
  selectedSCIId?: string;
  propertyValue?: number;
  purchasePrice: number;
  onChange: (sciId: string | undefined, propertyValue: number | undefined) => void;
}

export default function SCISelector({ 
  selectedSCIId, 
  propertyValue, 
  purchasePrice,
  onChange 
}: SCISelectorProps) {
  const [scis, setSCIs] = useState<SCI[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadSCIs();
  }, [user]);

  async function loadSCIs() {
    if (!user) return;
    
    setLoading(true);
    try {
      const loadedSCIs = await getSCIs(user.id);
      setSCIs(loadedSCIs);
    } catch (error) {
      console.error('Erreur lors du chargement des SCI:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSCIChange = (sciId: string) => {
    if (sciId === '') {
      // Réinitialiser (bien en nom propre)
      onChange(undefined, undefined);
    } else {
      // Initialiser la valeur du bien avec le prix d'achat si pas déjà définie
      onChange(sciId, propertyValue || purchasePrice);
    }
  };

  const handlePropertyValueChange = (value: number) => {
    onChange(selectedSCIId, value);
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <Building2 className="h-5 w-5 text-blue-600" />
        <h4 className="text-md font-semibold">Structure juridique</h4>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="sci-select" className="block text-sm font-medium text-gray-700 mb-2">
            Type de propriété
          </label>
          <select
            id="sci-select"
            value={selectedSCIId || ''}
            onChange={(e) => handleSCIChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Nom propre (personne physique)</option>
            {scis.map(sci => (
              <option key={sci.id} value={sci.id}>
                SCI {sci.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {selectedSCIId 
              ? 'Ce bien appartiendra à la SCI sélectionnée (imposition à l\'IS)'
              : 'Ce bien sera détenu en nom propre (imposition IRPP)'
            }
          </p>
        </div>

        {selectedSCIId && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Bien en SCI à l'IS</p>
                  <p>
                    L'impôt sur les sociétés (IS) sera calculé globalement au niveau de la SCI, 
                    puis réparti par prorata sur chaque bien selon sa valeur.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="property-value" className="block text-sm font-medium text-gray-700 mb-2">
                Valeur du bien pour le prorata (€)
              </label>
              <input
                id="property-value"
                type="number"
                value={propertyValue || purchasePrice}
                onChange={(e) => handlePropertyValueChange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
                step="1000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Cette valeur servira à calculer la part d'IS allouée à ce bien. 
                Par défaut, le prix d'achat est utilisé.
              </p>
            </div>

            {propertyValue && propertyValue !== purchasePrice && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="text-sm text-amber-800">
                  ⚠️ La valeur pour le prorata ({new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR',
                    maximumFractionDigits: 0
                  }).format(propertyValue)}) diffère du prix d'achat ({new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR',
                    maximumFractionDigits: 0
                  }).format(purchasePrice)}).
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


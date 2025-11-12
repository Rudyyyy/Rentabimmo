/**
 * Composant SCIForm
 * 
 * Formulaire modal pour créer ou éditer une SCI (Société Civile Immobilière)
 * Ce composant permet de saisir :
 * - Les informations générales (nom, SIRET, date de création, capital)
 * - Les paramètres fiscaux (taux IS, durées d'amortissement)
 * - Une description optionnelle
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { SCI, defaultSCI, defaultSCITaxParameters } from '../types/sci';

interface SCIFormProps {
  onClose: () => void;
  onSave: (sciData: Omit<SCI, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  initialData?: SCI; // Pour l'édition
  title?: string;
}

export default function SCIForm({ onClose, onSave, initialData, title = 'Créer une SCI' }: SCIFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // États pour les champs du formulaire
  const [name, setName] = useState(initialData?.name || '');
  const [siret, setSiret] = useState(initialData?.siret || '');
  const [dateCreation, setDateCreation] = useState(
    initialData?.dateCreation || new Date().toISOString().split('T')[0]
  );
  const [capital, setCapital] = useState(initialData?.capital || 1000);
  const [description, setDescription] = useState(initialData?.description || '');
  
  // Paramètres fiscaux
  const [standardRate, setStandardRate] = useState(
    initialData?.taxParameters.standardRate || defaultSCITaxParameters.standardRate
  );
  const [reducedRate, setReducedRate] = useState(
    initialData?.taxParameters.reducedRate || defaultSCITaxParameters.reducedRate
  );
  const [reducedRateThreshold, setReducedRateThreshold] = useState(
    initialData?.taxParameters.reducedRateThreshold || defaultSCITaxParameters.reducedRateThreshold
  );
  const [buildingAmortizationYears, setBuildingAmortizationYears] = useState(
    initialData?.taxParameters.buildingAmortizationYears || defaultSCITaxParameters.buildingAmortizationYears
  );
  const [furnitureAmortizationYears, setFurnitureAmortizationYears] = useState(
    initialData?.taxParameters.furnitureAmortizationYears || defaultSCITaxParameters.furnitureAmortizationYears
  );
  const [worksAmortizationYears, setWorksAmortizationYears] = useState(
    initialData?.taxParameters.worksAmortizationYears || defaultSCITaxParameters.worksAmortizationYears
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!name.trim()) {
      setError('Le nom de la SCI est obligatoire');
      return;
    }
    
    if (capital <= 0) {
      setError('Le capital doit être supérieur à 0');
      return;
    }
    
    setLoading(true);
    
    try {
      const sciData: Omit<SCI, 'id' | 'user_id' | 'created_at'> = {
        name: name.trim(),
        siret: siret.trim() || undefined,
        dateCreation,
        formeJuridique: 'SCI',
        capital,
        taxParameters: {
          standardRate,
          reducedRate,
          reducedRateThreshold,
          previousDeficits: initialData?.taxParameters.previousDeficits || 0,
          buildingAmortizationYears,
          furnitureAmortizationYears,
          worksAmortizationYears
        },
        propertyIds: initialData?.propertyIds || [],
        consolidatedTaxResults: initialData?.consolidatedTaxResults || {},
        description: description.trim() || undefined,
        updated_at: undefined
      };
      
      await onSave(sciData);
      onClose();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la SCI:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Section : Informations générales */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations générales</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la SCI <span className="text-red-500">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ma SCI Familiale"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="siret" className="block text-sm font-medium text-gray-700 mb-1">
                  SIRET
                </label>
                <input
                  id="siret"
                  type="text"
                  value={siret}
                  onChange={(e) => setSiret(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="12345678901234"
                  maxLength={14}
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="dateCreation" className="block text-sm font-medium text-gray-700 mb-1">
                  Date de création <span className="text-red-500">*</span>
                </label>
                <input
                  id="dateCreation"
                  type="date"
                  value={dateCreation}
                  onChange={(e) => setDateCreation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="capital" className="block text-sm font-medium text-gray-700 mb-1">
                  Capital social (€) <span className="text-red-500">*</span>
                </label>
                <input
                  id="capital"
                  type="number"
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  step="1"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Description optionnelle de la SCI..."
                disabled={loading}
              />
            </div>
          </div>

          {/* Section : Paramètres fiscaux */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Paramètres fiscaux (IS)</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Note :</strong> Les SCI à l'IS sont soumises à l'Impôt sur les Sociétés avec un barème progressif.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="reducedRate" className="block text-sm font-medium text-gray-700 mb-1">
                  Taux réduit (%)
                </label>
                <input
                  id="reducedRate"
                  type="number"
                  value={reducedRate}
                  onChange={(e) => setReducedRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Généralement 15%</p>
              </div>

              <div>
                <label htmlFor="reducedRateThreshold" className="block text-sm font-medium text-gray-700 mb-1">
                  Seuil taux réduit (€)
                </label>
                <input
                  id="reducedRateThreshold"
                  type="number"
                  value={reducedRateThreshold}
                  onChange={(e) => setReducedRateThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="100"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Généralement 42 500€</p>
              </div>

              <div>
                <label htmlFor="standardRate" className="block text-sm font-medium text-gray-700 mb-1">
                  Taux normal (%)
                </label>
                <input
                  id="standardRate"
                  type="number"
                  value={standardRate}
                  onChange={(e) => setStandardRate(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Généralement 25%</p>
              </div>
            </div>
          </div>

          {/* Section : Durées d'amortissement */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Durées d'amortissement</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="buildingAmortizationYears" className="block text-sm font-medium text-gray-700 mb-1">
                  Immeubles (années)
                </label>
                <input
                  id="buildingAmortizationYears"
                  type="number"
                  value={buildingAmortizationYears}
                  onChange={(e) => setBuildingAmortizationYears(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="100"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Généralement 25-30 ans</p>
              </div>

              <div>
                <label htmlFor="furnitureAmortizationYears" className="block text-sm font-medium text-gray-700 mb-1">
                  Mobilier (années)
                </label>
                <input
                  id="furnitureAmortizationYears"
                  type="number"
                  value={furnitureAmortizationYears}
                  onChange={(e) => setFurnitureAmortizationYears(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="50"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Généralement 5-10 ans</p>
              </div>

              <div>
                <label htmlFor="worksAmortizationYears" className="block text-sm font-medium text-gray-700 mb-1">
                  Travaux (années)
                </label>
                <input
                  id="worksAmortizationYears"
                  type="number"
                  value={worksAmortizationYears}
                  onChange={(e) => setWorksAmortizationYears(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="50"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Généralement 10-15 ans</p>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Enregistrement...' : (initialData ? 'Mettre à jour' : 'Créer la SCI')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


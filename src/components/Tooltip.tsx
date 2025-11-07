/**
 * Composant Tooltip
 * 
 * Affiche une info-bulle interactive au survol d'un élément
 * Utile pour expliquer les calculs et formules
 */

import { ReactNode, useState } from 'react';
import { FiHelpCircle, FiInfo } from 'react-icons/fi';

interface TooltipProps {
  /**
   * Contenu de l'info-bulle (peut contenir du JSX)
   */
  content: ReactNode;
  
  /**
   * Texte ou élément déclencheur (optionnel)
   * Si non fourni, affiche une icône d'aide par défaut
   */
  children?: ReactNode;
  
  /**
   * Position de l'info-bulle
   */
  position?: 'top' | 'bottom' | 'left' | 'right';
  
  /**
   * Type d'icône (si pas d'enfants fournis)
   */
  icon?: 'help' | 'info';
  
  /**
   * Classe CSS additionnelle pour le conteneur
   */
  className?: string;
  
  /**
   * Largeur maximale de l'info-bulle
   */
  maxWidth?: string;
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  icon = 'help',
  className = '',
  maxWidth = '300px'
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900'
  };

  const IconComponent = icon === 'help' ? FiHelpCircle : FiInfo;

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Élément déclencheur */}
      <div
        className="inline-flex items-center cursor-help"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
      >
        {children || (
          <IconComponent 
            className="text-blue-500 hover:text-blue-600 transition-colors" 
            size={18}
            aria-label="Aide"
          />
        )}
      </div>

      {/* Info-bulle */}
      {isVisible && (
        <div
          className={`
            absolute z-50 
            ${positionClasses[position]}
            px-3 py-2 
            bg-gray-900 text-white text-sm 
            rounded-lg shadow-lg
            pointer-events-none
            animate-fadeIn
          `}
          style={{ maxWidth }}
        >
          {/* Flèche */}
          <div
            className={`
              absolute w-0 h-0 
              border-4 border-transparent
              ${arrowClasses[position]}
            `}
          />
          
          {/* Contenu */}
          <div className="relative z-10">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Composant TooltipFormula
 * 
 * Version spécialisée pour afficher des formules mathématiques
 */
interface TooltipFormulaProps {
  formula: string;
  explanation?: string;
  example?: {
    values: Record<string, number | string>;
    result: number | string;
  };
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function TooltipFormula({
  formula,
  explanation,
  example,
  position = 'top',
  className = ''
}: TooltipFormulaProps) {
  const content = (
    <div className="space-y-2">
      {/* Formule */}
      <div className="font-mono text-xs bg-gray-800 p-2 rounded">
        {formula}
      </div>

      {/* Explication */}
      {explanation && (
        <div className="text-xs text-gray-300">
          {explanation}
        </div>
      )}

      {/* Exemple */}
      {example && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="text-xs font-semibold mb-1">Exemple :</div>
          <div className="text-xs space-y-1">
            {Object.entries(example.values).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-400">{key}:</span>
                <span className="font-mono">{value}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold pt-1 border-t border-gray-700">
              <span>Résultat:</span>
              <span className="font-mono">{example.result}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip
      content={content}
      position={position}
      className={className}
      maxWidth="400px"
    />
  );
}






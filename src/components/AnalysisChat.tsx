import React from 'react';
import { Brain } from 'lucide-react';

const AnalysisChat: React.FC = () => {
  // Ce composant sera refactorisé dans une prochaine version
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <Brain className="text-gray-400 mb-4" size={48} />
      <h3 className="text-lg font-semibold text-gray-700 mb-2">Chat IA en cours de développement</h3>
      <p className="text-gray-500 text-center">
        Cette fonctionnalité sera bientôt disponible pour vous aider à analyser vos investissements.
      </p>
    </div>
  );
};

export default AnalysisChat;

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Home, TrendingUp, Calculator, PieChart, Target, CheckCircle } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tips?: string[];
}

interface OnboardingTourProps {
  onClose: () => void;
}

export default function OnboardingTour({ onClose }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const steps: OnboardingStep[] = [
    {
      title: "Bienvenue sur Rentab'immo ! 👋",
      description: "Rentab'immo est votre outil pour analyser la rentabilité de vos investissements immobiliers. Que vous soyez débutant ou investisseur expérimenté, nous vous aidons à prendre les bonnes décisions.",
      icon: <Home className="w-16 h-16 text-blue-600" />,
      tips: [
        "Calculez précisément vos gains futurs",
        "Optimisez votre fiscalité",
        "Suivez vos objectifs financiers"
      ]
    },
    {
      title: "Ajoutez vos biens immobiliers",
      description: "Commencez par créer votre premier bien immobilier. Vous pouvez en ajouter autant que vous le souhaitez et les gérer tous au même endroit.",
      icon: <Home className="w-16 h-16 text-green-600" />,
      tips: [
        "Cliquez sur 'Ajouter un bien' dans la barre latérale",
        "Remplissez les informations de base (prix, adresse...)",
        "Pas de panique : vous pourrez tout modifier plus tard !"
      ]
    },
    {
      title: "Renseignez votre acquisition 💰",
      description: "Indiquez tous les frais liés à l'achat : prix du bien, frais de notaire, travaux, etc. C'est important car cela impacte directement votre rentabilité.",
      icon: <Calculator className="w-16 h-16 text-purple-600" />,
      tips: [
        "Prix d'achat : ce que vous payez au vendeur",
        "Frais de notaire : environ 7-8% du prix",
        "Travaux : toutes les rénovations prévues"
      ]
    },
    {
      title: "Configurez votre financement 🏦",
      description: "Renseignez votre prêt bancaire : montant emprunté, taux d'intérêt, durée. L'application calculera automatiquement vos mensualités et le coût total de votre crédit.",
      icon: <TrendingUp className="w-16 h-16 text-orange-600" />,
      tips: [
        "Apport personnel : ce que vous mettez de votre poche",
        "Taux d'intérêt : demandé par votre banque (ex: 3,5%)",
        "Durée : généralement entre 15 et 25 ans"
      ]
    },
    {
      title: "Définissez votre location 🏠",
      description: "Indiquez le loyer que vous comptez percevoir, les charges, et vos dépenses annuelles (taxe foncière, charges de copropriété, assurance...).",
      icon: <Home className="w-16 h-16 text-teal-600" />,
      tips: [
        "Loyer mensuel : ce que paiera votre locataire",
        "Charges : entretien, assurance, gestion...",
        "Soyez réaliste : comptez aussi la vacance locative !"
      ]
    },
    {
      title: "Choisissez votre régime fiscal 📋",
      description: "Selon votre situation, choisissez entre location nue (micro-foncier/réel) ou location meublée (LMNP). L'application calcule automatiquement vos impôts pour chaque régime.",
      icon: <PieChart className="w-16 h-16 text-red-600" />,
      tips: [
        "Location nue : appartement vide, fiscalité plus simple",
        "LMNP : appartement meublé, plus d'avantages fiscaux",
        "L'application compare tous les régimes pour vous"
      ]
    },
    {
      title: "Visualisez votre rentabilité 📊",
      description: "Le dashboard affiche un graphique de vos gains cumulés année par année. Vous pouvez voir l'évolution de votre patrimoine et atteindre vos objectifs financiers.",
      icon: <TrendingUp className="w-16 h-16 text-indigo-600" />,
      tips: [
        "Cash-flow : ce qu'il vous reste chaque mois",
        "Gain total : votre enrichissement global",
        "Objectifs : fixez vos ambitions financières"
      ]
    },
    {
      title: "Définissez vos objectifs 🎯",
      description: "Fixez un objectif de gain total à atteindre. L'application vous indiquera en quelle année vous l'atteindrez et combien de temps il vous faudra.",
      icon: <Target className="w-16 h-16 text-yellow-600" />,
      tips: [
        "Gain total : combien voulez-vous gagner ?",
        "Année cible : quand souhaitez-vous revendre ?",
        "Ajustez votre stratégie en temps réel"
      ]
    },
    {
      title: "Vous êtes prêt ! ✨",
      description: "Vous avez maintenant toutes les clés en main pour analyser vos investissements. N'hésitez pas à expérimenter : tous vos changements sont automatiquement sauvegardés.",
      icon: <CheckCircle className="w-16 h-16 text-green-600" />,
      tips: [
        "Créez plusieurs scénarios pour comparer",
        "Ajustez les paramètres pour optimiser",
        "Consultez régulièrement votre dashboard"
      ]
    }
  ];

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('onboarding_completed', 'true');
    }
    onClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setDontShowAgain(true);
    handleClose();
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-sm font-medium bg-white bg-opacity-20 px-3 py-1 rounded-full">
              Étape {currentStep + 1} sur {steps.length}
            </span>
          </div>
          <div className="w-full bg-white bg-opacity-20 rounded-full h-2 mt-3">
            <div
              className="bg-white h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            <div className="mb-6 animate-bounce">
              {currentStepData.icon}
            </div>

            {/* Title */}
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {currentStepData.title}
            </h2>

            {/* Description */}
            <p className="text-lg text-gray-600 mb-6 leading-relaxed max-w-lg">
              {currentStepData.description}
            </p>

            {/* Tips */}
            {currentStepData.tips && currentStepData.tips.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 w-full max-w-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-3 text-left flex items-center">
                  <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">💡</span>
                  Points clés :
                </h3>
                <ul className="space-y-2 text-left">
                  {currentStepData.tips.map((tip, index) => (
                    <li key={index} className="flex items-start text-sm text-gray-700">
                      <span className="text-blue-600 mr-2 mt-0.5">▸</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          {/* Don't show again checkbox */}
          <div className="flex items-center justify-center mb-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-600">
                Ne plus afficher ce guide
              </span>
            </label>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isFirstStep
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Précédent</span>
            </button>

            <button
              onClick={handleSkip}
              className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
            >
              Passer le guide
            </button>

            <button
              onClick={handleNext}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            >
              <span>{isLastStep ? 'Commencer' : 'Suivant'}</span>
              {!isLastStep && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


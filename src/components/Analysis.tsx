import React from 'react';
import { Investment } from '../types/investment';

interface Props {
  investment: Investment;
  statisticsData: {
    effort: number;
    cashFlow: number;
    saleBalance: number;
    totalReturn: number;
    annualReturn: number;
  };
}

const Analysis: React.FC<Props> = ({ investment, statisticsData }) => {
  const analyzeInvestmentStrategy = () => {
    const { cashFlow, saleBalance } = statisticsData;
    const monthlyCashFlow = cashFlow / 12;
    const purchasePrice = Number(investment.purchasePrice);
    const gainRatio = (saleBalance / purchasePrice) * 100;

    if (monthlyCashFlow >= 200 && gainRatio >= 20) {
      return "Cet investissement présente un excellent équilibre entre cash-flow mensuel et plus-value à la revente. Il génère des revenus immédiats tout en constituant un patrimoine valorisé.";
    } else if (monthlyCashFlow >= 200) {
      return "Cet investissement est orienté cash-flow. Il génère des revenus mensuels significatifs, idéal pour un complément de revenu immédiat ou un objectif de rente locative.";
    } else if (gainRatio >= 20) {
      return "Cet investissement est orienté plus-value. La rentabilité se fera principalement à la revente, ce qui correspond à une stratégie de constitution de patrimoine à long terme.";
    } else {
      return "Cet investissement présente un profil équilibré mais modéré, tant en termes de cash-flow que de plus-value. Des optimisations pourraient être envisagées pour améliorer l'un ou l'autre aspect.";
    }
  };

  const analyzeTaxRegimes = () => {
    const { selectedRegime } = investment;
    const monthlyCashFlow = statisticsData.cashFlow / 12;

    let analysis = "";

    // Analyse du régime sélectionné
    if (selectedRegime === 'micro-foncier') {
      analysis = "Le régime micro-foncier est simple mais peut être désavantageux si vos charges réelles dépassent 30% des revenus. ";
      if (monthlyCashFlow < 0) {
        analysis += "Compte tenu de votre cash-flow négatif, le régime réel pourrait être plus avantageux pour déduire l'ensemble de vos charges.";
      }
    } else if (selectedRegime === 'reel-foncier') {
      analysis = "Le régime réel permet la déduction de toutes les charges, y compris les intérêts d'emprunt. ";
      if (Number(investment.loanAmount) > 0) {
        analysis += "C'est particulièrement pertinent dans votre cas avec un financement par emprunt.";
      }
    } else if (selectedRegime === 'micro-bic') {
      analysis = "Le régime micro-BIC offre un abattement de 50% sur les revenus, mais ne permet pas la déduction des charges réelles. ";
      if (monthlyCashFlow >= 0) {
        analysis += "Avec un cash-flow positif, ce régime peut être intéressant si vos charges réelles sont inférieures à 50% des revenus.";
      }
    } else if (selectedRegime === 'reel-bic') {
      analysis = "Le régime réel BIC permet l'amortissement du bien et la déduction de toutes les charges. ";
      if (Number(investment.purchasePrice) > 100000) {
        analysis += "C'est particulièrement pertinent pour votre investissement important, permettant d'optimiser la fiscalité via l'amortissement.";
      }
    }

    return analysis;
  };

  const analyzeEffort = () => {
    const { effort } = statisticsData;
    const purchasePrice = Number(investment.purchasePrice);
    const effortRatio = (effort / purchasePrice) * 100;

    if (effortRatio <= 10) {
      return "L'effort d'investissement est très faible par rapport au prix d'achat (moins de 10%), ce qui maximise l'effet de levier du crédit. Cette stratégie permet d'optimiser la rentabilité des fonds propres mais augmente le risque financier.";
    } else if (effortRatio <= 20) {
      return "L'effort d'investissement est modéré (entre 10% et 20% du prix), offrant un bon équilibre entre effet de levier et sécurité. Cette approche équilibrée limite le risque tout en maintenant une bonne rentabilité des fonds propres.";
    } else {
      return "L'effort d'investissement est important (plus de 20% du prix), ce qui limite l'effet de levier mais sécurise l'opération. Cette approche prudente réduit les risques financiers mais peut limiter la rentabilité des fonds propres.";
    }
  };

  const analyzeCashFlow = () => {
    const { cashFlow } = statisticsData;
    const monthlyCashFlow = cashFlow / 12;
    const monthlyLoanPayment = Number(investment.monthlyPayment) || 0;

    let analysis = "";
    if (monthlyCashFlow >= 0) {
      if (monthlyCashFlow > monthlyLoanPayment * 0.5) {
        analysis = "Le cash-flow mensuel est très positif, dépassant 50% de la mensualité du crédit. L'investissement est fortement auto-financé et génère des revenus significatifs immédiatement.";
      } else if (monthlyCashFlow > 100) {
        analysis = "Le cash-flow mensuel est positif mais modéré. L'investissement s'auto-finance et dégage un petit revenu complémentaire.";
      } else {
        analysis = "Le cash-flow est légèrement positif, l'investissement s'auto-finance tout juste. La trésorerie est à surveiller en cas d'imprévus.";
      }
    } else {
      if (monthlyCashFlow > -monthlyLoanPayment * 0.2) {
        analysis = "Le cash-flow est légèrement négatif, nécessitant un effort mensuel modéré. Cette situation peut être acceptable si la stratégie vise la plus-value à terme.";
      } else {
        analysis = "Le cash-flow est significativement négatif, nécessitant un effort mensuel important. Cette situation peut être risquée à long terme sauf si la plus-value attendue est très importante.";
      }
    }
    return analysis;
  };

  const getGlobalRecommendation = () => {
    const { cashFlow, annualReturn } = statisticsData;
    const monthlyCashFlow = cashFlow / 12;
    const { selectedRegime } = investment;

    let recommendation = "";

    // Analyse de la performance globale
    if (annualReturn >= 8 && monthlyCashFlow >= 0) {
      recommendation = "L'investissement présente un excellent profil avec un bon rendement annuel et un cash-flow positif. ";
    } else if (annualReturn >= 5 && monthlyCashFlow >= -200) {
      recommendation = "L'investissement présente un bon potentiel malgré un cash-flow à surveiller. ";
    } else if (annualReturn >= 3) {
      recommendation = "L'investissement présente un potentiel modéré. ";
    } else {
      recommendation = "L'investissement présente des risques importants. ";
    }

    // Recommandations spécifiques selon le régime fiscal
    if (selectedRegime === 'micro-foncier' && Number(investment.loanAmount) > 0) {
      recommendation += "Envisagez le passage au régime réel pour optimiser la déduction des intérêts d'emprunt. ";
    } else if (selectedRegime === 'micro-bic' && monthlyCashFlow < 0) {
      recommendation += "Le passage au régime réel BIC permettrait de mieux déduire vos charges. ";
    }

    // Recommandations sur la stratégie
    if (monthlyCashFlow < 0 && statisticsData.saleBalance > 0) {
      recommendation += "Privilégiez une stratégie de valorisation à long terme plutôt que de revenus immédiats.";
    } else if (monthlyCashFlow > 0 && statisticsData.saleBalance < 0) {
      recommendation += "Concentrez-vous sur l'optimisation des revenus locatifs plutôt que sur la plus-value.";
    }

    return recommendation;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Analyse détaillée de l'investissement</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Stratégie d'investissement</h3>
            <p className="mt-1 text-gray-600">{analyzeInvestmentStrategy()}</p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900">Analyse du régime fiscal</h3>
            <p className="mt-1 text-gray-600">{analyzeTaxRegimes()}</p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900">Effort d'investissement</h3>
            <p className="mt-1 text-gray-600">{analyzeEffort()}</p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900">Analyse du cash-flow</h3>
            <p className="mt-1 text-gray-600">{analyzeCashFlow()}</p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recommandations</h3>
            <p className="mt-1 text-gray-600">{getGlobalRecommendation()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis; 
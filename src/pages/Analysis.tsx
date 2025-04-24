import React, { useState, useEffect } from 'react';
import { useInvestment } from '../contexts/InvestmentContext';
import { Investment } from '../types/investment';
import { processInvestmentAnalysis } from '../services/analysis';
import AnalysisChat from '../components/AnalysisChat';
import { Brain, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';

interface AnalysisSection {
  title: string;
  content: string;
  icon: React.ReactNode;
  color: string;
}

const Analysis: React.FC = () => {
  const { investment } = useInvestment();
  const [analysis, setAnalysis] = useState<AnalysisSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Calcul des statistiques
  const statisticsData = {
    effort: Number(investment?.downPayment) || 0,
    cashFlow: (investment?.monthlyCashFlow || 0) * 12,
    saleBalance: Number(investment?.purchasePrice || 0) * (1 + (investment?.appreciationValue || 0) / 100) - (investment?.loanAmount || 0),
    totalReturn: investment?.grossYield || 0,
    annualReturn: investment?.netYield || 0
  };

  useEffect(() => {
    if (investment) {
      analyzeInvestment(investment);
    }
  }, [investment]);

  const prepareInvestmentData = (investment: Investment) => {
    // Structurer les données pour l'IA avec des commentaires explicatifs
    return {
      general: {
        propertyName: investment.name,
        propertyType: investment.propertyType,
        description: investment.description,
        comment: "Informations générales sur le bien immobilier"
      },
      acquisition: {
        purchasePrice: investment.purchasePrice,
        notaryFees: investment.notaryFees,
        agencyFees: investment.agencyFees,
        renovationCosts: investment.renovationCosts,
        totalInvestment: investment.purchasePrice + investment.notaryFees + investment.agencyFees + investment.renovationCosts,
        comment: "Coûts liés à l'acquisition du bien"
      },
      financing: {
        downPayment: investment.downPayment,
        loanAmount: investment.loanAmount,
        loanDuration: investment.loanDuration,
        interestRate: investment.interestRate,
        monthlyPayment: investment.monthlyPayment,
        comment: "Structure du financement et caractéristiques du prêt"
      },
      revenues: {
        monthlyRent: investment.monthlyRent,
        yearlyRent: investment.monthlyRent * 12,
        comment: "Revenus locatifs attendus"
      },
      expenses: {
        propertyTax: investment.propertyTax,
        condoFees: investment.condoFees,
        propertyInsurance: investment.propertyInsurance,
        managementFees: investment.managementFees,
        maintenanceProvision: investment.maintenanceProvision,
        unpaidRentInsurance: investment.unpaidRentInsurance,
        yearlyExpenses: (investment.propertyTax + investment.condoFees * 12 + investment.propertyInsurance + 
                        investment.managementFees * 12 + investment.maintenanceProvision + investment.unpaidRentInsurance),
        comment: "Charges et dépenses annuelles"
      },
      cashFlow: {
        monthlyCashFlow: investment.monthlyCashFlow,
        yearlyCashFlow: investment.monthlyCashFlow * 12,
        cashFlowYears: investment.cashFlowYears,
        comment: "Flux de trésorerie mensuels et annuels"
      },
      profitability: {
        grossYield: investment.grossYield,
        netYield: investment.netYield,
        cashOnCashReturn: investment.cashOnCashReturn,
        comment: "Indicateurs de rentabilité"
      },
      taxation: {
        taxType: investment.taxType,
        taxationMethod: investment.taxationMethod,
        taxableIncome: investment.taxResults[investment.selectedRegime].taxableIncome,
        taxAmount: investment.taxResults[investment.selectedRegime].totalTax,
        comment: "Imposition et régime fiscal"
      },
      resale: {
        estimatedPrice: investment.purchasePrice * (1 + investment.appreciationValue/100),
        capitalGain: investment.capitalGainResults?.[investment.selectedRegime]?.netCapitalGain || 0,
        totalReturn: (investment.grossYield + investment.appreciationValue) || 0,
        annualReturn: investment.netYield || 0,
        comment: "Projection de revente et plus-value"
      }
    };
  };

  const analyzeInvestment = async (investment: Investment) => {
    setIsLoading(true);
    try {
      const structuredData = prepareInvestmentData(investment);
      const analysis = await processInvestmentAnalysis(structuredData);
      
      setAnalysis([
        {
          title: "Synthèse Globale",
          content: analysis.overview,
          icon: <Brain className="w-6 h-6" />,
          color: "text-blue-600"
        },
        {
          title: "Analyse Financière",
          content: analysis.financial,
          icon: <TrendingUp className="w-6 h-6" />,
          color: "text-green-600"
        },
        {
          title: "Analyse des Risques",
          content: analysis.risks,
          icon: <AlertTriangle className="w-6 h-6" />,
          color: "text-orange-600"
        },
        {
          title: "Recommandations",
          content: analysis.recommendations,
          icon: <Lightbulb className="w-6 h-6" />,
          color: "text-purple-600"
        }
      ]);
    } catch (error) {
      console.error('Error analyzing investment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeEffort = () => {
    const { effort } = statisticsData;
    const downPayment = Number(investment.downPayment);
    const purchasePrice = Number(investment.purchasePrice);
    const effortRatio = (effort / purchasePrice) * 100;

    if (effortRatio <= 10) {
      return "L'effort d'investissement est très faible par rapport au prix d'achat, ce qui est excellent pour l'effet de levier.";
    } else if (effortRatio <= 20) {
      return "L'effort d'investissement est modéré, offrant un bon équilibre entre risque et effet de levier.";
    } else {
      return "L'effort d'investissement est important, ce qui limite l'effet de levier mais réduit le risque.";
    }
  };

  const analyzeCashFlow = () => {
    const { cashFlow } = statisticsData;
    const monthlyCashFlow = cashFlow / 12;

    if (monthlyCashFlow >= 0) {
      if (monthlyCashFlow > 500) {
        return "Le cash-flow mensuel est très positif, l'investissement est auto-financé et génère des revenus significatifs.";
      } else if (monthlyCashFlow > 100) {
        return "Le cash-flow mensuel est positif, l'investissement est auto-financé avec une petite marge.";
      } else {
        return "Le cash-flow est légèrement positif, l'investissement s'auto-finance tout juste.";
      }
    } else {
      if (monthlyCashFlow > -100) {
        return "Le cash-flow est légèrement négatif, une petite contribution mensuelle est nécessaire.";
      } else if (monthlyCashFlow > -500) {
        return "Le cash-flow est négatif, une contribution mensuelle modérée est nécessaire.";
      } else {
        return "Le cash-flow est très négatif, une contribution mensuelle importante est nécessaire.";
      }
    }
  };

  const analyzeSaleBalance = () => {
    const { saleBalance, totalReturn, annualReturn } = statisticsData;
    const purchasePrice = Number(investment.purchasePrice);
    const gainRatio = (saleBalance / purchasePrice) * 100;

    let analysis = "";
    if (gainRatio >= 50) {
      analysis = "Le bilan de revente est excellent avec une forte plus-value.";
    } else if (gainRatio >= 20) {
      analysis = "Le bilan de revente est bon avec une plus-value significative.";
    } else if (gainRatio >= 0) {
      analysis = "Le bilan de revente est positif mais modeste.";
    } else {
      analysis = "Le bilan de revente est négatif, une moins-value est à prévoir.";
    }

    analysis += ` Le rendement total est de ${totalReturn.toFixed(1)}% `;
    analysis += `pour un rendement annuel moyen de ${annualReturn.toFixed(1)}%.`;

    return analysis;
  };

  const getGlobalRecommendation = () => {
    const { cashFlow, annualReturn } = statisticsData;
    const monthlyCashFlow = cashFlow / 12;

    if (annualReturn >= 8 && monthlyCashFlow >= 0) {
      return "Cet investissement présente un excellent profil risque/rendement. Il est recommandé de procéder.";
    } else if (annualReturn >= 5 && monthlyCashFlow >= -200) {
      return "Cet investissement présente un bon potentiel mais nécessite une surveillance du cash-flow.";
    } else if (annualReturn >= 3) {
      return "Cet investissement présente un potentiel modéré. Il serait judicieux d'explorer des optimisations possibles.";
    } else {
      return "Cet investissement présente des risques importants. Il est recommandé de revoir la stratégie ou d'explorer d'autres opportunités.";
    }
  };

  if (!investment) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Analyse de l'Investissement</h2>
        <p>Aucun investissement à analyser.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="w-8 h-8 text-indigo-600" />
        <h2 className="text-2xl font-bold">Analyse Détaillée de l'Investissement</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {analysis.map((section, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className={`p-4 border-b flex items-center gap-3 ${section.color} bg-opacity-5 bg-current`}>
                    {section.icon}
                    <h3 className="text-xl font-semibold">{section.title}</h3>
                  </div>
                  <div className="p-6 prose max-w-none">
                    {section.content.split('\n').map((paragraph, i) => (
                      <p key={i} className="mb-4 last:mb-0">{paragraph}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <AnalysisChat />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Analyse de l'investissement</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Effort d'investissement</h3>
              <p className="mt-1 text-gray-600">{analyzeEffort()}</p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900">Cash-flow</h3>
              <p className="mt-1 text-gray-600">{analyzeCashFlow()}</p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900">Bilan de revente</h3>
              <p className="mt-1 text-gray-600">{analyzeSaleBalance()}</p>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recommandation</h3>
              <p className="mt-1 text-gray-600">{getGlobalRecommendation()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analysis; 
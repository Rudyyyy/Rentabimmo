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
        taxationType: investment.taxationType,
        taxableIncome: investment.taxableIncome,
        taxAmount: investment.taxAmount,
        comment: "Imposition et régime fiscal"
      },
      resale: {
        estimatedResalePrice: investment.estimatedResalePrice,
        capitalGain: investment.capitalGain,
        totalReturn: investment.totalReturn,
        irr: investment.irr,
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
    </div>
  );
};

export default Analysis; 
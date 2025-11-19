import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Minimize2, Maximize2 } from 'lucide-react';
import { Investment } from '../types/investment';
import { processUserMessage } from '../services/openai';
import { processUserMessageWithMistral } from '../services/mistral';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  action?: 'create' | 'analyze' | 'optimize';
  investment?: Partial<Investment>;
}

interface Props {
  onUpdateInvestment?: (investment: Partial<Investment>) => void;
}

const InvestmentAssistant: React.FC<Props> = ({ onUpdateInvestment }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Détermine si nous sommes en environnement de développement
  const isDevelopment = import.meta.env.DEV;

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle chat opening with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: "Bonjour ! Je suis votre assistant d'investissement immobilier. Je peux vous aider à :\n\n" +
                "  • Créer une nouvelle simulation d'investissement\n" +
                "  • Analyser vos résultats\n" +
                "  • Optimiser votre stratégie\n\n" +
                "Comment puis-je vous aider aujourd'hui ?",
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Get the last investment data if it exists
      const lastInvestment = messages
        .filter(m => m.investment)
        .map(m => m.investment)
        .pop();

      // Process message with AI (GPT-4o-mini in both dev and prod)
      const aiResponse = isDevelopment
        ? await processUserMessageWithMistral(inputValue.trim(), {
            previousMessages: messages.map(m => ({
              role: m.type,
              content: m.content
            })),
            currentInvestment: lastInvestment
          })
        : await processUserMessage(inputValue.trim(), {
            previousMessages: messages.map(m => ({
              role: m.type,
              content: m.content
            })),
            currentInvestment: lastInvestment
          });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: aiResponse.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If we have investment data and a callback, update the investment
      if (aiResponse.suggestion && onUpdateInvestment) {
        onUpdateInvestment(aiResponse.suggestion);
      }

    } catch (error) {
      console.error('Error processing message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      ) : (
        <div className={`bg-white rounded-lg shadow-xl ${isMinimized ? 'w-64' : 'w-110'} h-[600px] flex flex-col`}>
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold">Assistant d'investissement</h3>
            <div className="flex items-center">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 ${
                  message.type === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`inline-block p-3 rounded-lg whitespace-pre-wrap ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="text-left">
                <div className="inline-block p-3 rounded-lg bg-gray-100 text-gray-800">
                  En train d'écrire...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2 items-center">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Tapez votre message..."
                className="flex-1 p-2 border rounded-lg resize-none"
                rows={1}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default InvestmentAssistant; 
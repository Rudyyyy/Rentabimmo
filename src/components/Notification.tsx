import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

const Notification: React.FC<NotificationProps> = ({ 
  message, 
  type, 
  onClose, 
  duration = 3000 
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className={`
        flex items-center p-4 rounded-lg shadow-lg
        ${type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}
      `}>
        {type === 'success' ? (
          <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 mr-2 text-red-500" />
        )}
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="ml-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Notification; 
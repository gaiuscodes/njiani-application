import { useEffect } from 'react';

const ErrorModal = ({ message, onClose, autoClose = true, duration = 5000 }) => {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-fade-in"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      
      {/* Modal */}
      <div 
        className="relative bg-dark-800 rounded-2xl shadow-2xl border border-primary-500/30 max-w-md w-full p-6 modal-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-center text-white mb-2">
          Oops! Access Denied
        </h3>

        {/* Message */}
        <p className="text-gray-300 text-center mb-6">
          {message || 'Invalid credentials. Please check your phone number and password and try again.'}
        </p>

        {/* Tips */}
        <div className="bg-dark-700/50 rounded-lg p-4 mb-6 border border-dark-600">
          <p className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
            <span>💡</span>
            <span>Quick Tips:</span>
          </p>
          <ul className="text-xs text-gray-400 space-y-1">
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Double-check your phone number format (e.g., 0700412580)</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Ensure your password is correct (case-sensitive)</span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>Make sure your account is verified</span>
            </li>
          </ul>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full btn-primary py-3 rounded-lg font-semibold transition-all hover:scale-105 active:scale-95"
        >
          Got it, let me try again
        </button>
      </div>
    </div>
  );
};

export default ErrorModal;


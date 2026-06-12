import { useState } from 'react';

const LogoutConfirm = ({ onConfirm, onCancel }) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleConfirm = () => {
    setIsExiting(true);
    setTimeout(() => {
      onConfirm();
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-gradient-to-br from-dark-800 via-dark-700 to-dark-800 rounded-2xl p-8 max-w-md w-full border-2 border-primary-500/30 shadow-2xl transform transition-all duration-300 ${isExiting ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
        {/* Urban Style Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4 animate-bounce">🚪</div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 bg-clip-text text-transparent mb-2">
            Hold Up!
          </h2>
          <p className="text-gray-300 text-lg">You're about to dip out</p>
        </div>

        {/* Urban Style Message */}
        <div className="bg-dark-900/50 rounded-xl p-6 mb-6 border border-primary-500/20">
          <p className="text-white text-center text-lg mb-2">
            Are you sure you want to bounce?
          </p>
          <p className="text-gray-400 text-center text-sm">
            You'll need to log back in to access the admin dashboard
          </p>
        </div>

        {/* Action Buttons - Urban Style */}
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-dark-700 hover:bg-dark-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 border-2 border-gray-600 hover:border-gray-500"
          >
            <span className="flex items-center justify-center gap-2">
              <span>✋</span>
              <span>Nah, Stay</span>
            </span>
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-red-500/50"
          >
            <span className="flex items-center justify-center gap-2">
              <span>✌️</span>
              <span>Yeah, Exit</span>
            </span>
          </button>
        </div>

        {/* Urban Style Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          💯 Secure logout • Your session will be cleared
        </p>
      </div>
    </div>
  );
};

export default LogoutConfirm;












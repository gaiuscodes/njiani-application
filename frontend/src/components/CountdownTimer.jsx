import { useState, useEffect } from 'react';

const CountdownTimer = ({ acceptedAt, estimatedTimeMinutes }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (!acceptedAt || !estimatedTimeMinutes) {
      setTimeRemaining(null);
      return;
    }

    const calculateTimeRemaining = () => {
      const accepted = new Date(acceptedAt);
      const deadline = new Date(accepted.getTime() + estimatedTimeMinutes * 60 * 1000);
      const now = new Date();
      const diff = deadline - now;

      if (diff <= 0) {
        setIsOverdue(true);
        const overdue = Math.abs(diff);
        const overdueHours = Math.floor(overdue / (1000 * 60 * 60));
        const overdueMinutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
        const overdueSeconds = Math.floor((overdue % (1000 * 60)) / 1000);
        setTimeRemaining({
          hours: overdueHours,
          minutes: overdueMinutes,
          seconds: overdueSeconds,
          total: overdue
        });
      } else {
        setIsOverdue(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining({
          hours,
          minutes,
          seconds,
          total: diff
        });
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [acceptedAt, estimatedTimeMinutes]);

  if (!timeRemaining) {
    return null;
  }

  const formatTime = (value) => {
    return value.toString().padStart(2, '0');
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${
      isOverdue 
        ? 'bg-red-900/30 border-red-500 animate-pulse' 
        : timeRemaining.total < 15 * 60 * 1000 
          ? 'bg-yellow-900/30 border-yellow-500' 
          : 'bg-green-900/30 border-green-500'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-semibold ${isOverdue ? 'text-red-400' : 'text-gray-300'}`}>
            {isOverdue ? '⏰ Overdue by' : '⏱️ Time Remaining'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {timeRemaining.hours > 0 && (
              <div className="text-center">
                <div className={`text-2xl font-bold ${isOverdue ? 'text-red-400' : 'text-white'}`}>
                  {formatTime(timeRemaining.hours)}
                </div>
                <div className="text-xs text-gray-400">Hours</div>
              </div>
            )}
            {timeRemaining.hours > 0 && <span className={`text-xl ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>:</span>}
            <div className="text-center">
              <div className={`text-2xl font-bold ${isOverdue ? 'text-red-400' : 'text-white'}`}>
                {formatTime(timeRemaining.minutes)}
              </div>
              <div className="text-xs text-gray-400">Minutes</div>
            </div>
            <span className={`text-xl ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>:</span>
            <div className="text-center">
              <div className={`text-2xl font-bold ${isOverdue ? 'text-red-400' : 'text-white'}`}>
                {formatTime(timeRemaining.seconds)}
              </div>
              <div className="text-xs text-gray-400">Seconds</div>
            </div>
          </div>
        </div>
        {isOverdue && (
          <div className="text-right">
            <p className="text-red-400 font-bold text-lg">⚠️</p>
            <p className="text-red-400 text-xs">Delayed</p>
          </div>
        )}
      </div>
      {!isOverdue && timeRemaining.total < 15 * 60 * 1000 && (
        <p className="text-yellow-400 text-xs mt-2">⚠️ Less than 15 minutes remaining!</p>
      )}
    </div>
  );
};

export default CountdownTimer;












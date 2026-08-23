import React, { useEffect, useState } from 'react';

export default function AuctionTimer({ endTime, status }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isEndingSoon, setIsEndingSoon] = useState(false);

  useEffect(() => {
    if (status !== 'ACTIVE') {
      setTimeLeft('Ended');
      return;
    }

    const tick = () => {
      const diff = new Date(endTime) - new Date();
      if (diff <= 0) {
        setTimeLeft('Ended');
        return;
      }
      const days = Math.floor(diff / 86400000);
      const hrs  = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      if (days > 0) setTimeLeft(`${days}d ${hrs}h ${mins}m`);
      else if (hrs > 0) setTimeLeft(`${hrs}h ${mins}m ${secs}s`);
      else setTimeLeft(`${mins}m ${secs}s`);

      setIsEndingSoon(diff < 300000); // < 5 minutes
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [endTime, status]);

  return (
    <span className={`auction-timer ${isEndingSoon ? 'ending-soon' : ''}`}>
      {timeLeft}
    </span>
  );
}

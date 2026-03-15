import React, { useState, useEffect } from 'react';
import { getDeviceId } from '../utils/deviceId';
import API from '../utils/api';

const InterestedButton = ({ eventId, currentInterested = 0, onInterestedChange }) => {
  const [interestedCount, setInterestedCount] = useState(currentInterested);
  const [isInterested, setIsInterested] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const deviceId = getDeviceId();
    const interestedKey = `interested_event_${eventId}_${deviceId}`;
    setIsInterested(localStorage.getItem(interestedKey) === 'true');
  }, [eventId]);

  const handleInterested = async () => {
    try {
      setLoading(true);
      const deviceId = getDeviceId();
      const interestedKey = `interested_event_${eventId}_${deviceId}`;

      if (isInterested) {
        // Remove interested
        await API.post(`/events/${eventId}/interested`, { 
          action: 'remove',
          deviceId 
        });
        setInterestedCount(prev => Math.max(0, prev - 1));
        localStorage.removeItem(interestedKey);
        setIsInterested(false);
      } else {
        // Mark as interested
        await API.post(`/events/${eventId}/interested`, { 
          action: 'add',
          deviceId 
        });
        setInterestedCount(prev => prev + 1);
        localStorage.setItem(interestedKey, 'true');
        setIsInterested(true);
      }

      if (onInterestedChange) {
        onInterestedChange(isInterested ? interestedCount - 1 : interestedCount + 1);
      }
    } catch (error) {
      console.error('Error updating interested:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleInterested}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-all ${
        isInterested
          ? 'bg-blue-500 text-white'
          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      <span>👍</span>
      <span className="text-sm font-medium">{interestedCount}</span>
    </button>
  );
};

export default InterestedButton;

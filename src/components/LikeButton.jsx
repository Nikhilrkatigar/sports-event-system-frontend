import React, { useState, useEffect } from 'react';
import { getDeviceId } from '../utils/deviceId';
import API from '../utils/api';

const LikeButton = ({ eventId, currentLikes = 0, onLikeChange }) => {
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Handle both array and number formats for currentLikes
    const count = Array.isArray(currentLikes) ? currentLikes.length : (currentLikes || 0);
    setLikeCount(count);
    
    const deviceId = getDeviceId();
    const likedKey = `liked_event_${eventId}_${deviceId}`;
    setIsLiked(localStorage.getItem(likedKey) === 'true');
  }, [eventId, currentLikes]);

  const handleLike = async () => {
    try {
      setLoading(true);
      const deviceId = getDeviceId();
      const likedKey = `liked_event_${eventId}_${deviceId}`;

      if (isLiked) {
        // Unlike
        await API.post(`/events/${eventId}/like`, { 
          action: 'unlike',
          deviceId 
        });
        setLikeCount(prev => Math.max(0, prev - 1));
        localStorage.removeItem(likedKey);
        setIsLiked(false);
      } else {
        // Like
        await API.post(`/events/${eventId}/like`, { 
          action: 'like',
          deviceId 
        });
        setLikeCount(prev => prev + 1);
        localStorage.setItem(likedKey, 'true');
        setIsLiked(true);
      }

      if (onLikeChange) {
        onLikeChange(isLiked ? likeCount - 1 : likeCount + 1);
      }
    } catch (error) {
      console.error('Error updating like:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
        isLiked
          ? 'bg-red-50 text-red-500'
          : 'bg-transparent text-gray-600 hover:text-red-500'
      }`}
    >
      <span className="text-xl">❤️</span>
      {likeCount > 0 && <span className="text-sm font-medium">{likeCount}</span>}
    </button>
  );
};

export default LikeButton;

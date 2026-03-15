import React, { useState } from 'react';

const ShareButton = ({ eventId, eventName, eventDate }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/events/${eventId}`;
    const shareText = `Check out this event: ${eventName} on ${eventDate}`;

    // Try Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: eventName,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
    >
      <span>🔗</span>
      <span className="text-sm font-medium">
        {copied ? 'Copied!' : 'Share'}
      </span>
    </button>
  );
};

export default ShareButton;

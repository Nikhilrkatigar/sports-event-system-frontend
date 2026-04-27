import { useState, useEffect } from 'react';

export default function WelcomeSplash({ onComplete }) {
  const [isExiting, setIsExiting] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [displaySubtext, setDisplaySubtext] = useState('');
  
  const fullText = 'Welcome to IDCL 2k26 Season 3';
  const subtextDisplay = 'Get ready to compete, celebrate, and shine';

  useEffect(() => {
    // Typewriter effect for main text
    let index = 0;
    const textInterval = setInterval(() => {
      if (index <= fullText.length) {
        setDisplayText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(textInterval);
        
        // Start subtext animation after main text completes
        setTimeout(() => {
          let subIndex = 0;
          const subtextInterval = setInterval(() => {
            if (subIndex <= subtextDisplay.length) {
              setDisplaySubtext(subtextDisplay.slice(0, subIndex));
              subIndex++;
            } else {
              clearInterval(subtextInterval);
              
              // Complete splash after all animations
              setTimeout(() => {
                setIsExiting(true);
                setTimeout(() => {
                  onComplete();
                }, 500);
              }, 1500);
            }
          }, 30);
        }, 300);
      }
    }, 60); // Smooth typewriter speed

    return () => clearInterval(textInterval);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 transition-opacity duration-500 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
        <div className="absolute -bottom-8 right-20 w-72 h-72 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-8">
        <div className="space-y-6">
          {/* Typewriter text effect */}
          <h1 className="text-5xl sm:text-7xl font-bold text-white h-24 flex items-center justify-center">
            {displayText}
            {displayText.length < fullText.length && (
              <span className="ml-1 animate-pulse">|</span>
            )}
          </h1>

          {/* Subtext typewriter */}
          {displayText === fullText && (
            <p className="text-white text-lg sm:text-xl opacity-90 h-8 flex items-center justify-center">
              {displaySubtext}
              {displaySubtext.length < subtextDisplay.length && (
                <span className="ml-1 animate-pulse">|</span>
              )}
            </p>
          )}

          {/* Loading animation - appears after all text */}
          {displaySubtext === subtextDisplay && (
            <div className="mt-8 flex justify-center gap-2">
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

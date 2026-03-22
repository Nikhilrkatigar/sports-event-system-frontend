import { useEffect } from 'react';

export default function HypeAnimation({ isActive, onComplete }) {
  useEffect(() => {
    if (!isActive) return;

    // Create confetti/stars
    const container = document.querySelector('.hype-animation-container');
    if (!container) return;

    const stars = [];
    for (let i = 0; i < 30; i++) {
      const star = document.createElement('div');
      star.innerHTML = '⭐';
      star.style.position = 'fixed';
      star.style.fontSize = '24px';
      star.style.pointerEvents = 'none';
      star.style.zIndex = '9999';
      star.style.left = Math.random() * window.innerWidth + 'px';
      star.style.top = '-30px';
      star.style.animation = `fallStars ${2 + Math.random()}s linear forwards`;
      star.style.opacity = '1';
      document.body.appendChild(star);
      stars.push(star);
    }

    // Also create confetti effect
    const confetti = [];
    for (let i = 0; i < 40; i++) {
      const conf = document.createElement('div');
      conf.innerHTML = '🎉';
      conf.style.position = 'fixed';
      conf.style.fontSize = '20px';
      conf.style.pointerEvents = 'none';
      conf.style.zIndex = '9999';
      conf.style.left = Math.random() * window.innerWidth + 'px';
      conf.style.top = Math.random() * window.innerHeight + 'px';
      conf.style.animation = `popConfetti ${1.5 + Math.random()}s ease-out forwards`;
      document.body.appendChild(conf);
      confetti.push(conf);
    }

    const cleanup = () => {
      stars.forEach(s => s.remove());
      confetti.forEach(c => c.remove());
      if (onComplete) onComplete();
    };

    const timer = setTimeout(cleanup, 3000);
    return () => {
      clearTimeout(timer);
      stars.forEach(s => s.remove());
      confetti.forEach(c => c.remove());
    };
  }, [isActive, onComplete]);

  return (
    <>
      <style>{`
        @keyframes fallStars {
          to {
            transform: translateY(${window.innerHeight}px) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes popConfetti {
          0% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
          50% {
            transform: scale(1.2) translateY(-50px);
          }
          100% {
            transform: scale(0.5) translateY(100px);
            opacity: 0;
          }
        }
      `}</style>
      <div className="hype-animation-container" />
    </>
  );
}

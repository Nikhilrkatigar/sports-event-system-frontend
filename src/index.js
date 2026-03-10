import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);

// Register Service Worker only in production
if ('serviceWorker' in navigator) {
  if (process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/serviceWorker.js')
        .then((registration) => {
          setInterval(() => {
            registration.update();
          }, 60000);
        })
        .catch(() => {});
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Service worker updated
    });
  } else {
    // In development, make sure any existing SW is removed to prevent cache issues.
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      })
      .catch(() => {});
  }
}

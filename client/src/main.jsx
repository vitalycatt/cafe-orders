import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/app.css';

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  if (parseFloat(tg.version || '0') >= 8.0) {
    tg.requestFullscreen();
  }
}

window.addEventListener('error', (e) => {
  const msg = e.error?.stack || e.message || 'Unknown error';
  alert('JS Error:\n' + msg);
});

window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  const msg = reason?.stack || reason?.message || JSON.stringify(reason);
  alert('Unhandled rejection:\n' + msg);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

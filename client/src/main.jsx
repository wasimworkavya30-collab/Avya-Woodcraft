import React from 'react';
import { createRoot } from 'react-dom/client';
import { Router } from './router.jsx';
import { AuthProvider } from './auth.jsx';
import { ToastProvider } from './ui.jsx';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>,
);

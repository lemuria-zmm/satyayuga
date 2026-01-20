import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { GameProvider } from './context/GameContext';
import { LanguageProvider } from './context/LanguageContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </LanguageProvider>
  </React.StrictMode>
);

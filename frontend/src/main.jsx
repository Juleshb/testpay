import './i18n/index.js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { AuthProvider } from './AuthContext.jsx';
import { CommunityUnreadProvider } from './CommunityUnreadContext.jsx';
import AnimatedBackground from './components/AnimatedBackground.jsx';
import App from './App.jsx';
import './index.css';

registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CommunityUnreadProvider>
          <AnimatedBackground>
            <App />
          </AnimatedBackground>
        </CommunityUnreadProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);

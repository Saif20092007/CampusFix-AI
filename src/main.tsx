import {createRoot} from 'react-dom/client';
import './firebase';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker
registerSW({
  immediate: true,
  onOfflineReady() {
    console.log('[CampusFix PWA] Service worker registered and app is ready for offline operation.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);

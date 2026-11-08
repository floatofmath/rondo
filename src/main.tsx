import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installAudioUnlock } from './audio/cues';
import { App } from './ui/App';
import './ui/styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

installAudioUnlock();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

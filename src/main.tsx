import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

const globalStyles = document.createElement('style');
globalStyles.innerHTML = `
  html, body { margin: 0; padding: 0; width: 320px; background-color: #282c34; overflow-x: hidden; }
  #root { width: 100%; }
`;
document.head.appendChild(globalStyles);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

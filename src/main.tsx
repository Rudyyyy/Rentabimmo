import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupPdfWorker } from './utils/pdfWorkerSetup'

// Initialiser le worker PDF.js avant le rendu de l'application
setupPdfWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
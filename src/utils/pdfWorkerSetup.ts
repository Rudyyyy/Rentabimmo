import * as pdfjsLib from 'pdfjs-dist';

// Configuration du worker PDF.js pour le navigateur
// Cela permet d'éviter les erreurs liées au worker lors de l'utilisation de PDF.js
export function setupPdfWorker() {
  // Définir l'URL du worker de PDF.js
  // On utilise une CDN pour éviter d'avoir à le packager avec l'application
  const pdfWorkerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
  
  console.log('PDF.js worker configuré avec succès, version:', pdfjsLib.version);
}

export default setupPdfWorker; 
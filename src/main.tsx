import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/app';
import './ui/global.css';

const container = document.getElementById('app');
if (!container) {
  throw new Error('No se encontró el elemento #app');
}

// Modo de grabación del vídeo de presentación (`?grabar=<clip>`). Solo existe en desarrollo o en
// un build con `--mode grabacion`: en el build publicado esta rama se elimina entera.
const recordingClip =
  import.meta.env.DEV || import.meta.env.MODE === 'grabacion'
    ? new URLSearchParams(window.location.search).get('grabar')
    : null;

if (recordingClip) {
  void import('./recording/recording_mode').then(({ startRecording }) =>
    startRecording(recordingClip, container),
  );
} else {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

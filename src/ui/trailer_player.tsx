import { useEffect, useRef } from 'react';

// Versión web del vídeo de presentación (npm run video:web la genera desde video/out/).
const TRAILER = `${import.meta.env.BASE_URL}trailer/forja_abisal_trailer.mp4`;
const POSTER = `${import.meta.env.BASE_URL}trailer/forja_abisal_trailer.jpg`;

interface TrailerPlayerProps {
  /** Volumen general de las opciones (0 a 1). */
  volume: number;
  onClose: () => void;
}

/**
 * Tráiler a pantalla completa desde el menú principal. Arranca solo (el clic en «Ver tráiler»
 * permite que suene) y se cierra con Esc, con el botón o al terminar.
 */
export function TrailerPlayer({ volume, onClose }: TrailerPlayerProps) {
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    void video.current?.play().catch(() => {
      // Si el navegador no deja reproducir solo, quedan los controles del vídeo.
    });
  }, []);

  useEffect(() => {
    if (video.current) video.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="trailer" role="dialog" aria-label="Tráiler de Forja Abisal">
      <video
        ref={video}
        className="trailer-video"
        src={TRAILER}
        poster={POSTER}
        controls
        playsInline
        preload="auto"
        onEnded={onClose}
      />
      <button
        type="button"
        className="menu-button menu-button-secondary trailer-close"
        onClick={onClose}
      >
        Cerrar (Esc)
      </button>
    </div>
  );
}

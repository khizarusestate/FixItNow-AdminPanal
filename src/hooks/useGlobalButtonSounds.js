import { useEffect } from 'react';
import { playClickSound } from '../utils/soundEffects.js';

/**
 * useGlobalButtonSounds - Adds click sounds to all buttons
 */
export function useGlobalButtonSounds() {
  useEffect(() => {
    const handleButtonClick = (e) => {
      if (
        e.target.tagName === 'BUTTON' ||
        e.target.closest('button') ||
        e.target.getAttribute('role') === 'button' ||
        e.target.onclick
      ) {
        playClickSound();
      }
    };

    document.addEventListener('click', handleButtonClick, { capture: true });

    return () => {
      document.removeEventListener('click', handleButtonClick, { capture: true });
    };
  }, []);
}

export function useButtonSound(callback) {
  const handleClick = (...args) => {
    playClickSound();
    if (callback) {
      callback(...args);
    }
  };

  return handleClick;
}

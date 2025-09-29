import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

// Web-specific polyfills and setup
if (Platform.OS === 'web') {
  // Ensure proper meta viewport tag for responsive design
  if (typeof document !== 'undefined') {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1, shrink-to-fit=no';
      document.head.appendChild(meta);
    }

    // Add touch-action CSS for better touch handling
    const style = document.createElement('style');
    style.textContent = `
      body {
        touch-action: pan-x pan-y;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
        overscroll-behavior: none;
      }
      
      /* Prevent unwanted scrolling on game board */
      .game-board {
        touch-action: none;
      }
      
      /* Ensure proper font rendering */
      * {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    `;
    document.head.appendChild(style);
  }
}

registerRootComponent(App);

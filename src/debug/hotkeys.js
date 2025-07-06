import { debugOptions } from './debugOptions.js';

window.addEventListener('keydown', e => {
  switch (e.key.toLowerCase()) {
    case 'z':
      debugOptions.showZones = !debugOptions.showZones;
      break;
    case 'f':
      debugOptions.showFOV = !debugOptions.showFOV;
      break;
    case 'r':
      debugOptions.showRadar = !debugOptions.showRadar;
      break;
    case 'i':
      debugOptions.showIntents = !debugOptions.showIntents;
      break;
    case 'b':
      debugOptions.showBallDebug = !debugOptions.showBallDebug;
      break;
    case 'd':
      debugOptions.showDribbleSide = !debugOptions.showDribbleSide;
      break;
    // Weitere Tasten nach Bedarf
  }
  console.log('Toggled debug:', debugOptions);
});

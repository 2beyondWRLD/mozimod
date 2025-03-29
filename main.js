// main.js (updated version)
import gameConfig from './src/config/gameConfig.js';

// Create the Phaser game instance
const game = new Phaser.Game(gameConfig);

// Ensure global access to the game object if needed
window.game = game;

// Start the initial scene
game.scene.start('MenuScene');

// Add error handler for debugging
window.addEventListener('error', function(event) {
  console.error('Runtime error detected:', event.error);
});
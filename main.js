// main.js (explicit game entry point)
import gameConfig from './src/config/gameConfig.js';

const game = new Phaser.Game(gameConfig);

// Explicitly start your initial scene after game initialization
game.scene.start('MenuScene');

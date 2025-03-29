// gameConfig.js (explicitly corrected with imports)

// Import all scenes explicitly
import MenuScene from '../scenes/MenuScene.js';
import MainGameScene from '../scenes/MainGameScene.js';
import FishingScene from '../scenes/FishingScene.js';
import CampingScene from '../scenes/CampingScene.js';
import VillageCommons from '../scenes/VillageCommons.js';
import ScavengerMode from '../scenes/ScavengerMode.js';

export default {
  type: Phaser.AUTO,
  parent: 'phaser-game',
  width: 800,
  height: 600,
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: [
    MenuScene,          // Now explicitly imported correctly
    MainGameScene,
    FishingScene,
    CampingScene,
    VillageCommons,
    ScavengerMode
  ]
};

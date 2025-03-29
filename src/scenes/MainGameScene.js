// MainGameScene.js

import { preloadScene, createScene } from '../core/sceneManager.js';
import { handlePlayerMovement, updatePlayerVisuals, createPlayerAnimations } from '../player/player.js';
import { updateHUD } from '../ui/uiManager.js';
import { createMiniMap, updateMiniMap } from '../navigation/navigationSystem.js';
import { createClickableExclamation } from '../interactions/interactionManager.js';
import { initializeNarrative, showPrologue, endFlow, SCREEN_PROLOGUE } from '../narrative/narrativeManager.js';

// Temporarily add explicit zone data directly here
const defaultZoneData = {
  name: "Village",
  mapKey: "villageMap",
  backgroundKey: "villageBackground",
  foregroundKey: "villageForeground"
};

export default class MainGameScene extends Phaser.Scene {
  constructor() {
    super('MainGameScene');
  }

  preload() {
    // Ensure zoneData is explicitly defined
    const zoneData = this.registry.get('currentZoneData') || defaultZoneData;
    this.registry.set('currentZoneData', zoneData);

    preloadScene(this, zoneData);

    // Explicitly preload player sprite
    this.load.spritesheet('player', 'assets/images/player.png', {
      frameWidth: 48,
      frameHeight: 48
    });
  }

  create(data) {
    const zoneData = data.zone || this.registry.get('currentZoneData') || defaultZoneData;

    createScene(this, { 
      zone: zoneData, 
      inventory: data.inventory || [], 
      oromozi: data.oromozi || 1000
    });

    createPlayerAnimations(this);

    initializeNarrative(this);
    showPrologue(this);

    createClickableExclamation(this);

    const mapX = this.game.config.width - 110;
    const mapY = 10;
    createMiniMap(this, mapX, mapY, 100);
  }

  update(time, delta) {
    handlePlayerMovement(this);
    updatePlayerVisuals(this);
    updateHUD(this);
    updateMiniMap(this, this.game.config.width - 110, 10, 100);

    if (this.narrativeScreen === SCREEN_PROLOGUE && this.input.keyboard.checkDown(this.input.keyboard.addKey('SPACE'), 500)) {
      endFlow(this);
    }
  }
}

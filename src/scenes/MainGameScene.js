// MainGameScene.js (fixed version)

import { preloadScene, createScene } from '../core/sceneManager.js';
import { handlePlayerMovement, updatePlayerVisuals, createPlayerAnimations } from '../player/player.js';
import { updateHUD } from '../ui/uiManager.js';
import { createMiniMap, updateMiniMap } from '../navigation/navigationSystem.js';
import { createClickableExclamation } from '../interactions/interactionManager.js';
import { initializeNarrative, showPrologue, endFlow, SCREEN_PROLOGUE } from '../narrative/narrativeManager.js';

export default class MainGameScene extends Phaser.Scene {
  constructor() {
    super('MainGameScene');
    
    // Define zone list here to make it available throughout the class
    this.zoneList = [
      {
        name: "Village",
        mapKey: "villageMap",
        backgroundKey: "villageCommons",
        foregroundKey: "",
        spawnX: 100,
        spawnY: 100,
        bgScale: 0.3
      },
      {
        name: "Outer Grasslands",
        mapKey: "outerGrasslands",
        backgroundKey: "outerGrasslands",
        foregroundKey: "outerGrasslandsForeground",
        spawnX: 100,
        spawnY: 100,
        bgScale: 0.3
      },
      {
        name: "Shady Grove",
        mapKey: "shadyGrove",
        backgroundKey: "shadyGrove",
        foregroundKey: "shadyGroveforeground",
        spawnX: 100,
        spawnY: 100,
        bgScale: 0.3
      },
      {
        name: "Arid Desert",
        mapKey: "aridDesert",
        backgroundKey: "aridDesert",
        foregroundKey: "aridDesertforeground",
        spawnX: 100,
        spawnY: 100,
        bgScale: 0.3
      }
    ];
  }

  preload() {
    // Default to Village zone if nothing is set
    const zoneData = this.registry.get('currentZoneData') || this.zoneList[0];
    this.registry.set('currentZoneData', zoneData);

    // Preload map and background assets
    this.load.json(zoneData.mapKey, `assets/maps/${zoneData.mapKey}.json`);
    this.load.image(zoneData.backgroundKey, `assets/backgrounds/${zoneData.backgroundKey}.png`);
    if (zoneData.foregroundKey) {
      this.load.image(zoneData.foregroundKey, `assets/foregrounds/${zoneData.foregroundKey}.png`);
    }

    // Preload player sprite
    this.load.spritesheet('player', 'assets/sprites/player.png', {
      frameWidth: 48,
      frameHeight: 48
    });
    
    // Load exclamation icon for interactive elements
    this.load.image('exclamation', 'assets/sprites/exclamation.png');
    
    // Load loot table for inventory system
    this.load.json('lootTable', 'data/lootTable.json');
    
    // Load narrative data
    this.load.json('narrativePrologues', 'data/narrativePrologues.json');
    this.load.json('narrativePrompts', 'data/narrativeprompt.json');
  }

  create(data) {
    // Get zone data from registry or use data passed to scene
    const zoneData = data?.zone || this.registry.get('currentZoneData') || this.zoneList[0];

    // Create the scene with zone data and inventory
    createScene(this, { 
      zone: zoneData, 
      inventory: data?.inventory || [], 
      oromozi: data?.oromozi || 1000,
      playerStats: data?.playerStats
    });

    // Initialize player animations
    createPlayerAnimations(this);

    // Initialize narrative system
    initializeNarrative(this);
    showPrologue(this);

    // Create interactive elements
    createClickableExclamation(this);

    // Create minimap in top right corner
    const mapX = this.game.config.width - 110;
    const mapY = 10;
    createMiniMap(this, mapX, mapY, 100);
  }

  update(time, delta) {
    handlePlayerMovement(this);
    updatePlayerVisuals(this);
    updateHUD(this);
    updateMiniMap(this, this.game.config.width - 110, 10, 100);

    // Handle space key for narrative progression
    if (this.narrativeScreen === SCREEN_PROLOGUE && 
        this.input.keyboard.checkDown(this.input.keyboard.addKey('SPACE'), 500)) {
      endFlow(this);
    }
  }
}
// Import all necessary systems and utilities
import { createInitialStats } from '../player/player.js';
import { showDialog, hideDialog, updateHUD, createHUD } from '../ui/uiManager.js';
import { spawnMultipleLootCrates, hitCrate, getRandomLootForZone, addToInventory } from '../inventory/inventorySystem.js';
import { createMiniMap, updateMiniMap } from '../navigation/navigationSystem.js';
import { initializeNarrative, showPrompt, SCREEN_NONE, SCREEN_PROLOGUE, SCREEN_PROMPT } from '../narrative/narrativeManager.js';
import { createSimpleEffect, createFloatingText } from '../utils/utils.js';
import { spawnMultipleExclamations, getOverlappingExclamation } from '../interactions/interactionManager.js';

// Define the necessary constants
const BG_SCALE = 0.3;
const PLAYER_SCALE = 2.5;

// Define the SCAVENGER_ZONES constant
const SCAVENGER_ZONES = [
  {
    name: "Outer Grasslands",
    mapKey: "outerGrasslands",
    backgroundKey: "outerGrasslands",
    foregroundKey: "outerGrasslandsForeground",
    spawnX: 100,
    spawnY: 100,
    bgScale: BG_SCALE
  },
  {
    name: "Shady Grove",
    mapKey: "shadyGrove",
    backgroundKey: "shadyGrove",
    foregroundKey: "shadyGroveforeground",
    spawnX: 100,
    spawnY: 100,
    bgScale: BG_SCALE
  },
  {
    name: "Arid Desert",
    mapKey: "aridDesert",
    backgroundKey: "aridDesert",
    foregroundKey: "aridDesertforeground",
    spawnX: 100,
    spawnY: 100,
    bgScale: BG_SCALE
  }
];

export default class ScavengerMode extends Phaser.Scene {
  constructor() {
    super('ScavengerMode');

    // Core properties
    this.playerStats = null;
    this.localInventory = null;
    this.background = null;
    this.player = null;
    this.hudText = null;
    this.obstacles = null;
    this.lootCrates = null;
    this.exclamations = null;
    this.playerShadow = null;
    
    // Dialog system
    this.dialogBg = null;
    this.dialogText = null;
    this.isDialogOpen = false;
    
    // Input controls
    this.cursors = null;
    this.wasdKeys = null;
    this.actionKeys = null;
    
    // Narrative system
    this.narrativeScreen = SCREEN_NONE;
    this.promptCount = 0;
    this.activePrompt = null;
    this.chosenOptionIndex = -1;
    
    // World settings
    this.currentZone = null;
    this.bgScale = BG_SCALE;
    this.isAttacking = false;
    this.lastDirection = "down";
    
    // Game time tracking
    this.secondsPerDay = 240;
    this.secondsPerHour = this.secondsPerDay / 24;
    
    // Tracking arrays
    this.exclamationSprites = [];
    this.miniMapMonsters = [];
    this.miniMapCrates = [];
    this.logMessages = [];
  }

  preload() {
    console.log("ScavengerMode preload started");
    
    // Load assets for all zones
    SCAVENGER_ZONES.forEach(zone => {
      this.load.json(zone.mapKey, `assets/maps/${zone.mapKey}.json`);
      this.load.image(zone.backgroundKey, `assets/backgrounds/${zone.backgroundKey}.png`);
      if (zone.foregroundKey) {
        this.load.image(zone.foregroundKey, `assets/foregrounds/${zone.foregroundKey}.png`);
      }
    });
    
    // Load player sprite
    this.load.spritesheet("player", "assets/sprites/player.png", { 
      frameWidth: 48, 
      frameHeight: 48 
    });
    
    // Load other required assets
    this.load.image('exclamation', 'assets/sprites/exclamation.png');
    this.load.spritesheet('loot_crate', 'assets/sprites/crate.png', {
      frameWidth: 32,
      frameHeight: 32
    });
    
    // Load narrative data
    this.load.json('lootTable', 'data/lootTable.json');
    this.load.json('narrativePrologues', 'data/narrativePrologues.json');
    this.load.json('narrativePrompts', 'data/narrativeprompt.json');
    
    console.log("ScavengerMode preload completed");
  }

  create(data) {
    console.log("ScavengerMode create started with data:", data);
    
    // Initialize scene with zone data
    const zoneData = data.zone || SCAVENGER_ZONES[0];
    console.log("Using zone:", zoneData.name);
    
    // Initialize player stats and inventory
    this.playerStats = data.playerStats || createInitialStats(zoneData.name);
    this.localInventory = data.inventory || [{ name: "Bread", quantity: 1 }];
    this.currentZone = zoneData.name;
    this.playerStats.currentZone = this.currentZone;
    this.promptCount = data.promptCount || 0;
    
    // Set up time system
    if (!this.registry.get('gameTime')) {
      this.registry.set('gameTime', 0);
    }
    
    // Create background and set up physics boundaries
    this.background = this.add.image(0, 0, zoneData.backgroundKey)
      .setOrigin(0, 0)
      .setScale(BG_SCALE);
    
    // Setup world physics
    this.physics.world.setBounds(0, 0, this.background.displayWidth, this.background.displayHeight);
    this.cameras.main.setBounds(0, 0, this.background.displayWidth, this.background.displayHeight);
    
    // Create obstacles group
    this.obstacles = this.physics.add.staticGroup();
    
    // Setup objects and collisions from map
    const mapData = this.cache.json.get(zoneData.mapKey);
    this.setupMapObjects(mapData, zoneData, BG_SCALE);
    
    // Create player and shadow
    this.player = this.physics.add.sprite(zoneData.spawnX * BG_SCALE, zoneData.spawnY * BG_SCALE, "player")
      .setScale(PLAYER_SCALE * 0.4);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(500);
    
    // Add player shadow
    this.playerShadow = this.add.ellipse(
      this.player.x,
      this.player.y + 12,
      20,
      10,
      0x000000,
      0.3
    ).setDepth(499);
    
    // Set up player animations
    this.createPlayerAnimations();
    
    // Set up camera
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(2);
    
    // Create HUD and minimap
    createHUD(this);
    const mapX = this.game.config.width - 110;
    const mapY = 10;
    createMiniMap(this, mapX, mapY, 100);
    
    // Create loot crates group
    this.lootCrates = this.physics.add.group();
    
    // Create exclamations group
    this.exclamations = this.physics.add.group();
    
    // Set up collision between player and obstacles
    this.physics.add.collider(this.player, this.obstacles);
    
    // Set up collision between player and loot crates
    this.physics.add.collider(this.player, this.lootCrates);
    
    // Add log text
    this.logText = this.add.text(
      10, 
      this.game.config.height - 80, 
      "", 
      { font: "14px Arial", fill: "#ffffff", stroke: "#000000", strokeThickness: 2 }
    ).setScrollFactor(0).setDepth(2000);
    
    // Create keyboard inputs
    this.setupInputs();
    
    // Initialize narrative system
    initializeNarrative(this);
    
    // Spawn game elements
    this.time.delayedCall(500, () => {
      spawnMultipleLootCrates(this, 5);
      spawnMultipleExclamations(this, 3);
    });
    
    // Show welcome message
    this.showScavengerModeInfo();
    
    console.log("ScavengerMode create completed");
  }

  update(time, delta) {
    // Update game time
    let gameTime = this.registry.get("gameTime") || 0;
    gameTime += delta;
    this.registry.set("gameTime", gameTime);
    
    // Only process movement when no dialog is active
    if (this.narrativeScreen === SCREEN_NONE && !this.isDialogOpen) {
      this.handlePlayerMovement();
    }
    
    // Update player shadow position
    if (this.playerShadow) {
      this.playerShadow.setPosition(this.player.x, this.player.y + 12);
    }
    
    // Update minimap
    updateMiniMap(this, this.game.config.width - 110, 10, 100);
    
    // Update HUD
    updateHUD(this);
    
    // Handle exclamation interaction
    const exclamation = getOverlappingExclamation(this);
    if (exclamation && Phaser.Input.Keyboard.JustDown(this.actionKeys.e)) {
      this.narrativeScreen = SCREEN_PROMPT;
      exclamation.destroy();
      showPrompt(this);
    }
    
    // Auto progress narrative
    if (this.narrativeScreen === SCREEN_PROLOGUE && 
        this.input.keyboard.checkDown(this.input.keyboard.addKey('SPACE'), 500)) {
      this.narrativeScreen = SCREEN_NONE;
      hideDialog(this);
    }
  }

  setupMapObjects(mapData, zoneData, bgScale) {
    if (!mapData || !mapData.layers) return;
    
    mapData.layers.forEach(layer => {
      // Process collision objects
      if (layer.type === "objectgroup" && layer.name === "Object Layer 1") {
        const offsetX = layer.offsetx || 0;
        const offsetY = layer.offsety || 0;
        
        layer.objects.forEach(obj => {
          // Create collision rectangles
          const rect = this.add.rectangle(
            (obj.x + offsetX) * bgScale + 5,
            (obj.y + offsetY) * bgScale + 5,
            obj.width * bgScale - 10,
            obj.height * bgScale - 10,
            0xff0000,
            0
          );
          rect.setOrigin(0, 0);
          this.physics.add.existing(rect, true);
          this.obstacles.add(rect);
        });
      } 
      // Process foreground layers if defined
      else if (
        layer.type === "imagelayer" &&
        zoneData.foregroundKey && 
        layer.name.toLowerCase() === zoneData.foregroundKey.toLowerCase()
      ) {
        const offX = layer.x || 0;
        const offY = layer.y || 0;
        this.foreground = this.add.image(offX * bgScale, offY * bgScale, zoneData.foregroundKey)
          .setOrigin(0, 0)
          .setScale(bgScale)
          .setDepth(1000);
      }
    });
  }
  
  // Set up player input handling
  setupInputs() {
    // Arrow keys
    this.cursors = this.input.keyboard.createCursorKeys();
    
    // WASD keys
    this.wasdKeys = this.input.keyboard.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D'
    });
    
    // Action keys
    this.actionKeys = this.input.keyboard.addKeys({
      z: "Z", 
      space: "SPACE",
      escape: "ESC",
      e: "E"
    });
    
    // Attack key (Space)
    this.input.keyboard.on('keydown-SPACE', () => {
      if (this.narrativeScreen === SCREEN_NONE && !this.isDialogOpen) {
        this.handlePlayerAttack();
      } else if (this.isDialogOpen) {
        this.handleDialogConfirm();
      }
    });
    
    // Zone change key
    this.actionKeys.z.on('down', () => {
      if (this.narrativeScreen === SCREEN_NONE && !this.isDialogOpen) {
        this.handleZoneChange();
      }
    });
    
    // Menu/exit key
    this.actionKeys.escape.on('down', () => {
      if (this.isDialogOpen) {
        hideDialog(this);
        this.isDialogOpen = false;
      } else if (this.narrativeScreen !== SCREEN_NONE) {
        this.narrativeScreen = SCREEN_NONE;
        hideDialog(this);
      } else {
        this.showReturnToVillageDialog();
      }
    });
  }
  
  // Handle player movement based on inputs
  handlePlayerMovement() {
    const speed = 100;
    this.player.setVelocity(0);
    
    // Left movement
    if (this.cursors.left.isDown || this.wasdKeys.left.isDown) {
      this.player.setVelocityX(-speed);
      this.player.anims.play('walk-left', true);
      this.lastDirection = "left";
    } 
    // Right movement
    else if (this.cursors.right.isDown || this.wasdKeys.right.isDown) {
      this.player.setVelocityX(speed);
      this.player.anims.play('walk-right', true);
      this.lastDirection = "right";
    }
    
    // Up movement
    if (this.cursors.up.isDown || this.wasdKeys.up.isDown) {
      this.player.setVelocityY(-speed);
      if (!this.cursors.left.isDown && !this.cursors.right.isDown && 
          !this.wasdKeys.left.isDown && !this.wasdKeys.right.isDown) {
        this.player.anims.play('walk-up', true);
        this.lastDirection = "up";
      }
    } 
    // Down movement
    else if (this.cursors.down.isDown || this.wasdKeys.down.isDown) {
      this.player.setVelocityY(speed);
      if (!this.cursors.left.isDown && !this.cursors.right.isDown &&
          !this.wasdKeys.left.isDown && !this.wasdKeys.right.isDown) {
        this.player.anims.play('walk-down', true);
        this.lastDirection = "down";
      }
    }
    
    // Idle animations
    if (this.player.body.velocity.x === 0 && this.player.body.velocity.y === 0) {
      if (this.lastDirection === "down") {
        this.player.anims.play('idle-down', true);
      } else if (this.lastDirection === "up") {
        this.player.anims.play('idle-up', true);
      } else if (this.lastDirection === "left") {
        this.player.anims.play('idle-left', true);
      } else if (this.lastDirection === "right") {
        this.player.anims.play('idle-right', true);
      }
    }
  }
  
  // Handle player attack input
  handlePlayerAttack() {
    if (this.isAttacking) return;
    
    this.isAttacking = true;
    this.player.setVelocity(0);
    this.player.anims.play(`attack-${this.lastDirection}`, true);
    
    // Camera shake effect for attack
    this.cameras.main.shake(50, 0.005);
    
    // Attack sound effect
    // this.sound.play('attack_sound', { volume: 0.5 });
    
    // Check for crate hits
    if (this.lootCrates) {
      const crates = this.lootCrates.getChildren();
      const attackRange = 60;
      
      for (let crate of crates) {
        const distance = Phaser.Math.Distance.Between(
          this.player.x, this.player.y, crate.x, crate.y
        );
        
        if (distance < attackRange) {
          console.log("Player attacked crate");
          this.hitCrate(crate);
          break;
        }
      }
    }
    
    // Reset attack state after animation completes
    this.player.once('animationcomplete', () => {
      this.isAttacking = false;
    });
  }
  
  // Handle crate hit logic
  hitCrate(crate) {
    if (crate.getData('breaking')) return;

    let health = crate.getData('health') || 3;
    health -= 1;
    crate.setData('health', health);

    // Visual feedback
    crate.setTint(0xff9900);
    this.time.delayedCall(100, () => crate.clearTint());
    this.cameras.main.shake(50, 0.003);

    if (health <= 0) {
      crate.setData('breaking', true);
      const loot = getRandomLootForZone(this);

      if (loot) {
        addToInventory(this, loot);
        this.addToLog(`Found: ${loot}`);
        createSimpleEffect(this, crate.x, crate.y, 0xFFD700);
      } else {
        this.addToLog("No loot found");
      }

      // Destroy the crate with particle effect
      createSimpleEffect(this, crate.x, crate.y, 0xA52A2A);
      crate.destroy();
    } else {
      console.log(`Crate hit, health remaining: ${health}`);
    }
  }
  
  // Create player animation definitions
  createPlayerAnimations() {
    // Only create if animations don't exist yet
    if (!this.anims.exists('walk-down')) {
      // Walking animations
      this.anims.create({
        key: "walk-down",
        frames: this.anims.generateFrameNumbers("player", { start: 18, end: 23 }),
        frameRate: 10,
        repeat: -1
      });
    
      this.anims.create({
        key: "walk-right",
        frames: this.anims.generateFrameNumbers("player", { start: 6, end: 11 }),
        frameRate: 10,
        repeat: -1
      });
    
      this.anims.create({
        key: "walk-up",
        frames: this.anims.generateFrameNumbers("player", { start: 30, end: 35 }),
        frameRate: 10,
        repeat: -1
      });
    
      this.anims.create({
        key: "walk-left",
        frames: this.anims.generateFrameNumbers("player", { start: 24, end: 29 }),
        frameRate: 10,
        repeat: -1
      });
    
      // Idle animations
      this.anims.create({
        key: "idle-down",
        frames: this.anims.generateFrameNumbers("player", { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1
      });
    
      this.anims.create({
        key: "idle-up",
        frames: this.anims.generateFrameNumbers("player", { start: 12, end: 17 }),
        frameRate: 10,
        repeat: -1
      });
    
      this.anims.create({
        key: "idle-left",
        frames: [{ key: "player", frame: 24 }],
        frameRate: 10
      });
    
      this.anims.create({
        key: "idle-right",
        frames: [{ key: "player", frame: 6 }],
        frameRate: 10
      });
    
      // Attack animations
      this.anims.create({
        key: "attack-down",
        frames: this.anims.generateFrameNumbers("player", { start: 36, end: 39 }),
        frameRate: 15,
        repeat: 0
      });
    
      this.anims.create({
        key: "attack-right",
        frames: this.anims.generateFrameNumbers("player", { start: 42, end: 45 }),
        frameRate: 15,
        repeat: 0
      });
    
      this.anims.create({
        key: "attack-up",
        frames: this.anims.generateFrameNumbers("player", { start: 48, end: 51 }),
        frameRate: 15,
        repeat: 0
      });
    
      this.anims.create({
        key: "attack-left",
        frames: this.anims.generateFrameNumbers("player", { start: 54, end: 57 }),
        frameRate: 15,
        repeat: 0
      });
      
      // Crate breaking animation
      this.anims.create({
        key: "crate_break",
        frames: this.anims.generateFrameNumbers("loot_crate", { start: 0, end: 4 }),
        frameRate: 10,
        repeat: 0
      });
    }
  }
  
  // Handle zone change
  handleZoneChange() {
    console.log("Changing zones with Z key");
    const currentZoneIndex = SCAVENGER_ZONES.findIndex(z => z.name === this.currentZone);
    const newZoneIndex = (currentZoneIndex + 1) % SCAVENGER_ZONES.length;
    this.currentZone = SCAVENGER_ZONES[newZoneIndex].name;
    this.playerStats.currentZone = this.currentZone;
    
    console.log(`Transitioning to ${SCAVENGER_ZONES[newZoneIndex].name}`);
    
    this.cameras.main.fade(500, 0, 0, 0);
    this.time.delayedCall(500, () => {
      this.scene.restart({
        zone: SCAVENGER_ZONES[newZoneIndex],
        inventory: this.localInventory,
        playerStats: this.playerStats,
        promptCount: this.promptCount
      });
    });
  }
  
  // Show dialog to return to village
  showReturnToVillageDialog() {
    this.isDialogOpen = true;
    showDialog(this, "Return to Village?\n(Press SPACE to confirm, ESC to cancel)");
  }
  
  // Handle dialog confirmation
  handleDialogConfirm() {
    if (this.isDialogOpen) {
      hideDialog(this);
      this.isDialogOpen = false;
      
      // Return to village
      console.log("Returning to Village");
      this.cameras.main.fade(500, 0, 0, 0);
      this.time.delayedCall(500, () => {
        this.scene.start("MainGameScene", {
          zone: {
            name: "Village",
            mapKey: "villageMap",
            backgroundKey: "villageCommons",
            foregroundKey: ""
          },
          inventory: this.localInventory,
          playerStats: this.playerStats
        });
      });
    }
  }
  
  // Show welcome info for Scavenger Mode
  showScavengerModeInfo() {
    this.isDialogOpen = true;
    showDialog(this, "Scavenger Mode\n\nControls:\nWASD/Arrows: Move\nSPACE: Attack\nE: Interact\nZ: Change Zone\nESC: Menu/Exit\n\nPress ESC to begin");
  }
  
  // Add message to log
  addToLog(message) {
    if (!this.logMessages) this.logMessages = [];
    
    this.logMessages.push(message);
    if (this.logMessages.length > 5) {
      this.logMessages.shift();
    }
    
    if (this.logText) {
      this.logText.setText(this.logMessages.join('\n'));
      this.logText.setTint(0xffff00);
      this.time.delayedCall(1000, () => this.logText.clearTint());
    }
  }
}
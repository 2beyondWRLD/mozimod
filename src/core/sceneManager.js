// sceneManager.js

import { createPlayer, initializePlayerStats, setupStatRegeneration, createInitialStats } from '../player/player.js';
import { createHUD, updateHUD } from '../ui/uiManager.js';
import { initEquippedData } from '../utils/utils.js';

// Preloads scene-specific assets
export function preloadScene(scene, zoneData) {
  scene.load.json(zoneData.mapKey, `assets/maps/${zoneData.mapKey}.json`);
  scene.load.image(zoneData.backgroundKey, `assets/backgrounds/${zoneData.backgroundKey}.png`);
  
  // Load foreground if defined
  if (zoneData.foregroundKey) {
    scene.load.image(zoneData.foregroundKey, `assets/backgrounds/${zoneData.foregroundKey}.png`);
  }

  scene.load.spritesheet("player", "assets/sprites/player.png", {
    frameWidth: 48,
    frameHeight: 48,
  });
}

// Initializes a new scene based on provided zone data
export function createScene(scene, data) {
  console.log("createScene: Received scene data:", data);
  
  // Make sure scene.zoneList exists
  if (!scene.zoneList || !Array.isArray(scene.zoneList)) {
    console.warn("Zone list not found or not an array! Creating default zone list.");
    scene.zoneList = [{
      name: "Village",
      mapKey: "villageMap",
      backgroundKey: "villageCommons",
      foregroundKey: "",
      spawnX: 100,
      spawnY: 100,
      bgScale: 0.3
    }];
  }
  
  // Initialize scene with zone data or fallback to default
  let defaultZone = scene.zoneList.find(z => z.name === "Village");
  if (!defaultZone) {
    defaultZone = scene.zoneList[0] || {
      name: "Village",
      mapKey: "villageMap",
      backgroundKey: "villageCommons",
      foregroundKey: "",
      spawnX: 100,
      spawnY: 100,
      bgScale: 0.3
    };
  }
  
  if (!data || !data.zone) {
    data = {
      zone: defaultZone,
      inventory: [
        { name: "Bread", quantity: 1 },
        { name: "Water", quantity: 1 },
        { name: "Iron Sword", quantity: 1 },
        { name: "Wooden Armor", quantity: 1 },
        { name: "Healing Medicine", quantity: 1 }
      ],
      promptCount: 0
    };
    console.log("Defaulting zone to Village with preloaded loot items.");
  }
  
  // Preserve player stats between scenes
  const existingOromozi = scene.playerStats ? scene.playerStats.oromozi : 1000;
  const existingLevel = scene.playerStats ? scene.playerStats.level : 1;
  const existingExp = scene.playerStats ? scene.playerStats.experience : 0;
  
  // Initialize or update player stats
  if (!scene.playerStats) {
    scene.playerStats = createInitialStats(data.zone.name, existingOromozi);
  } else {
    scene.playerStats.currentZone = data.zone.name;
  }
  
  // Preserve progression between zone changes
  if (existingLevel > 1) {
    scene.playerStats.level = existingLevel;
    scene.playerStats.experience = existingExp;
  }
  
  // Initialize scene data
  scene.localInventory = data.inventory || [];
  scene.promptCount = data.promptCount || 0;
  scene.deposits = scene.deposits || [];
  scene.listedItems = scene.listedItems || [];
  scene.tradeListings = scene.tradeListings || [];
  initEquippedData(scene);

  // Initialize flags
  scene.isRestarting = false;
  scene.isDying = false;

  // Set up time system
  if (!scene.registry.get('gameTime')) {
    scene.registry.set('gameTime', 0);
  }
  scene.secondsPerDay = 240;
  scene.secondsPerHour = scene.secondsPerDay / 24;

  // Save initial inventory state for scavenger mode
  if (data.zone.name !== "Village" && !scene.initialScavengerInventory) {
    scene.initialScavengerInventory = JSON.parse(JSON.stringify(scene.localInventory));
    scene.lastInventoryState = JSON.parse(JSON.stringify(scene.localInventory));
    console.log("Initial Scavenger Mode inventory set:", scene.initialScavengerInventory);
  }

  // Get zone data and set current zone
  const zoneData = data.zone;
  scene.currentZone = zoneData.name;
  scene.playerStats.currentZone = scene.currentZone;
  scene.hasPromptedCamping = false;
  
  // Initialize arrays for tracking game objects
  scene.exclamationSprites = [];
  scene.miniMapMonsters = [];
  scene.miniMapCrates = [];

  // Create player
  createPlayer(scene, zoneData.spawnX || 100, zoneData.spawnY || 100, 1.1);
  setupStatRegeneration(scene);
  createHUD(scene);

  // Set up the map and background
  const mapData = scene.cache.json.get(zoneData.mapKey);
  let bgX = 0;
  let bgY = 0;
  if (mapData && mapData.layers) {
    const backgroundLayer = mapData.layers.find(layer => 
      layer.type === "imagelayer" && layer.name.toLowerCase() === "background");
    if (backgroundLayer) {
      bgX = backgroundLayer.x || 0;
      bgY = backgroundLayer.y || 0;
    }
  }
  
  // Setup scene environment
  scene.bgScale = zoneData.bgScale || 0.3;
  scene.background = scene.add.image(bgX * scene.bgScale, bgY * scene.bgScale, zoneData.backgroundKey)
    .setOrigin(0, 0)
    .setScale(scene.bgScale);
  
  // Set physics and camera bounds
  scene.physics.world.setBounds(0, 0, scene.background.displayWidth, scene.background.displayHeight);
  scene.cameras.main.setBounds(0, 0, scene.background.displayWidth, scene.background.displayHeight);

  // Set up obstacle collisions
  scene.obstacles = scene.physics.add.staticGroup();
  
  // Setup zone objects and environmental effects
  setupZoneObjects(scene, zoneData, mapData, scene.bgScale);
  setupEnvironmentalEffects(scene);
  
  // Set up player-obstacle collisions
  scene.physics.add.collider(scene.player, scene.obstacles);
  
  // Update HUD
  updateHUD(scene);
}

// Set up zone-specific objects and collision boundaries
function setupZoneObjects(scene, zoneData, mapData, bgScale) {
  if (zoneData.name === "Village") {
    setupVillageObjects(scene, mapData, bgScale);
  } else {
    setupExplorationZoneObjects(scene, zoneData, mapData, bgScale);
  }
}

// Set up village-specific interactive objects
function setupVillageObjects(scene, mapData, bgScale) {
  scene.interactionObjects = scene.physics.add.staticGroup();
  
  if (!mapData || !mapData.layers) return;
  
  mapData.layers.forEach(layer => {
    if (layer.type === "objectgroup" && layer.name === "Object Layer 1") {
      const offsetX = layer.offsetx || 0;
      const offsetY = layer.offsety || 0;
      
      layer.objects.forEach(obj => {
        // Add a slightly smaller collision box for better movement
        const rect = scene.add.rectangle(
          (obj.x + offsetX) * bgScale + 5,
          (obj.y + offsetY) * bgScale + 5,
          obj.width * bgScale - 10,
          obj.height * bgScale - 10,
          0xff0000,
          0
        );
        rect.setOrigin(0, 0);
        scene.physics.add.existing(rect, true);
        scene.obstacles.add(rect);
      });
    } else if (layer.type === "objectgroup" && layer.name.toLowerCase() === "interactions") {
      layer.objects.forEach(obj => {
        const interactiveObj = scene.add.rectangle(
          obj.x * bgScale,
          obj.y * bgScale,
          obj.width * bgScale,
          obj.height * bgScale,
          0x00ff00,
          0
        );
        interactiveObj.setOrigin(0, 0);
        scene.physics.add.existing(interactiveObj, true);
        interactiveObj.body.enable = false;
        interactiveObj.setInteractive();
        interactiveObj.name = obj.name;
        
        // Add visual hint for interactive objects
        const hintGlow = scene.add.graphics();
        hintGlow.lineStyle(2, 0x00ffff, 0.5);
        hintGlow.strokeRect(
          obj.x * bgScale,
          obj.y * bgScale,
          obj.width * bgScale,
          obj.height * bgScale
        );
        hintGlow.setDepth(900);
        
        // Pulse animation for interaction hint
        scene.tweens.add({
          targets: hintGlow,
          alpha: { from: 0.3, to: 0.8 },
          duration: 1000,
          yoyo: true,
          repeat: -1
        });
        
        interactiveObj.on("pointerdown", () => {
          console.log("Clicked on village object:", obj);
          handleBuildingInteraction(scene, interactiveObj);
        });
        
        interactiveObj.on("pointerover", () => {
          // Show interaction label
          const label = scene.add.text(
            obj.x * bgScale + (obj.width * bgScale / 2),
            obj.y * bgScale - 10,
            obj.name.replace(/_/g, " "),
            {
              font: "14px Arial",
              fill: "#ffffff",
              stroke: "#000000",
              strokeThickness: 3
            }
          ).setOrigin(0.5, 1).setDepth(1000);
          
          interactiveObj.label = label;
        });
        
        interactiveObj.on("pointerout", () => {
          if (interactiveObj.label) {
            interactiveObj.label.destroy();
            interactiveObj.label = null;
          }
        });
        
        scene.interactionObjects.add(interactiveObj);
      });
    }
  });

  // Add enhanced battle area with visual indicator
  setupVillageBattleArea(scene, bgScale);
}

// Set up exploration zone objects (wilderness areas)
function setupExplorationZoneObjects(scene, zoneData, mapData, bgScale) {
  if (!mapData || !mapData.layers) return;
  
  mapData.layers.forEach(layer => {
    if (layer.type === "objectgroup" && layer.name === "Object Layer 1") {
      const offsetX = layer.offsetx || 0;
      const offsetY = layer.offsety || 0;
      
      layer.objects.forEach(obj => {
        // Use slightly smaller collision boxes for better movement
        const rect = scene.add.rectangle(
          (obj.x + offsetX) * bgScale + 5,
          (obj.y + offsetY) * bgScale + 5,
          obj.width * bgScale - 10,
          obj.height * bgScale - 10,
          0xff0000,
          0
        );
        rect.setOrigin(0, 0);
        scene.physics.add.existing(rect, true);
        scene.obstacles.add(rect);
      });
    } else if (
      layer.type === "imagelayer" &&
      zoneData.foregroundKey && 
      layer.name.toLowerCase() === zoneData.foregroundKey.toLowerCase()
    ) {
      const offX = layer.x || 0;
      const offY = layer.y || 0;
      scene.foreground = scene.add.image(offX * bgScale, offY * bgScale, zoneData.foregroundKey)
        .setOrigin(0, 0)
        .setScale(bgScale);
      scene.foreground.setDepth(1000);
    }
  });
}

// Setup visual effects for time of day and environmental conditions
function setupEnvironmentalEffects(scene) {
  // Night overlay with stars
  scene.nightOverlay = scene.add.rectangle(
    scene.game.config.width / 2,
    scene.game.config.height / 2,
    scene.game.config.width,
    scene.game.config.height,
    0x000033,
    0.6
  )
    .setOrigin(0.5)
    .setDepth(1500)
    .setScrollFactor(0);

  // Add stars to night sky (only visible at night)
  scene.stars = [];
  for (let i = 0; i < 50; i++) {
    const star = scene.add.circle(
      Phaser.Math.Between(0, scene.game.config.width),
      Phaser.Math.Between(0, scene.game.config.height / 2),
      Phaser.Math.Between(1, 2),
      0xffffff,
      1
    ).setScrollFactor(0).setDepth(1501).setAlpha(0);
    
    // Twinkle animation
    scene.tweens.add({
      targets: star,
      alpha: { from: 0.3, to: 0.9 },
      duration: Phaser.Math.Between(1000, 3000),
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 2000)
    });
    
    scene.stars.push(star);
  }

  // Set initial night/day state
  const gameTime = scene.registry.get('gameTime');
  const gameHour = (6 + Math.floor(gameTime / scene.secondsPerHour)) % 24;
  const isNight = gameHour >= 20 || gameHour < 6;
  scene.nightOverlay.setAlpha(isNight ? 0.8 : 0);
  scene.stars.forEach(star => star.setAlpha(isNight ? Phaser.Math.Between(3, 9) * 0.1 : 0));
  scene.wasNight = isNight;
  scene.isNight = isNight;
}

// Setup battle arena in the village
function setupVillageBattleArea(scene, bgScale) {
  const battleBox = scene.add.rectangle(300 * bgScale, 200 * bgScale, 50 * bgScale, 50 * bgScale, 0xff0000, 0.3);
  battleBox.setOrigin(0, 0);
  battleBox.setStrokeStyle(2, 0xffffff);
  scene.physics.add.existing(battleBox, true);
  battleBox.body.enable = false;
  battleBox.setInteractive();
  battleBox.name = "battle_mode";
  
  // Add battle icon
  const battleIcon = scene.add.text(
    battleBox.x + battleBox.width / 2,
    battleBox.y + battleBox.height / 2,
    "⚔️",
    { font: "24px Arial" }
  ).setOrigin(0.5).setDepth(901);
  
  // Add battle label
  const battleLabel = scene.add.text(
    battleBox.x + battleBox.width / 2,
    battleBox.y + battleBox.height + 10,
    "Training Arena",
    {
      font: "14px Arial",
      fill: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3
    }
  ).setOrigin(0.5, 0).setDepth(901);
  
  // Pulsing animation
  scene.tweens.add({
    targets: [battleBox, battleIcon],
    alpha: { from: 0.7, to: 1 },
    duration: 1200,
    yoyo: true,
    repeat: -1
  });
  
  battleBox.on("pointerdown", () => {
    console.log("Clicked on battle box");
    handleBuildingInteraction(scene, battleBox);
  });
  
  scene.interactionObjects.add(battleBox);
}

// Handles logic for building interaction click
function handleBuildingInteraction(scene, gameObject) {
  const building = gameObject.name.toLowerCase();

  // Import interaction manager dynamically to avoid circular dependencies
  import('../interactions/interactionManager.js').then(module => {
    module.handleVillageContractInteraction(scene, gameObject);
  }).catch(error => {
    console.error("Failed to load interaction manager:", error);
    
    // Fallback handling if module import fails
    switch (building) {
      case "trading_post":
        openTradingPost(scene);
        break;
      case "crafting_workshop":
        openCraftingWorkshop(scene);
        break;
      case "liquidity_bank":
        openBank(scene);
        break;
      case "merchant_quarter":
        openMerchantQuarter(scene);
        break;
      case "royal_market":
        openRoyalMarket(scene);
        break;
      case "tinkerers_lab":
        openTinkerersLab(scene);
        break;
      case "scavenger_mode":
        startScavengerMode(scene);
        break;
      case "battle_mode":
        startBattleMode(scene);
        break;
      default:
        console.log(`Unknown building clicked: ${building}`);
    }
  });
}

// Stub functions (fallback if interaction manager isn't available)
function openTradingPost(scene) {
  console.log("[TRADING POST] Prompt would open here.");
}

function openCraftingWorkshop(scene) {
  console.log("[CRAFTING WORKSHOP] Prompt would open here.");
}

function openBank(scene) {
  console.log("[BANK] Prompt would open here.");
}

function openMerchantQuarter(scene) {
  console.log("[MERCHANT QUARTER] Prompt would open here.");
}

function openRoyalMarket(scene) {
  console.log("[ROYAL MARKET] Prompt would open here.");
}

function openTinkerersLab(scene) {
  console.log("[TINKERER'S LAB] Prompt would open here.");
}

function startScavengerMode(scene) {
  console.log("[SCAVENGER MODE] Launching minigame...");
}

function startBattleMode(scene) {
  console.log("[BATTLE MODE] Launching battle arena...");
}

// Scene transition logic
export function transitionScene(scene, targetScene, targetZone, playerStats, inventory = []) {
  scene.cameras.main.fadeOut(500);
  scene.time.delayedCall(500, () => {
    scene.scene.start(targetScene, {
      zone: targetZone,
      inventory: inventory,
      oromozi: playerStats.oromozi,
      playerStats: playerStats,
      promptCount: scene.promptCount || 0
    });
  });
}
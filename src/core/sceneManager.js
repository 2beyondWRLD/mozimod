// sceneManager.js

import { createPlayer, initializePlayerStats, setupStatRegeneration } from '../player/player.js';
import { createHUD, updateHUD } from '../ui/uiManager.js';

// Preloads scene-specific assets
export function preloadScene(scene, zoneData) {
  scene.load.json(zoneData.mapKey, `assets/maps/${zoneData.mapKey}.json`);
  scene.load.image(zoneData.backgroundKey, `assets/backgrounds/${zoneData.backgroundKey}.png`);

  scene.load.spritesheet("player", "assets/sprites/player.png", {
    frameWidth: 48,
    frameHeight: 48,
  });
}

// Initializes a new scene based on provided zone data
export function createScene(scene, data) {
  const zoneData = data.zone;
  initializePlayerStats(scene, zoneData.name, data.oromozi || 1000);

  scene.localInventory = data.inventory || [{ name: "Bread", quantity: 1 }];
  scene.deposits = [];
  scene.listedItems = [];

  setupEnvironment(scene, zoneData);
  createPlayer(scene, zoneData.spawnX || 100, zoneData.spawnY || 100, 1.1);
  setupStatRegeneration(scene);
  createHUD(scene);

  scene.physics.world.setBounds(0, 0, scene.background.displayWidth, scene.background.displayHeight);
  scene.cameras.main.setBounds(0, 0, scene.background.displayWidth, scene.background.displayHeight);

  setupObjects(scene, zoneData);
  updateHUD(scene);
}

// Setup background
function setupEnvironment(scene, zoneData) {
  scene.bgScale = zoneData.bgScale || 0.3;
  scene.background = scene.add.image(0, 0, zoneData.backgroundKey)
    .setOrigin(0, 0)
    .setScale(scene.bgScale);
}

// Sets up collision and interactive building zones
function setupObjects(scene, zoneData) {
  scene.obstacles = scene.physics.add.staticGroup();
  scene.interactionObjects = scene.add.group();

  const mapData = scene.cache.json.get(zoneData.mapKey);
  if (!mapData || !mapData.layers) return;

  const bgScale = scene.bgScale || 0.3;

  mapData.layers.forEach(layer => {
    if (layer.type === "objectgroup") {
      const offsetX = (layer.offsetx || 0) * bgScale;
      const offsetY = (layer.offsety || 0) * bgScale;

      layer.objects.forEach(obj => {
        const x = (obj.x + offsetX);
        const y = (obj.y + offsetY);
        const w = obj.width || 32;
        const h = obj.height || 32;

        if (layer.name === "Object Layer 1") {
          const box = scene.add.rectangle(
            x * bgScale,
            y * bgScale,
            w * bgScale,
            h * bgScale,
            0x000000,
            0
          );
          box.setOrigin(0, 1); // Y-down origin
          scene.physics.add.existing(box, true);
          scene.obstacles.add(box);
        }

        if (layer.name.toLowerCase() === "interactions") {
          const sprite = scene.add.rectangle(
            (x + w / 2) * bgScale,
            (y + h / 2) * bgScale,
            w * bgScale,
            h * bgScale,
            0xffcc00,
            0.001
          );
          sprite.setInteractive({ useHandCursor: true });
          sprite.name = obj.name;
          sprite.buildingType = obj.name;
          scene.interactionObjects.add(sprite);
        }
      });
    }
  });

  scene.physics.add.collider(scene.player, scene.obstacles);

  // Building click handler
  scene.input.on('gameobjectdown', (pointer, gameObject) => {
    if (scene.interactionObjects.contains(gameObject)) {
      handleBuildingInteraction(scene, gameObject);
    }
  });
}

// Handles logic for building interaction click
function handleBuildingInteraction(scene, gameObject) {
  const building = gameObject.name.toLowerCase();

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
    default:
      console.log(`Unknown building clicked: ${building}`);
  }
}

// Stub functions (replace with real UI logic later)
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

// Scene transition logic
export function transitionScene(scene, targetScene, targetZone, playerStats, inventory = []) {
  scene.cameras.main.fadeOut(500);
  scene.time.delayedCall(500, () => {
    scene.scene.start(targetScene, {
      zone: targetZone,
      inventory: inventory,
      oromozi: playerStats.oromozi
    });
  });
}

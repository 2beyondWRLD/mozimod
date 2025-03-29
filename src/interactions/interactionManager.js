// interactionManager.js

import { showDialog, hideDialog, createScrollableMenu, clearButtons } from '../ui/uiManager.js';
import { createSimpleEffect } from '../inventory/inventorySystem.js';
import { removeFromInventory } from '../inventory/inventorySystem.js';

// Handle generic village interactions based on object name
export function handleVillageContractInteraction(scene, obj) {
  if (!scene || !obj || !obj.name) return;

  createSimpleEffect(scene, scene.player.x, scene.player.y, 0x00ffff);

  switch (obj.name.toLowerCase()) {
    case "trading_post":
      showTradingPostOptions(scene);
      break;
    case "crafting_workshop":
      showCraftingWorkshopOptions(scene);
      break;
    case "liquidity_bank":
      showLiquidityPoolOptions(scene);
      break;
    case "merchant_quarter":
      showMerchantQuarterOptions(scene);
      break;
    case "royal_market":
      showRoyalMarketOptions(scene);
      break;
    case "tinkerers_lab":
      showTinkerersLabOptions(scene);
      break;
    case "scavenger_mode":
      enterScavengerMode(scene);
      break;
    case "battle_mode":
      enterBattleMode(scene);
      break;
    case "camping_mode":
      enterCampingMode(scene);
      break;
    default:
      console.warn("Unhandled interaction:", obj.name);
  }
}

// Specific interaction handlers:

function showTradingPostOptions(scene) {
  showDialog(scene, "Trading Post:\nComing Soon!");
}

function showCraftingWorkshopOptions(scene) {
  showDialog(scene, "Crafting Workshop:\nComing Soon!");
}

function showLiquidityPoolOptions(scene) {
  showDialog(scene, "Liquidity Bank:\nComing Soon!");
}

function showMerchantQuarterOptions(scene) {
  showDialog(scene, "Merchant Quarter:\nComing Soon!");
}

function showRoyalMarketOptions(scene) {
  showDialog(scene, "Royal Market:\nComing Soon!");
}

function showTinkerersLabOptions(scene) {
  showDialog(scene, "Tinkerer's Lab:\nComing Soon!");
}

// Scavenger Mode Interaction
function enterScavengerMode(scene) {
  showDialog(scene, "Enter Scavenger Mode with your current inventory?\n(Press SPACE to confirm)");
  scene.input.keyboard.once("keydown-SPACE", () => {
    const targetZone = scene.zoneList.find(z => z.name === "Outer Grasslands");
    if (targetZone) {
      scene.cameras.main.fadeOut(500);
      scene.time.delayedCall(500, () => {
        const currentOromozi = scene.playerStats.oromozi;
        scene.playerStats = createInitialStats(targetZone.name, currentOromozi);
        scene.scene.restart({ zone: targetZone, inventory: scene.localInventory, promptCount: 0 });
      });
    } else {
      console.warn("Outer Grasslands zone not found!");
    }
  });
}

// Battle Mode Interaction placeholder
function enterBattleMode(scene) {
  showDialog(scene, "Entering Battle Mode:\nFeature coming soon!");
}

// Camping Mode Interaction with resource checking
function enterCampingMode(scene) {
  const gameTime = scene.registry.get('gameTime');
  const gameHour = (6 + Math.floor(gameTime / scene.secondsPerHour)) % 24;
  const isNightTime = gameHour >= 18 || gameHour < 6;

  if (isNightTime) {
    showDialog(scene, "It's night. Do you want to set up camp?\n(Press SPACE to confirm)");
    scene.input.keyboard.once("keydown-SPACE", () => {
      if (hasCampingMaterials(scene)) {
        setupCamp(scene);
      } else {
        showDialog(scene, "You don't have enough materials to camp!");
      }
    });
  } else {
    showDialog(scene, "It's not nighttime yet.");
  }
}

// Helper functions for camping
function hasCampingMaterials(scene) {
  const sticks = scene.localInventory.find(i => i.name === "Stick");
  const cloth = scene.localInventory.find(i => i.name === "Cloth");
  return sticks?.quantity >= 2 && cloth?.quantity >= 1;
}

function setupCamp(scene) {
  removeFromInventory(scene, "Stick", 2);
  removeFromInventory(scene, "Cloth", 1);
  hideDialog(scene);
  scene.cameras.main.fadeOut(500);

  scene.time.delayedCall(500, () => {
    scene.scene.start('CampingScene', {
      inventory: scene.localInventory,
      playerStats: scene.playerStats,
      zone: scene.currentZone,
    });
  });
}

// Interactive Exclamation Point creation
export function createClickableExclamation(scene) {
  const worldW = scene.background.displayWidth;
  const worldH = scene.background.displayHeight;
  const edgeBuffer = 100;

  let validPosition = false, exX = 0, exY = 0, attempts = 0;
  const MAX_ATTEMPTS = 50;

  while (!validPosition && attempts < MAX_ATTEMPTS) {
    attempts++;
    exX = Phaser.Math.Between(edgeBuffer, worldW - edgeBuffer);
    exY = Phaser.Math.Between(edgeBuffer, worldH - edgeBuffer);

    const playerDist = scene.player ? Phaser.Math.Distance.Between(scene.player.x, scene.player.y, exX, exY) : Infinity;
    const hasObstacle = overlapsObstacle(scene, exX, exY, 40);

    if (playerDist >= 100 && !hasObstacle) validPosition = true;
  }

  if (!validPosition) return;

  const exclamation = scene.add.image(exX, exY, 'exclamation').setScale(scene.bgScale * 4).setDepth(900).setTint(0xffff00);
  const hitbox = scene.add.rectangle(exX, exY, 50, 50, 0xffff00, 0.2).setInteractive().setDepth(901);

  hitbox.exclamationSprite = exclamation;
  hitbox.on('pointerdown', () => {
    showDialog(scene, "You discovered something interesting!");
    exclamation.destroy();
    hitbox.destroy();
  });
}

function overlapsObstacle(scene, x, y, radius) {
  return scene.obstacles.getChildren().some(obstacle => {
    const dist = Phaser.Math.Distance.Between(x, y, obstacle.x, obstacle.y);
    return dist < radius;
  });
}

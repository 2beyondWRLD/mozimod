// interactionManager.js

import { showDialog, hideDialog, createScrollableMenu, clearButtons, showModalOverlay, hideModalOverlay, createButtons } from '../ui/uiManager.js';
import { createSimpleEffect, createFloatingText, addToInventory, removeFromInventory, getItemData, getRandomLootForZone, getAllLootItems, overlapsObstacle } from '../inventory/inventorySystem.js';
import { hasCampingMaterials } from '../utils/utils.js';

// Constants for narrative screens
export const SCREEN_NONE = 0;
export const SCREEN_PROLOGUE = 1;
export const SCREEN_PROMPT = 2;
export const SCREEN_CHOICES = 3;
export const SCREEN_OUTCOME = 4;
export const SCREEN_ITEM_MENU = 5;
export const SCREEN_ITEM_PICK = 6;
export const SCREEN_CAMPING_PROMPT = 14;

// Module UI states
export const SCREEN_LIQUIDITY = 7;
export const SCREEN_MERCHANT = 8;
export const SCREEN_ROYAL = 9;
export const SCREEN_TINKER = 10;
export const SCREEN_CRAFT = 11;
export const SCREEN_TRADING = 12;
export const SCREEN_BATTLE = 13;

// Handle generic village interactions based on object name
export function handleVillageContractInteraction(scene, obj) {
  if (!scene || !obj || !obj.name) return;
  
  console.log("Village contract interaction triggered for:", obj.name);
  
  // Visual feedback for interaction
  if (scene.player) {
    createSimpleEffect(scene, scene.player.x, scene.player.y, 0x00ffff);
  }
  
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

// Create a simple clickable exclamation point
export function createClickableExclamation(scene) {
  if (!scene || !scene.add) {
    console.error("Invalid scene for creating exclamation point");
    return;
  }
  
  const worldW = scene.background ? scene.background.displayWidth : 800;
  const worldH = scene.background ? scene.background.displayHeight : 600;
  
  // Better placement buffer
  const edgeBuffer = 100;
  
  // Find a valid position with a maximum number of attempts
  let validPosition = false;
  let exX = 0, exY = 0;
  let attempts = 0;
  const MAX_ATTEMPTS = 50;
  
  while (!validPosition && attempts < MAX_ATTEMPTS) {
    attempts++;
    exX = Phaser.Math.Between(edgeBuffer, worldW - edgeBuffer);
    exY = Phaser.Math.Between(edgeBuffer, worldH - edgeBuffer);
    
    // Check distance from player
    let tooCloseToPlayer = false;
    if (scene.player && scene.player.x !== undefined) {
      const playerDist = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, exX, exY);
      tooCloseToPlayer = playerDist < 100;
    }
    
    // Check for obstacle overlap
    const hasObstacle = overlapsObstacle(scene, exX, exY, 40);
    
    if (!tooCloseToPlayer && !hasObstacle) {
      validPosition = true;
    }
  }
  
  if (!validPosition) {
    console.warn("Could not find valid position for exclamation point");
    return;
  }
  
  try {
    // First, create a visible exclamation sprite (non-interactive)
    const exclamation = scene.add.image(exX, exY, 'exclamation');
    exclamation.setScale(scene.bgScale * 4);
    exclamation.setDepth(900);
    exclamation.setTint(0xffff00);
    
    // Then create a rectangular hitbox for interaction (like village buildings)
    const hitboxWidth = 50;
    const hitboxHeight = 50;
    const hitbox = scene.add.rectangle(
      exX, 
      exY,
      hitboxWidth,
      hitboxHeight,
      0xffff00,
      0.2 // Slight visibility for debugging
    );
    
    // Set properties
    hitbox.setOrigin(0.5);
    hitbox.setDepth(901);
    hitbox.setStrokeStyle(2, 0xffffff, 0.5);
    
    // Make it interactive
    hitbox.setInteractive();
    
    // Store data for cleanup
    hitbox.exclamationSprite = exclamation;
    hitbox.name = "exclamation_hitbox";
    
    // Add basic click handler
    hitbox.on('pointerdown', function() {
      console.log("Exclamation hitbox clicked at", this.x, this.y);
      
      // Start narrative flow
      import('../narrative/narrativeManager.js').then(module => {
        scene.narrativeScreen = module.SCREEN_PROLOGUE;
        module.showPrologue(scene);
      });
      
      // Clean up
      if (this.exclamationSprite) {
        this.exclamationSprite.destroy();
      }
      this.destroy();
    });
    
    // Track the hitbox
    if (!scene.exclamationHitboxes) {
      scene.exclamationHitboxes = [];
    }
    scene.exclamationHitboxes.push(hitbox);
    
    console.log("Created exclamation with hitbox at", exX, exY);
    
    return hitbox;
  } catch (error) {
    console.error("Error creating exclamation hitbox:", error);
    return null;
  }
}

// Create multiple clickable exclamation points
export function spawnMultipleExclamations(scene, count) {
  // Completely abort if scene isn't fully initialized
  if (!scene || !scene.add || !scene.sys || !scene.sys.displayList) {
    console.error("Scene not ready for spawning exclamations - missing core components");
    return;
  }
  
  if (scene.currentZone === "Village") return;
  
  // Scale exclamation count based on player progress
  const totalExclamations = count + Math.floor((scene.promptCount || 0) / 5);
  const actualCount = Math.min(totalExclamations, 6); // Reduce count to prevent overload
  
  console.log(`Attempting to spawn ${actualCount} exclamations`);
  
  // Use safer loop with try/catch
  for (let i = 0; i < actualCount; i++) {
    try {
      createClickableExclamation(scene);
    } catch (error) {
      console.error("Error spawning exclamation:", error);
    }
  }
}

// Get overlapping exclamation point for interaction
export function getOverlappingExclamation(scene) {
  // First check exclamation physics group
  if (scene.exclamations && scene.player) {
    try {
      const playerRect = scene.player.getBounds();
      const exList = scene.exclamations.getChildren();
      
      for (let ex of exList) {
        if (!ex || !ex.getBounds) continue;
        
        if (Phaser.Geom.Intersects.RectangleToRectangle(playerRect, ex.getBounds())) {
          return ex;
        }
      }
    } catch (error) {
      console.warn("Error checking exclamation overlaps:", error);
    }
  }
  
  // Then check sprite array if it exists
  if (scene.exclamationSprites && scene.exclamationSprites.length > 0 && scene.player) {
    try {
      const playerRect = scene.player.getBounds();
      
      for (let ex of scene.exclamationSprites) {
        if (!ex || !ex.getBounds) continue;
        
        if (Phaser.Geom.Intersects.RectangleToRectangle(playerRect, ex.getBounds())) {
          return ex;
        }
      }
    } catch (error) {
      console.warn("Error checking sprite exclamation overlaps:", error);
    }
  }
  
  // Finally check exclamation hitboxes
  if (scene.exclamationHitboxes && scene.exclamationHitboxes.length > 0 && scene.player) {
    try {
      const playerRect = scene.player.getBounds();
      
      for (let hitbox of scene.exclamationHitboxes) {
        if (!hitbox || !hitbox.getBounds) continue;
        
        if (Phaser.Geom.Intersects.RectangleToRectangle(playerRect, hitbox.getBounds())) {
          return hitbox;
        }
      }
    } catch (error) {
      console.warn("Error checking hitbox overlaps:", error);
    }
  }
  
  return null;
}

// Scavenger Mode Interaction
function enterScavengerMode(scene) {
  console.log("Entering Scavenger Mode...");
  showDialog(scene, "Enter Scavenger Mode with your current inventory?\n(Press SPACE to confirm)");
  scene.input.keyboard.once("keydown-SPACE", () => {
    const targetZone = scene.zoneList.find(z => z.name === "Outer Grasslands");
    if (targetZone) {
      // Add transition effect
      scene.cameras.main.fadeOut(500);
      scene.time.delayedCall(500, () => {
        const currentOromozi = scene.playerStats.oromozi;
        scene.scene.start('ScavengerMode', { 
          zone: targetZone, 
          inventory: scene.localInventory,
          playerStats: scene.playerStats 
        });
      });
    } else {
      console.warn("Outer Grasslands zone not found!");
    }
  });
}

// Battle Mode Interaction
export function enterBattleMode(scene) {
  console.log("Entering Battle Mode...");
  // This function is implemented in the combat system module
  import('../combat/combatSystem.js').then(module => {
    module.enterBattleMode(scene);
  });
}

// Camping Mode Interaction
function enterCampingMode(scene) {
  console.log("Entering Camping Mode...");
  const gameTime = scene.registry.get('gameTime') || 0;
  const gameHour = (6 + Math.floor(gameTime / scene.secondsPerHour)) % 24;
  const isNearNight = gameHour >= 18 && gameHour < 20;
  const isNight = gameHour >= 20 || gameHour < 6;
  
  if (isNearNight || isNight) {
    showDialog(scene, `It's ${isNearNight ? "getting dark" : "night"}, do you want to set up camp?\n(Press SPACE to confirm)`);
    scene.input.keyboard.once("keydown-SPACE", () => {
      if (hasCampingMaterials(scene)) {
        console.log('Camping setup initiated');
        hideDialog(scene);
        
        // Remove camping materials
        removeFromInventory(scene, "Stick", 2);
        removeFromInventory(scene, "Cloth", 1);
        
        // Create a container for the camping setup progress
        const progressContainer = scene.add.container(scene.cameras.main.centerX, scene.cameras.main.centerY);
        
        // Add background
        const background = scene.add.rectangle(0, 0, 300, 80, 0x000000, 0.7);
        background.setStrokeStyle(2, 0xffffff);
        progressContainer.add(background);
        
        // Add title text
        const titleText = scene.add.text(0, -25, "Setting up camp...", { 
          fontSize: '18px', 
          color: '#ffffff' 
        }).setOrigin(0.5);
        progressContainer.add(titleText);
        
        // Add progress bar background
        const progressBg = scene.add.rectangle(0, 10, 250, 20, 0x333333);
        progressContainer.add(progressBg);
        
        // Add progress bar fill
        const progressBar = scene.add.rectangle(-125, 10, 0, 20, 0x00ff00);
        progressBar.setOrigin(0, 0.5);
        progressContainer.add(progressBar);
        
        // Add progress text
        const progressText = scene.add.text(0, 10, "0%", { 
          fontSize: '12px', 
          color: '#ffffff' 
        }).setOrigin(0.5);
        progressContainer.add(progressText);
        
        // Set depth to ensure visibility
        progressContainer.setDepth(1000);
        
        // Camping setup duration (90 seconds)
        const campSetupDuration = 90;
        let elapsedTime = 0;
        
        // Create and start the timer
        const campingTimer = scene.time.addEvent({
          delay: 1000, // Update every second
          callback: () => {
            elapsedTime++;
            const progress = elapsedTime / campSetupDuration;
            
            // Update progress bar
            progressBar.width = 250 * progress;
            progressText.setText(`${Math.floor(progress * 100)}%`);
            
            if (elapsedTime >= campSetupDuration) {
              // Stop the timer
              campingTimer.remove();
              
              // Change progress bar to blue to indicate completion
              progressBar.fillColor = 0x0088ff;
              
              // Replace progress text with "ENTER CAMP"
              progressText.setText("ENTER CAMP");
              progressText.setFontSize(16);
              
              // Make the entire progress bar clickable
              progressBg.setInteractive({ useHandCursor: true });
              progressBar.setInteractive({ useHandCursor: true });
              progressText.setInteractive({ useHandCursor: true });
              
              // Add click event to enter camping scene
              const enterCampFunc = () => {
                // Remove all UI elements
                progressContainer.destroy();
                
                // Start camping scene with inventory
                scene.scene.start('CampingScene', {
                  inventory: scene.localInventory,
                  playerStats: scene.playerStats,
                  zone: scene.currentZone
                });
              };
              
              progressBg.on('pointerdown', enterCampFunc);
              progressBar.on('pointerdown', enterCampFunc);
              progressText.on('pointerdown', enterCampFunc);
            }
          },
          callbackScope: scene,
          loop: true
        });
        
        // Allow canceling the setup with ESC key
        const escKey = scene.input.keyboard.addKey('ESC');
        const escHandler = () => {
          campingTimer.remove();
          progressContainer.destroy();
          scene.input.keyboard.removeKey('ESC');
          
          // Return camping materials
          addToInventory(scene, "Stick", 2);
          addToInventory(scene, "Cloth", 1);
          
          showDialog(scene, "Camp setup canceled. Materials returned to inventory.\n(Press SPACE to continue)");
          scene.input.keyboard.once("keydown-SPACE", () => {
            hideDialog(scene);
          });
        };
        
        escKey.on('down', escHandler);
      } else {
        showDialog(scene, "You need 2 sticks and 1 cloth to set up camp.\n(Press SPACE to continue)");
        scene.input.keyboard.once("keydown-SPACE", () => {
          hideDialog(scene);
        });
      }
    });
  } else {
    showDialog(scene, "You can only set up camp during near-night (6:00 PM - 8:00 PM) or night (8:00 PM - 6:00 AM).\n(Press SPACE to continue)");
    scene.input.keyboard.once("keydown-SPACE", () => {
      hideDialog(scene);
    });
  }
}

// Specific village building interactions (implementation of menu functions)
// These would typically be imported from villageBuildings.js but are included
// in commented form for reference to ensure the interactionManager file works correctly.

/*
function showTradingPostOptions(scene) {
  // Implementation from villageBuildings.js
}

function showCraftingWorkshopOptions(scene) {
  // Implementation from villageBuildings.js
}

function showLiquidityPoolOptions(scene) {
  // Implementation from villageBuildings.js
}

function showMerchantQuarterOptions(scene) {
  // Implementation from villageBuildings.js
}

function showRoyalMarketOptions(scene) {
  // Implementation from villageBuildings.js
}

function showTinkerersLabOptions(scene) {
  // Implementation from villageBuildings.js
}
*/

// For proper module functionality, include these imports and exports
import { showTradingPostOptions, showCraftingWorkshopOptions, 
         showLiquidityPoolOptions, showMerchantQuarterOptions,
         showRoyalMarketOptions, showTinkerersLabOptions } from './villageBuildings.js';

export function setupEscapeKeyForBuildings(scene) {
          scene.input.keyboard.on('keydown-ESC', () => {
            if (scene.narrativeScreen >= SCREEN_LIQUIDITY && scene.narrativeScreen <= SCREEN_BATTLE) {
              hideDialog(scene);
              hideModalOverlay(scene);
              clearButtons(scene);
              scene.narrativeScreen = SCREEN_NONE;
            }
          });
        }
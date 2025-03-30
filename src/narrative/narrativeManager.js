// src/narrative/narrativeManager.js

import { showDialog, hideDialog, createScrollableMenu, clearButtons, createButtons, updateHUD } from '../ui/uiManager.js';
import { checkLevelUp } from '../player/player.js';
import { createSimpleEffect, addToInventory, getRandomLootForZone, addToLog, createFloatingText } from '../inventory/inventorySystem.js';

// Screen states for narrative control
export const SCREEN_NONE = 0;
export const SCREEN_PROLOGUE = 1;
export const SCREEN_PROMPT = 2;
export const SCREEN_CHOICES = 3;
export const SCREEN_OUTCOME = 4;
export const SCREEN_ITEM_MENU = 5;
export const SCREEN_ITEM_PICK = 6;

// Effect colors for visual feedback
export const EFFECT_COLORS = {
  LOOT: 0xffd700, // Gold
  HEALTH: 0x00ff00, // Green
  DAMAGE: 0xff0000, // Red
  EXPERIENCE: 0x00ffff, // Cyan
  HEAL: 0x00dd00, // Light green
  BUFF: 0xffaa00 // Orange
};

// Apply survival tick and narrative outcome effects
// Moved from player.js to here to avoid circular references
export function applySurvivalTickAndOutcome(scene, outcomeText) {
  if (!scene.playerStats) {
    console.error("No player stats available for applying outcome");
    return;
  }
  
  console.log("Applying outcome:", outcomeText);
  
  // Parse and apply the outcome effects from the narrative prompt
  let statChanges = [];
  
  // Flexible regex to catch all stat formats
  const statChangeRegex = /\(\s*([-+]\d+)\s*(\w+)\s*\)(?:\s*\[type=(\w+)\])?/g;
  let match;
  
  // Collect all stat changes first
  while ((match = statChangeRegex.exec(outcomeText)) !== null) {
    console.log("Matched stat change:", match);
    const value = parseInt(match[1]);
    const stat = match[2].toLowerCase();
    const type = match[3] ? match[3].toLowerCase() : null;
    
    statChanges.push({ value, stat, type });
  }
  
  // Now apply all stat changes
  for (const change of statChanges) {
    const { value, stat, type } = change;
    
    if (stat === 'health') {
      if (type && value < 0) {
        // Negative health with damage type (e.g., predator, fall)
        let dmgVal = -value; // damage is positive
        const rVal = scene.equippedResist && scene.equippedResist[type] || 0;
        const damageReduction = Math.min(rVal, dmgVal * 0.7); // Cap damage reduction at 70%
        dmgVal = Math.max(dmgVal - damageReduction, 0);
        
        // Show damage reduction feedback if significant
        if (damageReduction > 0 && scene.player) {
          createFloatingText(scene, scene.player.x, scene.player.y - 30, `Resisted ${damageReduction.toFixed(1)}`, 0xffdd00);
        }
        
        scene.playerStats.health = Math.max(scene.playerStats.health - dmgVal, 0);
        
        // Damage feedback
        if (scene.player && dmgVal > 0) {
          scene.player.setTint(0xff0000);
          scene.time.delayedCall(200, () => scene.player.clearTint());
          scene.cameras.main.shake(100, 0.005 * dmgVal);
          createFloatingText(scene, scene.player.x, scene.player.y - 10, `-${dmgVal}`, 0xff0000);
        }
      } else {
        // Regular health change
        scene.playerStats.health = Math.max(scene.playerStats.health + value, 0);
        if (value > 0) {
          scene.playerStats.health = Math.min(scene.playerStats.health, 100);
          if (scene.player) {
            createFloatingText(scene, scene.player.x, scene.player.y - 20, `+${value} health`, 0x00ff00);
          }
        }
      }
    } else if (['stamina', 'thirst', 'hunger'].includes(stat)) {
      // Adjust stat
      scene.playerStats[stat] = Math.max(scene.playerStats[stat] + value, 0);
      scene.playerStats[stat] = Math.min(scene.playerStats[stat], 100);
      
      // Visual feedback for significant changes
      if (value != 0 && scene.player) {
        const color = value > 0 ? 0x00ff00 : 0xff6600;
        const sign = value > 0 ? '+' : '';
        createFloatingText(scene, scene.player.x, scene.player.y - 15, `${sign}${value} ${stat}`, color);
      }
    } else if (stat === 'experience' || stat === 'exp') {
      // Add experience and level up system
      if (value > 0 && scene.playerStats) {
        scene.playerStats.experience = (scene.playerStats.experience || 0) + value;
        if (scene.player) {
          createFloatingText(scene, scene.player.x, scene.player.y - 25, `+${value} EXP`, 0x00ffff);
        }
        
        // Check for level up
        checkLevelUp(scene);
      }
    }
  }
  
  // Apply survival ticks (after narrative outcome effects)
  if (scene.currentZone !== "Village") {
    scene.playerStats.thirst = Math.max(scene.playerStats.thirst - 5, 0);
    scene.playerStats.hunger = Math.max(scene.playerStats.hunger - 5, 0);
    scene.playerStats.stamina = Math.max(scene.playerStats.stamina - 5, 0);
  }
  
  // Apply penalties for critically low survival stats
  if (scene.currentZone !== "Village") {
    const { stamina, thirst, hunger, health } = scene.playerStats;
    let healthReduction = 0;
    
    // Survival mechanics - health penalties for very low stats
    if (stamina <= 10 || thirst <= 10 || hunger <= 10) {
      healthReduction = 8;
    } else if (stamina <= 25 || thirst <= 25 || hunger <= 25) {
      healthReduction = 3;
    }
    
    if (healthReduction > 0) {
      scene.playerStats.health = Math.max(health - healthReduction, 0);
      console.log(`Health reduced by ${healthReduction} due to low stats`);
      
      if (scene.player) {
        createFloatingText(scene, scene.player.x, scene.player.y, `${healthReduction} damage due to survival`, 0xff6600);
      }
    }
  }
  
  // Check for player death after all effects
  if (scene.playerStats.health <= 0) {
    // Import and call handlePlayerDeath if available
    import('../player/player.js').then(module => {
      if (typeof module.handlePlayerDeath === 'function') {
        module.handlePlayerDeath(scene);
      }
    });
  }
}

// Initializes narrative data
export function initializeNarrative(scene) {
  scene.narrativeScreen = SCREEN_NONE;
  scene.activePrompt = null;
  scene.chosenOptionIndex = -1;
  scene.promptCount = scene.promptCount || 0;

  scene.narrativePrologues = scene.cache.json.get("narrativePrologues");
  scene.narrativeData = scene.cache.json.get("narrativePrompts");
  
  console.log("Narrative system initialized:", 
    !!scene.narrativePrologues, 
    !!scene.narrativeData);
}

// Shows prologue if available
export function showPrologue(scene) {
  const zone = scene.currentZone;
  
  // Make sure key data exists
  if (!scene.narrativePrologues) {
    console.error("No prologues data available!");
    scene.narrativeScreen = SCREEN_PROMPT;
    showPrompt(scene);
    return;
  }
  
  const prologues = scene.narrativePrologues[zone];
  if (!prologues || prologues.length === 0) {
    console.log("No prologues for zone:", zone);
    scene.narrativeScreen = SCREEN_PROMPT;
    showPrompt(scene);
    return;
  }
  
  // Select random prologue for this zone
  const text = prologues[Phaser.Math.Between(0, prologues.length - 1)];
  showDialog(scene, text + "\n\n(Press SPACE to continue)");
  
  // Make sure any existing SPACE handlers are removed
  scene.input.keyboard.off('keydown-SPACE');
  
  // Add handler for SPACE to advance to prompt screen
  scene.input.keyboard.once("keydown-SPACE", () => {
    scene.narrativeScreen = SCREEN_PROMPT;
    showPrompt(scene); 
  });
}

// Presents narrative prompt based on zone and time of day
export function showPrompt(scene) {
  console.log("Showing prompt for zone:", scene.currentZone);
  
  // Make sure key data exists
  if (!scene.narrativeData || !scene.narrativeData.zones) {
    console.error("No narrative data available!");
    hideDialog(scene);
    scene.narrativeScreen = SCREEN_NONE;
    return;
  }
  
  const zone = scene.currentZone;
  const prompts = scene.narrativeData.zones[zone];
  
  if (!prompts || prompts.length === 0) {
    console.warn("No prompts for zone:", zone);
    hideDialog(scene);
    scene.narrativeScreen = SCREEN_NONE;
    return;
  }
  
  // Add variation to prompts based on time of day
  const gameTime = scene.registry.get('gameTime') || 0;
  const gameHour = (6 + Math.floor(gameTime / scene.secondsPerHour)) % 24;
  const timeOfDay = gameHour < 12 ? "morning" : (gameHour < 18 ? "afternoon" : "evening");
  
  // Filter prompts that match current time of day if available
  const timePrompts = prompts.filter(p => 
    p.timeOfDay === timeOfDay || !p.timeOfDay);
  
  const availablePrompts = timePrompts.length > 0 ? timePrompts : prompts;
  const randIndex = Phaser.Math.Between(0, availablePrompts.length - 1);
  
  scene.activePrompt = availablePrompts[randIndex];
  
  // Display prompt dialog
  showDialog(scene, `--- ${zone} (${timeOfDay}) ---\n\n${scene.activePrompt.prompt}\n\n(Press SPACE to see choices)`);
  
  // Remove any existing SPACE key handlers
  scene.input.keyboard.off('keydown-SPACE');
  
  // Add SPACE handler to advance to choices
  scene.input.keyboard.once("keydown-SPACE", () => {
    scene.narrativeScreen = SCREEN_CHOICES;
    showChoices(scene);
  });
}

// Presents available choices for the active narrative prompt
export function showChoices(scene) {
  if (!scene.activePrompt) {
    console.error("No active prompt for choices!");
    scene.narrativeScreen = SCREEN_NONE;
    hideDialog(scene);
    return;
  }
  
  // Prepare options array for the UI system
  const options = scene.activePrompt.options.map((opt, i) => ({
    label: opt,
    callback: () => {
      scene.chosenOptionIndex = i;
      scene.narrativeScreen = SCREEN_OUTCOME;
      showOutcome(scene);
    }
  }));
  
  // Add travel options after enough exploration
  if (scene.promptCount >= 8) {
    const extraOption = getExtraOption(scene);
    if (extraOption) {
      options.push({
        label: extraOption,
        highlight: true,  // Make it stand out
        callback: () => {
          handleReturn(scene);
        }
      });
    }
  }
  
  // Add back option
  options.push({
    label: "Back",
    callback: () => {
      scene.narrativeScreen = SCREEN_PROMPT;
      clearButtons(scene);
      showPrompt(scene);
    }
  });
  
  // Show the choice dialog with buttons
  showDialog(scene, "Pick one choice:");
  createButtons(scene, options);
}

// Determines any additional travel option
function getExtraOption(scene) {
  if (scene.currentZone === "Outer Grasslands") {
    return "Return to Village";
  } else if (scene.currentZone !== "Village") {
    const currentIndex = scene.zoneList?.findIndex(z => z.name === scene.currentZone);
    if (currentIndex > 0) {
      return `Return to ${scene.zoneList[currentIndex - 1].name}`;
    }
  }
  return null;
}

// Shows the outcome of chosen narrative action
export async function showOutcome(scene) {
  clearButtons(scene);
  
  if (!scene.activePrompt) {
    console.error("No active prompt for outcome!");
    scene.narrativeScreen = SCREEN_NONE;
    hideDialog(scene);
    return;
  }
  
  if (scene.chosenOptionIndex < 0 || 
      scene.chosenOptionIndex >= scene.activePrompt.outcomes.length) {
    console.error("Invalid choice index:", scene.chosenOptionIndex);
    scene.narrativeScreen = SCREEN_NONE;
    hideDialog(scene);
    return;
  }
  
  const outcomeText = scene.activePrompt.outcomes[scene.chosenOptionIndex];
  
  // Show loading animation
  showDialog(scene, "Processing outcome, please wait...");
  
  // Add short delay for anticipation
  await new Promise(resolve => {
    scene.time.delayedCall(300, resolve);
  });
  
  // Apply the outcome with visual effects
  scene.cameras.main.flash(200, 255, 255, 255, true);
  
  // Process the outcome using the enhanced system
  await applyOutcome(scene, outcomeText);
  
  // Set up handler to end the flow
  scene.input.keyboard.off('keydown-SPACE');
  scene.input.keyboard.once("keydown-SPACE", () => {
    endFlow(scene);
  });
}

// Enhanced outcome processing system
export async function applyOutcome(scene, outcomeText) {
  console.log("Applying outcome:", outcomeText);
  
  // Make sure the player stats exist
  if (!scene.playerStats) {
    console.error("Player stats missing!");
    showDialog(scene, `Outcome:\n\n${outcomeText}\n\n(Press SPACE to continue)`);
    return;
  }
  
  // Apply survival effects from the outcome text
  applySurvivalTickAndOutcome(scene, outcomeText);
  
  // Handle loot generation
  let modifiedOutcomeText = outcomeText;
  if (outcomeText.includes("(+Loot)")) {
    const randomItemName = getRandomLootForZone(scene);
    if (randomItemName) {
      addToInventory(scene, randomItemName);
      modifiedOutcomeText += `\nLoot received: ${randomItemName}`;
      
      // Add loot to log
      addToLog(scene, `Received: ${randomItemName}`);
      
      // Visual loot feedback
      if (scene.player) {
        createSimpleEffect(scene, scene.player.x, scene.player.y + 10, EFFECT_COLORS.LOOT);
      }
    } else {
      modifiedOutcomeText += "\nSearched but found nothing of value.";
      addToLog(scene, "Searched but found nothing of value");
    }
  }
  
  // Update HUD after all changes
  updateHUD(scene);
  
  // Check for zone transition
  const travelMatch = outcomeText.match(/\(Travel to ([^)]+)\)/i);
  if (travelMatch) {
    const zoneName = travelMatch[1].trim();
    console.log("Travel outcome detected. Zone name extracted:", zoneName);
    
    if (scene.zoneList) {
      const zone = scene.zoneList.find(z => 
        z.name.toLowerCase() === zoneName.toLowerCase());
      
      if (zone) {
        console.log("Traveling to zone:", zone.name);
        showDialog(scene, `Traveling to ${zone.name}...\n(Press SPACE to continue)`);
        
        // Clean up keyboard handlers
        scene.input.keyboard.off('keydown-SPACE');
        
        scene.input.keyboard.once("keydown-SPACE", () => {
          // Add transition effect
          scene.cameras.main.fadeOut(500);
          scene.time.delayedCall(500, () => {
            scene.scene.restart({ 
              zone: zone, 
              inventory: scene.localInventory, 
              promptCount: scene.promptCount,
              playerStats: scene.playerStats 
            });
          });
        });
        return;
      } else {
        console.warn("No matching zone found for:", zoneName);
      }
    }
  }
  
  // Check for fishing scene transition
  if (outcomeText.toLowerCase().includes("transition to fishing scene")) {
    console.log("Transitioning to FishingScene");
    scene.scene.start('FishingScene', {
      inventory: scene.localInventory,
      zone: scene.currentZone,
      playerStats: scene.playerStats
    });
    return;
  }
  
  // Display the final outcome text
  showDialog(scene, `Outcome:\n\n${modifiedOutcomeText}\n\n(Press SPACE to continue)`);
}

// Ends current narrative interaction
export function endFlow(scene) {
  scene.narrativeScreen = SCREEN_NONE;
  scene.activePrompt = null;
  scene.chosenOptionIndex = -1;
  hideDialog(scene);
  console.log("Narrative flow ended. Prompt count updated.");
  updateHUD(scene);
  scene.promptCount++;
  console.log("Prompt count:", scene.promptCount);
}

// Handles returning to a previous zone
export function handleReturn(scene) {
  let targetZone = null;
  if (scene.currentZone === "Outer Grasslands") {
    targetZone = scene.zoneList.find(z => z.name.toLowerCase() === "village");
  } else if (scene.currentZone !== "Village") {
    let currentIndex = scene.zoneList.findIndex(z => z.name === scene.currentZone);
    if (currentIndex > 0) targetZone = scene.zoneList[currentIndex - 1];
  }
  
  if (targetZone) {
    console.log(`Return option selected. Traveling to zone: ${targetZone.name}`);
    showDialog(scene, `Returning to ${targetZone.name}...\n(Press SPACE to continue)`);
    
    // Remove any existing space key handlers
    scene.input.keyboard.off('keydown-SPACE');
    
    // Transition effect
    scene.cameras.main.fadeOut(500);
    
    scene.input.keyboard.once("keydown-SPACE", () => {
      // Get current stats to preserve
      const currentOromozi = scene.playerStats.oromozi || 1000;
      const currentLevel = scene.playerStats.level || 1;
      const currentExp = scene.playerStats.experience || 0;
      
      // Create fresh stats but preserve important values
      scene.playerStats.currentZone = targetZone.name;
      scene.playerStats.oromozi = currentOromozi;
      scene.playerStats.level = currentLevel;
      scene.playerStats.experience = currentExp;
      
      // Restart the scene with new zone
      scene.scene.restart({ 
        zone: targetZone, 
        inventory: scene.localInventory, 
        promptCount: 0,
        playerStats: scene.playerStats
      });
    });
  } else {
    console.warn("Return option selected, but no target zone found.");
  }
}
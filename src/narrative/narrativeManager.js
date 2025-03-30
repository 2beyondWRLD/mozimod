// narrativeManager.js

import { showDialog, hideDialog, createScrollableMenu, clearButtons, createButtons, updateHUD } from '../ui/uiManager.js';
import { applySurvivalTickAndOutcome, checkLevelUp } from '../player/player.js';
import { createSimpleEffect, addToInventory, getRandomLootForZone, addToLog } from '../inventory/inventorySystem.js';

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

// Initializes narrative data
export function initializeNarrative(scene) {
  scene.narrativeScreen = SCREEN_NONE;
  scene.activePrompt = null;
  scene.chosenOptionIndex = -1;
  scene.promptCount = 0;

  scene.narrativePrologues = scene.cache.json.get("narrativePrologues");
  scene.narrativeData = scene.cache.json.get("narrativePrompts");
}

// Shows prologue if available
export function showPrologue(scene) {
  const zone = scene.currentZone;
  const prologues = scene.narrativePrologues?.[zone];
  if (!prologues || prologues.length === 0) {
    console.log("No prologues for zone:", zone);
    scene.narrativeScreen = SCREEN_PROMPT;
    showPrompt(scene);
    return;
  }
  const text = prologues[Phaser.Math.Between(0, prologues.length - 1)];
  showDialog(scene, text + "\n\n(Press SPACE to continue)");
}

// Presents narrative prompt based on zone and time of day
export function showPrompt(scene) {
  const zone = scene.currentZone;
  const prompts = scene.narrativeData?.zones?.[zone];
  if (!prompts || prompts.length === 0) {
    console.warn("No prompts for zone:", zone);
    hideDialog(scene);
    scene.narrativeScreen = SCREEN_NONE;
    return;
  }
  
  // Add variation to prompts based on time of day
  const gameTime = scene.registry.get('gameTime');
  const gameHour = (6 + Math.floor(gameTime / scene.secondsPerHour)) % 24;
  const timeOfDay = gameHour < 12 ? "morning" : (gameHour < 18 ? "afternoon" : "evening");
  
  // Filter prompts that match current time of day if available
  const timePrompts = prompts.filter(p => p.timeOfDay === timeOfDay);
  const availablePrompts = timePrompts.length > 0 ? timePrompts : prompts;
  
  const randIndex = Phaser.Math.Between(0, availablePrompts.length - 1);
  scene.activePrompt = availablePrompts[randIndex];
  
  showDialog(scene, `--- ${zone} (${timeOfDay}) ---\n\n${scene.activePrompt.prompt}\n\n(Press SPACE to see choices)`);
}

// Presents available choices for the active narrative prompt
export function showChoices(scene) {
  if (!scene.activePrompt) return;
  showDialog(scene, "Pick one choice:");
  
  const lines = scene.activePrompt.options.map((opt, i) => ({
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
      lines.push({
        label: extraOption,
        highlight: true,  // Make it stand out
        callback: () => {
          handleReturn(scene);
        }
      });
    }
  }
  
  lines.push({
    label: "Back",
    callback: () => {
      scene.narrativeScreen = SCREEN_PROMPT;
      clearButtons(scene);
      showPrompt(scene);
    }
  });
  
  // Use the enhanced buttons instead of scrollable menu for better aesthetics
  createButtons(scene, lines);
}

// Determines any additional travel option
function getExtraOption(scene) {
  if (scene.currentZone === "Outer Grasslands") {
    return "Return to Village";
  } else if (scene.currentZone !== "Village") {
    const currentIndex = scene.zoneList.findIndex(z => z.name === scene.currentZone);
    if (currentIndex > 0) {
      return `Return to ${scene.zoneList[currentIndex - 1].name}`;
    }
  }
  return null;
}

// Shows the outcome of chosen narrative action
export async function showOutcome(scene) {
  clearButtons(scene);
  if (!scene.activePrompt) return;
  if (scene.chosenOptionIndex < 0 || scene.chosenOptionIndex >= scene.activePrompt.outcomes.length) return;
  
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
}

// Enhanced outcome processing system
export async function applyOutcome(scene, outcomeText) {
  console.log("Before applying outcome, player stats:", scene.playerStats);
  
  // Apply survival effects from the outcome text
  applySurvivalTickAndOutcome(scene, outcomeText);
  
  console.log("After applying outcome, player stats:", scene.playerStats);
  
  // Award experience for completing events
  if (scene.playerStats && scene.currentZone !== "Village") {
    const baseExp = 5;
    const expGain = baseExp + Math.floor(Math.random() * 5);
    scene.playerStats.experience = (scene.playerStats.experience || 0) + expGain;
    outcomeText += `\n(+${expGain} EXP)`;
    checkLevelUp(scene);
  }
  
  // Handle loot generation
  if (outcomeText.includes("(+Loot)")) {
    const randomItemName = getRandomLootForZone(scene);
    if (randomItemName) {
      addToInventory(scene, randomItemName);
      outcomeText += `\nLoot received: ${randomItemName}`;
      
      // Add loot to log
      addToLog(scene, `Received: ${randomItemName}`);
      
      // Visual loot feedback
      if (scene.player) {
        createSimpleEffect(scene, scene.player.x, scene.player.y + 10, EFFECT_COLORS.LOOT);
      }
    } else {
      outcomeText += "\nSearched but found nothing of value.";
      // Also log no loot found
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
    const zone = scene.zoneList.find(z => z.name.toLowerCase() === zoneName.toLowerCase());
    if (zone) {
      console.log("Traveling to zone:", zone.name);
      showDialog(scene, `Traveling to ${zone.name}...\n(Press SPACE to continue)`);
      await new Promise(resolve => {
        scene.input.keyboard.once("keydown-SPACE", () => resolve());
      });
      scene.time.removeAllEvents();
      scene.scene.restart({ 
        zone: zone, 
        inventory: scene.localInventory, 
        promptCount: scene.promptCount,
        playerStats: scene.playerStats 
      });
      return;
    } else {
      console.warn("No matching zone found for:", zoneName);
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
  showDialog(scene, `Outcome:\n\n${outcomeText}\n\n(Press SPACE to continue)`);
}

// Ends current narrative interaction
export function endFlow(scene) {
  scene.narrativeScreen = SCREEN_NONE;
  scene.activePrompt = null;
  scene.chosenOptionIndex = -1;
  hideDialog(scene);
  console.log("Narrative flow ended.");
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
    
    // Transition effect
    scene.cameras.main.fadeOut(500);
    
    scene.input.keyboard.once("keydown-SPACE", () => {
      const currentOromozi = scene.playerStats.oromozi;
      
      // Check if createInitialStats function exists
      let createInitialStats;
      import('../player/player.js').then(module => {
        createInitialStats = module.createInitialStats;
        
        // Update player stats
        if (typeof createInitialStats === 'function') {
          scene.playerStats = createInitialStats(targetZone.name, currentOromozi);
          
          // Preserve level and experience
          if (scene.playerStats.level) {
            const currentLevel = scene.playerStats.level;
            const currentExp = scene.playerStats.experience;
            scene.playerStats.level = currentLevel;
            scene.playerStats.experience = currentExp;
          }
        } else {
          // Fallback if function doesn't exist
          console.warn("createInitialStats function not found, preserving existing stats");
          scene.playerStats.currentZone = targetZone.name;
        }
        
        // Restart the scene with new zone
        scene.scene.restart({ 
          zone: targetZone, 
          inventory: scene.localInventory, 
          promptCount: 0,
          playerStats: scene.playerStats
        });
      });
    });
  } else {
    console.warn("Return option selected, but no target zone found.");
  }
}
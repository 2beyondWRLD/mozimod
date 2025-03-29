// narrativeManager.js

import { showDialog, hideDialog, createScrollableMenu, clearButtons, createButtons, updateHUD } from '../ui/uiManager.js';

// Screen states for narrative control
export const SCREEN_NONE = 0;
export const SCREEN_PROLOGUE = 1;
export const SCREEN_PROMPT = 2;
export const SCREEN_CHOICES = 3;
export const SCREEN_OUTCOME = 4;
export const SCREEN_ITEM_MENU = 5;
export const SCREEN_ITEM_PICK = 6;

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
  await applyOutcomeEffects(scene, outcomeText);
  
  showDialog(scene, `Outcome:\n\n${outcomeText}\n\n(Press SPACE to continue)`);
  scene.narrativeScreen = SCREEN_OUTCOME;
}

// Applies effects based on narrative outcomes (expanded function combining both versions)
async function applyOutcomeEffects(scene, outcomeText) {
  // Check for specific scene transitions
  if (outcomeText.toLowerCase().includes("transition to fishing scene")) {
    scene.scene.start('FishingScene', {
      inventory: scene.localInventory,
      zone: scene.currentZone,
      playerStats: scene.playerStats
    });
    return;
  }
  
  // Add any other outcome processing here
  // For future expansion of outcomes and their effects
  
  return new Promise(resolve => {
    // Short delay to simulate processing
    scene.time.delayedCall(200, resolve);
  });
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
      if (typeof createInitialStats === 'function') {
        scene.playerStats = createInitialStats(targetZone.name, currentOromozi);
        
        // Preserve level and experience
        if (scene.playerStats.level) {
          scene.playerStats.level = scene.playerStats.level;
          scene.playerStats.experience = scene.playerStats.experience;
        }
      } else {
        // Fallback if function doesn't exist
        console.warn("createInitialStats function not found, preserving existing stats");
        scene.playerStats.zone = targetZone.name;
      }
      
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
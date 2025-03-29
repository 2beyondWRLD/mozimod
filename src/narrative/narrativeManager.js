// narrativeManager.js

import { showDialog, hideDialog, createScrollableMenu, clearButtons } from '../ui/uiManager.js';

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
    hideDialog(scene);
    scene.narrativeScreen = SCREEN_NONE;
    return;
  }

  const gameTime = scene.registry.get('gameTime');
  const gameHour = (6 + Math.floor(gameTime / scene.secondsPerHour)) % 24;
  const timeOfDay = gameHour < 12 ? "morning" : (gameHour < 18 ? "afternoon" : "evening");

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

  if (scene.promptCount >= 8) {
    const extraOption = getExtraOption(scene);
    if (extraOption) {
      lines.push({
        label: extraOption,
        highlight: true,
        callback: () => handleReturn(scene)
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

  createScrollableMenu(scene, "Choices", lines);
}

// Determines any additional travel option
function getExtraOption(scene) {
  if (scene.currentZone === "Outer Grasslands") {
    return "Return to Village";
  }
  const currentIndex = scene.zoneList.findIndex(z => z.name === scene.currentZone);
  if (currentIndex > 0) {
    return `Return to ${scene.zoneList[currentIndex - 1].name}`;
  }
  return null;
}

// Shows the outcome of chosen narrative action
export function showOutcome(scene) {
  clearButtons(scene);
  if (!scene.activePrompt) return;

  const outcomeText = scene.activePrompt.outcomes?.[scene.chosenOptionIndex] || "No specific outcome.";
  applyOutcomeEffects(scene, outcomeText);

  showDialog(scene, `Outcome:\n\n${outcomeText}\n\n(Press SPACE to continue)`);
}

// Applies effects based on narrative outcomes (can expand this later)
function applyOutcomeEffects(scene, outcomeText) {
  if (outcomeText.toLowerCase().includes("transition to fishing scene")) {
    scene.scene.start('FishingScene', {
      inventory: scene.localInventory,
      zone: scene.currentZone,
      playerStats: scene.playerStats
    });
  }
}

// Ends current narrative interaction
export function endFlow(scene) {
  scene.narrativeScreen = SCREEN_NONE;
  scene.activePrompt = null;
  scene.chosenOptionIndex = -1;
  hideDialog(scene);
  scene.promptCount++;
}

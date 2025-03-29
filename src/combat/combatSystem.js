// combatSystem.js

import { showDialog, hideDialog, createButtons, clearButtons, showModalOverlay, hideModalOverlay, createScrollableMenu } from '../ui/uiManager.js';
import { createSimpleEffect, createFloatingText, addToInventory, removeFromInventory, getItemData, getRandomLootForZone } from '../inventory/inventorySystem.js';

// Constants for narrative screens (import or define these depending on your architecture)
export const SCREEN_NONE = 0;
export const SCREEN_BATTLE = 13; // Assuming this is the battle screen constant

// Calculate player's battle statistics including equipment bonuses
export function calculateBattleStats(scene) {
  const baseStats = {
    health: scene.playerStats.health,
    attack: 8 + (scene.playerStats.level - 1) * 2,
    defense: 3 + Math.floor((scene.playerStats.level - 1) * 0.7),
    evasion: 5 + Math.floor((scene.playerStats.level - 1) * 0.5)
  };
  
  // Add equipment bonuses
  if (scene.equippedItems) {
    scene.equippedItems.forEach(item => {
      const data = getItemData(scene, item);
      if (data?.combatEffects) {
        baseStats.attack += data.combatEffects.attack || 0;
        baseStats.defense += data.combatEffects.defense || 0;
        baseStats.evasion += data.combatEffects.evasion || 0;
      }
    });
  }
  
  return baseStats;
}

// Applies effects from items
export function applyItemEffects(scene, itemData) {
  if (!itemData || !itemData.statEffects) return false;
  
  let applied = false;
  
  // Apply health effects
  if (itemData.statEffects.health) {
    scene.playerStats.health = Math.min(100, scene.playerStats.health + itemData.statEffects.health);
    applied = true;
  }
  
  // Apply stamina effects
  if (itemData.statEffects.stamina) {
    scene.playerStats.stamina = Math.min(100, scene.playerStats.stamina + itemData.statEffects.stamina);
    applied = true;
  }
  
  // Apply hunger effects
  if (itemData.statEffects.hunger) {
    scene.playerStats.hunger = Math.min(100, scene.playerStats.hunger + itemData.statEffects.hunger);
    applied = true;
  }
  
  // Apply thirst effects
  if (itemData.statEffects.thirst) {
    scene.playerStats.thirst = Math.min(100, scene.playerStats.thirst + itemData.statEffects.thirst);
    applied = true;
  }
  
  return applied;
}

// Check for level up and apply benefits
export function checkLevelUp(scene) {
  const currentLevel = scene.playerStats.level || 1;
  const currentExp = scene.playerStats.experience || 0;
  
  // Simple level formula: each level requires level * 100 exp
  const expRequired = currentLevel * 100;
  
  if (currentExp >= expRequired) {
    scene.playerStats.level = currentLevel + 1;
    scene.playerStats.experience = currentExp - expRequired;
    
    // Apply level up benefits
    scene.playerStats.health = 100; // Full heal on level up
    
    // Visual effects for level up
    if (scene.player) {
      // Particles or simple effects
      createSimpleEffect(scene, scene.player.x, scene.player.y, 0x00ffff);
      
      // Level up text
      createFloatingText(scene, scene.player.x, scene.player.y - 40, 
                         `LEVEL UP! (${currentLevel} → ${currentLevel + 1})`, 0xffff00, 20);
      
      // Camera flash effect
      scene.cameras.main.flash(500, 255, 255, 255, true);
    }
    
    // Show level up message
    showDialog(scene, `Congratulations!\nYou reached Level ${currentLevel + 1}!\n\nHealth fully restored.\n\n(Press SPACE to continue)`);
    
    // Allow continuing with spacebar
    scene.input.keyboard.once("keydown-SPACE", () => {
      hideDialog(scene);
    });
    
    console.log(`Player leveled up to ${currentLevel + 1}`);
    return true;
  }
  
  return false;
}

// Initiates battle mode with an enemy
export function enterBattleMode(scene) {
  scene.narrativeScreen = SCREEN_BATTLE;
  showModalOverlay(scene);
  const battleStats = calculateBattleStats(scene);

  // Generate enemy with scaled stats
  const enemyLevel = Math.max(1, scene.playerStats.level - 1 + Math.floor(Math.random() * 3));
  const enemy = {
    name: ["Goblin", "Wolf", "Bandit", "Skeleton", "Troll"][Math.floor(Math.random() * 5)],
    health: 50 + enemyLevel * 10,
    maxHealth: 50 + enemyLevel * 10,
    attack: 5 + enemyLevel * 2,
    defense: 2 + Math.floor(enemyLevel * 1.5),
    level: enemyLevel
  };

  scene.battleEnemy = enemy;
  scene.battleTurn = 0;
  scene.battleLog = [];

  updateBattleUI(scene);

  // Setup combat controls
  scene.input.keyboard.off('keydown-SPACE');
  scene.input.keyboard.on('keydown-SPACE', () => performBattleAction(scene, 'attack'));
  scene.input.keyboard.on('keydown-ONE', () => performBattleAction(scene, 'attack'));
  scene.input.keyboard.on('keydown-TWO', () => performBattleAction(scene, 'defend'));
  scene.input.keyboard.on('keydown-THREE', () => performBattleAction(scene, 'item'));
  scene.input.keyboard.on('keydown-FOUR', () => performBattleAction(scene, 'flee'));
}

// Updates battle UI with current stats and logs
function updateBattleUI(scene) {
  const battleStats = calculateBattleStats(scene);
  const enemy = scene.battleEnemy;

  let battleText = `Battle Mode - Turn ${scene.battleTurn}\n\n`;
  battleText += `Player (Lv.${scene.playerStats.level}):\nHP: ${scene.playerStats.health}/100\nATK: ${battleStats.attack} DEF: ${battleStats.defense} EVA: ${battleStats.evasion}\n\n`;
  battleText += `Enemy ${enemy.name} (Lv.${enemy.level}):\nHP: ${enemy.health}/${enemy.maxHealth}\nATK: ${enemy.attack} DEF: ${enemy.defense}\n\n`;

  if (scene.battleLog && scene.battleLog.length > 0) {
    battleText += "Battle Log:\n" + scene.battleLog.slice(-3).join('\n') + "\n\n";
  }

  battleText += "Commands:\n1) Attack  2) Defend\n3) Use Item  4) Flee";
  showDialog(scene, battleText);
}

// Player and enemy action handling
function performBattleAction(scene, action) {
  if (!scene.battleEnemy) return;

  const battleStats = calculateBattleStats(scene);
  const enemy = scene.battleEnemy;
  scene.battleTurn++;
  let damage, log;

  switch (action) {
    case 'attack':
      damage = Math.max(1, battleStats.attack - enemy.defense + Phaser.Math.Between(-2, 2));
      enemy.health = Math.max(0, enemy.health - damage);
      scene.battleLog.push(`You attack for ${damage} damage!`);
      break;

    case 'defend':
      scene.battleDefending = true;
      scene.battleLog.push(`You take a defensive stance!`);
      break;

    case 'item':
      showBattleItemMenu(scene);
      return;

    case 'flee':
      const escapeChance = 0.4 + (scene.playerStats.level - enemy.level) * 0.1;
      if (Math.random() < escapeChance) {
        scene.battleLog.push("You successfully fled!");
        endBattle(scene, 'flee');
        return;
      } else {
        scene.battleLog.push("Failed to escape!");
      }
      break;
  }

  if (enemy.health <= 0) {
    endBattle(scene, 'victory');
    return;
  }

  enemyTurn(scene, enemy, battleStats);
}

// Enemy's turn logic
function enemyTurn(scene, enemy, battleStats) {
  const enemyDamage = Math.max(1, enemy.attack - battleStats.defense - (scene.battleDefending ? 5 : 0) + Phaser.Math.Between(-2, 2));
  scene.battleDefending = false;

  if (Math.random() < battleStats.evasion / 100) {
    scene.battleLog.push(`${enemy.name} attacks but you dodge!`);
  } else {
    scene.playerStats.health = Math.max(0, scene.playerStats.health - enemyDamage);
    scene.battleLog.push(`${enemy.name} attacks for ${enemyDamage} damage!`);
  }

  if (scene.playerStats.health <= 0) {
    endBattle(scene, 'defeat');
    return;
  }

  updateBattleUI(scene);
}

// Display item menu during battle
function showBattleItemMenu(scene) {
  const healingItems = scene.localInventory.filter(item => {
    const data = getItemData(scene, item.name);
    return data && data.statEffects?.health;
  });

  if (healingItems.length === 0) {
    scene.battleLog.push("No usable items!");
    updateBattleUI(scene);
    return;
  }

  const options = healingItems.map(item => ({
    label: `${item.name} (Heals ${getItemData(scene, item.name).statEffects.health}) x${item.quantity}`,
    callback: () => {
      applyItemEffects(scene, getItemData(scene, item.name));
      removeFromInventory(scene, item.name, 1);
      scene.battleLog.push(`Used ${item.name} to restore health!`);
      enemyTurn(scene, scene.battleEnemy, calculateBattleStats(scene));
    }
  }));

  options.push({ label: "Cancel", callback: () => updateBattleUI(scene) });
  createScrollableMenu(scene, "Select an item to use:", options);
}

// Ends battle and handles outcomes (victory, defeat, flee)
function endBattle(scene, result) {
  let message;
  if (result === 'victory') {
    const expGain = 10 + scene.battleEnemy.level * 5;
    const oromoziGain = 20 + scene.battleEnemy.level * 10;
    scene.playerStats.experience += expGain;
    scene.playerStats.oromozi += oromoziGain;
    message = `Victory! Gained ${expGain} EXP, ${oromoziGain} OROMOZI.`;
    
    // Add reward loot on victory
    const lootChance = 0.75; // 75% chance to get loot
    if (Math.random() < lootChance) {
      const loot = getRandomLootForZone(scene);
      if (loot) {
        addToInventory(scene, loot);
        message += `\nFound: ${loot}`;
      }
    }
    
    // Check for level up
    const didLevelUp = checkLevelUp(scene);
    if (didLevelUp) {
      message += `\n\nLEVELED UP to ${scene.playerStats.level}!`;
    }
    
  } else if (result === 'defeat') {
    scene.playerStats.oromozi = Math.max(0, scene.playerStats.oromozi - 50);
    scene.playerStats.health = 20;
    message = `Defeat! Lost 50 OROMOZI.`;
  } else {
    message = "You escaped safely.";
  }

  showDialog(scene, `${message}\n\n(Press SPACE to continue)`);
  scene.input.keyboard.once("keydown-SPACE", () => {
    hideDialog(scene);
    hideModalOverlay(scene);
    scene.narrativeScreen = SCREEN_NONE;
    
    // Reset combat-specific keyboard bindings
    scene.input.keyboard.off('keydown-ONE');
    scene.input.keyboard.off('keydown-TWO');
    scene.input.keyboard.off('keydown-THREE');
    scene.input.keyboard.off('keydown-FOUR');
  });
}
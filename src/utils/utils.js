// utils.js

// Visual effect settings
export const EFFECT_COLORS = {
  LOOT: 0xFFD700,      // Gold
  ATTACK: 0xFF0000,    // Red
  HEAL: 0x00FF00,      // Green
  EXPERIENCE: 0x00FFFF, // Cyan
  DAMAGE: 0xFF6600,    // Orange
  BUFF: 0xFFAA00,      // Light orange
  DEBUFF: 0xFF00FF     // Magenta
};

// Sound effects (placeholders - will need actual sound files)
export const SOUNDS = {
  ATTACK: 'attack',
  LOOT: 'loot_pickup',
  HURT: 'player_hurt',
  ITEM_USE: 'item_use',
  CRATE_BREAK: 'crate_break',
  MONSTER_HURT: 'monster_hurt',
  MONSTER_DEATH: 'monster_death',
  LEVEL_UP: 'level_up'
};

// Initializes the equipped item data structures
export function initEquippedData(scene) {
  scene.equippedItems = scene.equippedItems || [];
  scene.equippedResist = scene.equippedResist || {};
}

// Recalculates total resistance from equipped items
export function recalcEquippedResist(scene) {
  scene.equippedResist = {};
  scene.equippedItems.forEach(itemName => {
    const data = getItemData(scene, itemName);
    if (data?.resist) {
      Object.keys(data.resist).forEach(key => {
        scene.equippedResist[key] = (scene.equippedResist[key] || 0) + data.resist[key];
      });
    }
  });
}

// Retrieves item metadata from the loot table JSON
export function getItemData(scene, itemName) {
  if (!itemName) return null;
  const lootData = scene.cache.json.get("lootTable");
  if (!lootData?.zones) return null;

  for (const zoneItems of Object.values(lootData.zones)) {
    const foundItem = zoneItems.find(itemObj => itemObj.name === itemName);
    if (foundItem) return foundItem;
  }
  return null;
}

// Logs messages to the in-game log text UI
export function addToLog(scene, message) {
  if (!scene?.logMessages || !scene.logText) return;
  scene.logMessages.push(String(message));
  if (scene.logMessages.length > 5) scene.logMessages.shift();

  scene.logText.setText(scene.logMessages.join('\n')).setTint(0xffff00);
  scene.time.delayedCall(1000, () => scene.logText.clearTint());
}

// Creates a simple visual effect (fading circle)
export function createSimpleEffect(scene, x, y, color) {
  const circle = scene.add.circle(x, y, 15, color, 0.7).setDepth(3000);
  scene.tweens.add({
    targets: circle,
    alpha: 0,
    scale: 2,
    duration: 500,
    onComplete: () => circle.destroy()
  });
}

// Creates floating text that fades and rises upwards
export function createFloatingText(scene, x, y, text, color = 0xffffff, fontSize = 16) {
  const floatingText = scene.add.text(x, y, text, {
    fontFamily: 'Arial',
    fontSize: `${fontSize}px`,
    color: `#${color.toString(16).padStart(6, '0')}`,
    stroke: '#000000',
    strokeThickness: 2,
    align: 'center'
  }).setOrigin(0.5).setDepth(5000);

  scene.tweens.add({
    targets: floatingText,
    y: y - 50,
    alpha: 0,
    duration: 1500,
    ease: 'Power2',
    onComplete: () => floatingText.destroy()
  });
}

// Checks if a point overlaps any obstacles
export function overlapsObstacle(scene, x, y, buffer = 64) {
  if (!scene || !scene.obstacles) return false;
  
  const halfBuffer = buffer / 2;
  const rect = new Phaser.Geom.Rectangle(x - halfBuffer, y - halfBuffer, buffer, buffer);
  
  try {
    const obstacles = scene.obstacles.getChildren();
    if (!obstacles || !Array.isArray(obstacles)) return false;
    
    for (let obs of obstacles) {
      if (!obs || !obs.getBounds) continue;
      
      // Add a smaller margin around obstacles for better navigation
      const margin = 5; // Reduced from 10
      const obsBounds = obs.getBounds();
      const expandedBounds = new Phaser.Geom.Rectangle(
        obsBounds.x - margin,
        obsBounds.y - margin,
        obsBounds.width + margin * 2,
        obsBounds.height + margin * 2
      );
      
      if (Phaser.Geom.Intersects.RectangleToRectangle(rect, expandedBounds)) {
        return true;
      }
    }
  } catch (error) {
    console.warn("Error in collision detection:", error);
    return false;
  }
  
  // Also check for proximity to other objects of the same type
  // but with a smaller minimum distance
  const minDistance = buffer * 1.2; // Reduced from 1.5
  
  if (scene.lootCrates) {
    try {
      const crates = scene.lootCrates.getChildren();
      if (crates && Array.isArray(crates)) {
        for (let crate of crates) {
          if (!crate || !crate.x) continue;
          const dist = Phaser.Math.Distance.Between(x, y, crate.x, crate.y);
          if (dist < minDistance) return true;
        }
      }
    } catch (e) {
      console.warn("Error checking crate overlaps:", e);
    }
  }
  
  if (scene.exclamations) {
    try {
      const exs = scene.exclamations.getChildren();
      if (exs && Array.isArray(exs)) {
        for (let ex of exs) {
          if (!ex || !ex.x) continue;
          const dist = Phaser.Math.Distance.Between(x, y, ex.x, ex.y);
          if (dist < minDistance) return true;
        }
      }
    } catch (e) {
      console.warn("Error checking exclamation overlaps:", e);
    }
  }
  
  return false;
}

// Safely adds an item to player's inventory
export function safeAddToInventory(scene, itemName, quantity = 1) {
  const existingItem = scene.localInventory.find(i => i.name === itemName);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    scene.localInventory.push({ name: itemName, quantity });
  }
}

// Safely removes an item from player's inventory
export function safeRemoveFromInventory(scene, itemName, quantity = 1) {
  const item = scene.localInventory.find(i => i.name === itemName);
  if (item) {
    item.quantity -= quantity;
    if (item.quantity <= 0) {
      scene.localInventory.splice(scene.localInventory.indexOf(item), 1);
    }
  }
}

export function hasCampingMaterials(scene) {
  const stick = scene.localInventory.find(item => item.name.toLowerCase() === "stick");
  const cloth = scene.localInventory.find(item => item.name.toLowerCase() === "cloth");
  return (stick && stick.quantity >= 2) && (cloth && cloth.quantity >= 1);
}
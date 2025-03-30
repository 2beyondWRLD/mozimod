// inventorySystem.js

// Adds an item to the player's inventory with visual feedback
export function addToInventory(scene, itemName, quantity = 1) {
  if (!itemName) return;
  const existingItem = scene.localInventory.find(item => item.name === itemName);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    scene.localInventory.push({ name: itemName, quantity: quantity });
  }

  // Visual feedback
  if (scene.player) {
    createFloatingText(scene, scene.player.x, scene.player.y - 30, `+${quantity} ${itemName}`, 0xffff00);
  }
}

// Removes an item from inventory, ensuring quantities don't go negative
export function removeFromInventory(scene, itemName, quantity = 1) {
  const itemIndex = scene.localInventory.findIndex(item => item.name === itemName);
  if (itemIndex !== -1) {
    const item = scene.localInventory[itemIndex];
    item.quantity -= quantity;
    if (item.quantity <= 0) {
      scene.localInventory.splice(itemIndex, 1);
    }
  }
}

// Retrieves formatted inventory list for UI display
export function getInventoryDisplay(scene) {
  return scene.localInventory.map(item => {
    const itemData = getItemData(scene, item.name);
    const rarity = itemData && itemData.rarity ? ` [${itemData.rarity}]` : '';
    return `${item.name}${rarity} x${item.quantity}`;
  });
}

// Gets item metadata from loot data JSON
export function getItemData(scene, itemName) {
  if (!itemName) return null;
  const lootData = scene.cache.json.get("lootTable");
  if (!lootData || !lootData.zones) return null;

  for (let zone of Object.values(lootData.zones)) {
    const foundItem = zone.find(item => item.name === itemName);
    if (foundItem) return foundItem;
  }
  return null;
}

// Generates random loot based on player's current zone and rarity
export function getRandomLootForZone(scene) {
  const zoneName = scene.currentZone;
  const lootData = scene.cache.json.get("lootTable");
  if (!lootData || !lootData.zones) return "Stick";

  const zoneItems = lootData.zones[zoneName] || [];
  if (zoneItems.length === 0) return "Stick";

  const rarityRoll = Math.random();
  if (rarityRoll < 0.15) return null; // 15% chance of no loot

  if (rarityRoll > 0.95 && scene.playerStats.level >= 3) {
    const rareItems = zoneItems.filter(item => item.rarity === "rare");
    if (rareItems.length > 0) {
      return rareItems[Phaser.Math.Between(0, rareItems.length - 1)].name;
    }
  }

  return zoneItems[Phaser.Math.Between(0, zoneItems.length - 1)].name || "Stick";
}

// Handles loot crate logic, including visuals and loot spawning
export function hitCrate(scene, crate) {
  if (!scene || !crate || crate.getData('breaking')) return;

  let health = crate.getData('health') - 1;
  crate.setData('health', health);

  // Visual feedback for crate hit
  crate.setTint(0xff9900);
  scene.time.delayedCall(100, () => crate.clearTint());

  scene.cameras.main.shake(50, 0.003);

  if (health <= 0) {
    crate.setData('breaking', true);
    const loot = getRandomLootForZone(scene);

    if (loot) {
      addToInventory(scene, loot);
      addToLog(scene, `Received: ${loot}`);
      createSimpleEffect(scene, crate.x, crate.y, 0xFFD700);
    } else {
      addToLog(scene, "No loot found");
    }

    // Play the animation directly - animation should be defined in ScavengerMode's create function
    crate.play('crate_break');
    crate.once('animationcomplete', () => crate.destroy());
  } else {
    console.log(`Crate hit, health remaining: ${health}`);
  }
}

// Improved logs messages related to inventory and loot
export function addToLog(scene, message) {
  if (!scene || !scene.logMessages || !scene.logText) return;
  if (!message || typeof message !== 'string') {
    message = String(message || 'Event occurred');
  }
  
  try {
    console.log("Log update:", message);
    scene.logMessages.push(message);
    if (scene.logMessages.length > 5) {
      scene.logMessages.shift(); // Remove the oldest message
    }
    scene.logText.setText(scene.logMessages.join('\n'));
    
    // Add visual highlight to log briefly
    scene.logText.setTint(0xffff00);
    scene.time.delayedCall(1000, () => {
      if (scene.logText && scene.logText.clearTint) {
        scene.logText.clearTint();
      }
    });
  } catch (error) {
    console.warn("Error updating log:", error);
  }
}

// Visual effects helper functions (floating text, simple effects)
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

export function createFloatingText(scene, x, y, text, color = 0xffffff, fontSize = 16) {
  const floatingText = scene.add.text(x, y, text, {
    fontFamily: 'Arial',
    fontSize: `${fontSize}px`,
    color: `#${color.toString(16).padStart(6, '0')}`,
    stroke: '#000000',
    strokeThickness: 2
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

export function getAllLootItems(scene) {
  const lootData = scene.cache.json.get("lootTable");
  if (!lootData || !lootData.zones) return ["Stick"];
  const allItems = new Set();
  Object.keys(lootData.zones).forEach(zone => {
    lootData.zones[zone].forEach(item => allItems.add(item.name));
  });
  return Array.from(allItems);
}

// Improved collision detection for object placement
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

// Improved loot crate spawning with better placement logic
export function spawnOneLootCrate(scene) {
  const MAX_TRIES = 100;
  let tries = 0;
  const worldW = scene.background.displayWidth;
  const worldH = scene.background.displayHeight;
  
  // Increased minimum distance from edges for better visibility
  const edgeBuffer = 80;
  
  while (tries < MAX_TRIES) {
    tries++;
    const crateX = Phaser.Math.Between(edgeBuffer, worldW - edgeBuffer);
    const crateY = Phaser.Math.Between(edgeBuffer, worldH - edgeBuffer);
    
    // Improved collision detection with better buffer zone
    if (!overlapsObstacle(scene, crateX, crateY, 80)) {
      const crate = scene.lootCrates.create(crateX, crateY, "loot_crate");
      crate.setOrigin(0.5, 0.5);
      crate.setFrame(0); // Initial frame (intact crate)
      crate.setScale(1);
      crate.setDepth(900);
      crate.setImmovable(true);
      
      // Health varies by zone and player level
      const minHealth = 2 + Math.floor((scene.playerStats.level - 1) * 0.5);
      const maxHealth = 6 + Math.floor((scene.playerStats.level - 1) * 0.8);
      const health = Phaser.Math.Between(minHealth, maxHealth);
      
      // Simple tint instead of glow effect for compatibility
      crate.setTint(0xffff77);
      
      crate.setData('health', health);
      crate.setData('breaking', false);
      
      // FIXED: Use a proper collision box size that matches the visual
      crate.body.setSize(40, 40);
      crate.body.setOffset(12, 12); // Center the hitbox on the sprite
      
      // Add a small animation to make crates stand out
      scene.tweens.add({
        targets: crate,
        y: crateY - 5,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      console.log("Crate spawned at:", crateX, crateY, "with health:", health);
      return;
    }
  }
  console.warn("Unable to place loot crate after", MAX_TRIES, "tries.");
}

export function spawnMultipleLootCrates(scene, count) {
  if (scene.currentZone === "Village") return;
  
  // Scale crate count with player level for progression
  const baseCount = count;
  const levelBonus = Math.floor((scene.playerStats.level - 1) * 0.5);
  const totalCrates = baseCount + levelBonus;
  
  for (let i = 0; i < totalCrates; i++) {
    spawnOneLootCrate(scene);
  }
}
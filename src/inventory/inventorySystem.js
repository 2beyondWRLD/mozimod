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
  if (crate.getData('breaking')) return;

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

    crate.play('crate_break');
    crate.once('animationcomplete', () => crate.destroy());
  } else {
    console.log(`Crate hit, health remaining: ${health}`);
  }
}

// Logs messages related to inventory and loot
export function addToLog(scene, message) {
  if (!scene || !scene.logMessages || !scene.logText) return;
  scene.logMessages.push(message);
  if (scene.logMessages.length > 5) {
    scene.logMessages.shift();
  }
  scene.logText.setText(scene.logMessages.join('\n'));
  scene.logText.setTint(0xffff00);
  scene.time.delayedCall(1000, () => scene.logText.clearTint());
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
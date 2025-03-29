// uiManager.js

export function createHUD(scene) {
  scene.hudText = scene.add.text(10, scene.game.config.height - 20, "", {
    font: "16px Arial",
    fill: "#ffffff",
    stroke: "#000000",
    strokeThickness: 3,
  })
  .setScrollFactor(0)
  .setDepth(11000);
  
  updateHUD(scene);
}

export function updateHUD(scene) {
  if (!scene || !scene.hudText || !scene.playerStats) return;
  
  const s = scene.playerStats;
  
  try {
    scene.hudText.setText(""); // Clear text to prevent overlay
    if (scene.currentZone === "Village") {
      scene.hudText.setText(`OROMOZI: ${s.oromozi} | LEVEL: ${s.level || 1}`);
    } else {
      scene.hudText.setText(
        `HEALTH: ${s.health}   STAMINA: ${s.stamina}\nHUNGER: ${s.hunger}   THIRST: ${s.thirst}\nOROMOZI: ${s.oromozi}   LEVEL: ${s.level || 1}`
      );
    }
    
    if (scene.healthBar) {
      const healthPercent = s.health / 100;
      scene.healthBar.clear();
      scene.healthBar.fillStyle(0x00ff00, 1);
      scene.healthBar.fillRect(10, 10, 150 * healthPercent, 10);
      scene.healthBar.lineStyle(2, 0xffffff, 1);
      scene.healthBar.strokeRect(10, 10, 150, 10);
    }
  } catch (error) {
    console.warn("Error updating HUD:", error);
  }
}

export function showDialog(scene, text) {
  const boxW = 260, boxH = 200;
  const boxX = (scene.game.config.width - boxW) / 2;
  const boxY = (scene.game.config.height - boxH) / 2;
  
  if (!scene.dialogBg) {
    scene.dialogBg = scene.add.graphics().setDepth(1600);
  }
  
  scene.dialogBg.clear();
  scene.dialogBg.fillStyle(0x000000, 0.8);
  scene.dialogBg.fillRect(boxX, boxY, boxW, boxH);
  scene.dialogBg.lineStyle(2, 0xffffff, 1);
  scene.dialogBg.strokeRect(boxX, boxY, boxW, boxH);
  
  if (!scene.dialogText) {
    scene.dialogText = scene.add.text(boxX + 10, boxY + 10, "", {
      font: "14px Arial",
      fill: "#ffffff",
      wordWrap: { width: boxW - 20 },
      stroke: "#000000",
      strokeThickness: 3
    }).setDepth(1601);
  }
  
  scene.dialogText.setPosition(boxX + 10, boxY + 10);
  scene.dialogText.setText(text);
  scene.dialogText.setStyle({
    font: "14px Arial",
    fill: "#ffffff",
    wordWrap: { width: boxW - 20 },
    stroke: "#000000",
    strokeThickness: 3
  });
  
  scene.dialogBg.setVisible(true);
  scene.dialogText.setVisible(true);
  scene.dialogBg.setScrollFactor(0);
  scene.dialogText.setScrollFactor(0);
}

export function hideDialog(scene) {
  if (!scene.dialogBg || !scene.dialogText) return;
  
  scene.dialogBg.clear();
  scene.dialogBg.setVisible(false);
  scene.dialogText.setVisible(false);
  updateHUD(scene);
}

export function showModalOverlay(scene) {
  hideModalOverlay(scene);
  const modal = scene.add.rectangle(
    scene.cameras.main.worldView.x,
    scene.cameras.main.worldView.y,
    scene.cameras.main.width,
    scene.cameras.main.height,
    0x000000,
    0.4
  );
  modal.setOrigin(0, 0);
  modal.setScrollFactor(0);
  modal.setDepth(800);
  scene.modalOverlay = modal;
}

export function hideModalOverlay(scene) {
  if (scene.modalOverlay) {
    scene.modalOverlay.destroy();
    scene.modalOverlay = null;
  }
}

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

export function createScrollableMenu(scene, title, options) {
  const boxW = 260, boxH = 200;
  const boxX = (scene.game.config.width - boxW) / 2;
  const boxY = (scene.game.config.height - boxH) / 2;
  const maxVisible = 6;
  let scrollIndex = 0;

  showDialog(scene, `${title}\n(Use UP/DOWN to scroll, SPACE to select)`);

  const updateMenu = () => {
    clearButtons(scene);
    const visibleOptions = options.slice(scrollIndex, scrollIndex + maxVisible);
    visibleOptions.forEach((option, i) => {
      const txt = scene.add.text(boxX + 10, boxY + 80 + i * 20, option.label, {
        font: "14px Arial",
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2
      }).setDepth(1601).setInteractive({ useHandCursor: true });

      txt.on("pointerdown", option.callback);
      txt.on("pointerover", () => txt.setStyle({ fill: "#ff9900" }));
      txt.on("pointerout", () => txt.setStyle({ fill: "#ffffff" }));

      scene.buttons = scene.buttons || [];
      scene.buttons.push(txt);
    });
  };

  updateMenu();

  scene.input.keyboard.on("keydown-UP", () => {
    if (scrollIndex > 0) {
      scrollIndex--;
      updateMenu();
    }
  });

  scene.input.keyboard.on("keydown-DOWN", () => {
    if (scrollIndex + maxVisible < options.length) {
      scrollIndex++;
      updateMenu();
    }
  });
}

export function clearButtons(scene) {
  if (!scene.buttons) {
    scene.buttons = [];
    return;
  }
  
  scene.buttons.forEach(btn => btn.destroy());
  scene.buttons = [];
}

// Create a simple set of buttons with labels and callbacks
export function createButtons(scene, options) {
  clearButtons(scene);
  const boxW = 260, boxH = 200;
  const boxX = (scene.game.config.width - boxW) / 2;
  const boxY = (scene.game.config.height - boxH) / 2;
  
  scene.buttons = scene.buttons || [];
  
  options.forEach((option, i) => {
    const btn = scene.add.text(boxX + 10, boxY + 80 + i * 25, option.label, { 
      font: "14px Arial", 
      fill: "#ffff00",
      stroke: "#000000",
      strokeThickness: 2
    });
    
    btn.setDepth(1601);
    btn.setInteractive({ useHandCursor: true });
    
    // Add button effects
    btn.on("pointerover", () => {
      btn.setStyle({ fill: "#ff9900" });
      btn.setScale(1.1);
    });
    
    btn.on("pointerout", () => {
      btn.setStyle({ fill: "#ffff00" });
      btn.setScale(1);
    });
    
    btn.on("pointerdown", () => {
      btn.setStyle({ fill: "#ffffff" });
      scene.time.delayedCall(100, option.callback);
    });
    
    scene.buttons.push(btn);
    btn.setScrollFactor(0);
  });
}
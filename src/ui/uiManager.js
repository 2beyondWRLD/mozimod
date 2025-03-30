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
    
    // Update health bar if it exists AND has a clear method
    if (scene.healthBar && typeof scene.healthBar.clear === 'function') {
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
  // Modified dimensions - increased height by 100 pixels
  const boxW = 220, boxH = 250; // Changed from 150 to 250 (added 100px)
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
    0,
    0,
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
  // Use expanded dialog dimensions
  const boxW = 220, boxH = 250; // Changed from 150 to 250
  const boxX = (scene.game.config.width - boxW) / 2;
  const boxY = (scene.game.config.height - boxH) / 2;
  
  // Define button spacing and positioning
  const buttonStartY = boxY + 100; // Was boxY + 40, now +100 more
  const buttonSpacing = 20;
  const maxVisible = 5; // Limit visible options to fit dialog box
  
  let scrollIndex = 0;

  showDialog(scene, `${title}\n(Use UP/DOWN to scroll, SPACE to select)`);

  const updateMenu = () => {
    clearButtons(scene);
    const visibleOptions = options.slice(scrollIndex, scrollIndex + maxVisible);
    visibleOptions.forEach((option, i) => {
      const txt = scene.add.text(
        boxX + 10, 
        buttonStartY + i * buttonSpacing, 
        option.label, 
        {
          font: "14px Arial",
          fill: "#ffffff",
          stroke: "#000000",
          strokeThickness: 2
        }
      ).setDepth(1601).setInteractive({ useHandCursor: true }).setScrollFactor(0);

      txt.on("pointerdown", option.callback);
      txt.on("pointerover", () => txt.setStyle({ fill: "#ff9900" }));
      txt.on("pointerout", () => txt.setStyle({ fill: "#ffffff" }));

      scene.buttons = scene.buttons || [];
      scene.buttons.push(txt);
    });
    
    // Add scroll indicators if needed - adjust these positions too
    if (scrollIndex > 0) {
      const upArrow = scene.add.text(
        boxX + boxW - 20,
        buttonStartY - 20, // Adjust up arrow position
        "▲",
        { font: "16px Arial", fill: "#ffffff" }
      ).setDepth(1601).setScrollFactor(0);
      scene.buttons.push(upArrow);
    }
    
    if (scrollIndex + maxVisible < options.length) {
      const downArrow = scene.add.text(
        boxX + boxW - 20,
        buttonStartY + (maxVisible * buttonSpacing), // Adjust down arrow position
        "▼",
        { font: "16px Arial", fill: "#ffffff" }
      ).setDepth(1601).setScrollFactor(0);
      scene.buttons.push(downArrow);
    }
  };

  updateMenu();

  // Clean up any existing key handlers
  scene.input.keyboard.off("keydown-UP");
  scene.input.keyboard.off("keydown-DOWN");
  scene.input.keyboard.off("keydown-SPACE");

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

  scene.input.keyboard.once("keydown-SPACE", () => {
    scene.input.keyboard.off("keydown-UP");
    scene.input.keyboard.off("keydown-DOWN");
    if (options[scrollIndex]) {
      options[scrollIndex].callback();
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

export function createButtons(scene, options) {
  clearButtons(scene);
  
  // Use expanded dialog dimensions
  const boxW = 220, boxH = 250; // Changed from 150 to 250
  const boxX = (scene.game.config.width - boxW) / 2;
  const boxY = (scene.game.config.height - boxH) / 2;
  
  // Define button spacing and positioning
  const buttonStartY = boxY + 150; // Was boxY + 50, now +100 more
  const buttonSpacing = 20;
  
  scene.buttons = scene.buttons || [];
  
  options.forEach((option, i) => {
    const btn = scene.add.text(
      boxX + 10, 
      buttonStartY + i * buttonSpacing, 
      option.label, 
      { 
        font: "14px Arial", 
        fill: option.highlight ? "#00ffff" : "#ffff00",
        stroke: "#000000",
        strokeThickness: 2,
        fontSize: option.highlight ? "16px" : "14px"
      }
    );
    
    btn.setDepth(1601);
    btn.setInteractive({ useHandCursor: true });
    btn.setScrollFactor(0);
    
    // Add button effects
    btn.on("pointerover", () => {
      btn.setStyle({ fill: "#ff9900" });
      btn.setScale(1.1);
    });
    
    btn.on("pointerout", () => {
      btn.setStyle({ 
        fill: option.highlight ? "#00ffff" : "#ffff00",
        fontSize: option.highlight ? "16px" : "14px"
      });
      btn.setScale(1);
    });
    
    btn.on("pointerdown", () => {
      btn.setStyle({ fill: "#ffffff" });
      scene.time.delayedCall(100, option.callback);
    });
    
    scene.buttons.push(btn);
  });
}
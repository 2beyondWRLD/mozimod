// player.js

// Initializes player sprite, physics, and camera behavior
export function createPlayer(scene, startX, startY, scale = 1.3) {
  scene.player = scene.physics.add.sprite(startX, startY, "player").setScale(scale);
  scene.player.setCollideWorldBounds(true);
  scene.player.setDepth(2000);

  scene.player.body.setSize(16, 16);
  scene.player.body.setOffset(16, 20);

  createPlayerAnimations(scene);
  scene.player.anims.play("idle-down", true);

  scene.cameras.main.startFollow(scene.player);
  scene.cameras.main.setZoom(2);
}

// Explicitly exported player animations for reuse
export function createPlayerAnimations(scene) {
  scene.anims.create({
      key: "walk-down",
      frames: scene.anims.generateFrameNumbers("player", { start: 18, end: 23 }),
      frameRate: 10,
      repeat: -1
  });

  scene.anims.create({
      key: "walk-up",
      frames: scene.anims.generateFrameNumbers("player", { start: 30, end: 35 }),
      frameRate: 10,
      repeat: -1
  });

  scene.anims.create({
      key: "walk-left",
      frames: scene.anims.generateFrameNumbers("player", { start: 24, end: 29 }),
      frameRate: 10,
      repeat: -1
  });

  scene.anims.create({
      key: "walk-right",
      frames: scene.anims.generateFrameNumbers("player", { start: 6, end: 11 }),
      frameRate: 10,
      repeat: -1
  });

  scene.anims.create({
      key: "idle-down",
      frames: [{ key: "player", frame: 18 }],
      frameRate: 10
  });

  scene.anims.create({
      key: "idle-up",
      frames: [{ key: "player", frame: 30 }],
      frameRate: 10
  });

  scene.anims.create({
      key: "idle-left",
      frames: [{ key: "player", frame: 24 }],
      frameRate: 10
  });

  scene.anims.create({
      key: "idle-right",
      frames: [{ key: "player", frame: 6 }],
      frameRate: 10
  });

  scene.anims.create({
      key: "attack-down",
      frames: scene.anims.generateFrameNumbers("player", { start: 36, end: 39 }),
      frameRate: 10
  });
}

// Handles player movement based on WASD input
export function handlePlayerMovement(scene, speed = 80) {
  if (!scene.player || !scene.input.keyboard) return;

  const keys = scene.input.keyboard.addKeys({
      up: "W",
      down: "S",
      left: "A",
      right: "D"
  });

  scene.player.setVelocity(0);

  if (keys.left.isDown) {
      scene.player.setVelocityX(-speed);
      scene.player.anims.play("walk-left", true);
  } else if (keys.right.isDown) {
      scene.player.setVelocityX(speed);
      scene.player.anims.play("walk-right", true);
  } else if (keys.up.isDown) {
      scene.player.setVelocityY(-speed);
      scene.player.anims.play("walk-up", true);
  } else if (keys.down.isDown) {
      scene.player.setVelocityY(speed);
      scene.player.anims.play("walk-down", true);
  } else {
      const currentAnim = scene.player.anims.currentAnim;
      if (currentAnim && currentAnim.key.startsWith("walk-")) {
          scene.player.anims.play(currentAnim.key.replace("walk-", "idle-"));
      }
      scene.player.setVelocity(0);
  }
}

// Updates player's shadow and health bar visuals
export function updatePlayerVisuals(scene) {
  if (!scene.player) return;

  if (!scene.playerShadow) {
      scene.playerShadow = scene.add.ellipse(
          scene.player.x,
          scene.player.y + 12,
          20,
          10,
          0x000000,
          0.3
      ).setDepth(1999);
  } else {
      scene.playerShadow.setPosition(scene.player.x, scene.player.y + 12);
  }

  updatePlayerHealthBar(scene);
}

// Updates visual health bar based on player's current health
function updatePlayerHealthBar(scene) {
  if (!scene.healthBar) {
      scene.healthBar = scene.add.graphics().setDepth(3000).setScrollFactor(0);
  }

  const healthPercent = scene.playerStats.health / 100;
  scene.healthBar.clear();
  scene.healthBar.fillStyle(0x00ff00, 1);
  scene.healthBar.fillRect(10, 10, 150 * healthPercent, 10);
  scene.healthBar.lineStyle(2, 0xffffff, 1);
  scene.healthBar.strokeRect(10, 10, 150, 10);
}

// Sets player's initial stats when starting a scene
export function initializePlayerStats(scene, zoneName, oromozi = 1000) {
  scene.playerStats = {
      health: 100,
      stamina: 100,
      thirst: 100,
      hunger: 100,
      oromozi: oromozi,
      currentZone: zoneName,
      experience: 0,
      level: 1
  };
}

// Updates player stats periodically (e.g., stamina regeneration)
export function setupStatRegeneration(scene) {
  scene.time.addEvent({
      delay: 15000,
      callback: () => {
          scene.playerStats.stamina = Math.min(100, scene.playerStats.stamina + 5);
      },
      loop: true
  });
}

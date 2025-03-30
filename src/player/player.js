// player.js

// Initializes player sprite, physics, and camera behavior
export function createPlayer(scene, startX, startY, scale = 1.3) {
    scene.player = scene.physics.add.sprite(startX, startY, "player").setScale(scale);
    scene.player.setCollideWorldBounds(true);
    scene.player.setDepth(2000);
  
    // Improved collision box for player (smaller than sprite for better movement)
    scene.player.body.setSize(16, 16);
    scene.player.body.setOffset(16, 16);
  
    scene.cameras.main.startFollow(scene.player);
    scene.cameras.main.setZoom(2);
    
    // Setup player shadow
    scene.playerShadow = scene.add.ellipse(
      scene.player.x,
      scene.player.y + 12,
      20,
      10,
      0x000000,
      0.3
    ).setDepth(1999);
    
    // Create animations BEFORE setting up attack logic
    createPlayerAnimations(scene);
    
    // Initial animation
    scene.player.anims.play("idle-down", true);
    
    // Initialize player state and attack logic
    setupPlayerAttacks(scene);
}

// Creates all player animations with correct frame references
export function createPlayerAnimations(scene) {
    console.log("Creating player animations");
    
    // Walking animations
    scene.anims.create({
      key: "walk-down",
      frames: scene.anims.generateFrameNumbers("player", { start: 18, end: 23 }),
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
      key: "idle-down",
      frames: scene.anims.generateFrameNumbers("player", { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    });
  
    scene.anims.create({
      key: "idle-up",
      frames: scene.anims.generateFrameNumbers("player", { start: 12, end: 17 }),
      frameRate: 10,
      repeat: -1
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
    
    // ATTACK ANIMATIONS - These are the critical ones!
    // Attack down (Row 7, frames 0-3 which are frames 36-39 in the sprite sheet)
    scene.anims.create({
      key: "attack-down",
      frames: scene.anims.generateFrameNumbers("player", { frames: [36, 37, 38, 39] }),
      frameRate: 15,
      repeat: 0
    });
  
    // Attack right (Row 8, frames 0-3 which are frames 42-45 in the sprite sheet)
    scene.anims.create({
      key: "attack-right",
      frames: scene.anims.generateFrameNumbers("player", { frames: [42, 43, 44, 45] }),
      frameRate: 15,
      repeat: 0
    });
  
    // Attack up (Row 9, frames 0-3 which are frames 48-51 in the sprite sheet)
    scene.anims.create({
      key: "attack-up",
      frames: scene.anims.generateFrameNumbers("player", { frames: [48, 49, 50, 51] }),
      frameRate: 15,
      repeat: 0
    });
  
    // Attack left (Row 10, frames 0-3 which are frames 54-57 in the sprite sheet)
    scene.anims.create({
      key: "attack-left",
      frames: scene.anims.generateFrameNumbers("player", { frames: [54, 55, 56, 57] }),
      frameRate: 15,
      repeat: 0
    });

    console.log("All player animations created");
}
  
// Sets up player attack listeners and logic
export function setupPlayerAttacks(scene) {
    scene.isAttacking = false;
    scene.lastDirection = "down";
  
    // THIS IS THE KEY EVENT HANDLER FOR ATTACK ANIMATIONS
    scene.player.on('animationcomplete', function(anim) {
      console.log("Animation complete:", anim.key);
      
      // Only reset state when an attack animation completes
      if (anim.key.startsWith('attack-')) {
        console.log("Attack animation completed");
        scene.isAttacking = false;
        
        // Return to idle animation based on direction
        const idleAnim = `idle-${scene.lastDirection}`;
        console.log("Returning to idle animation:", idleAnim);
        scene.player.anims.play(idleAnim, true);
      }
    });
    
    scene.applyAttackDamage = () => {
      const attackRange = 120;
      let monstersInRange = [];
      
      // Create attack effect based on direction
      let effectX = scene.player.x;
      let effectY = scene.player.y;
      
      if (scene.lastDirection === "right") {
        effectX = scene.player.x + 30;
      } else if (scene.lastDirection === "left") {
        effectX = scene.player.x - 30;
      } else if (scene.lastDirection === "up") {
        effectY = scene.player.y - 30;
      } else if (scene.lastDirection === "down") {
        effectY = scene.player.y + 30;
      }
      
      // Create visual attack effect
      import('../utils/utils.js').then(module => {
        module.createSimpleEffect(scene, effectX, effectY, 0xff0000);
      });
      
      // Find monsters in range if they exist
      if (scene.monsters) {
        // Filter for monsters in attack range based on direction
        if (scene.lastDirection === "right") {
          monstersInRange = scene.monsters.getChildren().filter(monster => {
            return monster.x > scene.player.x && 
                   monster.x < scene.player.x + attackRange &&
                   Math.abs(monster.y - scene.player.y) < 50;
          });
        } else if (scene.lastDirection === "left") {
          monstersInRange = scene.monsters.getChildren().filter(monster => {
            return monster.x < scene.player.x && 
                   monster.x > scene.player.x - attackRange &&
                   Math.abs(monster.y - scene.player.y) < 50;
          });
        } else if (scene.lastDirection === "up") {
          monstersInRange = scene.monsters.getChildren().filter(monster => {
            return monster.y < scene.player.y && 
                   monster.y > scene.player.y - attackRange &&
                   Math.abs(monster.x - scene.player.x) < 50;
          });
        } else if (scene.lastDirection === "down") {
          monstersInRange = scene.monsters.getChildren().filter(monster => {
            return monster.y > scene.player.y && 
                   monster.y < scene.player.y + attackRange &&
                   Math.abs(monster.x - scene.player.x) < 50;
          });
        }
        
        // Calculate attack power and apply damage
        const baseAttack = 10 + ((scene.playerStats?.level || 1) - 1) * 2;
        const randomFactor = Phaser.Math.Between(-2, 3);
        const attackPower = baseAttack + randomFactor;
        
        monstersInRange.forEach(monster => {
          if (monster && typeof monster.takeDamage === 'function') {
            monster.takeDamage(attackPower);
          }
        });
      }
    };
}
  
// Handle player attack when space bar is pressed
export function handlePlayerAttack(scene) {
    // Exit immediately if already attacking or no player exists
    if (!scene.player || scene.isAttacking) {
      return;
    }
    
    // Set attacking state flag
    scene.isAttacking = true;
    
    // Stop movement
    scene.player.setVelocity(0);
    
    // Add feedback
    scene.cameras.main.shake(50, 0.005);
    
    // THIS IS THE CRITICAL LINE FOR ATTACK ANIMATION
    const animKey = `attack-${scene.lastDirection}`;
    scene.player.anims.play(animKey, true);
    console.log("Playing attack animation:", animKey);
    
    // Apply attack damage
    scene.applyAttackDamage();
    
    // Check for crate interactions
    if (scene.lootCrates) {
      const crates = scene.lootCrates.getChildren();
      const attackRange = 60;
      
      for (let crate of crates) {
        const distance = Phaser.Math.Distance.Between(
          scene.player.x, scene.player.y, crate.x, crate.y
        );
        
        if (distance < attackRange) {
          if (scene.hitCrate) {
            scene.hitCrate(crate);
          } else if (typeof window.hitCrate === 'function') {
            window.hitCrate(scene, crate);
          }
          break;
        }
      }
    }
}

// Handles player movement based on keys and current state
export function handlePlayerMovement(scene, speed = 100) {
    if (!scene.player || !scene.input.keyboard) return;
    
    // Skip movement if player is attacking or in a narrative screen
    if (scene.isAttacking || 
        (scene.narrativeScreen && scene.narrativeScreen !== 0)) {
      scene.player.setVelocity(0);
      return;
    }
  
    const keys = scene.input.keyboard.addKeys({
      up: "W",
      down: "S",
      left: "A",
      right: "D"
    });
  
    scene.player.setVelocity(0);
    
    // Movement with slight speed adjustments based on stamina
    let currentSpeed = speed;
    if (scene.playerStats?.stamina < 30) {
      currentSpeed = speed * 0.7; // Slow down when low on stamina
    }
  
    if (keys.left.isDown) {
      scene.player.setVelocityX(-currentSpeed);
      scene.player.anims.play("walk-left", true);
      scene.lastDirection = "left";
    } else if (keys.right.isDown) {
      scene.player.setVelocityX(currentSpeed);
      scene.player.anims.play("walk-right", true);
      scene.lastDirection = "right";
    } else if (keys.up.isDown) {
      scene.player.setVelocityY(-currentSpeed);
      scene.player.anims.play("walk-up", true);
      scene.lastDirection = "up";
    } else if (keys.down.isDown) {
      scene.player.setVelocityY(currentSpeed);
      scene.player.anims.play("walk-down", true);
      scene.lastDirection = "down";
    } else {
      // Idle animations based on last direction
      if (scene.lastDirection === "down") {
        scene.player.anims.play("idle-down", true);
      } else if (scene.lastDirection === "up") {
        scene.player.anims.play("idle-up", true);
      } else if (scene.lastDirection === "left") {
        scene.player.anims.play("idle-left", true);
      } else if (scene.lastDirection === "right") {
        scene.player.anims.play("idle-right", true);
      }
    }
}
  
// Updates player's shadow, health bar, and other visuals
export function updatePlayerVisuals(scene) {
    if (!scene.player) return;
  
    // Update player shadow
    if (scene.playerShadow) {
      scene.playerShadow.setPosition(scene.player.x, scene.player.y + 12);
    } else {
      scene.playerShadow = scene.add.ellipse(
          scene.player.x,
          scene.player.y + 12,
          20,
          10,
          0x000000,
          0.3
      ).setDepth(1999);
    }
  
    // Update health bar if it exists
    updatePlayerHealthBar(scene);
}
  
// Creates a visual health bar for the player
function updatePlayerHealthBar(scene) {
    if (!scene.healthBar) {
      scene.healthBar = scene.add.graphics()
        .setDepth(3000)
        .setScrollFactor(0);
    }
  
    const healthPercent = scene.playerStats?.health / 100 || 1;
    
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
      oromozi: oromozi || 1000,
      currentZone: zoneName,
      experience: 0,
      level: 1
    };
}
  
// Create initial player stats for a new scene
export function createInitialStats(zoneName, oromozi = 1000) {
    return {
      health: 100,
      stamina: 100,
      thirst: 100,
      hunger: 100,
      oromozi: oromozi || 1000,
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

// Handle player death with effects
export function handlePlayerDeath(scene) {
    if (scene.isRestarting || scene.isDying) return;
    
    scene.isRestarting = true;
    scene.isDying = true;
    
    // Death sequence with effects
    scene.player.setTint(0xff0000);
    scene.cameras.main.shake(500, 0.03);
    scene.cameras.main.flash(300, 255, 0, 0);
    
    import('../ui/uiManager.js').then(module => {
      module.showDialog(scene, "You have died!\nYou wake up in Village Commons...\nAll your loot has been lost!");
    });
    
    // Simple death effect
    import('../utils/utils.js').then(module => {
      module.createSimpleEffect(scene, scene.player.x, scene.player.y, 0xff0000);
    });
    
    scene.time.delayedCall(2000, () => {
      scene.tweens.add({
        targets: scene.cameras.main,
        alpha: 0,
        duration: 1000,
        onComplete: () => {
          // Cleanup
          import('../ui/uiManager.js').then(module => {
            module.hideDialog(scene);
          });
          
          scene.sound.stopAll();
          scene.tweens.killAll();
          if (scene.monsters) scene.monsters.clear(true, true);
          if (scene.lootCrates) scene.lootCrates.clear(true, true);
          if (scene.exclamations) scene.exclamations.clear(true, true);
          
          // Restart scene
          const villageZone = scene.zoneList.find(z => z.name === "Village");
          if (villageZone) {
            // Preserve level and oromozi, just heal the player
            const currentLevel = scene.playerStats.level || 1;
            const currentExp = scene.playerStats.experience || 0;
            
            // Create new player stats
            initializePlayerStats(scene, villageZone.name, scene.playerStats.oromozi);
            
            // Preserve level and experience
            scene.playerStats.level = currentLevel;
            scene.playerStats.experience = currentExp;
            
            // Clear inventory when player dies
            scene.localInventory = [];
            
            scene.scene.restart({ 
              zone: villageZone, 
              inventory: scene.localInventory, 
              fromDeath: true, 
              promptCount: 0 
            });
          } else {
            console.error("Village zone not found!");
          }
        }
      });
    });
}

// Check for level up based on experience
export function checkLevelUp(scene) {
    if (!scene.playerStats) return;
    
    const currentLevel = scene.playerStats.level || 1;
    const currentExp = scene.playerStats.experience || 0;
    
    // Experience required for next level (increases with each level)
    const nextLevelExp = currentLevel * 100;
    
    if (currentExp >= nextLevelExp) {
      // Level up!
      scene.playerStats.level = currentLevel + 1;
      scene.playerStats.experience = currentExp - nextLevelExp;
      
      // Health and stats bonus for leveling up
      scene.playerStats.health = 100; // Full heal on level up
      
      // Visual and audio feedback
      if (scene.player) {
        // Level up effect
        scene.cameras.main.flash(500, 255, 255, 0);
        
        import('../inventory/inventorySystem.js').then(module => {
          if (module.createFloatingText) {
            module.createFloatingText(scene, scene.player.x, scene.player.y - 30, "LEVEL UP!", 0xffff00);
          }
        });
        
        // Create a larger level up indicator in the center of the screen
        const levelText = scene.add.text(
          scene.cameras.main.centerX, 
          scene.cameras.main.centerY,
          `LEVEL UP!\nYou are now level ${scene.playerStats.level}`,
          { 
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#ffff00',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
          }
        ).setOrigin(0.5).setDepth(5000).setScrollFactor(0);
        
        // Animation for the level up text
        scene.tweens.add({
          targets: levelText,
          scale: 1.2,
          duration: 500,
          yoyo: true,
          repeat: 1,
          onComplete: () => {
            scene.tweens.add({
              targets: levelText,
              alpha: 0,
              y: scene.cameras.main.centerY - 100,
              duration: 500,
              onComplete: () => levelText.destroy()
            });
          }
        });
      }
      
      // Check if there's another level up pending
      checkLevelUp(scene);
    }
}
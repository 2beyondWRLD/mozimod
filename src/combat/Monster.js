// src/combat/Monster.js
import { createFloatingText, createSimpleEffect } from '../utils/utils.js';
import { addToInventory } from '../inventory/inventorySystem.js';
import { getRandomLootForZone } from '../inventory/inventorySystem.js';
import { calculateBattleStats } from './combatSystem.js';

export default class Monster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "hickory_idle");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(2000);

    this.currentState = "idle";
    this.anims.play("monster_idle", true);

    // Scale monster stats with player level
    const playerLevel = scene.playerStats.level || 1;
    const difficultyMultiplier = 1 + (playerLevel - 1) * 0.2;
    
    this.speed = 50 + (playerLevel - 1) * 5;
    this.attackRange = 40; // Increased for better hit detection
    this.detectionRange = 200 + (playerLevel - 1) * 10;
    this.attackCooldown = Math.max(800, 1000 - (playerLevel - 1) * 50); // Faster attacks at higher levels
    this.lastAttackTime = 0;
    this.maxHealth = Math.floor(80 * difficultyMultiplier);
    this.health = this.maxHealth;
    this.damage = 5 + Math.floor((playerLevel - 1) * 1.2);

    // Create health bar
    this.healthBar = scene.add.graphics();
    this.healthBar.setDepth(2001); // Above monster
    this.updateHealthBar();
    
    // Add monster name/level display
    this.levelText = scene.add.text(this.x, this.y - 30, `Monster Lv.${playerLevel}`, {
      font: '10px Arial',
      fill: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(2001);
    
    // Simple red tint for night predators
    if (scene.isNight) {
      this.setTint(0xff5555);
    }
  }

  updateHealthBar() {
    this.healthBar.clear();
    const barWidth = 30; // Width of the health bar
    const barHeight = 5; // Height of the health bar
    const healthRatio = this.health / this.maxHealth;
    
    // Background (red)
    this.healthBar.fillStyle(0xff0000);
    this.healthBar.fillRect(this.x - barWidth / 2, this.y - 20, barWidth, barHeight);
    
    // Fill (green portion)
    this.healthBar.fillStyle(0x00ff00); // Green
    this.healthBar.fillRect(this.x - barWidth / 2, this.y - 20, barWidth * healthRatio, barHeight);
    
    // Outline
    this.healthBar.lineStyle(1, 0xffffff); // White border
    this.healthBar.strokeRect(this.x - barWidth / 2, this.y - 20, barWidth, barHeight);
    
    // Update level text position
    if (this.levelText) {
      this.levelText.setPosition(this.x, this.y - 30);
    }
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    this.updateHealthBar(); // Update health bar position and size
    
    const player = this.scene.player;
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (distance <= this.attackRange) {
      if (this.currentState !== "attacking") {
        this.currentState = "attacking";
        this.anims.play("monster_attack", true);
      }
      this.setVelocity(0);
      if (time > this.lastAttackTime + this.attackCooldown) {
        this.attack(player);
        this.lastAttackTime = time;
      }
    } else if (distance <= this.detectionRange) {
      if (this.currentState !== "walking") {
        this.currentState = "walking";
        this.anims.play("monster_walk", true);
      }
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
    } else {
      if (this.currentState !== "idle") {
        this.currentState = "idle";
        this.anims.play("monster_idle", true);
      }
      this.setVelocity(0);
    }

    this.flipX = player.x < this.x;
  }

  attack(player) {
    if (this.scene.playerStats.health > 0) {
      // Calculate damage with some player defense reduction
      const battleStats = calculateBattleStats(this.scene);
      const damage = Math.max(1, this.damage - Math.floor(battleStats.defense * 0.3));
      
      this.scene.playerStats.health = Math.max(this.scene.playerStats.health - damage, 0);
      console.log("Monster attacked player! Health:", this.scene.playerStats.health);
      
      // Visual feedback
      player.setTint(0xff0000);
      this.scene.time.delayedCall(100, () => player.clearTint());
      this.scene.cameras.main.shake(100, 0.005 * damage);
      
      // Floating damage text
      createFloatingText(this.scene, player.x, player.y - 20, `-${damage}`, 0xff0000);
      
      updateHUD(this.scene);
    }
  }

  takeDamage(damage) {
    this.health -= damage;
    console.log(`Monster took ${damage} damage, health now: ${this.health}`);
    
    // Show damage number
    createFloatingText(this.scene, this.x, this.y - 20, `-${damage}`, 0xff0000);
    
    if (this.health <= 0) {
      // Death effect
      createSimpleEffect(this.scene, this.x, this.y, 0xff0000);
      
      // Award experience
      const expGain = 10 + Math.floor(Math.random() * 5);
      this.scene.playerStats.experience = (this.scene.playerStats.experience || 0) + expGain;
      createFloatingText(this.scene, this.x, this.y - 40, `+${expGain} EXP`, 0x00ffff);
      
      // Chance for loot
      if (Math.random() < 0.4) {
        const loot = getRandomLootForZone(this.scene);
        if (loot) {
          addToInventory(this.scene, loot);
          createFloatingText(this.scene, this.x, this.y - 60, `+${loot}`, 0xffff00);
        }
      }
      
      // Check for level up
      checkLevelUp(this.scene);
      
      this.healthBar.destroy();
      if (this.levelText) this.levelText.destroy();
      this.destroy();
      console.log("Monster defeated!");
    } else {
      this.setTint(0xff0000);
      this.scene.time.delayedCall(100, () => {
        this.clearTint();
      }, [], this);
      this.updateHealthBar(); // Immediate update for feedback
    }
  }

  destroy() {
    if (this.healthBar) {
      this.healthBar.destroy();
    }
    if (this.levelText) {
      this.levelText.destroy();
    }
    super.destroy();
  }
}
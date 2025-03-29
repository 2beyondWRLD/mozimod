// CampingScene.js (explicitly fixed)

export default class CampingScene extends Phaser.Scene {
  constructor() {
    super('CampingScene');

    // Player and scene elements
    this.player = null;
    this.campfire = null;
    this.lightRadius = 150;
    this.maxLightRadius = 400;
    this.campfireScale = 1.5;
    this.maxCampfireScale = 3;
    this.campfireOriginY = 0.75;
    this.maxCampfireOriginY = 1;
    this.cursors = null;
    this.campfireLight = null;
    this.darkOverlay = null;

    // Fire management
    this.burnTime = 0;
    this.maxStokes = 7;
    this.currentStokes = 0;
    this.burnMeter = null;
    this.timerEvent = null;
    this.isFireLit = false;

    // Inventory
    this.inventory = [];
    this.menuVisible = false;
    this.menuText = null;

    // Cooking properties
    this.isCooking = false;
    this.cookingTime = 0;
    this.cookingDuration = 30;
    this.cookingComplete = false;
    this.cookedFoodItem = null;
    this.skillet = null;
    this.progressBar = null;
    this.cookingTimer = null;
    this.claimText = null;
    this.cookingStartTime = 0;

    // Dialog menu properties
    this.dialogVisible = false;
    this.dialogBox = null;
    this.dialogTitle = null;
    this.dialogTextItems = [];
    this.selectedItemIndex = 0;
    this.cookableItems = [];

    // Torch properties
    this.torch = null;
    this.torchLight = null;
    this.torchBurnTime = 0;
    this.torchCurrentStokes = 0;
    this.isTorchLit = false;
    this.torchLightRadius = 150;
    this.torchScale = 0.75;
    this.maxTorchScale = 1.5;
    this.torchOriginY = 0.75;
    this.maxTorchOriginY = 1;
    this.torchBurnMeter = null;

    // Stoking menu properties
    this.stokingDialogVisible = false;
    this.stokingDialogBox = null;
    this.stokingDialogTitle = null;
    this.stokingDialogTextItems = [];
    this.stokingItems = [];
    this.stokingTarget = null;
    this.quantityInputVisible = false;
    this.quantityInputText = null;
    this.selectedQuantity = 1;

    // Player stats properties
    this.playerStats = {
      health: 100,
      stamina: 100,
      thirst: 100,
      hunger: 100,
      oromozi: 1000
    };
    this.statsText = null;
    this.regenTimer = null;
  }

  preload() {
    this.load.tilemapTiledJSON('campsite_map', 'assets/maps/campsite.json');
    this.load.image('forest_night', 'assets/images/forest_night.png');
    this.load.spritesheet('player', 'assets/images/player.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('campfire', 'assets/images/campfire.png', { frameWidth: 32, frameHeight: 48 });
    this.load.spritesheet('smoke', 'assets/images/smoke.png', { frameWidth: 32, frameHeight: 48 });
    this.load.image('skillet', 'assets/images/skillet.png');
  }

  create(data) {
    // Your existing create() implementation here
    // ... (copy your original create() method body here explicitly)
  }

  update(time, delta) {
    // Your existing update() method
    this.player.setVelocity(0);
    if (this.cursors.left.isDown) {
      this.player.setVelocityX(-100).anims.play('moveLeft', true);
    } else if (this.cursors.right.isDown) {
      this.player.setVelocityX(100).anims.play('moveRight', true);
    } else if (this.cursors.up.isDown) {
      this.player.setVelocityY(-100).anims.play('moveUp', true);
    } else if (this.cursors.down.isDown) {
      this.player.setVelocityY(100).anims.play('moveDown', true);
    } else {
      this.player.anims.play('idleDown', true);
    }
  }

  // Include explicitly all other helper methods (stokeFire, stokeTorch, handleFireClick, etc.)
  // exactly as you have them, unchanged
}
// VillageCommons.js

export default class VillageCommons extends Phaser.Scene {
  constructor() {
    super("VillageCommons");
  }

  preload() {
    this.load.json("villageCommonsMap", "assets/maps/villageCommonsMap.json");
    this.load.image("villageCommons", "assets/backgrounds/villageCommons.png");
    this.load.spritesheet("player", "assets/sprites/player.png", { frameWidth: 48, frameHeight: 48 });
  }

  create(data) {
    const BG_SCALE = 0.3;
    const PLAYER_SCALE = 2.5;

    this.playerStats = data.playerStats || { health:100, thirst:100, hunger:100, stamina:100, oromozi:1000 };
    this.localInventory = data.inventory || [{ name: "Bread", quantity: 1 }, { name: "Iron Sword", quantity: 1 }];
    this.deposits = [];
    this.listedItems = [];

    const zoneData = { name: "Village", backgroundKey: "villageCommons", mapKey: "villageCommonsMap" };
    this.background = this.add.image(0, 0, zoneData.backgroundKey).setOrigin(0, 0).setScale(BG_SCALE);
    this.physics.world.setBounds(0, 0, this.background.displayWidth, this.background.displayHeight);
    this.cameras.main.setBounds(0, 0, this.background.displayWidth, this.background.displayHeight);

    this.player = this.physics.add.sprite(100, 100, "player").setScale(PLAYER_SCALE).setCollideWorldBounds(true);
    this.player.setDepth(2000);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(2);

    // HUD Setup
    this.hudText = this.add.text(10, this.game.config.height - 20, `OROMOZI: ${this.playerStats.oromozi}`, { font: "16px Arial", fill: "#ffffff" })
      .setScrollFactor(0).setDepth(11000);

    // Dialog and interaction setup
    this.dialogBg = this.add.graphics().setDepth(1600).setVisible(false);
    this.dialogText = this.add.text(0, 0, "", { font: "14px Arial", fill: "#ffffff", wordWrap: { width: 200 } }).setDepth(1601).setVisible(false);
    this.buttons = [];

    // Interaction objects
    const mapData = this.cache.json.get(zoneData.mapKey);
    if (mapData && mapData.layers) {
      mapData.layers.forEach(layer => {
        if (layer.type === "objectgroup" && layer.name.toLowerCase() === "interactions") {
          layer.objects.forEach(obj => {
            const interaction = this.add.rectangle(obj.x * BG_SCALE, obj.y * BG_SCALE, obj.width * BG_SCALE, obj.height * BG_SCALE, 0x00ff00, 0);
            interaction.setOrigin(0, 0);
            this.physics.add.existing(interaction, true);
            interaction.setInteractive();
            interaction.on("pointerdown", () => this.handleVillageContractInteraction(obj.name));
          });
        }
      });
    }

    this.input.keyboard.on('keydown-ESC', () => this.hideDialog());
  }

  handleVillageContractInteraction(objectName) {
    switch (objectName.toLowerCase()) {
      case "liquidity_bank":
        this.showDialog("Liquidity Pool Coming Soon!");
        break;
      case "merchant_quarter":
        this.showDialog("Merchant Quarter Coming Soon!");
        break;
      case "scavenger_mode":
        this.showDialog("Enter Scavenger Mode? (Press SPACE)");
        this.input.keyboard.once("keydown-SPACE", () => {
          this.scene.start("ScavengerMode", { inventory: this.localInventory, playerStats: this.playerStats });
        });
        break;
      default:
        this.showDialog("Interaction coming soon!");
    }
  }

  showDialog(text) {
    this.dialogBg.clear().fillStyle(0x000000, 0.8).fillRect(290, 225, 220, 150).setVisible(true);
    this.dialogText.setPosition(300, 235).setText(text).setVisible(true);
  }

  hideDialog() {
    this.dialogBg.clear().setVisible(false);
    this.dialogText.setVisible(false);
  }

  update() {
    const keys = this.input.keyboard.addKeys({ up: "W", left: "A", down: "S", right: "D" });
    const speed = 80;
    this.player.setVelocity(0);

    if (keys.left.isDown) {
      this.player.setVelocityX(-speed);
    } else if (keys.right.isDown) {
      this.player.setVelocityX(speed);
    } else if (keys.up.isDown) {
      this.player.setVelocityY(-speed);
    } else if (keys.down.isDown) {
      this.player.setVelocityY(speed);
    }
  }
}

export default class ScavengerMode extends Phaser.Scene {
  constructor() {
    super('ScavengerMode');

    this.playerStats = null;
    this.localInventory = null;
    this.background = null;
    this.player = null;
    this.hudText = null;
    this.dialogBg = null;
    this.dialogText = null;
    this.cursors = null;
  }

  preload() {
    SCAVENGER_ZONES.forEach(zone => {
      this.load.json(zone.mapKey, `assets/maps/${zone.mapKey}.json`);
      this.load.image(zone.backgroundKey, `assets/backgrounds/${zone.backgroundKey}.png`);
      if (zone.foregroundKey)
        this.load.image(zone.foregroundKey, `assets/foregrounds/${zone.foregroundKey}.png`);
    });
    this.load.spritesheet("player", "assets/sprites/player.png", { frameWidth: 48, frameHeight: 48 });
  }

  create(data) {
    const zoneData = data.zone || SCAVENGER_ZONES[0];
    this.playerStats = data.playerStats || createInitialStats(zoneData.name);
    this.localInventory = data.inventory || [{ name: "Bread", quantity: 1 }];

    this.background = this.add.image(0, 0, zoneData.backgroundKey)
      .setOrigin(0, 0)
      .setScale(BG_SCALE);
    this.physics.world.setBounds(0, 0, this.background.displayWidth, this.background.displayHeight);
    this.cameras.main.setBounds(0, 0, this.background.displayWidth, this.background.displayHeight);

    const mapData = this.cache.json.get(zoneData.mapKey);
    if (mapData?.layers) {
      mapData.layers.forEach(layer => {
        if (layer.type === "imagelayer" && zoneData.foregroundKey && layer.name.toLowerCase() === zoneData.foregroundKey.toLowerCase()) {
          this.add.image(0, 0, zoneData.foregroundKey)
            .setOrigin(0, 0)
            .setScale(BG_SCALE);
        }
      });
    }

    this.player = this.physics.add.sprite(100 * BG_SCALE, 100 * BG_SCALE, "player")
      .setScale(PLAYER_SCALE * 0.5);
    this.player.setCollideWorldBounds(true);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(2);

    this.hudText = this.add.text(10, this.game.config.height - 20, "", { font: "16px Arial", fill: "#ffffff" }).setScrollFactor(0);
    this.dialogBg = this.add.graphics().setVisible(false);
    this.dialogText = this.add.text(0, 0, "", { font: "12px Arial", fill: "#ffffff", wordWrap: { width: 200 } }).setVisible(false);

    this.cursors = this.input.keyboard.createCursorKeys();

    updateHUD(this);
  }

  update(time, delta) {
    let gameTime = this.registry.get("gameTime") || 0;
    gameTime += delta;
    this.registry.set("gameTime", gameTime);

    const speed = 100;
    this.player.setVelocity(0);
    if (this.cursors.left.isDown) this.player.setVelocityX(-speed);
    else if (this.cursors.right.isDown) this.player.setVelocityX(speed);
    if (this.cursors.up.isDown) this.player.setVelocityY(-speed);
    else if (this.cursors.down.isDown) this.player.setVelocityY(speed);

    const keys = this.input.keyboard.addKeys({ z: "Z", space: "SPACE" });
    if (Phaser.Input.Keyboard.JustDown(keys.z)) {
      const currentZoneIndex = SCAVENGER_ZONES.findIndex(z => z.name === this.playerStats.currentZone);
      const newZoneIndex = (currentZoneIndex + 1) % SCAVENGER_ZONES.length;
      this.playerStats.currentZone = SCAVENGER_ZONES[newZoneIndex].name;
      this.scene.restart({
        zone: SCAVENGER_ZONES[newZoneIndex],
        inventory: this.localInventory,
        playerStats: this.playerStats
      });
    }
    if (Phaser.Input.Keyboard.JustDown(keys.space)) {
      showDialog(this, "Return to Village?\n(Press SPACE again to confirm)");
      this.input.keyboard.once("keydown-SPACE", () => {
        this.scene.start("VillageCommonsScene", {
          zone: {
            name: "Village",
            mapKey: "villageCommonsMap",
            backgroundKey: "villageCommons",
            foregroundKey: ""
          },
          inventory: this.localInventory,
          playerStats: createInitialStats("Village", this.playerStats.oromozi)
        });
      });
    }

    updateHUD(this);
  }
}
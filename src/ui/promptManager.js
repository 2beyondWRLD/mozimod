// promptManager.js

export function createPrompt(scene, config) {
    destroyPrompt(scene); // clear any existing prompts first
  
    const { title, bodyText, options = [] } = config;
  
    const width = 300;
    const height = 180;
    const x = scene.cameras.main.midPoint.x - width / 2;
    const y = scene.cameras.main.midPoint.y - height / 2;
  
    const background = scene.add.rectangle(x, y, width, height, 0x000000, 0.8)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(3000);
  
    const border = scene.add.rectangle(x, y, width, height)
      .setOrigin(0)
      .setStrokeStyle(2, 0xffffff)
      .setScrollFactor(0)
      .setDepth(3001);
  
    const titleText = scene.add.text(x + 10, y + 10, title, {
      fontSize: "16px",
      fill: "#ffffff"
    }).setScrollFactor(0).setDepth(3002);
  
    const body = scene.add.text(x + 10, y + 40, bodyText, {
      fontSize: "14px",
      fill: "#cccccc",
      wordWrap: { width: width - 20 }
    }).setScrollFactor(0).setDepth(3002);
  
    const buttons = options.map((opt, i) => {
      const btn = scene.add.text(x + 10, y + 100 + i * 25, opt.label, {
        fontSize: "14px",
        fill: "#00ffff"
      }).setScrollFactor(0).setDepth(3002).setInteractive();
  
      btn.on("pointerdown", () => {
        opt.onClick();
        destroyPrompt(scene);
      });
  
      return btn;
    });
  
    scene.currentPrompt = {
      background,
      border,
      titleText,
      body,
      buttons
    };
  }
  
  export function destroyPrompt(scene) {
    if (!scene.currentPrompt) return;
  
    const { background, border, titleText, body, buttons } = scene.currentPrompt;
    background.destroy();
    border.destroy();
    titleText.destroy();
    body.destroy();
    buttons.forEach(btn => btn.destroy());
  
    scene.currentPrompt = null;
  }
  
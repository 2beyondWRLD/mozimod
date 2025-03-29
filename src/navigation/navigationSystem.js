// navigationSystem.js

export function createMiniMap(scene, mapX, mapY, mapSize = 100) {
    scene.miniMap = scene.add.graphics()
      .fillStyle(0x000000, 0.5)
      .fillRect(mapX, mapY, mapSize, mapSize)
      .lineStyle(2, 0xffffff, 0.8)
      .strokeRect(mapX, mapY, mapSize, mapSize)
      .setScrollFactor(0)
      .setDepth(12000);
  
    scene.miniMapPlayer = scene.add.circle(0, 0, 3, 0x00ff00)
      .setScrollFactor(0)
      .setDepth(12001);
  
    scene.miniMapMonsters = [];
    scene.miniMapCrates = [];
  }
  
  export function updateMiniMap(scene, mapX, mapY, mapSize) {
    if (!scene.miniMapPlayer || !scene.player || !scene.background) return;
  
    const mapRatioX = mapSize / scene.background.displayWidth;
    const mapRatioY = mapSize / scene.background.displayHeight;
  
    const miniX = mapX + scene.player.x * mapRatioX;
    const miniY = mapY + scene.player.y * mapRatioY;
  
    scene.miniMapPlayer.setPosition(miniX, miniY);
  
    updateMiniMapMonsters(scene, mapX, mapY, mapRatioX, mapRatioY);
    updateMiniMapCrates(scene, mapX, mapY, mapRatioX, mapRatioY);
  }
  
  function updateMiniMapMonsters(scene, mapX, mapY, mapRatioX, mapRatioY) {
    scene.miniMapMonsters.forEach(dot => dot.destroy());
    scene.miniMapMonsters = [];
  
    if (scene.monsters) {
      scene.monsters.getChildren().forEach(monster => {
        const dotX = mapX + monster.x * mapRatioX;
        const dotY = mapY + monster.y * mapRatioY;
  
        const dot = scene.add.circle(dotX, dotY, 2, 0xff0000)
          .setScrollFactor(0)
          .setDepth(12001);
  
        scene.miniMapMonsters.push(dot);
      });
    }
  }
  
  function updateMiniMapCrates(scene, mapX, mapY, mapRatioX, mapRatioY) {
    scene.miniMapCrates.forEach(dot => dot.destroy());
    scene.miniMapCrates = [];
  
    if (scene.lootCrates) {
      scene.lootCrates.getChildren().forEach(crate => {
        const dotX = mapX + crate.x * mapRatioX;
        const dotY = mapY + crate.y * mapRatioY;
  
        const dot = scene.add.circle(dotX, dotY, 2, 0xffff00)
          .setScrollFactor(0)
          .setDepth(12001);
  
        scene.miniMapCrates.push(dot);
      });
    }
  }
  
  // Toggle visibility of the minimap
  export function toggleMiniMap(scene, isVisible) {
    scene.miniMap.setVisible(isVisible);
    scene.miniMapPlayer.setVisible(isVisible);
    scene.miniMapMonsters.forEach(dot => dot.setVisible(isVisible));
    scene.miniMapCrates.forEach(dot => dot.setVisible(isVisible));
  }
  
// src/ui/logSystem.js

// Function to add a message to the game log
export function addToLog(scene, message) {
    if (!scene || !scene.logMessages || !scene.logText) return;
    if (!message || typeof message !== 'string') {
      message = String(message || 'Event occurred');
    }
    
    try {
      console.log("Log update:", message);
      scene.logMessages.push(message);
      if (scene.logMessages.length > 5) {
        scene.logMessages.shift(); // Remove the oldest message
      }
      scene.logText.setText(scene.logMessages.join('\n'));
      
      // Add visual highlight to log briefly
      scene.logText.setTint(0xffff00);
      scene.time.delayedCall(1000, () => {
        if (scene.logText && scene.logText.clearTint) {
          scene.logText.clearTint();
        }
      });
    } catch (error) {
      console.warn("Error updating log:", error);
    }
  }
  
  // Function to initialize the log system
  export function initializeLog(scene) {
    scene.logMessages = [];
    
    scene.logText = scene.add.text(
      10, 
      scene.game.config.height - 80, 
      "", 
      { 
        font: "14px Arial", 
        fill: "#ffffff", 
        stroke: "#000000", 
        strokeThickness: 2 
      }
    ).setScrollFactor(0).setDepth(2000);
    
    return scene.logText;
  }
  
  // Function to clear the log
  export function clearLog(scene) {
    if (scene.logMessages) {
      scene.logMessages = [];
    }
    
    if (scene.logText) {
      scene.logText.setText("");
    }
  }
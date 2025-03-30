// villageBuildings.js

import { showDialog, hideDialog, createScrollableMenu, clearButtons, showModalOverlay, hideModalOverlay, createButtons } from '../ui/uiManager.js';
import { createSimpleEffect, addToInventory, removeFromInventory, getItemData, getRandomLootForZone, getAllLootItems } from '../inventory/inventorySystem.js';
import { SCREEN_LIQUIDITY, SCREEN_MERCHANT, SCREEN_ROYAL, SCREEN_TINKER, SCREEN_CRAFT, SCREEN_TRADING, SCREEN_NONE } from './interactionManager.js';

// Merchant Quarter
export function showMerchantQuarterOptions(scene) {
  scene.narrativeScreen = SCREEN_MERCHANT;
  showModalOverlay(scene);
  const options = [
    {
      label: "List Item for Sale",
      callback: () => {
        clearButtons(scene);
        showListItemScreen(scene);
      }
    },
    {
      label: "Browse Marketplace",
      callback: () => {
        clearButtons(scene);
        showBrowseMarketplaceScreen(scene);
      }
    },
    {
      label: "View My Listed Items",
      callback: () => {
        clearButtons(scene);
        showMyListingsScreen(scene);
      }
    },
    {
      label: "Back",
      callback: () => {
        clearButtons(scene);
        hideDialog(scene);
        hideModalOverlay(scene);
        scene.narrativeScreen = SCREEN_NONE;
      }
    }
  ];
  createScrollableMenu(scene, "Merchant Quarter Options:\nSelect an option:", options);
}

function showListItemScreen(scene) {
  const resources = scene.localInventory;
  if (!resources || resources.length === 0) {
    alert("No items available to list.");
    showMerchantQuarterOptions(scene);
    return;
  }
  clearButtons(scene);
  const options = resources.map((item, index) => ({
    label: `${item.name} x${item.quantity}`,
    callback: () => {
      clearButtons(scene);
      promptListItemDetails(scene, item, index);
    }
  }));
  options.push({
    label: "Back",
    callback: () => {
      clearButtons(scene);
      showMerchantQuarterOptions(scene);
    }
  });
  createScrollableMenu(scene, "Select an item to list for sale:", options);
}

function promptListItemDetails(scene, item, index) {
  clearButtons(scene);
  hideDialog(scene);
  let priceStr = prompt(`Enter sale price for ${item.name}:`, "1000");
  let price = parseInt(priceStr, 10);
  if (isNaN(price)) {
    alert("Invalid price. Returning to item selection.");
    showListItemScreen(scene);
    return;
  }
  let nonce = Date.now() + Math.floor(Math.random() * 1000);
  showDialog(scene, `List ${item.name} for sale at ${price} OROMOZI?\nConfirm listing?`);
  const options = [
    {
      label: "Yes",
      callback: async () => {
        const itemListed = scene.localInventory[index];
        scene.listedItems.push({ id: index, item: itemListed.name, quantity: 1, price, nonce });
        removeFromInventory(scene, item.name, 1);
        alert("Merchant listing created successfully (simulated).");
        clearButtons(scene);
        showMerchantQuarterOptions(scene);
      }
    },
    {
      label: "No",
      callback: () => {
        clearButtons(scene);
        showListItemScreen(scene);
      }
    }
  ];
  createButtons(scene, options);
}

function showBrowseMarketplaceScreen(scene) {
  const marketItems = [
    { item: "Iron Sword", price: 500 },
    { item: "Wooden Armor", price: 300 },
    { item: "Healing Potion", price: 100 }
  ];
  clearButtons(scene);
  const options = marketItems.map(item => ({
    label: `${item.item} - ${item.price} OROMOZI`,
    callback: async () => {
      if (scene.playerStats.oromozi >= item.price) {
        scene.playerStats.oromozi -= item.price;
        addToInventory(scene, item.item);
        alert(`Purchased ${item.item} for ${item.price} OROMOZI (simulated).`);
      } else {
        alert("Insufficient OROMOZI to purchase this item!");
      }
      updateHUD(scene);
      clearButtons(scene);
      showMerchantQuarterOptions(scene);
    }
  }));
  options.push({
    label: "Back",
    callback: () => {
      clearButtons(scene);
      showMerchantQuarterOptions(scene);
    }
  });
  createScrollableMenu(scene, "Browse Marketplace:\nSelect an item to buy:", options);
}

function showMyListingsScreen(scene) {
  if (!scene.listedItems || scene.listedItems.length === 0) {
    alert("You have no listed items.");
    showMerchantQuarterOptions(scene);
    return;
  }
  clearButtons(scene);
  const options = scene.listedItems.map((listing, index) => ({
    label: `${listing.item} x${listing.quantity} - ${listing.price} OROMOZI`,
    callback: () => {
      clearButtons(scene);
      showManageListingScreen(scene, listing, index);
    }
  }));
  options.push({
    label: "Back",
    callback: () => {
      clearButtons(scene);
      showMerchantQuarterOptions(scene);
    }
  });
  createScrollableMenu(scene, "Your Listings:\nSelect an item to manage:", options);
}

function showManageListingScreen(scene, listing, index) {
  clearButtons(scene);
  const options = [
    {
      label: "Edit Price",
      callback: () => {
        clearButtons(scene);
        promptEditPrice(scene, listing, index);
      }
    },
    {
      label: "Cancel Listing",
      callback: async () => {
        addToInventory(scene, listing.item, listing.quantity);
        scene.listedItems.splice(index, 1);
        alert(`Listing for ${listing.item} cancelled (simulated).`);
        clearButtons(scene);
        showMerchantQuarterOptions(scene);
      }
    },
    {
      label: "Back",
      callback: () => {
        clearButtons(scene);
        showMyListingsScreen(scene);
      }
    }
  ];
  createScrollableMenu(scene, `Manage ${listing.item} (${listing.price} OROMOZI):\nSelect an option:`, options);
}

function promptEditPrice(scene, listing, index) {
  clearButtons(scene);
  hideDialog(scene);
  let newPriceStr = prompt(`Enter new price for ${listing.item} (current: ${listing.price}):`, listing.price);
  let newPrice = parseInt(newPriceStr, 10);
  if (isNaN(newPrice)) {
    alert("Invalid price. Returning to listing options.");
    showManageListingScreen(scene, listing, index);
    return;
  }
  showDialog(scene, `Update ${listing.item} price to ${newPrice} OROMOZI?\nConfirm change?`);
  const options = [
    {
      label: "Yes",
      callback: async () => {
        scene.listedItems[index].price = newPrice;
        alert(`Listing price updated to ${newPrice} (simulated).`);
        clearButtons(scene);
        showMerchantQuarterOptions(scene);
      }
    },
    {
      label: "No",
      callback: () => {
        clearButtons(scene);
        showManageListingScreen(scene, listing, index);
      }
    }
  ];
  createButtons(scene, options);
}

// Royal Market
export function showRoyalMarketOptions(scene) {
  scene.narrativeScreen = SCREEN_ROYAL;
  showModalOverlay(scene);
  const categories = [
    { name: "Browse Weapons", items: [{ item: "Iron Sword", price: 500 }, { item: "Steel Axe", price: 700 }] },
    { name: "Resources", items: [{ item: "Wood", price: 50 }, { item: "Iron Ore", price: 100 }, { item: "Cloth", price: 50 }] },
    { name: "Consumables", items: [{ item: "Bread", price: 20 }, { item: "Healing Potion", price: 100 }] },
    { name: "Aesthetic Items", items: [{ item: "Fancy Hat", price: 200 }, { item: "Golden Necklace", price: 300 }] },
    { name: "Armor", items: [{ item: "Wooden Armor", price: 300 }, { item: "Iron Chestplate", price: 600 }] },
    { name: "Special Moves", items: [{ item: "Fireball", price: 1000 }, { item: "Stealth Strike", price: 1200 }] }
  ];
  const options = categories.map(cat => ({
    label: cat.name,
    callback: () => {
      clearButtons(scene);
      showRoyalCategoryScreen(scene, cat.name, cat.items);
    }
  }));
  options.push({
    label: "Back",
    callback: () => {
      clearButtons(scene);
      hideDialog(scene);
      hideModalOverlay(scene);
      scene.narrativeScreen = SCREEN_NONE;
    }
  });
  createScrollableMenu(scene, "Royal Market Options:\nSelect an option:", options);
}

function showRoyalCategoryScreen(scene, category, items) {
  clearButtons(scene);
  const options = items.map(item => ({
    label: `${item.item} - ${item.price} OROMOZI`,
    callback: async () => {
      if (scene.playerStats.oromozi >= item.price) {
        scene.playerStats.oromozi -= item.price;
        addToInventory(scene, item.item);
        alert(`Purchased ${item.item} for ${item.price} OROMOZI (simulated).`);
      } else {
        alert("Insufficient OROMOZI to purchase this item!");
      }
      updateHUD(scene);
      clearButtons(scene);
      showRoyalMarketOptions(scene);
    }
  }));
  options.push({
    label: "Back",
    callback: () => {
      clearButtons(scene);
      showRoyalMarketOptions(scene);
    }
  });
  createScrollableMenu(scene, `${category}:\nSelect an item to purchase:`, options);
}

// Trading Post
export function showTradingPostOptions(scene) {
  scene.narrativeScreen = SCREEN_TRADING;
  showModalOverlay(scene);
  const options = [
    {
      label: "Post an Item",
      callback: () => {
        clearButtons(scene);
        showTradePostItemScreen(scene);
      }
    },
    {
      label: "View Trade Listings",
      callback: () => {
        clearButtons(scene);
        showTradeListingsScreen(scene);
      }
    },
    {
      label: "Back",
      callback: () => {
        clearButtons(scene);
        hideDialog(scene);
        hideModalOverlay(scene);
        scene.narrativeScreen = SCREEN_NONE;
      }
    }
  ];
  createScrollableMenu(scene, "Trading Post Options:\nSelect an option:", options);
}

function showTradePostItemScreen(scene) {
  const resources = scene.localInventory;
  if (!resources || resources.length === 0) {
    alert("No items available to post.");
    showTradingPostOptions(scene);
    return;
  }
  clearButtons(scene);
  const options = resources.map((item, index) => ({
    label: `${item.name} x${item.quantity}`,
    callback: () => {
      clearButtons(scene);
      promptTradeRequest(scene, item, index);
    }
  }));
  options.push({
    label: "Back",
    callback: () => {
      clearButtons(scene);
      showTradingPostOptions(scene);
    }
  });
  createScrollableMenu(scene, "Select an item to offer:", options);
}

function promptTradeRequest(scene, offerItem, offerIndex) {
  clearButtons(scene);
  const allLootItems = getAllLootItems(scene);
  const options = allLootItems.map(item => ({
    label: item,
    callback: async () => {
      scene.tradeListings = scene.tradeListings || [];
      scene.tradeListings.push({ offer: offerItem.name, quantity: 1, request: item });
      removeFromInventory(scene, offerItem.name, 1);
      alert(`Trade posted: ${offerItem.name} for ${item} (simulated).`);
      clearButtons(scene);
      showTradingPostOptions(scene);
    }
  }));
  options.push({
    label: "Back",
    callback: () => {
      clearButtons(scene);
      showTradePostItemScreen(scene);
    }
  });
  createScrollableMenu(scene, `Select an item to request for ${offerItem.name}:`, options);
}

function showTradeListingsScreen(scene) {
  if (!scene.tradeListings || scene.tradeListings.length === 0) {
    alert("No trade listings available.");
    showTradingPostOptions(scene);
    return;
  }
  clearButtons(scene);
  const options = scene.tradeListings.map((trade, index) => ({
    label: `${trade.offer} x${trade.quantity} for ${trade.request}`,
    callback: async () => {
      const offerItem = scene.localInventory.find(item => item.name === trade.request);
      if (offerItem && offerItem.quantity >= 1) {
        removeFromInventory(scene, trade.request, 1);
        addToInventory(scene, trade.offer, trade.quantity);
        scene.tradeListings.splice(index, 1);
        alert(`Trade accepted: Received ${trade.offer} for ${trade.request} (simulated).`);
      } else {
        alert(`You don't have ${trade.request} to trade!`);
      }
      clearButtons(scene);
      showTradingPostOptions(scene);
    }
  }));
  options.push({
    label: "Back",
    callback: () => {
      clearButtons(scene);
      showTradingPostOptions(scene);
    }
  });
  createScrollableMenu(scene, "Trade Listings:\nSelect a trade to accept:", options);
}

// Tinkerer's Lab
export function showTinkerersLabOptions(scene) {
  scene.narrativeScreen = SCREEN_TINKER;
  showModalOverlay(scene);
  const options = [
    {
      label: "Attempt to Invent",
      callback: () => {
        clearButtons(scene);
        showInventItemScreen(scene);
      }
    },
    {
      label: "Back",
      callback: () => {
        clearButtons(scene);
        hideDialog(scene);
        hideModalOverlay(scene);
        scene.narrativeScreen = SCREEN_NONE;
      }
    }
  ];
  createScrollableMenu(scene, "Tinkerer's Lab Options:\nSelect an option:", options);
}

function showInventItemScreen(scene) {
  const resources = scene.localInventory;
  if (!resources || resources.length < 3) {
    alert("You need at least 3 items to invent something.");
    showTinkerersLabOptions(scene);
    return;
  }
  clearButtons(scene);
  let selectedItems = [];
  const options = resources.map((item, index) => ({
    label: `${item.name} x${item.quantity}`,
    callback: () => {
      if (selectedItems.length < 3 && !selectedItems.includes(item.name)) {
        selectedItems.push(item.name);
        if (selectedItems.length === 3) {
          clearButtons(scene);
          confirmInvention(scene, selectedItems);
        } else {
          showDialog(scene, `Selected: ${selectedItems.join(", ")}\nSelect ${3 - selectedItems.length} more:`);
        }
      }
    }
  }));
  options.push({
    label: "Back",
    callback: () => {
      clearButtons(scene);
      showTinkerersLabOptions(scene);
    }
  });
  createScrollableMenu(scene, "Select 3 items to attempt invention (click 3 times):", options);
}

function confirmInvention(scene, items) {
  clearButtons(scene);
  showDialog(scene, `Invent using ${items.join(", ")}?\nConfirm invention?`);
  const options = [
    {
      label: "Yes",
      callback: async () => {
        const secretRecipes = [
          { ingredients: ["Iron Ore", "Copper Ore", "Wood"], result: "Mechanical Cog" },
          { ingredients: ["Fire Crystal", "Steel Ingot", "Thread"], result: "Flamethrower Gadget" },
          { ingredients: ["Vines", "Stone", "Herbs"], result: "Vine Trap" },
          { ingredients: ["Poisonous Berries", "Water", "Iron Ore"], result: "Toxic Sprayer" },
          { ingredients: ["Wood", "Thread", "Copper Ore"], result: "Wind-Up Toy" },
          { ingredients: ["Steel Ingot", "Fire Crystal", "Wood"], result: "Steam Pistol" },
          { ingredients: ["Leather", "Iron Ore", "Vines"], result: "Spring-Loaded Glove" }
        ];

        items.sort();
        const match = secretRecipes.find(recipe => {
          const sortedRecipe = [...recipe.ingredients].sort();
          return items.length === sortedRecipe.length && items.every((item, i) => item === sortedRecipe[i]);
        });

        const hasItems = items.every(item => {
          const invItem = scene.localInventory.find(i => i.name === item);
          return invItem && invItem.quantity >= 1;
        });

        if (hasItems) {
          items.forEach(item => removeFromInventory(scene, item));
          if (match) {
            const newItem = match.result;
            addToInventory(scene, newItem);
            alert(`Invention succeeded! Created ${newItem} (simulated).`);
          } else {
            alert("Invention failed! Items consumed (simulated).");
          }
        } else {
          alert("You don't have all the required items!");
        }
        clearButtons(scene);
        showTinkerersLabOptions(scene);
      }
    },
    {
      label: "No",
      callback: () => {
        clearButtons(scene);
        showInventItemScreen(scene);
      }
    }
  ];
  createButtons(scene, options);
}

// Crafting Workshop
export function showCraftingWorkshopOptions(scene) {
  scene.narrativeScreen = SCREEN_CRAFT;
  showModalOverlay(scene);
  const options = [
    {
      label: "Craft Item",
      callback: () => {
        clearButtons(scene);
        showCraftItemScreen(scene);
      }
    },
    {
      label: "Repair Item",
      callback: () => {
        clearButtons(scene);
        showRepairItemScreen(scene);
      }
    },
    {
      label: "Salvage Loot",
      callback: () => {
        clearButtons(scene);
        showSalvageItemScreen(scene);
      }
    },
    {
      label: "Back",
      callback: () => {
        clearButtons(scene);
        hideDialog(scene);
        hideModalOverlay(scene);
        scene.narrativeScreen = SCREEN_NONE;
      }
    }
  ];
  createScrollableMenu(scene, "Crafting Workshop Options:\nSelect an option:", options);
}

function showCraftItemScreen(scene) {
  const recipes = [
    { result: "Iron Sword", ingredients: ["Iron Ore", "Wood"], description: "A sturdy blade for combat." },
    { result: "Wooden Armor", ingredients: ["Wood", "Wood"], description: "Basic protection from the wilds." },
    { result: "Steel Axe", ingredients: ["Steel Ingot", "Wood"], description: "Chops trees and foes alike." },
    { result: "Leather Boots", ingredients: ["Leather", "Thread"], description: "Swift and silent footwear." },
    { result: "Healing Salve", ingredients: ["Herbs", "Water"], description: "Restores minor wounds." },
    { result: "Poison Dagger", ingredients: ["Iron Ore", "Poisonous Berries"], description: "A sneaky, toxic blade." },
    { result: "Stone Hammer", ingredients: ["Stone", "Wood"], description: "Good for breaking rocks." },
    { result: "Copper Ring", ingredients: ["Copper Ore", "Thread"], description: "A shiny trinket." },
    { result: "Fire Staff", ingredients: ["Wood", "Fire Crystal"], description: "Channels fiery magic." },
    { result: "Shield of Roots", ingredients: ["Wood", "Vines"], description: "Nature's sturdy defense." }
  ];
  clearButtons(scene);
  const options = recipes.map(recipe => ({
    label: `${recipe.result} (${recipe.ingredients.join(", ")})`,
    callback: () => {
      clearButtons(scene);
      confirmCraftItem(scene, recipe);
    }
  }));
  options.push({
    label: "Back",
    callback: () => {
      clearButtons(scene);
      showCraftingWorkshopOptions(scene);
    }
  });
  createScrollableMenu(scene, "Select an item to craft:", options);
}

function confirmCraftItem(scene, recipe) {
  const hasIngredients = recipe.ingredients.every(ing => scene.localInventory.some(i => i.name === ing && i.quantity >= 1));
  if (!hasIngredients) {
    alert(`You don't have all required ingredients: ${recipe.ingredients.join(", ")}`);
    showCraftingWorkshopOptions(scene);
    return;
  }
  showDialog(scene, `Craft ${recipe.result} using ${recipe.ingredients.join(", ")}?\n${recipe.description}\nConfirm crafting?`);
  const options = [
    {
      label: "Yes",
      callback: async () => {
        recipe.ingredients.forEach(item => removeFromInventory(scene, item));
        addToInventory(scene, recipe.result);
        alert(`Crafted ${recipe.result} (simulated).`);
        clearButtons(scene);
        showCraftingWorkshopOptions(scene);
      }
    },
    {
      label: "No",
      callback: () => {
        clearButtons(scene);
        showCraftItemScreen(scene);
      }
    }
  ];
  createButtons(scene, options);
}

function showRepairItemScreen(scene) {
  const resources = scene.localInventory;
  if (!resources || resources.length === 0) {
    alert("No items available to repair.");
    showCraftingWorkshopOptions(scene);
    return;
  }
  clearButtons(scene);
  const options = resources.map((item, index) => ({
    label: `${item.name} x${item.quantity}`,
    callback: async () => {
      const resourceItem = scene.localInventory.find(i => i.name === "Wood");
      if (resourceItem && resourceItem.quantity >= 1) {
        removeFromInventory(scene, "Wood");
        alert(`Repaired ${scene.localInventory[index].name} (simulated).`);
      } else {
        alert(`You don't have Wood to repair this item!`);
      }
      clearButtons(scene);
      showCraftingWorkshopOptions(scene);
    }
  }));
  options.push({
    label: "Back",
    callback: () => {
      clearButtons(scene);
      showCraftingWorkshopOptions(scene);
    }
  });
  createScrollableMenu(scene, "Select an item to repair (requires Wood):", options);
}

function showSalvageItemScreen(scene) {
  const resources = scene.localInventory;
  if (!resources || resources.length === 0) {
    alert("No items available to salvage.");
    showCraftingWorkshopOptions(scene);
    return;
  }
  clearButtons(scene);
  const options = resources.map((item, index) => ({
    label: `${item.name} x${item.quantity}`,
    callback: async () => {
      const salvage = getRandomLootForZone(scene);
      removeFromInventory(scene, item.name, 1);
      if (salvage) {
        addToInventory(scene, salvage);
        alert(`Salvaged ${item.name} into ${salvage}.`);
      } else {
        alert(`Salvaged ${item.name} but found nothing useful.`);
      }
      clearButtons(scene);
      showCraftingWorkshopOptions(scene);
    }
  }));
  options.push({
    label: "Back",
    callback: () => {
      clearButtons(scene);
      showCraftingWorkshopOptions(scene);
    }
  });
  createScrollableMenu(scene, "Select an item to salvage:", options);
}

// Liquidity Pool (Bank)
export function showLiquidityPoolOptions(scene) {
  scene.narrativeScreen = SCREEN_LIQUIDITY;
  showModalOverlay(scene);
  const options = [
    {
      label: "Deposit Resource",
      callback: () => {
        clearButtons(scene);
        showDepositResourceScreen(scene);
      }
    },
    {
      label: "View Deposits & Yield",
      callback: () => {
        const deposits = scene.deposits.map((d, i) => `${i}: ${d.amount} units, ${Math.floor((Date.now() - d.startTime) / 1000)}s elapsed`).join("\n");
        alert(`Deposits:\n${deposits || "None"}`);
        clearButtons(scene);
        showLiquidityPoolOptions(scene);
      }
    },
    {
      label: "Withdraw Resources",
      callback: () => {
        clearButtons(scene);
        showWithdrawResourceScreen(scene);
      }
    },
    {
      label: "Back",
      callback: () => {
        clearButtons(scene);
        hideDialog(scene);
        hideModalOverlay(scene);
        scene.narrativeScreen = SCREEN_NONE;
      }
    }
  ];
  createScrollableMenu(scene, "Liquidity Pool Options:\nSelect an option:", options);
}

function showDepositResourceScreen(scene) {
  const resources = scene.localInventory.filter(item => {
    const itemData = getItemData(scene, item.name);
    return itemData && itemData.canDeposit;
  });
  if (!resources || resources.length === 0) {
    alert("No depositable resources available.");
    showLiquidityPoolOptions(scene);
    return;
  }
  clearButtons(scene);
  const options = resources.map((resource, index) => ({
    label: `${resource.name} x${resource.quantity}`,
    callback: () => {
      clearButtons(scene);
      promptDepositDetails(scene, resource.name, index);
    }
  }));
  options.push({
    label: "Back",
    callback: () => {
      clearButtons(scene);
      showLiquidityPoolOptions(scene);
    }
  });
  createScrollableMenu(scene, "Select a resource to deposit:", options);
}

function promptDepositDetails(scene, resource, index) {
  clearButtons(scene);
  hideDialog(scene);
  let amountStr = prompt(`Enter deposit amount for ${resource} (units):`, "10");
  let durationStr = prompt("Enter lockup duration (seconds):", "604800");
  let amount = parseInt(amountStr, 10);
  let duration = parseInt(durationStr, 10);
  if (isNaN(amount) || isNaN(duration)) {
    alert("Invalid input. Returning to resource selection.");
    showDepositResourceScreen(scene);
    return;
  }
  let estimatedYield = Math.floor(amount * (duration / 86400) * 50);
  showConfirmDeposit(scene, resource, amount, duration, estimatedYield, index);
}

function showConfirmDeposit(scene, resource, amount, duration, estimatedYield, index) {
  clearButtons(scene);
  showDialog(scene, `Deposit ${amount} units of ${resource} for ${duration} seconds?\nEstimated yield: ${estimatedYield} units.\nConfirm deposit?`);
  const options = [
    {
      label: "Yes",
      callback: async () => {
        removeFromInventory(scene, resource, amount);
        scene.deposits = scene.deposits || [];
        scene.deposits.push({ amount, duration: duration, startTime: Date.now() });
        alert("Liquidity deposit successful (simulated).");
        clearButtons(scene);
        hideDialog(scene);
        hideModalOverlay(scene);
        scene.narrativeScreen = SCREEN_NONE;
      }
    },
    {
      label: "No",
      callback: () => {
        clearButtons(scene);
        showDepositResourceScreen(scene);
      }
    }
  ];
  createButtons(scene, options);
}

function showWithdrawResourceScreen(scene) {
  if (!scene.deposits || scene.deposits.length === 0) {
    alert("No deposits to withdraw.");
    showLiquidityPoolOptions(scene);
    return;
  }
  clearButtons(scene);
  const options = scene.deposits.map((deposit, index) => ({
    label: `${deposit.amount} units (${Math.floor((Date.now() - deposit.startTime) / 1000)}s)`,
    callback: async () => {
      const deposit = scene.deposits[index];
      const elapsed = (Date.now() - deposit.startTime) / 1000;
      const yieldAmt = Math.floor(deposit.amount * (elapsed / 86400) * 50);
      scene.playerStats.oromozi += deposit.amount + yieldAmt;
      scene.deposits.splice(index, 1);
      alert(`Withdrawn ${deposit.amount} units + ${yieldAmt} yield (simulated).`);
      updateHUD(scene);
      clearButtons(scene);
      showLiquidityPoolOptions(scene);
    }
  }));
  options.push({
    label: "Back",
    callback: () => {
      clearButtons(scene);
      showLiquidityPoolOptions(scene);
    }
  });
  createScrollableMenu(scene, "Select a deposit to withdraw:", options);
}
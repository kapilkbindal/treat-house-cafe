function getMenu() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('MENU_JSON_V3');
  if (cached) return JSON.parse(cached);

  const sheet = SpreadsheetApp
    .getActive()
    .getSheetByName('Menu');
  
  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();
  rows.shift(); // headers

  const menu = rows
    .filter(r => r[5] === 'Yes' && r[3] && String(r[3]).trim() !== '') // Item Active AND Name exists
    .filter(r => r[7] !== 'No') // Category Active (Col H). Default to Yes if empty.
    .map(r => ({
      itemId: r[0],
      category: r[1],
      categoryOrder: Number(r[2]),
      name: r[3],
      price: Number(r[4]),
      itemOrder: Number(r[6])
    }))
    .sort((a, b) =>
      a.categoryOrder - b.categoryOrder ||
      a.itemOrder - b.itemOrder
    );

  cache.put('MENU_JSON_V3', JSON.stringify(menu), 300); // 5 min
  return menu;
}

function getManagerMenu() {
  // No caching for manager to ensure fresh data and include inactive items
  const sheet = SpreadsheetApp.getActive().getSheetByName('Menu');
  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();
  rows.shift(); // headers

  return rows
    .filter(r => r[3] && String(r[3]).trim() !== '') // Filter out empty rows
    .map(r => ({
    itemId: r[0],
    category: r[1],
    categoryOrder: Number(r[2]),
    name: r[3],
    price: Number(r[4]),
    active: r[5] === 'Yes',
    itemOrder: Number(r[6]),
    categoryActive: r[7] !== 'No' // Read Category Status (Col H)
  })).sort((a, b) => a.categoryOrder - b.categoryOrder || a.itemOrder - b.itemOrder);
}

function updateMenuItem(payload) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Menu');
  if (!sheet) return { success: false, message: 'Menu sheet not found' };

  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.itemId)) {
      if (payload.price !== undefined) sheet.getRange(i + 1, 5).setValue(payload.price);
      if (payload.active !== undefined) sheet.getRange(i + 1, 6).setValue(payload.active ? 'Yes' : 'No');
      if (payload.categoryOrder !== undefined) sheet.getRange(i + 1, 3).setValue(payload.categoryOrder);
      if (payload.itemOrder !== undefined) sheet.getRange(i + 1, 7).setValue(payload.itemOrder);
      
      CacheService.getScriptCache().remove('MENU_JSON_V3'); // Invalidate public cache
      return { success: true };
    }
  }
  return { success: false, message: 'Item not found' };
}

function batchUpdateMenuItems(updates) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Menu');
  if (!sheet) return { success: false, message: 'Menu sheet not found' };
  
  const data = sheet.getDataRange().getValues();
  const idMap = {};
  for (let i = 1; i < data.length; i++) {
    idMap[String(data[i][0])] = i + 1;
  }

  updates.forEach(u => {
    const row = idMap[String(u.itemId)];
    if (row) {
      if (u.categoryOrder !== undefined) sheet.getRange(row, 3).setValue(u.categoryOrder);
      if (u.itemOrder !== undefined) sheet.getRange(row, 7).setValue(u.itemOrder);
    }
  });
  
  CacheService.getScriptCache().remove('MENU_JSON_V3');
  return { success: true };
}

function updateMenuCategory(payload) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Menu');
  if (!sheet) return { success: false, message: 'Menu sheet not found' };

  const data = sheet.getDataRange().getValues();
  const categoryName = String(payload.categoryName).trim();
  const status = payload.isActive ? 'Yes' : 'No';
  const ranges = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === categoryName) {
      // Update Col H (Index 8 in 1-based notation)
      ranges.push(`H${i + 1}`);
    }
  }

  if (ranges.length > 0) sheet.getRangeList(ranges).setValue(status);
  
  CacheService.getScriptCache().remove('MENU_JSON_V3');
  return { success: true };
}

function addMenuItem(payload) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Menu');
  if (!sheet) return { success: false, message: 'Menu sheet not found' };

  const data = sheet.getDataRange().getValues();
  const name = String(payload.name).trim();
  const category = String(payload.category).trim();
  const price = Number(payload.price);

  // Check duplicate name (case-insensitive)
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][3]).toLowerCase() === name.toLowerCase()) {
      return { success: false, message: 'Item already exists' };
    }
  }

  // Calculate Orders
  let categoryOrder = 0;
  let maxItemOrderInCat = 0;
  let maxGlobalCatOrder = 0;
  let categoryExists = false;
  let maxId = 0;

  for (let i = 1; i < data.length; i++) {
    const rCat = String(data[i][1]);
    const rCatOrder = Number(data[i][2]) || 0;
    const rItemOrder = Number(data[i][6]) || 0;
    const rId = String(data[i][0]);

    if (rCatOrder > maxGlobalCatOrder) maxGlobalCatOrder = rCatOrder;

    if (rCat.toLowerCase() === category.toLowerCase()) {
      categoryExists = true;
      categoryOrder = rCatOrder;
      if (rItemOrder > maxItemOrderInCat) maxItemOrderInCat = rItemOrder;
    }

    if (rId.startsWith('M')) {
      const num = parseInt(rId.substring(1), 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  }

  if (!categoryExists) {
    categoryOrder = maxGlobalCatOrder + 1;
    maxItemOrderInCat = 0;
  }

  const itemOrder = maxItemOrderInCat + 1;
  const itemId = 'M' + (maxId + 1);

  // Append Row: ItemId, Category, CatOrder, Name, Price, Active, ItemOrder, CatActive
  sheet.appendRow([itemId, category, categoryOrder, name, price, 'Yes', itemOrder, 'Yes']);

  CacheService.getScriptCache().remove('MENU_JSON_V3');
  return { success: true };
}

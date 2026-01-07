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
    .filter(r => r[5] === 'Yes' && r[3] && String(r[3]).trim() !== '') // Available AND Name exists
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
    itemOrder: Number(r[6])
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

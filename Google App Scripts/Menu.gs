function getMenu() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('MENU_JSON');
  if (cached) return JSON.parse(cached);

  const sheet = SpreadsheetApp
    .getActive()
    .getSheetByName('Menu');

  const rows = sheet.getDataRange().getValues();
  rows.shift(); // headers

  const menu = rows
    .filter(r => r[5] === 'Yes') // Available
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

  cache.put('MENU_JSON', JSON.stringify(menu), 300); // 5 min
  return menu;
}

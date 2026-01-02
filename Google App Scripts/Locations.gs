function getLocations() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('LOCATIONS_JSON');
  if (cached) return JSON.parse(cached);

  const sheet = SpreadsheetApp
    .getActive()
    .getSheetByName('Locations');

  const rows = sheet.getDataRange().getValues();
  rows.shift(); // headers

  const locations = rows
    .filter(r => r[2] === 'Yes')
    .map(r => ({
      locationId: r[0],
      displayName: r[1]
    }));

  cache.put('LOCATIONS_JSON', JSON.stringify(locations), 300);
  return locations;
}

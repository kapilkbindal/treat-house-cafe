function handleNewsletter(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Newsletter');

  if (!sheet) {
    return jsonResponse({
      success: false,
      message: 'Newsletter sheet not found'
    });
  }

  const email = String(payload.email || '')
    .trim()
    .toLowerCase();

  const timestamp = new Date();

  if (!email || !isValidEmail(email)) {
    return jsonResponse({
      success: false,
      message: 'Invalid email address'
    });
  }

  // Duplicate check
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const existingEmails = sheet
      .getRange(2, 2, lastRow - 1, 1)
      .getValues()
      .flat()
      .map(e => String(e).toLowerCase());

    if (existingEmails.includes(email)) {
      return jsonResponse({
        success: false,
        message: 'Email already subscribed'
      });
    }
  }

  sheet.appendRow([timestamp, email]);

  return jsonResponse({
    success: true,
    message: 'Subscribed successfully'
  });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function assertAllowed(value, allowed) {
  if (!allowed.includes(value)) {
    throw new Error(`Invalid status: ${value}. Allowed: ${allowed.join(', ')}`);
  }
}

function hashString(str) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, str);
  let txt = '';
  for (let i = 0; i < raw.length; i++) {
    let hashVal = raw[i];
    if (hashVal < 0) hashVal += 256;
    if (hashVal.toString(16).length === 1) txt += '0';
    txt += hashVal.toString(16);
  }
  return txt;
}

function validateUser(username, password) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Users');
  if (!sheet) throw new Error('Users sheet not found. Run setupUsers.');
  
  const data = sheet.getDataRange().getValues();
  // Skip header, check rows
  for (let i = 1; i < data.length; i++) {
    // Col 0: Username, Col 1: Password, Col 2: Role, Col 3: Name
    if (String(data[i][0]).toLowerCase() === String(username).toLowerCase() && 
        String(data[i][1]) === hashString(password)) {
      
      // Maintenance: Clean old tokens before adding a new one
      cleanExpiredTokens();

      const token = Utilities.getUuid(); // Generate unique token
      
      // Save to TOKENS sheet instead of Users sheet
      const tokensSheet = getOrCreateTokensSheet();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours expiry
      tokensSheet.appendRow([token, data[i][0], String(data[i][2]).toLowerCase(), now, expiresAt]);

      return {
        username: data[i][0],
        role: String(data[i][2]).toLowerCase(),
        name: data[i][3],
        token: token
      };
    }
  }
  return null;
}

function authenticate(token, allowedRoles) {
  if (!token) throw new Error('Unauthorized: No token provided');
  
  const sheet = SpreadsheetApp.getActive().getSheetByName('Tokens');
  if (!sheet) throw new Error('System Error: Tokens sheet missing');

  const data = sheet.getDataRange().getValues();
  const now = new Date();
  
  // Scan for token in Col 0 (Tokens sheet: Token, Username, Role, Created, Expires)
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      if (data[i][4] instanceof Date && data[i][4] < now) throw new Error('Unauthorized: Token expired');

      const role = String(data[i][2]).toLowerCase();
      if (allowedRoles && !allowedRoles.includes(role)) {
        throw new Error(`Forbidden: Role '${role}' cannot perform this action`);
      }
      return { username: data[i][1], role: role };
    }
  }
  throw new Error('Unauthorized: Invalid token');
}

function logoutUser(token) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Tokens');
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === token) {
      sheet.deleteRow(i + 1); // Remove the session row completely
      return;
    }
  }
}

function cleanExpiredTokens() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Tokens');
  if (!sheet) return;
  
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  
  // Iterate backwards to delete rows safely
  for (let i = data.length - 1; i >= 1; i--) {
    // Col 4 (Index 4) is Expires At
    if (data[i][4] instanceof Date && data[i][4] < now) {
      sheet.deleteRow(i + 1);
    }
  }
}

function setupUsersSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName('Users');
  if (!sheet) {
    sheet = ss.insertSheet('Users');
    sheet.appendRow(['Username', 'Password', 'Role', 'Name']);
    // Add default users with HASHED passwords
    sheet.appendRow(['admin', hashString('admin123'), 'admin', 'System Admin']);
    sheet.appendRow(['chef', hashString('chef123'), 'kitchen', 'Head Chef']);
    sheet.appendRow(['waiter', hashString('waiter123'), 'waiter', 'Waiter 1']);
    sheet.appendRow(['rider', hashString('rider123'), 'delivery', 'Rider 1']);
  }
  return jsonResponse({ success: true, message: 'Users sheet created' });
}

function getOrCreateAuditSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName('Audit');
  if (!sheet) {
    sheet = ss.insertSheet('Audit');
    sheet.appendRow(['Timestamp', 'User', 'Action', 'Details']);
  }
  return sheet;
}

function logAction(username, action, details) {
  try {
    const sheet = getOrCreateAuditSheet();
    sheet.appendRow([new Date(), username, action, details]);
  } catch (e) {
    // Fail silently to not block the main action
    console.error('Audit log failed', e);
  }
}

function getOrCreateTokensSheet() {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName('Tokens');
  if (!sheet) {
    sheet = ss.insertSheet('Tokens');
    sheet.appendRow(['Token', 'Username', 'Role', 'Created At', 'Expires At']);
  }
  return sheet;
}

function setupTokensSheet() {
  getOrCreateTokensSheet();
  return jsonResponse({ success: true, message: 'Tokens sheet ready' });
}

function setupAuditSheet() {
  getOrCreateAuditSheet();
  return jsonResponse({ success: true, message: 'Audit sheet ready' });
}

function changeUserPassword(token, oldPassword, newPassword) {
  const user = authenticate(token); // Verify token first to get username
  const username = user.username;

  const sheet = SpreadsheetApp.getActive().getSheetByName('Users');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(username).toLowerCase()) {
      // Verify old password matches stored hash
      if (String(data[i][1]) !== hashString(oldPassword)) {
        throw new Error('Incorrect old password');
      }
      // Update with new hash
      sheet.getRange(i + 1, 2).setValue(hashString(newPassword));
      return { success: true };
    }
  }
  throw new Error('User record not found');
}

function adminResetPassword(token, targetUsername, newPassword) {
  // 1. Verify requester is a Manager
  authenticate(token, ['admin']); 

  const sheet = SpreadsheetApp.getActive().getSheetByName('Users');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(targetUsername).toLowerCase()) {
      sheet.getRange(i + 1, 2).setValue(hashString(newPassword));
      return { success: true };
    }
  }
  throw new Error('Target user not found');
}

function getUsers() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  const users = [];
  // Skip header
  for (let i = 1; i < data.length; i++) {
    users.push({
      username: data[i][0],
      role: data[i][2],
      name: data[i][3]
    });
  }
  return users;
}

function createUser({ username, password, role, name }) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(username).toLowerCase()) {
      throw new Error('Username already exists');
    }
  }
  sheet.appendRow([username, hashString(password), role, name]);
}

function deleteUser(targetUsername) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(targetUsername).toLowerCase()) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
  throw new Error('User not found');
}

function updateUser({ targetUsername, name, role }) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(targetUsername).toLowerCase()) {
      // Col 3 (Index 2) is Role, Col 4 (Index 3) is Name
      if (role) sheet.getRange(i + 1, 3).setValue(role);
      if (name) sheet.getRange(i + 1, 4).setValue(name);
      return { success: true };
    }
  }
  throw new Error('User not found');
}

/* -----------------------------
   ORDER HELPERS
----------------------------- */

function getOrders(params = {}) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Orders');
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  return data.map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    obj.items = JSON.parse(obj['Items JSON'] || '[]');
    return obj;
  });
}

function updateOrderById(orderId, updates) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Orders');
  const data = sheet.getDataRange().getValues();
  // Normalize headers (trim spaces) to ensure matching works
  const headers = data[0].map(h => String(h).trim());

  for (let i = 1; i < data.length; i++) {
    // Use String comparison to be safe
    if (String(data[i][0]).trim() === String(orderId).trim()) {
      Object.keys(updates).forEach(key => {
        const col = headers.indexOf(key);
        if (col === -1) {
          throw new Error(`Column "${key}" not found in sheet headers. Found: ${headers.join(', ')}`);
        }
        sheet.getRange(i + 1, col + 1).setValue(updates[key]);
      });
      SpreadsheetApp.flush();
      return {
        success: true,
        row: i + 1,
        message: `Updated row ${i + 1} for ID ${orderId}`
      };
    }
  }
  throw new Error('Order not found');
}

function setupSheet() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Orders');
  if (!sheet) {
    SpreadsheetApp.getActive().insertSheet('Orders');
  }
  
  // EXACT headers required by Orders.gs and Utils.gs
  const headers = [
    'Order ID',       // A
    'Timestamp',      // B (Date)
    'Location ID',    // C
    'Mode',           // D
    'Customer Name',  // E
    'Mobile',         // F
    'Address',        // G
    'Items JSON',     // H
    'Total',          // I
    'Order Status',   // J
    'Payment Status', // K
    'Discount %',     // L
    'Discount Amount',// M
    'Final Amount',   // N
    'Payment Mode',   // O
    'Closed At',      // P
    'Notes'           // Q
  ];
  
  const s = SpreadsheetApp.getActive().getSheetByName('Orders');
  s.getRange(1, 1, 1, headers.length).setValues([headers]);
  s.setFrozenRows(1);
  
  return jsonResponse({ success: true, message: 'Sheet headers fixed' });
}

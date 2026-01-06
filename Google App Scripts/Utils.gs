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

function authenticatePublicAction(secret) {
  const expectedSecret = PropertiesService.getScriptProperties().getProperty('API_SECRET_KEY');
  if (!expectedSecret || secret !== expectedSecret) {
    throw new Error('Unauthorized: Invalid API Key');
  }
  return true;
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
  const ss = SpreadsheetApp.getActive();
  const ordSheet = ss.getSheetByName('Orders');
  const itmSheet = ss.getSheetByName('OrderItems');

  if (!ordSheet || !itmSheet) {
    return [];
  }

  const ordData = ordSheet.getDataRange().getValues();
  const itmData = itmSheet.getDataRange().getValues();

  // 1. Parse Orders (Skip Header)
  // Headers: Order ID(0), Timestamp(1), Location(2), Mode(3), Staff(4), Cust(5), Mob(6), Addr(7), Total(8), Status(9)...
  const ordersMap = {};
  const ordersList = [];

  for (let i = 1; i < ordData.length; i++) {
    const row = ordData[i];
    const id = row[0];
    if (!id) continue;

    const orderObj = {
      'Order ID': id,
      'Timestamp': row[1],
      'Location ID': row[2],
      'Mode': row[3],
      'Staff Member': row[4],
      'Customer Name': row[5],
      'Mobile': row[6],
      'Address': row[7],
      'Total': row[8],
      'Order Status': row[9],
      'Payment Status': row[10],
      'Discount %': row[11],
      'Discount Amount': row[12],
      'Final Amount': row[13],
      'Payment Mode': row[14],
      'Closed At': row[15],
      'Notes': row[16],
      'items': []
    };
    
    ordersMap[id] = orderObj;
    ordersList.push(orderObj);
  }

  // 2. Parse Items and Attach
  // Headers: Order ID(0), Order Item ID(1), Item ID(2), Name(3), Price(4), Qty(5), Status(6)
  for (let i = 1; i < itmData.length; i++) {
    const row = itmData[i];
    const orderId = row[0];
    
    if (ordersMap[orderId]) {
      ordersMap[orderId].items.push({
        orderItemId: row[1],
        itemId: row[2],
        name: row[3],
        price: row[4],
        qty: row[5],
        status: row[6]
      });
    }
  }

  return ordersList;
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

function updateOrderStatus(orderId, nextStatus, cascade = true) {
  // This function can replace updateKitchenStatus, updateWaiterStatus, etc.
  const result = updateOrderById(orderId, {
    'Order Status': nextStatus
  });

  // Cascade status to items to maintain consistency and prevent frontend "self-healing" reversion
  // We do NOT cascade for PARTIALLY_READY as that implies mixed item states.
  const cascadeStatuses = [
    'OPEN', 'PREPARING', 'READY', 'SERVED', 
    'HANDED_OVER', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
  ];

  if (cascade === true && cascadeStatuses.includes(nextStatus)) {
    const sheet = SpreadsheetApp.getActive().getSheetByName('OrderItems');
    const data = sheet.getDataRange().getValues();
    const ranges = [];
    for (let i = 1; i < data.length; i++) {
      // Robust comparison (String + Trim)
      if (String(data[i][0]).trim() === String(orderId).trim()) {
        // Only update if different (optimization)
        // Status is now at index 6 (Column G)
        if (data[i][6] !== nextStatus) ranges.push(`G${i + 1}`);
      }
    }
    if (ranges.length > 0) sheet.getRangeList(ranges).setValue(nextStatus);
  }

  return jsonResponse(result);
}

function updateOrderItemStatus(orderId, orderItemId, nextStatus) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('OrderItems');
  const data = sheet.getDataRange().getValues();
  
  // Find row matching OrderID AND Order Item ID
  for (let i = 1; i < data.length; i++) {
    // Col 0: Order ID, Col 1: Order Item ID
    if (String(data[i][0]) === String(orderId) && String(data[i][1]) === String(orderItemId)) {
      // Update Status (Column G -> Index 6)
      sheet.getRange(i + 1, 7).setValue(nextStatus);
      return jsonResponse({ success: true });
    }
  }
  
  return jsonResponse({ success: false, message: 'Item not found' });
}

function setupSheet() {
  // Set the API Secret to match frontend (scripts/api.js)
  PropertiesService.getScriptProperties().setProperty('API_SECRET_KEY', 'your-very-secret-random-string');

  const ss = SpreadsheetApp.getActive();
  
  // 1. Setup Orders Sheet
  let ordSheet = ss.getSheetByName('Orders');
  if (!ordSheet) ordSheet = ss.insertSheet('Orders');
  
  const ordHeaders = [
    'Order ID', 'Timestamp', 'Location ID', 'Mode', 'Staff Member', 
    'Customer Name', 'Mobile', 'Address', 'Total', 'Order Status', 
    'Payment Status', 'Discount %', 'Discount Amount', 'Final Amount', 
    'Payment Mode', 'Closed At', 'Notes'
  ];
  ordSheet.getRange(1, 1, 1, ordHeaders.length).setValues([ordHeaders]);
  ordSheet.setFrozenRows(1);

  // 2. Setup OrderItems Sheet
  let itmSheet = ss.getSheetByName('OrderItems');
  if (!itmSheet) itmSheet = ss.insertSheet('OrderItems');

  const itmHeaders = [
    'Order ID', 'Order Item ID', 'Item ID', 'Item Name', 'Price', 'Qty', 'Item Status'
  ];
  itmSheet.getRange(1, 1, 1, itmHeaders.length).setValues([itmHeaders]);
  itmSheet.setFrozenRows(1);
  
  return jsonResponse({ success: true, message: 'DB Setup Complete (Orders & OrderItems)' });
}

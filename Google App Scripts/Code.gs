/**
 * Code.gs
 * Central request router (single source of truth)
 */

function doGet(e) {
  try {
    const action = e.parameter.action;

    switch (action) {
      case 'menu':
        return jsonResponse(getMenu());

      case 'locations':
        return jsonResponse(getLocations());

      case 'orders': // ✅ unified read
        // SECURE: Require token to read orders
        authenticate(e.parameter.token, ['kitchen', 'waiter', 'delivery', 'manager']);
        return jsonResponse(getOrders(e.parameter));

      case 'getUsers':
        authenticate(e.parameter.token, ['admin']);
        return jsonResponse(getUsers());

      case 'getManagerMenu':
        authenticate(e.parameter.token, ['manager']);
        return jsonResponse(getManagerMenu());

      case 'setup': // ✅ Run once to create Sheets
        return setupSheet();

      // case 'setupUsers': // 🔒 Comment out after use for security
      //   return setupUsersSheet();

      // case 'setupTokens': // ✅ Run once to create Tokens tab
      //   return setupTokensSheet();

      // case 'setupAudit': // ✅ Run once to create Audit tab
      //   return setupAuditSheet();

      default:
        return jsonResponse({
          success: false,
          message: 'Invalid action'
        });
    }
  } catch (err) {
    return jsonResponse({ success: false, message: err.message });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');

    switch (payload.action) {
      case 'newsletter':
        authenticatePublicAction(payload.secret);
        return handleNewsletter(payload);

      case 'createOrder':
        authenticatePublicAction(payload.secret);
        return handleCreateOrder(payload);

      case 'updateOrderStatus': {
        // Require valid token for ANY status update
        const user = authenticate(payload.token, ['kitchen', 'waiter', 'delivery', 'manager']);
        logAction(user.username, 'UPDATE_STATUS', `${payload.orderId} -> ${payload.nextStatus}`);
        return routeStatusUpdate(payload);
      }

      case 'updateItemStatus': {
        // Granular item updates
        const user = authenticate(payload.token, ['kitchen', 'waiter', 'manager']);
        logAction(user.username, 'UPDATE_ITEM', `${payload.orderId} [${payload.orderItemId}] -> ${payload.nextStatus}`);
        return updateOrderItemStatus(payload.orderId, payload.orderItemId, payload.nextStatus);
      }

      case 'closeOrder': {
        const user = authenticate(payload.token, ['manager']); // Only manager
        logAction(user.username, 'CLOSE_ORDER', `ID: ${payload.orderId}, Total: ${payload.finalAmount}`);
        return closeOrder(payload);
      }

      case 'cancelOrder': {
        const user = authenticate(payload.token, ['manager']); // Only manager
        logAction(user.username, 'CANCEL_ORDER', `ID: ${payload.orderId}, Reason: ${payload.reason}`);
        return cancelOrder(payload);
      }

      case 'editOrder': {
        const user = authenticate(payload.token, ['manager']);
        logAction(user.username, 'EDIT_ORDER', `ID: ${payload.orderId}`);
        return editOrder(payload);
      }

      case 'login':
        return handleLogin(payload);

      case 'logout':
        return handleLogout(payload);

      case 'changePassword':
        return handleChangePassword(payload);

      case 'adminResetPassword':
        return handleAdminResetPassword(payload);

      case 'createUser':
        authenticate(payload.token, ['admin']);
        createUser(payload);
        return jsonResponse({ success: true });

      case 'deleteUser':
        authenticate(payload.token, ['admin']);
        deleteUser(payload.targetUsername);
        return jsonResponse({ success: true });

      case 'updateUser':
        authenticate(payload.token, ['admin']);
        updateUser(payload);
        return jsonResponse({ success: true });

      case 'updateMenuItem': {
        const user = authenticate(payload.token, ['manager']);
        logAction(user.username, 'UPDATE_MENU', `Item: ${payload.itemId}`);
        return jsonResponse(updateMenuItem(payload));
      }

      case 'batchUpdateMenuItems': {
        const user = authenticate(payload.token, ['manager']);
        logAction(user.username, 'BATCH_UPDATE_MENU', `Count: ${payload.updates.length}`);
        return jsonResponse(batchUpdateMenuItems(payload.updates));
      }

      default:
        return jsonResponse({
          success: false,
          message: 'Invalid action'
        });
    }
  } catch (err) {
    return jsonResponse({
      success: false,
      message: err.message
    });
  }
}

function routeStatusUpdate(payload) {
  const s = payload.nextStatus;
  
  // All these can now be handled by a single function
  const allowedStatuses = ['OPEN', 'PREPARING', 'PARTIALLY_READY', 'READY', 'SERVED', 'HANDED_OVER', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CLOSED', 'CANCELLED'];
  if (allowedStatuses.includes(s)) return updateOrderStatus(payload.orderId, s, payload.cascade);
  
  return jsonResponse({ success: false, message: 'Unknown status transition: ' + s });
}

function handleLogin({ username, password }) {
  const user = validateUser(username, password);
  if (user) {
    return jsonResponse({ success: true, user });
  }
  return jsonResponse({ success: false, message: 'Invalid credentials' });
}

function handleLogout({ token }) {
  logoutUser(token);
  return jsonResponse({ success: true });
}

function handleChangePassword(payload) {
  changeUserPassword(payload.token, payload.oldPassword, payload.newPassword);
  return jsonResponse({ success: true });
}

function handleAdminResetPassword(payload) {
  adminResetPassword(payload.token, payload.targetUsername, payload.newPassword);
  return jsonResponse({ success: true });
}

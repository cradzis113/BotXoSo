const TelegramBot = require('node-telegram-bot-api');

// Store bot instance and subscribers
let bot = null;
const subscribedUsers = new Set();

/**
 * Initialize the Telegram bot with the provided token
 * @param {string} token - Telegram Bot API token
 * @returns {boolean} - Success status
 */
const initialize = (token) => {
  if (!token) {
    console.error('Telegram Bot Token is required');
    return false;
  }

  try {
    // Create a bot instance
    bot = new TelegramBot(token, { polling: true });
    console.log('Telegram bot service initialized successfully');

    // Setup command handlers
    setupCommandHandlers();
    return true;
  } catch (error) {
    console.error('Failed to initialize Telegram bot:', error);
    return false;
  }
};

/**
 * Setup bot command handlers
 */
const setupCommandHandlers = () => {
  // Start command
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, 'Chào mừng đến với Bot XO SO! Bạn có thể sử dụng /subscribe để nhận thông báo kết quả.');
  });

  // Subscribe command
  bot.onText(/\/subscribe/, (msg) => {
    const chatId = msg.chat.id;
    subscribedUsers.add(chatId);
    bot.sendMessage(chatId, 'Bạn đã đăng ký nhận kết quả xổ số thành công!');
  });

  // Unsubscribe command
  bot.onText(/\/unsubscribe/, (msg) => {
    const chatId = msg.chat.id;
    subscribedUsers.delete(chatId);
    bot.sendMessage(chatId, 'Bạn đã hủy đăng ký nhận kết quả xổ số!');
  });
};

/**
 * Send message to all subscribed users
 * @param {string} message - Message to broadcast
 */
const broadcastMessage = (message) => {
  if (!bot) {
    console.error('Bot not initialized');
    return false;
  }

  for (const chatId of subscribedUsers) {
    bot.sendMessage(chatId, message);
  }
  return true;
};

/**
 * Send message to a specific chat
 * @param {number} chatId - Telegram chat ID
 * @param {string} message - Message to send
 */
const sendMessage = (chatId, message) => {
  if (!bot) {
    console.error('Bot not initialized');
    return false;
  }

  bot.sendMessage(chatId, message);
  return true;
};

/**
 * Get all subscribed user IDs
 * @returns {Array} - Array of chat IDs
 */
const getSubscribedUsers = () => {
  return Array.from(subscribedUsers);
};

module.exports = {
  initialize,
  broadcastMessage,
  sendMessage,
  getSubscribedUsers
};
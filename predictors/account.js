const fs = require('fs');
const path = require('path');
const { login, loginAsGuest, getMoney } = require('../betAutomatic');

// Thêm biến tĩnh ở ngoài hàm để theo dõi số lần đăng nhập thất bại
let loginFailCount = 0;
const MAX_LOGIN_ATTEMPTS = 3;

/**
 * Tạo cấu hình tài khoản mặc định
 */
function createDefaultAccountConfig() {
  return {
    username: "",
    password: "",
    betting: {
      enabled: false,
      demoMode: true,
      accountBalance: 0,
      baseBetAmount: 20000,
      currentBalance: 0,
      strategy: "martingale",
      maxMultiplier: 6,
      consecutiveLosses: 0,
      lastBetAmount: 0,
      disabledReason: null,
      disabledAt: null,
      stopLoss: -200000,       // Mặc định dừng lỗ -200k
      takeProfit: 300000,      // Mặc định chốt lời 300k
      resetAfterTP: true,      // Mặc định reset sau khi chốt lời
      resetAfterSL: true       // Mặc định reset sau khi dừng lỗ
    }
  };
}

/**
 * Đọc thông tin tài khoản từ file
 */
function readAccountInfo(accountFile, log = true) {
  let accountInfo;

  if (fs.existsSync(accountFile)) {
    try {
      accountInfo = JSON.parse(fs.readFileSync(accountFile, 'utf8'));
      if (log) console.log("📊 Đã đọc thông tin tài khoản");
    } catch (error) {
      if (log) console.error(`❌ Lỗi khi đọc file tài khoản: ${error.message}`);
      accountInfo = createDefaultAccountConfig();
    }
  } else {
    if (log) console.log("⚠️ Không tìm thấy file tài khoản, tạo file mới");
    accountInfo = createDefaultAccountConfig();

    // Lưu cấu hình mặc định vào file
    try {
      const dir = path.dirname(accountFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(accountFile, JSON.stringify(accountInfo, null, 2), 'utf8');
      if (log) console.log("✅ Đã tạo file tài khoản mặc định");
    } catch (error) {
      if (log) console.error(`❌ Lỗi khi tạo file tài khoản: ${error.message}`);
    }
  }

  return accountInfo;
}

/**
 * Lưu thông tin tài khoản vào file
 */
function saveAccountInfo(accountData, accountFile, log = true) {
  try {
    const dir = path.dirname(accountFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Ghi file với chế độ đồng bộ để đảm bảo file đã được ghi xong
    fs.writeFileSync(accountFile, JSON.stringify(accountData, null, 2), 'utf8');
    
    // Thêm log này để kiểm tra
    if (log) console.log(`💾 Đã ghi file account.json: consecutiveLosses = ${accountData.betting.consecutiveLosses}`);

    return true;
  } catch (error) {
    if (log) console.error(`❌ Lỗi khi lưu thông tin tài khoản: ${error.message}`);
    return false;
  }
}

/**
 * Kiểm tra xem tài khoản có đang ở chế độ chơi thử không
 */
function isDemoMode(accountInfo) {
  return accountInfo &&
    accountInfo.betting &&
    accountInfo.betting.demoMode === true;
}

/**
 * Kiểm tra có thể dùng chức năng đặt cược không
 */
function canUseBetting(accountInfo) {
  if (!accountInfo || !accountInfo.betting || !accountInfo.betting.enabled) {
    return false;
  }

  // Cho phép cược nếu ở chế độ demo hoặc có thông tin đăng nhập
  return isDemoMode(accountInfo) || (accountInfo.username && accountInfo.password);
}

/**
 * Kiểm tra và cập nhật các cài đặt tài khoản
 */
function validateAccountSettings(accountInfo, accountFile, log = true) {
  if (!accountInfo) return;

  let hasChanges = false;

  // Nếu không có thông tin betting, tạo mới
  if (!accountInfo.betting) {
    accountInfo.betting = createDefaultAccountConfig().betting;
    hasChanges = true;
  }

  // Kiểm tra và đặt các giá trị cơ bản
  if (accountInfo.betting.enabled === undefined) {
    accountInfo.betting.enabled = false;
    hasChanges = true;
  }

  if (accountInfo.betting.demoMode === undefined) {
    accountInfo.betting.demoMode = true;
    hasChanges = true;
  }

  if (accountInfo.betting.accountBalance === undefined) {
    accountInfo.betting.accountBalance = accountInfo.betting.demoMode ? 1000000 : 0;
    hasChanges = true;
  }

  if (accountInfo.betting.baseBetAmount === undefined) {
    accountInfo.betting.baseBetAmount = 20000;
    hasChanges = true;
  }

  if (accountInfo.betting.currentBalance === undefined) {
    accountInfo.betting.currentBalance = 0;
    hasChanges = true;
  }

  // Luôn đảm bảo strategy là martingale
  if (accountInfo.betting.strategy !== 'martingale') {
    accountInfo.betting.strategy = 'martingale';
    hasChanges = true;
  }

  // Kiểm tra và thêm maxMultiplier nếu chưa có
  if (accountInfo.betting.maxMultiplier === undefined) {
    accountInfo.betting.maxMultiplier = 6;
    hasChanges = true;
  }

  // Kiểm tra các field thống kê
  if (accountInfo.betting.consecutiveLosses === undefined) {
    accountInfo.betting.consecutiveLosses = 0;
    hasChanges = true;
  }

  if (accountInfo.betting.lastBetAmount === undefined) {
    accountInfo.betting.lastBetAmount = 0;
    hasChanges = true;
  }

  // Kiểm tra field theo dõi lý do tắt cược
  if (accountInfo.betting.disabledReason === undefined) {
    accountInfo.betting.disabledReason = null;
    hasChanges = true;
  }

  if (accountInfo.betting.disabledAt === undefined) {
    accountInfo.betting.disabledAt = null;
    hasChanges = true;
  }

  // Kiểm tra và thêm stopLoss và takeProfit nếu chưa có
  if (accountInfo.betting.stopLoss === undefined) {
    accountInfo.betting.stopLoss = -200000;
    hasChanges = true;
  }

  if (accountInfo.betting.takeProfit === undefined) {
    accountInfo.betting.takeProfit = 300000;
    hasChanges = true;
  }

  if (accountInfo.betting.resetAfterTP === undefined) {
    accountInfo.betting.resetAfterTP = true;
    hasChanges = true;
  }

  if (accountInfo.betting.resetAfterSL === undefined) {
    accountInfo.betting.resetAfterSL = true;
    hasChanges = true;
  }

  if (hasChanges) {
    if (log) console.log("💾 Cập nhật cấu hình tài khoản với các trường đã thêm/sửa");
    saveAccountInfo(accountInfo, accountFile, log);
  }
}

/**
 * Tính toán số tiền cược dựa trên chiến lược và thông tin tài khoản
 * @param {Object} accountInfo - Thông tin tài khoản
 * @param {boolean} log - Điều khiển hiển thị / ghi log
 * @returns {number} Số tiền cược
 */
function calculateBetAmount(accountInfo, log = true) {
    try {
        if (!accountInfo || !accountInfo.betting) {
            if (log) console.log("⚠️ Thông tin tài khoản không hợp lệ, không thể tính số tiền cược");
            return 0;
        }

        // Lấy thông tin từ tài khoản
        const { demoMode, currentBalance, accountBalance, baseBetAmount, strategy, maxMultiplier, consecutiveLosses } = accountInfo.betting;
        
        // Xác định số dư hiện tại
        const balance = (demoMode || currentBalance === 0) ? accountBalance : currentBalance;
        
        if (balance <= 0) {
            if (log) console.log(`⚠️ Số dư tài khoản (${balance}) không hợp lệ, không thể tính số tiền cược`);
            return 0;
        }
        
        // Sử dụng Kelly criterion nâng cao nếu có thể
        try {
            const bettingModule = require('./betting');
            if (typeof bettingModule.calculateOptimalBetAmount === 'function') {
                // Đọc các thông tin cần thiết để tính toán Kelly
                const dataDir = path.join(__dirname, '..', 'data');
                const historyLogFile = path.join(dataDir, 'prediction_log.txt');
                
                // Tính tỷ lệ thắng gần đây
                let winRate = 0.5;
                try {
                    const indexModule = require('./index');
                    if (typeof indexModule.calculateRecentAccuracy === 'function') {
                        const recentAccuracy = indexModule.calculateRecentAccuracy(historyLogFile, 20, false);
                        winRate = typeof recentAccuracy === 'object' ? 
                            (recentAccuracy.accuracy || recentAccuracy.correct / recentAccuracy.total) : 
                            recentAccuracy;
                    }
                } catch (e) {
                    console.log(`ℹ️ Không thể đọc tỷ lệ thắng gần đây: ${e.message}`);
                }
                
                // Đọc lịch sử đặt cược
                let history = [];
                let volatility = 0.5;
                try {
                    const bettingHistory = bettingModule.readBetHistory();
                    if (bettingHistory && Array.isArray(bettingHistory)) {
                        history = bettingHistory;
                        
                        // Tính toán biến động thị trường
                        const predictorModule = require('./predictor');
                        if (typeof predictorModule.calculateMarketVolatility === 'function') {
                            volatility = predictorModule.calculateMarketVolatility(history, 20);
                        }
                    }
                } catch (e) {
                    console.log(`ℹ️ Không thể đọc lịch sử đặt cược: ${e.message}`);
                }
                
                // Tùy chọn cho Kelly calculator
                const options = {
                    odds: 1.95,
                    riskTolerance: 0.25, // Thận trọng với 25% Kelly fraction
                    minBetAmount: baseBetAmount,
                    maxRiskPerBet: 0.05 // Tối đa 5% số dư cho mỗi lượt cược
                };
                
                // Sử dụng công thức Kelly nâng cao để tính số tiền cược
                const betAmount = bettingModule.calculateOptimalBetAmount(
                    balance, 
                    winRate,
                    0.75, // Độ tin cậy mặc định
                    volatility,
                    consecutiveLosses,
                    options,
                    log
                );
                
                if (log) console.log(`💰 Số tiền cược (Kelly): ${betAmount.toLocaleString('vi-VN')}đ`);
                return betAmount;
            }
        } catch (error) {
            if (log) console.log(`ℹ️ Không thể áp dụng Kelly criterion, sử dụng chiến lược martingale: ${error.message}`);
            // Tiếp tục với chiến lược mặc định
        }
        
        // FALLBACK: Sử dụng chiến lược Martingale nếu không áp dụng được Kelly
        // Chiến lược Martingale: thua thì nhân đôi số tiền cược
        let betAmount = baseBetAmount;
        
        // Áp dụng Martingale
        if (strategy === 'martingale' && consecutiveLosses > 0) {
            // Tính toán hệ số nhân
            const multiplier = Math.min(Math.pow(2, consecutiveLosses), maxMultiplier);
            betAmount = Math.round(baseBetAmount * multiplier);
            
            if (log) console.log(`🔢 Áp dụng martingale: Thua ${consecutiveLosses} lần liên tiếp, hệ số = ${multiplier}`);
        }
        
        // Đảm bảo số tiền cược không lớn hơn số dư hiện có
        if (betAmount > balance) {
            if (log) console.log(`⚠️ Số tiền cược (${betAmount.toLocaleString('vi-VN')}đ) lớn hơn số dư (${balance.toLocaleString('vi-VN')}đ), điều chỉnh`);
            betAmount = Math.min(betAmount, balance);
        }
        
        // Áp dụng giới hạn mức cược tối đa (5% số dư)
        const maxBetAmount = Math.round(balance * 0.05);
        if (betAmount > maxBetAmount) {
            if (log) console.log(`⚠️ Số tiền cược (${betAmount.toLocaleString('vi-VN')}đ) vượt quá 5% số dư, điều chỉnh xuống ${maxBetAmount.toLocaleString('vi-VN')}đ`);
            betAmount = maxBetAmount;
        }
        
        // Đảm bảo số tiền cược là bội số của 1000
        betAmount = Math.floor(betAmount / 1000) * 1000;
        
        // Đảm bảo số tiền cược không nhỏ hơn mức tối thiểu
        betAmount = Math.max(betAmount, 10000);
        
        if (log) console.log(`💰 Số tiền cược (Martingale): ${betAmount.toLocaleString('vi-VN')}đ`);
        return betAmount;

    } catch (error) {
        if (log) console.error(`❌ Lỗi khi tính toán số tiền cược: ${error.message}`);
        return 20000; // Trả về giá trị mặc định nếu có lỗi
    }
}

/**
 * Cập nhật kết quả đặt cược
 */
function updateBettingResult(accountFile, isWin, betAmount, log = true) {
  try {
    const accountInfo = readAccountInfo(accountFile, log);
    if (!accountInfo || !accountInfo.betting) return false;

    // Cập nhật số dư và thống kê
    if (isWin) {
      accountInfo.betting.currentBalance += betAmount;
      accountInfo.betting.consecutiveLosses = 0;
      accountInfo.betting.lastBetAmount = betAmount;
      
      // Thêm log để kiểm tra
      if (log) console.log(`✅ Đã RESET consecutiveLosses = 0 sau khi THẮNG`);
    } else {
      accountInfo.betting.currentBalance -= betAmount;
      
      // Tăng số lần thua liên tiếp
      accountInfo.betting.consecutiveLosses++;
      
      // Log trạng thái
      if (log) console.log(`📊 Cập nhật consecutiveLosses = ${accountInfo.betting.consecutiveLosses}`);
      
      // Lưu lại số tiền cược
      accountInfo.betting.lastBetAmount = betAmount;
    }

    // Đảm bảo luôn gọi saveAccountInfo để lưu lại thông tin
    saveAccountInfo(accountInfo, accountFile, log);

    if (log) console.log(`💰 Số dư hiện tại: ${accountInfo.betting.currentBalance.toLocaleString('vi-VN')}đ (${isWin ? '🟢 Thắng' : '🔴 Thua'} ${betAmount.toLocaleString('vi-VN')}đ)`);

    if (log) console.log(`ℹ️ Thống kê cược: Thua liên tiếp=${accountInfo.betting.consecutiveLosses}`);

    checkStopLossAndTakeProfit(accountInfo, accountFile, log);

    return true;
  } catch (error) {
    if (log) console.error(`❌ Lỗi khi cập nhật kết quả đặt cược: ${error.message}`);
    return false;
  }
}

/**
 * Tắt chế độ đặt cược tự động
 */
function disableBetting(accountInfo, accountFile, reason, log = true) {
  if (!accountInfo || !accountInfo.betting) return false;

  if (accountInfo.betting.enabled) {
    accountInfo.betting.enabled = false;
    accountInfo.betting.disabledReason = reason;
    accountInfo.betting.disabledAt = new Date().toISOString();

    saveAccountInfo(accountInfo, accountFile, log);
    return true;
  } else {
    // Betting đã bị tắt trước đó
    if (log) console.log(`ℹ️ Đặt cược tự động đã bị tắt trước đó với lý do: ${accountInfo.betting.disabledReason || "Không rõ"}`);
    return false;
  }
}

/**
 * Kiểm tra tính hợp lệ của thông tin tài khoản và cấu hình đặt cược
 * @returns {Object} Trạng thái tài khoản gồm {canBet, loginMode, reason}
 */
function validateBettingCredentials(accountInfo, accountFile, log = true) {
  if (!accountInfo || !accountInfo.betting) {
    return {
      canBet: false,
      loginMode: null,
      reason: "Không có thông tin tài khoản"
    };
  }

  let hasChanges = false;
  let loginMode = null;
  let canBet = accountInfo.betting.enabled;
  let reason = "";

  // Xác định chế độ đăng nhập
  if (isDemoMode(accountInfo)) {
    loginMode = "demo";
    if (log) console.log("🎮 Chế độ chơi thử đang được kích hoạt");
  } else if (accountInfo.username && accountInfo.password) {
    loginMode = "real";
    if (log) console.log("👤 Phát hiện thông tin đăng nhập thực");
  }

  // Trường hợp 1: Bật chế độ cược tự động nhưng không có thông tin đăng nhập và không ở chế độ demo
  if (accountInfo.betting.enabled && loginMode === null) {
    // Đã kiểm tra đúng accountInfo.betting.enabled
    if (log) console.log("⚠️ Đã bật chế độ cược tự động nhưng không có phương thức đăng nhập. Tắt chế độ cược tự động.");

    // Sử dụng disableBetting thay vì gán trực tiếp
    disableBetting(accountInfo, accountFile, "Thiếu thông tin đăng nhập", log);

    canBet = false;
    reason = "Thiếu thông tin đăng nhập";
  }

  // Trường hợp 2: Ưu tiên demo mode nếu cả hai đều được cấu hình
  if (accountInfo.betting.enabled && loginMode === "demo" && accountInfo.username && accountInfo.password) {
    if (log) console.log("ℹ️ Có cả thông tin đăng nhập và chế độ demo. Ưu tiên sử dụng chế độ demo.");
    loginMode = "demo"; // Vẫn giữ demo mode
  }

  if (hasChanges && accountFile) {
    saveAccountInfo(accountInfo, accountFile, log);
  }

  return {
    canBet,
    loginMode,
    reason
  };
}

/**
 * Kiểm tra và đăng nhập tự động (hỗ trợ cả chế độ thật và demo)
 */
async function autoLogin(page, accountInfo, accountFile, log = true) {
  if (!page || !accountInfo) {
    if (log) console.log("⚠️ Không thể đăng nhập: Thiếu thông tin tài khoản hoặc trang web");
    return false;
  }

  // Kiểm tra tính hợp lệ của cấu hình và lấy trạng thái đăng nhập
  const { canBet, loginMode, reason } = validateBettingCredentials(accountInfo, accountFile, log);

  // Nếu không thể đặt cược, dừng ngay
  if (!canBet) {
    if (log) console.log(`⚠️ Không thể tiếp tục đặt cược: ${reason}`);
    return false;
  }

  // Kiểm tra xem đã đăng nhập chưa
  const isAlreadyLoggedIn = await getMoney(page);

  if (isAlreadyLoggedIn) {
    // Đã đăng nhập thành công VÀ lấy được balance, reset số lần thất bại
    loginFailCount = 0;

    // Cập nhật số dư tài khoản
    accountInfo.betting.accountBalance = isAlreadyLoggedIn;
    saveAccountInfo(accountInfo, accountFile, log);

    if (log) console.log("✅ Đã đăng nhập trước đó");
    if (log) console.log(`💰 Số dư tài khoản (${loginMode === "demo" ? "DEMO" : "THẬT"}): ${accountInfo.betting.accountBalance.toLocaleString('vi-VN')}đ`);

    return true;
  }

  // Tiến hành đăng nhập dựa vào chế độ đã xác định
  let loginSuccess = false;

  if (loginMode === "demo") {
    loginSuccess = await loginAsGuest(page);
  } else if (loginMode === "real") {
    loginSuccess = await login(page, accountInfo.username, accountInfo.password);
  } else {
    if (log) console.log("⚠️ Không xác định được chế độ đăng nhập");
    return false;
  }

  if (loginSuccess) {
    try {
      const balance = await getMoney(page);

      if (balance) {
        loginFailCount = 0;

        accountInfo.betting.accountBalance = balance;
        saveAccountInfo(accountInfo, accountFile, log);

        if (log) console.log(`💰 Số dư tài khoản (${loginMode === "demo" ? "DEMO" : "THẬT"}): ${accountInfo.betting.accountBalance.toLocaleString('vi-VN')}đ`);
        return true;
      } else {
        // Đăng nhập thành công nhưng không lấy được balance, vẫn tính là thất bại
        loginFailCount++;
        if (log) console.error(`⚠️ Đăng nhập thành công nhưng không lấy được số dư tài khoản - Lần thất bại ${loginFailCount}/${MAX_LOGIN_ATTEMPTS}`);
      }
    } catch (error) {
      // Lỗi khi lấy balance, tính là thất bại
      loginFailCount++;
      if (log) console.error(`⚠️ Lỗi khi lấy số dư tài khoản: ${error.message} - Lần thất bại ${loginFailCount}/${MAX_LOGIN_ATTEMPTS}`);
    }
  } else {
    // Đăng nhập thất bại, tăng số lần thất bại
    loginFailCount++;
    if (log) console.log(`⚠️ Đăng nhập thất bại - Lần thất bại ${loginFailCount}/${MAX_LOGIN_ATTEMPTS}`);
  }

  // Kiểm tra số lần thất bại để quyết định có tắt cược hay không
  if (loginMode === "real" && loginFailCount >= MAX_LOGIN_ATTEMPTS && accountInfo.betting.enabled) {
    // Chỉ disable khi đủ số lần thất bại và đang enabled
    if (log) console.log(`⚠️ Đăng nhập tài khoản thật thất bại ${MAX_LOGIN_ATTEMPTS} lần liên tiếp. Tắt chế độ đặt cược tự động.`);
    disableBetting(accountInfo, accountFile, `Đăng nhập thất bại: Không thể đăng nhập với tài khoản thật sau ${MAX_LOGIN_ATTEMPTS} lần thử`, log);
    loginFailCount = 0; // Reset sau khi đã disable betting
  }

  return false;
}

/**
 * Kiểm tra và reset số dư nếu phát hiện khoảng cách giữa các kỳ cược
 * @param {Object} accountInfo - Thông tin tài khoản
 * @param {String} accountFile - Đường dẫn đến file account.json
 * @param {Boolean} log - Điều khiển hiển thị log
 * @param {Number} maxDistance - Khoảng cách tối đa (số kỳ) trước khi reset (mặc định: 1)
 * @returns {Boolean} - Trả về true nếu đã reset, false nếu không
 */
function checkAndResetBalance(accountInfo, accountFile, log = true, maxDistance = 1) {
  // Kiểm tra accountInfo tồn tại
  if (!accountInfo || !accountInfo.betting) return false;

  try {
    const dataDir = path.join(__dirname, '..', 'data');
    const predictionFile = path.join(dataDir, 'predictions.json');
    const bettingLogFile = path.join(dataDir, 'betting.txt');

    // Kiểm tra các file tồn tại
    if (!fs.existsSync(predictionFile) || !fs.existsSync(bettingLogFile)) {
      if (log) console.log("⚠️ Không tìm thấy file dự đoán hoặc betting.txt, giữ nguyên các thông số");
      return false;
    }

    // Đọc kỳ dự đoán hiện tại
    const prediction = JSON.parse(fs.readFileSync(predictionFile, 'utf8'));
    const currentDrawId = prediction.drawId;

    // Đọc kỳ đặt cược gần nhất
    const bettingContent = fs.readFileSync(bettingLogFile, 'utf8');
    const lines = bettingContent.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      if (log) console.log("⚠️ File betting.txt không có dữ liệu, giữ nguyên các thông số");
      return false;
    }

    // Lấy kỳ đặt cược gần nhất (dòng đầu tiên)
    const lastBetMatch = lines[0].match(/DrawID: (\d+)/);
    if (!lastBetMatch) {
      if (log) console.log("⚠️ Không tìm thấy thông tin DrawID trong betting.txt, giữ nguyên các thông số");
      return false;
    }

    const lastBetDrawId = lastBetMatch[1];

    // Phân tích và so sánh
    if (log) console.log(`📊 Kỳ hiện tại: ${currentDrawId}, Kỳ cược gần nhất: ${lastBetDrawId}`);

    // Chuyển đổi drawId thành số để so sánh khoảng cách
    const currentNumber = parseInt(currentDrawId.replace(/\D/g, ''));
    const lastNumber = parseInt(lastBetDrawId.replace(/\D/g, ''));
    
    // Tính khoảng cách giữa hai kỳ
    const distance = Math.abs(currentNumber - lastNumber);
    
    if (log) console.log(`📊 Khoảng cách kỳ: ${distance} kỳ (giới hạn: ${maxDistance} kỳ)`);

    // Reset nếu khoảng cách kỳ vượt quá maxDistance
    if (distance > maxDistance) {
      // Hiển thị thông tin trước khi reset
      if (log) console.log(`💰 Số dư trước khi reset: ${accountInfo.betting.currentBalance.toLocaleString('vi-VN')}đ`);
      if (log) console.log(`📊 Số lần thua liên tiếp trước khi reset: ${accountInfo.betting.consecutiveLosses}`);
      
      // Reset tất cả các thông số Martingale
      accountInfo.betting.enabled = false;
      accountInfo.betting.currentBalance = 0;
      accountInfo.betting.consecutiveLosses = 0;
      accountInfo.betting.disabledAt = new Date().toISOString();
      accountInfo.betting.lastBetAmount = accountInfo.betting.baseBetAmount || 20000;
      accountInfo.betting.disabledReason = `Đã đạt khoảng cách ${distance} kỳ > ${maxDistance} kỳ`;
      
      saveAccountInfo(accountInfo, accountFile, log);
      
      if (log) console.log(`✅ Đã reset lại tất cả thông số do phát hiện khoảng cách ${distance} kỳ > ${maxDistance} kỳ`);
      
      return true;
    } else {
      if (log) console.log(`✅ Giữ nguyên các thông số - Khoảng cách ${distance} kỳ <= ${maxDistance} kỳ`);
      return false;
    }
  } catch (error) {
    if (log) console.error(`❌ Lỗi khi kiểm tra và reset thông số: ${error.message}`);
    return false;
  }
}

/**
 * Hiển thị thông tin về cấu hình chiến lược cược
 */
function displayStrategyInfo(accountInfo, log = true) {
  if (!accountInfo || !accountInfo.betting) return;

  const betting = accountInfo.betting;
  const maxMultiplier = betting.maxMultiplier || 6;

  if (log) console.log("===== THÔNG TIN CHIẾN LƯỢC CƯỢC =====");
  if (log) console.log(`Chiến lược: Martingale`);
  if (log) console.log(`Mức cược cơ bản: ${betting.baseBetAmount.toLocaleString('vi-VN')}đ`);
  if (log) console.log(`Hệ số nhân tối đa: ${maxMultiplier}x (tối đa ${(betting.baseBetAmount * Math.pow(2, maxMultiplier)).toLocaleString('vi-VN')}đ)`);
  if (log) console.log(`Số lần thua liên tiếp hiện tại: ${betting.consecutiveLosses}`);
  if (log) console.log("======================================");
}

/**
 * Kiểm tra và xử lý stop loss hoặc take profit
 * @param {Object} accountInfo - Thông tin tài khoản
 * @param {String} accountFile - Đường dẫn đến file account.json
 * @returns {Boolean} - Trả về true nếu đã kích hoạt stop loss hoặc take profit
 */
function checkStopLossAndTakeProfit(accountInfo, accountFile, log = true) {
  if (!accountInfo || !accountInfo.betting || !accountInfo.betting.enabled) return false;

  // Chỉ kiểm tra khi đã enable
  const currentBalance = accountInfo.betting.currentBalance;
  const stopLoss = accountInfo.betting.stopLoss || -200000;
  const takeProfit = accountInfo.betting.takeProfit || 300000;
  const resetAfterTP = accountInfo.betting.resetAfterTP !== false;
  const resetAfterSL = accountInfo.betting.resetAfterSL !== false;

  // Kiểm tra StopLoss
  if (currentBalance <= stopLoss) {
    if (log) console.log(`🛑 STOP LOSS: Số dư hiện tại (${currentBalance.toLocaleString('vi-VN')}đ) đã đạt mức dừng lỗ (${stopLoss.toLocaleString('vi-VN')}đ)`);
    disableBetting(accountInfo, accountFile, `Đã đạt Stop Loss: ${currentBalance.toLocaleString('vi-VN')}đ`, log);
    
    if (resetAfterSL) {
      if (log) console.log(`🔄 Reset số dư sau khi Stop Loss`);
      accountInfo.betting.currentBalance = 0;
      accountInfo.betting.consecutiveLosses = 0;
      saveAccountInfo(accountInfo, accountFile, log);
    }
    
    return true;
  }

  // Kiểm tra TakeProfit
  if (currentBalance >= takeProfit) {
    if (log) console.log(`💰 TAKE PROFIT: Số dư hiện tại (${currentBalance.toLocaleString('vi-VN')}đ) đã đạt mức chốt lời (${takeProfit.toLocaleString('vi-VN')}đ)`);
    
    // QUAN TRỌNG: Phải gọi disableBetting TRƯỚC khi reset số dư
    disableBetting(accountInfo, accountFile, `Đã đạt Take Profit: ${currentBalance.toLocaleString('vi-VN')}đ`, log);

    // Reset số dư nếu cấu hình cho phép
    if (resetAfterTP) {
      if (log) console.log(`🔄 Reset số dư sau khi Take Profit`);
      accountInfo.betting.currentBalance = 0;
      accountInfo.betting.consecutiveLosses = 0;
      saveAccountInfo(accountInfo, accountFile, log);
    }

    return true;
  }

  return false;
}

module.exports = {
  readAccountInfo,
  saveAccountInfo,
  canUseBetting,
  validateAccountSettings,
  updateBettingResult,
  calculateBetAmount,
  disableBetting,
  autoLogin,
  displayStrategyInfo,
  isDemoMode,
  checkAndResetBalance,
  checkStopLossAndTakeProfit,
};
const { createPrediction, verifyPrediction } = require('./predictionManager');
const { readPrediction } = require('./fileUtils');

/**
 * Xác định chiến lược dự đoán tốt nhất dựa trên khung giờ hiện tại
 * @returns {String} Chiến lược nên sử dụng
 */
function getCurrentStrategy() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // Ghi log thời gian hiện tại để debug
  console.log(`⏰ Thời gian hiện tại: ${hour}:${minute}`);
  
  // Khung giờ 11:00-14:00: Dùng chiến lược combined hoặc default vì cần nhiều dữ liệu hơn
  if (hour >= 11 && hour < 14) {
    console.log(`🕐 Khung giờ trưa (${hour}h): Chuyển sang chiến lược 'combined'`);
    return 'combined';
  }
  
  // Khung giờ sáng sớm 6:00-9:00: Dùng chiến lược short (5 kết quả)
  if (hour >= 6 && hour < 9) {
    console.log(`🌅 Khung giờ sáng sớm (${hour}h): Sử dụng chiến lược 'short'`);
    return 'short';
  }
  
  // Khung giờ buổi tối 20:00-23:00: Dùng chiến lược default (10 kết quả)
  if (hour >= 20 && hour < 23) {
    console.log(`🌙 Khung giờ tối (${hour}h): Sử dụng chiến lược 'default'`);
    return 'default';
  }
  
  // Các khung giờ khác: Dùng veryshort (3 kết quả) vì thường ổn định hơn
  console.log(`⌚ Khung giờ thường (${hour}h): Sử dụng chiến lược 'veryshort'`);
  return 'veryshort';
}

/**
 * Hàm dự đoán chính - được gọi từ bên ngoài
 * Tự động xác nhận kết quả dự đoán trước đó và tạo dự đoán mới
 * @param {Array} history - Lịch sử kết quả xổ số
 * @param {Number} position - Vị trí cần dự đoán (index trong mảng number)
 * @param {String} strategy - Chiến lược dự đoán ('default', 'short', 'veryshort', 'combined', 'auto')
 * @returns {Promise<Object>} Kết quả dự đoán mới
 */
async function predict(history, position = 0, strategy = null) {
  // Xử lý đặc biệt khi chiến lược là 'auto' hoặc null
  let actualStrategy = strategy;
  if (strategy === 'auto' || !strategy) {
    actualStrategy = getCurrentStrategy();
    console.log(`🔄 Chiến lược '${strategy || "null"}' đã được chuyển thành '${actualStrategy}' dựa trên khung giờ`);
  }
  
  console.log(`📊 Bắt đầu quá trình dự đoán cho vị trí ${position} với chiến lược ${actualStrategy}...`);
  
  if (!history || !Array.isArray(history) || history.length === 0) {
    console.error('❌ Không đủ dữ liệu lịch sử để dự đoán');
    return null;
  }
  
  // Tự động xác nhận kết quả dự đoán trước đó với kết quả mới nhất
  try {
    const currentPrediction = await readPrediction();
    const latestResult = history[0];
    
    if (currentPrediction && latestResult) {
      // Kiểm tra nếu đây là kết quả cho kỳ dự đoán trước
      if (currentPrediction.drawId === latestResult.drawId) {
        console.log(`🔍 Đang xác nhận dự đoán cho kỳ ${latestResult.drawId}...`);
        await verifyPrediction(latestResult);
        console.log(`✅ Đã xác nhận kết quả dự đoán kỳ ${latestResult.drawId}`);
      }
    }
  } catch (error) {
    console.error('❗ Lỗi khi xác nhận dự đoán trước đó:', error.message);
    // Tiếp tục thực hiện dự đoán mới ngay cả khi xác nhận thất bại
  }
  
  // Tạo dự đoán mới với chiến lược đã chọn
  console.log(`🎯 Tạo dự đoán mới với chiến lược '${actualStrategy}'...`);
  const prediction = await createPrediction(history, position, actualStrategy);
  
  if (!prediction) {
    console.error('❌ Không thể tạo dự đoán mới');
    return null;
  }
  
  // Lưu lại thông tin về chiến lược ban đầu và chiến lược thực tế đã sử dụng
  if (prediction.detail) {
    prediction.detail.usedStrategy = strategy;
    if (strategy === 'auto') {
      prediction.detail.autoSelectedStrategy = actualStrategy;
    }
  }
  
  console.log(`✅ Đã tạo dự đoán cho kỳ xổ ${prediction.drawId}:`);
  console.log(`   - Số dự đoán: ${prediction.detail.prediction}`);
  console.log(`   - Phương pháp: ${prediction.detail.strategy}`);
  console.log(`   - Lý do: ${prediction.detail.reason}`);
  
  return prediction;
}

/**
 * [Hàm phụ] Xác nhận kết quả dự đoán với kết quả thực tế mới nhất
 * (Đã được tích hợp vào hàm predict, không cần gọi riêng)
 * @param {Object} actualResult - Kết quả thực tế
 * @returns {Promise<boolean>} Kết quả xác nhận
 */
async function verify(actualResult) {
  return await verifyPrediction(actualResult);
}

/**
 * Lấy dự đoán hiện tại
 * @returns {Promise<Object>} Dự đoán hiện tại
 */
async function getCurrentPrediction() {
  return await readPrediction();
}

/**
 * Danh sách các chiến lược dự đoán có sẵn
 * @returns {Object} Thông tin về các chiến lược dự đoán
 */
function getAvailableStrategies() {
  return {
    default: {
      name: "SimpleFollowTrend",
      description: "Phân tích xu hướng dựa trên 10 kết quả gần nhất"
    },
    short: {
      name: "SimpleFollowTrendShort",
      description: "Phân tích xu hướng dựa trên 5 kết quả gần nhất"
    },
    veryshort: {
      name: "SimpleFollowTrendVeryShort",
      description: "Phân tích xu hướng dựa trên 3 kết quả gần nhất"
    },
    combined: {
      name: "SimpleFollowTrendCombined",
      description: "Kết hợp phân tích xu hướng ngắn hạn (5 kết quả) và dài hạn (10 kết quả)"
    },
    auto: {
      name: "Auto Strategy",
      description: "Tự động chọn chiến lược tối ưu dựa trên khung giờ"
    }
  };
}

module.exports = {
  predict,
  verify,
  getCurrentPrediction,
  getAvailableStrategies,
  getCurrentStrategy
}; 
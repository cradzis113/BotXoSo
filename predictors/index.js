const { createPrediction, verifyPrediction } = require('./predictionManager');
const { readPrediction } = require('./fileUtils');
const { getAvailableStrategies } = require('./strategies');

/**
 * Dự đoán kết quả cho kỳ xổ tiếp theo sử dụng một chiến lược
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @param {String} strategy - Chiến lược dự đoán (null để tự động chọn theo thời gian)
 * @returns {Promise<Object>} Kết quả dự đoán
 */
async function predict(history, position = 0, strategy = null) {
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

    return await createPrediction(history, position, strategy);
  } catch (error) {
    console.error('Lỗi khi tạo dự đoán:', error.message);
    return null;
  }
}

/**
 * Dự đoán kết quả sử dụng nhiều chiến lược cùng lúc
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @param {Array<String>} strategies - Mảng các chiến lược dự đoán
 * @returns {Promise<Array<Object>>} Mảng kết quả dự đoán
 */
async function predictMultiple(history, position = 0, strategies = []) {
  try {
    const currentPrediction = await readPrediction();
    const latestResult = history[0];

    if (currentPrediction && latestResult) {
      if (currentPrediction.drawId === latestResult.drawId) {
        console.log(`🔍 Đang xác nhận dự đoán cho kỳ ${latestResult.drawId}...`);
        await verifyPrediction(latestResult);
        console.log(`✅ Đã xác nhận kết quả dự đoán kỳ ${latestResult.drawId}`);
      }
    }

    // Nếu không có strategies được chỉ định, sử dụng tất cả các strategies có sẵn
    if (!strategies || strategies.length === 0) {
      const availableStrategies = Object.keys(getAvailableStrategies());
      strategies = availableStrategies;
    }

    console.log(`🎯 Đang tạo dự đoán với ${strategies.length} chiến lược...`);
    
    // Tạo dự đoán cho từng chiến lược
    const predictions = await Promise.all(
      strategies.map(strategy => createPrediction(history, position, strategy))
    );

    // Lọc bỏ các dự đoán null
    return predictions.filter(p => p !== null);
  } catch (error) {
    console.error('Lỗi khi tạo nhiều dự đoán:', error.message);
    return [];
  }
}

/**
 * Xác nhận kết quả dự đoán với kết quả thực tế
 * @param {Object} actualResult - Kết quả thực tế từ kỳ xổ mới nhất
 * @returns {Promise<boolean>} Kết quả xác nhận (thành công/thất bại)
 */
async function verify(actualResult) {
  return await verifyPrediction(actualResult);
}

module.exports = {
  predict,
  predictMultiple,
  verify,
  readPrediction,
  getAvailableStrategies
}; 
const { createPrediction, verifyPrediction } = require('./predictionManager');
const { readPrediction } = require('./fileUtils');
const { getAvailableStrategies } = require('./strategies');

/**
 * Dự đoán kết quả cho kỳ xổ tiếp theo
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
 * Xác nhận kết quả dự đoán với kết quả thực tế
 * @param {Object} actualResult - Kết quả thực tế từ kỳ xổ mới nhất
 * @returns {Promise<boolean>} Kết quả xác nhận (thành công/thất bại)
 */
async function verify(actualResult) {
  return await verifyPrediction(actualResult);
}

module.exports = {
  predict,
  verify,
  readPrediction,
  getAvailableStrategies
}; 
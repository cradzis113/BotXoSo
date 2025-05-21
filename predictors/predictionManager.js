const { 
  simpleFollowTrend, 
  simpleFollowTrendShort, 
  simpleFollowTrendVeryShort, 
  simpleFollowTrendCombined 
} = require('./algorithms');
const { readPrediction, savePrediction, logPredictionResult } = require('./fileUtils');
const { generateNextDrawId } = require('./utils');

/**
 * Tạo dự đoán mới cho kỳ xổ tiếp theo
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @param {String} strategy - Chiến lược dự đoán (mặc định: 'default')
 * @returns {Promise<Object>} Kết quả dự đoán
 */
async function createPrediction(history, position, strategy = 'default') {
  try {
    if (!history || !Array.isArray(history) || history.length === 0) {
      console.error('Không đủ dữ liệu lịch sử để dự đoán');
      return null;
    }

    // Lấy kỳ xổ mới nhất
    const latestDraw = history[0];
    
    // Tạo ID cho kỳ xổ tiếp theo
    const nextDrawId = generateNextDrawId(latestDraw.drawId);
    
    // Chọn thuật toán dự đoán dựa trên strategy
    let predictionDetail;
    switch (strategy) {
      case 'short':
        predictionDetail = simpleFollowTrendShort(history, position);
        break;
      case 'veryshort':
        predictionDetail = simpleFollowTrendVeryShort(history, position);
        break;
      case 'combined':
        predictionDetail = simpleFollowTrendCombined(history, position);
        break;
      case 'default':
      default:
        predictionDetail = simpleFollowTrend(history, position);
        break;
    }
    
    // Tạo mảng numbers với dự đoán ở vị trí chỉ định, các vị trí khác để '?'
    const numbers = Array(5).fill('?');
    numbers[position] = predictionDetail.prediction.toString(); // Thêm dự đoán vào vị trí chỉ định
    
    // Tạo object dự đoán đầy đủ
    const prediction = {
      drawId: nextDrawId,
      numbers: numbers, // Thay thế mảng numbers với dữ liệu dự đoán ở vị trí position
      detail: {
        index: position,
        prediction: predictionDetail.prediction,
        reason: predictionDetail.reason,
        strategy: predictionDetail.strategy,
        usedStrategy: strategy // Lưu lại chiến lược được sử dụng
      },
      timestamp: new Date().toISOString()
    };
    
    // Lưu dự đoán vào file
    await savePrediction(prediction);
    
    return prediction;
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
async function verifyPrediction(actualResult) {
  try {
    if (!actualResult || !actualResult.drawId) {
      console.error('Không đủ dữ liệu kết quả để xác nhận');
      return false;
    }
    
    // Đọc dự đoán đã lưu
    const prediction = await readPrediction();
    if (!prediction) {
      console.error('Không tìm thấy dữ liệu dự đoán');
      return false;
    }
    
    // Kiểm tra xem kết quả có phải cho kỳ xổ dự đoán không
    if (prediction.drawId !== actualResult.drawId) {
      console.log(`Kỳ xổ không khớp: Dự đoán cho ${prediction.drawId}, nhưng nhận được kết quả của ${actualResult.drawId}`);
      return false;
    }
    
    // Ghi log kết quả
    await logPredictionResult(prediction, actualResult);
    
    return true;
  } catch (error) {
    console.error('Lỗi khi xác nhận dự đoán:', error.message);
    return false;
  }
}

module.exports = {
  createPrediction,
  verifyPrediction
}; 
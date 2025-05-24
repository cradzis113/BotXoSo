const { simpleFollowTrend, simpleFollowTrendShort, simpleFollowTrendVeryShort, simpleFollowTrendCombined, weightedFollowTrendShort, waveTrend, weightedFollowTrendCombined, nightFollowTrend, patternRecognition, frequencyPatternAnalysis, adaptiveTimeStrategy, limitedCombinedPredictor } = require('./algorithms');
const { readPrediction, savePrediction, logPredictionResult } = require('./fileUtils');
const { generateNextDrawId } = require('./utils');
const { getCurrentStrategy } = require('./strategies');

/**
 * Tạo dự đoán mới cho kỳ xổ tiếp theo
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @param {String} strategy - Chiến lược dự đoán (mặc định: null - sẽ chọn theo thời gian)
 * @returns {Promise<Object>} Kết quả dự đoán
 */
async function createPrediction(history, position, strategy = null) {
  try {
    if (!history || !Array.isArray(history) || history.length === 0) {
      console.error('Không đủ dữ liệu lịch sử để dự đoán');
      return null;
    }

    // Lấy kỳ xổ mới nhất
    const latestDraw = history[0];

    // Tạo ID cho kỳ xổ tiếp theo
    const nextDrawId = generateNextDrawId(latestDraw.drawId);

    // Nếu không có strategy được chỉ định hoặc là 'auto', sử dụng strategy theo thời gian
    const selectedStrategy = (strategy === 'auto' || !strategy) ? getCurrentStrategy() : strategy;

    // Chọn thuật toán dự đoán dựa trên strategy
    let predictionDetail;

    try {
      // Tạo map từ tên chiến lược đến hàm thuật toán tương ứng
      const strategyMap = {
        'default': simpleFollowTrend,
        'short': simpleFollowTrendShort,
        'veryshort': simpleFollowTrendVeryShort,
        'combined': simpleFollowTrendCombined,
        'weightedShort': weightedFollowTrendShort,
        'waveTrend': waveTrend,
        'weightedCombined': weightedFollowTrendCombined,
        'nightTrend': nightFollowTrend,
        'patternRecognition': patternRecognition,
        'frequencyPattern': frequencyPatternAnalysis,
        'adaptiveTime': adaptiveTimeStrategy,
        'limited': limitedCombinedPredictor
      };
      
      // Lấy hàm thuật toán từ map, hoặc dùng thuật toán mặc định nếu không tìm thấy
      const algorithmFunction = strategyMap[selectedStrategy] || simpleFollowTrend;
      
      // Ghi log thuật toán đang sử dụng và thời gian
      const now = new Date();
      console.log(`[${now.toLocaleTimeString()}] Đang sử dụng thuật toán: ${selectedStrategy}`);
      
      // Thực thi thuật toán
      predictionDetail = algorithmFunction(history, position);

      // Kiểm tra xem thuật toán có trả về kết quả hợp lệ không
      if (!predictionDetail) {
        console.error(`Thuật toán '${selectedStrategy}' không trả về kết quả hợp lệ`);
        // Dùng thuật toán mặc định nếu không nhận được kết quả
        predictionDetail = simpleFollowTrend(history, position);
        console.log(`Đã sử dụng thuật toán dự phòng 'default'`);
      }
    } catch (error) {
      console.error(`Lỗi khi sử dụng thuật toán '${selectedStrategy}':`, error.message);
      // Dùng thuật toán đơn giản nhất nếu có lỗi
      try {
        predictionDetail = simpleFollowTrendVeryShort(history, position);
        console.log(`Đã sử dụng thuật toán dự phòng 'veryshort'`);
      } catch (backupError) {
        console.error('Không thể sử dụng thuật toán dự phòng:', backupError.message);

        // Tạo một dự đoán ngẫu nhiên nếu mọi thứ đều thất bại
        const randomPrediction = Math.floor(Math.random() * 10);
        predictionDetail = {
          prediction: randomPrediction,
          reason: `Không thể sử dụng thuật toán, dự đoán ngẫu nhiên (${randomPrediction >= 5 ? "Tài" : "Xỉu"})`,
          strategy: "Random"
        };
        console.log('Đã tạo dự đoán ngẫu nhiên');
      }
    }

    // Tạo mảng numbers với dự đoán ở vị trí chỉ định, các vị trí khác để '?'
    const numbers = Array(5).fill('?');
    numbers[position] = predictionDetail.prediction.toString();

    // Tạo object dự đoán đầy đủ
    const prediction = {
      drawId: nextDrawId,
      numbers: numbers,
      detail: {
        index: position,
        prediction: predictionDetail.prediction,
        reason: predictionDetail.reason,
        strategy: predictionDetail.strategy,
        usedStrategy: selectedStrategy,
        timeBasedStrategy: strategy === null || strategy === 'auto' // Đánh dấu nếu đang sử dụng chiến lược theo thời gian
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
  verifyPrediction,
}; 
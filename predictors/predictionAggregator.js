/**
 * Tính điểm tin cậy cho mỗi chiến lược dựa trên lịch sử dự đoán
 * @param {Object} strategy - Thông tin về chiến lược
 * @param {Array} history - Lịch sử dự đoán của chiến lược
 * @returns {number} Điểm tin cậy (0-1)
 */
function calculateStrategyConfidence(strategy, history = []) {
  try {
    // Đảm bảo history là mảng
    if (!Array.isArray(history)) {
      history = [];
    }

    // Tính điểm dựa trên độ chính xác gần đây
    const recentAccuracy = history.length > 0 ? 
      history.slice(0, 10).reduce((acc, record) => {
        return acc + (record.isCorrect ? 1 : 0);
      }, 0) / Math.min(history.length, 10) : 0.5;

    // Tính điểm dựa trên độ ổn định của chiến lược
    const stabilityScore = calculateStabilityScore(history);

    // Tính điểm dựa trên thời gian trong ngày
    const timeScore = calculateTimeBasedScore(strategy);

    // Kết hợp các điểm số với trọng số khác nhau
    const confidence = (recentAccuracy * 0.5) + (stabilityScore * 0.3) + (timeScore * 0.2);
    
    // Đảm bảo kết quả nằm trong khoảng 0-1
    return Math.max(0, Math.min(1, confidence));
  } catch (error) {
    console.error('Lỗi khi tính điểm tin cậy:', error);
    return 0.5; // Giá trị mặc định khi có lỗi
  }
}

/**
 * Tính điểm ổn định của chiến lược
 * @param {Array} history - Lịch sử dự đoán
 * @returns {number} Điểm ổn định (0-1)
 */
function calculateStabilityScore(history = []) {
  try {
    if (!Array.isArray(history) || history.length < 2) {
      return 0.5;
    }

    // Tính độ biến thiên của các dự đoán
    let variations = 0;
    let validComparisons = 0;

    for (let i = 1; i < history.length; i++) {
      const current = history[i]?.prediction;
      const previous = history[i-1]?.prediction;
      
      if (typeof current === 'number' && typeof previous === 'number' &&
          current >= 0 && current <= 9 && previous >= 0 && previous <= 9) {
        variations += Math.abs(current - previous);
        validComparisons++;
      }
    }
    
    if (validComparisons === 0) return 0.5;
    
    // Điểm càng cao khi độ biến thiên càng thấp
    const avgVariation = variations / validComparisons;
    return Math.max(0, Math.min(1, 1 - (avgVariation / 9))); // Chuẩn hóa về 0-1
  } catch (error) {
    console.error('Lỗi khi tính điểm ổn định:', error);
    return 0.5;
  }
}

/**
 * Tính điểm dựa trên thời gian trong ngày
 * @param {Object} strategy - Thông tin về chiến lược
 * @returns {number} Điểm thời gian (0-1)
 */
function calculateTimeBasedScore(strategy = {}) {
  try {
    const hour = new Date().getHours();
    
    // Kiểm tra strategy có hợp lệ không
    if (!strategy || typeof strategy !== 'object') {
      return 0.5;
    }
    
    // Một số chiến lược có thể hoạt động tốt hơn vào các thời điểm khác nhau
    if (strategy.timeBasedStrategy && Array.isArray(strategy.preferredHours)) {
      // Điểm cao hơn cho các chiến lược được thiết kế cho thời gian cụ thể
      return strategy.preferredHours.includes(hour) ? 1 : 0.3;
    }
    
    return 0.5; // Điểm trung bình cho các chiến lược không phụ thuộc thời gian
  } catch (error) {
    console.error('Lỗi khi tính điểm thời gian:', error);
    return 0.5;
  }
}

/**
 * Tổng hợp các dự đoán từ nhiều chiến lược
 * @param {Array} predictions - Mảng các dự đoán từ các chiến lược khác nhau
 * @param {Object} strategyHistory - Lịch sử dự đoán của các chiến lược
 * @returns {Object} Dự đoán cuối cùng
 */
function aggregatePredictions(predictions = [], strategyHistory = {}) {
  try {
    // Kiểm tra đầu vào
    if (!Array.isArray(predictions) || predictions.length === 0) {
      throw new Error('Không có dự đoán nào để tổng hợp');
    }

    // Khởi tạo mảng chứa điểm số cho mỗi số có thể
    const scores = Array(10).fill(0);
    let validPredictions = 0;
    
    predictions.forEach(prediction => {
      try {
        if (!prediction?.detail?.prediction || 
            prediction.detail.prediction < 0 || 
            prediction.detail.prediction > 9) {
          return;
        }

        const history = strategyHistory[prediction.detail.usedStrategy] || [];
        const confidence = calculateStrategyConfidence(prediction.detail, history);
        
        // Cộng điểm cho số được dự đoán, có trọng số là độ tin cậy
        scores[prediction.detail.prediction] += confidence;
        validPredictions++;
      } catch (error) {
        console.error('Lỗi khi xử lý dự đoán:', error);
      }
    });

    if (validPredictions === 0) {
      throw new Error('Không có dự đoán hợp lệ nào');
    }

    // Tìm số có điểm cao nhất
    const maxScore = Math.max(...scores);
    const finalPrediction = scores.indexOf(maxScore);

    // Tính toán độ tin cậy tổng thể (đảm bảo không chia cho 0)
    const totalConfidence = maxScore / validPredictions;

    // Format điểm số để dễ đọc
    const formattedScores = scores.map(score => 
      score === 0 ? 0 : parseFloat(score.toFixed(3))
    );

    return {
      prediction: finalPrediction,
      confidence: parseFloat(totalConfidence.toFixed(3)),
      scores: formattedScores,
      details: `Dự đoán ${finalPrediction} với độ tin cậy ${(totalConfidence * 100).toFixed(1)}%`,
      validPredictions
    };
  } catch (error) {
    console.error('Lỗi khi tổng hợp dự đoán:', error);
    // Trả về dự đoán mặc định an toàn
    return {
      prediction: 0,
      confidence: 0.5,
      scores: Array(10).fill(0.5),
      details: 'Dự đoán mặc định do có lỗi xảy ra',
      error: error.message
    };
  }
}

module.exports = {
  aggregatePredictions,
  calculateStrategyConfidence
}; 
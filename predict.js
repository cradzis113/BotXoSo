const fs = require('fs');
const path = require('path');
/**
 * Predicts numbers based on historical draw data
 * @param {Array} history - Array of draw history objects
 * @param {Number} index - Position in numbers array to focus on (default: 0)
 * @param {Object} limit - Object containing limitList, defaultLimit, and showAllAnalyses
 * @returns {Object} Prediction results
 */
function predict(history, index = 0, limit = {
  limitList: [5, 10, 15], 
  defaultLimit: 5,
  showAllAnalyses: false
}) {
  // Đường dẫn đến các file
  const predictionsFile = path.join(__dirname, 'predictions.json');
  const historyLogFile = path.join(__dirname, 'prediction_log.txt');
  
  // Kiểm tra dự đoán cũ
  let oldPrediction = null;
  if (fs.existsSync(predictionsFile)) {
    try {
      oldPrediction = JSON.parse(fs.readFileSync(predictionsFile, 'utf8'));
      
      // Tìm kết quả thực tế tương ứng với dự đoán cũ
      const actualResult = history.find(item => item.drawId === oldPrediction.drawId);
      
      if (actualResult) {
        console.log("Tìm thấy kết quả thực tế cho dự đoán cũ!");
        
        // Ghi log kết quả
        const pos = oldPrediction.detail.index;
        const actualNumber = actualResult.numbers[pos];
        const predictedNumber = oldPrediction.numbers[pos];
        
        // Xác định Tài/Xỉu
        const actualType = actualNumber >= 5 ? "Tài" : "Xỉu";
        const predictedType = predictedNumber >= 5 ? "Tài" : "Xỉu";
        
        // So sánh kiểu Tài/Xỉu
        const isCorrect = actualType === predictedType;
        
        const timestamp = new Date(oldPrediction.timestamp).toLocaleString("vi-VN");
        
        // Tạo dòng log
        const logLine = `Chu kỳ | ${oldPrediction.drawId} | ${timestamp} | Số thực tế: ${actualNumber} (${actualType}) | Số dự đoán: ${predictedNumber} (${predictedType}) | Vị trí: ${pos} | ${isCorrect ? "Đúng" : "Sai"}\n`;
        
        // Ghi vào file log
        fs.appendFileSync(historyLogFile, logLine, 'utf8');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
  
  // Đảm bảo defaultLimit hợp lệ trước
  const defaultLimit = limit.defaultLimit || 5;
  
  // Sau đó sử dụng defaultLimit trong định nghĩa limitList
  const limitList = Array.isArray(limit.limitList) ? limit.limitList : [defaultLimit];
  
  // Phân tích theo nhiều giới hạn
  const limitAnalyses = {};
  let bestLimit = defaultLimit;
  let bestAccuracy = 0;
  
  for (const currentLimit of limitList) {
    // Lấy dữ liệu với giới hạn hiện tại
    const limitedHistory = history.slice(0, currentLimit);
    const numbersAtPos = limitedHistory.map(item => item.numbers[index]);
    
    // Tính tỷ lệ tài/xỉu cho limit này
    const taiCount = numbersAtPos.filter(num => {
      const numInt = parseInt(num, 10);
      return !isNaN(numInt) && numInt >= 5;
    }).length;
    
    const xiuCount = numbersAtPos.length - taiCount;
    const taiPercentage = Math.round((taiCount / numbersAtPos.length) * 100);
    
    // Đánh giá hiệu suất
    const accuracy = evaluatePredictionAccuracy(history, currentLimit, index);
    
    // Cập nhật giới hạn tốt nhất
    if (accuracy > bestAccuracy) {
      bestAccuracy = accuracy;
      bestLimit = currentLimit;
    }
    
    // Lưu kết quả phân tích
    limitAnalyses[currentLimit] = {
      taiCount,
      xiuCount,
      taiPercentage,
      accuracy: Math.round(accuracy * 100)
    };
  }
  
  // Sử dụng giới hạn tốt nhất nếu tìm thấy, nếu không dùng defaultLimit
  const actualLimit = bestAccuracy > 0.5 ? bestLimit : defaultLimit;
  
  // Sử dụng giới hạn tốt nhất
  const bestLimitedHistory = history.slice(0, actualLimit);
  const numbersAtIndex = bestLimitedHistory.map(item => item.numbers[index]);
  
  // Lấy tỷ lệ tài/xỉu từ giới hạn tốt nhất
  const bestAnalysis = limitAnalyses[actualLimit];
  
  // Chiến lược dự đoán sử dụng dữ liệu từ giới hạn tốt nhất
  let shouldPredictTai;
  
  // Chiến lược dự đoán (dựa vào tỷ lệ tài/xỉu của giới hạn tốt nhất)
  if (bestAnalysis.taiCount > bestAnalysis.xiuCount * 1.5) {
    shouldPredictTai = true; // Tài chiếm ưu thế mạnh
  } else if (bestAnalysis.xiuCount > bestAnalysis.taiCount * 1.5) {
    shouldPredictTai = false; // Xỉu chiếm ưu thế mạnh
  } else {
    // Tương đối cân bằng, dự đoán ngược với kết quả gần nhất
    shouldPredictTai = history[0].numbers[index] < 5;
  }
  
  // Dự đoán cho tất cả các vị trí
  const predictedNumbers = [];
  for (let i = 0; i < 5; i++) {
    if (i === index) {
      predictedNumbers.push(shouldPredictTai
        ? 5 + Math.floor(Math.random() * 5) // Tài (5-9)
        : Math.floor(Math.random() * 5));   // Xỉu (0-4)
    } else {
      predictedNumbers.push(Math.floor(Math.random() * 10));
    }
  }
  
  // Tạo dự đoán mới sử dụng tỷ lệ từ giới hạn tốt nhất
  const prediction = {
    drawId: calculateNextDrawId(history[0].drawId),
    numbers: predictedNumbers,
    detail: {
      index: index,
      prediction: predictedNumbers[index],
      bestLimit: bestLimit,
      bestAccuracy: Math.round(bestAccuracy * 100),
      bestLimitAnalysis: {
        taiCount: bestAnalysis.taiCount,
        xiuCount: bestAnalysis.xiuCount,
        taiPercentage: bestAnalysis.taiPercentage,
        accuracy: Math.round(bestAccuracy * 100)
      }
    },
    timestamp: new Date().toISOString()
  };
  
  // Chỉ thêm đầy đủ limitAnalyses nếu showAllAnalyses = true
  if (limit.showAllAnalyses) {
    prediction.detail.limitAnalyses = limitAnalyses;
  }
  
  // Lưu dự đoán mới vào file predictions.json
  fs.writeFileSync(predictionsFile, JSON.stringify(prediction, null, 2), 'utf8');
  
  return prediction;
}

// Tính mã kỳ quay tiếp theo
function calculateNextDrawId(currentDrawId) {
  const numericPart = parseInt(currentDrawId.slice(-4));
  const prefix = currentDrawId.slice(0, -4);
  const nextNumeric = numericPart + 1;
  return prefix + nextNumeric.toString().padStart(4, '0');
}

/**
 * Đánh giá độ chính xác của dự đoán khi sử dụng giới hạn cụ thể
 * @param {Array} history - Mảng lịch sử kết quả
 * @param {Number} limit - Giới hạn số lượng mục sử dụng để dự đoán
 * @param {Number} index - Vị trí trong mảng numbers cần dự đoán
 * @returns {Number} Tỷ lệ dự đoán đúng (0-1)
 */
function evaluatePredictionAccuracy(history, limit, index) {
  // Cần ít nhất 2*limit dữ liệu để đánh giá hiệu quả
  if (history.length < limit + 10) {
    return 0.5; // Không đủ dữ liệu, trả về giá trị trung bình
  }
  
  let correctPredictions = 0;
  let totalPredictions = 0;
  
  // Chạy mô phỏng dự đoán trên 10 kết quả gần đây
  for (let i = 10; i < Math.min(30, history.length); i++) {
    // Lấy lịch sử tới thời điểm i
    const pastHistory = history.slice(i, i + limit);
    
    // Sử dụng lịch sử đó để dự đoán kết quả tại i-1
    const prediction = makePredictionWithLimit(pastHistory, index);
    
    // Lấy kết quả thực tế
    const actualResult = history[i-1].numbers[index];
    
    // So sánh dự đoán với kết quả thực tế (chỉ quan tâm tài/xỉu)
    const predictionType = prediction >= 5 ? "Tài" : "Xỉu";
    const actualType = actualResult >= 5 ? "Tài" : "Xỉu";
    
    if (predictionType === actualType) {
      correctPredictions++;
    }
    
    totalPredictions++;
  }
  
  // Trả về tỷ lệ dự đoán đúng
  return totalPredictions > 0 ? correctPredictions / totalPredictions : 0.5;
}

/**
 * Tạo dự đoán dựa trên lịch sử với giới hạn
 * @param {Array} limitedHistory - Lịch sử được giới hạn để dự đoán
 * @param {Number} index - Vị trí cần dự đoán
 * @returns {Number} Số dự đoán
 */
function makePredictionWithLimit(limitedHistory, index) {
  const numbersAtPos = limitedHistory.map(item => item.numbers[index]);
  
  // Đếm tỷ lệ tài/xỉu
  const taiCount = numbersAtPos.filter(num => {
    const numInt = parseInt(num, 10);
    return !isNaN(numInt) && numInt >= 5;
  }).length;
  
  const xiuCount = numbersAtPos.length - taiCount;
  
  // Áp dụng logic đơn giản: dự đoán ngược với kết quả gần nhất
  // nếu tỷ lệ tài/xỉu khá cân bằng
  if (Math.abs(taiCount - xiuCount) <= 1) {
    const lastResult = limitedHistory[0].numbers[index];
    return lastResult >= 5 ? Math.floor(Math.random() * 5) : 5 + Math.floor(Math.random() * 5);
  } 
  // Nếu không, dự đoán theo loại xuất hiện nhiều hơn
  else {
    return taiCount > xiuCount 
      ? 5 + Math.floor(Math.random() * 5) // Tài
      : Math.floor(Math.random() * 5);    // Xỉu
  }
}

module.exports = predict;

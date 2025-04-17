const fs = require('fs');
const path = require('path');
/**
 * Predicts numbers based on historical draw data
 * @param {Array} history - Array of draw history objects
 * @param {Number} index - Position in numbers array to focus on (default: 0)
 * @param {Object} limit - Object containing limitList, defaultLimit
 * @returns {Object} Prediction results
 */
function predict(history, index = 0, limit = {
  limitList: [5, 10, 15], 
  defaultLimit: 5,
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
  
  // Khởi tạo tất cả các biến quan trọng từ đầu
  let shouldPredictTai;
  let skipNormalAnalysis = false;
  let actualLimit = defaultLimit; 
  let bestLimit = defaultLimit;
  let bestAccuracy = 0.5; // Khởi tạo giá trị mặc định
  let bestAnalysis = {
    taiCount: 0,
    xiuCount: 0,
    taiPercentage: 50,
    accuracy: 50
  };
  
  // Tách phần phân tích cơ bản để đảm bảo luôn chạy bất kể skipNormalAnalysis là gì
  let basicAnalysis = {
    taiCount: 0,
    xiuCount: 0,
    taiPercentage: 50,
    accuracy: 50
  };
  
  // PHÂN TÍCH CƠ BẢN - LUÔN CHẠY, KHÔNG BỊ BỎ QUA
  try {
    const basicLimit = 10; // Dùng 10 kết quả gần nhất để phân tích cơ bản
    const basicHistory = history.slice(0, Math.min(basicLimit, history.length));
    
    console.log(`Phân tích cơ bản với ${basicHistory.length} kết quả gần nhất`);
    
    if (basicHistory.length > 0) {
      const numbersAtPos = basicHistory.map(item => {
        console.log(`Kết quả: ${JSON.stringify(item.numbers)}`);
        return item.numbers[index];
      });
      
      console.log(`Các số ở vị trí ${index}: ${numbersAtPos.join(', ')}`);
      
      // Đếm tài xỉu với log chi tiết
      const taiValues = numbersAtPos.filter(num => {
        if (num === undefined || num === null) {
          console.log(`Phát hiện giá trị không hợp lệ: ${num}`);
          return false;
        }
        const numInt = parseInt(num, 10);
        const isTai = !isNaN(numInt) && numInt >= 5;
        console.log(`Số ${num} là ${isTai ? 'Tài' : 'Xỉu'}`);
        return isTai;
      });
      
      const taiCount = taiValues.length;
      const xiuCount = numbersAtPos.filter(num => num !== undefined && num !== null).length - taiCount;
      
      console.log(`Kết quả phân tích cơ bản: Tài=${taiCount}, Xỉu=${xiuCount}`);
      
      basicAnalysis = {
        taiCount: taiCount,
        xiuCount: xiuCount,
        taiPercentage: Math.round((taiCount / numbersAtPos.length) * 100),
        accuracy: 50 // Giá trị mặc định cho accuracy
      };
    } else {
      console.log("Không có dữ liệu cho phân tích cơ bản!");
    }
  } catch (error) {
    console.error("Lỗi trong phân tích cơ bản:", error);
  }
  
  // Phân tích chỉ 5 kết quả gần nhất
  const recentFive = history.slice(0, 5);
  const recentTaiCount = recentFive.filter(item => item.numbers[index] >= 5).length;

  // Nếu có xu hướng rõ ràng (4/5 kết quả cùng loại)
  if (recentTaiCount >= 4) {
    // Xu hướng mạnh Tài -> dự đoán Tài
    shouldPredictTai = true;
  } else if (recentTaiCount <= 1) {
    // Xu hướng mạnh Xỉu -> dự đoán Xỉu
    shouldPredictTai = false;
  }

  // Thêm vào trước phân tích theo xu hướng
  const rhythmPrediction = rhythmBasedPrediction(history, index);
  if (rhythmPrediction !== null) {
    // Nếu phát hiện được nhịp rõ ràng, sử dụng dự đoán theo nhịp
    shouldPredictTai = rhythmPrediction;
    console.log(`Dự đoán theo nhịp: ${shouldPredictTai ? 'Tài' : 'Xỉu'}`);
    // Bỏ qua các phân tích khác
    skipNormalAnalysis = true;
  } else {
    // Nếu không có xu hướng mạnh, tiếp tục phân tích như bình thường
    if (!skipNormalAnalysis) {
      // Thử với cả mẫu 2-gram và 3-gram
      let markovPrediction = markovPredictor(history, index, 2);
      if (markovPrediction === null) {
        // Nếu mẫu 2-gram không đủ mạnh, thử mẫu 3-gram
        markovPrediction = markovPredictor(history, index, 3);
      }

      if (markovPrediction !== null) {
        // Nếu mô hình Markov có dự đoán mạnh, sử dụng nó
        shouldPredictTai = markovPrediction;
        console.log(`Dự đoán theo mô hình Markov: ${shouldPredictTai ? 'Tài' : 'Xỉu'}`);
        // Bỏ qua các phân tích khác
        skipNormalAnalysis = true;
      } else {
        // Phân tích theo nhiều giới hạn
        const limitAnalyses = {};
        let bestLimit = defaultLimit;
        let bestAccuracy = 0.5; // Khởi tạo với 0.5 (tỷ lệ đoán ngẫu nhiên)
        
        for (const currentLimit of limitList) {
          // Lấy dữ liệu với giới hạn hiện tại
          const limitedHistory = history.slice(0, currentLimit);
          const numbersAtPos = limitedHistory.map(item => item.numbers[index]);
          
          // Đếm tài/xỉu
          const taiCount = numbersAtPos.filter(num => {
            const numInt = parseInt(num, 10);
            return !isNaN(numInt) && numInt >= 5;
          }).length;
          
          const xiuCount = numbersAtPos.length - taiCount;
          const taiPercentage = Math.round((taiCount / numbersAtPos.length) * 100);
          
          // Đánh giá hiệu suất - thêm logging để debug
          const accuracy = evaluatePredictionAccuracy(history, currentLimit, index);
          console.log(`Limit ${currentLimit}: Accuracy = ${Math.round(accuracy * 100)}%, Tai = ${taiCount}, Xiu = ${xiuCount}`);
          
          // Cập nhật giới hạn tốt nhất (chỉ khi accuracy cao hơn đáng kể)
          if (accuracy > bestAccuracy + 0.05) { // Chỉ thay đổi khi cải thiện ít nhất 5%
            console.log(`Tìm thấy limit tốt hơn: ${currentLimit} (accuracy: ${Math.round(accuracy * 100)}%)`);
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
        
        // Khi đến đoạn tính actualLimit
        actualLimit = bestAccuracy > 0.5 ? bestLimit : defaultLimit;
        
        // Lấy tỷ lệ tài/xỉu từ giới hạn tốt nhất
        if (limitAnalyses[actualLimit]) {
          bestAnalysis.taiCount = limitAnalyses[actualLimit].taiCount;
          bestAnalysis.xiuCount = limitAnalyses[actualLimit].xiuCount;
          bestAnalysis.taiPercentage = limitAnalyses[actualLimit].taiPercentage;
          bestAnalysis.accuracy = limitAnalyses[actualLimit].accuracy;
        }
        
        // Chiến lược dự đoán sử dụng dữ liệu từ giới hạn tốt nhất
        if (bestAnalysis.taiCount > bestAnalysis.xiuCount * 1.2) {
          shouldPredictTai = true; // Tài chiếm ưu thế 
        } else if (bestAnalysis.xiuCount > bestAnalysis.taiCount * 1.2) {
          shouldPredictTai = false; // Xỉu chiếm ưu thế
        } else {
          // Tương đối cân bằng, xem xét chuỗi liên tiếp
          const streak = analyzeSequence(history, index);
          if (streak.taiStreak >= 2) { // Giảm từ 3 xuống 2
            // Sau 2+ Tài liên tiếp, tiếp tục dự đoán TÀI
            shouldPredictTai = true;
          } else if (streak.xiuStreak >= 2) { // Giảm từ 3 xuống 2
            // Sau 2+ Xỉu liên tiếp, tiếp tục dự đoán XỈU
            shouldPredictTai = false;
          } else {
            // Không có chuỗi đáng kể, dự đoán theo phương pháp trọng số
            const weightedAnalysis = analyzeWithWeights(history, index);
            shouldPredictTai = weightedAnalysis.weightedTaiPercentage > 50;
          }
        }
      }
    }
  }
  
  // Thêm vào sau phân tích xu hướng, trước phân tích limit
  const balanceSuggestion = balancePrediction(history, index);
  if (balanceSuggestion !== null) {
    console.log(`Đề xuất dự đoán ${balanceSuggestion ? 'Tài' : 'Xỉu'} để cân bằng tỷ lệ`);
    shouldPredictTai = balanceSuggestion;
    
    // Thêm lý do
    balanceReason = `Cân bằng tỷ lệ dự đoán`;
  }
  
  // Khởi tạo các biến emergency
  let emergencyReversal = false;
  let emergencyReason = '';
  
  // Phân tích chuỗi dự đoán sai dựa trên history
  const consecutiveFails = analyzeConsecutiveWrongPredictions(history, index);
  
  // Nếu phát hiện nhiều lần sai liên tiếp, đảo ngược dự đoán
  if (consecutiveFails >= 2) {
    console.log(`Phát hiện ${consecutiveFails} lần sai liên tiếp, đảo ngược dự đoán!`);
    shouldPredictTai = !shouldPredictTai;
    
    emergencyReversal = true;
    emergencyReason = `Đảo ngược sau ${consecutiveFails} lần sai liên tiếp`;
  }
  
  // Thêm điều kiện này để thoát khỏi skipNormalAnalysis
  if (skipNormalAnalysis) {
    // Nếu 3/5 kết quả gần đây ngược với dự đoán hiện tại
    const recentFiveResults = history.slice(0, 5);
    const recentOppositeCount = recentFiveResults.filter(item => 
      (shouldPredictTai && item.numbers[index] < 5) || 
      (!shouldPredictTai && item.numbers[index] >= 5)
    ).length;
    
    if (recentOppositeCount >= 3) {
      console.log("Phát hiện xu hướng đảo chiều!");
      skipNormalAnalysis = false;
      shouldPredictTai = !shouldPredictTai;
    }
  }
  
  // Thêm phần phân tích 30 kết quả gần nhất
  const last30Results = history.slice(0, 30);
  const taiCount30 = last30Results.filter(item => item.numbers[index] >= 5).length;
  const taiPercentage = (taiCount30 / 30) * 100;
  
  // Xác định "mùa" hiện tại
  if (taiPercentage >= 60) {
    console.log("Đang trong mùa Tài!");
    // Ưu tiên dự đoán Tài trừ khi có xu hướng Xỉu cực mạnh
  } else if (taiPercentage <= 40) {
    console.log("Đang trong mùa Xỉu!");
    // Ưu tiên dự đoán Xỉu trừ khi có xu hướng Tài cực mạnh
  }
  
  // Sau phần phân tích limit, thêm đoạn này để đảm bảo luôn có giá trị
  // Nếu phân tích thông thường không có kết quả, sử dụng phân tích cơ bản
  if (!bestAnalysis || bestAnalysis.taiCount === 0 && bestAnalysis.xiuCount === 0) {
    console.log("Phân tích thông thường không có kết quả, sử dụng phân tích cơ bản");
    bestAnalysis = basicAnalysis;
  }
  
  // Dự đoán cho tất cả các vị trí
  const predictedNumbers = generateNumbers(shouldPredictTai, index);
  
  // Tạo dự đoán mới
  console.log("Sử dụng phân tích:", bestAnalysis);

  // Đảm bảo bestLimit phản ánh đúng số lượng dữ liệu đang sử dụng
  const totalDataPoints = (bestAnalysis.taiCount + bestAnalysis.xiuCount);
  console.log(`Tổng số dữ liệu phân tích: ${totalDataPoints}`);

  // Tìm limitList value gần nhất với totalDataPoints
  if (totalDataPoints > 0 && Array.isArray(limitList) && limitList.length > 0) {
    let closestLimit = limitList[0];
    let minDiff = Math.abs(closestLimit - totalDataPoints);
    
    for (const limit of limitList) {
      const diff = Math.abs(limit - totalDataPoints);
      if (diff < minDiff) {
        minDiff = diff;
        closestLimit = limit;
      }
    }
    
    // Cập nhật bestLimit để khớp với số lượng dữ liệu
    if (bestLimit !== closestLimit) {
      console.log(`Cập nhật bestLimit từ ${bestLimit} thành ${closestLimit} để khớp với dữ liệu`);
      bestLimit = closestLimit;
    }
  }
  
  // QUAN TRỌNG: Làm một bước kiểm tra cuối cùng trước khi tạo prediction
  console.log(`Giá trị cuối cùng: bestLimit = ${bestLimit}`);

  // LƯU Ý: Tạo đối tượng prediction NGAY SAU khi cập nhật bestLimit
  const prediction = {
    drawId: calculateNextDrawId(history[0].drawId),
    numbers: predictedNumbers,
    detail: {
      index: index,
      prediction: shouldPredictTai ? (5 + Math.floor(Math.random() * 5)) : Math.floor(Math.random() * 5),
      bestLimit: bestLimit,
      bestAccuracy: bestAnalysis.accuracy,
      bestLimitAnalysis: {
        taiCount: bestAnalysis.taiCount,
        xiuCount: bestAnalysis.xiuCount,
        taiPercentage: bestAnalysis.taiPercentage,
        accuracy: bestAnalysis.accuracy
      }
    },
    timestamp: new Date().toISOString()
  };

  // Kiểm tra xem prediction có đúng không
  console.log(`Kiểm tra lại: prediction.detail.bestLimit = ${prediction.detail.bestLimit}`);
  
  // Thêm lý do nếu là đảo ngược khẩn cấp
  if (emergencyReversal) {
    prediction.detail.emergencyReason = emergencyReason;
  }
  
  // Ngay trước khi return prediction
  if (prediction.detail.bestLimit !== bestLimit) {
    console.error(`Lỗi: bestLimit không khớp (${prediction.detail.bestLimit} vs ${bestLimit})`);
    prediction.detail.bestLimit = bestLimit; // Đảm bảo giá trị đúng
  }
  
  // Lưu dự đoán mới vào file predictions.json
  fs.writeFileSync(predictionsFile, JSON.stringify(prediction, null, 2), 'utf8');
  
  // Đếm số lần dự đoán cùng loại liên tiếp
  let consecutiveSamePredictions = 0;
  const logLines = fs.readFileSync(historyLogFile, 'utf8').split('\n');
  const lastPredictionType = logLines.length > 0 ? 
                            (logLines[logLines.length-1].includes('(Tài)') ? 'Tài' : 'Xỉu') : null;

  for (let i = logLines.length - 1; i >= 0; i--) {
    const currentPrediction = logLines[i].includes('(Tài)') ? 'Tài' : 'Xỉu';
    if (currentPrediction === lastPredictionType) {
      consecutiveSamePredictions++;
    } else {
      break;
    }
  }

  // Nếu đã dự đoán cùng một loại 5+ lần liên tiếp, "giải phóng"
  if (consecutiveSamePredictions >= 5) {
    console.log(`Đã dự đoán ${lastPredictionType} ${consecutiveSamePredictions} lần liên tiếp, cần giải phóng!`);
    shouldPredictTai = lastPredictionType === 'Xỉu'; // Đổi sang loại ngược lại
    
    // Thêm lý do
    releaseReason = `Giải phóng sau ${consecutiveSamePredictions} lần dự đoán ${lastPredictionType}`;
  }
  
  // Ghi log với thông tin chi tiết
  console.log("Dự đoán mới:", {
    shouldPredictTai,
    bestLimit,
    bestAccuracy: bestAnalysis.accuracy,
    taiCount: bestAnalysis.taiCount,
    xiuCount: bestAnalysis.xiuCount
  });
  
  // In ra thông tin cuối cùng để kiểm tra
  console.log("DỰ ĐOÁN CUỐI CÙNG:", {
    taiCount: prediction.detail.bestLimitAnalysis.taiCount,
    xiuCount: prediction.detail.bestLimitAnalysis.xiuCount,
    taiPercentage: prediction.detail.bestLimitAnalysis.taiPercentage
  });
  
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
  // Kiểm tra dữ liệu đầu vào
  if (!history || !Array.isArray(history) || history.length === 0) {
    console.error("Lịch sử rỗng hoặc không hợp lệ");
    return 0.5;
  }
  
  // Cần ít nhất 2*limit dữ liệu để đánh giá hiệu quả
  if (history.length < limit + 15) {
    console.log(`Không đủ dữ liệu cho limit=${limit}, cần ít nhất ${limit+15} mục`);
    return 0.5; // Không đủ dữ liệu, trả về giá trị trung bình
  }
  
  let correctPredictions = 0;
  let totalPredictions = 0;
  
  // In ra phạm vi dự đoán để debug
  console.log(`Đánh giá limit=${limit} với ${Math.min(50, history.length)} mục lịch sử`);
  
  // Mở rộng phạm vi dự đoán - thêm logging
  for (let i = 10; i < Math.min(50, history.length); i++) {
    // Lấy lịch sử tới thời điểm i
    const pastHistory = history.slice(i, i + limit);
    
    // Sử dụng lịch sử đó để dự đoán kết quả tại i-1
    const prediction = enhancedPredictionWithLimit(pastHistory, history.slice(i-5, i), index);
    
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
  
  // Thêm logging
  const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0.5;
  console.log(`Limit ${limit}: ${correctPredictions}/${totalPredictions} đúng (${Math.round(accuracy*100)}%)`);
  
  // Trả về tỷ lệ dự đoán đúng
  return accuracy;
}

/**
 * Tạo dự đoán dựa trên lịch sử với giới hạn
 * @param {Array} limitedHistory - Lịch sử được giới hạn để dự đoán
 * @param {Array} recentHistory - Lịch sử gần đây để dự đoán
 * @param {Number} index - Vị trí cần dự đoán
 * @returns {Number} Số dự đoán
 */
function enhancedPredictionWithLimit(limitedHistory, recentHistory, index) {
  // Kết hợp phân tích tỷ lệ và phân tích chuỗi
  const numbersAtPos = limitedHistory.map(item => item.numbers[index]);
  
  // Đếm tỷ lệ tài/xỉu
  const taiCount = numbersAtPos.filter(num => parseInt(num, 10) >= 5).length;
  const xiuCount = numbersAtPos.length - taiCount;
  
  // Phân tích chuỗi gần đây
  const recentResults = recentHistory.map(item => item.numbers[index] >= 5 ? 'Tài' : 'Xỉu');
  const streak = {taiStreak: 0, xiuStreak: 0};
  
  if (recentResults[0] === 'Tài') {
    for (let i = 0; i < recentResults.length; i++) {
      if (recentResults[i] === 'Tài') streak.taiStreak++;
      else break;
    }
  } else {
    for (let i = 0; i < recentResults.length; i++) {
      if (recentResults[i] === 'Xỉu') streak.xiuStreak++;
      else break;
    }
  }
  
  // Quan trọng: Thay đổi hoàn toàn chiến lược
  if (streak.taiStreak >= 2) {
    // Sau 2+ Tài liên tiếp, tiếp tục dự đoán TÀI
    return 5 + Math.floor(Math.random() * 5);
  } else if (streak.xiuStreak >= 2) {
    // Sau 2+ Xỉu liên tiếp, tiếp tục dự đoán XỈU
    return Math.floor(Math.random() * 5);
  } else if (Math.abs(taiCount - xiuCount) <= 1) {
    // Nếu cân bằng, dự đoán theo với kết quả gần nhất
    const lastResult = recentHistory[0].numbers[index];
    return lastResult >= 5 ? 5 + Math.floor(Math.random() * 5) : Math.floor(Math.random() * 5);
  } else {
    // Dự đoán theo xu hướng
    return taiCount > xiuCount 
      ? 5 + Math.floor(Math.random() * 5) // Tài
      : Math.floor(Math.random() * 5);    // Xỉu
  }
}

// Phân tích chuỗi liên tiếp
function analyzeSequence(data, index) {
  const streak = {taiStreak: 0, xiuStreak: 0, currentType: null};
  // Mở rộng phạm vi từ 5 lên 7
  const lastResults = data.slice(0, 7).map(item => item.numbers[index] >= 5 ? 'Tài' : 'Xỉu');
  
  for (let i = 0; i < lastResults.length; i++) {
    const current = lastResults[i];
    if (i === 0) {
      streak.currentType = current;
      streak[current === 'Tài' ? 'taiStreak' : 'xiuStreak'] = 1;
    } else if (current === streak.currentType) {
      streak[current === 'Tài' ? 'taiStreak' : 'xiuStreak']++;
    } else {
      break; // Dừng khi gặp giá trị khác
    }
  }
  
  return streak;
}

// Thêm vào trước hàm predict hoặc bên trong hàm predict
function analyzeWithWeights(data, index, depth = 10) {
  // Giới hạn độ sâu phân tích
  const limitedData = data.slice(0, Math.min(depth, data.length));
  
  let totalWeight = 0;
  let weightedTaiCount = 0;
  
  for (let i = 0; i < limitedData.length; i++) {
    // Kết quả càng gần càng có trọng số cao
    const weight = Math.pow(0.85, i); // 1, 0.85, 0.85^2, 0.85^3...
    totalWeight += weight;
    
    if (limitedData[i].numbers[index] >= 5) {
      weightedTaiCount += weight;
    }
  }
  
  const weightedTaiPercentage = (weightedTaiCount / totalWeight) * 100;
  return {
    weightedTaiPercentage: Math.round(weightedTaiPercentage),
    weightedXiuPercentage: Math.round(100 - weightedTaiPercentage)
  };
}

/**
 * Xây dựng và áp dụng mô hình Markov đơn giản cho dự đoán Tài Xỉu
 */
function markovPredictor(history, index, depth = 2) {
  // BƯỚC 1: Xây dựng ma trận chuyển tiếp
  const transitionMatrix = {};
  
  // Khởi tạo ma trận
  for (let i = 0; i < Math.pow(2, depth); i++) {
    const pattern = i.toString(2).padStart(depth, '0').replace(/0/g, 'X').replace(/1/g, 'T');
    transitionMatrix[pattern] = { T: 0, X: 0 };
  }
  
  // Phân tích lịch sử để xây dựng ma trận
  const sequence = history.slice(0, 30).map(item => item.numbers[index] >= 5 ? 'T' : 'X');
  
  for (let i = 0; i < sequence.length - depth; i++) {
    const pattern = sequence.slice(i, i + depth).join('');
    const nextState = sequence[i + depth];
    
    if (transitionMatrix[pattern]) {
      transitionMatrix[pattern][nextState]++;
    }
  }
  
  // BƯỚC 2: Dự đoán dựa trên mẫu gần đây
  const recentPattern = sequence.slice(0, depth).join('');
  
  console.log(`Mẫu hiện tại: ${recentPattern}`);
  console.log(`Ma trận chuyển tiếp: `, transitionMatrix[recentPattern]);
  
  // Nếu có đủ dữ liệu để dự đoán
  if (transitionMatrix[recentPattern]) {
    // Dự đoán theo xác suất cao nhất
    if (transitionMatrix[recentPattern].T > transitionMatrix[recentPattern].X) {
      return true;  // Dự đoán Tài
    } else if (transitionMatrix[recentPattern].X > transitionMatrix[recentPattern].T) {
      return false; // Dự đoán Xỉu
    }
  }
  
  // Nếu không đủ dữ liệu hoặc xác suất bằng nhau
  return null;
}

/**
 * Thuật toán học theo nhịp - phát hiện và dự đoán theo nhịp Tài/Xỉu
 */
function rhythmBasedPrediction(history, index) {
  // Lấy 10 kết quả gần nhất
  const recentResults = history.slice(0, 10).map(item => 
    item.numbers[index] >= 5 ? 'Tài' : 'Xỉu'
  );
  
  // Kiểm tra các nhịp cơ bản
  const lastThree = recentResults.slice(0, 3);
  const lastThreePattern = lastThree.join('-');
  
  console.log(`Mẫu 3 gần nhất: ${lastThreePattern}`);
  
  // Phát hiện nhịp dừng (chuỗi 3 giống nhau)
  if (lastThree[0] === lastThree[1] && lastThree[1] === lastThree[2]) {
    // Sau 3 kết quả giống nhau, nhiều khả năng sẽ đảo chiều
    console.log(`Phát hiện nhịp dừng: 3 ${lastThree[0]} liên tiếp`);
    return lastThree[0] === 'Tài' ? false : true; // Dự đoán ngược
  }
  
  // Phát hiện nhịp chuyển (2 giống nhau + đảo chiều)
  if (lastThree[0] === lastThree[1] && lastThree[1] !== lastThree[2]) {
    // Sau khi chuyển từ 2 giống nhau sang đảo chiều, thường sẽ tiếp tục xu hướng mới
    console.log(`Phát hiện nhịp chuyển: ${lastThree[2]} sau 2 ${lastThree[0]}`);
    return lastThree[2] === 'Tài'; // Đi theo xu hướng mới
  }
  
  // Phát hiện nhịp lặp lại (phân tích kết quả dài hơn)
  // Kiểm tra xem mẫu 2 kết quả gần nhất có xuất hiện trước đó không
  const lookForPattern = recentResults.slice(0, 2).join('-');
  for (let i = 2; i < recentResults.length - 1; i++) {
    const pastPattern = recentResults.slice(i, i+2).join('-');
    if (pastPattern === lookForPattern) {
      // Nếu tìm thấy mẫu tương tự trong quá khứ, dự đoán dựa trên kết quả tiếp theo trong quá khứ
      console.log(`Phát hiện nhịp lặp lại: ${lookForPattern} → ${recentResults[i-1]}`);
      return recentResults[i-1] === 'Tài';
    }
  }
  
  // Mẫu cuối: Nhịp xen kẽ
  if (recentResults[0] !== recentResults[1] && 
      recentResults[1] !== recentResults[2] && 
      recentResults[2] !== recentResults[3]) {
    // Nếu có 4 kết quả xen kẽ liên tiếp, nhiều khả năng sẽ tiếp tục xen kẽ
    console.log(`Phát hiện nhịp xen kẽ`);
    return recentResults[0] !== 'Tài';
  }
  
  // Không phát hiện được nhịp rõ ràng
  return null;
}

/**
 * Tạo mảng các số dự đoán với giá trị Tài/Xỉu tại vị trí chỉ định
 * @param {Boolean} shouldPredictTai - True nếu dự đoán Tài, False nếu dự đoán Xỉu
 * @param {Number} index - Vị trí cần dự đoán Tài/Xỉu
 * @returns {Array} Mảng 5 số dự đoán
 */
function generateNumbers(shouldPredictTai, index) {
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
  return predictedNumbers;
}

/**
 * Phân tích chuỗi dự đoán sai từ history
 * @param {Array} history - Mảng lịch sử kết quả
 * @param {Number} index - Vị trí cần phân tích
 * @returns {Number} Số lần dự đoán sai liên tiếp
 */
function analyzeConsecutiveWrongPredictions(history, index) {
  if (history.length < 2) return 0; // Cần ít nhất 2 kết quả để phân tích
  
  // Lấy kết quả thực tế của 10 lượt gần nhất
  const recentResults = history.slice(0, Math.min(10, history.length));
  
  // Tạo dự đoán giả lập cho từng kết quả sử dụng kết quả trước đó
  let consecutiveFails = 0;
  
  for (let i = 0; i < recentResults.length - 1; i++) {
    // Kết quả thực tế hiện tại
    const actualResult = recentResults[i].numbers[index];
    const actualType = actualResult >= 5 ? "Tài" : "Xỉu";
    
    // Dự đoán dựa trên kết quả trước đó
    const previousResult = recentResults[i+1].numbers[index];
    const prevType = previousResult >= 5 ? "Tài" : "Xỉu";
    
    // Dự đoán ngược lại với kết quả trước đó (giả lập thuật toán cơ bản)
    const predictedType = prevType === "Tài" ? "Xỉu" : "Tài";
    
    if (predictedType !== actualType) {
      // Dự đoán sai
      consecutiveFails++;
    } else {
      // Dự đoán đúng - dừng đếm
      break;
    }
  }
  
  console.log(`Phát hiện ${consecutiveFails} lần dự đoán sai liên tiếp từ dữ liệu history`);
  return consecutiveFails;
}

/**
 * Phân tích tỷ lệ Tài/Xỉu thực tế và cân bằng dự đoán
 */
function balancePrediction(history, index) {
  // Lấy 10 kết quả gần nhất
  const recentResults = history.slice(0, 10);
  
  // Đếm số lần Tài/Xỉu thực tế
  const taiCount = recentResults.filter(item => item.numbers[index] >= 5).length;
  const xiuCount = recentResults.length - taiCount;
  
  // Tính tỷ lệ
  const taiPercent = (taiCount / recentResults.length) * 100;
  const xiuPercent = (xiuCount / recentResults.length) * 100;
  
  console.log(`Tỷ lệ thực tế: Tài ${taiPercent.toFixed(1)}%, Xỉu ${xiuPercent.toFixed(1)}%`);
  
  // Phân tích lịch sử dự đoán (từ history, không cần log file)
  // Giả lập 5 dự đoán gần nhất dựa trên thuật toán hiện tại
  let predictedTypes = [];
  for (let i = 0; i < 5; i++) {
    if (i+1 < recentResults.length) {
      // Sử dụng heuristic đơn giản để mô phỏng thuật toán
      const prevResult = recentResults[i+1].numbers[index] >= 5 ? "Tài" : "Xỉu";
      const currResult = recentResults[i].numbers[index] >= 5 ? "Tài" : "Xỉu";
      
      // Giả định thuật toán dự đoán ngược với kết quả trước đó
      const predictedType = prevResult === "Tài" ? "Xỉu" : "Tài";
      predictedTypes.push(predictedType);
    }
  }
  
  // Đếm số lần dự đoán Tài/Xỉu
  const predictedTaiCount = predictedTypes.filter(type => type === "Tài").length;
  const predictedXiuCount = predictedTypes.length - predictedTaiCount;
  
  console.log(`Dự đoán hiện tại: Tài ${(predictedTaiCount/predictedTypes.length*100).toFixed(1)}%, Xỉu ${(predictedXiuCount/predictedTypes.length*100).toFixed(1)}%`);
  
  // CƠ CHẾ CÂN BẰNG: Nếu dự đoán nhiều Xỉu hơn 70% nhưng tỷ lệ Tài thực tế > 40%, cân bằng lại
  if (predictedXiuCount/predictedTypes.length > 0.7 && taiPercent > 40) {
    console.log("Phát hiện mất cân bằng: Dự đoán Xỉu quá nhiều!");
    return true; // Đề xuất dự đoán Tài để cân bằng
  }
  
  // Tương tự nếu dự đoán nhiều Tài
  if (predictedTaiCount/predictedTypes.length > 0.7 && xiuPercent > 40) {
    console.log("Phát hiện mất cân bằng: Dự đoán Tài quá nhiều!");
    return false; // Đề xuất dự đoán Xỉu để cân bằng
  }
  
  // Nếu đã cân bằng, trả về null để sử dụng các chiến lược khác
  return null;
}

module.exports = predict;

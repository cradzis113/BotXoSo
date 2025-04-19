const fs = require('fs');
const path = require('path');

/**
 * Dự đoán Tài Xỉu với thuật toán nhận dạng mẫu hình siêu phản ứng (phiên bản 5.2)
 * @param {Array} history - Mảng lịch sử kết quả
 * @param {Number} index - Vị trí trong mảng numbers cần dự đoán
 * @param {Object} options - Tùy chọn cấu hình (limitList, defaultLimit)
 * @returns {Object} Đối tượng dự đoán
 */
function predict(history, index = 0, options = { limitList: [1, 2, 3], defaultLimit: 3 }) {
  console.log("🚀 THUẬT TOÁN ULTRA RESPONSIVE PATTERN RECOGNITION (PHIÊN BẢN 5.2) 🚀");

  const { limitList, defaultLimit } = options;
  console.log(`📊 Phân tích với giới hạn: ${JSON.stringify(limitList)}, mặc định: ${defaultLimit}`);

  const predictionsFile = path.join(__dirname, 'predictions.json');
  const historyLogFile = path.join(__dirname, 'prediction_log.txt');

  console.log("Thư mục hiện tại:", __dirname);
  console.log("Đường dẫn đầy đủ của predictions.json:", path.join(__dirname, 'predictions.json'));

  if (!history || history.length < 1) {
    console.log("⚠️ Không có dữ liệu lịch sử, không thể dự đoán");
    return null;
  }

  // Phân tích file log để tìm chuỗi sai liên tiếp - CẢI TIẾN 5.2
  const recentResults = analyzeRecentResults(historyLogFile, 10);
  console.log(`📊 Phân tích ${recentResults.length} kết quả gần nhất`);

  // NÂNG CẤP 5.2: Kiểm tra chuỗi sai liên tiếp bằng cách đếm chính xác từ log
  const consecutiveErrors = countConsecutiveErrors(recentResults);
  console.log(`📊 Phát hiện ${consecutiveErrors} dự đoán sai liên tiếp`);

  // NÂNG CẤP 5.2: Xử lý chuỗi sai liên tiếp với ngưỡng thấp hơn (2+)
  if (consecutiveErrors >= 2) {
    console.log(`⚠️ CẢNH BÁO: Đã phát hiện ${consecutiveErrors} dự đoán sai liên tiếp!`);

    if (consecutiveErrors >= 3) {
      console.log(`🛑 KHẨN CẤP: NÊN DỪNG ĐẶT CƯỢC HOẶC ĐẢO NGƯỢC HOÀN TOÀN!`);

      // THÊM DÒNG NÀY: Xử lý dự đoán cũ trước
      processPreviousPrediction(predictionsFile, historyLogFile, history);

      // NÂNG CẤP 5.2: Phân tích mạnh mẽ hơn các kết quả gần nhất
      const recentActualResults = getRecentActualResults(recentResults, 5);
      console.log(`📊 Các kết quả thực tế gần nhất: ${recentActualResults.join(', ')}`);

      if (recentActualResults.length >= 3) {
        // Đếm số lần xuất hiện của Tài và Xỉu
        const taiCount = recentActualResults.filter(r => r === 'Tài').length;
        const xiuCount = recentActualResults.length - taiCount;

        // Nếu có xu hướng mạnh (≥70% là một loại), theo xu hướng đó
        // NÂNG CẤP 5.2: Thay đổi chiến lược - theo xu hướng mạnh thay vì đảo ngược
        if (taiCount >= recentActualResults.length * 0.7) {
          console.log(`🔄 CHIẾN LƯỢC MỚI: Phát hiện xu hướng TÀI mạnh (${taiCount}/${recentActualResults.length}), theo xu hướng!`);
          return makePrediction(true, index, history, predictionsFile, historyLogFile, "EmergencyTrend", `Theo xu hướng TÀI mạnh sau ${consecutiveErrors} dự đoán sai liên tiếp`);
        } else if (xiuCount >= recentActualResults.length * 0.7) {
          console.log(`🔄 CHIẾN LƯỢC MỚI: Phát hiện xu hướng XỈU mạnh (${xiuCount}/${recentActualResults.length}), theo xu hướng!`);
          return makePrediction(false, index, history, predictionsFile, historyLogFile, "EmergencyTrend", `Theo xu hướng XỈU mạnh sau ${consecutiveErrors} dự đoán sai liên tiếp`);
        } else {
          // Nếu không có xu hướng rõ ràng, đảo ngược kỳ gần nhất
          console.log(`🔄 CHIẾN LƯỢC MỚI: Không tìm thấy xu hướng rõ ràng, đảo ngược kỳ gần nhất`);
          const lastPrediction = getLastPredictionType(recentResults);
          return makePrediction(lastPrediction !== 'Tài', index, history, predictionsFile, historyLogFile, "EmergencyReversal", `Đảo chiều sau ${consecutiveErrors} dự đoán sai liên tiếp`);
        }
      } else {
        // Không đủ dữ liệu, đảo ngược kỳ gần nhất
        const lastPrediction = getLastPredictionType(recentResults);
        return makePrediction(lastPrediction !== 'Tài', index, history, predictionsFile, historyLogFile, "EmergencyReversal", `Đảo chiều khẩn cấp sau ${consecutiveErrors} dự đoán sai liên tiếp`);
      }
    }
  }

  // Xử lý dự đoán cũ trước khi tạo dự đoán mới
  processPreviousPrediction(predictionsFile, historyLogFile, history);
  console.log(`📈 Phân tích dựa trên ${history.length} kết quả gần nhất`);

  // NÂNG CẤP 5.2: Phân tích xu hướng mạnh trong lịch sử gần nhất
  const trendStrength = analyzeRecentTrendStrength(history, index, 5);
  if (trendStrength.strength >= 0.7) {
    console.log(`🔍 Phát hiện xu hướng ${trendStrength.type} MẠNH (${Math.round(trendStrength.strength * 100)}%)`);

    // NÂNG CẤP 5.2: Theo xu hướng mạnh thay vì đảo chiều
    return makePrediction(trendStrength.type === 'Tài', index, history, predictionsFile, historyLogFile, "FollowStrongTrend", `Theo xu hướng ${trendStrength.type} mạnh (${Math.round(trendStrength.strength * 100)}%)`);
  }

  // Kiểm tra chuỗi trong dữ liệu history
  const allHistory = history.map(item => item.numbers[index] >= 5 ? 'T' : 'X');

  // Phát hiện chuỗi mạnh (3+ kỳ giống nhau)
  let currentStreak = 1;
  for (let i = 1; i < allHistory.length && allHistory[i] === allHistory[0]; i++) {
    currentStreak++;
  }

  if (currentStreak >= 3) {
    const streakType = allHistory[0] === 'T' ? 'Tài' : 'Xỉu';
    console.log(`🔍 Phát hiện chuỗi ${streakType} mạnh (${currentStreak} kỳ liên tiếp)`);

    // NÂNG CẤP 5.2: Đảo chiều khi có chuỗi mạnh chỉ khi ≥ 4 kỳ liên tiếp
    if (currentStreak >= 4) {
      const shouldPredictTai = allHistory[0] !== 'T';
      return makePrediction(shouldPredictTai, index, history, predictionsFile, historyLogFile, "StrongStreakReversal", `Đảo chiều sau chuỗi ${streakType} mạnh (${currentStreak} kỳ liên tiếp)`);
    } else {
      // NÂNG CẤP 5.2: Với chuỗi 3 kỳ, theo xu hướng thay vì đảo chiều
      const shouldPredictTai = allHistory[0] === 'T';
      return makePrediction(shouldPredictTai, index, history, predictionsFile, historyLogFile, "FollowModerateTrend", `Theo xu hướng ${streakType} (${currentStreak} kỳ liên tiếp)`);
    }
  }

  // NÂNG CẤP 5.2: Phân tích với trọng số cao hơn
  const analysis = ultraResponsiveAnalysis(history, index, limitList, defaultLimit);
  return makePrediction(analysis.prediction, index, history, predictionsFile, historyLogFile, analysis.strategy, analysis.reason);
}

/**
 * Tạo dự đoán và lưu vào file
 * NÂNG CẤP 5.2: Hàm mới để tạo dự đoán và ghi vào file dễ dàng hơn
 */
function makePrediction(shouldPredictTai, index, history, predictionsFile, historyLogFile, strategy, reason) {
  const predictedNumbers = generateNumbers(shouldPredictTai, index);
  const newDrawId = calculateSafeNextDrawId(history[0].drawId, predictionsFile, historyLogFile);

  const prediction = {
    drawId: newDrawId,
    numbers: predictedNumbers,
    detail: {
      index: index,
      prediction: predictedNumbers[index],
      strategy: strategy,
      reason: reason
    },
    timestamp: new Date().toISOString()
  };

  try {
    fs.writeFileSync(predictionsFile, JSON.stringify(prediction, null, 2), 'utf8');
    console.log(`📊 Dự đoán: ${shouldPredictTai ? 'Tài' : 'Xỉu'} - ${reason}`);
  } catch (error) {
    console.error(`❌ Lỗi khi ghi file dự đoán: ${error.message}`);
  }

  return prediction;
}

/**
 * NÂNG CẤP 5.2: Phân tích và đếm chính xác các dự đoán sai liên tiếp
 */
function countConsecutiveErrors(results) {
  if (!results || results.length === 0) return 0;

  let count = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i].isCorrect === false) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

/**
 * NÂNG CẤP 5.2: Lấy kết quả thực tế từ các kết quả gần đây
 */
function getRecentActualResults(results, limit = 5) {
  if (!results || results.length === 0) return [];

  const actualResults = [];
  const maxResults = Math.min(limit, results.length);

  for (let i = 0; i < maxResults; i++) {
    if (results[i].actualType) {
      actualResults.push(results[i].actualType);
    }
  }

  return actualResults;
}

/**
 * NÂNG CẤP 5.2: Lấy loại dự đoán cuối cùng
 */
function getLastPredictionType(results) {
  if (!results || results.length === 0) return Math.random() > 0.5 ? 'Tài' : 'Xỉu';

  return results[0].predictedType || (Math.random() > 0.5 ? 'Tài' : 'Xỉu');
}

/**
 * NÂNG CẤP 5.2: Phân tích xu hướng mạnh trong lịch sử gần nhất
 */
function analyzeRecentTrendStrength(history, position, limit = 5) {
  const recentResults = history.slice(0, Math.min(limit, history.length));

  const taiCount = recentResults.filter(item => item.numbers[position] >= 5).length;
  const xiuCount = recentResults.length - taiCount;

  if (taiCount > xiuCount) {
    return {
      type: 'Tài',
      strength: taiCount / recentResults.length
    };
  } else {
    return {
      type: 'Xỉu',
      strength: xiuCount / recentResults.length
    };
  }
}

/**
 * NÂNG CẤP 5.2: Phân tích kết quả gần đây từ file log
 */
function analyzeRecentResults(logFile, limit = 10) {
  const results = [];

  if (!fs.existsSync(logFile)) {
    return results;
  }

  try {
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '');

    // Lấy các dòng gần nhất
    const recentLines = lines.slice(-limit);

    for (const line of recentLines) {
      const actualMatch = line.match(/Số thực tế: (\d+) \((Tài|Xỉu)\)/);
      const predictedMatch = line.match(/Số dự đoán: (\d+) \((Tài|Xỉu)\)/);
      const isCorrect = line.includes('| Đúng');

      if (actualMatch && predictedMatch) {
        results.push({
          actualNumber: parseInt(actualMatch[1]),
          actualType: actualMatch[2],
          predictedNumber: parseInt(predictedMatch[1]),
          predictedType: predictedMatch[2],
          isCorrect: isCorrect
        });
      }
    }

    // Đảo ngược mảng để các kết quả gần nhất ở đầu
    return results.reverse();
  } catch (error) {
    console.error(`❌ Lỗi khi đọc file log: ${error.message}`);
    return [];
  }
}

/**
 * Phân tích nâng cao với nhận dạng nhiều loại mẫu hình (phiên bản 5.2)
 * NÂNG CẤP 5.2: Trọng số cao hơn cho phân tích cực ngắn hạn
 */
function ultraResponsiveAnalysis(history, index, limitList = [1, 2, 3], defaultLimit = 3) {
  if (!history || history.length < 1) {
    return {
      prediction: Math.random() >= 0.5,
      strategy: "Random",
      reason: "Không đủ dữ liệu để phân tích"
    };
  }

  const allHistory = history.map(item => item.numbers[index] >= 5 ? 'T' : 'X');
  console.log(`Chuỗi kết quả: ${allHistory.slice(0, Math.min(allHistory.length, defaultLimit)).join('')}`);

  const shortLimit = Math.min(limitList[0] || 1, allHistory.length);  // Siêu ngắn (1 kỳ)
  const mediumLimit = Math.min(limitList[1] || 2, allHistory.length); // Cực ngắn (2 kỳ)
  const longLimit = Math.min(limitList[2] || 3, allHistory.length);   // Ngắn (3 kỳ)

  // Với 1 kỳ, chọn ngược lại với kỳ đầu tiên (chống hiện tượng trụ)
  if (allHistory.length === 1) {
    const firstResult = allHistory[0];
    return {
      prediction: firstResult !== 'T',
      strategy: "FirstOpposite",
      reason: `Chọn đối lập với kết quả đầu tiên (${firstResult === 'T' ? 'Tài' : 'Xỉu'})`
    };
  }

  // Đánh giá 3 kỳ gần nhất với trọng số nâng cao
  if (allHistory.length >= 3) {
    // NÂNG CẤP 5.2: Tăng trọng số cho kỳ gần nhất - 0.9, giảm cho các kỳ cũ
    const weightedAnalysis = weightedShortTrend(allHistory.slice(0, 3), [0.9, 0.07, 0.03]);
    if (weightedAnalysis.detected) {
      return {
        prediction: weightedAnalysis.nextIsTai,
        strategy: "WeightedTrend",
        reason: weightedAnalysis.reason
      };
    }
  }

  // NÂNG CẤP 5.2: Phát hiện làn sóng trong 3 kỳ gần nhất
  const wave = detectWave(allHistory.slice(0, Math.min(5, allHistory.length)));
  if (wave.detected) {
    return {
      prediction: wave.nextIsTai,
      strategy: "WavePattern",
      reason: wave.reason
    };
  }

  // Phân tích cơ bản 1-3 kỳ
  if (allHistory.length >= 2) {
    const taiCount = allHistory.slice(0, longLimit).filter(r => r === 'T').length;
    const xiuCount = longLimit - taiCount;

    // NÂNG CẤP 5.2: Tinh chỉnh ngưỡng nhạy của xu hướng
    if (taiCount > xiuCount * 1.5) { // Tài chiếm ưu thế rõ rệt
      return {
        prediction: true, // NÂNG CẤP 5.2: Theo xu hướng mạnh thay vì đảo chiều
        strategy: "FollowStrongTrend",
        reason: `Theo xu hướng mạnh Tài (${taiCount}/${longLimit})`
      };
    } else if (xiuCount > taiCount * 1.5) { // Xỉu chiếm ưu thế rõ rệt
      return {
        prediction: false, // NÂNG CẤP 5.2: Theo xu hướng mạnh thay vì đảo chiều
        strategy: "FollowStrongTrend",
        reason: `Theo xu hướng mạnh Xỉu (${xiuCount}/${longLimit})`
      };
    } else if (taiCount > xiuCount) { // Nhẹ về Tài
      return {
        prediction: true, // NÂNG CẤP 5.2: Theo xu hướng nhẹ
        strategy: "FollowTrend",
        reason: `Theo xu hướng nhẹ Tài (${taiCount}/${longLimit})`
      };
    } else if (xiuCount > taiCount) { // Nhẹ về Xỉu
      return {
        prediction: false, // NÂNG CẤP 5.2: Theo xu hướng nhẹ
        strategy: "FollowTrend",
        reason: `Theo xu hướng nhẹ Xỉu (${xiuCount}/${longLimit})`
      };
    } else { // Cân bằng hoàn toàn
      return {
        prediction: allHistory[0] !== 'T', // Đối lập với kỳ gần nhất
        strategy: "BalancedOpposite",
        reason: `Xu hướng cân bằng, chọn đối lập kỳ gần nhất`
      };
    }
  }

  // Mặc định nếu tất cả các phân tích thất bại
  return {
    prediction: Math.random() >= 0.5,
    strategy: "Random",
    reason: "Không xác định được xu hướng rõ ràng"
  };
}

/**
 * NÂNG CẤP 5.2: Phát hiện mẫu hình sóng (T-X-T hoặc X-T-X)
 */
function detectWave(results) {
  if (results.length < 3) {
    return { detected: false };
  }

  // Kiểm tra mẫu hình T-X-T
  if (results[0] === 'T' && results[1] === 'X' && results[2] === 'T') {
    return {
      detected: true,
      nextIsTai: false,
      reason: 'Phát hiện mẫu hình sóng T-X-T, dự đoán tiếp theo là X'
    };
  }

  // Kiểm tra mẫu hình X-T-X
  if (results[0] === 'X' && results[1] === 'T' && results[2] === 'X') {
    return {
      detected: true,
      nextIsTai: true,
      reason: 'Phát hiện mẫu hình sóng X-T-X, dự đoán tiếp theo là T'
    };
  }

  return { detected: false };
}

/**
 * Phân tích xu hướng ngắn với trọng số
 * NÂNG CẤP 5.2: Tăng trọng số cho kỳ gần nhất
 */
function weightedShortTrend(results, weights = [0.9, 0.07, 0.03]) {
  if (results.length < weights.length) {
    return { detected: false };
  }

  // Tính điểm xu hướng với trọng số (1 = Tài, 0 = Xỉu)
  let weightedScore = 0;
  for (let i = 0; i < weights.length; i++) {
    weightedScore += (results[i] === 'T' ? 1 : 0) * weights[i];
  }

  // NÂNG CẤP 5.2: Điều chỉnh ngưỡng phát hiện (0.65->0.70, 0.35->0.30)
  if (weightedScore >= 0.70) {
    return {
      detected: true,
      nextIsTai: true, // NÂNG CẤP 5.2: Theo xu hướng thay vì đảo chiều
      reason: `Xu hướng có trọng số thiên Tài (${Math.round(weightedScore * 100)}%), dự đoán theo xu hướng`
    };
  } else if (weightedScore <= 0.30) {
    return {
      detected: true,
      nextIsTai: false, // NÂNG CẤP 5.2: Theo xu hướng thay vì đảo chiều
      reason: `Xu hướng có trọng số thiên Xỉu (${Math.round((1 - weightedScore) * 100)}%), dự đoán theo xu hướng`
    };
  }

  return { detected: false };
}

/**
 * Xử lý dự đoán trước đó và ghi log kết quả
 * NÂNG CẤP 5.2: Thêm tham số predictLogFile
 */
function processPreviousPrediction(predictionsFile, historyLogFile, history) {
  if (fs.existsSync(predictionsFile)) {
    console.log("✅ File predictions.json tồn tại");
    try {
      const oldPrediction = JSON.parse(fs.readFileSync(predictionsFile, 'utf8'));
      console.log(`Đang tìm kết quả thực tế cho drawId: ${oldPrediction.drawId}`);
      console.log(`History có ${history.length} kết quả, drawId đầu tiên: ${history[0].drawId}`);
      
      // Tìm kết quả thực tế tương ứng với dự đoán cũ
      let actualResult = history.find(item => item.drawId === oldPrediction.drawId);
      
      // THÊM: Tìm kết quả có drawId nhỏ hơn (cũ hơn) để đảm bảo luôn ghi log
      if (!actualResult && history.length > 0) {
        // Sắp xếp lịch sử theo DrawID giảm dần
        const sortedHistory = [...history].sort((a, b) => 
          parseInt(b.drawId) - parseInt(a.drawId));
        
        // Lấy kết quả đầu tiên có drawId <= oldPrediction.drawId
        for (const item of sortedHistory) {
          if (parseInt(item.drawId) <= parseInt(oldPrediction.drawId)) {
            actualResult = item;
            console.log(`⚠️ Không tìm thấy drawId chính xác. Sử dụng kết quả gần nhất: ${actualResult.drawId}`);
            break;
          }
        }
      }

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
        const logLine = `Chu kỳ | ${actualResult.drawId} | ${timestamp} | Số thực tế: ${actualNumber} (${actualType}) | Số dự đoán: ${predictedNumber} (${predictedType}) | Vị trí: ${pos} | ${isCorrect ? "Đúng" : "Sai"}\n`;

        // NÂNG CẤP 5.2: Cải tiến cách ghi log file
        try {
          // Ghi vào file log
          fs.appendFileSync(historyLogFile, logLine, 'utf8');
          console.log(`✅ Đã ghi log thành công vào ${historyLogFile}`);
        } catch (error) {
          console.error(`❌ Lỗi ghi file: ${error.message}`);
        }

        // Hiển thị kết quả
        console.log(`Kết quả dự đoán trước: ${isCorrect ? "✅ ĐÚNG" : "❌ SAI"}`);
        console.log(`Thực tế: ${actualNumber} (${actualType}), Dự đoán: ${predictedNumber} (${predictedType})`);

        // Phân tích tỷ lệ đúng/sai gần đây
        analyzeRecentAccuracy(historyLogFile);

        // Thống kê mẫu hình
        statisticsAnalysis(historyLogFile);
      } else {
        console.log("⚠️ Không tìm thấy kết quả thực tế cho dự đoán, bỏ qua chu kỳ này");
      }
    } catch (error) {
      console.error('Error:', error);
    }
  } else {
    console.log("❌ File predictions.json không tồn tại tại đường dẫn:", predictionsFile);
    // Thử tìm file ở thư mục hiện tại
    const altPath = './predictions.json';
    if (fs.existsSync(altPath)) {
      console.log("✅ Nhưng file tồn tại ở đường dẫn tương đối:", altPath);
      predictionsFile = altPath;
    }
  }
}

/**
 * Phân tích tỷ lệ đúng/sai gần đây
 */
function analyzeRecentAccuracy(historyLogFile) {
  try {
    if (fs.existsSync(historyLogFile)) {
      const logContent = fs.readFileSync(historyLogFile, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim() !== '');

      // Đếm số dự đoán đúng/sai trong 10 kỳ gần nhất
      const recent = logLines.slice(Math.max(0, logLines.length - 10));
      const correctCount = recent.filter(line => line.includes('Đúng')).length;

      console.log(`Tỷ lệ đúng (10 kỳ gần nhất): ${correctCount}/${recent.length} (${Math.round(correctCount / recent.length * 100)}%)`);

      // Kiểm tra xu hướng hiệu suất
      if (recent.length >= 5) {
        const recent5 = recent.slice(Math.max(0, recent.length - 5));
        const correct5 = recent5.filter(line => line.includes('Đúng')).length;
        console.log(`Tỷ lệ đúng (5 kỳ gần nhất): ${correct5}/${recent5.length} (${Math.round(correct5 / recent5.length * 100)}%)`);
      }
    }
  } catch (error) {
    console.error('Error analyzing accuracy:', error);
  }
}

/**
 * Thống kê phân tích mẫu hình từ dữ liệu lịch sử
 */
function statisticsAnalysis(historyLogFile) {
  try {
    if (fs.existsSync(historyLogFile)) {
      const logContent = fs.readFileSync(historyLogFile, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim() !== '');
      // Thống kê 15 kỳ gần nhất
      if (logLines.length >= 15) {
        const recent15 = logLines.slice(Math.max(0, logLines.length - 15));
        const taiActual = recent15.filter(line => line.includes('thực tế:') && line.includes('(Tài)')).length;
        const xiuActual = recent15.length - taiActual;
        console.log(`\n ===== THỐNG KÊ PHÂN TÍCH(15 kỳ gần nhất) =====`);
        console.log(`Tỷ lệ thực tế: Tài ${Math.round(taiActual / recent15.length * 100)} %, Xỉu ${Math.round(xiuActual / recent15.length * 100)} %`);
        // Phân tích mẫu hình liên tiếp
        let maxTaiStreak = 0, maxXiuStreak = 0;
        let currentTaiStreak = 0, currentXiuStreak = 0;
        const recentResults = recent15.map(line => {
          const match = line.match(/Số thực tế: \d+ \((Tài|Xỉu)\)/);
          return match ? match[1] : null;
        }).filter(Boolean);
        for (let i = 0; i < recentResults.length; i++) {
          if (recentResults[i] === 'Tài') {
            currentTaiStreak++;
            currentXiuStreak = 0;
            if (currentTaiStreak > maxTaiStreak) maxTaiStreak = currentTaiStreak;
          } else {
            currentXiuStreak++;
            currentTaiStreak = 0;
            if (currentXiuStreak > maxXiuStreak) maxXiuStreak = currentXiuStreak;
          }
        }
        console.log(`Chuỗi dài nhất: ${maxTaiStreak} Tài, ${maxXiuStreak} Xỉu`);

        // NÂNG CẤP 5.2: Sửa lỗi tính toán tỷ lệ "trụ"
        let taiAfterTai = 0, totalAfterTai = 0;
        let xiuAfterXiu = 0, totalAfterXiu = 0;
        for (let i = 1; i < recentResults.length; i++) {
          if (recentResults[i - 1] === 'Tài') {
            totalAfterTai++;
            if (recentResults[i] === 'Tài') taiAfterTai++;
          } else {
            totalAfterXiu++;
            if (recentResults[i] === 'Xỉu') xiuAfterXiu++;
          }
        }

        // Tính toán tỷ lệ "trụ"
        const taiTruRate = totalAfterTai > 0 ? Math.round(taiAfterTai / totalAfterTai * 100) : 0;
        const xiuTruRate = totalAfterXiu > 0 ? Math.round(xiuAfterXiu / totalAfterXiu * 100) : 0;
        console.log(`Hiệu ứng "trụ": Tài sau Tài ${taiTruRate} %, Xỉu sau Xỉu ${xiuTruRate} %`);
        console.log(`===========================================`);
      }
    }
  } catch (error) {
    console.error('Error in statistics:', error);
  }
}

/**
 * Tính toán DrawID tiếp theo và đảm bảo không bị trùng lặp
 */
function calculateSafeNextDrawId(currentDrawId, predictionsFile, historyLogFile) {
  // Tính DrawID tiếp theo dự kiến
  const nextDrawId = calculateNextDrawId(currentDrawId);

  // Kiểm tra với predictions.json
  let lastPredictionDrawId = null;
  if (fs.existsSync(predictionsFile)) {
    try {
      const lastPrediction = JSON.parse(fs.readFileSync(predictionsFile, 'utf8'));
      lastPredictionDrawId = lastPrediction.drawId;
    } catch (error) {
      console.error('Lỗi đọc file predictions.json:', error);
    }
  }

  // Kiểm tra với prediction_log.txt
  let maxLogDrawId = null;
  if (fs.existsSync(historyLogFile)) {
    try {
      const logContent = fs.readFileSync(historyLogFile, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim() !== '');

      // Tìm DrawID lớn nhất trong log
      for (const line of logLines) {
        const match = line.match(/Chu kỳ \| (\d+) \|/);
        if (match && match[1]) {
          const drawId = match[1];
          if (!maxLogDrawId || parseInt(drawId) > parseInt(maxLogDrawId)) {
            maxLogDrawId = drawId;
          }
        }
      }
    } catch (error) {
      console.error('Lỗi đọc file prediction_log.txt:', error);
    }
  }

  // So sánh và đảm bảo DrawID mới lớn hơn cả hai giá trị
  const numericNext = parseInt(nextDrawId);

  if (lastPredictionDrawId && numericNext <= parseInt(lastPredictionDrawId)) {
    console.log(`⚠️ DrawID ${nextDrawId} <= lastPrediction ${lastPredictionDrawId}, tăng thêm 1`);
    const numericPart = parseInt(lastPredictionDrawId.slice(-4)) + 1;
    const prefix = lastPredictionDrawId.slice(0, -4);
    return prefix + numericPart.toString().padStart(4, '0');
  }

  if (maxLogDrawId && numericNext <= parseInt(maxLogDrawId)) {
    console.log(`⚠️ DrawID ${nextDrawId} <= maxLogDrawId ${maxLogDrawId}, tăng thêm 1`);
    const numericPart = parseInt(maxLogDrawId.slice(-4)) + 1;
    const prefix = maxLogDrawId.slice(0, -4);
    return prefix + numericPart.toString().padStart(4, '0');
  }

  return nextDrawId;
}

/**
 * Tính toán DrawID tiếp theo từ DrawID hiện tại
 */
function calculateNextDrawId(currentDrawId) {
  const numericPart = parseInt(currentDrawId.slice(-4));
  const prefix = currentDrawId.slice(0, -4);
  const nextNumeric = numericPart + 1;
  return prefix + nextNumeric.toString().padStart(4, '0');
}

/**
 * Tạo mảng các số dự đoán với giá trị Tài / Xỉu tại vị trí chỉ định
 */
function generateNumbers(shouldPredictTai, index) {
  // Lấy kích thước mảng từ history[0] nếu có
  const arraySize = 5; // Đổi thành 5 để khớp với dữ liệu
  
  const predictedNumbers = [];
  for (let i = 0; i < arraySize; i++) {
    if (i === index) {
      predictedNumbers.push(shouldPredictTai
        ? 5 + Math.floor(Math.random() * 5) // Tài (5-9)
        : Math.floor(Math.random() * 5)); // Xỉu (0-4)
    } else {
      predictedNumbers.push(Math.floor(Math.random() * 10));
    }
  }
  return predictedNumbers;
}

module.exports = predict;
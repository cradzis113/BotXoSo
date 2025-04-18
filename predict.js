const fs = require('fs');
const path = require('path');

/**
 * Dự đoán Tài Xỉu với thuật toán nhận dạng mẫu hình siêu phản ứng (phiên bản 4.1)
 * @param {Array} history - Mảng lịch sử kết quả
 * @param {Number} index - Vị trí trong mảng numbers cần dự đoán
 * @returns {Object} Đối tượng dự đoán
 */
function predict(history, index = 0) {
  console.log("🚀 THUẬT TOÁN ULTRA RESPONSIVE PATTERN RECOGNITION (PHIÊN BẢN 4.1) 🚀");

  // Đường dẫn đến các file
  const predictionsFile = path.join(__dirname, 'predictions.json');
  const historyLogFile = path.join(__dirname, 'prediction_log.txt');

  // Kiểm tra dự đoán cũ và ghi log nếu có kết quả thực tế
  processPreviousPrediction(predictionsFile, historyLogFile, history);

  // Phân tích mẫu hình và quyết định dự đoán
  const analysis = ultraResponsiveAnalysis(history, index, historyLogFile);
  let shouldPredictTai = analysis.prediction;

  // Tạo mảng numbers với giá trị Tài/Xỉu tại vị trí chỉ định
  const predictedNumbers = generateNumbers(shouldPredictTai, index);

  // Tạo dự đoán mới
  const prediction = {
    drawId: calculateNextDrawId(history[0].drawId),
    numbers: predictedNumbers,
    detail: {
      index: index,
      prediction: predictedNumbers[index],
      strategy: analysis.strategy,
      reason: analysis.reason
    },
    timestamp: new Date().toISOString()
  };

  // Lưu dự đoán mới
  fs.writeFileSync(predictionsFile, JSON.stringify(prediction, null, 2), 'utf8');

  console.log(`📊 Dự đoán: ${shouldPredictTai ? 'Tài' : 'Xỉu'} - ${analysis.reason}`);

  return prediction;
}

/**
 * Phân tích nâng cao với nhận dạng nhiều loại mẫu hình (phiên bản 4.1)
 */
function ultraResponsiveAnalysis(history, index, historyLogFile) {
  if (!history || history.length < 2) {
    return {
      prediction: Math.random() >= 0.5,
      strategy: "Random",
      reason: "Không đủ dữ liệu để phân tích"
    };
  }

  // Lấy chuỗi kết quả gần nhất (15 kết quả)
  const recent = history.slice(0, Math.min(15, history.length))
    .map(item => item.numbers[index] >= 5 ? 'T' : 'X');
  console.log(`Chuỗi kết quả gần đây: ${recent.join('')}`);

  // -1. KIỂM TRA NẾU CẦN BUỘC THAY ĐỔI DỰ ĐOÁN (CHỨC NĂNG MỚI 4.1)
  const forceBreak = detectForcedBreakNeeded(historyLogFile);
  if (forceBreak.detected) {
    return {
      prediction: forceBreak.nextIsTai,
      strategy: "ForceBreak",
      reason: forceBreak.reason
    };
  }

  // 0. PHÁT HIỆN THẤT BẠI LIÊN TIẾP VÀ ĐẢO CHIỀU KHẨN CẤP (CẢI TIẾN 4.1)
  const emergencyReversal = detectConsecutiveFailures(historyLogFile);
  if (emergencyReversal.detected) {
    return {
      prediction: emergencyReversal.nextIsTai,
      strategy: "EmergencyReversal",
      reason: emergencyReversal.reason
    };
  }

  // 1. PHÁT HIỆN CHUỖI TÀI MẠNH (ƯU TIÊN CAO NHẤT)
  const strongTaiStreak = detectStrongTaiStreak(recent);
  if (strongTaiStreak.detected) {
    return {
      prediction: strongTaiStreak.nextIsTai,
      strategy: "StrongTaiStreak",
      reason: strongTaiStreak.reason
    };
  }

  // 2. PHÁT HIỆN CÂN BẰNG TÀI/XỈU
  const balanceDetection = detectBalanceRatio(recent);
  if (balanceDetection.detected) {
    return {
      prediction: balanceDetection.nextIsTai,
      strategy: "BalanceDetection",
      reason: balanceDetection.reason
    };
  }

  // 3. PHÁT HIỆN MẪU HÌNH XEN KẼ
  const alternatingPattern = detectAlternatingPattern(recent);
  if (alternatingPattern.detected) {
    return {
      prediction: alternatingPattern.nextIsTai,
      strategy: "AlternatingPattern",
      reason: alternatingPattern.reason
    };
  }

  // 4. PHÁT HIỆN MẪU "TÀI ĐUÔI"
  const tailPattern = detectTailPattern(recent);
  if (tailPattern.detected) {
    return {
      prediction: tailPattern.nextIsTai,
      strategy: "TailPattern",
      reason: tailPattern.reason
    };
  }

  // 5. PHÁT HIỆN CHUỖI DÀI CÙNG LOẠI (TỐI ƯU 4.1)
  const streak = detectStreak(recent);
  if (streak.detected) {
    return {
      prediction: streak.nextIsTai,
      strategy: "StreakDetection",
      reason: streak.reason
    };
  }

  // 6. PHÁT HIỆN THAY ĐỔI ĐÁNG KỂ
  const changeDetection = detectSignificantChange(recent);
  if (changeDetection.detected) {
    return {
      prediction: changeDetection.nextIsTai,
      strategy: "ChangeDetection",
      reason: changeDetection.reason
    };
  }

  // 7. PHÂN TÍCH TRỌNG SỐ THEO GẦN XA
  const weightedAnalysis = analyzeWithWeights(recent, 10);
  const taiPercentage = weightedAnalysis.weightedTaiPercentage;

  if (taiPercentage >= 55) {
    return {
      prediction: true,
      strategy: "WeightedAnalysis",
      reason: `Xu hướng Tài với trọng số ${taiPercentage}%`
    };
  } else if (taiPercentage <= 45) {
    return {
      prediction: false,
      strategy: "WeightedAnalysis",
      reason: `Xu hướng Xỉu với trọng số ${100 - taiPercentage}%`
    };
  }

  // 8. XỬ LÝ THEO CHUỖI 2 KẾT QUẢ GẦN NHẤT
  if (recent[0] === recent[1]) {
    // Nếu 2 kết quả gần nhất giống nhau, xem xét tiếp tục xu hướng
    if (recent[0] === 'T') {
      // Hai Tài liên tiếp, khả năng cao là tiếp tục Tài
      return {
        prediction: true,
        strategy: "RecentPairAnalysis",
        reason: "Hai kết quả Tài liên tiếp, dự đoán tiếp tục Tài"
      };
    } else {
      // Hai Xỉu liên tiếp
      const xiuCount = recent.slice(0, 5).filter(r => r === 'X').length;
      const taiCount = 5 - xiuCount;

      if (xiuCount >= 4) {
        return {
          prediction: false, // Tiếp tục Xỉu khi xu hướng Xỉu mạnh
          strategy: "RecentPairAnalysis",
          reason: "Xu hướng Xỉu mạnh (4/5 kết quả), tiếp tục dự đoán Xỉu"
        };
      } else if (taiCount >= 3) {
        return {
          prediction: true, // Đảo chiều sang Tài
          strategy: "RecentPairAnalysis",
          reason: "Hai kết quả Xỉu liên tiếp, nhưng xu hướng Tài vẫn mạnh, dự đoán đảo chiều sang Tài"
        };
      } else {
        // Cân bằng hơn - tùy thuộc vào kết quả thứ 3
        return {
          prediction: recent[2] === 'X',
          strategy: "RecentPairAnalysis",
          reason: `Hai kết quả Xỉu liên tiếp, dự đoán ngược với kết quả thứ 3 (${recent[2]})`
        };
      }
    }
  }

  // 9. PHẢN ỨNG NHANH VỚI KẾT QUẢ MỚI NHẤT VÀ XU HƯỚNG HIỆN TẠI
  const taiCount = recent.slice(0, 3).filter(r => r === 'T').length;
  const xiuCount = 3 - taiCount;

  if (taiCount > xiuCount) {
    return {
      prediction: true,
      strategy: "RecentTrendAnalysis",
      reason: `Xu hướng Tài trong 3 kỳ gần nhất (${taiCount}/3)`
    };
  } else if (xiuCount > taiCount) {
    return {
      prediction: false,
      strategy: "RecentTrendAnalysis",
      reason: `Xu hướng Xỉu trong 3 kỳ gần nhất (${xiuCount}/3)`
    };
  }

  // 10. CUỐI CÙNG: DỰA TRÊN KẾT QUẢ MỚI NHẤT VÀ "TRỤ"
  const trụFactor = 0.65; // Thiên vị về phía lặp lại kết quả gần nhất

  return {
    prediction: recent[0] === 'T',
    strategy: "EnhancedFollowRecent",
    reason: `Theo kết quả mới nhất với yếu tố trụ: ${recent[0] === 'T' ? 'Tài' : 'Xỉu'}`
  };
}

/**
 * Kiểm tra nếu cần buộc thay đổi dự đoán sau nhiều lần dự đoán liên tiếp cùng loại (CHỨC NĂNG MỚI 4.1)
 */
function detectForcedBreakNeeded(logFile) {
  try {
    if (fs.existsSync(logFile)) {
      const logContent = fs.readFileSync(logFile, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim() !== '');

      // Lấy 6 kết quả gần nhất
      const recent = logLines.slice(Math.max(0, logLines.length - 6));

      // Đếm số dự đoán cùng loại liên tiếp
      let consecutiveTai = 0;
      let consecutiveXiu = 0;

      for (let i = 0; i < recent.length; i++) {
        if (recent[i].includes('Số dự đoán:')) {
          if (recent[i].includes('(Tài)')) {
            consecutiveTai++;
            consecutiveXiu = 0;
          } else if (recent[i].includes('(Xỉu)')) {
            consecutiveXiu++;
            consecutiveTai = 0;
          }
        } else {
          break;
        }
      }

      // Nếu dự đoán cùng một loại quá 4 lần liên tiếp, buộc phải đổi
      if (consecutiveTai >= 4) {
        console.log(`⚠️ Phát hiện ${consecutiveTai} dự đoán Tài liên tiếp - cần phá vỡ chuỗi!`);
        return {
          detected: true,
          nextIsTai: false,
          reason: "BREAK PATTERN: Quá nhiều dự đoán Tài liên tiếp, buộc phải đổi sang Xỉu"
        };
      } else if (consecutiveXiu >= 4) {
        console.log(`⚠️ Phát hiện ${consecutiveXiu} dự đoán Xỉu liên tiếp - cần phá vỡ chuỗi!`);
        return {
          detected: true,
          nextIsTai: true,
          reason: "BREAK PATTERN: Quá nhiều dự đoán Xỉu liên tiếp, buộc phải đổi sang Tài"
        };
      }
    }
  } catch (error) {
    console.error('Error in force break detection:', error);
  }

  return { detected: false };
}

/**
 * Phát hiện dự đoán sai liên tiếp và đảo chiều khẩn cấp (CẢI TIẾN 4.1)
 */
function detectConsecutiveFailures(logFile) {
  try {
    console.log("🔍 Đang kiểm tra thất bại liên tiếp từ file: " + logFile);
    if (fs.existsSync(logFile)) {
      const logContent = fs.readFileSync(logFile, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim() !== '');
      console.log(`📋 Đọc được ${logLines.length} dòng từ file log`);

      // Lấy 5 kết quả gần nhất
      const recent = logLines.slice(Math.max(0, logLines.length - 5));

      // Đếm số dự đoán sai liên tiếp từ kết quả mới nhất
      let consecutiveFails = 0;
      let lastPrediction = "";

      for (let i = 0; i < recent.length; i++) {
        if (recent[i].includes(' Sai')) {
          consecutiveFails++;
          if (i === 0) {
            // Lưu loại dự đoán của kỳ gần nhất
            const match = recent[i].match(/Số dự đoán: \d+ \((Tài|Xỉu)\)/);
            lastPrediction = match ? match[1] : '';
          }
        } else {
          break;
        }
      }

      console.log(`🔢 Phát hiện ${consecutiveFails} dự đoán sai liên tiếp, dự đoán gần nhất: ${lastPrediction}`);

      // CẢI TIẾN 4.1: Phản ứng nhanh hơn với dự đoán Xỉu sai trong xu hướng Tài mạnh
      if (consecutiveFails >= 2 && lastPrediction === 'Xỉu') {
        // Kiểm tra thêm xu hướng thực tế
        const recentResults = recent.map(line => {
          const match = line.match(/Số thực tế: \d+ \((Tài|Xỉu)\)/);
          return match ? match[1] : null;
        }).filter(Boolean);

        // Nếu 2 kết quả gần nhất đều là Tài và dự đoán Xỉu, đảo chiều ngay
        if (recentResults.length >= 2 && recentResults[0] === 'Tài' && recentResults[1] === 'Tài') {
          console.log(`⚠️ Phát hiện 2 dự đoán Xỉu sai liên tiếp khi xu hướng Tài mạnh!`);
          return {
            detected: true,
            nextIsTai: true,
            reason: `KHẨN CẤP: Đảo chiều sau ${consecutiveFails} dự đoán Xỉu sai, phát hiện xu hướng Tài mạnh`
          };
        }
      }

      // CẢI TIẾN 4.1: Giảm ngưỡng đảo chiều khẩn cấp xuống 2 lần sai
      if (consecutiveFails >= 2) {
        console.log(`⚠️ Kích hoạt đảo chiều khẩn cấp sau ${consecutiveFails} dự đoán sai!`);
        return {
          detected: true,
          nextIsTai: lastPrediction === 'Xỉu', // Đảo ngược dự đoán gần nhất
          reason: `KHẨN CẤP: Đảo chiều sau ${consecutiveFails} dự đoán sai liên tiếp`
        };
      }
    } else {
      console.log("⚠️ CẢNH BÁO: Không tìm thấy file log để phân tích thất bại!");
    }
  } catch (error) {
    console.error('Error in detecting failures:', error);
  }

  return { detected: false };
}

/**
 * Phát hiện chuỗi Tài mạnh - ưu tiên cao
 */
function detectStrongTaiStreak(results) {
  // Đếm số Tài trong 5 kỳ gần nhất
  const taiInRecent5 = results.slice(0, 5).filter(r => r === 'T').length;

  // Phát hiện chuỗi Tài cực mạnh (4-5/5 là Tài)
  if (taiInRecent5 >= 4) {
    // Kiểm tra xem có ít nhất 2 Tài liên tiếp gần đây
    if (results[0] === 'T' && (results[1] === 'T' || taiInRecent5 >= 4)) {
      return {
        detected: true,
        nextIsTai: true,
        reason: `Chuỗi Tài mạnh (${taiInRecent5}/5 gần đây là Tài), nên tiếp tục Tài`
      };
    }
  }

  // Phát hiện chuỗi Tài mạnh nhưng vừa chuyển sang Xỉu (đảo chiều trở lại Tài)
  if (taiInRecent5 >= 3 && results[0] === 'X' && results[1] === 'T' && results[2] === 'T') {
    return {
      detected: true,
      nextIsTai: true,
      reason: "Xu hướng Tài mạnh vừa bị gián đoạn bởi 1 Xỉu, dự đoán quay lại Tài"
    };
  }

  return { detected: false };
}

/**
 * Phát hiện tỷ lệ mất cân bằng Tài/Xỉu
 */
function detectBalanceRatio(results) {
  // Tính tỷ lệ trong 10 kết quả gần nhất
  const recentTen = results.slice(0, Math.min(10, results.length));
  const taiCount = recentTen.filter(r => r === 'T').length;
  const xiuCount = recentTen.length - taiCount;

  // Nếu có sự mất cân bằng lớn
  if (taiCount >= 6) {
    // Quá nhiều Tài (60%+) trong lịch sử gần đây

    // Kiểm tra xu hướng gần nhất - nếu 2 kỳ gần nhất đều là Tài, có thể tiếp tục Tài
    if (results[0] === 'T' && results[1] === 'T') {
      return {
        detected: true,
        nextIsTai: true,
        reason: `Mất cân bằng ${taiCount}/${recentTen.length} Tài nhưng xu hướng mạnh, tiếp tục Tài`
      };
    }

    return {
      detected: true,
      nextIsTai: false,
      reason: `Phát hiện mất cân bằng: ${taiCount}/${recentTen.length} Tài - dự đoán xu hướng đảo chiều`
    };
  } else if (xiuCount >= 6) {
    // Quá nhiều Xỉu (60%+) trong lịch sử gần đây
    // Theo thống kê, tỷ lệ sẽ cân bằng trở lại
    return {
      detected: true,
      nextIsTai: true,
      reason: `Phát hiện mất cân bằng: ${xiuCount}/${recentTen.length} Xỉu - dự đoán xu hướng đảo chiều`
    };
  }

  return { detected: false };
}

/**
 * Phát hiện mẫu hình xen kẽ Tài/Xỉu
 */
function detectAlternatingPattern(results) {
  // Mẫu T-X-T-X hoặc X-T-X-T
  if (results.length >= 4) {
    // Mẫu T-X-T-X -> tiếp theo sẽ là T
    if (results[0] === 'X' && results[1] === 'T' && results[2] === 'X' && results[3] === 'T') {
      return {
        detected: true,
        nextIsTai: false,
        reason: "Mẫu hình Xỉu-Tài-Xỉu-Tài, dự đoán tiếp theo là Xỉu"
      };
    }

    // Mẫu X-T-X-T -> tiếp theo sẽ là X
    if (results[0] === 'T' && results[1] === 'X' && results[2] === 'T' && results[3] === 'X') {
      return {
        detected: true,
        nextIsTai: true,
        reason: "Mẫu hình Tài-Xỉu-Tài-Xỉu, dự đoán tiếp theo là Tài"
      };
    }

    // Mẫu T-T-X-X -> tiếp theo sẽ là T
    if (results[0] === 'X' && results[1] === 'X' && results[2] === 'T' && results[3] === 'T') {
      return {
        detected: true,
        nextIsTai: false,
        reason: "Mẫu nhóm 2 (Xỉu-Xỉu-Tài-Tài), dự đoán tiếp theo là Xỉu"
      };
    }

    // Mẫu X-X-T-T -> tiếp theo sẽ là X
    if (results[0] === 'T' && results[1] === 'T' && results[2] === 'X' && results[3] === 'X') {
      return {
        detected: true,
        nextIsTai: true,
        reason: "Mẫu nhóm 2 (Tài-Tài-Xỉu-Xỉu), dự đoán tiếp theo là Tài"
      };
    }
  }

  return { detected: false };
}

/**
 * Phát hiện mẫu "Tài đuôi"
 */
function detectTailPattern(results) {
  // Yêu cầu ít nhất 5 kết quả để phân tích
  if (results.length < 5) return { detected: false };

  // Kiểm tra mẫu T-X-T-X-T hoặc X-T-X-T-X
  const firstFive = results.slice(0, 5).join('');

  // Mẫu "TXTXT" - dự đoán tiếp theo là X
  if (firstFive === "TXTXT") {
    return {
      detected: true,
      nextIsTai: false,
      reason: "Phát hiện mẫu Tài-Xỉu-Tài-Xỉu-Tài, dự đoán tiếp theo là Xỉu"
    };
  }

  // Mẫu "XTXTX" - dự đoán tiếp theo là T
  if (firstFive === "XTXTX") {
    return {
      detected: true,
      nextIsTai: true,
      reason: "Phát hiện mẫu Xỉu-Tài-Xỉu-Tài-Xỉu, dự đoán tiếp theo là Tài"
    };
  }

  return { detected: false };
}

/**
 * Phát hiện chuỗi dài cùng loại (TỐI ƯU 4.1)
 */
function detectStreak(results) {
  // Đếm số kết quả giống nhau liên tiếp
  let streak = 1;
  for (let i = 1; i < results.length; i++) {
    if (results[i] === results[0]) {
      streak++;
    } else {
      break;
    }
  }

  // Nếu có 2+ kết quả giống nhau liên tiếp
  if (streak >= 2) {
    // Xử lý khác nhau cho chuỗi Tài và chuỗi Xỉu
    if (results[0] === 'T') {
      // Nếu có 3+ Tài liên tiếp
      if (streak >= 3) {
        // Với 3-4 Tài, khả năng cao là tiếp tục Tài
        if (streak < 5) {
          return {
            detected: true,
            nextIsTai: true,
            reason: `Phát hiện ${streak} Tài liên tiếp, dự đoán tiếp tục Tài`
          };
        } else {
          // Sau 5+ Tài liên tiếp, thường sẽ đảo chiều
          return {
            detected: true,
            nextIsTai: false,
            reason: `Phát hiện ${streak} Tài liên tiếp, dự đoán đảo chiều sang Xỉu`
          };
        }
      } else {
        // 2 Tài liên tiếp, thường tiếp tục xu hướng
        return {
          detected: true,
          nextIsTai: true,
          reason: `Phát hiện ${streak} Tài liên tiếp, dự đoán tiếp tục Tài`
        };
      }
    } else {
      // Nếu có 2+ kết quả Xỉu liên tiếp
      if (streak >= 4) {
        // Sau 4+ Xỉu liên tiếp, thường sẽ đảo chiều
        return {
          detected: true,
          nextIsTai: true,
          reason: `Phát hiện ${streak} Xỉu liên tiếp, dự đoán đảo chiều sang Tài`
        };
      } else if (streak >= 2) {
        // 2-3 Xỉu liên tiếp, thường tiếp tục xu hướng
        return {
          detected: true,
          nextIsTai: false,
          reason: `Phát hiện ${streak} Xỉu liên tiếp, dự đoán tiếp tục Xỉu`
        };
      }
    }
  }

  return { detected: false };
}

/**
 * Phát hiện thay đổi đáng kể
 */
function detectSignificantChange(results) {
  // Nếu mới có sự thay đổi
  if (results.length >= 2 && results[0] !== results[1]) {
    // Nếu trước đó có chuỗi dài cùng loại
    if (results.length >= 4 && results[1] === results[2] && results[2] === results[3]) {
      return {
        detected: true,
        nextIsTai: results[0] === 'T',
        reason: `Vừa thay đổi từ chuỗi ${results[1]} sang ${results[0]}, dự đoán tiếp tục ${results[0]}`
      };
    }

    // Nếu có sự thay đổi từ chuỗi ngắn
    if (results.length >= 3 && results[1] === results[2]) {
      // Nếu chuyển từ Xỉu sang Tài
      if (results[0] === 'T') {
        return {
          detected: true,
          nextIsTai: true,
          reason: "Vừa chuyển từ Xỉu sang Tài, dự đoán tiếp tục Tài"
        };
      }
    }
  }

  return { detected: false };
}

/**
 * Phân tích trọng số theo độ gần/xa
 */
function analyzeWithWeights(results, depth = 10) {
  // Giới hạn kết quả phân tích
  const limitedData = results.slice(0, Math.min(depth, results.length));

  let totalWeight = 0;
  let weightedTaiCount = 0;

  for (let i = 0; i < limitedData.length; i++) {
    // Kết quả càng gần càng có trọng số cao
    const weight = Math.pow(0.65, i); // 1, 0.65, 0.42, 0.27...
    totalWeight += weight;

    if (limitedData[i] === 'T') {
      weightedTaiCount += weight;
    }
  }

  const weightedTaiPercentage = (weightedTaiCount / totalWeight) * 100;
  return {
    weightedTaiPercentage: Math.round(weightedTaiPercentage)
  };
}

/**
 * Xử lý dự đoán trước đó và ghi log kết quả
 */
function processPreviousPrediction(predictionsFile, historyLogFile, history) {
  if (fs.existsSync(predictionsFile)) {
    try {
      const oldPrediction = JSON.parse(fs.readFileSync(predictionsFile, 'utf8'));

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

        // Hiển thị kết quả
        console.log(`Kết quả dự đoán trước: ${isCorrect ? "✅ ĐÚNG" : "❌ SAI"}`);
        console.log(`Thực tế: ${actualNumber} (${actualType}), Dự đoán: ${predictedNumber} (${predictedType})`);

        // Phân tích tỷ lệ đúng/sai gần đây
        analyzeRecentAccuracy(historyLogFile);

        // Thống kê mẫu hình
        statisticsAnalysis(historyLogFile);
      }
    } catch (error) {
      console.error('Error:', error);
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

      // Đếm số dự đoán đúng/sai trong 30 kỳ gần nhất
      if (logLines.length >= 30) {
        const recent30 = logLines.slice(Math.max(0, logLines.length - 30));
        const correct30 = recent30.filter(line => line.includes('Đúng')).length;
        console.log(`Tỷ lệ đúng (30 kỳ gần nhất): ${correct30}/${recent30.length} (${Math.round(correct30 / recent30.length * 100)}%)`);
      }
    }
  } catch (error) {
    console.error('Error analyzing accuracy:', error);
  }
}

function statisticsAnalysis(historyLogFile) {
  try {
    if (fs.existsSync(historyLogFile)) {
      const logContent = fs.readFileSync(historyLogFile, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim() !== '');
      // Thống kê 50 kỳ gần nhất
      if (logLines.length >= 50) {
        const recent50 = logLines.slice(Math.max(0, logLines.length - 50));
        const taiActual = recent50.filter(line => line.includes('thực tế:') && line.includes('(Tài)')).length;
        const xiuActual = recent50.length - taiActual;
        console.log(`\n ===== THỐNG KÊ PHÂN TÍCH(50 kỳ gần nhất) =====`);
        console.log(`Tỷ lệ thực tế: Tài ${Math.round(taiActual / recent50.length * 100)} %, Xỉu ${Math.round(xiuActual / recent50.length * 100)} %`);
        // Phân tích mẫu hình liên tiếp
        let maxTaiStreak = 0, maxXiuStreak = 0;
        let currentTaiStreak = 0, currentXiuStreak = 0;
        const recentResults = recent50.map(line => {
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
        // Phân tích tỷ lệ Tài sau Tài và Xỉu sau Xỉu (hiện tượng "trụ")
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
        // Sửa lỗi tính toán tỷ lệ "trụ"
        const taiTruRate = totalAfterTai > 0 ? Math.round(taiAfterTai / totalAfterTai100) : 0;
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
 * Tạo mảng các số dự đoán với giá trị Tài / Xỉu tại vị trí chỉ định
 */
function generateNumbers(shouldPredictTai, index) {
  const predictedNumbers = [];
  for (let i = 0; i < 5; i++) {
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

function calculateNextDrawId(currentDrawId) {
  const numericPart = parseInt(currentDrawId.slice(-4));
  const prefix = currentDrawId.slice(0, -4);
  const nextNumeric = numericPart + 1;
  return prefix + nextNumeric.toString().padStart(4, '0');
}

module.exports = predict;
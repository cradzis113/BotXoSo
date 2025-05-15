/**
 * BetBreaker - Module xử lý chuyên biệt cho chuỗi bệt tài/xỉu
 * Phiên bản: v2.0.0
 * 
 * Module này nhằm:
 * 1. Phát hiện sớm và chính xác chuỗi bệt tài/xỉu
 * 2. Áp dụng chiến lược đối phó phù hợp với từng loại chuỗi bệt
 * 3. Phân tích hiệu suất và tự điều chỉnh chiến lược
 * 4. Kết hợp phân tích thời gian và mẫu đặc biệt
 * 5. Xử lý thích ứng cho chuỗi thua dài
 * 6. Học máy từ mẫu phức tạp
 */

const fs = require('fs');
const config = require('./config');

// Cache lưu trữ tạm thời
let betStreakCache = {
    lastStreak: null,
    lastPrediction: null,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    adaptiveReversalCount: 0,
    lastReversalTime: 0
};

// Biến theo dõi hiệu suất đơn giản
let betPerformanceStats = {
    T: { total: 0, correct: 0 },
    X: { total: 0, correct: 0 },
    unknown: { total: 0, correct: 0 }
};

/**
 * Phát hiện chuỗi bệt tài/xỉu từ lịch sử
 * @param {Array} history - Mảng lịch sử kết quả
 * @param {Number} index - Vị trí cần dự đoán (thường là 0)
 * @returns {Object} Kết quả phát hiện
 */
function detectBetStreak(history, index = 0) {
    if (!config.betDetector || !config.betDetector.enabled || !history || history.length < 3) {
        return { detected: false };
    }
    
    try {
        // Chuyển đổi lịch sử thành chuỗi 'T' và 'X'
        const recentResults = history.slice(0, config.betDetector.detection.detectionWindowSize)
            .map(item => item.numbers[index] >= 5 ? 'T' : 'X');
        
        // Kiểm tra các tham số cấu hình
        const { minBetLength, earlyDetectionThreshold, confidentBetLength } = config.betDetector.detection;
        
        // Phân tích chuỗi hiện tại
        const currentStreak = analyzeCurrentStreak(recentResults);
        
        // Lưu cache
        betStreakCache.lastStreak = currentStreak;
        
        // Không đủ để xác định chuỗi bệt
        if (currentStreak.length < earlyDetectionThreshold) {
            return { detected: false };
        }
        
        // Mới: Phân tích xu hướng dài hạn
        const longTermTrend = analyzeLongTermTrend(recentResults, 10);
        if (longTermTrend.detected) {
            const prediction = {
                detected: true,
                betStreak: true,
                streakType: longTermTrend.dominantType,
                streakLength: longTermTrend.count,
                predictTai: longTermTrend.dominantType === 'X', // Dự đoán ngược với xu hướng chủ đạo
                confidence: 0.82,
                method: 'BetBreaker_LongTerm',
                reason: `Phát hiện xu hướng dài hạn ${longTermTrend.dominantType === 'T' ? 'Tài' : 'Xỉu'} (${longTermTrend.percentage.toFixed(1)}%), dự đoán ngược lại`
            };
            
            // Cập nhật thông tin dự đoán liên tiếp
            if (betStreakCache.lastPrediction === (prediction.predictTai ? 'T' : 'X')) {
                betStreakCache.consecutiveCorrect++;
            } else {
                betStreakCache.consecutiveIncorrect = 1;
            }
            betStreakCache.lastPrediction = prediction.predictTai ? 'T' : 'X';
            
            return prediction;
        }
        
        // Phát hiện chuỗi bệt tiêu chuẩn
        if (currentStreak.length >= minBetLength) {
            // Giờ hiện tại để kiểm tra chuỗi bệt theo giờ
            const currentHour = new Date().getHours();
            const isInBetTaiHours = config.betDetector.detection.checkSpecialHours && 
                                  config.betDetector.detection.betTaiHours.includes(currentHour);
            const isInBetXiuHours = config.betDetector.detection.checkSpecialHours && 
                                  config.betDetector.detection.betXiuHours.includes(currentHour);
            
            // Tính độ tin cậy dựa trên độ dài chuỗi
            let confidence = calculateBetConfidence(currentStreak);
            
            // Điều chỉnh độ tin cậy dựa trên giờ
            if (currentStreak.type === 'T' && isInBetTaiHours) {
                confidence += 0.05;
            } else if (currentStreak.type === 'X' && isInBetXiuHours) {
                confidence += 0.05;
            }
            
            // Mới: Kiểm tra xem có nên áp dụng độ tin cậy tăng cường cho chuỗi thua dài hay không
            if (config.streakBreaker && config.streakBreaker.adaptiveReversal && 
                config.streakBreaker.adaptiveReversal.enabled &&
                currentStreak.length >= config.streakBreaker.longLossThreshold) {
                confidence = Math.min(0.95, confidence + config.streakBreaker.adaptiveReversal.confidenceBoost);
            }
            
            // THÊM MỚI: Nếu liên tục dự đoán cùng một kiểu trên 4 lần mà không có kết quả tốt, giảm độ tin cậy
            if (betStreakCache.consecutiveIncorrect >= 4) {
                confidence = Math.max(0.5, confidence - 0.15);
                console.log(`⚠️ Giảm độ tin cậy xuống ${confidence.toFixed(2)} do dự đoán cùng kiểu ${betStreakCache.consecutiveIncorrect} lần liên tiếp`);
            }
            
            // Tạo dự đoán dựa trên chuỗi bệt
            const prediction = createBetPrediction(currentStreak, confidence);
            
            // Cập nhật thông tin dự đoán liên tiếp
            if (betStreakCache.lastPrediction === (prediction.predictTai ? 'T' : 'X')) {
                betStreakCache.consecutiveCorrect++;
            } else {
                betStreakCache.consecutiveIncorrect = 1;
            }
            betStreakCache.lastPrediction = prediction.predictTai ? 'T' : 'X';
            
            return prediction;
        }
        
        // Phát hiện sớm chuỗi bệt
        if (currentStreak.length >= earlyDetectionThreshold) {
            // Kiểm tra giờ đặc biệt để phát hiện sớm
            const currentHour = new Date().getHours();
            const isBetTaiHourEarly = config.betDetector.detection.betTaiHours.includes(currentHour);
            const isBetXiuHourEarly = config.betDetector.detection.betXiuHours.includes(currentHour);
            
            // Các điều kiện phát hiện sớm
            if ((currentStreak.type === 'T' && isBetTaiHourEarly) || 
                (currentStreak.type === 'X' && isBetXiuHourEarly)) {
                    
                const earlyConfidence = config.betDetector.strategy.earlyDetectionConfidence;
                const prediction = createBetPrediction(currentStreak, earlyConfidence, true);
                
                // Cập nhật thông tin dự đoán liên tiếp
                if (betStreakCache.lastPrediction === (prediction.predictTai ? 'T' : 'X')) {
                    betStreakCache.consecutiveCorrect++;
                } else {
                    betStreakCache.consecutiveIncorrect = 1;
                }
                betStreakCache.lastPrediction = prediction.predictTai ? 'T' : 'X';
                
                return prediction;
            }
        }
        
        return { detected: false };
    } catch (error) {
        console.error(`❌ Lỗi khi phát hiện chuỗi bệt: ${error.message}`);
        return { detected: false };
    }
}

/**
 * Phân tích chuỗi hiện tại từ kết quả gần đây
 * @param {Array} results - Mảng kết quả T/X gần đây
 * @returns {Object} Thông tin về chuỗi hiện tại
 */
function analyzeCurrentStreak(results) {
    if (!results || results.length === 0) {
        return { type: null, length: 0 };
    }
    
    // Kiểm tra chuỗi Tài liên tiếp
    let taiStreak = 0;
    for (let i = 0; i < results.length; i++) {
        if (results[i] === 'T') {
            taiStreak++;
        } else {
            break;
        }
    }
    
    // Kiểm tra chuỗi Xỉu liên tiếp
    let xiuStreak = 0;
    for (let i = 0; i < results.length; i++) {
        if (results[i] === 'X') {
            xiuStreak++;
        } else {
            break;
        }
    }
    
    // Trả về chuỗi dài hơn
    if (taiStreak > xiuStreak) {
        return { type: 'T', length: taiStreak };
    } else if (xiuStreak > 0) {
        return { type: 'X', length: xiuStreak };
    } else {
        return { type: null, length: 0 };
    }
}

/**
 * Phát hiện mẫu chuỗi bệt đặc biệt
 * @param {Array} results - Mảng kết quả T/X gần đây
 * @returns {Object} Thông tin về mẫu đặc biệt nếu phát hiện
 */
function detectSpecialBetPattern(results) {
    // This function is simplified as the pattern detection is not frequently used
    return { detected: false };
}

/**
 * Tính toán độ tin cậy dựa trên độ dài chuỗi bệt
 * @param {Object} streak - Thông tin chuỗi bệt
 * @returns {Number} Độ tin cậy
 */
function calculateBetConfidence(streak) {
    const { minBetLength, confidentBetLength } = config.betDetector.detection;
    const { earlyDetectionConfidence, confidentDetectionConfidence } = config.betDetector.strategy;
    
    // Chuỗi chắc chắn
    if (streak.length >= confidentBetLength) {
        return confidentDetectionConfidence;
    }
    
    // Chuỗi vừa phải
    if (streak.length >= minBetLength) {
        // Tính độ tin cậy theo thang từ earlyDetectionConfidence đến confidentDetectionConfidence
        const confidenceRange = confidentDetectionConfidence - earlyDetectionConfidence;
        const lengthRange = confidentBetLength - minBetLength;
        const lengthFactor = (streak.length - minBetLength) / lengthRange;
        
        return earlyDetectionConfidence + (confidenceRange * lengthFactor);
    }
    
    // Chuỗi ngắn
    return earlyDetectionConfidence;
}

/**
 * Phân tích xu hướng dài hạn từ lịch sử
 * @param {Array} results - Mảng kết quả gần đây
 * @param {Number} lookbackCount - Số kỳ xem xét
 * @returns {Object} Thông tin về xu hướng
 */
function analyzeLongTermTrend(results, lookbackCount = 10) {
    if (!results || results.length < lookbackCount) {
        return { detected: false };
    }
    
    const sampleData = results.slice(0, lookbackCount);
    let taiCount = 0;
    let xiuCount = 0;
    
    // Đếm số lần xuất hiện Tài/Xỉu
    for (const result of sampleData) {
        if (result === 'T') {
            taiCount++;
        } else {
            xiuCount++;
        }
    }
    
    // Phân tích xu hướng chủ đạo
    const total = taiCount + xiuCount;
    const taiPercentage = (taiCount / total) * 100;
    const xiuPercentage = (xiuCount / total) * 100;
    
    // Xác định xu hướng nếu một bên chiếm trên 70%
    if (taiPercentage >= 70) {
        return {
            detected: true,
            dominantType: 'T',
            count: taiCount,
            percentage: taiPercentage
        };
    } else if (xiuPercentage >= 70) {
        return {
            detected: true,
            dominantType: 'X',
            count: xiuCount,
            percentage: xiuPercentage
        };
    }
    
    return { detected: false };
}

/**
 * Tạo dự đoán dựa trên chuỗi bệt phát hiện được
 * @param {Object} streak - Thông tin chuỗi bệt
 * @param {Number} confidence - Độ tin cậy
 * @param {Boolean} isEarlyDetection - Đánh dấu phát hiện sớm
 * @returns {Object} Dự đoán
 */
function createBetPrediction(streak, confidence, isEarlyDetection = false) {
    // Kiểm tra tham số đầu vào
    if (!streak || !streak.type) {
        console.error("❌ Không thể tạo dự đoán từ chuỗi bệt không hợp lệ");
        return { confidence: 0.5, predictTai: false, reason: "Chuỗi bệt không hợp lệ" };
    }
    
    // Chiến lược mặc định từ cấu hình
    const shouldReverse = config.betDetector.strategy.predictOpposite;
    let predictTai = streak.type === 'T' ? false : true; // Mặc định là dự đoán ngược
    
    if (!shouldReverse) {
        // Nếu chiến lược là đi theo xu hướng
        predictTai = streak.type === 'T' ? true : false;
    }
    
    // Điều chỉnh mô tả
    const streakType = streak.type === 'T' ? 'Tài' : 'Xỉu';
    let actionDescription = shouldReverse ? 'dự đoán ngược' : 'dự đoán theo';
    let method = 'BetBreaker';
    
    // Kiểm tra sử dụng cấu hình nâng cao cho chuỗi thua dài
    const shouldMaintainDirection = false;
    
    // Áp dụng đảo ngược thích ứng sau chuỗi thua
    const shouldUseAdaptive = shouldUseAdaptiveReversal(streak);
    
    let finalPrediction = predictTai;
    
    if (shouldUseAdaptive) {
        // Thực hiện đảo ngược thích ứng
        finalPrediction = !predictTai;
        actionDescription = `đảo ngược thích ứng (lần thứ ${betStreakCache.adaptiveReversalCount})`;
        method = 'BetBreaker';
        
        // Cập nhật thông tin về đảo ngược
        betStreakCache.adaptiveReversalCount++;
        betStreakCache.lastReversalTime = Date.now();
    } else if (shouldMaintainDirection) {
        // Nếu là chuỗi thua dài, duy trì cùng hướng dự đoán
        finalPrediction = streak.type === 'T' ? false : true; // Dự đoán ngược với chuỗi hiện tại
        actionDescription = `duy trì hướng dự đoán ${finalPrediction ? 'Tài' : 'Xỉu'} (chuỗi thua dài ${streak.length} kỳ)`;
    } else {
        // Nếu không phải chuỗi thua dài, áp dụng chiến lược thông thường
        finalPrediction = shouldReverse ? predictTai : !predictTai;
        actionDescription = `${shouldReverse ? 'đảo ngược' : 'dự đoán cùng chiều'}`;
    }
    
    return {
        detected: true,
        betStreak: true,
        streakType: streak.type,
        streakLength: streak.length,
        predictTai: finalPrediction,
        confidence: confidence,
        method: method,
        reason: `Phát hiện chuỗi bệt ${streakType} ${streak.length} lần liên tiếp, ${actionDescription} thành ${finalPrediction ? 'Tài' : 'Xỉu'}`
    };
}

/**
 * Cập nhật thống kê hiệu suất xử lý chuỗi bệt
 * @param {Object} prediction - Thông tin dự đoán
 * @param {boolean} isCorrect - Kết quả dự đoán đúng hay sai
 */
function updateBetPerformance(prediction, isCorrect) {
    if (!prediction || !prediction.method) return;
    
    // Cập nhật hiệu suất chung
    betPerformanceStats.unknown.total++;
    if (isCorrect) {
        betPerformanceStats.unknown.correct++;
    }
    
    // Cập nhật hiệu suất theo kiểu Tài/Xỉu
    if (prediction.predictTai) {
        betPerformanceStats.T.total++;
        if (isCorrect) {
            betPerformanceStats.T.correct++;
        }
    } else {
        betPerformanceStats.X.total++;
        if (isCorrect) {
            betPerformanceStats.X.correct++;
        }
    }
    
    // Cập nhật theo dõi chuỗi thua
    if (!isCorrect) {
        betStreakCache.consecutiveIncorrect++;
    } else {
        betStreakCache.consecutiveCorrect++;
    }
}

/**
 * Kiểm tra xem có nên sử dụng chiến lược đảo ngược thích ứng không
 * @param {Object} streak - Thông tin chuỗi bệt hiện tại
 * @returns {boolean} Có nên sử dụng đảo ngược thích ứng
 */
function shouldUseAdaptiveReversal(streak) {
    // Kiểm tra xem tính năng đảo ngược thích ứng có được bật không
    if (!config.streakBreaker || !config.streakBreaker.adaptiveReversal || 
        !config.streakBreaker.adaptiveReversal.enabled) {
        return false;
    }
    
    // Kiểm tra số lần thua liên tiếp
    if (betStreakCache.consecutiveIncorrect < config.streakBreaker.adaptiveReversal.activateAfterLosses) {
        return false;
    }
    
    // Kiểm tra khoảng thời gian giữa các lần đảo ngược
    const now = Date.now();
    const timeSinceLastReversal = now - betStreakCache.lastReversalTime;
    
    if (betStreakCache.lastReversalTime > 0 && 
        timeSinceLastReversal < config.streakBreaker.adaptiveReversal.minTimeBetweenReversals) {
        return false;
    }
    
    // Kiểm tra số lần đảo ngược tối đa
    if (betStreakCache.adaptiveReversalCount >= config.streakBreaker.adaptiveReversal.maxReversals) {
        return false;
    }
    
    return true;
}

/**
 * Trích xuất hướng dự đoán trước đó từ file log
 * @param {string} logFile - Đường dẫn tới file log dự đoán
 * @param {number} lines - Số dòng tối đa cần đọc (mặc định: 5)
 * @returns {string|null} - Trả về 'T', 'X', hoặc null nếu không tìm thấy
 */
function getPreviousPredictionDirection(logFile, lines = 5) {
    if (!fs.existsSync(logFile)) return null;
    
    try {
        // Đọc một số dòng gần nhất từ file log
        const data = fs.readFileSync(logFile, 'utf8');
        const recentLines = data.split('\n').filter(line => line.trim()).slice(0, lines);
        
        // Tìm dự đoán gần nhất
        for (const line of recentLines) {
            if (line.includes('Dự đoán: Tài')) {
                return 'T';
            } else if (line.includes('Dự đoán: Xỉu')) {
                return 'X';
            }
        }
        
        return null;
    } catch (error) {
        console.error(`Lỗi khi đọc hướng dự đoán trước đó: ${error.message}`);
        return null;
    }
}

module.exports = {
    detectBetStreak,
    updateBetPerformance,
    getPreviousPredictionDirection,
    shouldUseAdaptiveReversal,
    betStreakCache
}; 
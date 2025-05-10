const fs = require('fs');
const path = require('path');

const predictor = require('./predictor');
const account = require('./account');
const logger = require('./logger');
const betting = require('./betting');
const drawId = require('./drawId');
const config = require('./config');

const { clearPageMemory } = require('../betAutomatic');
let isLoggedIn = false;

// Thêm biến toàn cục để theo dõi hiệu suất
let methodPerformanceCache = {};

// Thêm hàm để cập nhật cache hiệu suất
function updateMethodPerformance(method, isCorrect) {
    if (!methodPerformanceCache[method]) {
        methodPerformanceCache[method] = { correct: 0, total: 0 };
    }
    
    methodPerformanceCache[method].total++;
    if (isCorrect) {
        methodPerformanceCache[method].correct++;
    }
    
    // Giới hạn số liệu thống kê ở 50 kỳ gần nhất
    if (methodPerformanceCache[method].total > 50) {
        const ratio = 50 / methodPerformanceCache[method].total;
        methodPerformanceCache[method].total = 50;
        methodPerformanceCache[method].correct = Math.round(methodPerformanceCache[method].correct * ratio);
    }
    
    // Lưu cache ngay sau khi cập nhật
    saveMethodPerformanceCache();
}

// Thêm hàm để lấy hiệu suất phương pháp
function getMethodSuccessRate(method) {
    if (!methodPerformanceCache[method] || methodPerformanceCache[method].total === 0) {
        return 0.5; // Mặc định 50%
    }
    
    return methodPerformanceCache[method].correct / methodPerformanceCache[method].total;
}

// Đưa hàm vào biến toàn cục để các module khác có thể truy cập
// Chỉ cài đặt nếu chưa tồn tại để tránh ghi đè khi module được require nhiều lần
if (!global.updateMethodPerformance) {
    global.updateMethodPerformance = updateMethodPerformance;
    console.log("📊 Khởi tạo global.updateMethodPerformance");
}
if (!global.getMethodSuccessRate) {
    global.getMethodSuccessRate = getMethodSuccessRate;
    console.log("📊 Khởi tạo global.getMethodSuccessRate");
}
if (!global.methodPerformanceCache) {
    global.methodPerformanceCache = methodPerformanceCache;
    console.log("📊 Khởi tạo global.methodPerformanceCache");
}
// Thêm saveMethodPerformanceCache vào global
if (!global.saveMethodPerformanceCache) {
    global.saveMethodPerformanceCache = saveMethodPerformanceCache;
    console.log("📊 Khởi tạo global.saveMethodPerformanceCache");
}

// Đọc cache từ file khi khởi động
function loadMethodPerformanceCache() {
    const cacheFile = path.join(__dirname, '..', 'data', 'method_performance.json');
    if (fs.existsSync(cacheFile)) {
        try {
            methodPerformanceCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        } catch (error) {
            console.error(`Lỗi khi đọc cache hiệu suất: ${error.message}`);
            methodPerformanceCache = {};
        }
    }
}

// Lưu cache vào file
function saveMethodPerformanceCache() {
    const dataDir = path.join(__dirname, '..', 'data');
    const cacheFile = path.join(dataDir, 'method_performance.json');
    try {
        // Tạo thư mục data nếu nó không tồn tại
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(cacheFile, JSON.stringify(methodPerformanceCache, null, 2));
        console.log(`💾 Đã lưu cache hiệu suất vào ${cacheFile}`);
    } catch (error) {
        console.error(`❌ Lỗi khi lưu cache hiệu suất: ${error.message}`);
    }
}

// Khởi động cache khi import module
loadMethodPerformanceCache();

/**
 * Dự đoán Tài Xỉu với thuật toán nhận dạng mẫu cân bằng (phiên bản 5.6)
 * @param {Object} page - Đối tượng trang web Puppeteer
 * @param {Array} history - Mảng lịch sử kết quả
 * @param {Number} index - Vị trí trong mảng numbers cần dự đoán
 * @param {Object} options - Tùy chọn cấu hình (limitList, defaultLimit)
 * @param {Boolean} log - Điều khiển hiển thị/ghi log (mặc định: true)
 * @returns {Object} Đối tượng dự đoán
 */

async function predict(page, history, index = 0, options = { limitList: [3, 7, 12], defaultLimit: 12 }, log = true) {
    // Đảm bảo cache được tải mỗi khi predict được gọi
    if (Object.keys(methodPerformanceCache).length === 0) {
        loadMethodPerformanceCache();
        if (log) console.log("🔄 Tải cache hiệu suất khi bắt đầu dự đoán");
    }

    const { limitList, defaultLimit } = options;
    if (log) console.log(`📊 Phân tích với giới hạn: ${JSON.stringify(limitList)}, mặc định: ${defaultLimit}`);

    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    const predictionsFile = path.join(dataDir, 'predictions.json');
    const historyLogFile = path.join(dataDir, 'prediction_log.txt');
    const accountFile = path.join(dataDir, 'account.json');

    const accountInfo = account.readAccountInfo(accountFile, log);
    account.validateAccountSettings(accountInfo, accountFile, log);
    
    if (page) {
        try {
            if (page.isClosed()) {
                if (log) console.log("⚠️ Trang đã bị đóng, không thể tiếp tục");
                return null;
            }

            await clearPageMemory(page);
        } catch (pageError) {
            if (log) console.error("❌ Lỗi khi kiểm tra trang:", pageError);
            return null;
        }
    }

    const canBet = account.canUseBetting(accountInfo);

    if (page && canBet) {
        const loginSuccess = await account.autoLogin(page, accountInfo, accountFile, log);
        
        if (loginSuccess) {
            isLoggedIn = true;
        } else {
            isLoggedIn = false;
        }
    } else {
        isLoggedIn = false;
    }

    try {
        if (!history || !Array.isArray(history) || history.length === 0) {
            if (log) console.log("⚠️ Không có dữ liệu lịch sử, không thể dự đoán");
            return null;
        }
        
        const latestDrawId = history[0].drawId;
        const nextDrawId = drawId.calculateSafeNextDrawId(latestDrawId, predictionsFile, historyLogFile);
        
        if (fs.existsSync(predictionsFile)) {
            try {
                const existingPrediction = JSON.parse(fs.readFileSync(predictionsFile, 'utf8'));
                
                const normalizedExistingDrawId = existingPrediction.drawId.replace(/_\d+$/, '');
                
                // Giảm thời gian tái sử dụng dự đoán từ 30000ms xuống 10000ms (10 giây)
                const isVeryRecentPrediction = (existingPrediction.timestamp && 
                                         (new Date().getTime() - new Date(existingPrediction.timestamp).getTime()) < 10000);
                                     
                if (normalizedExistingDrawId === nextDrawId && isVeryRecentPrediction) {
                    if (log) console.log(`ℹ️ Đã có dự đoán RẤT GẦN ĐÂY (< 10s) cho kỳ ${nextDrawId}, sử dụng dự đoán hiện có`);
                    return existingPrediction;
                } else {
                    if (log) console.log(`ℹ️ Tạo dự đoán mới cho kỳ ${nextDrawId}`);
                }
            } catch (error) {
                if (log) console.error(`❌ Lỗi khi đọc file dự đoán: ${error.message}`);
            }
        }

        const recentResults = logger.analyzeRecentResults(historyLogFile, 15);
        if (log) console.log(`📊 Phân tích ${recentResults.length} kết quả gần nhất`);

        if (isLoggedIn && canBet) {
            betting.processPreviousPrediction(predictionsFile, historyLogFile, history, accountInfo, log);
        } else {
            betting.processPreviousPrediction(predictionsFile, historyLogFile, history, null, log);
        }

        try {
            const limitPerformance = predictor.analyzeLimitPerformance(historyLogFile);
            if (limitPerformance && limitPerformance.length > 0 && log) {
                console.log("🔄 Kết quả phân tích hiệu suất theo giới hạn:", limitPerformance);
            }
        } catch (error) {
            if (log) console.error(`❌ Lỗi phân tích hiệu suất: ${error.message}`);
        }

        // CẢI TIẾN: Tận dụng các thuật toán cải tiến và điều chỉnh trọng số
        // Lấy hiệu suất của các phương pháp chính để điều chỉnh trọng số
        const cyclePerformance = global.getMethodSuccessRate ? global.getMethodSuccessRate("CyclicalPattern") : 0.5;
        const alternatingPerformance = global.getMethodSuccessRate ? global.getMethodSuccessRate("ShortAlternatingPattern") : 0.5;
        const streakPerformance = global.getMethodSuccessRate ? global.getMethodSuccessRate("LongStreakPattern") : 0.5;
        // Thêm hiệu suất cho thuật toán mới V4.0
        const fastPatternPerformance = global.getMethodSuccessRate ? global.getMethodSuccessRate("FastPatternDetector") : 0.6;

        // CẢI TIẾN V4.0: Điều chỉnh trọng số tự động dựa trên hiệu suất và cấu hình
        const defaultWeights = config.defaultWeights || {
            CyclicalPattern: 0.65,         // Tăng từ v3.2 (0.50) lên 0.65
            ShortAlternatingPattern: 0.25, // Giảm từ v3.2 (0.40) xuống 0.25
            LongStreakPattern: 0.05,       // Giảm từ v3.2 (0.10) xuống 0.05
            FastPatternDetector: 0.05      // Thuật toán mới cho xổ số 45 giây
        };

        // Kết hợp các trọng số mặc định với hiệu suất thực tế
        const totalPerformance = cyclePerformance + alternatingPerformance + streakPerformance + fastPatternPerformance;
        let cycleWeight, alternatingWeight, streakWeight, fastPatternWeight;

        if (totalPerformance > 0) {
            // CẢI TIẾN V4.0: Tăng tỷ trọng hiệu suất từ 70% lên 80%
            cycleWeight = (0.8 * (cyclePerformance / totalPerformance)) + (0.2 * defaultWeights.CyclicalPattern);
            alternatingWeight = (0.8 * (alternatingPerformance / totalPerformance)) + (0.2 * defaultWeights.ShortAlternatingPattern);
            streakWeight = (0.8 * (streakPerformance / totalPerformance)) + (0.2 * defaultWeights.LongStreakPattern);
            fastPatternWeight = (0.8 * (fastPatternPerformance / totalPerformance)) + (0.2 * defaultWeights.FastPatternDetector);
            
            // V4.0: Tăng trọng số cho thuật toán mới trong giai đoạn đầu
            if (global.methodPerformanceCache && global.methodPerformanceCache["FastPatternDetector"] && 
                global.methodPerformanceCache["FastPatternDetector"].total < 10) {
                fastPatternWeight += 0.1; // Tăng trọng số thêm 10% để thử nghiệm
            }
        } else {
            // Sử dụng trọng số mặc định nếu không có dữ liệu hiệu suất
            cycleWeight = defaultWeights.CyclicalPattern;
            alternatingWeight = defaultWeights.ShortAlternatingPattern;
            streakWeight = defaultWeights.LongStreakPattern;
            fastPatternWeight = defaultWeights.FastPatternDetector;
        }

        // Chuẩn hóa các trọng số để tổng bằng 1
        const weightSum = cycleWeight + alternatingWeight + streakWeight + fastPatternWeight;
        cycleWeight /= weightSum;
        alternatingWeight /= weightSum;
        streakWeight /= weightSum;
        fastPatternWeight /= weightSum;

        if (log) {
            console.log(`📊 Trọng số thuật toán V4.0:
            - CyclicalPattern: ${(cycleWeight * 100).toFixed(1)}% (hiệu suất: ${(cyclePerformance * 100).toFixed(1)}%)
            - ShortAlternatingPattern: ${(alternatingWeight * 100).toFixed(1)}% (hiệu suất: ${(alternatingPerformance * 100).toFixed(1)}%)
            - LongStreakPattern: ${(streakWeight * 100).toFixed(1)}% (hiệu suất: ${(streakPerformance * 100).toFixed(1)}%)
            - FastPatternDetector: ${(fastPatternWeight * 100).toFixed(1)}% (hiệu suất: ${(fastPatternPerformance * 100).toFixed(1)}%)`);
        }

        // Áp dụng các thuật toán theo trọng số cải tiến
        // Tạo danh sách các phương pháp và trọng số tương ứng
        const methodsList = [
            { name: "CyclicalPattern", detector: predictor.detectCyclicalReversals, weight: cycleWeight },
            { name: "ShortAlternatingPattern", detector: predictor.detectShortAlternatingPattern, weight: alternatingWeight },
            { name: "LongStreakPattern", detector: predictor.detectLongStreaks, weight: streakWeight },
            { name: "FastPatternDetector", detector: predictor.detectFastPattern, weight: fastPatternWeight }
        ];
        
        // Sắp xếp theo trọng số giảm dần
        methodsList.sort((a, b) => b.weight - a.weight);
        
        // Áp dụng các phương pháp theo thứ tự ưu tiên
        let predictions = [];
        
        for (const method of methodsList) {
            try {
                const result = method.detector(history, index);
                if (result && result.detected) {
                    predictions.push({
                        method: method.name,
                        weight: method.weight,
                        predictTai: result.predictTai,
                        confidence: result.confidence || 0.6,
                        reason: result.reason
                    });
                    
                    if (log) console.log(`✅ Phát hiện mẫu ${method.name}: ${result.reason}`);
                }
            } catch (error) {
                if (log) console.error(`❌ Lỗi khi áp dụng ${method.name}: ${error.message}`);
            }
        }
        
        // V4.0: Sử dụng phân tích cân bằng nếu không phát hiện mẫu nào rõ ràng
        if (predictions.length === 0) {
            if (log) console.log("ℹ️ Không phát hiện mẫu rõ ràng, sử dụng phân tích cân bằng");
            try {
                const balancedResult = predictor.balancedAnalysis(history, index, limitList);
                predictions.push({
                    method: "BalancedAnalysis",
                    weight: 1.0,
                    predictTai: balancedResult.prediction,
                    confidence: 0.55, // Độ tin cậy thấp cho phân tích cân bằng
                    reason: balancedResult.reason
                });
                
                if (log) console.log(`ℹ️ Kết quả phân tích cân bằng: ${balancedResult.reason}`);
            } catch (error) {
                if (log) console.error(`❌ Lỗi phân tích cân bằng: ${error.message}`);
            }
        }
        
        // V4.0: Đưa ra dự đoán cuối cùng dựa trên kết hợp có trọng số
        let finalPrediction;
        
        if (predictions.length === 1) {
            // Chỉ có 1 phương pháp, sử dụng trực tiếp
            finalPrediction = { 
                predictTai: predictions[0].predictTai,
                method: predictions[0].method,
                confidence: predictions[0].confidence,
                reason: predictions[0].reason
            };
        } else if (predictions.length > 1) {
            // Kết hợp nhiều phương pháp
            let weightedTaiVotes = 0;
            let totalWeight = 0;
            
            for (const pred of predictions) {
                // V4.0: Điều chỉnh công thức trọng số
                // Trọng số = (weight của phương pháp * 0.3) + (confidence của dự đoán * 0.7)
                const predWeight = (pred.weight * 0.3) + (pred.confidence * 0.7);
                totalWeight += predWeight;
                
                if (pred.predictTai) {
                    weightedTaiVotes += predWeight;
                }
            }
            
            // Tính tỷ lệ có trọng số
            const weightedTaiRatio = totalWeight > 0 ? weightedTaiVotes / totalWeight : 0.5;
            
            // V4.0: Tăng ngưỡng quyết định để đảm bảo độ tin cậy cao hơn
            const decisionThreshold = 0.52; // Tăng từ 0.5 lên 0.52
            const finalPredictTai = weightedTaiRatio >= decisionThreshold;
            
            // Tìm phương pháp có kết quả khớp với dự đoán cuối cùng và có trọng số cao nhất
            const matchingPredictions = predictions
                .filter(p => p.predictTai === finalPredictTai)
                .sort((a, b) => (b.weight * b.confidence) - (a.weight * a.confidence));
            
            // Lý do từ phương pháp phù hợp có trọng số cao nhất
            const primaryReason = matchingPredictions.length > 0 
                ? matchingPredictions[0].reason 
                : `Dự đoán tổng hợp (${finalPredictTai ? 'Tài' : 'Xỉu'} ${Math.round(weightedTaiRatio * 100)}%)`;
            
            // V4.0: Tính toán độ tin cậy dựa trên mức độ lệch khỏi ngưỡng quyết định
            const confidenceLevel = Math.abs(weightedTaiRatio - 0.5) * 2;
            
            finalPrediction = {
                predictTai: finalPredictTai,
                method: matchingPredictions.length > 0 ? matchingPredictions[0].method : "CombinedAnalysis",
                confidence: confidenceLevel,
                reason: primaryReason,
                combinedRatio: weightedTaiRatio
            };
            
            if (log) console.log(`📊 Dự đoán tổng hợp: ${finalPredictTai ? 'Tài' : 'Xỉu'} (${(weightedTaiRatio * 100).toFixed(1)}%)`);
        } else {
            // Không có phương pháp nào, sử dụng ngẫu nhiên
            finalPrediction = {
                predictTai: Math.random() >= 0.5,
                method: "Random",
                confidence: 0.5,
                reason: "Không phát hiện mẫu, dự đoán ngẫu nhiên"
            };
            
            if (log) console.log("⚠️ Không phát hiện mẫu nào, sử dụng dự đoán ngẫu nhiên");
        }
        
        // V4.0: Kiểm tra ngưỡng tin cậy để quyết định có đặt cược hay không
        const confidenceThreshold = config.analysis.confidenceThreshold || 0.72;
        let shouldSkip = finalPrediction.confidence < confidenceThreshold;
        
        // Thêm log nếu bỏ qua đặt cược do độ tin cậy thấp
        if (shouldSkip && log) {
            console.log(`🚫 Độ tin cậy ${(finalPrediction.confidence * 100).toFixed(1)}% thấp hơn ngưỡng ${(confidenceThreshold * 100).toFixed(1)}%, bỏ qua đặt cược`);
            
            // Ghi log các dự đoán bị bỏ qua
            if (config.logging.skippedPredictionsLog) {
                try {
                    const skippedLog = `[${new Date().toLocaleTimeString()}] - ${nextDrawId} - Dự đoán: ${finalPrediction.predictTai ? 'Tài' : 'Xỉu'} | Độ tin cậy: ${(finalPrediction.confidence * 100).toFixed(1)}% | Phương pháp: ${finalPrediction.method}\n`;
                    fs.appendFileSync(config.logging.skippedPredictionsLog, skippedLog);
                } catch (error) {
                    console.error(`Lỗi khi ghi log dự đoán bị bỏ qua: ${error.message}`);
                }
            }
        }
        
        // Chuyển đổi dự đoán thành số
        const predictedNumbers = predictor.generateNumbers(finalPrediction.predictTai, index);
        
        // Tạo đối tượng dự đoán cuối cùng
        const prediction = {
            drawId: nextDrawId,
            numbers: predictedNumbers,
            timestamp: new Date().toISOString(),
            method: finalPrediction.method,
            reasonDetail: finalPrediction.reason,
            confidence: finalPrediction.confidence,
            reasonShort: finalPrediction.predictTai ? "TÀI" : "XỈU",
            detail: {
                index: index,
                prediction: predictedNumbers[index],
                strategy: finalPrediction.method,
                reason: finalPrediction.reason
            },
            version: config.version || "v4.0",
            shouldSkip: shouldSkip // Thêm cờ shouldSkip vào dự đoán
        };

        // Lưu dự đoán
        try {
            fs.writeFileSync(predictionsFile, JSON.stringify(prediction, null, 2));
            if (log) console.log(`📝 Đã lưu dự đoán cho kỳ ${nextDrawId}`);
        } catch (error) {
            if (log) console.error(`❌ Lỗi khi lưu dự đoán: ${error.message}`);
        }

        return prediction;
    } catch (error) {
        if (log) console.error(`❌ Lỗi tổng thể: ${error.message}`);
        return null;
    }
}

// Export trực tiếp hàm predict
module.exports = predict;
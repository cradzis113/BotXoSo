const fs = require('fs');
const path = require('path');

const predictor = require('./predictor');
const account = require('./account');
const logger = require('./logger');
const betting = require('./betting');
const drawIdModule = require('./drawId');
const config = require('./config');

const {
    detectTaiXiuPatterns,
} = predictor;

const { clearPageMemory } = require('../betAutomatic');
let isLoggedIn = false;

/**
 * Tính toán độ chính xác gần đây từ file log
 * @param {string} logFile - Đường dẫn đến file log 
 * @param {number} windowSize - Kích thước cửa sổ để tính toán (mặc định: 20)
 * @param {boolean} detailedInfo - Có trả về thông tin chi tiết không
 * @returns {number|Object} Tỷ lệ chính xác hoặc đối tượng chi tiết
 */
function calculateRecentAccuracy(logFile, windowSize = 20, detailedInfo = false) {
    if (!fs.existsSync(logFile)) return 0.5;
    
    try {
        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.split('\n').filter(line => line.trim()).slice(0, windowSize);
        
        let correct = 0;
        let total = lines.length;
        
        if (total === 0) return 0.5;
        
        for (const line of lines) {
            if (line.includes('| Đúng ✓')) {
                correct++;
            }
        }
        
        const accuracy = correct / total;
        
        if (detailedInfo) {
            return { accuracy, correct, total };
        }
        
        return accuracy;
    } catch (error) {
        console.error(`❌ Lỗi khi tính toán độ chính xác: ${error.message}`);
        return 0.5;
    }
}

// Thêm biến toàn cục để theo dõi hiệu suất một cách đơn giản
let methodPerformanceCache = {};

// Thêm hàm để cập nhật hiệu suất trong bộ nhớ (không lưu file)
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
}

/**
 * Lấy tỷ lệ thành công của một phương pháp
 * @param {string} method - Tên phương pháp
 * @returns {number} Tỷ lệ thành công (0-1)
 */
function getMethodSuccessRate(method) {
    if (!methodPerformanceCache[method] || methodPerformanceCache[method].total === 0) {
        return 0.5; // Giá trị mặc định nếu không có dữ liệu
    }
    
    return methodPerformanceCache[method].correct / methodPerformanceCache[method].total;
}

// Thiết lập các hàm toàn cục
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

// Kiểm tra và thêm hàm getAccountBalance nếu không tồn tại
if (!betting.getAccountBalance) {
    betting.getAccountBalance = function getAccountBalance() {
        try {
            const dataDir = path.join(__dirname, '..', 'data');
            const accountFile = path.join(dataDir, 'account.json');
            if (fs.existsSync(accountFile)) {
                const accountData = JSON.parse(fs.readFileSync(accountFile, 'utf8'));
                return accountData.betting && accountData.betting.currentBalance !== undefined 
                    ? accountData.betting.currentBalance 
                    : (accountData.betting && accountData.betting.accountBalance) || 0;
            }
            return 0;
        } catch (error) {
            console.error(`❌ Lỗi khi đọc số dư tài khoản: ${error.message}`);
            return 0;
        }
    };
    console.log("📊 Đã thêm hàm getAccountBalance dự phòng");
}

/**
 * Dự đoán Tài Xỉu với thuật toán nhận dạng mẫu cân bằng (phiên bản 6.0)
 * @param {Object} page - Đối tượng trang web Puppeteer
 * @param {Array} history - Mảng lịch sử kết quả
 * @param {Number} index - Vị trí trong mảng numbers cần dự đoán (mặc định: 0)
 * @param {Boolean} log - Điều khiển hiển thị/ghi log (mặc định: true)
 * @returns {Object} Đối tượng dự đoán
 */
async function predict(page, history, index = 0, log = true) {
    try {
        if (!history || !Array.isArray(history) || history.length === 0) {
            console.error("❌ Không thể dự đoán: Không có lịch sử kết quả!");
            return null;
        }
        
        // Tạo drawId cho lần dự đoán này
        const nextDrawId = drawIdModule.generateNextDrawId(history[0].drawId);
        if (!nextDrawId) {
            console.error("❌ Không thể tạo drawId cho lần dự đoán tiếp theo!");
            return null;
        }
        
        // Kiểm tra xem có dự đoán cũ nào chưa xác nhận kết quả không
        let oldPrediction = null;
        const predictionFile = path.join(__dirname, '..', 'data', 'predictions.json');
        if (fs.existsSync(predictionFile)) {
            try {
                oldPrediction = JSON.parse(fs.readFileSync(predictionFile, 'utf8'));
                
                // Xác minh kết quả của dự đoán cũ
                if (oldPrediction && oldPrediction.drawId) {
                    const verificationResult = verifyPrediction(oldPrediction, history[0].numbers, log);
                    if (verificationResult) {
                        if (log) console.log(`✅ Đã xác minh kết quả dự đoán: DrawID ${oldPrediction.drawId}`);
                    }
                }
            } catch (error) {
                console.error(`❌ Lỗi khi đọc file dự đoán cũ: ${error.message}`);
            }
        }
        
        // Cập nhật tất cả các dự đoán đang chờ kết quả
        updateAllPendingPredictions(history, log);
        
        const dataDir = path.join(__dirname, '..', 'data');
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
            
            if (log && loginSuccess) console.log("✅ Đăng nhập thành công");
            
            // Nếu login mà số dư ít hơn 10k, tự động tắt betting
            if (loginSuccess && !account.isDemoMode(accountInfo)) {
                let balance = account.getAccountBalance ? account.getAccountBalance() : 0;
                if (balance < 10000) {
                    if (log) console.log(`⚠️ Số dư quá thấp: ${balance.toLocaleString('vi-VN')}đ, tắt chế độ đặt cược`);
                    account.disableBetting(accountInfo, accountFile, `Số dư quá thấp: ${balance.toLocaleString('vi-VN')}đ`, log);
                    return null;
                }
            }
        }
        
        // THÊM: Phân tích mức độ khó của giai đoạn hiện tại
        let difficultyLevel = 0.5;
        try {
            // Nếu đã implement hàm assessCurrentDifficulty
            if (predictor.assessCurrentDifficulty) {
                const difficultyAssessment = predictor.assessCurrentDifficulty(history, historyLogFile);
                difficultyLevel = difficultyAssessment.difficulty;
                
                if (difficultyLevel > 0.7) {
                    if (log) console.log(`⚠️ CẢNH BÁO: ${difficultyAssessment.reason}`);
                } else if (difficultyLevel > 0.5) {
                    if (log) console.log(`ℹ️ Lưu ý: ${difficultyAssessment.reason}`);
                }
            }
        } catch (error) {
            console.error(`❌ Lỗi khi phân tích độ khó: ${error.message}`);
        }
        
        // THÊM: Kiểm tra chuỗi thua liên tiếp
        const recentLosses = calculateRecentLosses(historyLogFile);
        if (recentLosses >= 3 && log) {
            console.log(`⚠️ Đang trong chuỗi thua ${recentLosses} lần liên tiếp, sẽ thận trọng hơn`);
        }
        
        // THÊM: Bỏ qua lượt nếu đang trong giai đoạn rất khó
        if (difficultyLevel > 0.75 && recentLosses >= 3) {
            if (log) console.log("🛡️ Áp dụng chiến lược phòng thủ: bỏ qua lượt cược này do giai đoạn khó và đang thua liên tiếp");
            return null;
        }

        try {
            if (!history || !Array.isArray(history) || history.length === 0) {
                if (log) console.log("⚠️ Không có dữ liệu lịch sử, không thể dự đoán");
                return null;
            }
            
            const latestDrawId = history[0].drawId;
            const safeNextDrawId = drawIdModule.calculateSafeNextDrawId(latestDrawId, predictionsFile, historyLogFile);
            
            // Kiểm tra và tạo file dự đoán nếu nó chưa tồn tại
            if (!fs.existsSync(predictionsFile)) {
                if (log) console.log(`📄 File dự đoán không tồn tại, tạo file mới: ${predictionsFile}`);
                fs.writeFileSync(predictionsFile, '{}', 'utf8');
            }
            
            if (fs.existsSync(predictionsFile)) {
                try {
                    const fileContent = fs.readFileSync(predictionsFile, 'utf8');
                    if (!fileContent || fileContent.trim() === '') {
                        if (log) console.log(`⚠️ File dự đoán rỗng, tạo dự đoán mới`);
                    } else {
                        const existingPrediction = JSON.parse(fileContent);
                        
                        // Kiểm tra xem existingPrediction và drawId có tồn tại không
                        if (existingPrediction && existingPrediction.drawId) {
                            const normalizedExistingDrawId = existingPrediction.drawId.replace(/_\d+$/, '');
                            
                            // Kiểm tra xem dự đoán có gần đây không
                            const isVeryRecentPrediction = (existingPrediction.timestamp && 
                                                            (new Date().getTime() - new Date(existingPrediction.timestamp).getTime()) < 10000);
                                                
                            if (normalizedExistingDrawId === safeNextDrawId && isVeryRecentPrediction) {
                                if (log) console.log(`ℹ️ Đã có dự đoán RẤT GẦN ĐÂY (< 10s) cho kỳ ${safeNextDrawId}, sử dụng dự đoán hiện có`);
                                return existingPrediction;
                            } else {
                                if (log) console.log(`ℹ️ Tạo dự đoán mới cho kỳ ${safeNextDrawId}`);
                            }
                        } else {
                            if (log) console.log(`⚠️ File dự đoán không hợp lệ, tạo dự đoán mới`);
                        }
                    }
                } catch (error) {
                    if (log) console.error(`❌ Lỗi khi đọc file dự đoán: ${error.message}`);
                }
            }


            if (isLoggedIn && canBet) {
                betting.processPreviousPrediction(predictionsFile, historyLogFile, history, accountInfo, log);
            } else {
                betting.processPreviousPrediction(predictionsFile, historyLogFile, history, null, log);
            }

            // Sử dụng cấu hình từ config.js
            if (log) console.log(`📈 Đang sử dụng cấu hình phiên bản ${config.version}`);

            // Trích xuất danh sách kỳ từ lịch sử
            const historyLimitOverride = config.analysis.historyLimit;
            
            // Tạo dự đoán bằng các phương pháp khác nhau
            const predictions = [];
            
            // Tính toán trọng số cho mỗi phương pháp
            const weights = { ...config.defaultWeights };
            
            // Tính số lần thua liên tiếp để sử dụng cho nhiều chức năng
            const recentLosses = calculateRecentLosses(historyLogFile);
            
            // Xác định khung giờ hiện tại
            const currentTimeSegment = getCurrentTimeSegment();
            if (log) console.log(`🕒 Khung giờ hiện tại: ${currentTimeSegment}`);
            
            // Kiểm tra xem có đang trong khung giờ khó khăn không
            const isDifficult = isDifficultPeriod(historyLogFile);
            if (isDifficult && log) {
                console.log(`⚠️ Phát hiện đang trong khung giờ khó khăn, áp dụng chiến lược thận trọng`);
            }
            
            // Chỉ sử dụng phương pháp phát hiện mẫu Tài Xỉu mới
            
            // Thu thập dự đoán từ phương pháp mẫu Tài Xỉu
            const taiXiuPatternsResult = detectTaiXiuPatterns(history, index);
            if (taiXiuPatternsResult.confidence > 0) {
                predictions.push({
                    method: "TaiXiuPatterns",
                    prediction: taiXiuPatternsResult.predictTai,
                    confidence: taiXiuPatternsResult.confidence,
                    reason: taiXiuPatternsResult.reason || "Mẫu Tài Xỉu phổ biến"
                });
                
                // Thiết lập trọng số mặc định cho phương pháp mới
                weights["TaiXiuPatterns"] = 0.98; // Ưu tiên cực cao cho mẫu Tài Xỉu
                
                if (log) {
                    console.log(`🧩 ${taiXiuPatternsResult.reason}`);
                }
            }

            // Tính toán dự đoán cuối cùng
            let finalPrediction = null;
            let highestCombinedScore = 0;
            let selectedMethod = "";
            let selectedReason = "";
            
            // Điều chỉnh ngưỡng tin cậy theo cấu hình
            let confidenceThreshold = config.analysis.confidenceThreshold;
            
            // Áp dụng ngưỡng tin cậy động theo thời gian nếu được cấu hình
            if (config.analysis.dynamicThreshold) {
                const currentHour = new Date().getHours();
                const isPeakHour = currentHour >= config.analysis.peakHoursStart && 
                                   currentHour < config.analysis.peakHoursEnd;
                
                if (isPeakHour) {
                    confidenceThreshold = config.analysis.peakHoursThreshold;
                }
            }
            
            // Khung giờ khó khăn, tăng ngưỡng tin cậy
            if (isDifficult && config.betting.difficultPeriodHandling) {
                confidenceThreshold = Math.max(
                    confidenceThreshold,
                    config.betting.difficultPeriodHandling.confidenceThreshold
                );
                if (log) console.log(`🔄 Tăng ngưỡng tin cậy lên ${confidenceThreshold.toFixed(2)} trong khung giờ khó khăn`);
            }
            
            // Xử lý đặc biệt sau chuỗi thất bại liên tiếp
            if (config.betting && config.betting.confidenceAdjustment) {
                if (recentLosses >= 2) { // Giảm từ 3 xuống 2 để phản ứng sớm hơn với chuỗi thua
                    // Tăng ngưỡng tin cậy sau chuỗi thua
                    confidenceThreshold = Math.max(
                        confidenceThreshold, 
                        config.betting.minConfidenceAfterLoss || 0.75
                    );
                    
                    if (log) console.log(`🔄 Tăng ngưỡng tin cậy lên ${confidenceThreshold.toFixed(2)} sau ${recentLosses} lần thua liên tiếp`);
                }
            }
            
            // Lọc dự đoán theo ngưỡng tin cậy
            const highConfidencePredictions = predictions.filter(p => p.confidence >= confidenceThreshold);
            
            // Ưu tiên các phương pháp có hiệu quả cao
            const priorityMethods = ["TaiXiuPatterns"];
            
            // Không cần xác định phương pháp gây chuỗi thua vì chỉ có 1 phương pháp duy nhất
            
            if (highConfidencePredictions.length > 0) {
                // Tìm kiếm dự đoán của phương pháp TaiXiuPatterns
                const taiXiuPrediction = highConfidencePredictions.find(p => p.method === "TaiXiuPatterns");
                
                // Nếu có dự đoán từ TaiXiuPatterns với độ tin cậy cao, ưu tiên sử dụng
                if (taiXiuPrediction && taiXiuPrediction.confidence > 0.75) {
                    finalPrediction = taiXiuPrediction.prediction;
                    selectedMethod = taiXiuPrediction.method;
                    selectedReason = taiXiuPrediction.reason;
                    
                    if (log) console.log(`🌟 Ưu tiên sử dụng phương pháp ${selectedMethod} với độ tin cậy ${taiXiuPrediction.confidence.toFixed(2)}`);
                } else {
                    // Tính toán điểm kết hợp cho mỗi dự đoán có độ tin cậy cao
                    for (const prediction of highConfidencePredictions) {
                        const methodWeight = weights[prediction.method] || 0.1;
                        
                        // Điều chỉnh ưu tiên dựa trên phương pháp và chuỗi thua
                        let priorityBonus = 0;
                        
                        if (priorityMethods.includes(prediction.method)) {
                            priorityBonus = 0.1;
                        }
                        
                                                // Không cần xử lý blacklistedMethod vì chỉ có 1 phương pháp duy nhất
                        
                        // Điều chỉnh dự đoán trong khung giờ khó khăn
                        if (isDifficult && (prediction.method === "TimeBasedPattern")) {
                            // Giảm độ tin cậy xuống nếu là giai đoạn khó khăn
                            finalConfidence *= 0.8;
                            if (log) console.log(`⚠️ Giảm độ tin cậy trong khung giờ khó khăn`);
                        }
                        
                        // Nếu có chuỗi thua và cấu hình cho phép đảo ngược, đảo ngược dự đoán
                        let adjustedPrediction = prediction.prediction;
                        let reversalApplied = false;
                        
                        // Kiểm tra điều kiện để đảo ngược dự đoán sau chuỗi thua
                        if (recentLosses >= config.streakBreaker.maxConsecutiveFailures && 
                            config.streakBreaker && 
                            config.streakBreaker.reverseAfterStreak) {
                            
                            // Đảo ngược dự đoán của tất cả các phương pháp hoặc chỉ phương pháp gây ra chuỗi thua
                            if (blacklistedMethod === null || prediction.method === blacklistedMethod) {
                                adjustedPrediction = !adjustedPrediction; // Đảo ngược dự đoán
                                reversalApplied = true;
                                methodWasReversed = true;
                                
                                if (log) console.log(`🔄 Đảo ngược dự đoán của phương pháp ${prediction.method} từ ${prediction.prediction ? 'Tài' : 'Xỉu'} sang ${adjustedPrediction ? 'Tài' : 'Xỉu'}`);
                                
                                // Ghi log đảo ngược dự đoán
                                try {
                                    const logFile = path.join(__dirname, '..', 'data', 'prediction_reversal_log.txt');
                                    logger.logPredictionReversal(
                                        logFile,
                                        safeNextDrawId,
                                        prediction.method,
                                        prediction.prediction,
                                        adjustedPrediction,
                                        `${recentLosses} lần thua liên tiếp, phương pháp thất bại: ${blacklistedMethod || 'Unknown'}`
                                    );
                                } catch (logError) {
                                    console.error(`❌ Lỗi khi ghi log đảo ngược: ${logError.message}`);
                                }
                            }
                        }
                        // Kiểm tra nếu cần duy trì hướng dự đoán sau chuỗi thua dài
                        else if (recentLosses >= config.streakBreaker.longLossThreshold && 
                                 config.streakBreaker && 
                                 config.streakBreaker.maintainDirectionAfterLosses) {
                            
                            // Đối với chuỗi thua dài, không đảo ngược mà duy trì hướng dự đoán
                            // Không sử dụng betBreaker.getPreviousPredictionDirection nữa
                            const recentPredictionDirection = getPreviousPredictionFromLog(historyLogFile);
                            
                            if (recentPredictionDirection !== null) {
                                // Duy trì cùng hướng dự đoán với lần gần nhất
                                const isTai = recentPredictionDirection === 'T';
                                
                                // Nếu dự đoán hiện tại khác với hướng muốn duy trì, đảo ngược nó
                                if (prediction.prediction !== isTai) {
                                    adjustedPrediction = isTai;
                                    reversalApplied = true;
                                    methodWasReversed = true;
                                    
                                    if (log) console.log(`🔄 Duy trì hướng dự đoán ${isTai ? 'Tài' : 'Xỉu'} sau ${recentLosses} lần thua liên tiếp`);
                                    
                                    // Ghi log
                                    try {
                                        const logFile = path.join(__dirname, '..', 'data', 'prediction_direction_log.txt');
                                        logger.logPredictionReversal(
                                            logFile,
                                            safeNextDrawId,
                                            prediction.method,
                                            prediction.prediction,
                                            adjustedPrediction,
                                            `Duy trì hướng dự đoán sau ${recentLosses} lần thua liên tiếp`
                                        );
                                    } catch (logError) {
                                        console.error(`❌ Lỗi khi ghi log duy trì hướng dự đoán: ${logError.message}`);
                                    }
                                }
                            }
                        }
                        
                        // Mới: Điều chỉnh ưu tiên dựa trên hiệu suất lịch sử của phương pháp
                        const successRate = getMethodSuccessRate(prediction.method);
                        let performanceBonus = 0;
                        
                        if (successRate > 0.6) {
                            performanceBonus = (successRate - 0.5) * 0.5; // Thưởng cho hiệu suất tốt
                            if (log && performanceBonus > 0.05) {
                                console.log(`📈 Tăng ưu tiên cho ${prediction.method} dựa trên hiệu suất tốt (${Math.round(successRate * 100)}%)`);
                            }
                        }
                        
                        const combinedScore = prediction.confidence * (methodWeight + priorityBonus + performanceBonus);
                        
                        if (combinedScore > highestCombinedScore) {
                            highestCombinedScore = combinedScore;
                            finalPrediction = adjustedPrediction; // Dùng dự đoán đã điều chỉnh nếu cần
                            selectedMethod = prediction.method;
                            selectedReason = reversalApplied ? 
                                `${prediction.reason} (đảo ngược sau ${recentLosses} lần thua)` : 
                                prediction.reason;
                        }
                    }
                }
            } else if (predictions.length > 0) {
                // Nếu không có dự đoán nào vượt ngưỡng, chọn dự đoán có điểm kết hợp cao nhất
                for (const prediction of predictions) {
                    const methodWeight = weights[prediction.method] || 0.1;
                    const combinedScore = prediction.confidence * methodWeight;
                    
                    if (combinedScore > highestCombinedScore) {
                        highestCombinedScore = combinedScore;
                        finalPrediction = prediction.prediction;
                        selectedMethod = prediction.method;
                        selectedReason = prediction.reason;
                    }
                }
                
                if (log) console.log(`⚠️ Không có dự đoán nào vượt ngưỡng tin cậy ${confidenceThreshold.toFixed(2)}, chọn dự đoán tốt nhất`);
            } else {
                if (log) console.log("❌ Không có dự đoán nào từ các thuật toán");
                return null;
            }
            
            // Mới: Kiểm tra hiệu suất gần đây để quyết định có nên đặt cược hay không
            let shouldSkipBet = false;
            const recentAccuracy = calculateRecentAccuracy(historyLogFile);
            
            if (config.betting.difficultPeriodHandling && config.betting.difficultPeriodHandling.enabled) {
                if (recentAccuracy < config.betting.difficultPeriodHandling.minAccuracyToBet) {
                    if (log) console.log(`⚠️ Hiệu suất gần đây quá thấp (${Math.round(recentAccuracy * 100)}%), bỏ qua đặt cược`);
                    shouldSkipBet = true;
                }
            }
            
            // Tạo đối tượng dự đoán cuối cùng
            const predictedNumbers = predictor.generateNumbers(finalPrediction, index);
            const predictedValue = predictedNumbers[index]; // Lấy giá trị dự đoán tại vị trí index
            
            const result = {
                drawId: safeNextDrawId,
                timestamp: new Date().toISOString(),
                doanTaiXiu: finalPrediction ? 'Tài' : 'Xỉu', // Thêm trường mới hiển thị rõ ràng dự đoán Tài/Xỉu 
                prediction: finalPrediction, // Giữ lại để tương thích ngược
                method: selectedMethod,
                confidence: highestCombinedScore,
                reason: selectedReason,
                numbers: predictedNumbers,
                predictedValue: predictedValue, // Số dự đoán tại vị trí index
                targetIndex: index, // Giữ lại vì quan trọng để biết vị trí nào đang dự đoán
                timeSegment: currentTimeSegment,
                version: config.version // Thêm phiên bản từ config
            };
            
            // Thêm tiền cược nếu có đăng nhập và được phép cược
            if (isLoggedIn && canBet && !shouldSkipBet) {
                const baseAmount = betting.calculateBetAmount(accountInfo, result.confidence, recentLosses);
                
                // Điều chỉnh số tiền cược dựa trên độ tin cậy và các yếu tố khác
                let adjustedAmount = baseAmount;
                
                // Giảm mức cược nếu đang trong khung giờ khó khăn
                if (isDifficult && config.betting.difficultPeriodHandling && 
                    config.betting.difficultPeriodHandling.betAmountMultiplier) {
                    adjustedAmount = Math.floor(adjustedAmount * config.betting.difficultPeriodHandling.betAmountMultiplier);
                    if (log) console.log(`💰 Điều chỉnh mức cược trong khung giờ khó khăn: ${adjustedAmount}`);
                }
                
                result.betAmount = adjustedAmount;
            }
            
            // Lưu dự đoán gần đây nhất vào bộ nhớ (cho logic internal)
            lastPredictionData = {
                prediction: finalPrediction,
                confidence: highestCombinedScore,
                timestamp: Date.now()
            };
            
            // Lưu kết quả dự đoán vào file predictions.json
            try {
                fs.writeFileSync(predictionsFile, JSON.stringify(result, null, 2), 'utf8');
                if (log) console.log(`✅ Đã lưu dự đoán vào file: ${predictionsFile}`);
            } catch (error) {
                console.error(`❌ Lỗi khi lưu dự đoán: ${error.message}`);
            }
            
            return result;
        } catch (error) {
            console.error("❌ Lỗi trong quá trình dự đoán:", error);
            return null;
        }
    } catch (error) {
        console.error("❌ Lỗi ngoài trong hàm predict:", error);
        return null;
    }
}

/**
 * Tính số lần thua liên tiếp gần đây từ file log
 * @param {string} logFile - Đường dẫn đến file log
 * @returns {number} Số lần thua liên tiếp
 */
function calculateRecentLosses(logFile) {
    try {
        if (!fs.existsSync(logFile)) return 0;
        
        const data = fs.readFileSync(logFile, 'utf8');
        const lines = data.split('\n').filter(line => line.trim() !== '');
        
        let consecutiveLosses = 0;
        
        // Đọc từ dòng mới nhất (trên cùng) xuống
        for (const line of lines) {
            if (line.includes('| Sai |')) {
                consecutiveLosses++;
            } else if (line.includes('| Đúng |')) {
                break; // Dừng khi gặp kết quả đúng
            }
        }
        
        return consecutiveLosses;
    } catch (error) {
        console.error(`Lỗi khi đọc log: ${error.message}`);
        return 0;
    }
}

/**
 * Lấy phương pháp gây ra chuỗi thua gần đây
 * @param {string} logFile - Đường dẫn đến file log
 * @returns {string|null} Tên phương pháp hoặc null nếu không tìm thấy
 */
function getRecentFailedMethod(logFile) {
    try {
        if (!fs.existsSync(logFile)) return null;
        
        const data = fs.readFileSync(logFile, 'utf8');
        const lines = data.split('\n').filter(line => line.trim() !== '');
        
        // Chỉ xem xét các dòng thất bại gần đây
        for (const line of lines) {
            if (line.includes('| Sai |')) {
                // Trích xuất phương pháp từ dòng log
                const methodMatch = line.match(/\| Phương pháp: (\w+) \|/);
                if (methodMatch && methodMatch[1]) {
                    return methodMatch[1];
                }
                break; // Chỉ lấy phương pháp từ lần thua gần nhất
            } else if (line.includes('| Đúng |')) {
                break; // Dừng khi gặp kết quả đúng
            }
        }
        
        return null;
    } catch (error) {
        console.error(`Lỗi khi đọc log để lấy phương pháp: ${error.message}`);
        return null;
    }
}

/**
 * Xác thực kết quả dự đoán so với số thực tế
 * @param {Object} prediction - Dự đoán đã đưa ra
 * @param {Array} actualNumbers - Các số thực tế
 * @returns {Object} Kết quả xác thực
 */
function verifyPrediction(prediction, actualNumbers) {
    if (!prediction || !actualNumbers) return;
    
    const targetIndex = prediction.targetIndex || 0;
    let predictedTai, predictedType;
    
    // Xác định loại dự đoán (Tài/Xỉu)
    if (prediction.predictionType) {
        // Sử dụng trường predictionType nếu có
        predictedType = prediction.predictionType;
        predictedTai = (predictedType === 'Tài');
    } else if (prediction.predictTai !== undefined) {
        // Sử dụng trường predictTai cũ nếu không có predictionType
        predictedTai = prediction.predictTai;
        predictedType = predictedTai ? 'Tài' : 'Xỉu';
    } else {
        // Nếu không có cả hai, xác định từ predictionNumber
        const predictionNumber = prediction.predictionNumber || prediction.numbers[targetIndex];
        predictedTai = (predictionNumber >= 5);
        predictedType = predictedTai ? 'Tài' : 'Xỉu';
    }
    
    const predictedNumber = prediction.predictionNumber || prediction.numbers[targetIndex];
    
    const actualNumber = actualNumbers[targetIndex];
    const actualTai = actualNumber >= 5;
    const actualType = actualTai ? 'Tài' : 'Xỉu';
    
    const isCorrect = predictedTai === actualTai;
    
    // Ghi log với thông tin chi tiết hơn
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    const logEntry = `[${timestamp}] - ${prediction.drawId} - Dự đoán: ${predictedNumber} (${predictedType}) | Số thực tế: ${actualNumber} (${actualType}) | ${isCorrect ? 'Đúng ✓' : 'Sai ✗'} | Phương pháp: ${prediction.method} | Vị trí: ${targetIndex} | Phiên bản: ${prediction.version || 'unknown'}`;
    
    // Thư mục lưu trữ
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        console.log(`📁 Tạo thư mục data mới từ verifyPrediction`);
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Đường dẫn file log
    const logFile = path.join(dataDir, 'prediction_log.txt');
    
    // Kiểm tra và cập nhật log
    try {
        let existingLog = '';
        let existingLines = [];
        let foundExisting = false;
        let updatedContent = '';
        
        if (fs.existsSync(logFile)) {
            existingLog = fs.readFileSync(logFile, 'utf8');
            existingLines = existingLog.split('\n');
            
            // Trước tiên kiểm tra xem DrawID này đã có kết quả trong log chưa
            const hasCompletedResult = existingLog.includes(`- ${prediction.drawId} -`) && 
                                      existingLog.includes(`Số thực tế: ${actualNumber}`) && 
                                      (existingLog.includes(`Đúng ✓`) || existingLog.includes(`Sai ✗`));
            
            if (hasCompletedResult) {
                console.log(`⚠️ Kết quả cho DrawID ${prediction.drawId} đã tồn tại trong log, không ghi lại.`);
                // Vẫn hiển thị kết quả nhưng không ghi log
                console.log(`✅ Kết quả dự đoán: DrawID ${prediction.drawId}`);
                console.log(`📊 Số dự đoán: ${predictedNumber} (${predictedType}) | Thực tế: ${actualNumber} (${actualType})`);
                console.log(`${isCorrect ? '🟢 ĐÚNG' : '🔴 SAI'} | Phương pháp: ${prediction.method}`);
                return;
            }
            
            // Kiểm tra có dòng dự đoán chưa có kết quả không
            for (let i = 0; i < existingLines.length; i++) {
                const line = existingLines[i];
                // Tìm dòng chứa DrawID và chưa có phần "Số thực tế"
                if (line.includes(`- ${prediction.drawId} -`) && line.includes(`Dự đoán:`) && !line.includes(`Số thực tế:`)) {
                    // Tìm thấy dòng cần cập nhật
                    foundExisting = true;
                    
                    // Tạo dòng mới chứa kết quả
                    const resultInfo = `Số thực tế: ${actualNumber} (${actualType}) | ${isCorrect ? 'Đúng ✓' : 'Sai ✗'} | `;
                    // Tìm vị trí để chèn kết quả vào (trước "Phương pháp:")
                    const updatedLine = line.replace('Phương pháp:', `${resultInfo}Phương pháp:`);
                    existingLines[i] = updatedLine;
                    
                    console.log(`✅ Đã cập nhật kết quả cho DrawID ${prediction.drawId}: ${isCorrect ? 'ĐÚNG ✓' : 'SAI ✗'}`);
                    break;
                }
            }
            
            // Nếu tìm thấy dòng để cập nhật, ghi lại nội dung mới
            if (foundExisting) {
                updatedContent = existingLines.join('\n');
                fs.writeFileSync(logFile, updatedContent, 'utf8');
            } else {
                // Nếu không tìm thấy, thêm mới vào đầu file
                fs.writeFileSync(logFile, logEntry + '\n' + existingLog, { encoding: 'utf8' });
                console.log(`✅ Đã thêm mới kết quả dự đoán cho DrawID ${prediction.drawId} vào log.`);
            }
        } else {
            // Nếu file chưa tồn tại, tạo mới và ghi log
            fs.writeFileSync(logFile, logEntry + '\n', { encoding: 'utf8' });
            console.log(`✅ Đã tạo file log mới với kết quả DrawID ${prediction.drawId}.`);
        }
        
        // Hiển thị kết quả chi tiết
        if (!foundExisting) {
            console.log(`✅ Kết quả dự đoán: DrawID ${prediction.drawId}`);
            console.log(`📊 Số dự đoán: ${predictedNumber} (${predictedType}) | Thực tế: ${actualNumber} (${actualType})`);
            console.log(`${isCorrect ? '🟢 ĐÚNG' : '🔴 SAI'} | Phương pháp: ${prediction.method}`);
        }
        
        // Cập nhật cache hiệu suất phương pháp
        if (global.updateMethodPerformance) {
            global.updateMethodPerformance(prediction.method, isCorrect);
        }
        
        // Đã loại bỏ tham chiếu đến betBreaker.updateBetPerformance
        
        // Trả về kết quả để có thể sử dụng ở nơi gọi hàm
        return {
            isCorrect,
            actualNumber,
            actualType,
            predictedNumber,
            predictedType
        };
        
    } catch (error) {
        console.error(`❌ Lỗi khi ghi log: ${error.message}`);
        return null;
    }
}

/**
 * Cập nhật tất cả các dự đoán cũ đang chờ kết quả
 * @param {Array} history - Lịch sử kết quả mới nhất
 * @param {boolean} log - Bật chế độ log (mặc định: true)
 * @returns {boolean} - Kết quả thực hiện
 */
function updateAllPendingPredictions(history, log = true) {
    try {
        if (!history || !Array.isArray(history) || history.length === 0) {
            if (log) console.log('⚠️ Không có dữ liệu lịch sử để cập nhật các dự đoán đang chờ kết quả');
            return false;
        }

        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            if (log) console.log(`📁 Tạo thư mục data mới từ updateAllPendingPredictions`);
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        const logFile = path.join(dataDir, 'prediction_log.txt');

        if (!fs.existsSync(logFile)) {
            if (log) console.log('⚠️ Chưa có file log dự đoán');
            return false;
        }

        // Đọc nội dung file log
        const logContent = fs.readFileSync(logFile, 'utf8');
        const logLines = logContent.split('\n').filter(line => line.trim() !== '');

        // Tìm các dòng chưa có kết quả (không có "Đúng ✓" hoặc "Sai ✗")
        const pendingLines = logLines.filter(line => 
            !line.includes('Đúng ✓') && 
            !line.includes('Sai ✗') && 
            !line.includes('Số thực tế:') && 
            line.includes('Dự đoán:')
        );

        if (pendingLines.length === 0) {
            if (log) console.log('ℹ️ Không có dự đoán nào cần cập nhật kết quả');
            return true;
        }

        let updatedCount = 0;
        let updatedLogContent = logContent;

        // Duyệt qua từng dòng cần cập nhật
        for (const line of pendingLines) {
            // Trích xuất DrawID từ dòng log
            const drawIdMatch = line.match(/- ([0-9_]+) -/);
            if (!drawIdMatch) continue;

            const drawId = drawIdMatch[1];
            const normalizedDrawId = drawIdModule.normalizeDrawId(drawId);

            // Tìm kết quả tương ứng trong history
            const matchingResult = history.find(h => {
                const historyDrawId = drawIdModule.normalizeDrawId(h.drawId);
                return historyDrawId === normalizedDrawId || h.drawId === drawId;
            });

            // Kiểm tra có tìm thấy kết quả và kết quả có mảng numbers hợp lệ không
            if (!matchingResult || !matchingResult.numbers || !Array.isArray(matchingResult.numbers)) {
                if (log) console.log(`ℹ️ Không tìm thấy kết quả hợp lệ cho DrawID ${drawId}`);
                continue;
            }

            // Trích xuất thông tin dự đoán
            const predictionMatch = line.match(/Dự đoán: (\d+) \((Tài|Xỉu)\)/);
            if (!predictionMatch) continue;

            const predictedNumber = parseInt(predictionMatch[1]);
            const predictedType = predictionMatch[2];
            const predictedTai = predictedType === 'Tài';

            // Lấy thông tin phương pháp và vị trí
            const methodMatch = line.match(/Phương pháp: (\w+)/);
            const method = methodMatch ? methodMatch[1] : 'Unknown';

            const indexMatch = line.match(/Vị trí: (\d+)/);
            const index = indexMatch ? parseInt(indexMatch[1]) : 0;
            
            // Kiểm tra xem index có nằm trong phạm vi của mảng numbers không
            if (index >= matchingResult.numbers.length) {
                if (log) console.log(`ℹ️ Vị trí ${index} không hợp lệ cho kết quả của DrawID ${drawId}`);
                continue;
            }

            // Xác định kết quả thực tế
            const actualNumber = matchingResult.numbers[index];
            const actualTai = actualNumber >= 5;
            const actualType = actualTai ? 'Tài' : 'Xỉu';
            
            // Kiểm tra kết quả đúng/sai
            const isCorrect = predictedTai === actualTai;
            
            // Tạo phần cập nhật kết quả
            const resultText = `Số thực tế: ${actualNumber} (${actualType}) | ${isCorrect ? 'Đúng ✓' : 'Sai ✗'}`;
            
            // Tạo dòng log cập nhật
            const updatedLine = line.replace(/Phương pháp:/, `${resultText} | Phương pháp:`);
            
            // Cập nhật nội dung log
            updatedLogContent = updatedLogContent.replace(line, updatedLine);
            
            // Cập nhật cache hiệu suất phương pháp
            if (global.updateMethodPerformance) {
                global.updateMethodPerformance(method, isCorrect);
            }
            
            updatedCount++;
            if (log) console.log(`✅ Đã cập nhật kết quả cho DrawID ${drawId}: ${isCorrect ? 'ĐÚNG ✓' : 'SAI ✗'}`);
        }

        // Ghi lại file log nếu có cập nhật
        if (updatedCount > 0) {
            fs.writeFileSync(logFile, updatedLogContent, 'utf8');
            if (log) console.log(`✅ Đã cập nhật tổng cộng ${updatedCount}/${pendingLines.length} dự đoán`);
        } else {
            if (log) console.log('ℹ️ Không có dự đoán nào được cập nhật (không tìm thấy kết quả tương ứng)');
        }

        return true;
    } catch (error) {
        if (log) console.error(`❌ Lỗi khi cập nhật các dự đoán đang chờ: ${error.message}`);
        return false;
    }
}

// Bổ sung hàm thay thế cho getCurrentTimeSegment và isDifficultPeriod
// Các hàm này được triển khai trực tiếp thay vì import từ timeAnalysis.js
// Do tính năng timeAnalysis đã bị vô hiệu hóa (enabled: false trong config.js)
// File timeAnalysis.js có thể được loại bỏ hoàn toàn mà không ảnh hưởng đến chức năng hiện tại
function getCurrentTimeSegment() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'morning';    // Sáng: 05:00 - 11:00
    if (hour >= 11 && hour < 13) return 'noon';      // Trưa: 11:00 - 13:00
    if (hour >= 13 && hour < 18) return 'afternoon'; // Chiều: 13:00 - 18:00
    if (hour >= 18 && hour < 22) return 'evening';   // Tối: 18:00 - 22:00
    return 'latenight';                              // Khuya: 22:00 - 05:00
}

function isDifficultPeriod(logFile) {
    // Đơn giản hóa: Trả về giờ cao điểm khó dự đoán (11h-13h và 16h-19h)
    const hour = new Date().getHours();
    return (hour >= 11 && hour < 13) || (hour >= 16 && hour < 19);
}

/**
 * Lấy hướng dự đoán trước đó từ file log
 * @param {string} logFile - Đường dẫn tới file log
 * @param {number} lines - Số dòng cần xem xét
 * @returns {string|null} 'T' cho Tài, 'X' cho Xỉu, hoặc null nếu không tìm thấy
 */
function getPreviousPredictionFromLog(logFile, lines = 5) {
    try {
        if (!fs.existsSync(logFile)) return null;
        
        const data = fs.readFileSync(logFile, 'utf8');
        const logLines = data.split('\n').filter(line => line.trim()).slice(0, lines);
        
        for (const line of logLines) {
            if (line.includes('Dự đoán:')) {
                // Tìm thông tin dự đoán
                const match = line.match(/Dự đoán: \d+ \((Tài|Xỉu)\)/);
                if (match) {
                    const type = match[1];
                    return type === 'Tài' ? 'T' : 'X';
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error(`❌ Lỗi khi đọc hướng dự đoán trước đó: ${error.message}`);
        return null;
    }
}

// Tạo các hàm toàn cục để các module khác có thể truy cập
global.verifyPrediction = verifyPrediction;
global.updateMethodPerformance = updateMethodPerformance;
global.getMethodSuccessRate = getMethodSuccessRate;

// Export các hàm cần thiết
module.exports = {
    predict,
    verifyPrediction,
    updateMethodPerformance,
    getMethodSuccessRate,
    updateAllPendingPredictions,
    calculateRecentLosses,
    getRecentFailedMethod,
    getCurrentTimeSegment,
    isDifficultPeriod,
    calculateRecentAccuracy,
    getPreviousPredictionFromLog
};
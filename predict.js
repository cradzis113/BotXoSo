// Thêm dòng này ở đầu file, cùng với các import khác
const fs = require('fs');

/**
 * Kiểm tra và chuẩn hóa tham số đầu vào
 */
function validateInputParams(history, index, limit, fileConfig) {
    if (!history || !Array.isArray(history)) {
        return {
            isValid: false,
            error: "History phải là một mảng"
        };
    }

    if (history.length === 0) {
        return {
            isValid: false,
            error: "History không được rỗng"
        };
    }

    if (typeof index !== 'number' || index < 0) {
        return {
            isValid: false,
            error: "Index phải là số không âm"
        };
    }

    if (!limit || !Array.isArray(limit.limitList) || !limit.limitMain) {
        return {
            isValid: false,
            error: "Limit không hợp lệ"
        };
    }

    if (!fileConfig || !Array.isArray(fileConfig) || fileConfig.length < 2) {
        return {
            isValid: false,
            error: "FileConfig không hợp lệ"
        };
    }

    return {
        isValid: true,
        limit: limit
    };
}

// Thêm hàm mới để phân tích hiệu suất của từng limit
function analyzePerformanceByLimit(fileConfig, index) {
    const fs = require('fs');
    const limitPerformance = {};
    const allLimits = [5, 10, 15];

    // Phân tích hiệu suất cho từng limit
    for (const limit of allLimits) {
        const fileName = `${fileConfig[0]}_index${index}_limit${limit}.performance`;
        if (fs.existsSync(fileName)) {
            try {
                // Sử dụng hàm phân tích kết quả thực tế
                const actualResults = analyzeActualResults(fileName);
                const trends = analyzeActualTrends(actualResults);

                // Lấy 20 kết quả gần nhất để phân tích
                const recentResults = actualResults.slice(0, 20);
                const totalPredictions = recentResults.length;

                // Đọc nội dung file để xác định số lần dự đoán đúng
                const content = fs.readFileSync(fileName, 'utf8');
                const lines = content.split('\n').filter(line => line.includes('Chu kỳ |'));
                const recentLines = lines.slice(-20);
                const correctPredictions = recentLines.filter(line => line.includes('| Đúng')).length;

                // Tính hiệu suất và số lần đúng liên tiếp
                const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
                let consecutiveCorrect = 0;
                for (let i = recentLines.length - 1; i >= 0; i--) {
                    if (recentLines[i].includes('| Đúng')) {
                        consecutiveCorrect++;
                    } else {
                        break;
                    }
                }

                limitPerformance[limit] = {
                    accuracy,
                    consecutiveCorrect,
                    totalPredictions,
                    correctPredictions,
                    recentTrends: trends // Thêm thông tin xu hướng gần đây
                };
            } catch (error) {
                console.error(`Lỗi khi đọc file limit ${limit}:`, error);
            }
        }
    }

    return limitPerformance;
}

// Sửa hàm để chọn limit tốt nhất (dùng history khi chưa đủ dữ liệu)
function selectBestLimit(performanceData, defaultLimit, history, index, limitList = [5, 10, 15]) {
    let bestLimit = defaultLimit;
    let bestScore = 0;
    
    // THÊM MỚI: Kiểm tra chuỗi dự đoán sai gần đây để quyết định đổi limit
    try {
        const fs = require('fs');
        const combinedPath = `taixiu_history_combined_performance.log`;
        
        if (fs.existsSync(combinedPath)) {
            const content = fs.readFileSync(combinedPath, 'utf8');
            const lines = content.split('\n').filter(line => line.includes('Chu kỳ |'));
            
            // Lấy 4 kết quả gần nhất để phân tích
            const recentResults = lines.slice(-4);
            
            if (recentResults.length >= 3) {
                // Lấy giá trị limit hiện tại
                const currentLimitMatch = recentResults[0].match(/\| Limit: (\d+)/);
                const currentLimit = currentLimitMatch ? parseInt(currentLimitMatch[1]) : defaultLimit;
                
                // Đếm số lần dự đoán sai với limit hiện tại
                const wrongPredictions = recentResults
                    .filter(line => line.includes(`| Limit: ${currentLimit}`) && line.includes('| Sai'))
                    .length;
                
                // Nếu có ít nhất 2 dự đoán sai liên tiếp với limit hiện tại
                if (wrongPredictions >= 2) {
                    console.log(`Phát hiện ${wrongPredictions} dự đoán sai với limit=${currentLimit}, chuyển sang limit khác`);
                    
                    // Chọn limit khác trong danh sách
                    const otherLimits = limitList.filter(l => l !== currentLimit);
                    
                    // Nếu có limit khác trong danh sách
                    if (otherLimits.length > 0) {
                        // Ưu tiên limit đã có dữ liệu hiệu suất tốt
                        let foundBetterLimit = false;
                        
                        for (const alternativeLimit of otherLimits) {
                            // Kiểm tra nếu có dữ liệu hiệu suất cho limit này và nó có >=4 dự đoán
                            if (performanceData[alternativeLimit] && 
                                performanceData[alternativeLimit].totalPredictions >= 4) {
                                
                                // Đảm bảo đây là một limit tốt hơn
                                const accuracy = performanceData[alternativeLimit].correctPredictions / 
                                                performanceData[alternativeLimit].totalPredictions;
                                
                                // Nếu độ chính xác trên 50%, chọn limit này
                                if (accuracy > 0.5) {
                                    bestLimit = alternativeLimit;
                                    bestScore = 0.8; // Điểm số cao để đảm bảo được chọn
                                    foundBetterLimit = true;
                                    break;
                                }
                            }
                        }
                        
                        // Nếu không tìm thấy limit tốt hơn, chọn ngẫu nhiên limit khác
                        if (!foundBetterLimit) {
                            // Xáo trộn mảng để chọn ngẫu nhiên
                            const randomIndex = Math.floor(Math.random() * otherLimits.length);
                            bestLimit = otherLimits[randomIndex];
                            bestScore = 0.7; // Đủ cao để được chọn
                        }
                        
                        // Trả về kết quả sớm, không cần tính toán thêm
                        return {
                            limit: bestLimit,
                            score: bestScore
                        };
                    }
                }
            }
        }
    } catch (error) {
        console.error("Lỗi khi kiểm tra chuỗi dự đoán sai:", error);
    }
    
    // Phần còn lại của hàm giữ nguyên
    // [Giữ nguyên code tính toán dựa trên performance data]

    return {
        limit: bestLimit,
        score: bestScore > 0 ? bestScore : 0.5
    };
}

/**
 * Dự đoán số tiếp theo và tự động học từ file performance
 */
async function predictNumbers(history, index = 0, limit = { limitList: [5, 10, 15], limitMain: 15 }, fileConfig = ["taixiu_history", true], log = false) {
    try {
        // Các phần validate đầu vào giữ nguyên
        const validatedParams = validateInputParams(history, index, limit, fileConfig);
        if (!validatedParams.isValid) {
            if (log) console.error("Params không hợp lệ:", validatedParams.error);
            throw new Error(validatedParams.error);
        }

        // Bước 1: Phân tích hiệu suất và chọn limit tốt nhất
        const performanceData = analyzePerformanceByLimit(fileConfig, index);
        const bestLimit = selectBestLimit(performanceData, validatedParams.limit.limitMain, history, index, validatedParams.limit.limitList);

        if (log) {
            console.log("\n=== KẾT QUẢ CHỌN LIMIT ===");
            console.log(`- Limit tốt nhất: ${bestLimit.limit}`);
            console.log(`- Điểm số: ${(bestLimit.score * 100).toFixed(2)}%`);
        }

        // Lấy và xác thực drawId 
        const currentData = history[0];
        const currentDrawId = currentData.drawId;
        const prefix = currentDrawId.slice(0, -2);
        const currentSequence = parseInt(currentDrawId.slice(-2));
        const nextSequence = currentSequence + 1;
        const nextDrawId = `${prefix}${nextSequence.toString().padStart(2, '0')}`;

        // Bước 2: CHỈ dự đoán một lần với limit tốt nhất
        const mainResult = predictWithLimit(history, index, { limitMain: bestLimit.limit });
        const prediction = mainResult.predictions[0];

        // Đọc file prediction cũ và cập nhật performance nếu có
        const predictionFilePath = `${fileConfig[0]}.prediction`;
        let previousPrediction = null;

        if (fs.existsSync(predictionFilePath)) {
            try {
                const predictionContent = fs.readFileSync(predictionFilePath, 'utf8');
                previousPrediction = JSON.parse(predictionContent);

                // Kiểm tra và cập nhật file performance với dự đoán cũ
                if (history && history.length > 0 && previousPrediction) {
                    const actualResult = history[0];

                    // So sánh drawId của dự đoán cũ với drawId hiện tại
                    if (previousPrediction.drawId === actualResult.drawId) {
                        // Có dự đoán cho chu kỳ hiện tại, cập nhật performance
                        const actualNumber = Number(actualResult.numbers[index]);

                        // Thêm dòng này: cập nhật hiệu suất của từng predictor
                        if (previousPrediction.predictorDetails) {
                            const predictorResults = {};
                            previousPrediction.predictorDetails.forEach(pred => {
                                predictorResults[pred.name] = pred.value;
                            });
                            updatePredictorPerformance(actualNumber, predictorResults);
                        }

                        // Cập nhật file performance cho bestLimit
                        updateLimitPerformanceFile(
                            fileConfig,
                            index,
                            { limitMain: previousPrediction.limit },
                            previousPrediction.prediction,
                            actualNumber,
                            actualResult.drawId,
                            actualResult.timeVN || getVietnamTimeNow()
                        );

                        // Cập nhật file combined performance 
                        updateCombinedPerformanceFile(
                            fileConfig,
                            index,
                            previousPrediction.limit,
                            previousPrediction.prediction,
                            actualNumber,
                            actualResult.drawId,
                            actualResult.timeVN || getVietnamTimeNow()
                        );
                    }
                }
            } catch (error) {
                console.error("Lỗi khi đọc file prediction cũ:", error);
            }
        }

        // Bước 3: Tạo cấu trúc kết quả đơn giản hơn
        const finalResult = {
            prediction: prediction,              // Dự đoán số cuối cùng (thay vì mảng)
            type: prediction >= 5 ? 'Tài' : 'Xỉu', // Loại dự đoán
            limit: bestLimit.limit,              // Limit được chọn (thay vì nhiều limit)
            score: (bestLimit.score * 100).toFixed(2) + "%",
            timestamp: new Date().toISOString(),
            timeVN: getVietnamTimeNow(),
            drawId: nextDrawId,
            votes: mainResult.votes,
            strategies: mainResult.strategies,
            indexPredicted: index,
            predictorDetails: mainResult.details.predictions
        };

        // Ghi prediction mới
        fs.writeFileSync(predictionFilePath, JSON.stringify(finalResult, null, 2));

        return finalResult;
    } catch (error) {
        if (log) console.error("Lỗi trong predictNumbers:", error);
        throw error;
    }
}

/**
 * Lấy thời gian hiện tại ở Việt Nam
 */
function getVietnamTimeNow() {
    const now = new Date();
    // Chuyển đổi sang múi giờ Việt Nam (UTC+7)
    const vnTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));

    // Format ngày tháng
    const day = vnTime.getUTCDate().toString().padStart(2, '0');
    const month = (vnTime.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = vnTime.getUTCFullYear();

    // Format giờ phút giây
    let hours = vnTime.getUTCHours();
    const minutes = vnTime.getUTCMinutes().toString().padStart(2, '0');
    const seconds = vnTime.getUTCSeconds().toString().padStart(2, '0');

    // Chuyển sang định dạng 12 giờ
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 giờ sẽ hiển thị là 12

    // Trả về chuỗi định dạng đầy đủ
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds} ${ampm}`;
}

/**
 * Trả về số ngẫu nhiên trong khoảng
 */
function getLuckyNumberInRange(min, max, extra = 0) {
    // Thêm entropy từ timestamp và thêm tham số extra để khác biệt
    const timestamp = new Date().getTime();
    const seed = (timestamp % 1000) + extra;
    return min + Math.floor((seed / 1000) * (max - min + 1));
}

// Export hàm predictNumbers
module.exports = predictNumbers;

/**
 * Hàm kiểm tra và chuyển đổi số an toàn
 */
function safeParseNumber(value) {
    const num = Number(value);
    return !isNaN(num) ? num : 0;
}

/**
 * Lấy số từ item history an toàn
 */
function getNumberFromHistory(item, index = 0) {
    if (!item || !item.numbers) return null;
    const num = safeParseNumber(item.numbers[index]);
    return num >= 0 && num <= 9 ? num : null;
}


/**
 * Dự đoán dựa trên limit cụ thể
 */
function predictWithLimit(history, index, limit) {
    // Kiểm tra xu hướng hiện tại TRƯỚC KHI tính toán các mô hình riêng lẻ
    const limitedHistory = history.slice(0, limit.limitMain);
    const actualNums = limitedHistory.map(item => getNumberFromHistory(item, index)).filter(n => n !== null);

    // Phân tích xu hướng gần đây (10 kết quả)
    const recentXiu = actualNums.filter(n => n < 5).length;
    const recentTai = actualNums.length - recentXiu;
    const xiuRatio = recentXiu / actualNums.length;

    // Nếu có xu hướng rõ ràng (≥70%), ưu tiên dự đoán theo xu hướng
    if (actualNums.length >= 7) {
        // Phân tích 5 kết quả gần nhất
        const recent5 = actualNums.slice(0, 5);
        const recent5Xiu = recent5.filter(n => n < 5).length;

        // Nếu 4/5 hoặc 5/5 kết quả gần nhất đều là Xỉu, ưu tiên cao cho Xỉu
        if (recent5.length >= 5 && recent5Xiu >= 4) {
            return {
                predictions: [getLuckyNumberInRange(0, 4)],
                stats: { accuracy: 0, consecutiveWrong: 0 },
                votes: { 'tài': 0.1, 'xỉu': 0.9 },
                strategies: ['Xu hướng Xỉu mạnh gần đây'],
                details: {
                    predictions: [{
                        name: "dominant_trend",
                        value: getLuckyNumberInRange(0, 4),
                        weight: 1.0,
                        type: "Xỉu"
                    }],
                    limit: limit.limitMain
                }
            };
        }

        // Tương tự, nếu 4/5 hoặc 5/5 kết quả gần nhất đều là Tài, ưu tiên cao cho Tài
        if (recent5.length >= 5 && recent5Xiu <= 1) {
            return {
                predictions: [getLuckyNumberInRange(5, 9)],
                stats: { accuracy: 0, consecutiveWrong: 0 },
                votes: { 'tài': 0.9, 'xỉu': 0.1 },
                strategies: ['Xu hướng Tài mạnh gần đây'],
                details: {
                    predictions: [{
                        name: "dominant_trend",
                        value: getLuckyNumberInRange(5, 9),
                        weight: 1.0,
                        type: "Tài"
                    }],
                    limit: limit.limitMain
                }
            };
        }

        // Xu hướng Xỉu mạnh (≥70%)
        if (xiuRatio >= 0.7) {
            return {
                predictions: [getLuckyNumberInRange(0, 4)],
                stats: { accuracy: 0, consecutiveWrong: 0 },
                votes: { 'tài': 0.2, 'xỉu': 0.8 },
                strategies: ['Xu hướng Xỉu rõ rệt'],
                details: {
                    predictions: [{
                        name: "trend_continuation",
                        value: getLuckyNumberInRange(0, 4),
                        weight: 1.0,
                        type: "Xỉu"
                    }],
                    limit: limit.limitMain
                }
            };
        }

        // Xu hướng Tài mạnh (≥70%)
        if (xiuRatio <= 0.3) {
            return {
                predictions: [getLuckyNumberInRange(5, 9)],
                stats: { accuracy: 0, consecutiveWrong: 0 },
                votes: { 'tài': 0.8, 'xỉu': 0.2 },
                strategies: ['Xu hướng Tài rõ rệt'],
                details: {
                    predictions: [{
                        name: "trend_continuation",
                        value: getLuckyNumberInRange(5, 9),
                        weight: 1.0,
                        type: "Tài"
                    }],
                    limit: limit.limitMain
                }
            };
        }
    }

    // Phân tích theo khung giờ
    const currentTimeVN = history[0]?.timeVN || "";
    let currentHour = -1;
    if (currentTimeVN) {
        const timeMatch = currentTimeVN.match(/(\d+):(\d+):(\d+)\s+(AM|PM)/);
        if (timeMatch) {
            currentHour = parseInt(timeMatch[1]);
            const ampm = timeMatch[4];
            if (ampm === 'PM' && currentHour < 12) currentHour += 12;
            if (ampm === 'AM' && currentHour === 12) currentHour = 0;
        }
    }

    // Nếu không có xu hướng rõ rệt, sử dụng các mô hình dự đoán với trọng số điều chỉnh
    const markovPred = improvedMarkovPredictor(limitedHistory, index);
    const trendPred = enhancedTrendReversalPredictor(limitedHistory, index);
    const anomalyPred = anomalyFilterPredictor(limitedHistory, index);
    const timeSeriesPred = timeSeriesAnalysisPredictor(limitedHistory, index);
    const patternPred = patternRecognitionPredictor(limitedHistory, index);
    const timeBasedPred = timeBasedPredictor(limitedHistory, index);
    const gameTheoryPred = gameTheoryPredictor(limitedHistory, index);

    // THÊM DÒNG NÀY: Thêm lại adaptive ensemble predictor
    const adaptiveEnsemblePred = adaptiveEnsemblePredictor(limitedHistory, index);

    // Điều chỉnh trọng số 
    let weights = {
        markov: 0.15,
        trend: 0.05,
        anomaly: 0.1,
        timeseries: 0.15,
        pattern: 0.15,
        timebased: 0.2,
        gametheory: 0.2,
        adaptive: 0.25  // Thêm trọng số cao cho adaptive (0.25)
    };

    // Điều chỉnh trọng số nếu có xu hướng Xỉu/Tài rõ rệt
    if (xiuRatio > 0.6) {
        // Tăng trọng số cho các mô hình thường dự đoán Xỉu
        weights.trend = 0.02;  // Giảm trọng số trend reversal (thường dự đoán đảo chiều)
        weights.markov = 0.25; // Tăng trọng số Markov (thường dự đoán theo xu hướng) 
        weights.gametheory = 0.25; // Tăng game theory để phát hiện can thiệp
    } else if (xiuRatio < 0.4) {
        // Tăng trọng số cho các mô hình thường dự đoán Tài
        weights.anomaly = 0.2;
        weights.timeseries = 0.2;
    }

    // Điều chỉnh theo khung giờ
    if (currentHour >= 0) {
        // Khung giờ đêm khuya (12AM-3AM)
        if (currentHour >= 0 && currentHour < 3) {
            weights.gametheory = 0.3;  // Tăng cao vì nhiều can thiệp
            weights.timebased = 0.25;  // Thời gian quan trọng
        }
        // Khung giờ cao điểm (7PM-11PM)
        else if (currentHour >= 19 && currentHour < 23) {
            weights.markov = 0.2;     // Mô hình thống kê hoạt động tốt khi nhiều người chơi
        }
    }

    // Xây dựng mảng dự đoán
    const predictions = [
        { pred: markovPred, name: "markov", weight: weights.markov },
        { pred: trendPred, name: "trend", weight: weights.trend },
        { pred: anomalyPred, name: "anomaly", weight: weights.anomaly },
        { pred: timeSeriesPred, name: "timeseries", weight: weights.timeseries },
        { pred: patternPred, name: "pattern", weight: weights.pattern },
        { pred: timeBasedPred, name: "timebased", weight: weights.timebased },
        { pred: gameTheoryPred, name: "gametheory", weight: weights.gametheory },
        { pred: adaptiveEnsemblePred, name: "adaptive", weight: weights.adaptive } // THÊM DÒNG NÀY
    ];

    // Thêm xu hướng gần đây làm dự đoán bổ sung (5 kết quả gần nhất)
    if (actualNums.length >= 5) {
        const recent5 = actualNums.slice(0, 5);
        const recent5Xiu = recent5.filter(n => n < 5).length;

        if (recent5Xiu >= 3) { // Nhiều Xỉu gần đây (>=60%)
            predictions.push({
                pred: getLuckyNumberInRange(0, 4),
                name: "recent_trend",
                weight: 0.3
            });
        } else if (recent5Xiu <= 2) { // Nhiều Tài gần đây (>=60%)
            predictions.push({
                pred: getLuckyNumberInRange(5, 9),
                name: "recent_trend",
                weight: 0.3
            });
        }
    }

    // Tính toán kết quả
    let weightedSum = 0;
    let totalWeight = 0;
    const validPredictions = [];

    for (const pred of predictions) {
        if (pred.pred !== null) {
            weightedSum += pred.pred * pred.weight;
            totalWeight += pred.weight;
            validPredictions.push({
                name: pred.name,
                value: pred.pred,
                weight: pred.weight,
                type: pred.pred >= 5 ? 'Tài' : 'Xỉu'
            });
        }
    }

    // Tính số cuối cùng
    let finalNumber;
    if (totalWeight > 0) {
        finalNumber = Math.round(weightedSum / totalWeight);
    } else {
        finalNumber = getLuckyNumberInRange(0, 9);
    }

    // Đếm votes
    const votes = {
        'tài': predictions
            .filter(p => p.pred !== null && p.pred >= 5)
            .reduce((sum, p) => sum + p.weight, 0),
        'xỉu': predictions
            .filter(p => p.pred !== null && p.pred < 5)
            .reduce((sum, p) => sum + p.weight, 0)
    };

    // Tạo danh sách chiến lược
    const strategiesMap = {
        markov: 'Sử dụng Markov Chain',
        trend: 'Phân tích xu hướng đảo chiều',
        anomaly: 'Phát hiện bất thường',
        timeseries: 'Phân tích chuỗi thời gian',
        pattern: 'Nhận dạng mẫu',
        timebased: 'Phân tích theo khung giờ',
        gametheory: 'Lý thuyết trò chơi',
        recent_trend: 'Xu hướng gần đây',
        adaptive: 'Mô hình học máy đơn giản với Logistic Regression'
    };

    const strategies = predictions
        .filter(p => p.pred !== null)
        .map(p => strategiesMap[p.name])
        .filter(s => s !== undefined);

    // Kiểm tra hiệu suất gần đây và quyết định có đảo ngược dự đoán không
    try {
        const fs = require('fs');
        const combinedPath = `taixiu_history_combined_performance.log`;
        
        if (fs.existsSync(combinedPath)) {
            const content = fs.readFileSync(combinedPath, 'utf8');
            const lines = content.split('\n').filter(line => line.includes('Chu kỳ |'));
            
            // Lấy 10 kết quả gần nhất để có đủ dữ liệu phân tích
            const recentResults = lines.slice(-10);
            if (recentResults.length >= 5) {  // Cần ít nhất 5 kết quả để phân tích
                
                // Đếm số lần dự đoán đúng/sai
                const wrongPredictions = recentResults.filter(line => line.includes('| Sai')).length;
                const correctPredictions = recentResults.length - wrongPredictions;
                
                // Nếu tỷ lệ dự đoán sai trên 70%, xem xét đảo ngược dự đoán
                if (wrongPredictions / recentResults.length >= 0.7) {
                    console.log("Phát hiện xu hướng dự đoán sai > 70%, đảo ngược dự đoán");
                    
                    // Đảo ngược dự đoán cuối cùng
                    if (finalNumber >= 5) {
                        finalNumber = getLuckyNumberInRange(0, 4);
                    } else {
                        finalNumber = getLuckyNumberInRange(5, 9);
                    }
                    
                    // Thêm thông tin về việc đảo ngược dự đoán
                    validPredictions.push({
                        name: "reverse_decision",
                        value: finalNumber,
                        weight: 1.5,  // Trọng số cao hơn để ghi đè các dự đoán trước
                        type: finalNumber >= 5 ? 'Tài' : 'Xỉu'
                    });
                    
                    // Cập nhật votes
                    votes['tài'] = finalNumber >= 5 ? 1.0 : 0.0;
                    votes['xỉu'] = finalNumber >= 5 ? 0.0 : 1.0;
                    
                    // Thêm chiến lược
                    strategies.push('Đảo ngược dự đoán do phát hiện xu hướng dự đoán sai liên tục');
                }
            }
        }
    } catch (error) {
        console.error("Lỗi khi kiểm tra hiệu suất gần đây:", error);
    }

    // Kiểm tra nếu có ít dữ liệu (ít hơn 10 lượt)
    if (history.length < 10) {
        console.log("Phát hiện ít dữ liệu, sử dụng chiến lược đặc biệt");
        
        // 1. Kiểm tra nếu có mô hình nào có độ chính xác cao gần đây
        try {
            const fs = require('fs');
            const performanceFile = 'predictor_performance.json';
            
            if (fs.existsSync(performanceFile)) {
                const performanceData = JSON.parse(fs.readFileSync(performanceFile, 'utf8'));
                
                // Tìm mô hình có độ chính xác cao nhất (trên 65%)
                let bestPredictor = null;
                let bestAccuracy = 0;
                
                Object.keys(performanceData).forEach(predictorName => {
                    const data = performanceData[predictorName];
                    if (data.total >= 5) { // Cần ít nhất 5 dự đoán để đánh giá
                        const accuracy = data.correct / data.total;
                        if (accuracy > 0.65 && accuracy > bestAccuracy) {
                            bestAccuracy = accuracy;
                            bestPredictor = predictorName;
                        }
                    }
                });
                
                // Nếu tìm thấy mô hình tốt, ưu tiên nó hoàn toàn
                if (bestPredictor) {
                    console.log(`Sử dụng mô hình ${bestPredictor} với độ chính xác ${bestAccuracy}`);
                    
                    // Tìm dự đoán từ mô hình tốt nhất trong danh sách dự đoán
                    const bestPrediction = validPredictions.find(p => p.name === bestPredictor);
                    
                    if (bestPrediction) {
                        // Dùng kết quả từ mô hình tốt nhất
                        finalNumber = bestPrediction.value;
                        
                        // Cập nhật thông tin
                        strategies = [`Ưu tiên mô hình ${bestPredictor} (độ chính xác ${(bestAccuracy*100).toFixed(1)}%)`];
                        
                        // Cập nhật votes
                        votes['tài'] = finalNumber >= 5 ? 1.0 : 0.0;
                        votes['xỉu'] = finalNumber >= 5 ? 0.0 : 1.0;
                        
                        // Giữ lại chỉ dự đoán tốt nhất
                        validPredictions = [bestPrediction];
                    }
                }
            }
        } catch (error) {
            console.error("Lỗi khi tìm mô hình tốt nhất:", error);
        }
        
        // 2. Nếu không có mô hình nào nổi trội, dựa vào xu hướng gần nhất
        if (strategies.length > 1) { // Không tìm được mô hình tốt nhất
            // Lấy 3 kết quả gần nhất
            const recent3 = actualNums.slice(0, Math.min(3, actualNums.length));
            
            if (recent3.length >= 2) {
                const taiCount = recent3.filter(n => n >= 5).length;
                
                // Nếu 2/3 gần nhất cùng loại, dự đoán tiếp theo sẽ là loại đó
                if (taiCount >= 2) {
                    finalNumber = getLuckyNumberInRange(5, 9);
                    strategies = ['Dựa vào xu hướng gần nhất (Tài chiếm ưu thế)'];
                } else if (taiCount <= recent3.length - 2) {
                    finalNumber = getLuckyNumberInRange(0, 4);
                    strategies = ['Dựa vào xu hướng gần nhất (Xỉu chiếm ưu thế)'];
                }
                
                // Cập nhật votes
                votes['tài'] = finalNumber >= 5 ? 1.0 : 0.0;
                votes['xỉu'] = finalNumber >= 5 ? 0.0 : 1.0;
                
                // Thêm dự đoán mới
                validPredictions = [{
                    name: "recent_trend_only",
                    value: finalNumber,
                    weight: 1.0,
                    type: finalNumber >= 5 ? 'Tài' : 'Xỉu'
                }];
            }
        }
    }

    // Sau đó tiếp tục với return như bình thường
    return {
        predictions: [finalNumber],
        stats: { accuracy: 0, consecutiveWrong: 0 },
        votes: votes,
        strategies: strategies,
        details: {
            predictions: validPredictions,
            limit: limit.limitMain,
            timeInfo: { hour: currentHour }
        }
    };
}

function anomalyFilterPredictor(history, index = 0) {
    // Lấy kết quả gần nhất
    const recentNumbers = history.slice(0, 20).map(item => Number(item.numbers?.[index]));

    // Đếm tổng số lần xuất hiện Tài/Xỉu
    const taiCount = recentNumbers.filter(n => n >= 5).length;
    const xiuCount = recentNumbers.length - taiCount;

    // Tính tỷ lệ
    const taiRatio = taiCount / recentNumbers.length;

    // Phân tích chuỗi liên tiếp gần đây
    let maxTaiStreak = 0, maxXiuStreak = 0;
    let currentTaiStreak = 0, currentXiuStreak = 0;

    for (const num of recentNumbers) {
        if (num >= 5) {
            currentTaiStreak++;
            currentXiuStreak = 0;
            maxTaiStreak = Math.max(maxTaiStreak, currentTaiStreak);
        } else {
            currentXiuStreak++;
            currentTaiStreak = 0;
            maxXiuStreak = Math.max(maxXiuStreak, currentXiuStreak);
        }
    }

    // Phân tích 5 kết quả gần nhất
    const recent5 = recentNumbers.slice(0, 5);
    const recent5Tai = recent5.filter(n => n >= 5).length;

    // Nếu 5 kết quả gần nhất có xu hướng mạnh (80%+), tiếp tục xu hướng
    if (recent5.length >= 5) {
        if (recent5Tai >= 4) { // 80%+ Tài, dự đoán tiếp tục Tài
            return getLuckyNumberInRange(5, 9);
        } else if (recent5Tai <= 1) { // 80%+ Xỉu, dự đoán tiếp tục Xỉu
            return getLuckyNumberInRange(0, 4);
        }
    }

    // Kiểm tra streak dài (5+) - tăng ngưỡng đảo chiều
    if (maxTaiStreak >= 5) {
        // Nếu có 5+ lần Tài liên tiếp, khả năng cao sẽ đổi sang Xỉu
        return getLuckyNumberInRange(0, 4);
    }

    if (maxXiuStreak >= 5) {
        // Nếu có 5+ lần Xỉu liên tiếp, khả năng cao sẽ đổi sang Tài
        return getLuckyNumberInRange(5, 9);
    }

    // Giảm ngưỡng phát hiện bất thường xuống 0.7/0.3
    if (taiRatio > 0.7) {
        // Nếu Tài chiếm ưu thế quá mức, tiếp tục xu hướng Tài
        return getLuckyNumberInRange(5, 9);
    }

    if (taiRatio < 0.3) {
        // Nếu Xỉu chiếm ưu thế quá mức, tiếp tục xu hướng Xỉu
        return getLuckyNumberInRange(0, 4);
    }

    // Nếu không có mẫu bất thường, dự đoán tiếp tục xu hướng hiện tại
    return recentNumbers[0] >= 5 ?
        getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
}

// Mô hình phát hiện đảo chiều xu hướng nâng cao
function enhancedTrendReversalPredictor(history, index = 0, limit = null) {
    const recentNumbers = history.map(item => getNumberFromHistory(item, index))
        .filter(num => num !== null);

    if (recentNumbers.length < 5) return null;

    const taiXiuSeries = recentNumbers.map(n => n >= 5);

    // Phân tích chuỗi liên tiếp
    let currentStreak = 1;
    for (let i = 1; i < taiXiuSeries.length; i++) {
        if (taiXiuSeries[i] === taiXiuSeries[0]) currentStreak++;
        else break;
    }

    // Phân tích xu hướng dài hạn (10 chu kỳ)
    const longTermTrend = taiXiuSeries.slice(0, 10);
    const taiCount = longTermTrend.filter(Boolean).length;
    const xiuCount = longTermTrend.length - taiCount;

    // Nếu có bất thường về phân phối (>70% một loại), dự đoán đảo chiều
    if (taiCount > xiuCount * 2) return getLuckyNumberInRange(0, 4);
    if (xiuCount > taiCount * 2) return getLuckyNumberInRange(5, 9);

    // Dự đoán dựa vào độ dài chuỗi
    if (currentStreak >= 3) {
        // Chuỗi càng dài, khả năng đảo chiều càng cao
        const reverseProb = 0.5 + (currentStreak - 3) * 0.1; // 3->0.5, 4->0.6, 5->0.7...
        return Math.random() < reverseProb ?
            (taiXiuSeries[0] ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9)) :
            (taiXiuSeries[0] ? getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4));
    }

    // Nếu không có xu hướng rõ rệt, phân tích mẫu lặp lại
    const pattern = taiXiuSeries.slice(0, 5).map(b => b ? 'T' : 'X').join('');

    // Tìm mẫu TXTXT hoặc XTXTX (mẫu luân phiên)
    if (pattern.match(/^(TX){2}T$/) || pattern.match(/^(XT){2}X$/)) {
        return pattern[0] === 'T' ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }

    // Mặc định
    return taiXiuSeries[0] ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
}

// Thêm mô hình phân tích chuỗi thời gian
function timeSeriesAnalysisPredictor(history, index = 0) {
    const recentNumbers = history.map(item => getNumberFromHistory(item, index))
        .filter(num => num !== null)
        .slice(0, 30); // Lấy 30 kết quả gần nhất

    if (recentNumbers.length < 10) return null;

    // Chuyển đổi thành chuỗi nhị phân (Tài = 1, Xỉu = 0)
    const binarySeries = recentNumbers.map(n => n >= 5 ? 1 : 0);

    // 1. Phân tích AutoCorrelation - tìm mẫu lặp lại
    const correlations = [];
    // Tính tương quan cho độ trễ từ 1-5
    for (let lag = 1; lag <= 5; lag++) {
        let correlation = 0;
        let count = 0;
        for (let i = 0; i < binarySeries.length - lag; i++) {
            if (binarySeries[i] === binarySeries[i + lag]) {
                correlation++;
            }
            count++;
        }
        correlations.push(count > 0 ? correlation / count : 0);
    }

    // Tìm độ trễ có tương quan cao nhất
    const maxCorrelationLag = correlations.indexOf(Math.max(...correlations)) + 1;

    // 2. Moving Average - tính trung bình động
    const windowSize = 5;
    const movingAvgs = [];
    for (let i = 0; i <= recentNumbers.length - windowSize; i++) {
        const sum = recentNumbers.slice(i, i + windowSize).reduce((a, b) => a + b, 0);
        movingAvgs.push(sum / windowSize);
    }

    // 3. Tính trọng số cho mỗi phương pháp dự đoán
    let prediction = null;

    // Dự đoán dựa trên độ trễ có tương quan cao nhất
    if (maxCorrelationLag > 0 && correlations[maxCorrelationLag - 1] > 0.6) {
        const cyclicValue = binarySeries[maxCorrelationLag - 1];
        prediction = cyclicValue === 1 ?
            getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
    }

    // Dự đoán dựa trên trung bình động
    const recentAvg = movingAvgs[0]; // Giá trị trung bình gần nhất
    const trendPrediction = recentAvg >= 4.5 ?
        getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);

    // Nếu có dự đoán từ tương quan chu kỳ, ưu tiên nó
    return prediction !== null ? prediction : trendPrediction;
}

// Mô hình phát hiện mẫu lặp lại
function patternRecognitionPredictor(history, index = 0) {
    const recentNumbers = history.map(item => getNumberFromHistory(item, index))
        .filter(num => num !== null)
        .slice(0, 20);

    if (recentNumbers.length < 8) return null;

    // Chuyển đổi thành chuỗi nhị phân (T/X)
    const binaryPattern = recentNumbers.map(n => n >= 5 ? 'T' : 'X').join('');

    // Tìm các mẫu phổ biến (độ dài 3-4)
    const patterns = {};
    for (let length = 3; length <= 4; length++) {
        for (let i = 0; i <= binaryPattern.length - length - 1; i++) {
            const pattern = binaryPattern.substring(i, i + length);
            const nextValue = binaryPattern[i + length];

            if (!patterns[pattern]) {
                patterns[pattern] = { T: 0, X: 0 };
            }

            if (nextValue) {
                patterns[pattern][nextValue]++;
            }
        }
    }

    // Tìm mẫu hiện tại trong 3-4 kết quả gần nhất
    for (let length = 3; length <= 4; length++) {
        if (binaryPattern.length < length) continue;

        const currentPattern = binaryPattern.substring(0, length);
        const patternStats = patterns[currentPattern];

        if (patternStats) {
            const totalNext = patternStats.T + patternStats.X;
            if (totalNext >= 3) { // Chỉ xem xét nếu mẫu xuất hiện ít nhất 3 lần
                const probTai = patternStats.T / totalNext;
                const probXiu = patternStats.X / totalNext;

                // Nếu có xu hướng rõ ràng, dự đoán dựa vào đó
                if (probTai >= 0.7) {
                    return getLuckyNumberInRange(5, 9); // Dự đoán Tài
                } else if (probXiu >= 0.7) {
                    return getLuckyNumberInRange(0, 4); // Dự đoán Xỉu
                }
            }
        }
    }

    // Phân tích mẫu đặc biệt
    // 1. Mẫu luân phiên TXTXT hoặc XTXTX
    if (binaryPattern.startsWith('TXTXT') || binaryPattern.startsWith('XTXTX')) {
        // Nếu mẫu luân phiên, tiếp tục mẫu
        return binaryPattern[0] === 'T' ? getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
    }

    // 2. Mẫu cụm TTTT hoặc XXXX
    if (binaryPattern.startsWith('TTTT')) {
        // Sau 4 lần Tài liên tiếp, khả năng cao sẽ là Xỉu
        return getLuckyNumberInRange(0, 4);
    } else if (binaryPattern.startsWith('XXXX')) {
        // Sau 4 lần Xỉu liên tiếp, khả năng cao sẽ là Tài
        return getLuckyNumberInRange(5, 9);
    }

    return null; // Không tìm thấy mẫu nào phù hợp
}

// Hàm cập nhật file cho từng limit riêng lẻ
function updateLimitPerformanceFile(fileConfig, index, limit, predictedNumber, actualNumber, drawId, timeVN) {
    if (actualNumber === null || actualNumber === undefined) {
        return;
    }

    const fs = require('fs');

    // Cập nhật file performance cho limit cụ thể
    const limitPath = `${fileConfig[0]}_index${index}_limit${limit.limitMain}.performance`;
    const resultType = predictedNumber >= 5 ? "Tài" : "Xỉu";
    const actualType = actualNumber >= 5 ? "Tài" : "Xỉu";
    const isCorrect = (predictedNumber >= 5) === (actualNumber >= 5);

    // Tạo dòng mới cho file limit
    const limitLine = `Chu kỳ | ${drawId} | ${timeVN} | Số thực tế: ${actualNumber} (${actualType}) | Số dự đoán: ${predictedNumber} (${resultType}) | Vị trí: ${index} | ${isCorrect ? "Đúng" : "Sai"}`;

    // Cập nhật file limit
    if (!fs.existsSync(limitPath)) {
        const header = `# File Performance với Limit=${limit.limitMain} và Index=${index}\n\n`;
        fs.writeFileSync(limitPath, header + limitLine + "\n", 'utf8');
        console.log(`Đã tạo file ${limitPath} và ghi chu kỳ đầu tiên`);
    } else if (!fs.readFileSync(limitPath, 'utf8').includes(`Chu kỳ | ${drawId}`)) {
        fs.appendFileSync(limitPath, limitLine + "\n");
        console.log(`Đã thêm chu kỳ ${drawId} vào file ${limitPath}`);
    }
}

// Hàm chỉ cập nhật file tổng hợp
function updateCombinedPerformanceFile(fileConfig, index, bestLimit, predictedNumber, actualNumber, drawId, timeVN) {
    if (actualNumber === null || actualNumber === undefined) {
        return;
    }

    const fs = require('fs');

    const resultType = predictedNumber >= 5 ? "Tài" : "Xỉu";
    const actualType = actualNumber >= 5 ? "Tài" : "Xỉu";
    const isCorrect = (predictedNumber >= 5) === (actualNumber >= 5);

    // Cập nhật file combined - LUÔN ghi kể cả là lần đầu
    const combinedPath = `${fileConfig[0]}_combined_performance.log`;
    const limitInfo = `| Limit: ${bestLimit}`; // Sử dụng bestLimit thay vì hardcode
    const combinedLine = `Chu kỳ | ${drawId} | ${timeVN} | Số thực tế: ${actualNumber} (${actualType}) | Số dự đoán: ${predictedNumber} (${resultType}) | Vị trí: ${index} ${limitInfo} | ${isCorrect ? "Đúng" : "Sai"}`;

    if (!fs.existsSync(combinedPath)) {
        const header = "# File Performance Tổng Hợp - Theo Dõi Kết Quả Dự Đoán Với Tất Cả Các Limit\n\n";
        fs.writeFileSync(combinedPath, header + combinedLine + "\n", 'utf8');
        console.log(`Đã tạo file ${combinedPath} và ghi chu kỳ đầu tiên`);
    } else if (!fs.readFileSync(combinedPath, 'utf8').includes(`Chu kỳ | ${drawId}`)) {
        fs.appendFileSync(combinedPath, combinedLine + "\n");
        console.log(`Đã thêm chu kỳ ${drawId} vào file ${combinedPath}`);
    }
}

// Hàm phân tích dữ liệu từ file performance
function analyzeActualResults(performanceFile) {
    const fs = require('fs');
    const content = fs.readFileSync(performanceFile, 'utf8');
    const lines = content.split('\n').filter(line => line.includes('Chu kỳ |'));

    // Chỉ lấy số thực tế từ mỗi dòng
    const actualNumbers = lines.map(line => {
        const match = line.match(/Số thực tế: (\d+) \((Tài|Xỉu)\)/);
        if (match) {
            return {
                number: parseInt(match[1]),
                type: match[2]
            };
        }
        return null;
    }).filter(item => item !== null);

    return actualNumbers;
}

// Phân tích xu hướng từ kết quả thực tế
function analyzeActualTrends(numbers) {
    if (numbers.length < 5) return null;

    // Phân tích chuỗi liên tiếp
    let taiStreak = 0, xiuStreak = 0;
    let maxTaiStreak = 0, maxXiuStreak = 0;

    for (const item of numbers) {
        if (item.type === 'Tài') {
            taiStreak++;
            xiuStreak = 0;
            maxTaiStreak = Math.max(maxTaiStreak, taiStreak);
        } else {
            xiuStreak++;
            taiStreak = 0;
            maxXiuStreak = Math.max(maxXiuStreak, xiuStreak);
        }
    }

    // Phân tích phân phối
    const taiCount = numbers.filter(n => n.type === 'Tài').length;
    const xiuCount = numbers.length - taiCount;
    const taiRatio = taiCount / numbers.length;

    return {
        currentType: numbers[0].type,
        currentStreak: numbers[0].type === 'Tài' ? taiStreak : xiuStreak,
        maxTaiStreak,
        maxXiuStreak,
        taiRatio,
        xiuRatio: 1 - taiRatio,
        // Phân tích 5 kết quả gần đây
        recentResults: numbers.slice(0, 5).map(n => n.type)
    };
}

// Cải thiện Markov predictor dựa trên kết quả thực tế
function improvedMarkovPredictor(history, index = 0) {
    // Lấy số thực tế từ lịch sử
    const actualNumbers = history.map(item => {
        if (!item || !item.numbers || !item.numbers[index]) return null;
        const num = Number(item.numbers[index]);
        return !isNaN(num) ? { number: num, type: num >= 5 ? 'Tài' : 'Xỉu' } : null;
    }).filter(n => n !== null);

    if (actualNumbers.length < 5) return null;

    // Phân tích transition patterns từ dữ liệu thực tế
    const transitions = {
        'Tài': { 'Tài': 0, 'Xỉu': 0 },
        'Xỉu': { 'Tài': 0, 'Xỉu': 0 }
    };

    for (let i = 0; i < actualNumbers.length - 1; i++) {
        const current = actualNumbers[i].type;
        const next = actualNumbers[i + 1].type;
        transitions[current][next]++;
    }

    // Xác định xu hướng hiện tại
    const currentType = actualNumbers[0].type;
    const total = transitions[currentType]['Tài'] + transitions[currentType]['Xỉu'];

    if (total === 0) return getLuckyNumberInRange(0, 9);

    // Xác suất chuyển tiếp
    const probTai = transitions[currentType]['Tài'] / total;
    const probXiu = transitions[currentType]['Xỉu'] / total;

    // Xác định xu hướng rõ rệt (ngưỡng 0.65)
    if (probTai > 0.65) {
        return getLuckyNumberInRange(5, 9); // Dự đoán Tài
    } else if (probXiu > 0.65) {
        return getLuckyNumberInRange(0, 4); // Dự đoán Xỉu
    }

    // Phân tích streak
    let streak = 1;
    for (let i = 1; i < actualNumbers.length; i++) {
        if (actualNumbers[i].type === currentType) streak++;
        else break;
    }

    // Nếu có streak dài (3+), có xác suất cao sẽ đảo chiều
    if (streak >= 3) {
        return currentType === 'Tài' ?
            getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }

    // Dự đoán theo xu hướng gần đây
    return currentType === 'Tài' ?
        getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
}

// Mô hình phân tích theo khung giờ
function timeBasedPredictor(history, index = 0) {
    if (!history || !history[0] || !history[0].timeVN) return null;

    const recentNumbers = history.map(item => getNumberFromHistory(item, index))
        .filter(num => num !== null)
        .slice(0, 10);
    if (recentNumbers.length < 10) return null;

    // Phân tích giờ từ timeVN
    const timeSegments = {};
    let hourCounts = {};

    history.forEach((item, i) => {
        if (!item.timeVN) return;

        // Trích xuất giờ từ timeVN (format: DD/MM/YYYY HH:MM:SS AM/PM)
        const timeMatch = item.timeVN.match(/(\d+):(\d+):(\d+)\s+(AM|PM)/);
        if (!timeMatch) return;

        let hour = parseInt(timeMatch[1]);
        const ampm = timeMatch[4];

        // Chuyển sang 24h
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;

        // Gom nhóm thành các khung giờ 3 tiếng
        const timeSegment = Math.floor(hour / 3);
        const segmentKey = `segment_${timeSegment}`;

        if (!timeSegments[segmentKey]) {
            timeSegments[segmentKey] = { tai: 0, xiu: 0, total: 0 };
        }

        // Lấy số tương ứng
        if (i < recentNumbers.length) {
            const num = recentNumbers[i];
            if (num >= 5) timeSegments[segmentKey].tai++;
            else timeSegments[segmentKey].xiu++;
            timeSegments[segmentKey].total++;
        }

        // Thống kê theo giờ cụ thể
        const hourKey = `hour_${hour}`;
        if (!hourCounts[hourKey]) {
            hourCounts[hourKey] = { tai: 0, xiu: 0, total: 0 };
        }

        if (i < recentNumbers.length) {
            const num = recentNumbers[i];
            if (num >= 5) hourCounts[hourKey].tai++;
            else hourCounts[hourKey].xiu++;
            hourCounts[hourKey].total++;
        }
    });

    // Lấy thời gian hiện tại
    const currentTimeVN = history[0].timeVN;
    if (!currentTimeVN) return null;

    const timeMatch = currentTimeVN.match(/(\d+):(\d+):(\d+)\s+(AM|PM)/);
    if (!timeMatch) return null;

    let currentHour = parseInt(timeMatch[1]);
    const ampm = timeMatch[4];

    // Chuyển sang 24h
    if (ampm === 'PM' && currentHour < 12) currentHour += 12;
    if (ampm === 'AM' && currentHour === 12) currentHour = 0;

    // Xác định khung giờ hiện tại
    const currentSegment = Math.floor(currentHour / 3);
    const segmentKey = `segment_${currentSegment}`;
    const hourKey = `hour_${currentHour}`;

    // Dự đoán dựa trên khung giờ hiện tại
    if (timeSegments[segmentKey] && timeSegments[segmentKey].total >= 10) {
        const segment = timeSegments[segmentKey];
        const taiRatio = segment.tai / segment.total;

        // Nếu khung giờ có xu hướng rõ rệt
        if (taiRatio > 0.6) {
            return getLuckyNumberInRange(5, 9);
        } else if (taiRatio < 0.4) {
            return getLuckyNumberInRange(0, 4);
        }
    }

    // Dự đoán dựa trên giờ cụ thể nếu có đủ dữ liệu
    if (hourCounts[hourKey] && hourCounts[hourKey].total >= 5) {
        const hourData = hourCounts[hourKey];
        const taiRatio = hourData.tai / hourData.total;

        if (taiRatio > 0.65) {
            return getLuckyNumberInRange(5, 9);
        } else if (taiRatio < 0.35) {
            return getLuckyNumberInRange(0, 4);
        }
    }

    // Dự đoán dựa trên phân phối tổng thể cho khung giờ khác
    const taiTotal = Object.values(timeSegments).reduce((sum, seg) => sum + seg.tai, 0);
    const totalCount = Object.values(timeSegments).reduce((sum, seg) => sum + seg.total, 0);

    if (totalCount > 0) {
        const overallTaiRatio = taiTotal / totalCount;
        if (overallTaiRatio > 0.55) {
            return getLuckyNumberInRange(5, 9);
        } else if (overallTaiRatio < 0.45) {
            return getLuckyNumberInRange(0, 4);
        }
    }

    return null;
}

// Mô hình học sâu giả lập đơn giản cho JS
function simplifiedDeepLearningPredictor(history, index = 0) {
    const recentNumbers = history.map(item => getNumberFromHistory(item, index))
        .filter(num => num !== null)
        .slice(0, 50); // Lấy 50 kết quả gần nhất

    if (recentNumbers.length < 20) return null;

    // Tạo ma trận đầu vào cho mô hình (chuỗi 10 số trước đó)
    const sequenceLength = 10;
    const sequences = [];
    const outputs = [];

    for (let i = sequenceLength; i < recentNumbers.length; i++) {
        const sequence = recentNumbers.slice(i - sequenceLength, i);
        const binarySequence = sequence.map(n => n >= 5 ? 1 : 0);
        sequences.push(binarySequence);
        outputs.push(recentNumbers[i] >= 5 ? 1 : 0);
    }

    if (sequences.length < 10) return null;

    // Mô phỏng mạng neural đơn giản (có 3 lớp ẩn)
    // Lớp đầu vào: 10 neuron (sequenceLength)
    // Lớp ẩn 1: 8 neuron
    // Lớp ẩn 2: 4 neuron
    // Lớp đầu ra: 1 neuron (xác suất Tài)

    // Khởi tạo trọng số - thông thường sẽ ngẫu nhiên, nhưng ở đây ta dùng pre-training weights
    const hiddenLayer1Weights = Array(10).fill().map(() => Array(8).fill(0).map((_, i) => (i % 2 === 0 ? 0.2 : -0.2)));
    const hiddenLayer2Weights = Array(8).fill().map(() => Array(4).fill(0).map((_, i) => (i % 2 === 0 ? 0.3 : -0.3)));
    const outputLayerWeights = Array(4).fill().map(() => (Math.random() > 0.5 ? 0.4 : -0.4));

    // ReLU activation function
    const relu = x => Math.max(0, x);

    // Sigmoid activation function
    const sigmoid = x => 1 / (1 + Math.exp(-x));

    // Học dần theo mini-batch
    const learningRate = 0.01;
    const epochs = 50;
    const batchSize = 5;

    for (let epoch = 0; epoch < epochs; epoch++) {
        for (let batchStart = 0; batchStart < sequences.length; batchStart += batchSize) {
            const batchEnd = Math.min(batchStart + batchSize, sequences.length);
            const batchX = sequences.slice(batchStart, batchEnd);
            const batchY = outputs.slice(batchStart, batchEnd);

            // Mini-batch gradient descent
            for (let i = 0; i < batchX.length; i++) {
                // Forward pass
                // Lớp ẩn 1
                const hidden1 = Array(8).fill(0);
                for (let j = 0; j < 8; j++) {
                    for (let k = 0; k < 10; k++) {
                        hidden1[j] += batchX[i][k] * hiddenLayer1Weights[k][j];
                    }
                    hidden1[j] = relu(hidden1[j]);
                }

                // Lớp ẩn 2
                const hidden2 = Array(4).fill(0);
                for (let j = 0; j < 4; j++) {
                    for (let k = 0; k < 8; k++) {
                        hidden2[j] += hidden1[k] * hiddenLayer2Weights[k][j];
                    }
                    hidden2[j] = relu(hidden2[j]);
                }

                // Lớp đầu ra
                let output = 0;
                for (let j = 0; j < 4; j++) {
                    output += hidden2[j] * outputLayerWeights[j];
                }
                output = sigmoid(output);

                // Backward pass (simplified)
                const error = batchY[i] - output;

                // Cập nhật lớp đầu ra
                for (let j = 0; j < 4; j++) {
                    outputLayerWeights[j] += learningRate * error * hidden2[j];
                }

                // Giả lập cập nhật các lớp khác (thực tế cần backpropagation đầy đủ)
                // Trong JavaScript đơn thuần không thể triển khai đầy đủ DL
            }
        }
    }

    // Dự đoán với mô hình đã học
    const currentSequence = recentNumbers.slice(0, sequenceLength).map(n => n >= 5 ? 1 : 0);

    // Forward pass
    // Lớp ẩn 1
    const hidden1 = Array(8).fill(0);
    for (let j = 0; j < 8; j++) {
        for (let k = 0; k < 10; k++) {
            hidden1[j] += currentSequence[k] * hiddenLayer1Weights[k][j];
        }
        hidden1[j] = relu(hidden1[j]);
    }

    // Lớp ẩn 2
    const hidden2 = Array(4).fill(0);
    for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 8; k++) {
            hidden2[j] += hidden1[k] * hiddenLayer2Weights[k][j];
        }
        hidden2[j] = relu(hidden2[j]);
    }

    // Lớp đầu ra
    let output = 0;
    for (let j = 0; j < 4; j++) {
        output += hidden2[j] * outputLayerWeights[j];
    }
    const probability = sigmoid(output);

    // Dự đoán dựa trên xác suất
    return probability > 0.5 ?
        getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
}

// Mô hình dựa trên lý thuyết trò chơi
function gameTheoryPredictor(history, index = 0) {
    const recentNumbers = history.map(item => getNumberFromHistory(item, index))
        .filter(num => num !== null)
        .slice(0, 30);

    if (recentNumbers.length < 10) return null;

    // Phân tích thời gian và mẫu theo khung giờ
    let currentHour = -1;
    if (history[0] && history[0].timeVN) {
        const timeMatch = history[0].timeVN.match(/(\d+):(\d+):(\d+)\s+(AM|PM)/);
        if (timeMatch) {
            currentHour = parseInt(timeMatch[1]);
            const ampm = timeMatch[4];
            if (ampm === 'PM' && currentHour < 12) currentHour += 12;
            if (ampm === 'AM' && currentHour === 12) currentHour = 0;
        }
    }

    // Phân tích phân phối và tìm bias
    const taiCount = recentNumbers.filter(n => n >= 5).length;
    const xiuCount = recentNumbers.length - taiCount;
    const taiRatio = taiCount / recentNumbers.length;
    const expectedRatio = 0.5; // Tỷ lệ kỳ vọng là 50/50
    const deviation = taiRatio - expectedRatio;

    // Phân tích chuỗi gần đây (10 & 5 lượt gần nhất)
    const recent10 = recentNumbers.slice(0, 10);
    const recent5 = recentNumbers.slice(0, 5);
    const recent10Tai = recent10.filter(n => n >= 5).length;
    const recent5Tai = recent5.filter(n => n >= 5).length;
    const recent10Ratio = recent10Tai / recent10.length;
    const recent5Ratio = recent5Tai / recent5.length;

    // Nếu 5 kết quả gần nhất có mẫu rõ rệt (4/5 hoặc 5/5), có khả năng đây là chu kỳ can thiệp
    if (recent5.length >= 5 && (recent5Tai >= 4 || recent5Tai <= 1)) {
        // Phát hiện can thiệp, dự đoán đảo chiều
        return recent5Tai >= 4 ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }

    // Phân tích độ dao động (volatility)
    let volatility = 0;
    for (let i = 1; i < recentNumbers.length; i++) {
        const prev = recentNumbers[i - 1] >= 5;
        const curr = recentNumbers[i] >= 5;
        if (prev !== curr) volatility++;
    }
    const volatilityRatio = volatility / (recentNumbers.length - 1);

    // Phân tích đặc biệt theo khung giờ
    // Khung giờ đêm khuya (12-3AM) thường có nhiều can thiệp
    if (currentHour >= 0 && currentHour < 3) {
        // Ưu tiên đảo chiều trong khung giờ này
        if (Math.abs(deviation) > 0.15 || Math.abs(recent10Ratio - 0.5) > 0.2) {
            return (taiRatio > 0.5) ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
        }
    }

    // Khung giờ sáng sớm (3-7AM) cũng thường có can thiệp
    if (currentHour >= 3 && currentHour < 7) {
        if (volatilityRatio < 0.3) { // Biến động thấp = khuôn mẫu rõ ràng
            // Nếu có khuôn mẫu rõ ràng, dự đoán đảo chiều
            return (recentNumbers[0] >= 5) ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
        }
    }

    // Các khung giờ peak (7-9PM) thường ít can thiệp hơn
    if (currentHour >= 19 && currentHour <= 21) {
        // Dự đoán theo xu hướng
        if (Math.abs(recent5Ratio - 0.5) > 0.3) {
            return (recent5Ratio > 0.5) ? getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
        }
    }

    // Chiến lược chung dựa trên phân tích
    if (volatilityRatio > 0.7) {
        // Biến động cao -> khả năng đổi chiều cao
        return (recentNumbers[0] >= 5) ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }

    if (Math.abs(deviation) > 0.2) {
        // Độ lệch lớn, nhà cái có thể điều chỉnh
        if (deviation > 0) {
            // Quá nhiều Tài, có thể điều chỉnh về Xỉu
            return getLuckyNumberInRange(0, 4);
        } else {
            // Quá nhiều Xỉu, có thể điều chỉnh về Tài
            return getLuckyNumberInRange(5, 9);
        }
    }

    if (volatilityRatio < 0.3 && recent10.length >= 5) {
        // Biến động thấp, có thể có khuôn mẫu
        // Dự đoán duy trì xu hướng
        return (recentNumbers[0] >= 5) ? getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
    }

    // Nếu không có mẫu rõ ràng, dự đoán dựa trên xu hướng gần đây
    return (recent10Ratio > 0.6) ? getLuckyNumberInRange(0, 4) :
        (recent10Ratio < 0.4) ? getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 9);
}

// Mô hình tổng hợp tự điều chỉnh theo hiệu suất gần đây - phiên bản cải tiến
function adaptiveEnsemblePredictor(history, index = 0) {
    // Danh sách các predictor và trọng số ban đầu
    const predictors = [
        { fn: improvedMarkovPredictor, name: "markov", weight: 0.15, correct: 0, total: 0 },
        { fn: enhancedTrendReversalPredictor, name: "trend", weight: 0.05, correct: 0, total: 0 },
        { fn: anomalyFilterPredictor, name: "anomaly", weight: 0.1, correct: 0, total: 0 },
        { fn: timeSeriesAnalysisPredictor, name: "timeseries", weight: 0.15, correct: 0, total: 0 },
        { fn: patternRecognitionPredictor, name: "pattern", weight: 0.15, correct: 0, total: 0 },
        { fn: timeBasedPredictor, name: "timebased", weight: 0.1, correct: 0, total: 0 },
        { fn: simplifiedDeepLearningPredictor, name: "deeplearning", weight: 0.1, correct: 0, total: 0 },
        { fn: gameTheoryPredictor, name: "gametheory", weight: 0.2, correct: 0, total: 0 }
    ];

    // Kiểm tra xem có tệp hiệu suất dự đoán không
    const fs = require('fs');
    const performanceFile = 'predictor_performance.json';

    try {
        if (fs.existsSync(performanceFile)) {
            const performanceData = JSON.parse(fs.readFileSync(performanceFile, 'utf8'));

            // Cập nhật trọng số dựa trên hiệu suất gần đây
            predictors.forEach(pred => {
                if (performanceData[pred.name]) {
                    pred.correct = performanceData[pred.name].correct || 0;
                    pred.total = performanceData[pred.name].total || 0;

                    // Điều chỉnh trọng số dựa trên hiệu suất
                    if (pred.total > 10) {
                        const accuracy = pred.correct / pred.total;
                        // Áp dụng hàm sigmoid để giới hạn việc tăng/giảm trọng số
                        const adjustmentFactor = 1 / (1 + Math.exp(-(accuracy - 0.5) * 10));
                        // Điều chỉnh trong phạm vi 0.05 đến 0.3
                        pred.weight = 0.05 + (0.25 * adjustmentFactor);
                    }
                }
            });

            // Chuẩn hóa trọng số để tổng = 1
            const totalWeight = predictors.reduce((sum, p) => sum + p.weight, 0);
            predictors.forEach(p => {
                p.weight = p.weight / totalWeight;
            });
        }
    } catch (error) {
        console.error("Lỗi khi đọc file hiệu suất:", error);
    }

    // Lấy dự đoán từ tất cả các mô hình
    const predictions = [];
    let totalWeight = 0;

    for (const predictor of predictors) {
        try {
            const result = predictor.fn(history, index);
            if (result !== null) {
                predictions.push({
                    predictor: predictor.name,
                    value: result,
                    weight: predictor.weight
                });
                totalWeight += predictor.weight;
            }
        } catch (error) {
            console.error(`Lỗi từ predictor ${predictor.name}:`, error);
        }
    }

    if (predictions.length === 0 || totalWeight === 0) {
        return null;
    }

    // Tính tổng có trọng số
    const weightedSum = predictions.reduce((sum, pred) => sum + (pred.value * pred.weight), 0);
    const prediction = Math.round(weightedSum / totalWeight);

    // Đưa thông tin chi tiết về dự đoán vào object trả về thay vì ghi log riêng
    const predictionDetails = {
        predictorDetails: predictions.map(p => ({
            name: p.predictor,
            prediction: p.value >= 5 ? 'Tài' : 'Xỉu',
            weight: p.weight
        })),
        finalPrediction: prediction >= 5 ? 'Tài' : 'Xỉu'
    };

    // Gắn thông tin chi tiết vào prediction để được sử dụng trong predictWithLimit
    prediction.details = predictionDetails;

    return prediction;
}

// Hàm cập nhật hiệu suất của các mô hình - đã được sửa đổi
function updatePredictorPerformance(actualNumber, predictions) {
    try {
        const fs = require('fs');
        const performanceFile = 'predictor_performance.json';

        let performanceData = {};
        if (fs.existsSync(performanceFile)) {
            try {
                performanceData = JSON.parse(fs.readFileSync(performanceFile, 'utf8'));
            } catch (e) {
                performanceData = {};
            }
        }

        // Chuyển thành nhị phân Tài/Xỉu để đơn giản khi đánh giá
        const actualTaiXiu = actualNumber >= 5;

        // Ghi nhận kết quả cho từng predictor
        Object.keys(predictions).forEach(predictorName => {
            const prediction = predictions[predictorName];

            if (prediction !== null && prediction !== undefined) {
                if (!performanceData[predictorName]) {
                    performanceData[predictorName] = { correct: 0, total: 0 };
                }

                performanceData[predictorName].total++;

                const predictionTaiXiu = prediction >= 5;
                if (predictionTaiXiu === actualTaiXiu) {
                    performanceData[predictorName].correct++;
                }
            }
        });

        // Lưu lại
        fs.writeFileSync(performanceFile, JSON.stringify(performanceData, null, 2));

    } catch (error) {
        console.error("Lỗi khi cập nhật hiệu suất predictor:", error);
    }
}


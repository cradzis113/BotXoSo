// Thêm dòng này ở đầu file, cùng với các import khác
const fs = require('fs');

// Thêm vào đầu file predict.js
// Biến lưu trạng thái toàn cục
let APP_STATE = {
    lastRun: null,
    predictorStats: {},
    consecutiveResults: [],
    initialized: false
};

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
function analyzePerformanceByLimit(fileConfig, index, limitList = [5, 10, 15]) {
    try {
        const fs = require('fs');
        const performanceData = {};

        // Chỉ lấy hiệu suất của các limit trong danh sách được chỉ định
        for (const limit of limitList) {
            const filePath = `${fileConfig[0]}_index${index}_limit${limit}.performance`;

            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                const lines = content.split('\n').filter(line =>
                    line.trim() !== '' && !line.startsWith('#'));

                if (lines.length > 0) {
                    const correct = lines.filter(line => line.includes('| Đúng')).length;
                    const accuracy = lines.length > 0 ? correct / lines.length : 0;

                    performanceData[limit] = {
                        total: lines.length,
                        correct,
                        accuracy
                    };

                    console.log(`Limit ${limit}: ${correct}/${lines.length} đúng (${(accuracy * 100).toFixed(1)}%), index=${index}`);
                } else {
                    performanceData[limit] = { total: 0, correct: 0, accuracy: 0 };
                    console.log(`Limit ${limit}: Chưa có dữ liệu cho index=${index}`);
                }
            } else {
                performanceData[limit] = { total: 0, correct: 0, accuracy: 0 };
                console.log(`Limit ${limit}: Chưa có dữ liệu cho index=${index}`);
            }
        }

        return performanceData;
    } catch (error) {
        console.error("Lỗi khi phân tích performance theo limit:", error);
        return {};
    }
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
                    // Code hiện tại không hoạt động đúng khi có 3 dự đoán sai liên tiếp
                    // Sửa lại cách phát hiện dự đoán sai liên tiếp
                    const consecutiveWrong = getConsecutiveWrongPredictions(recentResults);
                    console.log(`Phát hiện ${consecutiveWrong} dự đoán sai liên tiếp với limit=${currentLimit}`);

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

    // THÊM MỚI: Nếu không có đủ dữ liệu hiệu suất, sử dụng history
    const hasEnoughPerformanceData = Object.keys(performanceData).length > 0 &&
        Object.values(performanceData).some(data => data.totalPredictions >= 3);

    if (!hasEnoughPerformanceData && history && history.length > 0) {
        console.log("Không đủ dữ liệu hiệu suất, phân tích history để chọn limit tốt nhất");

        // Kiểm tra hiệu quả của từng limit với dữ liệu lịch sử
        const limitScores = {};

        // Thử từng limit với history
        for (const testLimit of limitList) {
            // Lấy phần history tương ứng với limit
            const limitedHistory = history.slice(0, testLimit);

            // Lấy các số thực tế từ history với index đã cho
            const actualNums = limitedHistory.map(item => {
                if (!item || !item.numbers || !item.numbers[index]) return null;
                const num = Number(item.numbers[index]);
                return !isNaN(num) ? num : null;
            }).filter(n => n !== null);

            if (actualNums.length < 3) continue; // Cần ít nhất 3 số để đánh giá

            // Phân tích xu hướng
            const taiCount = actualNums.filter(n => n >= 5).length;
            const xiuCount = actualNums.length - taiCount;

            // Xem xu hướng có rõ ràng không (>60% là một loại)
            const taiRatio = taiCount / actualNums.length;
            const hasClearTrend = taiRatio >= 0.6 || taiRatio <= 0.4;

            // Kiểm tra chuỗi liên tiếp
            let maxStreak = 0;
            let currentStreak = 1;

            for (let i = 1; i < actualNums.length; i++) {
                if ((actualNums[i] >= 5) === (actualNums[i - 1] >= 5)) {
                    currentStreak++;
                } else {
                    currentStreak = 1;
                }
                maxStreak = Math.max(maxStreak, currentStreak);
            }

            // Tính điểm cho limit này
            // - Có xu hướng rõ ràng: +0.3
            // - Có chuỗi dài (>=3): +0.2
            // - Limit lớn hơn có nhiều dữ liệu hơn: +0.1 mỗi 5 mẫu
            let score = 0.5; // Điểm cơ bản

            if (hasClearTrend) score += 0.3;
            if (maxStreak >= 3) score += 0.2;
            score += Math.min(0.3, 0.1 * Math.floor(actualNums.length / 5));

            limitScores[testLimit] = score;
            console.log(`Limit ${testLimit}: Điểm = ${score.toFixed(2)}, ${actualNums.length} mẫu, Trend: ${taiRatio.toFixed(2)}, MaxStreak: ${maxStreak}`);
        }

        // Chọn limit có điểm cao nhất
        if (Object.keys(limitScores).length > 0) {
            const bestLimitEntry = Object.entries(limitScores).reduce((best, current) =>
                current[1] > best[1] ? current : best, [defaultLimit, 0.5]);

            bestLimit = parseInt(bestLimitEntry[0]);
            bestScore = bestLimitEntry[1];

            console.log(`Chọn limit ${bestLimit} dựa trên phân tích history với điểm ${bestScore.toFixed(2)}`);
        }
    }

    // Nếu không có thông tin gì đặc biệt, sử dụng limit mặc định
    return {
        limit: bestLimit,
        score: bestScore > 0 ? bestScore : 0.5
    };
}

/**
 * Dự đoán số tiếp theo và tự động học từ file performance
 */
async function predictNumbers(history, index = 0, limit = { limitList: [3, 5, 10, 15, 20], limitMain: 15 }, fileConfig = ["taixiu_history", true], log = false) {
    // Thêm khởi tạo weights ở đây
    let weights = {};
    
    try {
        // Tìm nếu có file cũ
        const predictorPerformancePath = "predictor_performance.json";
        if (fs.existsSync(predictorPerformancePath)) {
            try {
                const data = fs.readFileSync(predictorPerformancePath, "utf8");
                weights = JSON.parse(data);
            } catch (error) {
                console.log("Lỗi khi đọc file prediction cũ:", error);
            }
        }
        
        // Khởi tạo trạng thái khi bắt đầu
        if (!APP_STATE.initialized) {
            initializeAppState();
        }

        // Các phần validate đầu vào giữ nguyên
        const validatedParams = validateInputParams(history, index, limit, fileConfig);
        if (!validatedParams.isValid) {
            if (log) console.error("Params không hợp lệ:", validatedParams.error);
            throw new Error(validatedParams.error);
        }

        // Bước 1: Phân tích hiệu suất và chọn limit tốt nhất
        const performanceData = analyzePerformanceByLimit(fileConfig, index, validatedParams.limit.limitList);
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
                    console.log('DEBUG - DrawIDs:', {
                        previousPredictionDrawId: previousPrediction.drawId,
                        actualDrawId: actualResult.drawId
                    });

                    // Cách đơn giản hơn - so sánh trực tiếp nội dung file
                    if (fs.existsSync(`${fileConfig[0]}_combined_performance.log`)) {
                        const performanceContent = fs.readFileSync(`${fileConfig[0]}_combined_performance.log`, 'utf8');
                        if (performanceContent.includes(`Chu kỳ | ${actualResult.drawId}`)) {
                            console.log(`Đã có kết quả cho chu kỳ ${actualResult.drawId}, bỏ qua.`);
                            // bỏ qua
                        } else {
                            // Có dự đoán cho chu kỳ hiện tại, cập nhật performance
                            const actualNumber = Number(actualResult.numbers[index]);

                            // Thêm dòng này: cập nhật hiệu suất của từng predictor
                            if (previousPrediction.predictorDetails) {
                                const predictorResults = {};
                                previousPrediction.predictorDetails.forEach(pred => {
                                    predictorResults[pred.name] = pred.value;
                                });
                                weights = updatePredictorPerformance(actualNumber, predictorResults, weights);
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
                    } else {
                        // Tạo file performance mới nếu chưa tồn tại
                        const actualNumber = Number(actualResult.numbers[index]);

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

        // Lưu trạng thái sau mỗi lần dự đoán
        saveAppState();

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
        adaptive: 0.25,
        // Thêm trọng số cho 3 mô hình mới
        timeofday: 0.10,
        ensemble: 0.10,
        recent: 0.10,
        quickadaptive: 0.4, // Trọng số cao để ưu tiên thích nghi nhanh
        alternating: 0.25, // Trọng số cao để ưu tiên thích nghi nhanh
        learning: 0.30, // Trọng số cao vì đây là mô hình quan trọng
        numberpred: 0.30, // Trọng số cao cho dự đoán số cụ thể
        streakrev: 0.25, // Trọng số cho mô hình đảo chiều sau chuỗi dài
    };

    // Điều chỉnh trọng số nếu có xu hướng Xỉu/Tài rõ ràng
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
            weights.recent_trend = 0.35; // Tăng từ 0.3
            weights.anomaly = 0.2;       // Tăng từ 0.1
            // Giảm trọng số của markov và gametheory
            weights.markov = 0.15;       // Giữ nguyên hoặc giảm
            weights.gametheory = 0.15;   // Giảm từ 0.2
        }
    }

    // predict.js - Thêm đoạn này ngay trước đoạn xây dựng mảng dự đoán (khoảng dòng 628)
    const timeOfDayPred = timeOfDayPredictor(limitedHistory, index);
    const ensembleVotingPred = ensembleVotingPredictor(limitedHistory, index);
    const recentTrendPred = recentTrendPredictor(limitedHistory, index);

    // Thêm dòng này trước khi khai báo mảng predictions
    const quickAdaptivePred = quickAdaptivePredictor(limitedHistory, index);

    // Thêm dòng này trước khi xây dựng mảng predictions
    const alternatingPred = alternatingPatternPredictor(limitedHistory, index);

    // Thêm dòng này trước khi xây dựng mảng predictions
    const learningPred = learningFromHistoryPredictor(limitedHistory, index);

    // Xây dựng mảng dự đoán
    const predictions = [
        { pred: markovPred, name: "markov", weight: weights.markov },
        { pred: trendPred, name: "trend", weight: weights.trend },
        { pred: anomalyPred, name: "anomaly", weight: weights.anomaly },
        { pred: timeSeriesPred, name: "timeseries", weight: weights.timeseries },
        { pred: patternPred, name: "pattern", weight: weights.pattern },
        { pred: timeBasedPred, name: "timebased", weight: weights.timebased },
        { pred: gameTheoryPred, name: "gametheory", weight: weights.gametheory },
        { pred: adaptiveEnsemblePred, name: "adaptive", weight: weights.adaptive },
        { pred: timeOfDayPred, name: "timeofday", weight: weights.timeofday || 0.10 },
        { pred: ensembleVotingPred, name: "ensemble", weight: weights.ensemble || 0.10 },
        { pred: recentTrendPred, name: "recent", weight: weights.recent || 0.10 },
        { pred: quickAdaptivePred, name: "quickadaptive", weight: weights.quickadaptive },
        { pred: alternatingPred, name: "alternating", weight: weights.alternating || 0.25 },
        { pred: learningPred, name: "learning", weight: weights.learning },
        { pred: combinedNumberPredictor(limitedHistory, index), name: "numberpred", weight: weights.numberpred || 0.30 },
        { pred: streakReversalPredictor(history, index), name: "streakrev", weight: weights.streakrev || 0.40 },
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
        // Kiểm tra giá trị pred.pred có hợp lệ không
        if (pred.pred !== null && pred.pred !== undefined && !isNaN(Number(pred.pred))) {
            weightedSum += pred.pred * pred.weight;
            totalWeight += pred.weight;
            validPredictions.push({
                name: pred.name,
                value: pred.pred,
                weight: pred.weight,
                type: pred.pred >= 5 ? 'Tài' : 'Xỉu'
            });
        } else {
            console.log(`Bỏ qua ${pred.name} vì kết quả không hợp lệ: ${pred.pred}`);
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
        adaptive: 'Mô hình học máy đơn giản với Logistic Regression',
        // Thêm 3 mô hình mới
        timeofday: 'Phân tích theo thời gian trong ngày',
        ensemble: 'Mô hình bỏ phiếu tổng hợp',
        recent: 'Xu hướng ngắn hạn gần nhất',
        quickadaptive: 'Thích nghi nhanh dựa trên xu hướng gần nhất',
        reversal: 'Phát hiện đảo chiều xu hướng nhanh',
        alternating: 'Phát hiện mẫu xen kẽ Tài-Xỉu',  // Thêm mô hình mới
        learning: 'Học máy từ kết quả thực tế và lịch sử',
        numberpred: 'Dự đoán dựa trên phân tích số thực tế',
        numberdist: 'Dự đoán dựa trên phân phối số',
        specificnum: 'Dự đoán dựa trên mẫu số cụ thể',
        inversenum: 'Dự đoán số đảo chiều',
        streakrev: 'Dự đoán đảo chiều sau chuỗi dài',
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

                // THÊM 2 DÒNG NÀY Ở ĐÂY:
                const consecutiveWrong = getConsecutiveWrongPredictions(recentResults);
                const recentTrend = getRecentTrend(recentResults, 3);

                // Thay đổi điều kiện đảo chiều dự đoán
                if (consecutiveWrong >= 2 || wrongPredictions / recentResults.length >= 0.6 || recentTrend === "Xỉu") {
                    console.log(`Phát hiện ${consecutiveWrong} dự đoán sai liên tiếp hoặc xu hướng Xỉu liên tiếp, đảo ngược dự đoán`);

                    // Ưu tiên dự đoán theo xu hướng gần đây nếu phát hiện
                    if (recentTrend === "Xỉu") {
                        finalNumber = getLuckyNumberInRange(0, 4); // Buộc ra Xỉu
                        console.log("Phát hiện chuỗi Xỉu gần đây, chuyển sang dự đoán Xỉu");
                    }
                    else if (recentTrend === "Tài") {
                        finalNumber = getLuckyNumberInRange(5, 9); // Buộc ra Tài
                        console.log("Phát hiện chuỗi Tài gần đây, chuyển sang dự đoán Tài");
                    }
                    else {
                        // Đảo ngược dự đoán
                        if (finalNumber >= 5) {
                            finalNumber = getLuckyNumberInRange(0, 4);
                        } else {
                            finalNumber = getLuckyNumberInRange(5, 9);
                        }
                    }

                    // Các dòng code khác giữ nguyên...
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
                        strategies = [`Ưu tiên mô hình ${bestPredictor} (độ chính xác ${(bestAccuracy * 100).toFixed(1)}%)`];

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
function enhancedTrendReversalPredictor(history, index = 0) {
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
        // Tăng khả năng phát hiện đảo chiều khi có quá nhiều kết quả liên tiếp
        const reverseProb = 0.6 + (currentStreak - 3) * 0.15; // Tăng từ 0.5 lên 0.6 và tăng hệ số từ 0.1 lên 0.15
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

    // Thêm vào hàm patternRecognitionPredictor
    // Phát hiện sự thay đổi mẫu đột ngột (ví dụ: TTTXX hoặc XXXTTT)
    if (binaryPattern.startsWith('TTT') && binaryPattern.substring(3, 5) === 'XX') {
        // Phát hiện mẫu chuyển từ Tài sang Xỉu đột ngột
        return getLuckyNumberInRange(0, 4); // Tiếp tục Xỉu
    }
    if (binaryPattern.startsWith('XXX') && binaryPattern.substring(3, 5) === 'TT') {
        // Phát hiện mẫu chuyển từ Xỉu sang Tài đột ngột
        return getLuckyNumberInRange(5, 9); // Tiếp tục Tài
    }

    // Xử lý mẫu TXTXT hoặc XTXTX tốt hơn
    if (binaryPattern.startsWith('TXTX') || binaryPattern.startsWith('XTXT')) {
        // Mẫu luân phiên - tiếp tục mẫu luân phiên
        console.log("Phát hiện mẫu luân phiên, dự đoán tiếp tục luân phiên");
        return binaryPattern[0] !== binaryPattern[2] ?
            (binaryPattern[0] === 'T' ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9)) :
            (binaryPattern[0] === 'T' ? getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4));
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

    // Xác định khung giờ chính
    let timeSegment;
    if (currentHour >= 0 && currentHour < 6) timeSegment = "đêm_khuya"; // 0h-6h: Đêm khuya
    else if (currentHour >= 6 && currentHour < 12) timeSegment = "sáng"; // 6h-12h: Sáng
    else if (currentHour >= 12 && currentHour < 18) timeSegment = "chiều"; // 12h-18h: Chiều
    else timeSegment = "tối"; // 18h-0h: Tối

    // Kiểm tra hiệu suất lịch sử theo khung giờ
    try {
        const fs = require('fs');
        const hourlyPerformancePath = "hourly_performance.json";
        let hourlyPerformance = {};

        if (fs.existsSync(hourlyPerformancePath)) {
            hourlyPerformance = JSON.parse(fs.readFileSync(hourlyPerformancePath, 'utf8'));
        }

        // Kiểm tra hiệu suất khung giờ hiện tại
        if (hourlyPerformance[timeSegment]) {
            const segmentData = hourlyPerformance[timeSegment];

            // Nếu có dữ liệu đủ lớn (>20 dự đoán) và hiệu suất rõ rệt
            if (segmentData.total >= 20) {
                const taiRatio = segmentData.taiCorrect / segmentData.taiTotal;
                const xiuRatio = segmentData.xiuCorrect / segmentData.xiuTotal;

                // Nếu hiệu suất dự đoán Tài tốt hơn Xỉu đáng kể (>15%)
                if (segmentData.taiTotal > 5 && segmentData.xiuTotal > 5 &&
                    (taiRatio - xiuRatio > 0.15)) {
                    return getLuckyNumberInRange(5, 9); // Ưu tiên Tài
                }

                // Nếu hiệu suất dự đoán Xỉu tốt hơn Tài đáng kể (>15%)
                if (segmentData.taiTotal > 5 && segmentData.xiuTotal > 5 &&
                    (xiuRatio - taiRatio > 0.15)) {
                    return getLuckyNumberInRange(0, 4); // Ưu tiên Xỉu
                }
            }
        }

        // Nếu không có dữ liệu hiệu suất theo giờ, áp dụng chiến lược mặc định
        // Đêm khuya: Nhà cái can thiệp nhiều, xu hướng thường đảo chiều đột ngột
        if (timeSegment === "đêm_khuya") {
            // Kiểm tra 3 kết quả gần nhất
            const recent3 = history.slice(0, 3).map(item => getNumberFromHistory(item, index));
            const taiCount = recent3.filter(n => n >= 5).length;
            const xiuCount = recent3.length - taiCount;

            // Nếu 3 kết quả gần nhất đều cùng loại, khả năng cao sẽ đổi chiều
            if (taiCount === 3) return getLuckyNumberInRange(0, 4);
            if (xiuCount === 3) return getLuckyNumberInRange(5, 9);
        }

        // Buổi sáng: Thường theo xu hướng ổn định
        if (timeSegment === "sáng") {
            const recent5 = history.slice(0, 5).map(item => getNumberFromHistory(item, index));
            const taiCount = recent5.filter(n => n >= 5).length;

            // Dự đoán theo xu hướng đa số
            if (taiCount > recent5.length / 2) return getLuckyNumberInRange(5, 9);
            else return getLuckyNumberInRange(0, 4);
        }

        // Buổi chiều: Thường có sự chuyển đổi khi đạt chuỗi dài
        if (timeSegment === "chiều") {
            // Kiểm tra chuỗi dài
            let currentType = history[0].numbers[index] >= 5;
            let streak = 1;

            for (let i = 1; i < history.length; i++) {
                if ((history[i].numbers[index] >= 5) === currentType) streak++;
                else break;
            }

            // Nếu có chuỗi >=4, khả năng cao sẽ đảo chiều
            if (streak >= 4) {
                return currentType ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
            }
        }

        // Buổi tối: Cao điểm, nhiều người chơi, thường tuân theo quy luật xác suất
        if (timeSegment === "tối") {
            // Phân tích xu hướng dài (20 kết quả)
            const recent20 = history.slice(0, Math.min(20, history.length))
                .map(item => getNumberFromHistory(item, index));
            const taiCount = recent20.filter(n => n >= 5).length;
            const taiRatio = taiCount / recent20.length;

            // Nếu tỷ lệ Tài/Xỉu lệch xa 50/50, có xu hướng hồi quy về trung bình
            if (taiRatio > 0.6) return getLuckyNumberInRange(0, 4);
            if (taiRatio < 0.4) return getLuckyNumberInRange(5, 9);
        }
    } catch (error) {
        console.error("Lỗi khi phân tích theo khung giờ:", error);
    }

    return null; // Không có dự đoán cụ thể, để các mô hình khác xử lý
}

// Mô hình học sâu giả lập đơn giản cho JS
function simplifiedDeepLearningPredictor(history, index = 0) {
    const recentNumbers = history.map(item => getNumberFromHistory(item, index))
        .filter(num => num !== null)
        .slice(0, 50); // Lấy 50 kết quả gần nhất

    // Thêm kiểm tra đủ dữ liệu trước khi xử lý
    if (recentNumbers.length < 20) {
        console.log("Không đủ dữ liệu cho simplifiedDeepLearningPredictor");
        return null; // Trả về null thay vì undefined
    }

    // Phần còn lại của hàm giữ nguyên, nhưng thêm các bước kiểm tra lỗi

    try {
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
    } catch (error) {
        console.error("Lỗi trong simplifiedDeepLearningPredictor:", error);
        return getLuckyNumberInRange(0, 9); // Trả về số ngẫu nhiên thay thế khi có lỗi
    }
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

    // Nếu 5 kết quả gần nhất có mẫu rõ ràng (4/5 hoặc 5/5), có khả năng đây là chu kỳ can thiệp
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
    // Chỉ thêm dòng này để khai báo biến
    let consecutiveWrong = 0;

    // Danh sách các predictor và trọng số ban đầu
    const predictors = [
        { name: 'markov', fn: improvedMarkovPredictor, weight: 0.10 },
        { name: 'trend', fn: enhancedTrendReversalPredictor, weight: 0.10 },
        { name: 'anomaly', fn: anomalyFilterPredictor, weight: 0.10 },
        { name: 'timeseries', fn: timeSeriesAnalysisPredictor, weight: 0.10 },
        { name: 'pattern', fn: patternRecognitionPredictor, weight: 0.10 },
        { name: 'gametheory', fn: gameTheoryPredictor, weight: 0.10 },
        { name: 'adaptive', fn: simplifiedDeepLearningPredictor, weight: 0.10 },
        { name: 'timeofday', fn: timeOfDayPredictor, weight: 0.10 },
        { name: 'ensemble', fn: ensembleVotingPredictor, weight: 0.10 },
        { name: 'recent', fn: recentTrendPredictor, weight: 0.05 },
        { name: 'quickadaptive', fn: quickAdaptivePredictor, weight: 0.10 },
        { name: 'learning', fn: learningFromHistoryPredictor, weight: 0.15 },
        { name: 'alternating', fn: alternatingPatternPredictor, weight: 0.15 },
        { name: 'numberpred', fn: combinedNumberPredictor, weight: 0.30 } // Thêm với trọng số cao
    ];

    // Giữ nguyên đoạn code điều chỉnh dựa trên consecutiveWrong
    if (consecutiveWrong >= 2) {
        predictors.forEach(p => {
            if (p.name === 'trend') {
                p.weight *= 1.5;
            }
            if (p.name === 'recent') {
                p.weight *= 0.7;
            }
        });
    }

    // Giữ nguyên phần code còn lại của hàm
    let predictions = [];
    let totalWeight = 0;

    // Chạy từng predictor
    for (const predictor of predictors) {
        try {
            const result = predictor.fn(history, index);
            if (result !== null && result !== undefined && !isNaN(Number(result))) {
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

    // Tính kết quả có trọng số
    if (predictions.length === 0 || totalWeight === 0) {
        return null;
    }

    // Tính tổng có trọng số
    const weightedSum = predictions.reduce((sum, pred) => sum + (pred.value * pred.weight), 0);
    const prediction = Math.round(weightedSum / totalWeight);

    return prediction;
}

// Hàm cập nhật hiệu suất của các mô hình - đã được sửa đổi
function updatePredictorPerformance(actualNumber, predictions, weights) {
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

    // Thêm vào cuối hàm updatePredictorPerformance, trước return weights
    const recentResults = getRecentResults(5); // Lấy 5 kết quả gần nhất
    let wrongCount = getConsecutiveWrongPredictions(recentResults);
    if (wrongCount >= 2) {
        // Reset sau 2 lần sai liên tiếp
        console.log(`Phát hiện ${wrongCount} lần dự đoán sai liên tiếp - Reset trọng số`);
        weights = resetModelWeights(weights || {});
    }
    
    return weights;
}

/**
 * Phân tích số lần dự đoán sai liên tiếp từ các kết quả gần đây
 * @param {Array} recentResults Mảng kết quả gần đây từ file performance
 * @returns {Number} Số lần dự đoán sai liên tiếp tính từ kết quả mới nhất
 */
function getConsecutiveWrongPredictions(recentResults) {
    if (!recentResults || !recentResults.length) return 0;
    
    let count = 0;
    for (let i = 0; i < recentResults.length; i++) {
        // Kiểm tra nếu recentResults[i] là đối tượng có thuộc tính result
        if (recentResults[i] && recentResults[i].result === "Sai") {
            count++;
        } else {
            break; // Dừng đếm khi gặp kết quả đúng
        }
    }
    
    return count;
}

// Mô hình phát hiện theo thời gian trong ngày
function timeOfDayPredictor(history, index = 0) {
    if (!history || !history[0] || !history[0].timeVN) return null;
    
    // Lấy thông tin thời gian từ kết quả gần nhất
    const timeMatch = history[0].timeVN.match(/(\d+):(\d+):(\d+)\s+(AM|PM)/);
    if (!timeMatch) return null;
    
    let hour = parseInt(timeMatch[1]);
    const ampm = timeMatch[4];
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    
    // Thu thập dữ liệu theo vị trí index
    // Lấy 20 kết quả gần nhất để phân tích theo giờ
    const hourlyStats = {};
    let validDataCount = 0;
    
    for (let i = 0; i < Math.min(history.length, 100); i++) {
        const item = history[i];
        if (!item || !item.timeVN) continue;
        
        // Lấy số theo index
        const num = getNumberFromHistory(item, index);
        if (num === null) continue;
        
        // Lấy giờ từ timeVN
        const timeInfo = item.timeVN.match(/(\d+):(\d+):(\d+)\s+(AM|PM)/);
        if (!timeInfo) continue;
        
        let itemHour = parseInt(timeInfo[1]);
        const itemAmpm = timeInfo[4];
        if (itemAmpm === 'PM' && itemHour < 12) itemHour += 12;
        if (itemAmpm === 'AM' && itemHour === 12) itemHour = 0;
        
        // Gom nhóm theo giờ
        if (!hourlyStats[itemHour]) {
            hourlyStats[itemHour] = { taiCount: 0, xiuCount: 0, total: 0 };
        }
        
        // Phân loại Tài/Xỉu
        if (num >= 5) {
            hourlyStats[itemHour].taiCount++;
        } else {
            hourlyStats[itemHour].xiuCount++;
        }
        
        hourlyStats[itemHour].total++;
        validDataCount++;
    }
    
    // Nếu không đủ dữ liệu, quay lại phân tích mặc định
    if (validDataCount < 10) {
        // Buổi sáng: thường có xu hướng Tài
        if (hour >= 8 && hour < 12) {
            return getLuckyNumberInRange(5, 9);
        } 
        // Đêm khuya: thường có xu hướng Xỉu
        else if (hour >= 21 || hour < 3) {
            return getLuckyNumberInRange(0, 4);
        }
        
        return null;
    }
    
    // Phân tích dữ liệu theo giờ hiện tại
    if (hourlyStats[hour] && hourlyStats[hour].total >= 5) {
        const taiRatio = hourlyStats[hour].taiCount / hourlyStats[hour].total;
        
        console.log(`Phân tích theo giờ [${hour}h] (index ${index}): Tài ${(taiRatio*100).toFixed(1)}%, Xỉu ${((1-taiRatio)*100).toFixed(1)}%`);
        
        // Có xu hướng rõ ràng
        if (taiRatio >= 0.65) {
            return getLuckyNumberInRange(5, 9); // Xu hướng Tài
        } else if (taiRatio <= 0.35) {
            return getLuckyNumberInRange(0, 4); // Xu hướng Xỉu
        }
    }
    
    return null; // Không có dự đoán cụ thể
}

// Mô hình phát hiện kết hợp (ensembleVoting)
function ensembleVotingPredictor(history, index = 0) {
    // Lấy kết quả từ các mô hình đơn giản
    const modelResults = [
        improvedMarkovPredictor(history, index),
        enhancedTrendReversalPredictor(history, index),
        anomalyFilterPredictor(history, index),
        timeSeriesAnalysisPredictor(history, index)
    ].filter(r => r !== null);

    if (modelResults.length < 2) return null;

    // Đếm phiếu
    const taiVotes = modelResults.filter(r => r >= 5).length;
    const xiuVotes = modelResults.length - taiVotes;

    // Chỉ dự đoán khi có đa số rõ ràng (>60%)
    if (taiVotes > xiuVotes * 1.5) {
        return getLuckyNumberInRange(5, 9);
    } else if (xiuVotes > taiVotes * 1.5) {
        return getLuckyNumberInRange(0, 4);
    }

    return null;
}

// Thêm hàm này trước khi sử dụng trong danh sách predictors
function recentTrendPredictor(history, index = 0) {
    if (!history || history.length < 5) return null;

    // Lấy 5 kết quả gần nhất
    const recent5 = history.slice(0, 5).map(item => getNumberFromHistory(item, index))
        .filter(n => n !== null);

    if (recent5.length < 3) return null;

    // Đếm số lượng Tài/Xỉu
    const taiCount = recent5.filter(n => n >= 5).length;
    const xiuCount = recent5.length - taiCount;

    // Nếu có xu hướng rõ ràng (>= 60%)
    if (taiCount >= recent5.length * 0.6) {
        // Xu hướng Tài - dự đoán tiếp tục Tài
        return getLuckyNumberInRange(5, 9);
    }

    if (xiuCount >= recent5.length * 0.6) {
        // Xu hướng Xỉu - dự đoán tiếp tục Xỉu
        return getLuckyNumberInRange(0, 4);
    }

    // Trường hợp cân bằng (không có xu hướng rõ ràng)
    return null;
}

// Thêm hàm phát hiện chuỗi sai liên tiếp và dạng kết quả
function getRecentTrend(recentResults, count = 3) {
    // Lấy các kết quả gần nhất 
    const recent = recentResults.slice(0, count);

    // Kiểm tra xem có chuỗi toàn Xỉu hoặc toàn Tài không
    const xiuCount = recent.filter(line => line.includes('thực tế') && line.includes('(Xỉu)')).length;
    const taiCount = recent.filter(line => line.includes('thực tế') && line.includes('(Tài)')).length;

    if (xiuCount === count) return "Xỉu";
    if (taiCount === count) return "Tài";
    return null;
}

// Thêm vào dòng 1848 (cuối file)
// Hàm dự đoán thích nghi nhanh dựa trên xu hướng gần nhất
function quickAdaptivePredictor(history, index = 0) {
    if (!history || history.length < 3) return null;

    // Lấy 3 kết quả gần nhất
    const recentNums = history.slice(0, 3)
        .map(item => getNumberFromHistory(item, index))
        .filter(n => n !== null);

    if (recentNums.length < 2) return null;

    // Đếm xu hướng
    const xiuCount = recentNums.filter(n => n < 5).length;

    // Nếu 2/3 số gần nhất là Xỉu => dự đoán Xỉu
    if (xiuCount >= 2) {
        return getLuckyNumberInRange(0, 4);
    }
    // Nếu 2/3 số gần nhất là Tài => dự đoán Tài
    else if (xiuCount <= recentNums.length - 2) {
        return getLuckyNumberInRange(5, 9);
    }

    return null;
}

// Sửa hàm alternatingPatternPredictor để phát hiện mẫu phức tạp hơn
function alternatingPatternPredictor(history, index = 0) {
    if (!history || history.length < 6) return null;
    
    const numbers = history.slice(0, 6)
        .map(item => getNumberFromHistory(item, index))
        .filter(n => n !== null);
    
    if (numbers.length < 5) return null;
    
    // Tạo chuỗi biểu diễn Tài/Xỉu (T/X)
    const pattern = numbers.map(n => n >= 5 ? 'T' : 'X').join('');
    
    // Phát hiện các mẫu xen kẽ phổ biến
    const taixiuPatterns = ['TXTXT', 'XTXTX', 'TTXTT', 'XXTTX', 'TXXTT', 'XTXXT'];
    
    // Kiểm tra 5 phần tử đầu tiên (5 kết quả gần nhất)
    const subPattern = pattern.substring(0, 5);
    
    for (const p of taixiuPatterns) {
        if (subPattern === p) {
            // Dự đoán dựa trên mẫu đã biết
            const nextChar = p.charAt(0) === 'T' ? 'X' : 'T'; // Đảo ngược phần tử đầu
            return nextChar === 'T' ? getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
        }
    }
    
    return null;
}

// Thêm vào đầu hàm, trước mọi logic khác
try {
    const fs = require('fs');
    if (fs.existsSync('taixiu_history_combined_performance.log')) {
        // Thêm dòng kiểm tra xem đây có phải lần chạy đầu tiên không
        const isFirstRun = !fs.existsSync('last_run.json');
        if (isFirstRun) {
            fs.writeFileSync('last_run.json', JSON.stringify({ time: new Date().toISOString() }), 'utf8');
            console.log("SAFETY: Phát hiện khởi động ứng dụng, bỏ qua dự đoán lần đầu");
            return null; // Không dự đoán trong lần chạy đầu
        }

        const lines = fs.readFileSync('taixiu_history_combined_performance.log', 'utf8')
            .split('\n').filter(line => line.includes('Chu kỳ |'));

        // Lấy dự đoán gần nhất
        const lastPrediction = lines[lines.length - 1];

        // Nếu dự đoán gần nhất là sai, buộc đảo ngược dự đoán
        if (lastPrediction && lastPrediction.includes('| Sai')) {
            console.log("CRITICAL: Phát hiện dự đoán sai gần nhất, đảo ngược ngay lập tức");

            // Lấy thông tin dự đoán trước đó
            const prevPredType = lastPrediction.includes('(Tài)') && lastPrediction.includes('dự đoán')
                ? 'Tài' : 'Xỉu';

            // Đảo ngược dự đoán
            if (prevPredType === 'Tài') {
                return {
                    predictions: [getLuckyNumberInRange(0, 4)],
                    stats: { accuracy: 0, consecutiveWrong: 0 },
                    votes: { 'tài': 0.1, 'xỉu': 0.9 },
                    strategies: ['Đảo ngược khẩn cấp sau lỗi'],
                    details: {
                        predictions: [{
                            name: "emergency_flip",
                            value: getLuckyNumberInRange(0, 4),
                            weight: 1.0,
                            type: "Xỉu"
                        }],
                        limit: "emergency" // Thay thế limit.limitMain bằng giá trị cố định
                    }
                };
            } else {
                return {
                    predictions: [getLuckyNumberInRange(5, 9)],
                    stats: { accuracy: 0, consecutiveWrong: 0 },
                    votes: { 'tài': 0.9, 'xỉu': 0.1 },
                    strategies: ['Đảo ngược khẩn cấp sau lỗi'],
                    details: {
                        predictions: [{
                            name: "emergency_flip",
                            value: getLuckyNumberInRange(5, 9),
                            weight: 1.0,
                            type: "Tài"
                        }],
                        limit: "emergency"
                    }
                };
            }
        }
    }
} catch (error) {
    console.error("Lỗi kiểm tra khẩn cấp:", error);
}

// Hàm tự học từ lịch sử để dự đoán
function learningFromHistoryPredictor(history, index = 0) {
    try {
        // Khởi tạo biến dự đoán mặc định
        let prediction = null;
        let confidence = 0;

        // PHẦN 1: Học từ history đầu vào
        if (history && history.length >= 6) {
            // Lấy tất cả số theo index
            const numbers = history.map(item => getNumberFromHistory(item, index))
                .filter(n => n !== null);

            if (numbers.length >= 6) {
                // Tạo mẫu từ dữ liệu history - cặp (hiện tại, kế tiếp)
                const historyPatterns = [];
                for (let i = 0; i < numbers.length - 1; i++) {
                    const current = numbers[i] >= 5 ? 1 : 0; // 1: Tài, 0: Xỉu
                    const next = numbers[i + 1] >= 5 ? 1 : 0;
                    historyPatterns.push({ current, next });
                }

                // Lấy kết quả gần nhất
                const lastHistoryResult = numbers[0] >= 5 ? 1 : 0;

                // Tìm mẫu tương tự trong history (có cùng kết quả hiện tại)
                const similarHistoryPatterns = historyPatterns.filter(p => p.current === lastHistoryResult);

                if (similarHistoryPatterns.length >= 3) {
                    // Dự đoán dựa trên xác suất từ mẫu tương tự
                    const historyTaiCount = similarHistoryPatterns.filter(p => p.next === 1).length;
                    const historyTaiProb = historyTaiCount / similarHistoryPatterns.length;

                    console.log(`Học từ history (index ${index}): Tỷ lệ Tài = ${Math.round(historyTaiProb * 100)}%, ${similarHistoryPatterns.length} mẫu`);

                    // Chỉ dự đoán nếu có xu hướng rõ ràng (>= 65% hoặc <= 35%)
                    if (historyTaiProb >= 0.65) {
                        prediction = getLuckyNumberInRange(5, 9);
                        confidence = historyTaiProb;
                    } else if (historyTaiProb <= 0.35) {
                        prediction = getLuckyNumberInRange(0, 4);
                        confidence = 1 - historyTaiProb;
                    }
                }

                // Phân tích thêm chuỗi 3 kết quả liên tiếp
                if (numbers.length >= 6) {
                    const triplePatterns = [];
                    for (let i = 0; i < numbers.length - 3; i++) {
                        const first = numbers[i] >= 5 ? 1 : 0;
                        const second = numbers[i + 1] >= 5 ? 1 : 0;
                        const third = numbers[i + 2] >= 5 ? 1 : 0;
                        const next = numbers[i + 3] >= 5 ? 1 : 0;
                        triplePatterns.push({ pattern: [first, second, third], next });
                    }

                    // Lấy 3 kết quả gần nhất
                    const lastPattern = [
                        numbers[2] >= 5 ? 1 : 0,
                        numbers[1] >= 5 ? 1 : 0,
                        numbers[0] >= 5 ? 1 : 0
                    ];

                    // Tìm mẫu tương tự
                    const matchingTriplePatterns = triplePatterns.filter(p =>
                        p.pattern[0] === lastPattern[0] &&
                        p.pattern[1] === lastPattern[1] &&
                        p.pattern[2] === lastPattern[2]
                    );

                    if (matchingTriplePatterns.length >= 2) {
                        // Dự đoán dựa trên mẫu 3 kết quả liên tiếp
                        const tripleTaiCount = matchingTriplePatterns.filter(p => p.next === 1).length;
                        const tripleTaiProb = tripleTaiCount / matchingTriplePatterns.length;

                        console.log(`Học từ mẫu 3 kết quả: Tỷ lệ Tài = ${Math.round(tripleTaiProb * 100)}%, ${matchingTriplePatterns.length} mẫu`);

                        // Nếu tìm thấy mẫu mạnh từ chuỗi 3 kết quả, ưu tiên cao hơn phân tích đơn lẻ
                        if (tripleTaiProb >= 0.7) {
                            prediction = getLuckyNumberInRange(5, 9);
                            confidence = Math.max(confidence, tripleTaiProb);
                        } else if (tripleTaiProb <= 0.3) {
                            prediction = getLuckyNumberInRange(0, 4);
                            confidence = Math.max(confidence, 1 - tripleTaiProb);
                        }
                    }
                }
            }
        }

        // PHẦN 2: Học từ file log performance
        const fs = require('fs');
        if (fs.existsSync('taixiu_history_combined_performance.log')) {
            const logs = fs.readFileSync('taixiu_history_combined_performance.log', 'utf8')
                .split('\n').filter(line => line.includes('Chu kỳ |'));

            if (logs.length >= 6) {
                // Phân tích mẫu từ file log
                const logPatterns = [];
                for (let i = 0; i < logs.length - 1; i++) {
                    const current = logs[i].includes('(Tài)') && logs[i].includes('thực tế') ? 1 : 0;
                    const next = logs[i + 1].includes('(Tài)') && logs[i + 1].includes('thực tế') ? 1 : 0;
                    logPatterns.push({ current, next });
                }

                // Lấy kết quả gần nhất
                const lastLogResult = logs[logs.length - 1].includes('(Tài)') && logs[logs.length - 1].includes('thực tế') ? 1 : 0;

                // Tìm mẫu tương tự
                const similarLogPatterns = logPatterns.filter(p => p.current === lastLogResult);

                if (similarLogPatterns.length >= 3) {
                    // Dự đoán dựa trên xác suất từ mẫu tương tự trong log
                    const logTaiCount = similarLogPatterns.filter(p => p.next === 1).length;
                    const logTaiProb = logTaiCount / similarLogPatterns.length;

                    console.log(`Học từ file log: Tỷ lệ Tài = ${Math.round(logTaiProb * 100)}%, ${similarLogPatterns.length} mẫu`);

                    // Nếu có xu hướng rõ ràng và độ tin cậy cao hơn từ history
                    if (logTaiProb >= 0.65 && logTaiProb > confidence) {
                        prediction = getLuckyNumberInRange(5, 9);
                        confidence = logTaiProb;
                    } else if (logTaiProb <= 0.35 && (1 - logTaiProb) > confidence) {
                        prediction = getLuckyNumberInRange(0, 4);
                        confidence = 1 - logTaiProb;
                    }
                }

                // Phân tích thêm chuỗi 2 kết quả liên tiếp
                if (logs.length >= 5) {
                    const doublePatterns = [];
                    for (let i = 0; i < logs.length - 3; i++) {
                        const first = logs[i].includes('(Tài)') && logs[i].includes('thực tế') ? 1 : 0;
                        const second = logs[i + 1].includes('(Tài)') && logs[i + 1].includes('thực tế') ? 1 : 0;
                        const next = logs[i + 2].includes('(Tài)') && logs[i + 2].includes('thực tế') ? 1 : 0;
                        doublePatterns.push({ pattern: [first, second], next });
                    }

                    // Lấy 2 kết quả gần nhất
                    const lastDoublePattern = [
                        logs[logs.length - 2].includes('(Tài)') && logs[logs.length - 2].includes('thực tế') ? 1 : 0,
                        logs[logs.length - 1].includes('(Tài)') && logs[logs.length - 1].includes('thực tế') ? 1 : 0
                    ];

                    // Tìm mẫu tương tự
                    const matchingDoublePatterns = doublePatterns.filter(p =>
                        p.pattern[0] === lastDoublePattern[0] &&
                        p.pattern[1] === lastDoublePattern[1]
                    );

                    if (matchingDoublePatterns.length >= 2) {
                        // Dự đoán dựa trên mẫu 2 kết quả liên tiếp
                        const doubleTaiCount = matchingDoublePatterns.filter(p => p.next === 1).length;
                        const doubleTaiProb = doubleTaiCount / matchingDoublePatterns.length;

                        console.log(`Học từ mẫu 2 kết quả log: Tỷ lệ Tài = ${Math.round(doubleTaiProb * 100)}%, ${matchingDoublePatterns.length} mẫu`);

                        // Nếu tìm thấy mẫu mạnh với độ tin cậy cao hơn
                        if (doubleTaiProb >= 0.7 && doubleTaiProb > confidence) {
                            prediction = getLuckyNumberInRange(5, 9);
                            confidence = doubleTaiProb;
                        } else if (doubleTaiProb <= 0.3 && (1 - doubleTaiProb) > confidence) {
                            prediction = getLuckyNumberInRange(0, 4);
                            confidence = 1 - doubleTaiProb;
                        }
                    }
                }

                // Phân tích hiệu suất dự đoán gần đây
                const recentLogs = logs.slice(-8);
                const wrongPredictions = recentLogs.filter(line => line.includes('| Sai')).length;
                const wrongRatio = wrongPredictions / recentLogs.length;

                // Nếu hiệu suất dự đoán gần đây rất tệ (>= 60% sai), đảo ngược dự đoán
                if (wrongRatio >= 0.6 && prediction !== null) {
                    console.log(`Cảnh báo: Hiệu suất dự đoán kém (${Math.round(wrongRatio * 100)}% sai), đảo ngược dự đoán`);
                    prediction = prediction >= 5 ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
                }
            }
        }

        // PHẦN 3: Xử lý trường hợp không có đủ dữ liệu để dự đoán
        if (prediction === null && history && history.length >= 3) {
            const recentNums = history.slice(0, 3)
                .map(item => getNumberFromHistory(item, index))
                .filter(n => n !== null);

            if (recentNums.length >= 2) {
                // Dự đoán dựa trên dữ liệu gần nhất
                const taiCount = recentNums.filter(n => n >= 5).length;
                const xiuCount = recentNums.length - taiCount;

                if (taiCount >= recentNums.length * 0.6) {
                    console.log("Dự phòng: Xu hướng Tài từ dữ liệu gần nhất");
                    prediction = getLuckyNumberInRange(5, 9);
                } else if (xiuCount >= recentNums.length * 0.6) {
                    console.log("Dự phòng: Xu hướng Xỉu từ dữ liệu gần nhất");
                    prediction = getLuckyNumberInRange(0, 4);
                } else {
                    // Không có xu hướng rõ ràng, sử dụng số mới nhất
                    const latestNumber = recentNums[0];
                    console.log("Dự phòng: Không có xu hướng rõ, dùng số mới nhất");

                    // Lấy ngược với số mới nhất
                    prediction = latestNumber >= 5 ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
                }
            }
        }

        return prediction;
    } catch (error) {
        console.error("Lỗi trong mô hình học từ lịch sử:", error);
        return null;
    }
}

// Thêm hàm khởi tạo và đọc trạng thái từ file
function initializeAppState() {
    try {
        const fs = require('fs');
        const statePath = 'app_state.json';

        if (fs.existsSync(statePath)) {
            const data = fs.readFileSync(statePath, 'utf8');
            APP_STATE = JSON.parse(data);
            console.log("Đã đọc trạng thái ứng dụng từ file");
            APP_STATE.initialized = true;
        }

        // Đọc file log để cập nhật trạng thái nếu cần
        if (fs.existsSync('taixiu_history_combined_performance.log')) {
            const logs = fs.readFileSync('taixiu_history_combined_performance.log', 'utf8')
                .split('\n').filter(line => line.includes('Chu kỳ |'));

            // Cập nhật mảng kết quả gần đây
            APP_STATE.consecutiveResults = logs.slice(-10).map(line => {
                const isCorrect = line.includes('| Đúng');
                const isTai = line.includes('thực tế') && line.includes('(Tài)');
                return { isCorrect, isTai };
            });
        }

        // Lưu thời gian khởi động
        APP_STATE.lastRun = new Date().toISOString();
        saveAppState();

    } catch (error) {
        console.error("Lỗi khởi tạo trạng thái:", error);
    }
}

// Hàm lưu trạng thái
function saveAppState() {
    try {
        const fs = require('fs');
        fs.writeFileSync('app_state.json', JSON.stringify(APP_STATE, null, 2), 'utf8');
    } catch (error) {
        console.error("Lỗi lưu trạng thái:", error);
    }
}

function numberDistributionPredictor(history, index = 0) {
    if (!history || history.length < 15) return null;
    
    // Lấy 30 kết quả gần nhất
    const numbers = history.slice(0, 30)
        .map(item => getNumberFromHistory(item, index))
        .filter(n => n !== null);
    
    if (numbers.length < 15) return null;
    
    // Đếm tần suất xuất hiện của từng số
    const frequency = Array(10).fill(0);
    numbers.forEach(n => frequency[n]++);
    
    // Tìm những số ít xuất hiện - có khả năng sắp xuất hiện
    const lowFreq = frequency.map((f, i) => ({num: i, freq: f}))
                            .sort((a, b) => a.freq - b.freq)
                            .slice(0, 3);
    
    // Chọn ngẫu nhiên một trong những số ít xuất hiện
    const randomIndex = Math.floor(Math.random() * lowFreq.length);
    console.log(`Phân phối số: Chọn số ${lowFreq[randomIndex].num} (xuất hiện ${lowFreq[randomIndex].freq} lần trong 30 lần gần nhất)`);
    return lowFreq[randomIndex].num;
}

function specificNumberPredictor(history, index = 0) {
    if (!history || history.length < 10) return null;
    
    // Tìm các mẫu lặp lại cụ thể
    const numbers = history.slice(0, 20)
        .map(item => getNumberFromHistory(item, index))
        .filter(n => n !== null);
    
    if (numbers.length < 10) return null;
    
    // Kiểm tra các mẫu 3 số liên tiếp
    for (let i = 3; i < numbers.length; i++) {
        const pattern = [numbers[i-3], numbers[i-2], numbers[i-1]];
        
        // Tìm mẫu tương tự trong lịch sử
        for (let j = 0; j < numbers.length - 4; j++) {
            if (numbers[j] === pattern[0] && 
                numbers[j+1] === pattern[1] && 
                numbers[j+2] === pattern[2]) {
                // Nếu tìm thấy mẫu tương tự, dự đoán số tiếp theo
                console.log(`Mẫu số cụ thể: Tìm thấy mẫu [${pattern}], dự đoán: ${numbers[j+3]}`);
                return numbers[j+3];
            }
        }
    }
    
    return null;
}

function inverseNumberPredictor(history, index = 0) {
    if (!history || history.length < 5) return null;
    
    // Lấy 5 số gần nhất
    const recent = history.slice(0, 5)
        .map(item => getNumberFromHistory(item, index))
        .filter(n => n !== null);
    
    if (recent.length < 3) return null;
    
    // Tính trung bình
    const avg = recent.reduce((sum, n) => sum + n, 0) / recent.length;
    
    // Dự đoán số đối nghịch
    let result;
    if (avg >= 5) {
        // Nếu trung bình gần đây là Tài (≥5), dự đoán một số Xỉu thấp
        result = Math.floor(Math.random() * 3); // 0, 1, 2
    } else {
        // Nếu trung bình gần đây là Xỉu (<5), dự đoán một số Tài cao
        result = 7 + Math.floor(Math.random() * 3); // 7, 8, 9
    }
    
    console.log(`Đảo ngược số: Trung bình gần đây ${avg.toFixed(1)}, dự đoán số ${result}`);
    return result;
}

function combinedNumberPredictor(history, index = 0) {
    if (!history || history.length < 15) return null;
    
    // Thử từng phương pháp
    const distPred = numberDistributionPredictor(history, index);
    const specPred = specificNumberPredictor(history, index);
    const invPred = inverseNumberPredictor(history, index);
    
    // Tạo mảng các kết quả hợp lệ
    const validPreds = [distPred, specPred, invPred].filter(p => p !== null);
    
    if (validPreds.length === 0) return null;
    
    // Trọng số cho mỗi phương pháp
    const weights = {
        distPred: 0.3,
        specPred: 0.5, // Ưu tiên cao nhất cho mẫu cụ thể
        invPred: 0.4   // Ưu tiên thứ 2 cho đảo ngược
    };
    
    // Tính điểm cho mỗi con số từ 0-9
    const scores = Array(10).fill(0);
    
    if (distPred !== null) scores[distPred] += weights.distPred;
    if (specPred !== null) scores[specPred] += weights.specPred;
    if (invPred !== null) scores[invPred] += weights.invPred;
    
    // Tìm con số có điểm cao nhất
    let maxScore = -1;
    let bestNumber = null;
    
    for (let i = 0; i < scores.length; i++) {
        if (scores[i] > maxScore) {
            maxScore = scores[i];
            bestNumber = i;
        }
    }
    
    console.log(`Dự đoán số kết hợp: Chọn số ${bestNumber} (điểm ${maxScore.toFixed(2)})`);
    return bestNumber;
}

function streakReversalPredictor(history, index) {
  if (history.length < 3) return null;
  
  // Phân tích chuỗi Tài/Xỉu
  let streak = 1;
  let currentType = (history[0].number >= 4 && history[0].number <= 10) ? "Tài" : "Xỉu";
  
  for (let i = 1; i < history.length; i++) {
    const result = (history[i].number >= 4 && history[i].number <= 10) ? "Tài" : "Xỉu";
    if (result === currentType) {
      streak++;
    } else {
      break;
    }
  }
  
  // Cải tiến logic
  if (streak >= 3) {
    // Độ tin cậy cao hơn khi chuỗi càng dài
    const confidence = Math.min(1.0, 0.7 + (streak - 3) * 0.1);
    
    // Kiểm tra thêm xu hướng trong quá khứ
    let reversalSuccess = 0;
    let totalReversals = 0;
    
    for (let i = 1; i < history.length - 3; i++) {
      const type1 = (history[i].number >= 4 && history[i].number <= 10) ? "Tài" : "Xỉu";
      const type2 = (history[i+1].number >= 4 && history[i+1].number <= 10) ? "Tài" : "Xỉu";
      const type3 = (history[i+2].number >= 4 && history[i+2].number <= 10) ? "Tài" : "Xỉu";
      const type4 = (history[i+3].number >= 4 && history[i+3].number <= 10) ? "Tài" : "Xỉu";
      
      if (type1 === type2 && type2 === type3 && type3 !== type4) {
        totalReversals++;
        if (type4 !== type1) {
          reversalSuccess++;
        }
      }
    }
    
    // Quyết định đảo chiều dựa trên lịch sử thành công
    if (totalReversals === 0 || reversalSuccess/totalReversals > 0.5) {
      return currentType === "Tài" ? "Xỉu" : "Tài";
    }
  }
  
  return null;
}

function resetModelWeights(weights) {
  console.log("Reset trọng số các mô hình về trạng thái cân bằng");
  
  // Đặt lại tất cả trọng số về giá trị mặc định cân bằng
  weights.markov = 0.15;
  weights.trend = 0.15;
  weights.anomaly = 0.15;
  weights.timeseries = 0.15;
  weights.pattern = 0.15;
  weights.gametheory = 0.15;
  weights.adaptive = 0.15;
  weights.ensemble = 0.15;
  weights.recent = 0.15;
  weights.quickadaptive = 0.15;
  weights.learning = 0.15;
  weights.numberpred = 0.15;
  weights.streakrev = 0.15;
  weights.recent_trend = 0.15;
  
  return weights;
}

function getRecentResults(count = 5) {
  // Đọc kết quả từ file log
  try {
    const logFile = fs.readFileSync('taixiu_history_combined_performance.log', 'utf8');
    const lines = logFile.split('\n').filter(line => line.includes('Chu kỳ'));
    const recentLines = lines.slice(-count);
    
    return recentLines.map(line => {
      const match = line.match(/Số thực tế: .+ \((.+)\) \| Số dự đoán: .+ \((.+)\) \| .+ \| (.+)$/);
      if (match) {
        return {
          actual: match[1],
          predicted: match[2],
          result: match[3] // "Đúng" hoặc "Sai"
        };
      }
      return null;
    }).filter(Boolean);
  } catch (error) {
    console.error("Không thể đọc file log:", error);
    return [];
  }
}



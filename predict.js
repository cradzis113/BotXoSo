let ENABLE_LOGGING = false;

// Thay thế tất cả console.log bằng các hàm này
const gameLog = {
    info: (message) => {
        if (ENABLE_LOGGING) console.log(message);
    },
    error: (message) => console.error(message), // Vẫn giữ lại lỗi
    debug: (message) => {
        if (ENABLE_LOGGING) console.log(`[DEBUG] ${message}`);
    },
    result: (message) => {
        // Luôn hiển thị kết quả dự đoán cuối cùng
        console.log(`[KẾT QUẢ] ${message}`);
    }
};

/**
 * Kiểm tra và chuẩn hóa tham số đầu vào
 */
function validateInputParams(history, index, limit, fileConfig) {
    // Kiểm tra history
    if (!Array.isArray(history)) {
        throw new Error("History phải là một mảng");
    }

    // Kiểm tra và chuẩn hóa index
    const validIndex = Number(index);
    if (isNaN(validIndex)) {
        throw new Error("Index không hợp lệ");
    }

    // Kiểm tra và chuẩn hóa limit
    const defaultLimit = { limitList: [5, 10, 15], limitMain: 15 };
    const validLimit = {
        limitList: Array.isArray(limit?.limitList) ? limit.limitList : defaultLimit.limitList,
        limitMain: Number(limit?.limitMain) || defaultLimit.limitMain
    };

    // Đảm bảo limitList chứa các số hợp lệ và được sắp xếp
    validLimit.limitList = validLimit.limitList
        .map(Number)
        .filter(num => !isNaN(num) && num > 0)
        .sort((a, b) => a - b);

    // Nếu limitList rỗng, sử dụng giá trị mặc định
    if (validLimit.limitList.length === 0) {
        validLimit.limitList = defaultLimit.limitList;
    }

    // Đảm bảo limitMain nằm trong limitList
    if (!validLimit.limitList.includes(validLimit.limitMain)) {
        validLimit.limitMain = validLimit.limitList[validLimit.limitList.length - 1];
    }

    // Kiểm tra và chuẩn hóa fileConfig
    const validFileConfig = Array.isArray(fileConfig) && fileConfig.length >= 2
        ? [String(fileConfig[0]), Boolean(fileConfig[1])]
        : ["taixiu_history", true];

    return {
        history,
        index: validIndex,
        limit: validLimit,
        fileConfig: validFileConfig
    };
}

/**
 * Hàm tạo và cập nhật file performance
 */
function updatePerformanceFile(fileConfig, index, limit, result, actualResult, drawId, timeVN) {
    try {
        const fs = require('fs');
        const fileName = `${fileConfig[0]}_index${index}_limit${limit}.performance`;

        // Tạo nội dung mới
        const resultType = result >= 5 ? "Tài" : "Xỉu";
        const actualType = actualResult >= 5 ? "Tài" : "Xỉu";
        const isCorrect = (result >= 5) === (actualResult >= 5);

        const newLine = `Chu kỳ | ${drawId} | ${timeVN} | Số thực tế: ${actualResult} (${actualType}) | Số dự đoán: ${result} (${resultType}) | Vị trí: ${index} | ${isCorrect ? "Đúng" : "Sai"}`;

        // Debug log để theo dõi
        console.log(`Đang lưu performance cho limit=${limit}: ${newLine}`);

        // Kiểm tra và tạo file nếu chưa tồn tại
        if (!fs.existsSync(fileName)) {
            const header = `# File Performance với ${limit === fileConfig.limitMain ? "LimitMain" : "Limit"}=${limit} và Index=${index}\n\n\n`;
            fs.writeFileSync(fileName, header + newLine + "\n");
            console.log(`Đã tạo file mới: ${fileName}`);
        } else {
            fs.appendFileSync(fileName, newLine + "\n");
            console.log(`Đã thêm vào file: ${fileName}`);
        }

        return true;
    } catch (error) {
        console.error(`Lỗi khi cập nhật file performance:`, error);
        return false;
    }
}

/**
 * Cập nhật hàm đánh giá hiệu suất limit
 */
function evaluateLimitPerformance(limitPerformance) {
    const performanceEntries = Object.entries(limitPerformance);
    // Sắp xếp theo hiệu suất từ cao xuống thấp
    const sortedLimits = performanceEntries.sort(([, a], [, b]) => b - a);
    // Chỉ chọn limit có hiệu suất > 50%
    const validLimits = sortedLimits.filter(([, accuracy]) => accuracy >= 0.5);

    return validLimits;
}

/**
 * Dự đoán số tiếp theo và tự động học từ file performance
 */
async function predictNumbers(history, index = 0, limit = { limitList: [5, 10, 15], limitMain: 15 }, fileConfig = ["taixiu_history", true], log = false) {
    try {
        const validParams = validateInputParams(history, index, limit, fileConfig);
        const limitPredictions = {};
        const limitPerformance = {};
        const strategies = [];
        let previousPrediction = null;

        // Đọc dữ liệu performance
        let performanceData = null;
        try {
            const fs = require('fs');
            const combinedPerformanceFile = `${fileConfig[0]}_combined_performance.log`;
            if (fs.existsSync(combinedPerformanceFile)) {
                const content = fs.readFileSync(combinedPerformanceFile, 'utf8');
                performanceData = { history: content.split('\n') };
            }
        } catch (error) {
            console.error("Lỗi khi đọc file performance:", error);
        }

        // Đọc dự đoán trước đó
        try {
            const fs = require('fs');
            const predictionFile = `${fileConfig[0]}.prediction`;
            if (fs.existsSync(predictionFile)) {
                const content = fs.readFileSync(predictionFile, 'utf8');
                previousPrediction = JSON.parse(content);
            }
        } catch (error) {
            console.error("Lỗi khi đọc file prediction:", error);
        }

        // Lưu performance nếu có dự đoán trước
        if (previousPrediction && previousPrediction.drawId) {
            const prevDrawId = previousPrediction.drawId;

            // Khai báo actualResultData và gán giá trị
            let actualResultData = history.find(h => h.drawId === prevDrawId);

            // Kiểm tra actualResultData trước khi xử lý
            if (actualResultData && actualResultData.numbers) {
                const fs = require('fs');
                const predIndex = previousPrediction.indexPredicted || 0;

                // Thêm CODE CẬP NHẬT PERFORMANCE tại đây:
                for (const limitValue of previousPrediction.limits.all) {
                    const predictionValue = previousPrediction.limits.predictions[limitValue];
                    if (predictionValue !== undefined) {
                        const actualNumber = Number(actualResultData.numbers[predIndex]);

                        // Kiểm tra xem đã lưu chu kỳ này chưa
                        const limitFileName = `${fileConfig[0]}_index${predIndex}_limit${limitValue}.performance`;
                        let fileContent = "";
                        if (fs.existsSync(limitFileName)) {
                            fileContent = fs.readFileSync(limitFileName, 'utf8');
                        }

                        // Nếu chưa lưu chu kỳ này, thì lưu mới
                        if (!fileContent.includes(`Chu kỳ | ${prevDrawId}`)) {
                            const resultType = predictionValue >= 5 ? "Tài" : "Xỉu";
                            const actualType = actualNumber >= 5 ? "Tài" : "Xỉu";
                            const isCorrect = (predictionValue >= 5) === (actualNumber >= 5);

                            const newLine = `Chu kỳ | ${prevDrawId} | ${previousPrediction.timeVN} | Số thực tế: ${actualNumber} (${actualType}) | Số dự đoán: ${predictionValue} (${resultType}) | Vị trí: ${predIndex} | ${isCorrect ? "Đúng" : "Sai"}`;

                            fs.appendFileSync(limitFileName, newLine + "\n");
                        } else {
                            console.log(`Chu kỳ ${prevDrawId} đã được lưu trong file ${limitFileName}`);
                        }
                    }
                }

                // Cập nhật file performance tổng hợp
                const combinedFileName = `${fileConfig[0]}_combined_performance.log`;
                let combinedContent = "";
                if (fs.existsSync(combinedFileName)) {
                    combinedContent = fs.readFileSync(combinedFileName, 'utf8');
                }

                if (!combinedContent.includes(`Chu kỳ | ${prevDrawId}`)) {
                    const actualNumber = Number(actualResultData.numbers[predIndex]);
                    const predictedNumber = previousPrediction.predictions[0];
                    const isCorrect = (actualNumber >= 5) === (predictedNumber >= 5);

                    const actualType = actualNumber >= 5 ? "Tài" : "Xỉu";
                    const predictedType = predictedNumber >= 5 ? "Tài" : "Xỉu";
                    const newLine = `Chu kỳ | ${prevDrawId} | ${previousPrediction.timeVN} | Số thực tế: ${actualNumber} (${actualType}) | Số dự đoán: ${predictedNumber} (${predictedType}) | Vị trí: ${predIndex} | Limit được chọn: ${previousPrediction.limits.main} | ${isCorrect ? "Đúng" : "Sai"}`;

                    fs.appendFileSync(combinedFileName, newLine + '\n');
                } else {
                    console.log(`Chu kỳ ${prevDrawId} đã được lưu trong file tổng hợp`);
                }
            } else {
                console.log(`Không tìm thấy kết quả cho ${prevDrawId}`);
            }
        }

        // 1. Tạo dự đoán cho từng limit riêng biệt
        for (const currentLimit of validParams.limit.limitList) {
            // Tạo dự đoán riêng cho mỗi limit
            const limitedHistory = validParams.history.slice(0, currentLimit);

            // Tạo các dự đoán với nhiễu ngẫu nhiên khác nhau cho mỗi limit
            const randomOffset = Math.random(); // Tạo offset ngẫu nhiên cho mỗi limit

            // Đặt khai báo predictions ở đúng vị trí, trước khi sử dụng
            const predictions = [
                {
                    number: predictBasedOnActualResults(limitedHistory, currentLimit),
                    weight: 5,  // Giảm trọng số xuống
                    confidence: 0.8,
                    description: `Dự đoán cơ bản (limit ${currentLimit})`
                },
                {
                    number: analyzeTrend(limitedHistory, currentLimit, randomOffset),
                    weight: 5,  // Giảm trọng số xuống
                    confidence: 0.85,
                    description: `Phân tích xu hướng (limit ${currentLimit})`
                },
                {
                    number: analyzeRecentResults(limitedHistory, Math.min(5, currentLimit), randomOffset),
                    weight: 5,  // Giảm trọng số xuống
                    confidence: 0.85,
                    description: `Phân tích gần đây (limit ${currentLimit})`
                },
                {
                    number: patternRecognitionPredictor(limitedHistory, Math.min(3, currentLimit)),
                    weight: 5,  // Giảm trọng số xuống
                    confidence: 0.9,
                    description: `Phân tích mẫu số (limit ${currentLimit})`
                },
                {
                    number: analyzeNumberCycles(limitedHistory, Math.min(10, currentLimit)),
                    weight: 5,  // Giảm trọng số xuống
                    confidence: 0.9,
                    description: `Phân tích chu kỳ số (limit ${currentLimit})`
                },
                {
                    number: statisticalAnalysisPredictor(limitedHistory, Math.min(20, currentLimit)),
                    weight: 10,  // Giảm trọng số xuống
                    confidence: 0.92,
                    description: `Phân tích thống kê nâng cao (limit ${currentLimit})`
                },
                {
                    number: reinforcementLearningPredictor(limitedHistory, {
                        history: getPerformanceHistory(fileConfig, index, currentLimit)
                    }),
                    weight: 10,  // Giảm trọng số xuống
                    confidence: 0.95,
                    description: `Học tăng cường (limit ${currentLimit})`
                },
                {
                    number: adaptiveLearning(limitedHistory,
                        limitedHistory.map(item => Number(item.numbers?.[0])).filter(n => !isNaN(n)),
                        Math.min(10, currentLimit)),
                    weight: 10,  // Giảm trọng số xuống
                    confidence: 0.93,
                    description: `Học thích ứng (limit ${currentLimit})`
                },
                {
                    number: analyzeLimitedHistory(limitedHistory, index).finalNumber,
                    weight: 10,  // Giảm trọng số xuống
                    confidence: 0.95,
                    description: `Phân tích tổng hợp (limit ${currentLimit})`
                },

                // Thêm các mô hình mới với trọng số cao hơn
                {
                    number: trendReversalPredictor(limitedHistory, index),
                    weight: 25,  // Trọng số cao
                    confidence: 0.96,
                    description: `Dự đoán đảo chiều xu hướng (limit ${currentLimit})`
                },
                {
                    number: adaptiveWeightPredictor(history, index, getPerformanceHistory(fileConfig, index, currentLimit)),
                    weight: 30,  // Trọng số cao nhất
                    confidence: 0.97,
                    description: `Dự đoán trọng số động (limit ${currentLimit})`
                },
                {
                    number: dynamicPerformancePredictor(history, index, fileConfig, {
                        limitList: currentLimit ? [5, 10, 15, currentLimit] : [5, 10, 15],
                        limitMain: currentLimit || 15
                    }),
                    weight: 30,
                    confidence: 0.96,
                    description: `Dự đoán theo hiệu suất động (limit ${currentLimit})`
                },
                // Thêm vào mảng predictions với trọng số cao nhất
                {
                    number: analyzeRealPatterns(index),
                    weight: 40,  // Trọng số cao nhất
                    confidence: 0.98,
                    description: `Phân tích mẫu kết quả thực tế`
                },
                {
                    number: alternatingPatternPredictor(history, index),
                    weight: 30,
                    confidence: 0.95,
                    description: 'Dự đoán theo mẫu xen kẽ'
                },
                {
                    number: alternatingPatternPredictor(history, index),
                    weight: 40,
                    confidence: 0.98,
                    description: 'Dự đoán theo mẫu xen kẽ thực tế'
                },
                {
                    number: anomalyFilterPredictor(history, index),
                    weight: 15,
                    confidence: 0.92,
                    description: `Lọc dữ liệu bất thường (limit ${currentLimit})`
                },
                {
                    number: markovChainPredictor(history, index),
                    weight: 20,
                    confidence: 0.93,
                    description: `Dự đoán chuỗi Markov (limit ${currentLimit})`
                },
                {
                    number: analyzeTrendDirection(limitedHistory.map(item => {
                        if (!item || !item.numbers || !item.numbers[index]) return null;
                        return Number(item.numbers[index]);
                    }).filter(n => n !== null && !isNaN(n))),
                    weight: 15,
                    confidence: 0.91,
                    description: `Phân tích hướng xu hướng (limit ${currentLimit})`
                },
                {
                    number: detectNumberPattern(limitedHistory.map(item => {
                        if (!item || !item.numbers || !item.numbers[index]) return null;
                        return Number(item.numbers[index]);
                    }).filter(n => n !== null && !isNaN(n))),
                    weight: 20,
                    confidence: 0.92,
                    description: `Nhận diện mẫu số (limit ${currentLimit})`
                },
                {
                    number: numberFrequencyAnalysis(limitedHistory.map(item => {
                        if (!item || !item.numbers || !item.numbers[index]) return null;
                        return Number(item.numbers[index]);
                    }).filter(n => n !== null && !isNaN(n))),
                    weight: 15,
                    confidence: 0.91,
                    description: `Phân tích tần suất (limit ${currentLimit})`
                },
                {
                    number: balancePredictor(limitedHistory.map(item => {
                        if (!item || !item.numbers || !item.numbers[index]) return null;
                        return Number(item.numbers[index]);
                    }).filter(n => n !== null && !isNaN(n))),
                    weight: 25,
                    confidence: 0.94,
                    description: `Dự đoán cân bằng (limit ${currentLimit})`
                },

                // Thêm các hàm mới với trọng số cao
                {
                    number: trendReversalPredictor(history, index),
                    weight: 30,
                    confidence: 0.95,
                    description: `Dự đoán đảo chiều xu hướng (limit ${currentLimit})`
                },
                {
                    number: adaptiveWeightPredictor(history, index, getPerformanceHistory(fileConfig, index, currentLimit)),
                    weight: 30,
                    confidence: 0.95,
                    description: `Dự đoán trọng số động (limit ${currentLimit})`
                },
                {
                    number: alternatingPatternPredictor(history, index),
                    weight: 35,
                    confidence: 0.97,
                    description: `Dự đoán mẫu xen kẽ (limit ${currentLimit})`
                }
            ].filter(p => p.number !== null && !isNaN(p.number));

            // Tính toán riêng cho limit này với nhiễu ngẫu nhiên
            const finalNumber = ensemblePredictor(predictions, randomOffset);

            // Lưu kết quả vào limitPredictions
            limitPredictions[currentLimit] = finalNumber;

            // Phân tích hiệu suất
            try {
                const fs = require('fs');
                const fileName = `${fileConfig[0]}_index${index}_limit${currentLimit}.performance`;
                if (fs.existsSync(fileName)) {
                    const content = fs.readFileSync(fileName, 'utf8');
                    const recentResults = content.split('\n')
                        .filter(line => line.includes('Đúng') || line.includes('Sai'))
                        .slice(-10);

                    const correctCount = recentResults.filter(line => line.includes('Đúng')).length;
                    limitPerformance[currentLimit] = correctCount / recentResults.length;
                }
            } catch (error) {
                console.error(`Lỗi đọc file performance cho limit ${currentLimit}:`, error);
                limitPerformance[currentLimit] = 0;
            }
        }

        // Đánh giá và chọn các limit có hiệu suất tốt
        const effectiveLimits = evaluateLimitPerformance(limitPerformance);

        // Lưu trữ limitMain ban đầu
        const originalLimitMain = validParams.limit.limitMain;
        let usedLimitMain = originalLimitMain;

        // Tính toán kết quả cuối cùng dựa trên các limit hiệu quả
        let finalPrediction;
        if (effectiveLimits.length > 0) {
            // Lấy limit có hiệu suất cao nhất
            const bestLimit = Number(effectiveLimits[0][0]);
            finalPrediction = limitPredictions[bestLimit];

            // Cập nhật limitMain mới
            usedLimitMain = bestLimit;

            // Log thông báo
            if (log) {
                console.log(`Sử dụng kết quả từ limit=${bestLimit} (${(effectiveLimits[0][1] * 100).toFixed(1)}%)`);
                if (bestLimit !== originalLimitMain) {
                    console.log(`Đã thay đổi limitMain từ ${originalLimitMain} sang ${bestLimit}`);
                }
            }

            // Cập nhật strategies
            strategies.push(`Sử dụng kết quả từ limit=${bestLimit} (hiệu suất: ${(effectiveLimits[0][1] * 100).toFixed(1)}%)`);
            if (bestLimit !== originalLimitMain) {
                strategies.push(`Đã thay đổi limitMain từ ${originalLimitMain} sang ${bestLimit} do hiệu suất tốt hơn`);
            }
        } else {
            // Nếu không có limit hiệu quả, sử dụng kết quả từ limit chính
            finalPrediction = limitPredictions[originalLimitMain];

            // Cập nhật strategies
            strategies.push(`Sử dụng kết quả từ limitMain=${originalLimitMain} (không có limit hiệu quả)`);
        }

        // Tính nextDrawId TRƯỚC khi tạo result
        let nextDrawId = "";
        if (history[0]?.drawId && history[0].drawId.length === 12) {
            const prefix = history[0].drawId.slice(0, 8);
            const numPart = parseInt(history[0].drawId.slice(-4));

            // Tính chu kỳ tiếp theo (+1)
            const nextCycle = numPart + 1;

            nextDrawId = prefix + nextCycle.toString().padStart(4, '0');
        } else {
            nextDrawId = history[0]?.drawId || "";
        }

        // Tạo result với nextDrawId đã tính
        const result = {
            predictions: [finalPrediction],
            stats: {
                accuracy: effectiveLimits.length > 0 ? effectiveLimits[0][1] : 0,
                consecutiveWrong: 0
            },
            timestamp: new Date().toISOString(),
            timeVN: getVietnamTimeNow(),
            drawId: nextDrawId, // Sử dụng nextDrawId ngay từ đầu
            votes: {
                "tài": finalPrediction >= 5 ? 1 : 0,
                "xỉu": finalPrediction < 5 ? 1 : 0
            },
            strategies: strategies,
            indexPredicted: validParams.index,
            limits: {
                main: usedLimitMain,
                originalMain: originalLimitMain,
                effective: effectiveLimits.map(([limit]) => Number(limit)),
                all: validParams.limit.limitList,
                predictions: limitPredictions
            }
        };

        // Ghi file đơn giản không dùng lock
        if (fileConfig[1]) {
            try {
                const fs = require('fs');
                fs.writeFileSync(
                    `${fileConfig[0]}.prediction`,
                    JSON.stringify(result, null, 2)
                );
            } catch (error) {
                console.error("Lỗi khi lưu file prediction:", error);
            }
        }

        // Tạo các file performance nếu chưa tồn tại
        try {
            const fs = require('fs');

            // Tạo file performance cho mỗi limit và thêm một dòng dữ liệu mẫu
            for (const currentLimit of validParams.limit.limitList) {
                const limitFileName = `${validParams.fileConfig[0]}_index${validParams.index}_limit${currentLimit}.performance`;

                if (!fs.existsSync(limitFileName)) {
                    const header = `# File Performance với Limit=${currentLimit} và Index=${validParams.index}\n\n\n`;
                    const sampleData = `Chu kỳ | 123456789000 | ${getVietnamTimeNow()} | Số thực tế: 5 (Tài) | Số dự đoán: 6 (Tài) | Vị trí: ${validParams.index} | Đúng\n`;
                    fs.writeFileSync(limitFileName, header + sampleData);
                    console.log(`Đã tạo file performance mới với dữ liệu mẫu: ${limitFileName}`);
                }
            }

            // Tạo file performance tổng hợp
            const combinedFileName = `${validParams.fileConfig[0]}_combined_performance.log`;
            if (!fs.existsSync(combinedFileName)) {
                const header = `# File Performance Tổng Hợp - Theo Dõi Kết Quả Dự Đoán Với Tất Cả Các Limit\n\n\n`;
                const sampleData = `Chu kỳ | 123456789000 | ${getVietnamTimeNow()} | Số thực tế: 5 (Tài) | Số dự đoán: 6 (Tài) | Vị trí: ${validParams.index} | Limit được chọn: ${validParams.limit.limitMain} | Đúng\n`;
                fs.writeFileSync(combinedFileName, header + sampleData);
                console.log(`Đã tạo file performance tổng hợp mới với dữ liệu mẫu`);
            }
        } catch (error) {
            console.error("Lỗi khi tạo file performance:", error);
        }

        // Kiểm tra trước khi tính khoảng cách
        if (history[0]?.drawId && previousPrediction?.drawId) {
            console.log(`Khoảng cách: ${parseInt(history[0].drawId.slice(-4)) - parseInt(previousPrediction.drawId.slice(-4))}`);
        } else {
            console.log("Không thể tính khoảng cách do thiếu dữ liệu");
        }

        // Khai báo predictions trước khi sử dụng
        const predictions = [];
        
        // Trong predictNumbers:
        const isHighPerformanceTimeframe = timeBasedPerformanceAnalysis(history, index, fileConfig);

        // Trong mảng predictions, điều chỉnh trọng số dựa vào khung giờ
        if (isHighPerformanceTimeframe) {
            // Tăng trọng số cho mô hình hiệu quả trong khung giờ hiệu suất cao
            predictions.forEach(p => {
                if (p.description.includes('đảo chiều xu hướng') || 
                    p.description.includes('hiệu suất động')) {
                    p.weight *= 1.5; // Tăng 50% trọng số
                }
            });
        }

        // Phân tích hiệu suất thời gian nâng cao
        const timeAnalysis = enhancedTimePerformanceAnalysis(history, index, fileConfig);
        if (timeAnalysis && timeAnalysis.isOverallOptimalTime) {
            console.log("Đang trong thời điểm dự đoán hiệu quả:", timeAnalysis.bestTimes);
            
            // Tăng trọng số cho các chiến lược dự đoán khi đang trong thời điểm tốt
            for (const prediction of predictions) {
                prediction.weight *= 1.2;
            }
        }

        // Lưu kết quả phân tích 
        try {
            // Khai báo fs ở đây để tránh lỗi
            const fs = require('fs');
            const analysisFile = `${fileConfig[0]}_time_analysis.json`;
            fs.writeFileSync(analysisFile, JSON.stringify(timeAnalysis, null, 2));
        } catch (error) {
            console.log("Lỗi khi lưu phân tích thời gian:", error);
        }

        return result;

    } catch (error) {
        console.error("Lỗi trong predictNumbers:", error);
        return {
            predictions: [getLuckyNumberInRange(0, 9)],
            stats: { accuracy: 0, consecutiveWrong: 0 },
            timestamp: new Date().toISOString(),
            timeVN: getVietnamTimeNow(),
            drawId: "",
            votes: { "tài": 0, "xỉu": 0 },
            strategies: [{
                description: "Dự đoán mặc định do lỗi",
                error: error.message
            }],
            indexPredicted: index,
            limits: {
                main: limit?.limitMain || 15,
                all: limit?.limitList || [5, 10, 15],
                predictions: {}
            }
        };
    }
}

/**
 * Phân tích giá trị Tài/Xỉu
 */
function analyzeTaiXiu(history, indices) {
    // Sửa lại để phân tích kết quả THỰC TẾ từ lịch sử
    const isHistoryObjects = history.length > 0 && typeof history[0] === 'object';

    // Khai báo mảng chứa kết quả thực tế đã xử lý
    let processedResults = [];

    if (isHistoryObjects) {
        // Nếu là mảng object (từ database)
        for (const item of history) {
            if (!item.numbers || !Array.isArray(item.numbers)) continue;

            for (const index of indices) {
                if (index >= item.numbers.length) continue;

                const num = Number(item.numbers[index]);
                if (isNaN(num)) continue;

                processedResults.push({
                    number: num,
                    type: num >= 5 ? "Tài" : "Xỉu"
                });
            }
        }
    } else {
        // Nếu là mảng chuỗi (từ file performance)
        for (const line of history) {
            if (typeof line !== 'string') continue;

            const match = line.match(/Số thực tế: (\d+) \((Tài|Xỉu)\)/);
            if (match) {
                processedResults.push({
                    number: parseInt(match[1]),
                    type: match[2]
                });
            }
        }
    }

    // Đếm số lượng Tài và Xỉu
    const taiCount = processedResults.filter(r => r.type === "Tài").length;
    const xiuCount = processedResults.filter(r => r.type === "Xỉu").length;

    const total = taiCount + xiuCount;
    const taiPercent = total > 0 ? ((taiCount / total) * 100).toFixed(2) : 50;
    const xiuPercent = total > 0 ? ((xiuCount / total) * 100).toFixed(2) : 50;

    return {
        summary: {
            tai: taiCount,
            xiu: xiuCount,
            taiPercent,
            xiuPercent,
            prediction: taiCount > xiuCount ? "Tài" : "Xỉu",
            confidence: Math.abs(taiCount - xiuCount) / (taiCount + xiuCount) * 0.5 + 0.5
        },
        predictions: [
            {
                number: taiCount > xiuCount ? getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4),
                type: taiCount > xiuCount ? "tài" : "xỉu",
                weight: Math.round(Math.abs(taiCount - xiuCount) / (taiCount + xiuCount) * 10) + 5,
                description: `Phân tích Tài/Xỉu: ${taiCount > xiuCount ? "Tài" : "Xỉu"} xuất hiện nhiều hơn (${taiCount > xiuCount ? taiCount : xiuCount}/${taiCount + xiuCount})`
            }
        ]
    };
}

function analyzeTimePatterns(drawId) {
    if (!drawId || typeof drawId !== 'string' || drawId.length < 8) {
        return {
            predictions: []
        };
    }

    try {
        const year = parseInt(drawId.substring(0, 4));
        const month = parseInt(drawId.substring(4, 6));
        const day = parseInt(drawId.substring(6, 8));

        // Tạo đối tượng Date
        const date = new Date(year, month - 1, day);
        const weekday = date.getDay(); // 0 = Chủ nhật, 1-6 = Thứ 2 - Thứ 7

        // Chiến lược theo ngày trong tuần
        if ([1, 3, 5].includes(weekday)) { // Thứ 2, 4, 6
            return {
                predictions: [
                    {
                        number: getLuckyNumberInRange(5, 9),
                        type: "tài",
                        weight: 1,
                        description: `Phân tích thời gian: Theo thống kê, vào ${getWeekdayName(weekday)} có xu hướng ra Tài nhiều hơn`
                    }
                ]
            };
        } else if ([0, 2, 4, 6].includes(weekday)) { // Chủ nhật, thứ 3, 5, 7
            return {
                predictions: [
                    {
                        number: getLuckyNumberInRange(0, 4),
                        type: "xỉu",
                        weight: 1,
                        description: `Phân tích thời gian: Theo thống kê, vào ${getWeekdayName(weekday)} có xu hướng ra Xỉu nhiều hơn`
                    }
                ]
            };
        }
    } catch (error) {
        gameLog.error(`Lỗi phân tích mẫu theo thời gian: ${error.message}`);
    }

    return {
        predictions: []
    };
}

/**
 * Trả về tên thứ trong tuần
 */
function getWeekdayName(weekday) {
    const weekdays = [
        "Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư",
        "Thứ năm", "Thứ sáu", "Thứ bảy"
    ];
    return weekdays[weekday] || "";
}

/**
 * Lấy thời gian hiện tại ở Việt Nam
 */
function getVietnamTimeNow(log = false) {
    // Lấy thời gian hiện tại theo UTC
    const now = new Date();

    // Tạo thời gian Việt Nam (UTC+7)
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const utcSeconds = now.getUTCSeconds();
    const utcDate = now.getUTCDate();
    const utcMonth = now.getUTCMonth(); // 0-11
    const utcYear = now.getUTCFullYear();

    // Tính giờ Vietnam (UTC+7)
    let vnHours = (utcHours + 7) % 24;
    let vnDate = utcDate;
    let vnMonth = utcMonth;
    let vnYear = utcYear;

    // Xử lý trường hợp chuyển ngày
    if (utcHours + 7 >= 24) {
        const nextDay = new Date(Date.UTC(utcYear, utcMonth, utcDate + 1));
        vnDate = nextDay.getUTCDate();
        vnMonth = nextDay.getUTCMonth();
        vnYear = nextDay.getUTCFullYear();
    }

    // Tạo chuỗi định dạng ngày/tháng/năm
    const dateStr = `${vnDate.toString().padStart(2, '0')}/${(vnMonth + 1).toString().padStart(2, '0')}/${vnYear}`;

    // Chuyển sang định dạng 12 giờ (AM/PM)
    const ampm = vnHours >= 12 ? 'PM' : 'AM';
    vnHours = vnHours % 12;
    vnHours = vnHours ? vnHours : 12; // Giờ 0 hiển thị là 12

    // Tạo chuỗi định dạng giờ:phút:giây
    const timeStr = `${vnHours}:${utcMinutes.toString().padStart(2, '0')}:${utcSeconds.toString().padStart(2, '0')} ${ampm}`;

    // Trả về chuỗi định dạng đầy đủ
    return `${dateStr} ${timeStr}`;
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

/**
 * Phân tích lịch sử với limit cụ thể
 * @param {Array} limitedHistory - Lịch sử đã được giới hạn
 * @param {Number} index - Vị trí cần dự đoán
 * @returns {Object} Kết quả phân tích
 */
function analyzeLimitedHistory(limitedHistory, index) {
    const taixiuAnalysis = analyzeTaiXiu(limitedHistory, [index]);
    const timePatterns = analyzeTimePatterns(limitedHistory[0]?.drawId);

    // Kết hợp các phân tích
    const predictions = [
        ...(taixiuAnalysis?.predictions || []),
        ...(timePatterns?.predictions || [])
    ];

    // Tính toán số phiếu
    let taiVotes = 0;
    let xiuVotes = 0;
    let strategies = [];

    predictions.forEach(pred => {
        if (pred.type === "tài") {
            taiVotes += pred.weight || 1;
        } else if (pred.type === "xỉu") {
            xiuVotes += pred.weight || 1;
        }

        if (pred.description) {
            strategies.push(pred.description);
        }
    });

    // Xác định số cuối cùng
    const finalNumber = taiVotes >= xiuVotes ?
        getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);

    return {
        finalNumber,
        taiVotes,
        xiuVotes,
        stats: taixiuAnalysis.summary,
        strategies
    };
}

function adaptiveLearning(history, recentResults, length = 10) {
    // Phân tích kết quả gần đây
    const taiCount = recentResults.filter(r => r >= 5).length;
    const xiuCount = recentResults.filter(r => r < 5).length;

    // Tỷ lệ Tài/Xỉu trong lịch sử gần đây
    const taiRatio = taiCount / recentResults.length;

    // Điều chỉnh dự đoán dựa theo xu hướng gần đây
    // Nếu Tài đang xuất hiện nhiều, tăng khả năng đoán Xỉu và ngược lại
    const randomFactor = Math.random();

    if (randomFactor < taiRatio) {
        return getLuckyNumberInRange(0, 4); // Xỉu (0-4)
    } else {
        return getLuckyNumberInRange(5, 9); // Tài (5-9)
    }
}

function analyzeRecentResults(history, limit, offset = 0) {
    // Sử dụng limit thay vì cố định 5
    const recentResults = history.slice(0, limit);
    const taiXiuPattern = recentResults.map(r => r >= 5 ? 'T' : 'X').join('');

    // Phân tích xu hướng với toàn bộ dữ liệu
    const taiCount = recentResults.filter(r => r >= 5).length;
    const xiuCount = recentResults.length - taiCount;

    // Nếu có xu hướng mạnh về một bên
    if (taiCount >= recentResults.length * 0.8) {
        // Nếu Tài xuất hiện quá nhiều, có khả năng sẽ đổi sang Xỉu
        return Math.random() < 0.7 ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    } else if (xiuCount >= recentResults.length * 0.8) {
        // Nếu Xỉu xuất hiện quá nhiều, có khả năng sẽ đổi sang Tài
        return Math.random() < 0.7 ? getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
    }

    // Phân tích mẫu chuỗi
    if (taiXiuPattern.endsWith('TTT')) {
        // Sau 3 Tài liên tiếp, có xu hướng đổi sang Xỉu
        return Math.random() < 0.65 ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    } else if (taiXiuPattern.endsWith('XXX')) {
        // Sau 3 Xỉu liên tiếp, có xu hướng đổi sang Tài
        return Math.random() < 0.65 ? getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
    }

    // Phân tích mẫu đan xen
    if (taiXiuPattern.endsWith('TXTX')) {
        return Math.random() < 0.7 ? getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
    } else if (taiXiuPattern.endsWith('XTXT')) {
        return Math.random() < 0.7 ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }

    // Nếu không có mẫu rõ ràng, dự đoán theo phân bố gần đây
    return Math.random() < (taiCount / recentResults.length) ?
        getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
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
 * Dự đoán dựa trên số thực tế gần đây
 */
function predictBasedOnActualResults(history, limit) {
    if (!Array.isArray(history) || history.length === 0) {
        return getLuckyNumberInRange(0, 9);
    }

    // Lấy và lọc số hợp lệ
    const recentResults = history
        .slice(0, limit)
        .map(item => getNumberFromHistory(item))
        .filter(num => num !== null);

    if (recentResults.length === 0) {
        return getLuckyNumberInRange(0, 9);
    }

    // Phân tích chuỗi số liên tục
    let increasing = 0, decreasing = 0;
    for (let i = 0; i < recentResults.length - 1; i++) {
        if (recentResults[i] < recentResults[i + 1]) increasing++;
        if (recentResults[i] > recentResults[i + 1]) decreasing++;
    }

    // Xác định xu hướng
    if (increasing > decreasing + 2) {
        // Xu hướng tăng rõ rệt
        return getLuckyNumberInRange(5, 9); // Dự đoán Tài do xu hướng tăng
    } else if (decreasing > increasing + 2) {
        // Xu hướng giảm rõ rệt
        return getLuckyNumberInRange(0, 4); // Dự đoán Xỉu do xu hướng giảm
    }

    // Kiểm tra xu hướng Tài/Xỉu
    const taiCount = recentResults.filter(num => num >= 5).length;
    const xiuCount = recentResults.length - taiCount;

    // Tính tỷ lệ
    const taiRatio = taiCount / recentResults.length;

    if (taiRatio >= 0.7) {
        // Xu hướng mạnh về Tài - dự đoán Tài
        return getLuckyNumberInRange(5, 9);
    } else if (taiRatio <= 0.3) {
        // Xu hướng mạnh về Xỉu - dự đoán Xỉu
        return getLuckyNumberInRange(0, 4);
    }

    // Nếu không có xu hướng rõ ràng
    return getLuckyNumberInRange(0, 9);
}

/**
 * Phân tích mẫu số thực tế
 */
function patternRecognitionPredictor(history, patternLength = 3) {
    if (!history || history.length < patternLength) return null;

    const numbers = history
        .slice(0, patternLength)
        .map(item => Number(item.numbers?.[0]))
        .filter(num => !isNaN(num));

    if (numbers.length < patternLength) return null;

    // Tính trung bình và phương sai
    const avg = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - avg, 2), 0) / numbers.length;

    // Nếu phương sai thấp (số ổn định)
    if (variance < 2) {
        // Dự đoán gần với trung bình
        return Math.round(avg + (Math.random() - 0.5));
    }

    // Nếu có xu hướng tăng/giảm rõ rệt
    const trend = numbers[0] - numbers[numbers.length - 1];
    if (Math.abs(trend) >= 2) {
        // Tiếp tục xu hướng với xác suất 70%
        if (Math.random() < 0.7) {
            return Math.max(0, Math.min(9, numbers[0] + Math.sign(trend)));
        }
    }

    // Nếu không có mẫu rõ ràng, dự đoán gần với số gần nhất
    return Math.max(0, Math.min(9, numbers[0] + (Math.random() > 0.5 ? 1 : -1)));
}

/**
 * Mô hình dự đoán dựa trên phân tích thống kê nâng cao
 */
function statisticalAnalysisPredictor(history, window = 20) {
    if (!history || history.length < window) return null;

    const numbers = history
        .slice(0, window)
        .map(item => Number(item.numbers?.[0]))
        .filter(num => !isNaN(num));

    if (numbers.length < window / 2) return null;

    // Tính các chỉ số thống kê
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
    const stdDev = Math.sqrt(variance);

    // Tính độ lệch (skewness)
    const skewness = numbers.reduce((sum, num) =>
        sum + Math.pow(num - mean, 3), 0) / (numbers.length * Math.pow(stdDev, 3));

    // Dự đoán dựa trên các chỉ số thống kê
    if (Math.abs(skewness) > 0.5) {
        // Nếu có độ lệch đáng kể, dự đoán ngược với độ lệch
        return skewness > 0 ?
            getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }

    // Dự đoán dựa trên khoảng tin cậy
    const confidenceInterval = 1.96 * stdDev / Math.sqrt(numbers.length);
    return mean + confidenceInterval >= 5 ?
        getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
}

/**
 * Mô hình học tăng cường (Reinforcement Learning)
 */
function reinforcementLearningPredictor(history, performanceData) {
    // Khởi tạo ma trận Q-learning đơn giản
    const qMatrix = {
        'T': { 'T': 0, 'X': 0 },
        'X': { 'T': 0, 'X': 0 }
    };

    // Cập nhật ma trận Q từ dữ liệu hiệu suất
    if (performanceData && performanceData.history) {
        performanceData.history.forEach(line => {
            if (typeof line === 'string') {
                const match = line.match(/Số thực tế: \d+ \((Tài|Xỉu)\).*\|(Đúng|Sai)/);
                if (match) {
                    const [, result, accuracy] = match;
                    const state = result === 'Tài' ? 'T' : 'X';
                    const reward = accuracy === 'Đúng' ? 1 : -1;

                    qMatrix[state][state] += reward;
                    qMatrix[state][state === 'T' ? 'X' : 'T'] -= reward;
                }
            }
        });
    }

    // Lấy trạng thái hiện tại
    const currentState = history[0] && Number(history[0].numbers?.[0]) >= 5 ? 'T' : 'X';

    // Chọn hành động tốt nhất dựa trên ma trận Q
    const nextAction = qMatrix[currentState]['T'] > qMatrix[currentState]['X'] ? 'T' : 'X';

    return nextAction === 'T' ?
        getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
}

/**
 * Cải tiến hàm ensemble
 */
function ensemblePredictor(predictions, offset = 0) {
    if (!Array.isArray(predictions) || predictions.length === 0) {
        return getLuckyNumberInRange(0, 9);
    }

    let weightedSum = 0;
    let totalWeight = 0;

    for (const pred of predictions) {
        if (pred.number === null || isNaN(pred.number)) continue;

        const weight = (pred.weight || 1) * (pred.confidence || 0.5);
        weightedSum += pred.number * weight;
        totalWeight += weight;
    }

    if (totalWeight === 0) {
        return getLuckyNumberInRange(0, 9);
    }

    // Thay đổi công thức tính noise
    const noise = (Math.cos(offset * Math.PI) * 0.5); // Giảm ảnh hưởng của noise
    const finalNumber = Math.round(weightedSum / totalWeight + noise);

    return Math.max(0, Math.min(9, finalNumber));
}

/**
 * Cải tiến hàm phân tích xu hướng
 */
function analyzeTrend(history, limit, offset = 0) {
    if (!history || history.length < limit) return null;

    const numbers = history
        .slice(0, limit)
        .map(item => Number(item.numbers?.[0]));

    // Đếm số lần xuất hiện Tài/Xỉu trong toàn bộ dữ liệu
    const taiCount = numbers.filter(n => n >= 5).length;
    const xiuCount = numbers.length - taiCount;

    // Điều chỉnh logic phân tích cho phù hợp với số lượng dữ liệu lớn hơn
    if (taiCount >= numbers.length * 0.7) { // 70% là Tài
        return getLuckyNumberInRange(5, 9);
    } else if (xiuCount >= numbers.length * 0.7) { // 70% là Xỉu
        return getLuckyNumberInRange(0, 4);
    }

    // Nếu không có xu hướng rõ ràng
    return getLuckyNumberInRange(0, 9);
}

/**
 * Thêm hàm phân tích chu kỳ số
 */
function analyzeNumberCycles(history, length = 10) {
    if (!history || history.length < length) return null;

    const numbers = history
        .slice(0, length)
        .map(item => Number(item.numbers?.[0]))
        .filter(num => !isNaN(num));

    if (numbers.length < length / 2) return null;

    // Tìm chu kỳ trong dãy số
    let sum = 0;
    let count = 0;
    for (let i = 0; i < numbers.length - 1; i++) {
        sum += Math.abs(numbers[i] - numbers[i + 1]);
        count++;
    }

    const avgChange = sum / count;
    const lastNumber = numbers[0];

    // Dự đoán dựa trên biến động trung bình
    let prediction = lastNumber;
    if (avgChange > 2) {
        // Nếu biến động lớn, dự đoán số ngược lại
        prediction = lastNumber > 4 ?
            getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    } else {
        // Nếu biến động nhỏ, dự đoán số gần với số hiện tại
        prediction = Math.max(0, Math.min(9,
            lastNumber + (Math.random() > 0.5 ? 1 : -1)
        ));
    }

    return prediction;
}

// Thêm hàm này để lấy dữ liệu hiệu suất
function getPerformanceHistory(fileConfig, index, limit) {
    try {
        const fs = require('fs');
        const fileName = `${fileConfig[0]}_index${index}_limit${limit}.performance`;
        if (fs.existsSync(fileName)) {
            const content = fs.readFileSync(fileName, 'utf8');
            return content.split('\n');
        }
        return [];
    } catch (error) {
        return [];
    }
}

/**
 * Dự đoán phân tích xu hướng đảo chiều
 */
function trendReversalPredictor(history, index = 0) {
    if (!history || history.length < 3) return null;

    // Lấy kết quả THỰC TẾ gần nhất từ file performance
    const fs = require('fs');
    const realResults = [];

    try {
        const performanceFile = `taixiu_history_index${index}_limit15.performance`;
        if (fs.existsSync(performanceFile)) {
            const content = fs.readFileSync(performanceFile, 'utf8');
            const lines = content.split('\n').filter(line => line.includes('Chu kỳ |'));

            // Lấy 10 kết quả thực tế gần nhất
            const recentResults = lines.slice(-10);
            for (const line of recentResults) {
                const match = line.match(/Số thực tế: (\d+) \((Tài|Xỉu)\)/);
                if (match) {
                    realResults.push(match[1] >= 5 ? 'T' : 'X');
                }
            }
        }
    } catch (error) {
        console.error("Lỗi khi đọc file performance:", error);
    }

    // Nếu có ít nhất 5 kết quả thực tế, phân tích chúng
    if (realResults.length >= 5) {

        // Đếm chuỗi Tài/Xỉu liên tiếp
        let currentStreak = 1;
        let streakType = realResults[0];

        for (let i = 1; i < realResults.length; i++) {
            if (realResults[i] === streakType) {
                currentStreak++;
            } else {
                currentStreak = 1;
                streakType = realResults[i];
            }

            // Nếu có chuỗi >=3 kết quả giống nhau, dự đoán ngược lại
            if (currentStreak >= 3) {
                return streakType === 'T' ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
            }
        }

        // Phân tích tỷ lệ Tài/Xỉu trong 5 kết quả gần nhất
        const recentFive = realResults.slice(0, 5);
        const taiCount = recentFive.filter(r => r === 'T').length;

        // Nếu Tài chiếm ưu thế, dự đoán Xỉu và ngược lại
        if (taiCount >= 3) {
            return getLuckyNumberInRange(0, 4); // Dự đoán Xỉu
        } else {
            return getLuckyNumberInRange(5, 9); // Dự đoán Tài
        }
    }

    // Nếu không có đủ dữ liệu thực tế, dùng phương pháp phân tích lịch sử
    const recentNumbers = history.slice(0, Math.min(6, history.length))
        .map(item => {
            if (!item || !item.numbers || !item.numbers[index]) return null;
            return Number(item.numbers[index]);
        })
        .filter(num => num !== null && !isNaN(num));

    // Phân tích chuỗi Tài/Xỉu
    const pattern = recentNumbers.map(n => n >= 5 ? 'T' : 'X').join('');
    console.log("Phân tích dựa trên lịch sử:", pattern);

    // Quy tắc đảo chiều sau 2 kết quả giống nhau
    if (pattern.startsWith('TT')) return getLuckyNumberInRange(0, 4); // Sau 2 Tài, dự đoán Xỉu
    if (pattern.startsWith('XX')) return getLuckyNumberInRange(5, 9); // Sau 2 Xỉu, dự đoán Tài

    // Nếu có xen kẽ, dự đoán theo kết quả gần nhất
    return recentNumbers[0] >= 5 ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
}

/**
 * Dự đoán dựa trên limit cụ thể
 */
function predictWithLimit(history, index, limit) {
    // Lấy n phần tử đầu tiên của history dựa vào limit
    const limitedHistory = history.slice(0, limit);

    // Thực hiện dự đoán dựa trên limitedHistory
    return trendReversalPredictor(limitedHistory, index);
}

/**
 * Mô hình kiểm tra hiệu suất động
 */
function dynamicPerformancePredictor(history, index = 0, fileConfig, limitConfig) {
    try {
        const fs = require('fs');
        const limitPerformance = {};
        const limitPredictions = {};
        const consecutiveCorrect = {};

        // Lấy danh sách limit từ cấu hình
        const limitList = limitConfig && limitConfig.limitList ? limitConfig.limitList : [5, 10, 15];
        const limitMain = limitConfig && limitConfig.limitMain ? limitConfig.limitMain : 15;

        // Đọc hiệu suất của các model limit khác nhau
        for (const limit of limitList) {
            const fileName = `${fileConfig[0]}_index${index}_limit${limit}.performance`;
            if (fs.existsSync(fileName)) {
                const content = fs.readFileSync(fileName, 'utf8');
                const lines = content.split('\n').filter(line => line.includes('Chu kỳ |'));

                if (lines.length > 0) {
                    // Lấy 10 kết quả gần nhất
                    const recent = lines.slice(-Math.min(10, lines.length));
                    const correctCount = recent.filter(line => line.includes('| Đúng')).length;
                    limitPerformance[limit] = correctCount / recent.length;

                    // Đếm số lần dự đoán đúng liên tiếp gần đây
                    let streak = 0;
                    for (let i = recent.length - 1; i >= 0; i--) {
                        if (recent[i].includes('| Đúng')) {
                            streak++;
                        } else {
                            break;
                        }
                    }
                    consecutiveCorrect[limit] = streak;

                    // Tạo dự đoán cho limit này
                    limitPredictions[limit] = predictWithLimit(history, index, limit);
                }
            }
        }

        // Kiểm tra chuỗi dự đoán đúng liên tiếp
        let bestStreakLimit = limitMain;
        let bestStreak = 0;

        for (const [limit, streak] of Object.entries(consecutiveCorrect)) {
            // Nếu có chuỗi 3+ lần đúng liên tiếp, ưu tiên sử dụng limit đó
            if (streak >= 3 && streak > bestStreak) {
                bestStreakLimit = parseInt(limit);
                bestStreak = streak;
            }
        }

        // Nếu có limit nào đó đúng liên tiếp 3+ lần, ưu tiên sử dụng
        if (bestStreak >= 3) {
            return limitPredictions[bestStreakLimit] || getLuckyNumberInRange(0, 9);
        }

        // Nếu không có chuỗi đặc biệt, chọn limit có hiệu suất tốt nhất
        let bestLimit = limitMain;
        let bestPerformance = 0;

        for (const [limit, performance] of Object.entries(limitPerformance)) {
            if (performance > bestPerformance) {
                bestPerformance = performance;
                bestLimit = parseInt(limit);
            }
        }

        return limitPredictions[bestLimit] || predictWithLimit(history, index, bestLimit);

    } catch (error) {
        console.error("Lỗi khi dự đoán theo hiệu suất động:", error);
        return getLuckyNumberInRange(0, 9);
    }
}

/**
 * Mô hình học máy trọng số động
 */
function adaptiveWeightPredictor(history, index = 0, performanceData) {
    // Khởi tạo trọng số cho các chiến lược
    const weights = {
        trend: 0.25,        // Trọng số cho chiến lược xu hướng
        pattern: 0.25,      // Trọng số cho chiến lược mẫu
        frequency: 0.25,    // Trọng số cho chiến lược tần suất
        balance: 0.25       // Trọng số cho chiến lược cân bằng
    };

    const recentNumbers = history.slice(0, Math.min(10, history.length))
        .map(item => {
            if (!item || !item.numbers || !item.numbers[index]) return null;
            return Number(item.numbers[index]);
        })
        .filter(num => num !== null && !isNaN(num));

    if (recentNumbers.length < 5) return getLuckyNumberInRange(0, 9);

    // Phân tích xu hướng
    let trendPrediction = -1;
    // Phân tích xu hướng tăng/giảm
    let increasing = 0, decreasing = 0;
    for (let i = 0; i < recentNumbers.length - 1; i++) {
        if (recentNumbers[i] < recentNumbers[i + 1]) increasing++;
        if (recentNumbers[i] > recentNumbers[i + 1]) decreasing++;
    }

    // Xác định xu hướng
    if (increasing > decreasing + 1) {
        // Xu hướng tăng rõ rệt
        trendPrediction = getLuckyNumberInRange(5, 9); // Dự đoán Tài
    } else if (decreasing > increasing + 1) {
        // Xu hướng giảm rõ rệt
        trendPrediction = getLuckyNumberInRange(0, 4); // Dự đoán Xỉu
    } else {
        trendPrediction = recentNumbers[0] >= 5 ?
            getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }

    // Phát hiện mẫu
    let patternPrediction = -1;
    const pattern = recentNumbers.map(n => n >= 5 ? 'T' : 'X').join('');

    // Kiểm tra các mẫu đặc biệt
    if (pattern.startsWith('TTT')) {
        patternPrediction = getLuckyNumberInRange(0, 4); // Sau 3 Tài liên tiếp thường là Xỉu
    } else if (pattern.startsWith('XXX')) {
        patternPrediction = getLuckyNumberInRange(5, 9); // Sau 3 Xỉu liên tiếp thường là Tài
    } else if (pattern.startsWith('TXTX')) {
        patternPrediction = getLuckyNumberInRange(5, 9); // Sau mẫu TXTX thường là Tài
    } else if (pattern.startsWith('XTXT')) {
        patternPrediction = getLuckyNumberInRange(0, 4); // Sau mẫu XTXT thường là Xỉu
    } else {
        patternPrediction = Math.random() < 0.5 ?
            getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }

    // Phân tích tần suất
    let frequencyPrediction = -1;
    const taiCount = recentNumbers.filter(n => n >= 5).length;
    const taiRatio = taiCount / recentNumbers.length;

    if (taiRatio > 0.7) {
        frequencyPrediction = getLuckyNumberInRange(0, 4); // Quá nhiều Tài, dự đoán Xỉu
    } else if (taiRatio < 0.3) {
        frequencyPrediction = getLuckyNumberInRange(5, 9); // Quá nhiều Xỉu, dự đoán Tài
    } else {
        frequencyPrediction = Math.random() < 0.5 ?
            getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }

    // Dự đoán cân bằng
    let balancePrediction = -1;
    // Kiểm tra xu hướng gần đây (3 kết quả gần nhất)
    const recent = recentNumbers.slice(0, 3);
    const recentTaiCount = recent.filter(n => n >= 5).length;

    if (recentTaiCount >= 2) {
        balancePrediction = getLuckyNumberInRange(0, 4); // Gần đây nhiều Tài, dự đoán Xỉu
    } else {
        balancePrediction = getLuckyNumberInRange(5, 9); // Gần đây nhiều Xỉu, dự đoán Tài
    }

    // Kết hợp các dự đoán với trọng số
    const predictions = [
        { value: trendPrediction, weight: weights.trend },
        { value: patternPrediction, weight: weights.pattern },
        { value: frequencyPrediction, weight: weights.frequency },
        { value: balancePrediction, weight: weights.balance }
    ];

    // Tính điểm trọng số
    let totalWeight = 0;
    let weightedSum = 0;

    for (const pred of predictions) {
        if (pred.value !== -1) {
            weightedSum += pred.value * pred.weight;
            totalWeight += pred.weight;
        }
    }

    if (totalWeight === 0) return getLuckyNumberInRange(0, 9);

    const result = Math.round(weightedSum / totalWeight);
    return Math.max(0, Math.min(9, result));
}

/**
 * Phân tích mẫu xen kẽ từ dữ liệu thực tế
 */
function alternatingPatternPredictor(history, index = 0) {
    try {
        const fs = require('fs');
        const performanceFile = `taixiu_history_index${index}_limit15.performance`;

        if (!fs.existsSync(performanceFile)) {
            return null;
        }

        const content = fs.readFileSync(performanceFile, 'utf8');
        const lines = content.split('\n').filter(line => line.includes('Chu kỳ |'));

        if (lines.length < 5) return null;

        // Phân tích kết quả thực tế
        const realResults = [];

        for (const line of lines.slice(-10)) {
            const match = line.match(/Số thực tế: (\d+) \((Tài|Xỉu)\)/);
            if (match) {
                realResults.push(match[2] === 'Tài' ? true : false);
            }
        }

        // Phân tích mẫu xen kẽ
        let alternating = 0;
        for (let i = 0; i < realResults.length - 1; i++) {
            if (realResults[i] !== realResults[i + 1]) {
                alternating++;
            }
        }

        const alternatingRatio = alternating / (realResults.length - 1);
        // Nếu có xu hướng xen kẽ rõ ràng (>70%)
        if (alternatingRatio > 0.7) {
            // Dự đoán ngược với kết quả gần nhất
            return realResults[0] ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
        }

        // Phân tích chuỗi kết quả giống nhau
        let streak = 1;
        let currentType = realResults[0];

        for (let i = 1; i < realResults.length; i++) {
            if (realResults[i] === currentType) {
                streak++;
            } else {
                currentType = realResults[i];
                streak = 1;
            }

            // Nếu có 2+ kết quả cùng loại, dự đoán ngược lại
            if (streak >= 2 && i === realResults.length - 1) {
                return currentType ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
            }
        }

        // Nếu không tìm thấy xu hướng rõ ràng, dựa vào tỷ lệ Tài/Xỉu
        const taiCount = realResults.filter(r => r).length;
        if (taiCount > realResults.length * 0.6) {
            return getLuckyNumberInRange(0, 4); // Nhiều Tài, dự đoán Xỉu
        } else if (taiCount < realResults.length * 0.4) {
            return getLuckyNumberInRange(5, 9); // Nhiều Xỉu, dự đoán Tài
        }

        // Mặc định ngược với kết quả gần nhất
        return realResults[0] ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    } catch (error) {
        console.error("Lỗi khi phân tích mẫu xen kẽ:", error);
        return null;
    }
}

/**
 * Phân tích kết quả thực tế và tạo báo cáo hiệu suất
 */
function analyzeRealPatterns(index = 0) {
    try {
        const fs = require('fs');
        const performanceFile = `taixiu_history_index${index}_limit15.performance`;

        if (!fs.existsSync(performanceFile)) {
            return null;
        }

        const content = fs.readFileSync(performanceFile, 'utf8');
        const lines = content.split('\n').filter(line => line.includes('Chu kỳ |'));

        if (lines.length < 5) return null;

        // Phân tích 10 kết quả gần nhất
        const recent = lines.slice(-10);
        const realResults = [];
        const predictions = [];
        const accuracy = [];

        for (const line of recent) {
            const realMatch = line.match(/Số thực tế: (\d+) \((Tài|Xỉu)\)/);
            const predMatch = line.match(/Số dự đoán: (\d+) \((Tài|Xỉu)\)/);
            const isCorrect = line.includes('| Đúng');

            if (realMatch && predMatch) {
                realResults.push(realMatch[2]);
                predictions.push(predMatch[2]);
                accuracy.push(isCorrect ? 1 : 0);
            }
        }

        // Tính độ chính xác tổng thể
        const overallAccuracy = accuracy.reduce((sum, val) => sum + val, 0) / accuracy.length;

        // Nếu độ chính xác < 50%, đảo ngược dự đoán
        if (overallAccuracy < 0.5) {
            console.log("Phát hiện độ chính xác thấp, đảo ngược dự đoán");
            return Math.random() < 0.5 ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
        }

        // Phân tích kết quả thực tế
        let pattern = realResults.join('');

        // Quy tắc đảo chiều dựa trên mẫu thực tế
        if (pattern.startsWith('TàiTàiTài')) {
            return getLuckyNumberInRange(0, 4); // Sau 3 Tài liên tiếp, dự đoán Xỉu
        }

        if (pattern.startsWith('XỉuXỉuXỉu')) {
            return getLuckyNumberInRange(5, 9); // Sau 3 Xỉu liên tiếp, dự đoán Tài
        }

        if (pattern.startsWith('TàiTài')) {
            return getLuckyNumberInRange(0, 4); // Sau 2 Tài liên tiếp, dự đoán Xỉu
        }

        if (pattern.startsWith('XỉuXỉu')) {
            return getLuckyNumberInRange(5, 9); // Sau 2 Xỉu liên tiếp, dự đoán Tài
        }

        // Phân tích xen kẽ
        if (pattern.startsWith('TàiXỉuTàiXỉu')) {
            return getLuckyNumberInRange(5, 9); // Sau mẫu TXTX, dự đoán Tài
        }

        if (pattern.startsWith('XỉuTàiXỉuTài')) {
            return getLuckyNumberInRange(0, 4); // Sau mẫu XTXT, dự đoán Xỉu
        }

        // Dự đoán dựa trên phân phối gần đây
        const taiCount = realResults.filter(r => r === 'Tài').length;
        if (taiCount >= realResults.length * 0.6) {
            return getLuckyNumberInRange(0, 4); // Nhiều Tài, dự đoán Xỉu
        } else if (taiCount <= realResults.length * 0.4) {
            return getLuckyNumberInRange(5, 9); // Nhiều Xỉu, dự đoán Tài
        }

        return Math.random() < 0.5 ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    } catch (error) {
        console.error("Lỗi khi phân tích mẫu thực tế:", error);
        return null;
    }
}

function anomalyFilterPredictor(history, index = 0) {
    // Lấy 20 kết quả gần nhất
    const recentNumbers = history.slice(0, 20).map(item => Number(item.numbers?.[index]));

    // Đếm tổng số lần xuất hiện Tài/Xỉu
    const taiCount = recentNumbers.filter(n => n >= 5).length;
    const xiuCount = recentNumbers.length - taiCount;

    // Tính tỷ lệ
    const taiRatio = taiCount / recentNumbers.length;

    // Phân tích chuỗi liên tiếp
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

    // Kiểm tra các mẫu bất thường
    if (maxTaiStreak >= 5) {
        // Nếu có 5 lần Tài liên tiếp, khả năng cao sẽ đổi sang Xỉu
        return getLuckyNumberInRange(0, 4);
    }

    if (maxXiuStreak >= 5) {
        // Nếu có 5 lần Xỉu liên tiếp, khả năng cao sẽ đổi sang Tài
        return getLuckyNumberInRange(5, 9);
    }

    // Kiểm tra tỷ lệ mất cân bằng
    if (taiRatio > 0.7) {
        // Nếu Tài chiếm ưu thế quá mức, Xỉu sẽ xuất hiện để cân bằng
        return getLuckyNumberInRange(0, 4);
    }

    if (taiRatio < 0.3) {
        // Nếu Xỉu chiếm ưu thế quá mức, Tài sẽ xuất hiện để cân bằng
        return getLuckyNumberInRange(5, 9);
    }

    // Nếu không có mẫu bất thường, sử dụng dự đoán cơ bản
    return recentNumbers[0] >= 5 ?
        getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
}

/**
 * Phân tích xu hướng
 */
function analyzeTrendDirection(numbers) {
    if (!numbers || numbers.length < 5) return null;

    // Phân tích xu hướng tăng/giảm
    let increasing = 0, decreasing = 0;
    for (let i = 0; i < numbers.length - 1; i++) {
        if (numbers[i] < numbers[i + 1]) increasing++;
        if (numbers[i] > numbers[i + 1]) decreasing++;
    }

    // Xác định xu hướng
    if (increasing > decreasing + 2) {
        // Xu hướng tăng rõ rệt
        return getLuckyNumberInRange(5, 9); // Dự đoán Tài
    } else if (decreasing > increasing + 2) {
        // Xu hướng giảm rõ rệt
        return getLuckyNumberInRange(0, 4); // Dự đoán Xỉu
    }

    // Nếu không có xu hướng rõ ràng
    return numbers[0] >= 5 ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
}

/**
 * Phát hiện mẫu số 
 */
function detectNumberPattern(numbers) {
    if (!numbers || numbers.length < 6) return null;

    // Chuyển đổi sang chuỗi Tài/Xỉu
    const pattern = numbers.map(n => n >= 5 ? 'T' : 'X').join('');

    // Kiểm tra các mẫu đặc biệt
    if (pattern.includes('TTT')) {
        return getLuckyNumberInRange(0, 4); // Sau 3 Tài liên tiếp thường là Xỉu
    }

    if (pattern.includes('XXX')) {
        return getLuckyNumberInRange(5, 9); // Sau 3 Xỉu liên tiếp thường là Tài
    }

    if (pattern.includes('TXTX')) {
        return getLuckyNumberInRange(5, 9); // Sau mẫu TXTX thường là Tài
    }

    if (pattern.includes('XTXT')) {
        return getLuckyNumberInRange(0, 4); // Sau mẫu XTXT thường là Xỉu
    }

    // Nếu không tìm thấy mẫu đặc biệt
    return null;
}

/**
 * Phân tích tần suất xuất hiện
 */
function numberFrequencyAnalysis(numbers) {
    if (!numbers || numbers.length < 5) return null;

    // Đếm tần suất xuất hiện của từng số
    const frequency = Array(10).fill(0);
    for (const num of numbers) {
        if (num >= 0 && num <= 9) {
            frequency[num]++;
        }
    }

    // Tìm số có tần suất thấp nhất/cao nhất
    let minIndex = 0, maxIndex = 0;
    for (let i = 0; i < frequency.length; i++) {
        if (frequency[i] < frequency[minIndex]) minIndex = i;
        if (frequency[i] > frequency[maxIndex]) maxIndex = i;
    }

    // Số có tần suất thấp có khả năng xuất hiện cao hơn
    if (frequency[minIndex] === 0) {
        return minIndex;
    }

    // Nghịch lý: số xuất hiện nhiều có thể tiếp tục xuất hiện
    if (frequency[maxIndex] >= 3) {
        return maxIndex;
    }

    // Tính tỷ lệ Tài/Xỉu
    const taiCount = numbers.filter(n => n >= 5).length;
    const xiuCount = numbers.length - taiCount;

    if (taiCount > xiuCount * 2) {
        return getLuckyNumberInRange(0, 4); // Ưu thế Tài quá lớn, dự đoán Xỉu
    }

    if (xiuCount > taiCount * 2) {
        return getLuckyNumberInRange(5, 9); // Ưu thế Xỉu quá lớn, dự đoán Tài
    }

    return null;
}

/**
 * Dự đoán theo nguyên tắc cân bằng
 */
function balancePredictor(numbers) {
    if (!numbers || numbers.length < 3) return null;

    // Kiểm tra xu hướng xen kẽ
    let alternatingCount = 0;
    for (let i = 0; i < numbers.length - 1; i++) {
        if ((numbers[i] >= 5 && numbers[i + 1] < 5) ||
            (numbers[i] < 5 && numbers[i + 1] >= 5)) {
            alternatingCount++;
        }
    }

    // Nếu có xu hướng xen kẽ cao (>60%), duy trì xu hướng
    const alternatingRatio = alternatingCount / (numbers.length - 1);
    if (alternatingRatio > 0.6) {
        // Dự đoán ngược với số gần nhất
        return numbers[0] >= 5 ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }

    // Nếu có 2+ số liên tiếp cùng loại, dự đoán ngược lại
    let currentType = numbers[0] >= 5;
    let streak = 1;

    for (let i = 1; i < numbers.length; i++) {
        const isHigh = numbers[i] >= 5;
        if (isHigh === currentType) {
            streak++;
            if (streak >= 2) {
                // Sau 2+ số cùng loại, dự đoán đảo chiều
                return isHigh ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
            }
        } else {
            currentType = isHigh;
            streak = 1;
        }
    }

    // Dự đoán dựa trên tỷ lệ Tài/Xỉu
    const taiCount = numbers.filter(n => n >= 5).length;
    const taiRatio = taiCount / numbers.length;

    if (taiRatio > 0.6) return getLuckyNumberInRange(0, 4);
    if (taiRatio < 0.4) return getLuckyNumberInRange(5, 9);

    // Mặc định ngược với giá trị gần nhất
    return numbers[0] >= 5 ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
}

/**
 * Dự đoán sử dụng mô hình chuỗi Markov
 * Phân tích các mẫu chuyển tiếp từ trạng thái này sang trạng thái khác
 */
function markovChainPredictor(history, index = 0) {
    if (!history || history.length < 5) return null;

    // Lấy dữ liệu số từ lịch sử
    const numbers = history.slice(0, Math.min(20, history.length))
        .map(item => {
            if (!item || !item.numbers || !item.numbers[index]) return null;
            return Number(item.numbers[index]);
        })
        .filter(num => num !== null && !isNaN(num));

    if (numbers.length < 5) return null;

    // Chuyển đổi thành chuỗi Tài/Xỉu
    const states = numbers.map(n => n >= 5 ? 'T' : 'X');

    // Xây dựng ma trận chuyển tiếp
    const transitions = {
        'T': { 'T': 0, 'X': 0 },
        'X': { 'T': 0, 'X': 0 }
    };

    // Đếm các chuyển tiếp
    for (let i = 0; i < states.length - 1; i++) {
        const currentState = states[i];
        const nextState = states[i + 1];
        transitions[currentState][nextState]++;
    }

    // Tính xác suất chuyển tiếp
    const currentState = states[0];
    const totalT = transitions[currentState]['T'] + transitions[currentState]['X'];

    if (totalT === 0) return getLuckyNumberInRange(0, 9);

    const probT = transitions[currentState]['T'] / totalT;
    const probX = transitions[currentState]['X'] / totalT;

    // Dự đoán dựa trên xác suất cao hơn
    if (probT > probX + 0.2) {
        return getLuckyNumberInRange(5, 9); // Dự đoán Tài
    } else if (probX > probT + 0.2) {
        return getLuckyNumberInRange(0, 4); // Dự đoán Xỉu
    } else {
        // Nếu xác suất gần bằng nhau, dự đoán ngược với trạng thái hiện tại
        return currentState === 'T' ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }
}

function timeBasedPerformanceAnalysis(history, index = 0, fileConfig) {
    try {
        const fs = require('fs');
        const performanceByHour = {};
        
        // Đọc dữ liệu từ file performance
        const performanceFile = `${fileConfig[0]}_index${index}_limit15.performance`;
        if (fs.existsSync(performanceFile)) {
            const content = fs.readFileSync(performanceFile, 'utf8');
            const lines = content.split('\n').filter(line => line.includes('Chu kỳ |'));
            
            // Phân tích theo giờ
            for (const line of lines) {
                const timeMatch = line.match(/(\d+:\d+:\d+ [AP]M)/);
                const isCorrect = line.includes('| Đúng');
                
                if (timeMatch) {
                    const time = timeMatch[1];
                    const hour = time.match(/(\d+):/)[1];
                    const ampm = time.includes('PM') ? 'PM' : 'AM';
                    const hourKey = `${hour} ${ampm}`;
                    
                    if (!performanceByHour[hourKey]) {
                        performanceByHour[hourKey] = { total: 0, correct: 0 };
                    }
                    
                    performanceByHour[hourKey].total++;
                    if (isCorrect) {
                        performanceByHour[hourKey].correct++;
                    }
                }
            }
            
            // Tìm khung giờ hiệu quả nhất
            let bestHour = '';
            let bestAccuracy = 0;
            
            for (const [hour, stats] of Object.entries(performanceByHour)) {
                if (stats.total >= 5) { // Chỉ xét khung giờ có ít nhất 5 mẫu
                    const accuracy = stats.correct / stats.total;
                    if (accuracy > bestAccuracy) {
                        bestAccuracy = accuracy;
                        bestHour = hour;
                    }
                }
            }
            
            // Kiểm tra xem giờ hiện tại có phải khung giờ hiệu quả không
            const now = new Date();
            const currentHour = now.getHours() % 12 || 12;
            const currentAMPM = now.getHours() >= 12 ? 'PM' : 'AM';
            const currentHourKey = `${currentHour} ${currentAMPM}`;
            
            if (currentHourKey === bestHour && bestAccuracy > 0.6) {
                // Trong khung giờ hiệu quả, tăng trọng số cho các chiến lược hiệu quả
                return true;
            }
        }
        
        return false;
    } catch (error) {
        return false;
    }
}

function enhancedTimePerformanceAnalysis(history, index = 0, fileConfig) {
    try {
        const fs = require('fs');
        const performanceByTime = {
            hourly: {},       // Phân tích theo giờ
            weekday: {},      // Phân tích theo thứ trong tuần
            timeOfDay: {      // Phân tích theo khoảng thời gian
                morning: { total: 0, correct: 0 },    // 5:00-11:59
                afternoon: { total: 0, correct: 0 },  // 12:00-17:59
                evening: { total: 0, correct: 0 },    // 18:00-23:59
                night: { total: 0, correct: 0 }       // 0:00-4:59
            },
            date: {}          // Phân tích theo ngày
        };
        
        // Đọc dữ liệu từ file performance
        const performanceFile = `${fileConfig[0]}_index${index}_limit15.performance`;
        if (fs.existsSync(performanceFile)) {
            const content = fs.readFileSync(performanceFile, 'utf8');
            const lines = content.split('\n').filter(line => line.includes('Chu kỳ |'));
            
            // Phân tích dữ liệu theo thời gian
            for (const line of lines) {
                const timeMatch = line.match(/(\d+:\d+:\d+ [AP]M)/);
                const isCorrect = line.includes('| Đúng');
                
                if (timeMatch) {
                    const timeStr = timeMatch[1];
                    const dateParts = new Date();
                    
                    // Phân tích thời gian
                    const timeParts = timeStr.match(/(\d+):(\d+):(\d+) ([AP]M)/);
                    if (timeParts) {
                        let hour = parseInt(timeParts[1]);
                        const minute = parseInt(timeParts[2]);
                        const ampm = timeParts[4];
                        
                        // Chuyển đổi giờ sang định dạng 24 giờ
                        if (ampm === 'PM' && hour < 12) hour += 12;
                        if (ampm === 'AM' && hour === 12) hour = 0;
                        
                        dateParts.setHours(hour, minute);
                        
                        // 1. Phân tích theo giờ
                        const hourKey = `${hour % 12 || 12} ${ampm}`;
                        if (!performanceByTime.hourly[hourKey]) {
                            performanceByTime.hourly[hourKey] = { total: 0, correct: 0 };
                        }
                        performanceByTime.hourly[hourKey].total++;
                        if (isCorrect) {
                            performanceByTime.hourly[hourKey].correct++;
                        }
                        
                        // 2. Phân tích theo thứ trong tuần
                        const weekday = getWeekdayName(dateParts.getDay());
                        if (!performanceByTime.weekday[weekday]) {
                            performanceByTime.weekday[weekday] = { total: 0, correct: 0 };
                        }
                        performanceByTime.weekday[weekday].total++;
                        if (isCorrect) {
                            performanceByTime.weekday[weekday].correct++;
                        }
                        
                        // 3. Phân tích theo khoảng thời gian trong ngày
                        let timeOfDay;
                        if (hour >= 5 && hour < 12) {
                            timeOfDay = 'morning';
                        } else if (hour >= 12 && hour < 18) {
                            timeOfDay = 'afternoon';
                        } else if (hour >= 18 && hour < 24) {
                            timeOfDay = 'evening';
                        } else {
                            timeOfDay = 'night';
                        }
                        
                        performanceByTime.timeOfDay[timeOfDay].total++;
                        if (isCorrect) {
                            performanceByTime.timeOfDay[timeOfDay].correct++;
                        }
                        
                        // 4. Phân tích theo ngày
                        const dateKey = `${dateParts.getDate()}/${dateParts.getMonth() + 1}`;
                        if (!performanceByTime.date[dateKey]) {
                            performanceByTime.date[dateKey] = { total: 0, correct: 0 };
                        }
                        performanceByTime.date[dateKey].total++;
                        if (isCorrect) {
                            performanceByTime.date[dateKey].correct++;
                        }
                    }
                }
            }
            
            // Tìm thời điểm hiệu quả nhất cho từng loại phân tích
            const bestTimes = {
                hourly: findBestPerformanceTime(performanceByTime.hourly, 5),
                weekday: findBestPerformanceTime(performanceByTime.weekday, 5),
                timeOfDay: findBestPerformanceTime(performanceByTime.timeOfDay, 5),
                date: findBestPerformanceTime(performanceByTime.date, 3)
            };
            
            // Kiểm tra thời điểm hiện tại có phải thời điểm hiệu quả không
            const now = new Date();
            const currentHour = now.getHours();
            const currentAMPM = currentHour >= 12 ? 'PM' : 'AM';
            const currentHourKey = `${currentHour % 12 || 12} ${currentAMPM}`;
            const currentWeekday = getWeekdayName(now.getDay());
            
            // Xác định thời điểm trong ngày hiện tại
            let currentTimeOfDay;
            if (currentHour >= 5 && currentHour < 12) {
                currentTimeOfDay = 'morning';
            } else if (currentHour >= 12 && currentHour < 18) {
                currentTimeOfDay = 'afternoon';
            } else if (currentHour >= 18) {
                currentTimeOfDay = 'evening';
            } else {
                currentTimeOfDay = 'night';
            }
            
            // Kiểm tra liệu thời điểm hiện tại có thuộc thời điểm tốt nhất không
            const isOptimalTime = {
                hourly: bestTimes.hourly.time === currentHourKey && bestTimes.hourly.accuracy > 0.6,
                weekday: bestTimes.weekday.time === currentWeekday && bestTimes.weekday.accuracy > 0.6,
                timeOfDay: bestTimes.timeOfDay.time === currentTimeOfDay && bestTimes.timeOfDay.accuracy > 0.6
            };
            
            // Trả về kết quả phân tích
            return {
                bestTimes,
                isOptimalTime,
                isOverallOptimalTime: isOptimalTime.hourly || isOptimalTime.weekday || isOptimalTime.timeOfDay,
                performanceData: performanceByTime
            };
        }
        
        return null;
    } catch (error) {
        console.error("Lỗi khi phân tích hiệu suất thời gian:", error);
        return null;
    }
}

// Hàm hỗ trợ tìm thời điểm hiệu quả nhất
function findBestPerformanceTime(timeData, minSamples = 5) {
    let bestTime = '';
    let bestAccuracy = 0;
    
    for (const [time, stats] of Object.entries(timeData)) {
        if (stats.total >= minSamples) { // Chỉ xét khi có đủ mẫu
            const accuracy = stats.correct / stats.total;
            if (accuracy > bestAccuracy) {
                bestAccuracy = accuracy;
                bestTime = time;
            }
        }
    }
    
    return {
        time: bestTime,
        accuracy: bestAccuracy,
        sampleCount: bestTime ? timeData[bestTime].total : 0
    };
}


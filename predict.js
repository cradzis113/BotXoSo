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
    const sortedLimits = performanceEntries.sort(([,a], [,b]) => b - a);
    
    // Chỉ chọn limit có hiệu suất > 50%
    const validLimits = sortedLimits.filter(([,accuracy]) => accuracy >= 0.5);
    
    // Nếu không có limit nào đạt ngưỡng, giữ nguyên limitMain
    if (validLimits.length === 0) {
        return [];
    }
    
    return validLimits;
}

/**
 * Dự đoán số tiếp theo và tự động học từ file performance
 */
async function predictNumbers(history, index = 0, limit = {limitList: [5, 10, 15], limitMain: 15}, fileConfig = ["taixiu_history", true], log = false) {
    try {
        const validParams = validateInputParams(history, index, limit, fileConfig);
        const limitPredictions = {};
        const limitPerformance = {};
        const strategies = [];
        // Đọc dữ liệu performance để kiểm tra emergency correction
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
        
        // Kiểm tra emergency correction
        const emergencyPrediction = emergencyCorrection(performanceData);
        if (emergencyPrediction !== null) {
            strategies.push("Áp dụng biện pháp khẩn cấp do dự đoán sai liên tiếp");
            
            // Tạo dự đoán cho tất cả các limit
            const emergencyPredictions = {};
            for (const currentLimit of validParams.limit.limitList) {
                // Tạo dự đoán khác nhau cho mỗi limit
                if (currentLimit === validParams.limit.limitMain) {
                    emergencyPredictions[currentLimit] = emergencyPrediction;
                } else {
                    const isXiu = emergencyPrediction < 5;
                    emergencyPredictions[currentLimit] = isXiu ? 
                        getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
                }
            }
            
            // Tính nextDrawId TRƯỚC KHI tạo result
            let nextDrawId = "";
            if (history[0]?.drawId && history[0].drawId.length === 12) {
                const prefix = history[0].drawId.slice(0, 8);
                const numPart = parseInt(history[0].drawId.slice(-4));
                
                // Tính chu kỳ tiếp theo (+1)
                const nextCycle = numPart + 1;
                
                nextDrawId = prefix + nextCycle.toString().padStart(4, '0');
                console.log(`Emergency: Dự đoán cho chu kỳ tiếp theo: ${nextDrawId} (hiện tại: ${history[0].drawId})`);
            } else {
                nextDrawId = history[0]?.drawId || "";
            }

            // Tạo result với nextDrawId đã tính
            const result = {
                predictions: [emergencyPredictions[validParams.limit.limitMain]],
                stats: {
                    accuracy: 0,
                    consecutiveWrong: 0
                },
                timestamp: new Date().toISOString(),
                timeVN: getVietnamTimeNow(),
                drawId: nextDrawId, // Sử dụng nextDrawId ngay từ đầu
                votes: {
                    "tài": emergencyPredictions[validParams.limit.limitMain] >= 5 ? 1 : 0,
                    "xỉu": emergencyPredictions[validParams.limit.limitMain] < 5 ? 1 : 0
                },
                strategies: strategies,
                indexPredicted: validParams.index,
                limits: {
                    main: validParams.limit.limitMain,
                    all: validParams.limit.limitList,
                    predictions: emergencyPredictions
                }
            };

            // Ghi file với result đã có nextDrawId
            if (fileConfig[1]) {
                try {
                    const fs = require('fs');
                    console.log(`ĐANG GHI FILE với drawId=${result.drawId}`);
                    fs.writeFileSync(
                        `${fileConfig[0]}.prediction`,
                        JSON.stringify(result, null, 2)
                    );
                    console.log("GHI FILE THÀNH CÔNG");
                } catch (error) {
                    console.error("Lỗi khi lưu file prediction:", error);
                }
            }

            // Ghi mạnh kết quả vào file performance
            if (previousPrediction && history.length > 0) {
                try {
                    const fs = require('fs');
                    const currentCycle = history[0].drawId;
                    const prevCycle = previousPrediction.drawId;
                    
                    // Nếu có chu kỳ trước đó và chu kỳ hiện tại
                    if (currentCycle && prevCycle) {
                        console.log(`Force update performance: current=${currentCycle}, prev=${prevCycle}`);
                        
                        // Kiểm tra xem prevCycle có phải là chu kỳ liền trước không
                        const currentNum = parseInt(currentCycle.slice(-4));
                        const prevNum = parseInt(prevCycle.slice(-4));
                        
                        if (currentNum - prevNum === 1) {
                            // Đây là chu kỳ liền kề, có thể cập nhật
                            const actualNumber = Number(history[0].numbers[validParams.index]);
                            const predictedNumber = previousPrediction.predictions[0];
                            const isCorrect = (actualNumber >= 5) === (predictedNumber >= 5);
                            
                            console.log(`FORCE UPDATE: Thực tế=${actualNumber}, Dự đoán=${predictedNumber}, Đúng=${isCorrect}`);
                            
                            // Cập nhật tất cả các file performance
                            for (const limitValue of previousPrediction.limits.all) {
                                // Code cập nhật file limit
                            }
                            
                            // Cập nhật file tổng hợp
                            // Code cập nhật file tổng hợp
                        }
                    }
                } catch (error) {
                    console.error("Lỗi khi ghi mạnh performance:", error);
                }
            }

            return result;
        }

        // Đọc dự đoán trước đó
        let previousPrediction = null;
        try {
            const fs = require('fs');
            const predictionFile = `${fileConfig[0]}.prediction`;
            if (fs.existsSync(predictionFile)) {
                const content = fs.readFileSync(predictionFile, 'utf8');
                previousPrediction = JSON.parse(content);
                console.log(`Đã đọc dự đoán trước đó: ${previousPrediction?.drawId}`);
            }
        } catch (error) {
            console.error("Lỗi khi đọc file prediction:", error);
        }

        // Lưu performance nếu có dự đoán trước
        if (previousPrediction && previousPrediction.drawId) {
            const prevDrawId = previousPrediction.drawId;
            console.log(`Tìm kết quả cho dự đoán trước: ${prevDrawId}`);
            console.log(`History hiện có: ${history.slice(0, 5).map(h => h.drawId).join(', ')}`);
            
            // Khai báo actualResultData và gán giá trị
            let actualResultData = history.find(h => h.drawId === prevDrawId);
            
            // Kiểm tra actualResultData trước khi xử lý
            if (actualResultData && actualResultData.numbers) {
                const fs = require('fs');
                const predIndex = previousPrediction.indexPredicted || 0;
                console.log(`Tìm thấy kết quả cho chu kỳ ${prevDrawId}: ${actualResultData.numbers}`);
                
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
                            console.log(`Đã cập nhật performance cho limit=${limitValue}: ${newLine}`);
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
                    console.log(`Đã cập nhật file performance tổng hợp`);
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
            
            const predictions = [
                {
                    number: predictBasedOnActualResults(limitedHistory, currentLimit),
                    weight: 10,
                    confidence: 0.8,
                    description: `Dự đoán cơ bản (limit ${currentLimit})`
                },
                {
                    number: analyzeTrend(limitedHistory, currentLimit, randomOffset),
                    weight: 10,
                    confidence: 0.85,
                    description: `Phân tích xu hướng (limit ${currentLimit})`
                },
                {
                    number: analyzeRecentResults(limitedHistory, Math.min(5, currentLimit), randomOffset),
                    weight: 10,
                    confidence: 0.85,
                    description: `Phân tích gần đây (limit ${currentLimit})`
                },
                {
                    number: patternRecognitionPredictor(limitedHistory, Math.min(3, currentLimit)),
                    weight: 10,
                    confidence: 0.9,
                    description: `Phân tích mẫu số (limit ${currentLimit})`
                },
                {
                    number: analyzeNumberCycles(limitedHistory, Math.min(10, currentLimit)),
                    weight: 10,
                    confidence: 0.9,
                    description: `Phân tích chu kỳ số (limit ${currentLimit})`
                },
                {
                    number: statisticalAnalysisPredictor(limitedHistory, Math.min(20, currentLimit)),
                    weight: 15,
                    confidence: 0.92,
                    description: `Phân tích thống kê nâng cao (limit ${currentLimit})`
                },
                {
                    number: reinforcementLearningPredictor(limitedHistory, { 
                        history: getPerformanceHistory(fileConfig, index, currentLimit) 
                    }),
                    weight: 15,
                    confidence: 0.95,
                    description: `Học tăng cường (limit ${currentLimit})`
                },
                {
                    number: adaptiveLearning(limitedHistory, 
                        limitedHistory.map(item => Number(item.numbers?.[0])).filter(n => !isNaN(n)), 
                        Math.min(10, currentLimit)),
                    weight: 15,
                    confidence: 0.93,
                    description: `Học thích ứng (limit ${currentLimit})`
                },
                {
                    number: analyzeLimitedHistory(limitedHistory, index).finalNumber,
                    weight: 20,
                    confidence: 0.95,
                    description: `Phân tích tổng hợp (limit ${currentLimit})`
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
                console.log(`Sử dụng kết quả từ limit=${bestLimit} (${(effectiveLimits[0][1]*100).toFixed(1)}%)`);
                if (bestLimit !== originalLimitMain) {
                    console.log(`Đã thay đổi limitMain từ ${originalLimitMain} sang ${bestLimit}`);
                }
            }
            
            // Cập nhật strategies
            strategies.push(`Sử dụng kết quả từ limit=${bestLimit} (hiệu suất: ${(effectiveLimits[0][1]*100).toFixed(1)}%)`);
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
            console.log(`Dự đoán cho chu kỳ tiếp theo: ${nextDrawId} (hiện tại: ${history[0].drawId})`);
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
                console.log(`ĐANG GHI FILE với drawId=${result.drawId}`);
                fs.writeFileSync(
                    `${fileConfig[0]}.prediction`,
                    JSON.stringify(result, null, 2)
                );
                console.log("GHI FILE THÀNH CÔNG");
            } catch (error) {
                console.error("Lỗi khi lưu file prediction:", error);
            }
        }

        // Log khoảng chu kỳ
        console.log(`Dự đoán hiện tại: ${history[0]?.drawId || "không có"}`);
        console.log(`Dự đoán trước đó: ${previousPrediction?.drawId}`);
        console.log(`Khoảng cách: ${parseInt(history[0]?.drawId.slice(-4)) - parseInt(previousPrediction?.drawId.slice(-4))}`);

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
function getLuckyNumberInRange(min, max) {
    // Thêm entropy từ timestamp để tăng tính ngẫu nhiên
    const timestamp = new Date().getTime();
    const seed = timestamp % 1000;
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
        if (recentResults[i] < recentResults[i+1]) increasing++;
        if (recentResults[i] > recentResults[i+1]) decreasing++;
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

function emergencyCorrection(performanceData) {
    if (!performanceData || !performanceData.history) {
        return null;
    }

    const recentResults = performanceData.history
        .filter(line => typeof line === 'string' && 
            (line.includes('Đúng') || line.includes('Sai')))
        .slice(-4);

    if (recentResults.length < 4) {
        return null;
    }

    const wrongCount = recentResults.filter(r => r.includes('Sai')).length;
    
    if (wrongCount >= 3) {
        // Nếu sai 3/4 lần gần nhất, đổi chiều dự đoán
        const lastPrediction = recentResults[0].includes('(Tài)');
        return lastPrediction ? 
            getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }

    return null;
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

    if (numbers.length < length/2) return null;

    // Tìm chu kỳ trong dãy số
    let sum = 0;
    let count = 0;
    for (let i = 0; i < numbers.length - 1; i++) {
        sum += Math.abs(numbers[i] - numbers[i+1]);
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

function updateCombinedPerformanceFile(fileConfig, drawId, timeVN, actualNum, predictedNum, limitUsed, wasCorrect, index = 0) {
    try {
        const fs = require('fs');
        const fileName = `${fileConfig[0]}_combined_performance.log`;
        
        // Xác định kiểu Tài/Xỉu
        const actualType = actualNum >= 5 ? "Tài" : "Xỉu";
        const predictedType = predictedNum >= 5 ? "Tài" : "Xỉu";
        
        // Tạo dòng kết quả mới với thông tin về index
        const newLine = `Chu kỳ | ${drawId} | ${timeVN} | Số thực tế: ${actualNum} (${actualType}) | Số dự đoán: ${predictedNum} (${predictedType}) | Vị trí: ${index} | Limit được chọn: ${limitUsed} | ${wasCorrect ? "Đúng" : "Sai"}`;
        
        // Tạo hoặc cập nhật file
        if (!fs.existsSync(fileName)) {
            const header = `# File Performance Tổng Hợp - Theo Dõi Kết Quả Dự Đoán Với Tất Cả Các Limit\n\n\n`;
            fs.writeFileSync(fileName, header + newLine + '\n');
        } else {
            fs.appendFileSync(fileName, newLine + '\n');
        }
        
        return true;
    } catch (error) {
        console.error(`Lỗi khi cập nhật file performance tổng hợp:`, error);
        return false;
    }
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

// Tạo hàm lấy mã chu kỳ hiện tại từ thời gian thực
function getCurrentCycleId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  
  // Tính chu kỳ dựa vào giây trong ngày (giả sử mỗi chu kỳ 45 giây)
  const secondsInDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const currentCycle = Math.floor(secondsInDay / 45) + 1;
  
  return `${year}${month}${day}${currentCycle.toString().padStart(4, '0')}`;
}

// Thêm hàm kiểm tra và điều chỉnh drawId
function correctDrawId(drawId) {
    // Lấy chu kỳ hiện tại từ web (giả sử bạn có thể lấy được)
    const webCurrentCycle = getWebCurrentCycle(); // Hàm này cần được triển khai
    
    // Tách phần số từ drawId
    const prefix = drawId.slice(0, 8);
    const numPart = parseInt(drawId.slice(-4));
    
    // Tính chu kỳ tiếp theo từ chu kỳ web hiện tại
    const nextCycle = webCurrentCycle + 1;
    
    // Trả về chu kỳ đã điều chỉnh
    return prefix + nextCycle.toString().padStart(4, '0');
}

// Thêm hàm này vào đầu file hoặc trước hàm predictNumbers
function savePerformanceBeforePrediction(history, fileConfig) {
    // Đọc dự đoán trước đó
    let previousPrediction = null;
    try {
        const fs = require('fs');
        const predictionFile = `${fileConfig[0]}.prediction`;
        if (fs.existsSync(predictionFile)) {
            const content = fs.readFileSync(predictionFile, 'utf8');
            previousPrediction = JSON.parse(content);
        }
    } catch (error) {
        console.error("Lỗi khi đọc file prediction:", error);
        return false;
    }
    
    if (!previousPrediction || !previousPrediction.drawId) {
        return false;
    }
    
    const prevDrawId = previousPrediction.drawId;
    console.log(`Đang tìm kết quả thực tế cho chu kỳ: ${prevDrawId}`);
    console.log(`Các chu kỳ có trong history: ${history.slice(0, 5).map(h => h.drawId).join(', ')}`);
    
    // Tìm kết quả từ history API
    const actualResultData = history.find(h => h.drawId === prevDrawId);
    
    if (actualResultData && actualResultData.numbers) {
        console.log(`✅ Tìm thấy kết quả thực tế cho chu kỳ ${prevDrawId}: ${actualResultData.numbers}`);
        
        // Xử lý cập nhật performance cho mỗi limit
        const index = previousPrediction.indexPredicted || 0;
        for (const limitValue of previousPrediction.limits.all) {
            const predictionValue = previousPrediction.limits.predictions[limitValue];
            if (predictionValue !== undefined) {
                const actualNumber = Number(actualResultData.numbers[index]);
                
                // Kiểm tra xem đã lưu chu kỳ này chưa
                const limitFileName = `${fileConfig[0]}_index${index}_limit${limitValue}.performance`;
                let fileContent = "";
                if (fs.existsSync(limitFileName)) {
                    fileContent = fs.readFileSync(limitFileName, 'utf8');
                }
                
                // Nếu chưa lưu chu kỳ này, thì lưu mới
                if (!fileContent.includes(`Chu kỳ | ${prevDrawId}`)) {
                    const resultType = predictionValue >= 5 ? "Tài" : "Xỉu";
                    const actualType = actualNumber >= 5 ? "Tài" : "Xỉu";
                    const isCorrect = (predictionValue >= 5) === (actualNumber >= 5);
                    
                    const newLine = `Chu kỳ | ${prevDrawId} | ${previousPrediction.timeVN} | Số thực tế: ${actualNumber} (${actualType}) | Số dự đoán: ${predictionValue} (${resultType}) | Vị trí: ${index} | ${isCorrect ? "Đúng" : "Sai"}`;
                    
                    fs.appendFileSync(limitFileName, newLine + "\n");
                    console.log(`Đã cập nhật performance cho limit=${limitValue}: ${newLine}`);
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
            const actualNumber = Number(actualResultData.numbers[index]);
            const predictedNumber = previousPrediction.predictions[0];
            const isCorrect = (actualNumber >= 5) === (predictedNumber >= 5);
            
            const actualType = actualNumber >= 5 ? "Tài" : "Xỉu";
            const predictedType = predictedNumber >= 5 ? "Tài" : "Xỉu";
            const newLine = `Chu kỳ | ${prevDrawId} | ${previousPrediction.timeVN} | Số thực tế: ${actualNumber} (${actualType}) | Số dự đoán: ${predictedNumber} (${predictedType}) | Vị trí: ${index} | Limit được chọn: ${previousPrediction.limits.main} | ${isCorrect ? "Đúng" : "Sai"}`;
            
            fs.appendFileSync(combinedFileName, newLine + '\n');
            console.log(`Đã cập nhật file performance tổng hợp`);
        } else {
            console.log(`Chu kỳ ${prevDrawId} đã được lưu trong file tổng hợp`);
        }
    } else {
        console.log(`❌ KHÔNG tìm thấy kết quả cho chu kỳ: ${prevDrawId}`);
        return false;
    }
}

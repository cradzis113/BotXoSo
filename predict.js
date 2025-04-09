// Thêm dòng này ở đầu file, cùng với các import khác
const fs = require('fs');

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

// Hàm này kiểm tra xem file có mới được tạo không
function isNewlyCreatedFile(filePath) {
        const fs = require('fs');
    try {
        // Kiểm tra file có tồn tại không
        if (!fs.existsSync(filePath)) {
            return true;
        }
        
        // Đọc nội dung file
        const content = fs.readFileSync(filePath, 'utf8');
        // Nếu chỉ có header hoặc nội dung trống, coi là file mới
        const contentLines = content.trim().split('\n');
        return contentLines.length <= 2; // Header + 1 dòng trống
    } catch (error) {
        console.error("Lỗi khi kiểm tra file:", error);
        return true; // Nếu có lỗi, coi là file mới
    }
}

function formatTimeVN(drawId) {
    // Format: YYYYMMDDHHII -> DD/MM/YYYY HH:mm:ss AM/PM
    const year = drawId.substring(0, 4);
    const month = drawId.substring(4, 6);
    const day = drawId.substring(6, 8);
    const hour = parseInt(drawId.substring(8, 10));
    const minute = Math.floor((parseInt(drawId.substring(10, 12)) - 1) * 0.45);
    
    // Chuyển đổi sang 12h format
    let hour12 = hour;
    let period = 'AM';
    if (hour >= 12) {
        period = 'PM';
        if (hour > 12) hour12 = hour - 12;
    }
    if (hour === 0) hour12 = 12;

    return `${day}/${month}/${year} ${hour12.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00 ${period}`;
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
                const content = fs.readFileSync(fileName, 'utf8');
                const lines = content.split('\n').filter(line => line.includes('Chu kỳ |'));
                
                // Lấy 20 kết quả gần nhất để phân tích
                const recentResults = lines.slice(-20);
                const totalPredictions = recentResults.length;
                const correctPredictions = recentResults.filter(line => line.includes('| Đúng')).length;
                
                // Tính hiệu suất và số lần đúng liên tiếp
                const accuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;
                let consecutiveCorrect = 0;
                for (let i = recentResults.length - 1; i >= 0; i--) {
                    if (recentResults[i].includes('| Đúng')) {
                        consecutiveCorrect++;
                    } else {
                        break;
                    }
                }
                
                limitPerformance[limit] = {
                    accuracy,
                    consecutiveCorrect,
                    totalPredictions,
                    correctPredictions
                };
            } catch (error) {
                console.error(`Lỗi khi đọc file limit ${limit}:`, error);
            }
        }
    }
    
    return limitPerformance;
}

// Thêm hàm để chọn limit tốt nhất
function selectBestLimit(performanceData) {
    let bestLimit = 15; // Mặc định
    let bestScore = 0;
    
    for (const [limit, data] of Object.entries(performanceData)) {
        // Tính điểm dựa trên độ chính xác và số lần đúng liên tiếp
        const score = (data.accuracy * 0.7) + (data.consecutiveCorrect * 0.05);
        
        // Chỉ xem xét nếu có đủ dữ liệu (ít nhất 10 dự đoán)
        if (data.totalPredictions >= 10 && score > bestScore) {
            bestScore = score;
            bestLimit = parseInt(limit);
        }
    }
    
    return {
        limit: bestLimit,
        score: bestScore
    };
}

// Thêm hàm mới để đọc và phân tích file performance analysis
function getOptimalLimit(fileConfig) {
    try {
        const fs = require('fs');
        const analysisPath = `${fileConfig[0]}_performance_analysis.log`;
        
        if (fs.existsSync(analysisPath)) {
            const content = fs.readFileSync(analysisPath, 'utf8');
            const analysis = JSON.parse(content);
            
            // Kiểm tra xem có dữ liệu phân tích không
            if (analysis && analysis.performanceByLimit && analysis.bestLimit) {
                // Kiểm tra điểm số của limit tốt nhất
                const score = parseFloat(analysis.bestLimit.score);
                if (score >= 60) { // Chỉ chuyển đổi nếu điểm số >= 60%
                    return {
                        limit: parseInt(analysis.bestLimit.limit),
                        score: score,
                        timestamp: analysis.timestamp
                    };
                }
            }
        }
        return null;
    } catch (error) {
        console.error("Lỗi khi đọc file phân tích:", error);
        return null;
    }
}

// Sửa đổi hàm updatePerformanceFile
function updatePerformanceFile(fileConfig, index, limit, predictedNumber, actualNumber, drawId, timeVN) {
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
    
    // Cập nhật file limit - LUÔN ghi kể cả là lần đầu
    if (!fs.existsSync(limitPath)) {
        const header = `# File Performance với Limit=${limit.limitMain} và Index=${index}\n\n`;
        fs.writeFileSync(limitPath, header + limitLine + "\n", 'utf8');
        console.log(`Đã tạo file ${limitPath} và ghi chu kỳ đầu tiên`);
    } else if (!fs.readFileSync(limitPath, 'utf8').includes(`Chu kỳ | ${drawId}`)) {
        fs.appendFileSync(limitPath, limitLine + "\n");
        console.log(`Đã thêm chu kỳ ${drawId} vào file ${limitPath}`);
    }
    
    // Cập nhật file combined - LUÔN ghi kể cả là lần đầu
    const combinedPath = `${fileConfig[0]}_combined_performance.log`;
    const limitInfo = `| Limit: ${limit.limitMain}`;
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

function getNextDrawId(currentDrawId) {
    // Lấy số cuối của drawId và tăng lên 1
    const prefix = currentDrawId.slice(0, -2);
    const sequence = parseInt(currentDrawId.slice(-2)) + 1;
    return `${prefix}${sequence.toString().padStart(2, '0')}`;
}

/**
 * Dự đoán số tiếp theo và tự động học từ file performance
 */
async function predictNumbers(history, index = 0, limit = { limitList: [5, 10, 15], limitMain: 15 }, fileConfig = ["taixiu_history", true], log = false) {
    try {
        // Validate input params
        const validatedParams = validateInputParams(history, index, limit, fileConfig);
        if (!validatedParams.isValid) {
            console.error("Params không hợp lệ:", validatedParams.error);
            throw new Error(validatedParams.error);
        }

        // Phân tích hiệu suất của các limit
        const performanceData = analyzePerformanceByLimit(fileConfig, index);
        const bestLimit = selectBestLimit(performanceData);
        
        // Log chi tiết hiệu suất
        console.log("=== PHÂN TÍCH HIỆU SUẤT ===");
        Object.entries(performanceData).forEach(([limit, data]) => {
            console.log(`\nLimit ${limit}:`);
            console.log(`- Tỷ lệ đúng: ${(data.accuracy * 100).toFixed(2)}%`);
            console.log(`- Số lần đúng liên tiếp: ${data.consecutiveCorrect}`);
            console.log(`- Tổng số dự đoán: ${data.totalPredictions}`);
            console.log(`- Số lần đúng: ${data.correctPredictions}`);
            console.log(`- Hiệu suất: ${((data.correctPredictions / data.totalPredictions) * 100).toFixed(2)}%`);
        });

        console.log("\n=== KẾT QUẢ CHỌN LIMIT ===");
        console.log(`- Limit tốt nhất: ${bestLimit.limit}`);
        console.log(`- Điểm số: ${(bestLimit.score * 100).toFixed(2)}%`);

        // Lưu kết quả phân tích vào file
        const analysisContent = {
            timestamp: new Date().toISOString(),
            timeVN: getVietnamTimeNow(),
            performanceByLimit: performanceData,
            bestLimit: {
                limit: bestLimit.limit,
                score: (bestLimit.score * 100).toFixed(2) + "%"
            }
        };
        
        fs.writeFileSync(
            `${fileConfig[0]}_performance_analysis.log`,
            JSON.stringify(analysisContent, null, 2),
            'utf8'
        );

        // Sử dụng limit tốt nhất nếu điểm số đủ cao
        const effectiveLimit = bestLimit.score > 0.6 ? bestLimit.limit : validatedParams.limit.limitMain;
        validatedParams.limit.limitMain = effectiveLimit;

        if (!history || !Array.isArray(history) || history.length === 0) {
            console.log("History không hợp lệ hoặc rỗng");
            return {
                predictions: [0],
                stats: { accuracy: 0, consecutiveWrong: 0 },
                timestamp: new Date().toISOString(),
                timeVN: getVietnamTimeNow(log),
                drawId: "000000000000",
                votes: { tài: 0, xỉu: 0 },
                strategies: [],
                indexPredicted: index,
                limits: {
                    main: effectiveLimit,
                    originalMain: limit.limitMain,
                    effective: [],
                    all: limit.limitList,
                    predictions: {}
                }
            };
        }

        // Lấy drawId hiện tại và LUÔN tính drawId tiếp theo
        const currentData = history[0];
        if (!currentData || !currentData.drawId) {
            console.error("Không tìm thấy drawId trong history");
            throw new Error("Không tìm thấy drawId trong history");
        }

        // LUÔN tính nextDrawId cho chu kỳ tiếp theo, bất kể có file prediction hay không
        const currentDrawId = currentData.drawId;
        const prefix = currentDrawId.slice(0, -2);
        const currentSequence = parseInt(currentDrawId.slice(-2));
        const nextSequence = currentSequence + 1;
        const nextDrawId = `${prefix}${nextSequence.toString().padStart(2, '0')}`;

        // Thu thập dự đoán từ các limit
        const limitPredictions = {};
        const allStrategies = new Set();
        for (const l of validatedParams.limit.limitList) {
            const result = predictWithLimit(history, index, { limitMain: l });
            limitPredictions[l] = result.predictions[0];
            result.strategies.forEach(s => allStrategies.add(s));
        }

        // Lấy kết quả từ limitMain
        const mainResult = predictWithLimit(history, index, { limitMain: effectiveLimit });

        // Tạo kết quả cuối cùng, LUÔN sử dụng nextDrawId
        const finalResult = {
            predictions: mainResult.predictions,
            stats: mainResult.stats,
            timestamp: new Date().toISOString(),
            timeVN: getVietnamTimeNow(),
            drawId: nextDrawId,  // Luôn sử dụng nextDrawId
            votes: mainResult.votes,
            strategies: Array.from(allStrategies),
            indexPredicted: index,
            limits: {
                main: effectiveLimit,
                originalMain: limit.limitMain,
                effective: [],
                all: validatedParams.limit.limitList,
                predictions: limitPredictions
            }
        };

        // Ghi file prediction và performance
        try {
            // Ghi prediction mới
            const predictionFilePath = `${fileConfig[0]}.prediction`;
            const predictionContent = JSON.stringify(finalResult, null, 2);
            fs.writeFileSync(predictionFilePath, predictionContent, 'utf8');
            
            // Kiểm tra và ghi performance nếu có history
            if (history && history.length > 1) {
                // Lấy kết quả thực tế từ history[0] (kết quả hiện tại)
                const currentResult = history[0];
                if (currentResult && currentResult.numbers && currentResult.drawId) {
                    const actualNumber = Number(currentResult.numbers[index]);
                    
                    // Đọc file prediction cũ
                    if (fs.existsSync(predictionFilePath)) {
                        try {
                            const oldPredictionContent = fs.readFileSync(predictionFilePath, 'utf8');
                            const oldPrediction = JSON.parse(oldPredictionContent);
                            
                            // Ghi performance cho mỗi limit
                            for (const l of validatedParams.limit.limitList) {
                                if (oldPrediction.limits && oldPrediction.limits.predictions && oldPrediction.limits.predictions[l] !== undefined) {
                                    updatePerformanceFile(
                                        fileConfig,
                                        index,
                                        { limitMain: l },
                                        oldPrediction.limits.predictions[l],
                                        actualNumber,
                                        currentResult.drawId,  // Sử dụng drawId hiện tại
                                        currentResult.timeVN || getVietnamTimeNow()
                                    );
                                }
                            }
                        } catch (error) {
                            console.error("Lỗi khi đọc/xử lý file prediction cũ:", error);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Lỗi khi ghi file:", error);
        }

        // Cập nhật thông tin limit trong kết quả
        finalResult.limits = {
            ...finalResult.limits,
            main: effectiveLimit,
            originalMain: limit.limitMain,
            bestLimit: {
                limit: bestLimit.limit,
                score: (bestLimit.score * 100).toFixed(2) + "%"
            }
        };

        return finalResult;
    } catch (error) {
        console.error("Lỗi trong predictNumbers:", error);
        throw error;
    }
}

// Hàm tính toán votes dựa trên tất cả các dự đoán
function calculateVotes(limitPredictions) {
    let taiCount = 0;
    let xiuCount = 0;

    Object.values(limitPredictions).forEach(prediction => {
        if (prediction >= 5) {
            taiCount++;
    } else {
            xiuCount++;
        }
    });

        return {
        tài: taiCount,
        xỉu: xiuCount
    };
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
    // Thu thập dự đoán từ các mô hình
    const predictions = [];
    const strategies = [];
    
    // 1. Markov Predictor
    const markovPred = enhancedMarkovPredictor(history, index);
    if (markovPred !== null) {
        predictions.push({
            number: markovPred,
            weight: 0.25,
            source: 'markov'
        });
        strategies.push('Sử dụng Markov Chain');
    }
    
    // 2. Trend Reversal
    const trendPred = enhancedTrendReversalPredictor(history, index);
    if (trendPred !== null) {
        predictions.push({
            number: trendPred,
            weight: 0.25,
            source: 'trend'
        });
        strategies.push('Phân tích xu hướng đảo chiều');
    }
    
    // 3. Pattern Recognition
    const patternPred = patternRecognitionPredictor(history, 5);
    if (patternPred !== null) {
        predictions.push({
            number: patternPred,
            weight: 0.2,
            source: 'pattern'
        });
        strategies.push('Nhận dạng mẫu');
    }
    
    // 4. Statistical Analysis
    const statPred = statisticalAnalysisPredictor(history, 20);
    if (statPred !== null) {
        predictions.push({
            number: statPred,
            weight: 0.2,
            source: 'statistical'
        });
        strategies.push('Phân tích thống kê');
    }
    
    // 5. Anomaly Detection
    const anomalyPred = anomalyFilterPredictor(history, index);
    if (anomalyPred !== null) {
        predictions.push({
            number: anomalyPred,
            weight: 0.1,
            source: 'anomaly'
        });
        strategies.push('Phát hiện bất thường');
    }

    // Tính toán dự đoán cuối cùng
    let finalNumber;
    if (predictions.length > 0) {
        let weightedSum = 0;
        let totalWeight = 0;
        
        predictions.forEach(pred => {
            weightedSum += pred.number * pred.weight;
            totalWeight += pred.weight;
        });
        
        finalNumber = Math.round(weightedSum / totalWeight);
    } else {
        finalNumber = getLuckyNumberInRange(0, 9);
        strategies.push('Dự đoán ngẫu nhiên (không đủ dữ liệu)');
    }

    // Đếm votes
    const votes = {
        'tài': predictions.filter(p => p.number >= 5).length,
        'xỉu': predictions.filter(p => p.number < 5).length
    };

    return {
        predictions: [finalNumber],
        stats: {
            accuracy: 0,
            consecutiveWrong: 0
        },
        votes: votes,
        strategies: strategies,
        details: {
            predictions: predictions,
            limit: limit.limitMain
        }
    };
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

function enhancedTimePerformanceAnalysis(history, index = 0, fileConfig, limitConfig) {
    console.log("Bắt đầu phân tích thời gian cho index:", index);
    
    // Tạo cấu trúc dữ liệu mặc định
    const defaultData = {
        bestTimes: {
            hourly: { time: "", accuracy: 0, sampleCount: 0 },
            weekday: { time: "", accuracy: 0, sampleCount: 0 },
            timeOfDay: { time: "", accuracy: 0, sampleCount: 0 },
            date: { time: "", accuracy: 0, sampleCount: 0 }
        },
        isOptimalTime: { hourly: false, weekday: false, timeOfDay: false },
        isOverallOptimalTime: false,
        performanceData: {
            hourly: {},
            weekday: {},
            timeOfDay: { 
                morning: { total: 0, correct: 0 },
                afternoon: { total: 0, correct: 0 },
                evening: { total: 0, correct: 0 },
                night: { total: 0, correct: 0 }
            },
            date: {}
        }
    };
    
    let data = defaultData;
    
    try {
        // Đọc dữ liệu hiện có nếu file tồn tại
        if (fs.existsSync('taixiu_history_time_analysis.log')) {
            const content = fs.readFileSync('taixiu_history_time_analysis.log', 'utf8');
            if (content && content.trim() !== '{}' && content.trim() !== '') {
                data = JSON.parse(content);
            }
        }
        
        // Đọc dữ liệu từ các file performance
        console.log("Đọc dữ liệu từ các file performance...");
        
        // Đọc từ file combined performance
        if (fs.existsSync('taixiu_history_combined_performance.log')) {
            const combinedPerf = fs.readFileSync('taixiu_history_combined_performance.log', 'utf8');
            // Xử lý dữ liệu combined performance
            processPerformanceData(combinedPerf, data);
        }
        
        // Đọc từ các file limit khác nhau
        const limits = limitConfig?.limitList || [5, 10, 15];
        for (const limit of limits) {
            const filename = `taixiu_history_index${index}_limit${limit}.performance`;
            if (fs.existsSync(filename)) {
                const limitPerf = fs.readFileSync(filename, 'utf8');
                // Xử lý dữ liệu limit performance
                processPerformanceData(limitPerf, data);
            }
        }
        
        console.log("Phân tích thời gian hoàn tất:", Object.keys(data.performanceData.hourly).length, "giờ được phân tích");
        
        // Trả về dữ liệu đã xử lý
        return data;
    } catch (error) {
        console.error("Lỗi trong enhancedTimePerformanceAnalysis:", error);
        // Trả về dữ liệu mặc định khi có lỗi, KHÔNG trả về object rỗng
        return defaultData;
    }
}

// Hàm phụ trợ để xử lý dữ liệu từ file performance
function processPerformanceData(content, data) {
    // Khởi tạo nếu chưa có
    if (!data.performanceData) {
        data.performanceData = {
            hourly: {},
            weekday: {},
            timeOfDay: { morning: { total: 0, correct: 0 }, afternoon: { total: 0, correct: 0 }, 
                        evening: { total: 0, correct: 0 }, night: { total: 0, correct: 0 } },
            date: {}
        };
    }
    
    // Tách các dòng
    const lines = content.split('\n');
    
    // Phân tích từng dòng
    for (const line of lines) {
        if (line.includes('Chu kỳ') && line.includes('|')) {
            // Phân tích thời gian và kết quả
            const parts = line.split('|');
            if (parts.length >= 4) {
                const timeStr = parts[2].trim(); // "07/04/2025 3:43:02 PM"
                const isCorrect = line.includes('Đúng');
                
                if (timeStr) {
                    try {
                        const date = new Date(timeStr);
                        
                        // Phân tích giờ
                        const hour = date.getHours();
                        const hourKey = hour === 0 ? "12 AM" : (hour < 12 ? `${hour} AM` : (hour === 12 ? "12 PM" : `${hour-12} PM`));
                        
                        // Phân tích ngày trong tuần
                        const weekday = getWeekdayName(date.getDay());
                        
                        // Phân tích thời điểm trong ngày
                        let timeOfDay = "morning";
                        if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
                        else if (hour >= 17 && hour < 20) timeOfDay = "evening";
                        else if (hour >= 20 || hour < 6) timeOfDay = "night";
                        
                        // Phân tích ngày
                        const dateKey = `${date.getMonth()+1}/${date.getDate()}`;
                        
                        // Cập nhật dữ liệu hourly
                        if (!data.performanceData.hourly[hourKey]) {
                            data.performanceData.hourly[hourKey] = { total: 0, correct: 0 };
                        }
                        data.performanceData.hourly[hourKey].total++;
                        if (isCorrect) data.performanceData.hourly[hourKey].correct++;
                        
                        // Cập nhật dữ liệu weekday
                        if (!data.performanceData.weekday[weekday]) {
                            data.performanceData.weekday[weekday] = { total: 0, correct: 0 };
                        }
                        data.performanceData.weekday[weekday].total++;
                        if (isCorrect) data.performanceData.weekday[weekday].correct++;
                        
                        // Cập nhật dữ liệu timeOfDay
                        data.performanceData.timeOfDay[timeOfDay].total++;
                        if (isCorrect) data.performanceData.timeOfDay[timeOfDay].correct++;
                        
                        // Cập nhật dữ liệu date
                        if (!data.performanceData.date[dateKey]) {
                            data.performanceData.date[dateKey] = { total: 0, correct: 0 };
                        }
                        data.performanceData.date[dateKey].total++;
                        if (isCorrect) data.performanceData.date[dateKey].correct++;
                        
    } catch (error) {
                        console.error("Lỗi khi phân tích thời gian:", timeStr, error);
                    }
                }
            }
        }
    }
    
    // Cập nhật bestTimes
    data.bestTimes.hourly = findBestPerformanceTime(data.performanceData.hourly);
    data.bestTimes.weekday = findBestPerformanceTime(data.performanceData.weekday);
    data.bestTimes.timeOfDay = findBestPerformanceTime(data.performanceData.timeOfDay);
    data.bestTimes.date = findBestPerformanceTime(data.performanceData.date);
    
    return data;
}

// Hàm hỗ trợ tìm thời điểm hiệu quả nhất
function findBestPerformanceTime(timeData, minSamples = 5, weightRecent = true) {
    let bestTime = '';
    let bestAccuracy = 0;
    let bestScore = 0;
    
    // Tạo danh sách thời gian và sắp xếp theo số lượng mẫu
    const times = Object.entries(timeData).sort((a, b) => b[1].total - a[1].total);
    
    for (const [time, stats] of times) {
        if (stats.total >= minSamples) {
            const accuracy = stats.correct / stats.total;
            
            // Tính điểm tổng hợp (kết hợp độ chính xác và số mẫu)
            const confidence = 1 - (1 / Math.sqrt(stats.total)); // Độ tin cậy tăng theo căn bậc hai của số mẫu
            const recentBonus = weightRecent && time.includes("PM") ? 0.05 : 0; // Ưu tiên dữ liệu gần đây
            const score = accuracy * (0.7 + 0.3 * confidence) + recentBonus;
            
            // So sánh điểm tổng hợp thay vì chỉ so sánh accuracy
            if (score > bestScore) {
                bestScore = score;
                bestAccuracy = accuracy;
                bestTime = time;
            }
        }
    }
    
    // Thêm thông tin chi tiết hơn để phân tích
    return {
        time: bestTime,
        accuracy: bestAccuracy,
        sampleCount: bestTime ? timeData[bestTime].total : 0,
        score: bestScore,
        confidence: bestTime ? 1 - (1 / Math.sqrt(timeData[bestTime].total)) : 0
    };
}

function enhancedEnsemblePredictor(history, index = 0, timeData = null) {
    // Thu thập dự đoán từ nhiều bộ dự đoán khác nhau
    const preds = [
        patternRecognitionPredictor(history, 5), // Tăng độ dài mẫu
        statisticalAnalysisPredictor(history, 30), // Tăng cửa sổ phân tích
        markovChainPredictor(history, index),
        trendReversalPredictor(history, index),
        alternatingPatternPredictor(history, index)
    ];
    
    // Trọng số động dựa trên hiệu suất gần đây
    let weights = [0.25, 0.2, 0.2, 0.2, 0.15]; // Trọng số mặc định
    
    // Điều chỉnh trọng số dựa trên thời gian nếu có dữ liệu
    if (timeData) {
        const now = getVietnamTimeNow();
        const hour = now.getHours();
        const hourKey = hour === 0 ? "12 AM" : (hour < 12 ? `${hour} AM` : (hour === 12 ? "12 PM" : `${hour-12} PM`));
        
        // Nếu đang ở thời điểm tốt, tăng trọng số cho pattern recognition
        if (timeData.bestTimes?.hourly?.time === hourKey) {
            weights[0] += 0.1; // Tăng trọng số cho pattern
            weights[1] -= 0.05; // Giảm trọng số cho statistical
            weights[2] -= 0.05; // Giảm trọng số cho markov
        }
    }
    
    // Đếm số lượng dự đoán cho mỗi loại
    let countTai = 0;
    let countXiu = 0;
    
    // Áp dụng trọng số
    for (let i = 0; i < preds.length; i++) {
        const pred = preds[i].prediction;
        const isTai = pred > 3; // Tài: 4-9, Xỉu: 0-3
        
        if (isTai) {
            countTai += weights[i];
        } else {
            countXiu += weights[i];
        }
    }
    
    // Thêm yếu tố ngẫu nhiên nhỏ để tránh bị mắc kẹt trong mẫu
    const randomFactor = Math.random() * 0.1; // Tối đa 10% ngẫu nhiên
    
    // Quyết định cuối cùng
    let finalPrediction;
    if (Math.abs(countTai - countXiu) < 0.15) {
        // Nếu quá gần nhau, chọn theo xu hướng gần đây
        const recentTrend = analyzeTrendDirection(history.slice(-10).map(h => getNumberFromHistory(h)));
        finalPrediction = recentTrend === "tăng" ? 6 : 2; // Tài hoặc Xỉu điển hình
    } else {
        // Nếu có sự khác biệt rõ ràng, chọn theo đa số có trọng số
        finalPrediction = (countTai > countXiu + randomFactor) ? 6 : 2;
    }
    
    return {
        prediction: finalPrediction,
        confidence: Math.abs(countTai - countXiu) * 100, // Độ tin cậy dựa trên mức độ đồng thuận
        details: { countTai, countXiu, weights }
    };
}

function advancedTimePerformanceAnalysis(history, index = 0, fileConfig) {
    // Đọc dữ liệu từ taixiu_history_time_analysis.log
    let data = {};
    try {
        if (fs.existsSync('taixiu_history_time_analysis.log')) {
            data = JSON.parse(fs.readFileSync('taixiu_history_time_analysis.log', 'utf8'));
        }
    } catch (error) {
        console.error("Lỗi khi đọc file phân tích thời gian:", error);
        data = createDefaultTimeAnalysisStructure();
    }
    
    // Phân tích chi tiết hơn
    // 1. Phân tích theo phút (chi tiết hơn giờ)
    if (!data.performanceData.minute) {
        data.performanceData.minute = {};
    }
    
    // 2. Phân tích theo khoảng thời gian (ví dụ: 5 phút một)
    if (!data.performanceData.timeBlock) {
        data.performanceData.timeBlock = {};
    }
    
    // 3. Phân tích theo kết hợp giờ và thứ
    if (!data.performanceData.hourDayCombo) {
        data.performanceData.hourDayCombo = {};
    }
    
    // Phân tích kết quả gần đây để tìm xu hướng mới nhất
    const recentResults = history.slice(-100); // 100 kết quả gần nhất
    let recentCorrect = 0;
    
    // TODO: Xử lý recentResults để tính toán recentCorrect
    
    // Thêm dữ liệu xu hướng mới nhất
    data.recentPerformance = {
        accuracy: recentCorrect / 100,
        sampleCount: 100
    };
    
    // Phân tích theo dãy (streak) Tài/Xỉu
    if (!data.streakAnalysis) {
        data.streakAnalysis = {
            taiAfterTaiStreak: {}, // Tỷ lệ Tài sau streak Tài
            xiuAfterXiuStreak: {}, // Tỷ lệ Xỉu sau streak Xỉu
            taiAfterXiuStreak: {}, // Tỷ lệ Tài sau streak Xỉu
            xiuAfterTaiStreak: {}  // Tỷ lệ Xỉu sau streak Tài
        };
    }
    
    return data;
}

// Function phụ trợ để tạo cấu trúc mặc định
function createDefaultTimeAnalysisStructure() {
    return {
        bestTimes: {
            hourly: { time: "", accuracy: 0, sampleCount: 0 },
            weekday: { time: "", accuracy: 0, sampleCount: 0 },
            timeOfDay: { time: "", accuracy: 0, sampleCount: 0 },
            date: { time: "", accuracy: 0, sampleCount: 0 },
            minute: { time: "", accuracy: 0, sampleCount: 0 },
            timeBlock: { time: "", accuracy: 0, sampleCount: 0 },
            hourDayCombo: { time: "", accuracy: 0, sampleCount: 0 }
        },
        isOptimalTime: {
            hourly: false,
            weekday: false,
            timeOfDay: false,
            minute: false,
            timeBlock: false,
            hourDayCombo: false
        },
        isOverallOptimalTime: false,
        performanceData: {
            hourly: {},
            weekday: {},
            timeOfDay: { 
                morning: { total: 0, correct: 0 },
                afternoon: { total: 0, correct: 0 },
                evening: { total: 0, correct: 0 },
                night: { total: 0, correct: 0 }
            },
            date: {},
            minute: {},
            timeBlock: {},
            hourDayCombo: {}
        },
        recentPerformance: {
            accuracy: 0,
            sampleCount: 0
        },
        streakAnalysis: {
            taiAfterTaiStreak: {},
            xiuAfterXiuStreak: {},
            taiAfterXiuStreak: {},
            xiuAfterTaiStreak: {}
        }
    };
}

function smartBettingStrategy(history, timeAnalysis) {
    // Phân tích hiệu suất hiện tại
    const now = getVietnamTimeNow();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const weekday = getWeekdayName(now.getDay());
    const hourKey = hour === 0 ? "12 AM" : (hour < 12 ? `${hour} AM` : (hour === 12 ? "12 PM" : `${hour-12} PM`));
    
    // Xác định mức độ tin cậy của dự đoán hiện tại
    let confidence = 0.5; // Mặc định: tin cậy trung bình
    
    // Kiểm tra xem có đang ở thời điểm tốt không
    if (timeAnalysis.bestTimes.hourly.time === hourKey && timeAnalysis.bestTimes.hourly.accuracy > 0.55) {
        confidence += 0.1;
    }
    
    // Kiểm tra thời điểm tốt theo thứ
    if (timeAnalysis.bestTimes.weekday.time === weekday && timeAnalysis.bestTimes.weekday.accuracy > 0.55) {
        confidence += 0.05;
    }
    
    // Kiểm tra xu hướng gần đây
    const recentTrend = analyzeRecentResults(history, 20);
    if (recentTrend.accuracy > 0.6) {
        confidence += 0.1;
    }
    
    // Chỉ nên đặt cược khi độ tin cậy cao
    const shouldBet = confidence > 0.6;
    
    // Đề xuất mức cược (tính theo đơn vị cơ bản)
    let betAmount = 1; // Mức cược mặc định
    
    if (confidence > 0.7) {
        betAmount = 2; // Tăng mức cược khi độ tin cậy cao
    }
    
    return {
        shouldBet, 
        confidence,
        betAmount,
        bestTimeOfDay: timeAnalysis.bestTimes.timeOfDay.time,
        bestHour: timeAnalysis.bestTimes.hourly.time,
        currentPerformance: {
            hour: timeAnalysis.performanceData.hourly[hourKey] || { total: 0, correct: 0 },
            weekday: timeAnalysis.performanceData.weekday[weekday] || { total: 0, correct: 0 }
        }
    };
}

// Thêm vào cuối file, trước CURRENT_CURSOR_POSITION
// Mô hình dự đoán mới: Kết hợp phân tích xác suất có điều kiện
function conditionalProbabilityPredictor(history, index = 0) {
    const recentNumbers = history.slice(Math.max(0, history.length - 100)).map(item => getNumberFromHistory(item, index));
    
    // Tính xác suất có điều kiện dựa trên chuỗi 3 số gần nhất
    const lastThree = recentNumbers.slice(-3);
    const pattern = lastThree.join('-');
    
    // Xây dựng bảng chuyển trạng thái
    const transitions = {};
    
    for (let i = 0; i < recentNumbers.length - 3; i++) {
        const currentPattern = recentNumbers.slice(i, i+3).join('-');
        const nextNumber = recentNumbers[i+3];
        
        if (!transitions[currentPattern]) {
            transitions[currentPattern] = {};
        }
        
        if (!transitions[currentPattern][nextNumber]) {
            transitions[currentPattern][nextNumber] = 0;
        }
        
        transitions[currentPattern][nextNumber]++;
    }
    
    // Dự đoán dựa trên xác suất cao nhất
    if (transitions[pattern]) {
        let maxCount = 0;
        let prediction = 0;
        
        Object.entries(transitions[pattern]).forEach(([num, count]) => {
            if (count > maxCount) {
                maxCount = count;
                prediction = parseInt(num);
            }
        });
        
        return prediction;
    }
    
    // Fallback nếu không tìm thấy mẫu
    return balancePredictor(recentNumbers);
}

// Mô hình phát hiện đảo chiều xu hướng nâng cao
function enhancedTrendReversalPredictor(history, index = 0) {
    const recentNumbers = history.slice(Math.max(0, history.length - 30)).map(item => getNumberFromHistory(item, index));
    const isTai = num => num >= 5; // Phân loại Tài/Xỉu
    
    // Chuyển đổi thành chuỗi Tài/Xỉu
    const taiXiuSeries = recentNumbers.map(isTai);
    
    // Đếm số lần xuất hiện liên tiếp
    let currentStreak = 1;
    let streaks = [];
    
    for (let i = 1; i < taiXiuSeries.length; i++) {
        if (taiXiuSeries[i] === taiXiuSeries[i-1]) {
            currentStreak++;
        } else {
            streaks.push({
                type: taiXiuSeries[i-1],
                length: currentStreak
            });
            currentStreak = 1;
        }
    }
    
    // Thêm streak cuối cùng
    streaks.push({
        type: taiXiuSeries[taiXiuSeries.length-1],
        length: currentStreak
    });
    
    // Phân tích xu hướng đảo chiều
    const lastType = taiXiuSeries[taiXiuSeries.length-1];
    
    // Tìm streaks tương tự trong lịch sử
    const similarStreaks = streaks.filter(s => s.type === lastType && s.length >= currentStreak);
    
    if (similarStreaks.length >= 3) {
        // Xu hướng đảo chiều có khả năng xảy ra
        return lastType ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }
    
    // Tiếp tục xu hướng hiện tại
    return lastType ? getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
}

/**
 * Phiên bản cải tiến của Markov Predictor, kết hợp với phân tích tần suất và xu hướng
 * @param {Array} history - Lịch sử các kết quả
 * @param {number} index - Vị trí cần dự đoán
 * @returns {number} - Số dự đoán
 */
function enhancedMarkovPredictor(history, index = 0) {
    const markovPrediction = markovChainPredictor(history, index);
    const frequencyAnalysis = numberFrequencyAnalysis(
        history.slice(-50).map(item => getNumberFromHistory(item, index))
    );
    
    // Phân tích xu hướng gần đây
    const taiXiuAnalysis = analyzeTaiXiu(history, [index]);
    
    // Nếu có xu hướng mạnh, có khả năng cao sẽ đảo chiều
    if (taiXiuAnalysis.strongTrend && taiXiuAnalysis.currentStreak >= 4) {
        // Nếu đang có streak dài (4+), có 70% khả năng đảo chiều
        return taiXiuAnalysis.currentType === 'Tài' ? 
            getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }
    
    // Kết hợp dự đoán
    if (Math.abs(frequencyAnalysis.taiRatio - 0.5) > 0.15) {
        // Nếu có sự mất cân bằng rõ rệt, sử dụng số xuất hiện ít hơn
        return frequencyAnalysis.taiRatio > 0.65 ? 
            getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }
    
    return markovPrediction;
}

/**
 * Lấy hiệu suất gần đây cho một limit cụ thể
 * @param {Array} fileConfig - Cấu hình file
 * @param {number} index - Vị trí cần phân tích
 * @param {number} limit - Limit cần phân tích
 * @param {number} count - Số lượng dự đoán gần nhất cần xem xét
 * @returns {number} - Tỷ lệ dự đoán đúng (0-1)
 */
function getRecentPerformance(fileConfig, index, limit, count = 20) {
    try {
        const fs = require('fs');
        const path = require('path');
        
        const fileName = `${fileConfig[0]}_index${index}_limit${limit}.performance`;
        let content = "";
        
        try {
            content = fs.readFileSync(fileName, 'utf8');
        } catch (error) {
            return 0.5; // Không có dữ liệu, trả về 0.5 (50%)
        }
        
        const lines = content.split('\n').filter(line => line.trim() !== '');
        const recentLines = lines.slice(-count);
        
        if (recentLines.length === 0) return 0.5;
        
        let correct = 0;
        recentLines.forEach(line => {
            if (line.includes('Đúng')) correct++;
        });
        
        return correct / recentLines.length;
    } catch (error) {
        console.error("Lỗi khi phân tích hiệu suất gần đây:", error);
        return 0.5;
    }
}

/**
 * Meta-predictor chọn mô hình tốt nhất dựa trên hiệu suất gần đây
 * @param {Array} history - Lịch sử các kết quả
 * @param {number} index - Vị trí cần dự đoán
 * @param {Array} fileConfig - Cấu hình file
 * @returns {number} - Số dự đoán
 */
function metaPredictor(history, index = 0, fileConfig) {
    // Phân tích tỷ lệ Tài/Xỉu gần đây
    const recentResults = history.slice(-20).map(item => getNumberFromHistory(item, index));
    const taiCount = recentResults.filter(num => num >= 5).length;
    const xiuCount = recentResults.length - taiCount;
    const taiRatio = taiCount / recentResults.length;
    
    // Lấy hiệu suất gần đây của từng limit
    const limit5Performance = getRecentPerformance(fileConfig, index, 5, 20);
    const limit10Performance = getRecentPerformance(fileConfig, index, 10, 20);
    const limit15Performance = getRecentPerformance(fileConfig, index, 15, 20);
    
    // Chọn limit có hiệu suất tốt nhất trong 20 dự đoán gần đây
    let bestLimit = 5;
    let bestPerformance = limit5Performance;
    
    if (limit10Performance > bestPerformance) {
        bestLimit = 10;
        bestPerformance = limit10Performance;
    }
    
    if (limit15Performance > bestPerformance) {
        bestLimit = 15;
    }
    
    // Nếu tất cả đều kém (dưới 55%), thử phương pháp đảo ngược
    if (bestPerformance < 0.55) {
        // Phân tích xu hướng
        const tailXiuAnalysis = analyzeTaiXiu(history, [index]);
        
        // Nếu có xu hướng mạnh (3+ số liên tiếp), dự đoán đảo chiều
        if (tailXiuAnalysis.strongTrend) {
            return tailXiuAnalysis.currentType === 'Tài' ? 
                getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
        }
        
        // Nếu có mất cân bằng rõ rệt trong phân phối, dự đoán số ít hơn
        if (Math.abs(taiRatio - 0.5) > 0.2) {
            return taiRatio > 0.6 ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
        }
        
        // Thử sử dụng enhancedMarkovPredictor
        return enhancedMarkovPredictor(history, index);
    }
    
    // Nếu không, sử dụng limit tốt nhất với predictWithLimit hoặc tự triển khai
    return predictWithLimit(history, index, { limitMain: bestLimit });
}

// Thêm hàm để format hiệu suất để dễ đọc
function formatPerformanceData(performanceData) {
    const result = {};
    for (const [limit, data] of Object.entries(performanceData)) {
        result[limit] = {
            tỷLệĐúng: `${(data.accuracy * 100).toFixed(2)}%`,
            đúngLiênTiếp: data.consecutiveCorrect,
            tổngDựĐoán: data.totalPredictions,
            sốLầnĐúng: data.correctPredictions,
            hiệuSuất: `${((data.correctPredictions / data.totalPredictions) * 100).toFixed(2)}%`
        };
    }
    return result;
}

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

// Sửa hàm để chọn limit tốt nhất (dùng history khi chưa đủ dữ liệu)
function selectBestLimit(performanceData, defaultLimit, history, index, limitList = [5, 10, 15]) {
    let bestLimit = defaultLimit;
    let bestScore = 0;

    // Tính toán từ performance data
    for (const [limit, data] of Object.entries(performanceData)) {
        const score = (data.accuracy * 0.7) + (data.consecutiveCorrect * 0.05);
        if (data.totalPredictions >= 10 && score > bestScore) {
            bestScore = score;
            bestLimit = parseInt(limit);
        }
    }

    // Nếu không có dữ liệu đủ trong file và có history, phân tích history
    if (bestScore === 0 && history && history.length > 0) {
        console.log("Không có đủ dữ liệu performance, phân tích trực tiếp từ history...");
        
        // Thử các limit trong limitList
        const limitScores = {};
        // Dùng limitList từ tham số hoặc dùng giá trị mặc định
        const limitsToTest = Array.isArray(limitList) && limitList.length > 0 ? limitList : [5, 10, 15];
        
        for (const limitValue of limitsToTest) {
            // Tạo bản sao lịch sử với độ dài giới hạn theo limit hiện tại
            const limitedHistory = history.slice(0, Math.min(limitValue, history.length));
            
            if (limitedHistory.length < 3) {
                console.log(`Bỏ qua limit=${limitValue} vì history quá ngắn (${limitedHistory.length})`);
                continue; // Bỏ qua nếu không đủ dữ liệu
            }
            
            // Tính hiệu suất cho limit này bằng cách đoán chu kỳ hiện tại dựa trên chu kỳ trước đó
            let correct = 0;
            let total = 0;
            
            for (let i = 0; i < limitedHistory.length - 1; i++) {
                try {
                    // Cần ít nhất 2 phần tử để dự đoán
                    if (i+1 >= limitedHistory.length) break;
                    
                    // Tạo history mẫu - bắt đầu từ phần tử thứ i+1
                    const testHistory = limitedHistory.slice(i + 1);
                    
                    // Mô phỏng dự đoán
                    const result = predictWithLimit(testHistory, index, { limitMain: limitValue });
                    
                    // Lấy kết quả thực tế
                    const actualNumber = Number(limitedHistory[i].numbers[index]);
                    const predictedNumber = result.predictions[0];
                    
                    // Kiểm tra dự đoán
                    const isCorrect = (predictedNumber >= 5) === (actualNumber >= 5);
                    if (isCorrect) correct++;
                    total++;
                    
                    // Dừng sau 10 lần kiểm tra
                    if (total >= 10) break;
                } catch (error) {
                    console.error(`Lỗi khi thử nghiệm limit=${limitValue}, lần thử i=${i}:`, error.message);
                    continue;
                }
            }
            
            // Tính score
            const accuracy = total > 0 ? correct / total : 0;
            const tmpScore = accuracy * 0.7; // Tương tự công thức trong file performance
            
            limitScores[limitValue] = tmpScore;
            console.log(`Limit=${limitValue}, Hiệu suất=${(tmpScore * 100).toFixed(2)}%, Đúng=${correct}/${total}`);
        }
        
        // Tìm limit có score cao nhất
        for (const [limitStr, score] of Object.entries(limitScores)) {
            if (score > bestScore) {
                bestScore = score;
                bestLimit = parseInt(limitStr);
            }
        }
        
        console.log(`Đã chọn limit=${bestLimit} với score=${(bestScore * 100).toFixed(2)}% từ phân tích trực tiếp`);
    }

    return {
        limit: bestLimit,
        score: bestScore > 0 ? bestScore : 0.5 // Nếu vẫn không có score, dùng 0.5
    };
}

// Sửa đổi hàm updatePerformanceFile
function updatePerformanceFile(fileConfig, index, limit, predictedNumber, actualNumber, drawId, timeVN) {
    if (actualNumber === null || actualNumber === undefined) {
        return;
    }

    const fs = require('fs');
    
    // Đọc file prediction để lấy giá trị dự đoán chính xác
    let correctPrediction = predictedNumber;
    const predictionFilePath = `${fileConfig[0]}.prediction`;
    
    if (fs.existsSync(predictionFilePath)) {
        try {
            const predictionData = JSON.parse(fs.readFileSync(predictionFilePath, 'utf8'));
            
            // Kiểm tra và lấy limit đúng - xử lý cả trường hợp limit là số hoặc object
            const limitValue = typeof limit === 'object' ? limit.limitMain : 
                              (typeof limit === 'number' ? limit : null);
            
            if (predictionData.drawId === drawId && 
                predictionData.limits && 
                predictionData.limits.predictions) {
                
                if (limitValue !== null && predictionData.limits.predictions[limitValue] !== undefined) {
                    correctPrediction = predictionData.limits.predictions[limitValue];
                    console.log(`Đã đọc giá trị dự đoán từ file: ${correctPrediction} cho limit ${limitValue}`);
                } else {
                    // Nếu không tìm thấy limit cụ thể, thử dùng dự đoán mặc định
                    console.log(`Không tìm thấy dự đoán cho limit ${limitValue}, dùng giá trị mặc định`);
                }
            }
        } catch (error) {
            console.error("Lỗi khi đọc file prediction:", error);
        }
    }

    // Cập nhật file performance cho limit cụ thể
    const limitPath = `${fileConfig[0]}_index${index}_limit${limit.limitMain}.performance`;
    const resultType = correctPrediction >= 5 ? "Tài" : "Xỉu";
    const actualType = actualNumber >= 5 ? "Tài" : "Xỉu";
    const isCorrect = (correctPrediction >= 5) === (actualNumber >= 5);

    // Tạo dòng mới cho file limit
    const limitLine = `Chu kỳ | ${drawId} | ${timeVN} | Số thực tế: ${actualNumber} (${actualType}) | Số dự đoán: ${correctPrediction} (${resultType}) | Vị trí: ${index} | ${isCorrect ? "Đúng" : "Sai"}`;

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
    const combinedLine = `Chu kỳ | ${drawId} | ${timeVN} | Số thực tế: ${actualNumber} (${actualType}) | Số dự đoán: ${correctPrediction} (${resultType}) | Vị trí: ${index} ${limitInfo} | ${isCorrect ? "Đúng" : "Sai"}`;

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
        const bestLimit = selectBestLimit(performanceData, validatedParams.limit.limitMain, history, index, validatedParams.limit.limitList);

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

        // Giảm ngưỡng xuống để dễ dàng hơn trong việc chọn limit tốt nhất
        const effectiveLimit = bestLimit.score > 0.4 ? bestLimit.limit : validatedParams.limit.limitMain;
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

        // Đọc file prediction cũ trước khi ghi đè
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
                        
                        // Cập nhật file performance cho từng limit riêng lẻ
                        for (const l of validatedParams.limit.limitList) {
                            if (previousPrediction.limits && 
                                previousPrediction.limits.predictions && 
                                previousPrediction.limits.predictions[l] !== undefined) {
                                
                                updateLimitPerformanceFile(
                                    fileConfig,
                                    index,
                                    { limitMain: l },
                                    previousPrediction.limits.predictions[l],
                                    actualNumber,
                                    actualResult.drawId,
                                    actualResult.timeVN || getVietnamTimeNow()
                                );
                            }
                        }

                        // CHỈ cập nhật file TỔNG HỢP với bestLimit
                        if (previousPrediction.limits && 
                            previousPrediction.limits.bestLimit && 
                            previousPrediction.limits.predictions) {
                            
                            // Lấy limit tốt nhất từ dự đoán trước đó
                            const bestLimit = previousPrediction.limits.bestLimit.limit;
                            
                            updateCombinedPerformanceFile(
                                fileConfig,
                                index,
                                bestLimit,
                                previousPrediction.limits.predictions[bestLimit],
                                actualNumber,
                                actualResult.drawId,
                                actualResult.timeVN || getVietnamTimeNow()
                            );
                        }
                    }
                }
            } catch (error) {
                console.error("Lỗi khi đọc file prediction cũ:", error);
            }
        }

        // Tạo kết quả mới cho chu kỳ tiếp theo
        const finalResult = {
            predictions: mainResult.predictions,
            stats: mainResult.stats,
            timestamp: new Date().toISOString(),
            timeVN: getVietnamTimeNow(),
            drawId: nextDrawId,
            votes: mainResult.votes,
            strategies: Array.from(allStrategies),
            indexPredicted: index,
            limits: {
                bestLimit: {
                    limit: bestLimit.limit,
                    score: (bestLimit.score * 100).toFixed(2) + "%"
                },
                all: validatedParams.limit.limitList,
                predictions: limitPredictions
            }
        };

        // Ghi prediction mới
        fs.writeFileSync(predictionFilePath, JSON.stringify(finalResult, null, 2));
        
        return finalResult;
    } catch (error) {
        console.error("Lỗi trong predictNumbers:", error);
        throw error;
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
 * Dự đoán dựa trên limit cụ thể
 */
function predictWithLimit(history, index, limit) {
    // Giới hạn history theo limit
    const limitedHistory = history.slice(0, limit.limitMain);
    
    // Truyền limitedHistory vào các thuật toán
    const markovPred = enhancedMarkovPredictor(limitedHistory, index);
    const trendPred = enhancedTrendReversalPredictor(limitedHistory, index);
    const patternPred = patternRecognitionPredictor(limitedHistory, 5);
    const statPred = statisticalAnalysisPredictor(limitedHistory, 20);
    const anomalyPred = anomalyFilterPredictor(limitedHistory, index);

    // Tính toán dự đoán cuối cùng
    let finalNumber;
    if (markovPred !== null || trendPred !== null || patternPred !== null || statPred !== null || anomalyPred !== null) {
        let weightedSum = 0;
        let totalWeight = 0;

        if (markovPred !== null) {
            weightedSum += markovPred * 0.25;
            totalWeight += 0.25;
        }
        if (trendPred !== null) {
            weightedSum += trendPred * 0.25;
            totalWeight += 0.25;
        }
        if (patternPred !== null) {
            weightedSum += patternPred * 0.2;
            totalWeight += 0.2;
        }
        if (statPred !== null) {
            weightedSum += statPred * 0.2;
            totalWeight += 0.2;
        }
        if (anomalyPred !== null) {
            weightedSum += anomalyPred * 0.1;
            totalWeight += 0.1;
        }

        finalNumber = Math.round(weightedSum / totalWeight);
    } else {
        finalNumber = getLuckyNumberInRange(0, 9);
    }

    // Đếm votes
    const votes = {
        'tài': [markovPred, trendPred, patternPred, statPred, anomalyPred].filter(n => n >= 5).length,
        'xỉu': [markovPred, trendPred, patternPred, statPred, anomalyPred].filter(n => n < 5).length
    };

    return {
        predictions: [finalNumber],
        stats: {
            accuracy: 0,
            consecutiveWrong: 0
        },
        votes: votes,
        strategies: [
            markovPred !== null ? 'Sử dụng Markov Chain' : null,
            trendPred !== null ? 'Phân tích xu hướng đảo chiều' : null,
            patternPred !== null ? 'Nhận dạng mẫu' : null,
            statPred !== null ? 'Phân tích thống kê' : null,
            anomalyPred !== null ? 'Phát hiện bất thường' : null
        ].filter(s => s !== null),
        details: {
            predictions: [markovPred, trendPred, patternPred, statPred, anomalyPred].filter(n => n !== null),
            limit: limit.limitMain
        }
    };
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
        if (taiXiuSeries[i] === taiXiuSeries[i - 1]) {
            currentStreak++;
        } else {
            streaks.push({
                type: taiXiuSeries[i - 1],
                length: currentStreak
            });
            currentStreak = 1;
        }
    }

    // Thêm streak cuối cùng
    streaks.push({
        type: taiXiuSeries[taiXiuSeries.length - 1],
        length: currentStreak
    });

    // Phân tích xu hướng đảo chiều
    const lastType = taiXiuSeries[taiXiuSeries.length - 1];

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


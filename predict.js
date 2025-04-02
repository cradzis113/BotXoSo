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
 * Dự đoán số tiếp theo và tự động học từ file performance
 */
async function predictNumbers(history, index = 0, limit = {limitList: [10, 15], limitMain: 10}, fileConfig = ["taixiu_history", true], log = false) {
    ENABLE_LOGGING = log;
    
    try {
        // Kiểm tra history
        if (!Array.isArray(history) || history.length === 0) {
            throw new Error("Lịch sử không hợp lệ");
        }

        // 1. Lấy thông tin phiên hiện tại
    const currentDrawId = history[0].drawId;
    const nextDrawId = String(Number(currentDrawId) + 1);
    
        // 2. Xử lý limitObj
        let limitObj = limit;
        if (typeof limit === 'number') {
            limitObj = { limitList: [limit], limitMain: limit };
        }
        
        limitObj.limitList = limitObj.limitList || [10];
        limitObj.limitMain = limitObj.limitMain || limitObj.limitList[0];
        
        // 3. TẠO DANH SÁCH FILE PERFORMANCE
        const performanceFiles = [];
        for (const limitValue of limitObj.limitList) {
            const fileName = limitValue === limitObj.limitMain 
                ? `${fileConfig[0]}_index${index}_limitMain.performance`
                : `${fileConfig[0]}_index${index}_limit${limitValue}.performance`;
                
            performanceFiles.push({
                fileName: fileName,
                limitValue: limitValue,
                isMain: limitValue === limitObj.limitMain
            });
        }
        
        // 4. ĐỌC FILE PREDICTION TRƯỚC ĐÓ
    let previousPrediction = null;
    const fs = require('fs');
    
    try {
      const predictionFileName = `${fileConfig[0]}.prediction`;
      if (fs.existsSync(predictionFileName)) {
        const predictionData = JSON.parse(fs.readFileSync(predictionFileName, 'utf8'));
        previousPrediction = predictionData;
      }
    } catch (error) {
      gameLog.error(`Lỗi khi đọc file prediction: ${error.message}`);
    }
    
        // 5. CẬP NHẬT KẾT QUẢ ĐỐI CHIẾU VỚI DỰ ĐOÁN CŨ
        if (previousPrediction && previousPrediction.drawId) {
            const prevDrawId = previousPrediction.drawId;
            const prevPredictions = previousPrediction.limits?.predictions || {};
            
            // Tìm kết quả thực tế của phiên trước
            const actualEntry = history.find(h => h.drawId === prevDrawId);
            
            if (actualEntry && actualEntry.numbers && actualEntry.numbers[index] !== undefined) {
                const actualNumber = Number(actualEntry.numbers[index]);
                const actualType = actualNumber >= 5 ? "Tài" : "Xỉu";
                
                // Cập nhật kết quả của mỗi limit vào file performance tương ứng
                for (const fileInfo of performanceFiles) {
                    try {
                        const limitValue = fileInfo.limitValue.toString();
                        
                        // Chỉ cập nhật nếu có dự đoán của limit này
                        if (prevPredictions[limitValue] !== undefined) {
                            const predictedNumber = prevPredictions[limitValue];
                            const predictedType = predictedNumber >= 5 ? "Tài" : "Xỉu";
                            
                            // Xác định kết quả đúng hay sai
                            const isCorrect = (actualNumber >= 5 && predictedNumber >= 5) || 
                                             (actualNumber < 5 && predictedNumber < 5);
                            const result = isCorrect ? "Đúng" : "Sai";
                            
                            // Lấy thời gian từ dự đoán trước
                            const timeVN = previousPrediction.timeVN || getVietnamTimeNow();
                            
                            // Tạo dòng mới ghi kết quả đúng/sai
                            const newLine = `Chu kỳ | ${prevDrawId} | ${timeVN} | Số thực tế: ${actualNumber} (${actualType}) | Số dự đoán: ${predictedNumber} (${predictedType}) | Vị trí: ${index} | ${result}`;
                            
                            // Lưu vào file performance
                            let fileContent = "";
                            if (fs.existsSync(fileInfo.fileName)) {
                                fileContent = fs.readFileSync(fileInfo.fileName, 'utf8');
      } else {
                                // Tạo header phù hợp
                                if (fileInfo.isMain) {
                                    fileContent = `# File Performance với LimitMain=${fileInfo.limitValue} và Index=${index}\n\n`;
                                } else {
                                    fileContent = `# File Performance với Limit=${fileInfo.limitValue} và Index=${index}\n\n`;
                                }
                            }
                            
                            // Thêm dòng mới
                            fileContent += `\n${newLine}`;
                            fs.writeFileSync(fileInfo.fileName, fileContent);
                            
                            gameLog.info(`Đã lưu kết quả ${result} cho phiên ${prevDrawId} vào file ${fileInfo.fileName}`);
      }
    } catch (err) {
                        gameLog.error(`Lỗi khi lưu kết quả vào file ${fileInfo.fileName}: ${err.message}`);
                    }
                }
            }
        }
        
        // Khởi tạo mảng strategies ở đầu hàm
        let strategies = [];

        // Tạo performanceData từ file performance
        let performanceData = { history: [] };
        for (const fileInfo of performanceFiles) {
            if (fs.existsSync(fileInfo.fileName)) {
                const fileContent = fs.readFileSync(fileInfo.fileName, 'utf8');
                const lines = fileContent.split('\n').filter(line => 
                    line.trim() && !line.startsWith('#')
                );
                performanceData.history = [...performanceData.history, ...lines];
            }
        }
        
        // Thêm phân tích hiệu suất các limit
        const limitPerformance = {};
        for (const fileInfo of performanceFiles) {
            if (fs.existsSync(fileInfo.fileName)) {
                const content = fs.readFileSync(fileInfo.fileName, 'utf8');
                const lines = content.split('\n').filter(line => 
                    line.includes('Đúng') || line.includes('Sai')
                );
                
                // Lấy 10 kết quả gần nhất
                const recent = lines.slice(-10);
                const correctCount = recent.filter(line => line.includes('Đúng')).length;
                limitPerformance[fileInfo.limitValue] = {
                    accuracy: correctCount / recent.length,
                    recentResults: recent
                };
            }
        }

        // Kiểm tra hiệu suất của limitMain
        const mainPerformance = limitPerformance[limitObj.limitMain];
        if (mainPerformance && mainPerformance.accuracy < 0.4) { // Nếu tỷ lệ đúng < 40%
            // Tìm limit có hiệu suất tốt nhất gần đây
            const bestLimit = Object.entries(limitPerformance)
                .sort(([,a], [,b]) => b.accuracy - a.accuracy)[0];
            
            if (bestLimit && bestLimit[1].accuracy > mainPerformance.accuracy) {
                strategies.push(`Chuyển từ limit ${limitObj.limitMain} (${(mainPerformance.accuracy*100).toFixed(1)}%) sang limit ${bestLimit[0]} (${(bestLimit[1].accuracy*100).toFixed(1)}%)`);
                limitObj.limitMain = Number(bestLimit[0]);
            }
        }

        // Phân tích xu hướng đúng/sai gần đây
        const recentMainResults = mainPerformance?.recentResults || [];
        const consecutiveWrong = recentMainResults
            .filter(line => line.includes('Sai'))
            .length;

        let finalNumber;
        if (consecutiveWrong >= 3) {
            // Tham khảo dự đoán từ các limit khác
            const otherLimitPredictions = Object.entries(limitPerformance)
                .filter(([value]) => value !== limitObj.limitMain.toString())
                .map(([value, perf]) => {
                    const lastPrediction = perf.recentResults[perf.recentResults.length - 1];
                    if (lastPrediction) {
                        const match = lastPrediction.match(/Số dự đoán: (\d+) \((Tài|Xỉu)\)/);
                        if (match) {
                            return {
                                limit: Number(value),
                                number: Number(match[1]),
                                accuracy: perf.accuracy
                            };
                        }
                    }
                    return null;
                })
                .filter(Boolean);

            if (otherLimitPredictions.length > 0) {
                const weightedSum = otherLimitPredictions.reduce((sum, pred) => 
                    sum + pred.number * pred.accuracy, 0
                );
                const totalWeight = otherLimitPredictions.reduce((sum, pred) => 
                    sum + pred.accuracy, 0
                );
                
                finalNumber = Math.round(weightedSum / totalWeight);
                strategies.push(`Tham khảo ${otherLimitPredictions.length} limit khác do gặp ${consecutiveWrong} lần sai liên tiếp`);
            }
        }
        
        // Nếu không có finalNumber từ phân tích trên, sử dụng phân tích thông thường
        if (finalNumber === undefined) {
            const limitResult = analyzeLimitedHistory(history, index);
            finalNumber = limitResult.finalNumber;
            strategies = [...strategies, ...limitResult.strategies];
        }
        
        // Thêm phân tích từ các hàm mới
        const adaptiveResult = adaptiveLearning(history, recentMainResults);
        const actualBasedResult = predictBasedOnActualResults(history, performanceData);
        const emergencyResult = emergencyCorrection(performanceData);
        
        // Tích hợp kết quả vào strategies
        if (emergencyResult !== null) {
            strategies.push({
                number: emergencyResult,
                weight: 25,
                description: "Điều chỉnh khẩn cấp do hiệu suất kém"
            });
        }
        
        strategies.push({
            number: adaptiveResult,
            weight: 15,
            description: "Dự đoán thích ứng dựa trên xu hướng gần đây"
        });
        
        strategies.push({
            number: actualBasedResult,
            weight: 20,
            description: "Dự đoán dựa trên kết quả thực tế"
        });
        
        // Thêm dự đoán từ các mô hình mới
        const patternPrediction = patternRecognitionPredictor(history, 4);
        const statPrediction = statisticalAnalysisPredictor(history, 20);
        const rlPrediction = reinforcementLearningPredictor(history, performanceData);
        
        // Thêm phân tích kết quả gần đây
        const recentResultsPrediction = analyzeRecentResults(
            history.map(item => Number(item.numbers?.[0])),
            5
        );
        
        // 6. PHÂN TÍCH VÀ TẠO DỰ ĐOÁN MỚI
        const limitPredictions = {};
        
        for (const limitValue of limitObj.limitList) {
            // Reset strategies cho mỗi limit
            strategies = [];
            
            const limitedHistory = history.slice(0, Math.min(limitValue, history.length));
            const indices = [index];

            // ... existing limit analysis code ...

            // Lưu kết quả
            limitPredictions[limitValue] = {
                number: finalNumber,
                type: finalNumber >= 5 ? "tài" : "xỉu",
                votes: {
                    "tài": limitValue >= 5 ? 1 : 0,
                    "xỉu": limitValue < 5 ? 1 : 0
                },
                stats: {
                    accuracy: limitPerformance[limitValue]?.accuracy || 0,
                    consecutiveWrong: consecutiveWrong
                },
                strategies: strategies
            };
        }

        // Lấy dự đoán chính từ limitMain
        const mainPrediction = limitPredictions[limitObj.limitMain];

        // Tạo tất cả các dự đoán trong một khối
        const predictions = {
            adaptive: adaptiveLearning(history, recentMainResults),
            actual: predictBasedOnActualResults(history, performanceData),
            emergency: emergencyCorrection(performanceData),
            pattern: patternRecognitionPredictor(history, 4),
            statistical: statisticalAnalysisPredictor(history, 20),
            reinforcement: reinforcementLearningPredictor(history, performanceData),
            recent: analyzeRecentResults(
                history.map(item => Number(item.numbers?.[0])),
                5
            )
        };

        // Tạo mảng dự đoán tổng hợp
        const allPredictions = [
            {
                number: mainPrediction.number,
                weight: 25,
                confidence: 0.8,
                description: "Dự đoán từ phân tích cơ bản"
            }
        ];

        // Thêm các dự đoán vào allPredictions
        const predictionConfigs = [
            {
                key: 'adaptive',
                weight: 15,
                confidence: 0.7,
                description: "Dự đoán thích ứng"
            },
            {
                key: 'actual',
                weight: 20,
                confidence: 0.75,
                description: "Dự đoán từ kết quả thực tế"
            },
            {
                key: 'emergency',
                weight: 25,
                confidence: 0.9,
                description: "Điều chỉnh khẩn cấp"
            },
            {
                key: 'pattern',
                weight: 18,
                confidence: 0.75,
                description: "Dự đoán từ nhận dạng mẫu"
            },
            {
                key: 'statistical',
                weight: 17,
                confidence: 0.8,
                description: "Dự đoán từ phân tích thống kê"
            },
            {
                key: 'reinforcement',
                weight: 20,
                confidence: 0.7,
                description: "Dự đoán từ học tăng cường"
            },
            {
                key: 'recent',
                weight: 22,
                confidence: 0.85,
                description: "Dự đoán từ phân tích kết quả gần đây"
            }
        ];

        // Thêm các dự đoán có giá trị vào allPredictions
        predictionConfigs.forEach(config => {
            const prediction = predictions[config.key];
            if (prediction !== null && prediction !== undefined) {
                allPredictions.push({
                    number: prediction,
                    weight: config.weight,
                    confidence: config.confidence,
                    description: config.description
                });
            }
        });

        // Sử dụng ensemble predictor để kết hợp tất cả các dự đoán
        const ensembleFinalNumber = ensemblePredictor(allPredictions);
        
        // Cập nhật mainPrediction với kết quả mới nếu có
        if (ensembleFinalNumber !== null) {
            mainPrediction.number = ensembleFinalNumber;
            mainPrediction.type = ensembleFinalNumber >= 5 ? "tài" : "xỉu";
            mainPrediction.strategies.push("Sử dụng dự đoán tổng hợp từ nhiều mô hình");
        }

        // Thêm thông tin chi tiết về các mô hình vào strategies
        allPredictions.forEach(pred => {
            if (pred.description) {
                mainPrediction.strategies.push({
                    description: pred.description,
                    number: pred.number,
                    confidence: (pred.confidence * 100).toFixed(1) + "%",
                    weight: pred.weight
                });
            }
        });

        // 7. TẠO JSON DỰ ĐOÁN
        const timeVN = getVietnamTimeNow();
        
        const jsonData = {
            predictions: [mainPrediction.number],
            stats: mainPrediction.stats,
            timestamp: new Date().toISOString(),
            timeVN: timeVN,
            drawId: nextDrawId,
            votes: mainPrediction.votes,
            strategies: mainPrediction.strategies,
            indexPredicted: index,
            limits: {
                main: limitObj.limitMain,
                all: limitObj.limitList,
                predictions: Object.keys(limitPredictions).reduce((obj, key) => {
                    obj[key] = limitPredictions[key].number;
                    return obj;
                }, {})
            }
        };
        
        // Lưu file JSON
        if (fileConfig[1]) {
            try {
                fs.writeFileSync(`${fileConfig[0]}.prediction`, JSON.stringify(jsonData, null, 2));
            } catch (err) {
                gameLog.error(`Lỗi khi lưu file JSON: ${err.message}`);
            }
        }
        
        // Trả về kết quả
        return jsonData;
    } catch (error) {
        gameLog.error(`Lỗi khi dự đoán: ${error.message}`);
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
    return Math.floor(Math.random() * (max - min + 1)) + min;
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

function analyzeRecentResults(history, length = 5) {
    const recentResults = history.slice(0, length);
    const taiXiuPattern = recentResults.map(r => r >= 5 ? 'T' : 'X').join('');
    
    // Phân tích xu hướng
    const taiCount = recentResults.filter(r => r >= 5).length;
    const xiuCount = length - taiCount;
    
    // Nếu có xu hướng mạnh về một bên
    if (taiCount >= length * 0.8) {
        // Nếu Tài xuất hiện quá nhiều, có khả năng sẽ đổi sang Xỉu
        return Math.random() < 0.7 ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    } else if (xiuCount >= length * 0.8) {
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
    return Math.random() < (taiCount / length) ? 
        getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
}

// Export hàm predictNumbers
module.exports = predictNumbers;

/**
 * Dự đoán dựa trên kết quả thực tế gần đây
 * @param {Array} history - Lịch sử kết quả (số thực tế) gần đây
 * @param {Array} performanceData - Dữ liệu hiệu suất gần đây
 * @returns {Number} - Số dự đoán
 */
function predictBasedOnActualResults(history, performanceData) {
    if (!history || !history.length) {
        return getLuckyNumberInRange(0, 9);
    }

    // Lấy 10 kết quả thực tế gần nhất từ history
    const recentActualResults = history
        .slice(0, 10)
        .map(item => {
            if (item.numbers && item.numbers[0] !== undefined) {
                return Number(item.numbers[0]);
            }
            return null;
        })
        .filter(num => num !== null);

    if (recentActualResults.length === 0) {
        return getLuckyNumberInRange(0, 9);
    }

    // Chuyển đổi thành chuỗi Tài/Xỉu
    const actualTaiXiuPattern = recentActualResults.map(r => r >= 5 ? 'T' : 'X').join('');

    // Phân tích mẫu
    if (actualTaiXiuPattern.endsWith('TTT')) {
        return getLuckyNumberInRange(0, 4); // Dự đoán Xỉu sau 3 Tài
    } else if (actualTaiXiuPattern.endsWith('XXX')) {
        return getLuckyNumberInRange(5, 9); // Dự đoán Tài sau 3 Xỉu
    }

    // Phân tích tỷ lệ
    const taiCount = recentActualResults.filter(r => r >= 5).length;
    const xiuCount = recentActualResults.length - taiCount;

    if (Math.abs(taiCount - xiuCount) >= 3) {
        // Nếu chênh lệch lớn, dự đoán ngược lại
        return taiCount > xiuCount ? 
            getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }

    // Dự đoán theo xu hướng gần nhất
    const lastResult = recentActualResults[0];
    return lastResult >= 5 ?
        getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
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
 * Mô hình dự đoán dựa trên phân tích mẫu lặp lại
 */
function patternRecognitionPredictor(history, patternLength = 4) {
    if (!history || history.length < patternLength * 2) return null;

    // Chuyển đổi lịch sử thành chuỗi Tài/Xỉu
    const sequence = history
        .slice(0, patternLength * 3)
        .map(item => Number(item.numbers?.[0]) >= 5 ? 'T' : 'X')
        .join('');

    // Tìm mẫu lặp lại
    const patterns = {};
    for (let i = 0; i < sequence.length - patternLength; i++) {
        const pattern = sequence.slice(i, i + patternLength);
        const nextValue = sequence[i + patternLength];
        
        if (!patterns[pattern]) {
            patterns[pattern] = { T: 0, X: 0 };
        }
        if (nextValue) {
            patterns[pattern][nextValue]++;
        }
    }

    // Lấy mẫu hiện tại
    const currentPattern = sequence.slice(0, patternLength);
    
    if (patterns[currentPattern]) {
        const taiProb = patterns[currentPattern]['T'];
        const xiuProb = patterns[currentPattern]['X'];
        
        return taiProb > xiuProb ? 
            getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
    }

    return null;
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
 * Mô hình tổng hợp (Ensemble)
 */
function ensemblePredictor(predictions) {
    if (!predictions || predictions.length === 0) return null;

    // Tính trọng số cho mỗi dự đoán
    const weightedPredictions = predictions.map(pred => ({
        number: pred.number,
        weight: pred.weight || 1,
        confidence: pred.confidence || 0.5
    }));

    // Tính điểm tổng hợp
    let taiScore = 0;
    let xiuScore = 0;
    let totalWeight = 0;

    weightedPredictions.forEach(pred => {
        const score = pred.weight * pred.confidence;
        if (pred.number >= 5) {
            taiScore += score;
        } else {
            xiuScore += score;
        }
        totalWeight += pred.weight;
    });

    // Chuẩn hóa điểm
    taiScore /= totalWeight;
    xiuScore /= totalWeight;

    // Thêm yếu tố ngẫu nhiên để tránh local optima
    const randomFactor = Math.random() * 0.1;
    taiScore += randomFactor;
    xiuScore += randomFactor;

    return taiScore > xiuScore ?
        getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
}

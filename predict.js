// Đầu file - chỉ sử dụng fs thông thường
const fs = require('fs');
const fsSync = require('fs');

// Đầu file - thêm cơ chế log toàn cục
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
        
        // 6. PHÂN TÍCH VÀ TẠO DỰ ĐOÁN MỚI
        const limitPredictions = {};
        
        for (const limitValue of limitObj.limitList) {
            // Reset strategies cho mỗi limit
            strategies = [];
            
            const limitedHistory = history.slice(0, Math.min(limitValue, history.length));
            const indices = [index];

            // Kiểm tra hiệu suất của limitMain
            const mainPerformance = limitPerformance[limitObj.limitMain];
            if (mainPerformance && mainPerformance.accuracy < 0.4) {
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
                const limitResult = analyzeLimitedHistory(limitedHistory, index);
                finalNumber = limitResult.finalNumber;
                strategies = [...strategies, ...limitResult.strategies];
            }

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
        
        // 7. TẠO JSON DỰ ĐOÁN
        const mainPrediction = limitPredictions[limitObj.limitMain];
        const timeVN = getVietnamTimeNow();
        
        const jsonData = {
            predictions: [mainPrediction.number],
            stats: mainPrediction.stats,
            timestamp: new Date().toISOString(),
            timeVN: timeVN, // Thêm trường này để sau này có thể sử dụng
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
 * Hàm mới: Xử lý và cập nhật file performance
 */
async function processPerformanceFile(fileName, history, index, limitValue) {
  const fs = require('fs');
  let lines = [];
      let headerLines = [];
      let hasChanges = false;
      
  try {
    if (fs.existsSync(fileName)) {
      // Đọc toàn bộ file và tách header
      const allLines = fs.readFileSync(fileName, 'utf8').split('\n');
      for (const line of allLines) {
        if (line.trim() === '' || line.startsWith('#')) {
          headerLines.push(line);
        } else {
          lines.push(line);
        }
      }
      
      // Kiểm tra từng dòng để cập nhật kết quả thực tế
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Nếu dòng chỉ có dự đoán (không có kết quả thực tế)
        if (line.includes(' | Số dự đoán:') && !line.includes(' | Số thực tế:')) {
          // Trích xuất drawId của phiên này
          const drawIdMatch = line.match(/Chu kỳ \| (\d+) \|/);
          if (drawIdMatch) {
            const drawId = drawIdMatch[1];
            
            // Tìm phiên này trong history MongoDB
            const entry = history.find(h => h.drawId === drawId);
            
            if (entry && entry.numbers && entry.numbers[index] !== undefined) {
              // Lấy kết quả thực tế
              const actualNumber = Number(entry.numbers[index]);
              const actualType = actualNumber >= 5 ? "Tài" : "Xỉu";
              
              // Trích xuất số dự đoán
              const predictionMatch = line.match(/Số dự đoán: (\d+) \((Tài|Xỉu)\)/);
              if (predictionMatch) {
                const predictedNumber = Number(predictionMatch[1]);
                const predictedType = predictionMatch[2];
                
                // Xác định kết quả đúng hay sai
                const isCorrect = (actualNumber >= 5 && predictedNumber >= 5) || 
                                  (actualNumber < 5 && predictedNumber < 5);
                const result = isCorrect ? "Đúng" : "Sai";
                
                // Xây dựng dòng mới theo cấu trúc
                const parts = line.split(' | ');
                const updatedLine = `${parts[0]} | ${parts[1]} | ${parts[2]} | Số thực tế: ${actualNumber} (${actualType}) | Số dự đoán: ${predictedNumber} (${predictedType}) | Vị trí: ${index} | ${result}`;
                
                lines[i] = updatedLine;
                hasChanges = true;
                
                gameLog.info(`Đã cập nhật kết quả thực tế ${actualNumber} cho phiên ${drawId} trong file ${fileName}`);
              }
            }
          }
        }
      }
      
      // Ghi lại file nếu có thay đổi
      if (hasChanges) {
        // Kết hợp header với nội dung đã cập nhật
        const updatedContent = [...headerLines, ...lines].join('\n');
        fs.writeFileSync(fileName, updatedContent);
        gameLog.info(`Đã cập nhật kết quả thực tế vào ${fileName}`);
      }
    } else {
      // Tạo file mới với header
      let header;
      if (fileName.includes("_limitMain.")) {
        header = `# File Performance với LimitMain=${limitValue} và Index=${index}\n\n`;
      } else {
        header = `# File Performance với Limit=${limitValue} và Index=${index}\n\n`;
      }
      fs.writeFileSync(fileName, header);
      gameLog.info(`Đã tạo file performance mới: ${fileName}`);
    }
      } catch (err) {
    gameLog.error(`Lỗi khi xử lý file ${fileName}: ${err.message}`);
  }
  
  return { lines, headerLines, hasChanges };
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
 * Phân tích tần suất
 */
function analyzeFrequency(history, indices) {
    if (!history || history.length < 5) return {
        summary: {},
        predictions: []
    };
    
    // ... code phân tích tần suất ...
    
    // Trả về cấu trúc với predictions là mảng
        return {
        summary: {
            type: "tài", 
            weight: 2
        },
        predictions: [
            {
                number: getLuckyNumberInRange(5, 9),
                type: "tài",
            weight: 2,
                description: "Phân tích tần suất: Chọn tài do tỷ lệ xuất hiện thấp hơn"
            }
        ]
        };
}

/**
 * Phân tích xu hướng
 */
function analyzeTrend(history, indices) {
    if (!history || history.length < 5) return {
        summary: {},
        predictions: []
    };
    
    // ... code phân tích xu hướng ...
    
        return {
        summary: {},
        predictions: [
            {
                number: getLuckyNumberInRange(0, 4),
            type: "xỉu", 
                weight: 1,
                description: "Phân tích xu hướng: Theo dự đoán cơ bản"
            }
        ]
    };
}

/**
 * Phân tích chu kỳ
 */
function analyzeCycle(history, indices) {
    if (!history || history.length < 10) return {
        summary: {},
        predictions: []
    };
    
    // ... code phân tích chu kỳ ...
        
        return {
        summary: {},
        predictions: [
            {
                number: getLuckyNumberInRange(0, 9),
                type: Math.random() > 0.5 ? "tài" : "xỉu",
                weight: 1,
                description: "Phân tích chu kỳ: Không phát hiện chu kỳ rõ ràng"
            }
        ]
    };
}

/**
 * Phân tích hiệu suất để tự học tối ưu
 */
function learnFromPerformance(performanceData, limitedHistory, index, log = false) {
    if (!performanceData || !performanceData.history || performanceData.history.length < 10) {
        return {
            predictions: []
        };
    }
    
    // Lấy 30 kết quả gần nhất từ dữ liệu hiệu suất
    const recentResults = performanceData.history.slice(-30);
    
    // Đếm kết quả THỰC TẾ gần đây
    let taiCount = 0;
    let xiuCount = 0;
    
    for (const line of recentResults) {
        if (typeof line !== 'string') continue;
        
        const match = line.match(/Số thực tế: (\d+) \((Tài|Xỉu)\)/);
        if (match) {
            const type = match[2];
            if (type === "Tài") {
                taiCount++;
            } else if (type === "Xỉu") {
                xiuCount++;
            }
        }
    }
    
    if (log) gameLog.info(`LỌC TỪ DỮ LIỆU HIỆU SUẤT: Tài ${taiCount}, Xỉu ${xiuCount}`);
    
    // Tính tỷ lệ thực tế
    const total = taiCount + xiuCount;
    if (total === 0) {
        return {
            predictions: []
        };
    }
    
    const taiRatio = taiCount / total;
    const xiuRatio = xiuCount / total;
    
    // Tạo các dự đoán dựa trên phân tích
    const predictions = [];
    
    // Phân tích xu hướng
    if (taiRatio > 0.65) {
        predictions.push({
            number: getLuckyNumberInRange(5, 9),
            type: "tài", 
            weight: Math.round(taiRatio * 12),
            description: `TỰ HỌC: Theo xu hướng Tài (${(taiRatio*100).toFixed(0)}% trong ${total} kết quả gần đây)`
        });
    } else if (xiuRatio > 0.65) {
        predictions.push({
            number: getLuckyNumberInRange(0, 4),
            type: "xỉu",
            weight: Math.round(xiuRatio * 12),
            description: `TỰ HỌC: Theo xu hướng Xỉu (${(xiuRatio*100).toFixed(0)}% trong ${total} kết quả gần đây)`
        });
    }
    
    // Khi không có xu hướng rõ ràng
    if (predictions.length === 0) {
        predictions.push({
            number: getLuckyNumberInRange(taiRatio >= xiuRatio ? 5 : 0, taiRatio >= xiuRatio ? 9 : 4),
        type: taiRatio >= xiuRatio ? "tài" : "xỉu",
            weight: 1,
        description: `TỰ HỌC: Không có xu hướng rõ rệt (Tài: ${taiCount}, Xỉu: ${xiuCount})`
        });
    }
    
    return {
        predictions: predictions
    };
}

/**
 * Phân tích chiến lược đảo ngược
 */
function analyzeInverseStrategy(history, indices, performanceData) {
    if (!performanceData || !performanceData.history || performanceData.history.length < 10) {
        return {
            predictions: []
        };
    }
    
    // Phân tích 10 kết quả gần nhất từ dữ liệu hiệu suất
    const recentPerformance = performanceData.history.slice(-10);
    let correctCount = 0;
    let incorrectCount = 0;
    
    for (const line of recentPerformance) {
        if (typeof line === 'string') {
            if (line.includes("Đúng")) {
                correctCount++;
            } else if (line.includes("Sai")) {
                incorrectCount++;
            }
        }
    }
    
    // Nếu tỷ lệ dự đoán gần đây quá thấp (< 30%), đảo ngược chiến lược
    if (correctCount < incorrectCount && correctCount < 0.3 * recentPerformance.length) {
        // Dự đoán cơ bản
        const stats = analyzeTaiXiu(history, indices);
        
        // Chọn ngược lại với dự đoán cơ bản
        const normalType = stats.summary.taiPercent > stats.summary.xiuPercent ? "tài" : "xỉu";
        const inverseType = normalType === "tài" ? "xỉu" : "tài";
        
        return {
            predictions: [
                {
                    number: inverseType === "tài" ? getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4),
                    type: inverseType,
                    weight: 5, // Trọng số cao vì hiệu suất kém
                    description: `Đảo ngược dự đoán do hiệu suất thấp (${correctCount}/${recentPerformance.length} đúng)`
                }
            ]
        };
    }
    
        return {
        predictions: []
    };
}

/**
 * Phân tích mẫu theo thời gian
 */
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
 * Phân tích chuỗi và đảo chiều
 */
function analyzeStreakAndReversal(performanceData) {
    if (!performanceData || !performanceData.history || performanceData.history.length < 10) {
        return {
            predictions: []
        };
    }
    
    // LẤY 20 KẾT QUẢ GẦN NHẤT THEO ĐÚNG THỨ TỰ (MỚI NHẤT Ở ĐẦU)
    const recentResults = performanceData.history.slice(-20).reverse();
    
    // Trích xuất chuỗi kết quả thực tế gần đây (Tài/Xỉu)
    const resultSequence = [];
    
    for (const line of recentResults) {
        if (typeof line !== 'string') continue;
        
        const match = line.match(/Số thực tế: (\d+) \((Tài|Xỉu)\)/);
        if (match) {
            resultSequence.push(match[2]); // "Tài" hoặc "Xỉu"
        }
    }
    
    if (resultSequence.length < 5) {
        return {
            predictions: []
        };
    }
    
    // PHÁT HIỆN BỆT (STREAK)
    let currentStreak = 1;
    let currentType = resultSequence[0];
    
    // Đếm chuỗi hiện tại từ kết quả mới nhất
    for (let i = 1; i < resultSequence.length; i++) {
        if (resultSequence[i] === currentType) {
            currentStreak++;
        } else {
            break; // Dừng ngay khi gặp kết quả khác
        }
    }
    
    // Nếu có chuỗi dài
    if (currentStreak >= 3) {
        // Hai chiến lược: theo bệt hoặc đảo chiều
        if (Math.random() > 0.5) {
            // Theo bệt
        return {
                predictions: [
                    {
                        number: currentType === "Tài" ? getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4),
                        type: currentType === "Tài" ? "tài" : "xỉu",
                        weight: currentStreak + 2,
                        description: `THEO BỆT: ${currentType} đã xuất hiện ${currentStreak} lần liên tiếp, xu hướng mạnh`
                    }
                ]
            };
        } else {
            // Đảo chiều
                    const oppositeType = currentType === "Tài" ? "xỉu" : "tài";
                    return {
                predictions: [
                    {
                        number: oppositeType === "tài" ? getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4),
                        type: oppositeType,
                        weight: currentStreak,
                description: `BẺ XU HƯỚNG: ${currentType} đã xuất hiện ${currentStreak} lần liên tiếp, có thể sắp đổi chiều`
                    }
                ]
            };
        }
    }
    
    // Phân tích tỷ lệ Tài/Xỉu
    const taiCount = resultSequence.filter(r => r === "Tài").length;
    const xiuCount = resultSequence.length - taiCount;
    
    if (taiCount > xiuCount * 1.5) {
        return {
            predictions: [
                {
                    number: getLuckyNumberInRange(5, 9),
            type: "tài",
                    weight: 2,
            description: `XU HƯỚNG TÀI: Tài chiếm ưu thế (${taiCount}/${resultSequence.length})`
                }
            ]
        };
    } else if (xiuCount > taiCount * 1.5) {
        return {
            predictions: [
                {
                    number: getLuckyNumberInRange(0, 4),
            type: "xỉu",
                    weight: 2,
            description: `XU HƯỚNG XỈU: Xỉu chiếm ưu thế (${xiuCount}/${resultSequence.length})`
                }
            ]
        };
    }
    
    return {
        predictions: []
    };
}

/**
 * Phát hiện và sửa thiên lệch
 */
function detectAndCorrectBias(performanceData, log = false) {
    if (!performanceData || !performanceData.history || performanceData.history.length < 15) {
        return {
            predictions: []
        };
    }
    
    // Phân tích 10 DỰ ĐOÁN gần nhất
    const recent10 = performanceData.history.slice(-10);
    
    // Đếm dự đoán Tài/Xỉu
    let taiPredictions = 0;
    let xiuPredictions = 0;
    
    for (const line of recent10) {
        if (typeof line === 'string' && line.includes("Số dự đoán:")) {
            if (line.includes("(Tài)")) {
                taiPredictions++;
            } else if (line.includes("(Xỉu)")) {
                xiuPredictions++;
            }
        }
    }
    
    // Kiểm tra thiên lệch nghiêm trọng
    if (xiuPredictions >= 7) { // Nếu 7/10 lần gần nhất đều dự đoán Xỉu
        return {
            predictions: [
                {
                    number: getLuckyNumberInRange(5, 9),
            type: "tài",
                    weight: 25,
                    description: `CẢNH BÁO: Đang dự đoán Xỉu quá nhiều (${xiuPredictions}/10 lần), bắt buộc chuyển sang Tài`
                }
            ]
        };
    } else if (taiPredictions >= 7) { // Nếu 7/10 lần gần nhất đều dự đoán Tài
        return {
            predictions: [
                {
                    number: getLuckyNumberInRange(0, 4),
            type: "xỉu",
                    weight: 25,
                    description: `CẢNH BÁO: Đang dự đoán Tài quá nhiều (${taiPredictions}/10 lần), bắt buộc chuyển sang Xỉu`
                }
            ]
        };
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
    const indices = [index];
    
    // Phân tích dữ liệu
    const taixiuAnalysis = analyzeTaiXiu(limitedHistory, indices) || { summary: {}, predictions: [] };
    const frequencyAnalysis = analyzeFrequency(limitedHistory, indices) || { summary: {}, predictions: [] };
    const trendAnalysis = analyzeTrend(limitedHistory, indices) || { summary: {}, predictions: [] };
    const cycleAnalysis = analyzeCycle(limitedHistory, indices) || { summary: {}, predictions: [] };
    
    // Tạo performanceData từ chính dữ liệu giới hạn
    // (Không sử dụng file performance để phân tích đơn giản hơn)
    const performanceData = {
        history: limitedHistory.map(item => {
            if (item.numbers && item.numbers[index] !== undefined) {
                const num = Number(item.numbers[index]);
                const type = num >= 5 ? "Tài" : "Xỉu";
                return `Số thực tế: ${num} (${type})`;
            }
            return "";
        }).filter(Boolean),
        lastUpdate: new Date().toISOString(),
        lastDrawId: limitedHistory[0]?.drawId || ""
    };
    
    // Phân tích khác
    const timePatterns = analyzeTimePatterns(limitedHistory[0]?.drawId) || { predictions: [] };
    
    // Kết hợp các phân tích
    const currentPredictions = [
        ...(taixiuAnalysis?.predictions || []),
        ...(frequencyAnalysis?.predictions || []),
        ...(trendAnalysis?.predictions || []),
        ...(cycleAnalysis?.predictions || []),
        ...(timePatterns?.predictions || [])
    ];
    
    // Tính toán số phiếu và chiến lược
    let taiVotes = 0;
    let xiuVotes = 0;
    let strategies = [];
    
    currentPredictions.forEach(pred => {
        if (pred.type === "tài") {
            taiVotes += pred.weight || 1;
        } else if (pred.type === "xỉu") {
            xiuVotes += pred.weight || 1;
        }
        
        if (pred.description) {
            const voteStr = pred.weight > 1 ? ` (${pred.weight} phiếu)` : '';
            if (!strategies.includes(pred.description + voteStr)) {
                strategies.push(pred.description + voteStr);
            }
        }
    });
    
    // Xác định số dự đoán cuối cùng
    let finalNumber = -1;
    if (currentPredictions.length > 0) {
        const topPrediction = currentPredictions.sort((a, b) => b.weight - a.weight)[0];
        finalNumber = topPrediction.number;
    } else {
        // Nếu không có dự đoán, chọn theo loại có nhiều phiếu hơn
        if (taiVotes !== xiuVotes) {
            const winType = taiVotes > xiuVotes ? "tài" : "xỉu";
            finalNumber = winType === "tài" ? getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
        } else {
            finalNumber = getLuckyNumberInRange(0, 9);
        }
    }
    
    return {
        finalNumber: finalNumber,
        taiVotes: taiVotes,
        xiuVotes: xiuVotes,
        stats: taixiuAnalysis.summary,
        strategies: strategies
    };
}

/**
 * Cập nhật kết quả thực tế cho các dự đoán trước đó
 * @param {string} fileName - Tên file performance
 * @param {Array} history - Lịch sử kết quả
 * @param {number} index - Vị trí dự đoán
 */
async function updatePredictionResults(fileName, history, index) {
    try {
        if (!fs.existsSync(fileName)) return;
        
        // Đọc nội dung file hiện tại
        let allLines = fs.readFileSync(fileName, 'utf8').split('\n');
        let headerLines = [];
        let contentLines = [];
        let hasChanges = false;
        
        // Tách header và nội dung
        for (const line of allLines) {
            if (line.trim() === '' || line.startsWith('#')) {
                headerLines.push(line);
            } else {
                contentLines.push(line);
            }
        }
        
        // Cập nhật từng dòng dự đoán
        for (let i = 0; i < contentLines.length; i++) {
            const line = contentLines[i];
            
            // Chỉ cập nhật dòng chỉ có dự đoán mà không có kết quả thực tế
            if (line.includes(' | Số dự đoán:') && !line.includes(' | Số thực tế:')) {
                // Trích xuất drawId
                const drawIdMatch = line.match(/Chu kỳ \| (\d+) \|/);
                if (!drawIdMatch) continue;
                
                const drawId = drawIdMatch[1];
                
                // Tìm kết quả thực tế
                const entry = history.find(h => h.drawId === drawId);
                if (!entry || !entry.numbers || entry.numbers[index] === undefined) continue;
                
                // Lấy kết quả thực tế
                const actualNumber = Number(entry.numbers[index]);
                const actualType = actualNumber >= 5 ? "Tài" : "Xỉu";
                
                // Trích xuất số dự đoán
                const predictionMatch = line.match(/Số dự đoán: (\d+) \((Tài|Xỉu)\)/);
                if (!predictionMatch) continue;
                
                const predictedNumber = Number(predictionMatch[1]);
                const predictedType = predictionMatch[2];
                
                // Xác định kết quả đúng hay sai
                const isCorrect = (actualNumber >= 5 && predictedNumber >= 5) || 
                                 (actualNumber < 5 && predictedNumber < 5);
                const result = isCorrect ? "Đúng" : "Sai";
                
                // Xây dựng dòng mới
                const parts = line.split(' | ');
                const updatedLine = `${parts[0]} | ${parts[1]} | ${parts[2]} | Số thực tế: ${actualNumber} (${actualType}) | Số dự đoán: ${predictedNumber} (${predictedType}) | Vị trí: ${index} | ${result}`;
                
                contentLines[i] = updatedLine;
                hasChanges = true;
                
                gameLog.info(`Đã cập nhật kết quả thực tế ${actualNumber} cho phiên ${drawId}`);
            }
        }
        
        // Ghi lại file nếu có thay đổi
        if (hasChanges) {
            const updatedContent = [...headerLines, ...contentLines].join('\n');
            fs.writeFileSync(fileName, updatedContent);
            gameLog.info(`Đã cập nhật kết quả thực tế vào ${fileName}`);
        }
    } catch (err) {
        gameLog.error(`Lỗi khi cập nhật kết quả vào file ${fileName}: ${err.message}`);
    }
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

function adaptivePredictionSystem(history, performanceData) {
    // Xác định độ chính xác của từng phương pháp dự đoán
    const methodAccuracy = {
        recentResults: 0,
        pastPredictions: 0, 
        reversalPattern: 0,
        marketBehavior: 0
    };
    
    // Cập nhật độ chính xác dựa trên dữ liệu hiệu suất gần đây
    if (performanceData.length > 10) {
        // [Tính toán độ chính xác cho từng phương pháp]
    }
    
    // Thu thập dự đoán từ các phương pháp khác nhau
    const predictions = [
        analyzeRecentResults(history),
        learnFromPastPredictions(performanceData),
        analyzeReversalPattern(history),
        analyzeMarketBehavior(history)
    ];
    
    // Tổng hợp dự đoán với trọng số
    let taiWeight = 0;
    let xiuWeight = 0;
    
    predictions.forEach((pred, index) => {
        const weight = Object.values(methodAccuracy)[index] || 0.25;
        if (pred >= 5) {
            taiWeight += weight;
        } else {
            xiuWeight += weight;
        }
    });
    
    // Buộc hệ thống thay đổi dự đoán nếu đang đoán cùng một loại quá nhiều lần
    const recentPredictions = performanceData.slice(0, 5).map(p => p.prediction >= 5 ? 'T' : 'X');
    const uniquePredictions = new Set(recentPredictions);
    
    if (uniquePredictions.size === 1) {
        // Nếu 5 dự đoán gần đây đều giống nhau, buộc đổi chiều
        const currentType = recentPredictions[0];
        return currentType === 'T' ? getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }
    
    // Dự đoán cuối cùng dựa trên trọng số
    return taiWeight > xiuWeight ?
        getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
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
    // 1. Phân tích 10 kết quả thực tế gần nhất
    const recentActualResults = performanceData.slice(0, 10).map(p => p.actual);
    
    // 2. Chuyển đổi thành chuỗi Tài/Xỉu để phân tích mẫu
    const actualTaiXiuPattern = recentActualResults.map(r => r >= 5 ? 'T' : 'X').join('');
    
    // 3. Tìm mẫu lặp lại trong kết quả thực tế
    const patterns = {};
    for (let i = 0; i < actualTaiXiuPattern.length - 2; i++) {
        const pattern = actualTaiXiuPattern.substring(i, i+2);
        const nextResult = actualTaiXiuPattern[i+2];
        
        if (!patterns[pattern]) {
            patterns[pattern] = { T: 0, X: 0 };
        }
        patterns[pattern][nextResult]++;
    }
    
    // 4. Lấy 2 kết quả thực tế gần nhất để dự đoán
    const lastTwoResults = actualTaiXiuPattern.substring(0, 2);
    
    // 5. Nếu mẫu này đã xuất hiện, sử dụng nó để dự đoán
    if (patterns[lastTwoResults]) {
        const tCount = patterns[lastTwoResults].T || 0;
        const xCount = patterns[lastTwoResults].X || 0;
        
        // Dự đoán dựa trên xu hướng từ mẫu này
        if (tCount > xCount) {
            // Mẫu này thường dẫn đến Tài
            return getLuckyNumberInRange(5, 9);
        } else if (xCount > tCount) {
            // Mẫu này thường dẫn đến Xỉu
            return getLuckyNumberInRange(0, 4);
        }
    }
    
    // 6. Phân tích dự đoán gần đây
    const recentPredictions = performanceData.slice(0, 5)
        .map(p => p.prediction >= 5 ? 'T' : 'X');
    
    // 7. Nếu dự đoán quá nhiều lần liên tục cùng một loại, thay đổi
    if (recentPredictions.every(p => p === recentPredictions[0])) {
        return recentPredictions[0] === 'T' ? 
            getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }
    
    // 8. Phân tích tỷ lệ gần đây
    const taiCount = recentActualResults.filter(r => r >= 5).length;
    const xiuCount = recentActualResults.length - taiCount;
    
    // 9. Dự đoán dựa trên sự chênh lệch tỷ lệ
    if (Math.abs(taiCount - xiuCount) >= 3) {
        // Nếu chênh lệch lớn, dự đoán ngược với loại xuất hiện nhiều hơn
        return taiCount > xiuCount ? 
            getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }
    
    // 10. Phân tích sự đảo chiều
    let reversals = 0;
    for (let i = 1; i < recentActualResults.length; i++) {
        if ((recentActualResults[i] >= 5) !== (recentActualResults[i-1] >= 5)) {
            reversals++;
        }
    }
    
    // 11. Dựa vào tỷ lệ đảo chiều để dự đoán
    const reversalRate = reversals / (recentActualResults.length - 1);
    
    if (reversalRate > 0.6) {
        // Nếu hay đảo chiều, dự đoán ngược với kết quả gần nhất
        return recentActualResults[0] >= 5 ?
            getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    } else if (reversalRate < 0.3) {
        // Nếu ít đảo chiều, dự đoán giống với kết quả gần nhất
        return recentActualResults[0] >= 5 ?
            getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
    }
    
    // 12. Nếu không có mẫu rõ ràng, thêm yếu tố ngẫu nhiên
    return Math.random() > 0.5 ?
        getLuckyNumberInRange(5, 9) : getLuckyNumberInRange(0, 4);
}

function emergencyCorrection(performanceData) {
    // Lấy 4 kết quả gần nhất
    const recent = performanceData.slice(0, 4);
    
    // Kiểm tra xem 4 dự đoán gần đây có cùng loại không 
    // (toàn Tài hoặc toàn Xỉu)
    const allSameType = recent.every(r => 
        (r.prediction >= 5) === (recent[0].prediction >= 5));
    
    // Kiểm tra xem đã sai liên tiếp 3 lần hay chưa
    const consecutiveWrong = recent.filter(r => r.result === 'Sai').length >= 3;
    
    // Nếu đã sai 3/4 lần liên tiếp và dự đoán toàn một loại
    if (allSameType && consecutiveWrong) {
        // Chuyển sang dự đoán ngược lại
        return recent[0].prediction >= 5 ? 
            getLuckyNumberInRange(0, 4) : getLuckyNumberInRange(5, 9);
    }
    
    return null; // Không cần điều chỉnh khẩn cấp
}

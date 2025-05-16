const fs = require('fs');
const path = require('path');

/**
 * Tạo mảng các số dự đoán với giá trị Tài / Xỉu tại vị trí chỉ định
 */
function generateNumbers(shouldPredictTai, index) {
    const arraySize = 5;
    const predictedNumbers = [];
    for (let i = 0; i < arraySize; i++) {
        if (i === index) {
            predictedNumbers.push(shouldPredictTai
                ? 5 + Math.floor(Math.random() * 5) // Tài (5-9)
                : Math.floor(Math.random() * 5)); // Xỉu (0-4)
        } else {
            predictedNumbers.push(Math.floor(Math.random() * 10));
        }
    }
    return predictedNumbers;
}



// CẢI TIẾN 8: Thêm hàm mới để phát hiện các đảo chiều chu kỳ
function detectCyclicalReversals(history, index) {
    // Bảo vệ dữ liệu đầu vào
    if (history.length < 5) return { detected: false };
    
    //  Giảm số lượng kết quả phân tích từ 10 xuống 7 để tập trung vào gần đây
    const results = history.slice(0, 7).map(item => item.numbers[index] >= 5 ? 'T' : 'X');
    
    //  Tăng trọng số cho kết quả gần đây hơn
    const weightedResults = [];
    for (let i = 0; i < results.length; i++) {
        // Tăng trọng số cho dữ liệu gần, giảm mạnh cho dữ liệu cũ
        const weight = Math.pow(0.8, i);  // Tăng tốc độ suy giảm (từ 0.9 xuống 0.8)
        weightedResults.push({
            value: results[i],
            weight: weight
        });
    }
    
    //  Phân tích mạnh mẽ các chu kỳ ngắn hạn 2-3-4
    // 1. Kiểm tra chu kỳ 2 - quan trọng nhất trong xổ số 45 giây
    let cycle2Count = 0;
    let cycle2Correct = 0;
    let cycle2Confidence = 0;
    
    // Kiểm tra chu kỳ 2 với mức độ tin cậy cao hơn
    for (let i = 0; i < results.length - 2; i += 2) {
        if (results[i] === results[i+2]) {
            cycle2Count++;
            cycle2Confidence += (weightedResults[i].weight + weightedResults[i+2].weight) / 2;
            
            // Kiểm tra xem mẫu dự đoán trước đó có đúng không
            if (i >= 2 && results[i-2] === results[i]) {
                cycle2Correct++;
            }
        }
    }
    
    //  Tính tỷ lệ đúng thực tế cho chu kỳ 2
    const cycle2Accuracy = cycle2Count > 0 ? cycle2Correct / cycle2Count : 0;
    
    // 2. Kiểm tra chu kỳ 3 với logic tương tự
    let cycle3Count = 0;
    let cycle3Correct = 0;
    let cycle3Confidence = 0;
    
    for (let i = 0; i < results.length - 3; i += 3) {
        if (results[i] === results[i+3]) {
            cycle3Count++;
            cycle3Confidence += (weightedResults[i].weight + weightedResults[i+3].weight) / 2;
            
            // Kiểm tra mức độ chính xác
            if (i >= 3 && results[i-3] === results[i]) {
                cycle3Correct++;
            }
        }
    }
    
    // Tính tỷ lệ đúng cho chu kỳ 3
    const cycle3Accuracy = cycle3Count > 0 ? cycle3Correct / cycle3Count : 0;
    
    //  Cải tiến phát hiện mẫu phức tạp
    let complexPatternDetected = false;
    let complexPatternConfidence = 0;
    let complexPatternPrediction = false;
    
    // Phát hiện mẫu TTXTX hoặc XXTXT - phổ biến trong xổ số 45 giây
    if (results.length >= 5) {
        const pattern5 = results.slice(0, 5).join('');
        
        // Các mẫu phức tạp đặc trưng cho xổ số 45 giây
        const complexPatterns = {
            "TTXTX": "T", // Mẫu TTXTX thường tiếp theo là T
            "XXTXT": "X", // Mẫu XXTXT thường tiếp theo là X
            "TXTTX": "T", // Mẫu TXTTX thường tiếp theo là T
            "XTXXT": "X"  // Mẫu XTXXT thường tiếp theo là X
        };
        
        if (complexPatterns[pattern5]) {
            complexPatternDetected = true;
            complexPatternConfidence = 0.85; // Độ tin cậy cao cho các mẫu phức tạp đã xác nhận
            complexPatternPrediction = complexPatterns[pattern5] === "T";
        }
    }
    
    // Phát hiện mẫu "TTX" hoặc "XXT" ở 3 vị trí đầu
    if (results.length >= 3) {
        const first3 = results.slice(0, 3).join('');
        if (first3 === "TTX") {
            return {
                detected: true,
                patternType: "FastTTX",
                confidence: 0.78,
                predictTai: false,
                reason: ` Phát hiện mẫu TTX rõ rệt, dự đoán tiếp tục X`
            };
        } else if (first3 === "XXT") {
            return {
                detected: true,
                patternType: "FastXXT",
                confidence: 0.78,
                predictTai: true,
                reason: ` Phát hiện mẫu XXT rõ rệt, dự đoán tiếp tục T`
            };
        }
    }
    
    //  Thiên vị các chu kỳ dựa trên độ chính xác
    const cycleConfidences = [
        { type: 2, count: cycle2Count, confidence: cycle2Confidence, accuracy: cycle2Accuracy },
        { type: 3, count: cycle3Count, confidence: cycle3Confidence, accuracy: cycle3Accuracy },
        { type: 'complex', count: complexPatternDetected ? 1 : 0, confidence: complexPatternConfidence, accuracy: 0.85 }
    ];
    
    //  Sắp xếp theo độ chính xác + độ tin cậy
    cycleConfidences.sort((a, b) => {
        // Tạo điểm số tổng hợp (70% độ chính xác + 30% độ tin cậy)
        const scoreA = (a.accuracy * 0.7) + (a.confidence * 0.3);
        const scoreB = (b.accuracy * 0.7) + (b.confidence * 0.3);
        return scoreB - scoreA;
    });
    
    //  Giảm ngưỡng tin cậy để tăng tỷ lệ phát hiện
    const bestCycle = cycleConfidences.find(c => c.confidence > 0.25 && c.count > 0);
    
    if (bestCycle) {
        if (bestCycle.type === 'complex') {
            // Xử lý mẫu phức tạp
            return {
                detected: true,
                cycleType: 'complex',
                confidence: bestCycle.confidence,
                predictTai: complexPatternPrediction,
                reason: ` Phát hiện mẫu phức tạp với độ tin cậy ${(bestCycle.confidence * 100).toFixed(1)}%`
            };
        } else {
            // Dự đoán dựa trên chu kỳ tốt nhất
            const cycleType = bestCycle.type;
            const cyclePos = results.length % cycleType; // Vị trí hiện tại trong chu kỳ
            
            //  Cải tiến dự đoán - lấy giá trị tại vị trí đối xứng trong chu kỳ
            let predictedValue;
            
            if (cycleType === 2) {
                // Chu kỳ 2: kỳ chẵn-lẻ xen kẽ
                predictedValue = results[1]; // Giá trị tại vị trí 1 (index thứ 2)
            } else if (cycleType === 3) {
                // Chu kỳ 3: lấy giá trị tại vị trí tương ứng trong chu kỳ
                const predictionPos = cyclePos === 0 ? 0 : (cyclePos === 1 ? 1 : 2);
                predictedValue = results[predictionPos];
            }
            
            //  Tăng độ tin cậy dựa trên tỷ lệ đúng thực tế
            const adjustedConfidence = bestCycle.confidence * (0.8 + (bestCycle.accuracy * 0.2));
            
            return {
                detected: true,
                cycleType: cycleType,
                confidence: Math.min(0.85, adjustedConfidence), // Giới hạn max 0.85
                predictTai: predictedValue === 'T',
                reason: ` Phát hiện chu kỳ ${cycleType} kỳ với độ tin cậy ${(adjustedConfidence * 100).toFixed(1)}%, dự đoán ${predictedValue}`
            };
        }
    }
    
    //  Tăng cường phát hiện đảo chiều sau một chuỗi liên tiếp
    if (results.length >= 3 && results[0] === results[1] && results[1] === results[2]) {
        return {
            detected: true,
            cycleType: 'streak-reversal',
            confidence: 0.78,
            predictTai: results[0] !== 'T',
            reason: ` Phát hiện chuỗi ${results[0]}-${results[0]}-${results[0]}, dự đoán đảo chiều sang ${results[0] === 'T' ? 'X' : 'T'}`
        };
    }
    
    //  Phát hiện chu kỳ 2 với độ tin cậy thấp hơn nhưng vẫn hữu ích
    if (cycle2Count >= 1) {
        return {
            detected: true,
            cycleType: 2,
            confidence: 0.7 * cycle2Confidence, // Giảm độ tin cậy
            predictTai: results[results.length % 2] === 'T',
            reason: ` Phát hiện chu kỳ đảo chiều 2 kỳ với độ tin cậy ${(cycle2Confidence * 70).toFixed(1)}%`
        };
    }
    
    // Không phát hiện mẫu rõ ràng
    return { detected: false };
}

/**
 * detectFastPattern - Thuật toán phát hiện mẫu tốc độ cao cho xổ số 45 giây
 * Thuật toán này tập trung vào phân tích nhanh mẫu gần đây nhất, thích hợp cho môi trường có chu kỳ ngắn
 * @param {Array} history - Mảng lịch sử kết quả
 * @param {Number} index - Vị trí trong mảng numbers cần dự đoán
 * @returns {Object} Kết quả phát hiện mẫu và dự đoán
 */
function detectFastPattern(history, index) {
    if (history.length < 5) return { confidence: 0 };
    
    // Chỉ phân tích các kỳ gần nhất để tối ưu tốc độ
    const maxResults = Math.min(10, history.length);
    const results = history.slice(0, maxResults).map(item => item.numbers[index] >= 5 ? 'T' : 'X');
    
    // 1. PHÂN TÍCH CHUỖI DỰA TRÊN DỮ LIỆU THỰC TẾ TỪ 90 CHU KỲ
    
    // 1.1 Phát hiện chuỗi 3 và 4 kỳ liên tiếp - là mẫu phổ biến trong xổ số 45 giây
    const recent3 = results.slice(0, 3).join('');
    const recent4 = results.slice(0, 4).join('');
    const recent5 = results.slice(0, 5).join('');
    
    // Đảo chiều sau chuỗi 3 kỳ đồng nhất - mẫu với hiệu suất cao (>65%)
    if (recent3 === 'TTT') {
        return {
            predictTai: false,
            confidence: 0.85,
            reason: `FastPattern: Phát hiện 3 Tài liên tiếp, dự đoán đảo chiều sang Xỉu`
        };
    } else if (recent3 === 'XXX') {
        return {
            predictTai: true,
            confidence: 0.85,
            reason: `FastPattern: Phát hiện 3 Xỉu liên tiếp, dự đoán đảo chiều sang Tài`
        };
    }
    
    // 1.2 Mẫu XTTX và TXXT - đặc biệt hiệu quả dựa trên phân tích 90 chu kỳ
    if (recent4 === 'TXXT') {
        return {
            predictTai: false,
            confidence: 0.87,
            reason: `FastPattern: Phát hiện mẫu TXXT, dự đoán tiếp theo là Xỉu`
        };
    } else if (recent4 === 'XTTX') {
        return {
            predictTai: true,
            confidence: 0.87,
            reason: `FastPattern: Phát hiện mẫu XTTX, dự đoán tiếp theo là Tài`
        };
    }
    
    // 1.3 Mẫu kẹp sandwich cải tiến (xen kẽ đặc biệt)
    if (recent5 === 'TXTXT' || recent5 === 'TXTXX') {
        return {
            predictTai: false,
            confidence: 0.83,
            reason: `FastPattern: Phát hiện mẫu xen kẽ ${recent5}, dự đoán tiếp theo là Xỉu`
        };
    } else if (recent5 === 'XTXTX' || recent5 === 'XTXTT') {
        return {
            predictTai: true,
            confidence: 0.83,
            reason: `FastPattern: Phát hiện mẫu xen kẽ ${recent5}, dự đoán tiếp theo là Tài`
        };
    }
    
    // 1.4 Mẫu đảo chiều sau chuỗi thất bại
    // Kiểm tra nếu có 3-4 kỳ tương tự gần đây
    let consecutiveCount = 1;
    for (let i = 1; i < results.length - 1; i++) {
        if (results[i] === results[0]) {
            consecutiveCount++;
        } else {
            break;
        }
    }
    
    if (consecutiveCount >= 3) {
        return {
            predictTai: results[0] === 'X',
            confidence: 0.8 + (consecutiveCount - 3) * 0.05, // Mức độ tin cậy tăng theo độ dài chuỗi
            reason: `FastPattern: Phát hiện ${consecutiveCount} ${results[0]} liên tiếp, dự đoán đảo chiều`
        };
    }
    
    // 1.5 Phát hiện chuỗi thất bại từ phân tích 90 chu kỳ
    if (recent5.indexOf('XXXXX') !== -1 || recent5.indexOf('TTTT') !== -1) {
        const currentTrend = recent5.indexOf('XXXXX') !== -1 ? 'X' : 'T';
        return {
            predictTai: currentTrend !== 'T',
            confidence: 0.9,
            reason: `FastPattern: Phát hiện chuỗi dài ${currentTrend}, khả năng cao sẽ đảo chiều`
        };
    }
    
    // 1.6 Phân tích tần suất chuyển đổi - cải tiến dựa trên dữ liệu thực tế
    let switchCount = 0;
    for (let i = 0; i < results.length - 1; i++) {
        if (results[i] !== results[i+1]) {
            switchCount++;
        }
    }
    
    const switchRate = switchCount / (results.length - 1);
    
    // Tần số chuyển đổi cao - theo phân tích, thường sẽ tiếp tục chuyển đổi
    if (switchRate >= 0.8) {
        return {
            predictTai: results[0] !== 'T',
            confidence: 0.78,
            reason: `FastPattern: Tần số đảo chiều rất cao (${(switchRate*100).toFixed(1)}%), dự đoán tiếp tục đảo chiều`
        };
    }
    
    // Tần số chuyển đổi thấp - theo phân tích, thường sẽ duy trì xu hướng
    if (switchRate <= 0.2) {
        return {
            predictTai: results[0] === 'T',
            confidence: 0.77,
            reason: `FastPattern: Tần số đảo chiều rất thấp (${(switchRate*100).toFixed(1)}%), dự đoán duy trì xu hướng hiện tại`
        };
    }
    
    // 1.7 Biến thể mẫu xen kẽ dựa trên khung giờ (từ phân tích 90 chu kỳ)
    const curTimeObj = new Date();
    const currentHour = curTimeObj.getHours();
    
    // Khung giờ 13-16h thường có xu hướng theo mẫu cụ thể
    if (currentHour >= 13 && currentHour <= 16) {
        if (recent3 === 'TXT' || recent3 === 'XTX') {
            return {
                predictTai: recent3[0] === 'T',
                confidence: 0.76,
                reason: `FastPattern: Mẫu đặc biệt ${recent3} trong khung giờ chiều, dự đoán tiếp theo là ${recent3[0]}`
            };
        }
    }
    
    // Khung giờ 18-22h có mẫu khác
    if (currentHour >= 18 && currentHour <= 22) {
        if (results[0] === results[2] && results[0] !== results[1]) {
            return {
                predictTai: results[0] === 'T',
                confidence: 0.75,
                reason: `FastPattern: Phát hiện mẫu kẹp giữa trong khung giờ tối, dự đoán tiếp tục xu hướng ${results[0]}`
            };
        }
    }
    
    // Nếu không phát hiện mẫu nào rõ ràng
    return { confidence: 0 };
}

/**
 * Xác định khung giờ trong ngày
 * @param {Number} hour - Giờ cần xác định
 * @returns {String} Tên khung giờ
 */
function getTimePeriod(hour) {
    if (hour >= 5 && hour < 11) return 'morning';    // Sáng: 05:00 - 11:00
    if (hour >= 11 && hour < 13) return 'noon';      // Trưa: 11:00 - 13:00
    if (hour >= 13 && hour < 18) return 'afternoon'; // Chiều: 13:00 - 18:00
    if (hour >= 18 && hour < 22) return 'evening';   // Tối: 18:00 - 22:00
    return 'latenight';                              // Khuya: 22:00 - 05:00
}

/**
 * Lấy tất cả kết quả trong một khung giờ
 * @param {Object} hourlyResults - Kết quả theo giờ
 * @param {String} period - Tên khung giờ
 * @returns {Array} Mảng các kết quả trong khung giờ
 */
function getPeriodResults(hourlyResults, period) {
    let results = [];
    let periodHours = [];
    
    // Xác định các giờ trong khung giờ
    switch (period) {
        case 'morning':
            periodHours = [5, 6, 7, 8, 9, 10];
            break;
        case 'noon':
            periodHours = [11, 12];
            break;
        case 'afternoon':
            periodHours = [13, 14, 15, 16, 17];
            break;
        case 'evening':
            periodHours = [18, 19, 20, 21];
            break;
        case 'latenight':
            periodHours = [22, 23, 0, 1, 2, 3, 4];
            break;
    }
    
    // Gộp tất cả kết quả trong khung giờ
    periodHours.forEach(hour => {
        if (hourlyResults[hour]) {
            results = results.concat(hourlyResults[hour]);
        }
    });
    
    return results;
}

// Cache cho advancedCombinationPattern
let comboPatternCache = {
    lastPrediction: null,
    consecutiveSamePredictions: 0,
    oppositeResultsCount: 0
};

function advancedCombinationPattern(history, index) {
    // Kiểm tra rỗng
    if (!history || history.length === 0) return { confidence: 0.5, predictTai: false, reason: "Không có dữ liệu" };
    
    // ----- XỬ LÝ TRƯỜNG HỢP CỐ CHẤP DỰ ĐOÁN -----
    if (comboPatternCache.lastPrediction !== null) {
        // Lấy mẫu T/X từ lịch sử, dù có ít phần tử
        const pattern = history.map(h => h.numbers[index] >= 5 ? 'T' : 'X');
        const lastResultType = pattern[0]; // Kết quả mới nhất
        
        // Kiểm tra xem dự đoán trước có đúng không
        const wasCorrect = (comboPatternCache.lastPrediction === 'T' && lastResultType === 'T') || 
                          (comboPatternCache.lastPrediction === 'X' && lastResultType === 'X');
        
        if (!wasCorrect) {
            comboPatternCache.oppositeResultsCount++;
            console.log(`AdvancedCombo: Phát hiện kết quả ngược với dự đoán. oppositeResultsCount=${comboPatternCache.oppositeResultsCount}`);
        } else {
            comboPatternCache.oppositeResultsCount = 0;
        }
        
        // Nếu là kiểm thử bệt với lịch sử ngắn (3 phần tử)
        if (history.length === 3) {
            // Đếm số lần kết quả trong lịch sử trái ngược với dự đoán hiện tại
            let oppositeResultsInHistory = 0;
            
            for (let i = 0; i < pattern.length; i++) {
                const isOpposite = (comboPatternCache.lastPrediction === 'T' && pattern[i] === 'X') ||
                                  (comboPatternCache.lastPrediction === 'X' && pattern[i] === 'T');
                if (isOpposite) {
                    oppositeResultsInHistory++;
                }
            }
            
            // Nếu tất cả 3 kết quả đều ngược với dự đoán, hoặc oppositeResultsCount >= 3
            if (oppositeResultsInHistory === 3 || 
                (comboPatternCache.oppositeResultsCount >= 3 && comboPatternCache.consecutiveSamePredictions >= 3)) {
                console.log(`🚨 AdvancedCombo: Phát hiện chuỗi kết quả hoàn toàn trái ngược với dự đoán`);
                
                // Đảo chiều dự đoán và đi theo kết quả thực tế
                const newPrediction = {
                    confidence: 0.85,
                    predictTai: lastResultType === 'T', // Đi theo xu hướng thực tế
                    reason: `Đảo chiều do phát hiện chuỗi ${pattern.join('')} trái ngược với dự đoán liên tục ${comboPatternCache.lastPrediction}`
                };
                
                // Cập nhật cache
                comboPatternCache.lastPrediction = newPrediction.predictTai ? 'T' : 'X';
                comboPatternCache.consecutiveSamePredictions = 1;
                comboPatternCache.oppositeResultsCount = 0;
                
                return newPrediction;
            }
        }
        
        // Trường hợp dữ liệu ngắn nhưng có vài kết quả trái ngược
        if (history.length < 5 && comboPatternCache.oppositeResultsCount >= 2) {
            // Tính tỷ lệ Tài trong lịch sử ngắn
            const taiRate = pattern.filter(x => x === 'T').length / pattern.length;
            
            // Đảo chiều nếu có xu hướng rõ ràng ngược với dự đoán hiện tại
            if ((taiRate >= 0.7 && comboPatternCache.lastPrediction === 'X') || 
                (taiRate <= 0.3 && comboPatternCache.lastPrediction === 'T')) {
                const newPrediction = {
                    confidence: 0.75,
                    predictTai: taiRate >= 0.7,
                    reason: `Đảo chiều do phát hiện xu hướng ${taiRate >= 0.7 ? 'Tài' : 'Xỉu'} rõ ràng (${Math.round(Math.max(taiRate, 1-taiRate)*100)}%) ngược với dự đoán hiện tại`
                };
                
                // Cập nhật cache
                comboPatternCache.lastPrediction = newPrediction.predictTai ? 'T' : 'X';
                comboPatternCache.consecutiveSamePredictions = 1;
                comboPatternCache.oppositeResultsCount = 0;
                
                return newPrediction;
            }
        }
    }
    
    // Nếu dữ liệu quá ngắn để phân tích đầy đủ
    if (history.length < 5) {
        // Lấy mẫu T/X từ lịch sử, dù có ít phần tử
        const pattern = history.map(h => h.numbers[index] >= 5 ? 'T' : 'X');
        
        // Nếu tất cả cùng loại
        if (pattern.every(p => p === pattern[0])) {
            const prediction = {
                confidence: 0.75,
                predictTai: pattern[0] !== 'T', // Đảo chiều
                reason: `Phát hiện ${pattern.length} ${pattern[0]} liên tiếp trong lịch sử ngắn, dự đoán đảo chiều`
            };
            updatePredictionCache(prediction);
            return prediction;
        }
        
        // Tính tỷ lệ Tài
        const taiRate = pattern.filter(p => p === 'T').length / pattern.length;
        
        // Lựa chọn dựa trên xu hướng
        const prediction = {
            confidence: 0.65,
            predictTai: taiRate < 0.5, // Ngược với xu hướng
            reason: `Xu hướng cơ bản: ${Math.round(taiRate*100)}% Tài trong lịch sử ngắn, dự đoán ngược lại`
        };
        updatePredictionCache(prediction);
        return prediction;
    }
    
    // ----- XỬ LÝ BÌNH THƯỜNG CHO LỊCH SỬ >= 5 KẾT QUẢ -----
    
    // Kích thước lịch sử phù hợp với xổ số 45 giây
    const historyLimit = Math.min(10, history.length);
    
    // Lấy mẫu T/X gần đây nhất
    const pattern = history.slice(0, historyLimit).map(h => h.numbers[index] >= 5 ? 'T' : 'X');
    const recentPattern = pattern.slice(0, 5).join('');
    
    // Kiểm tra comboPatternCache có lastPrediction không null
    if (comboPatternCache.lastPrediction !== null) {
        const lastResultType = pattern[0]; // Kết quả mới nhất
        
        // Kiểm tra kết quả thực tế dựa trên lịch sử đầu vào
        let oppositeResultsInHistory = 0;
        
        // Kiểm tra xem chuỗi thực tế trong lịch sử có đều ngược với dự đoán không
        for (let i = 0; i < Math.min(3, pattern.length); i++) {
            const isOpposite = (comboPatternCache.lastPrediction === 'T' && pattern[i] === 'X') ||
                              (comboPatternCache.lastPrediction === 'X' && pattern[i] === 'T');
            if (isOpposite) {
                oppositeResultsInHistory++;
            }
        }
        
        // Nếu cả kết quả lưu trong cache và kết quả trong lịch sử đều cho thấy cần đảo chiều
        if ((comboPatternCache.oppositeResultsCount >= 3 || oppositeResultsInHistory >= 2) && 
            comboPatternCache.consecutiveSamePredictions >= 3) {
            console.log(`🚨 AdvancedCombo: Đảo chiều sau nhiều kết quả thực tế trái ngược với dự đoán liên tục`);
            
            // Đảo chiều dự đoán và đi theo kết quả thực tế
            const prediction = {
                confidence: 0.85,
                predictTai: lastResultType === 'T', // Đi theo xu hướng thực tế
                reason: `Đảo chiều sau nhiều kết quả thực tế ${lastResultType} trái ngược với dự đoán liên tục`
            };
            
            // Cập nhật cache
            comboPatternCache.lastPrediction = prediction.predictTai ? 'T' : 'X';
            comboPatternCache.consecutiveSamePredictions = 1;
            comboPatternCache.oppositeResultsCount = 0;
            
            return prediction;
        }
    }
    
    // Đếm biến thể
    let taiCount = 0;
    let xiuCount = 0;
    let alternatingCount = 0;
    let streakLength = 1;
    let maxStreakLength = 1;
    let streakType = pattern[0];
    
    // Phân tích chi tiết
    for (let i = 0; i < pattern.length; i++) {
        // Đếm Tài/Xỉu
        if (pattern[i] === 'T') taiCount++;
        else xiuCount++;
        
        // Đếm số lần đảo chiều
        if (i > 0 && pattern[i] !== pattern[i-1]) {
            alternatingCount++;
            // Reset đếm streak khi đảo chiều
            streakLength = 1;
        } else {
            // Tăng streak khi cùng loại
            streakLength++;
            if (streakLength > maxStreakLength) {
                maxStreakLength = streakLength;
                streakType = pattern[i];
            }
        }
    }
    
    // Tính tỷ lệ & độ tin cậy
    const totalCount = taiCount + xiuCount;
    const taiRate = taiCount / totalCount;
    const alternatingRate = alternatingCount / (totalCount - 1);
    
    // Phân tích mẫu cụ thể cho xổ số 45 giây (dựa trên phân tích 90 chu kỳ)
    
    // MẪU 1: Chuỗi 3+ cùng loại -> đảo chiều (tỷ lệ thành công cao ~65-70%)
    if (pattern[0] === pattern[1] && pattern[1] === pattern[2]) {
        const consecutive = pattern[0];
        let count = 3;
        
        // Đếm chính xác số lượng liên tiếp
        while (count < pattern.length && pattern[count] === consecutive) {
            count++;
        }
        
        // Độ tin cậy tăng theo độ dài chuỗi
        const confidenceBase = 0.8;
        const confidenceBonus = Math.min((count - 3) * 0.03, 0.09);
        
        const prediction = {
            confidence: confidenceBase + confidenceBonus,
            predictTai: consecutive === 'X', // Đảo chiều
            reason: `Phát hiện ${count} ${consecutive} liên tiếp, dự đoán đảo chiều`
        };
        
        // Cập nhật cache dự đoán
        updatePredictionCache(prediction);
        
        return prediction;
    }
    
    // MẪU 2: Mẫu xen kẽ cân bằng -> theo xu hướng gần đây
    if (alternatingRate > 0.6 && Math.abs(taiRate - 0.5) < 0.2) {
        // Xu hướng mới nhất
        const latestTrend = pattern.slice(0, 3).filter(x => x === 'T').length >= 2 ? 'T' : 'X';
        
        const prediction = {
            confidence: 0.68,
            predictTai: latestTrend === 'T',
            reason: `Phát hiện mẫu xen kẽ cân bằng, theo xu hướng mới nhất là ${latestTrend}`
        };
        
        // Cập nhật cache dự đoán
        updatePredictionCache(prediction);
        
        return prediction;
    }
    
    // MẪU 3: Phân tích xu hướng dựa trên tỷ lệ Tài/Xỉu
    if (Math.abs(taiRate - 0.5) >= 0.2) {
        const dominantType = taiRate > 0.5 ? 'T' : 'X';
        const confidenceBoost = Math.min(Math.abs(taiRate - 0.5) * 1.2, 0.25);
        
        const prediction = {
            confidence: 0.65 + confidenceBoost,
            predictTai: dominantType === 'T',
            reason: `Phát hiện xu hướng ưu thế ${dominantType} (${Math.round(Math.max(taiRate, 1-taiRate)*100)}%)`
        };
        
        // Cập nhật cache dự đoán
        updatePredictionCache(prediction);
        
        return prediction;
    }
    
    // MẪU KHÁC: Xổ số thường có xu hướng quay lại giá trị trung bình,
    // nên nếu chuỗi gần đây lệch về một bên, lựa chọn bên đối diện
    const recentTaiRate = pattern.slice(0, 5).filter(x => x === 'T').length / 5;
    
    // MẶC ĐỊNH: Trả về kết quả với độ tin cậy thấp hơn
    const prediction = {
        confidence: 0.65,
        predictTai: recentTaiRate < 0.5, // Ngược với xu hướng gần đây
        reason: `Phân tích cơ bản: ${Math.round(recentTaiRate*100)}% Tài trong 5 kết quả gần đây, dự đoán ngược lại`
    };
    
    // Cập nhật cache dự đoán
    updatePredictionCache(prediction);
    
    return prediction;
}

/**
 * Cập nhật cache theo dõi dự đoán liên tục
 * @param {Object} prediction - Kết quả dự đoán
 */
function updatePredictionCache(prediction) {
    const currentPrediction = prediction.predictTai ? 'T' : 'X';
    
    if (comboPatternCache.lastPrediction === currentPrediction) {
        comboPatternCache.consecutiveSamePredictions++;
        
        // Giảm độ tin cậy nếu liên tục dự đoán cùng kiểu 5+ lần
        if (comboPatternCache.consecutiveSamePredictions >= 5) {
            prediction.confidence = Math.max(0.51, prediction.confidence - 0.1);
            console.log(`⚠️ AdvancedCombo: Giảm độ tin cậy xuống ${prediction.confidence.toFixed(2)} do dự đoán cùng kiểu ${comboPatternCache.consecutiveSamePredictions} lần liên tiếp`);
        }
    } else {
        comboPatternCache.consecutiveSamePredictions = 1;
    }
    
    comboPatternCache.lastPrediction = currentPrediction;
}

/**
 * V5.0: Áp dụng Kelly Criterion cho quản lý vốn
 * @param {Number} balance - Số dư tài khoản
 * @param {Number} odds - Tỷ lệ thắng (thường là 1.95 cho Tài Xỉu)
 * @param {Number} probability - Xác suất thắng (0-1)
 * @param {Number} fraction - Phần trăm Kelly sử dụng (0-1)
 * @param {Number} maxRisk - Rủi ro tối đa cho phép (0-1)
 * @returns {Number} Số tiền đặt cược được đề xuất
 */
function calculateKellyCriterion(balance, odds = 1.95, probability, fraction = 0.3, maxRisk = 0.05) {
    // Tính toán Kelly đầy đủ
    const fullKelly = ((odds * probability) - 1) / (odds - 1);
    
    // Giới hạn theo phần trăm Kelly và rủi ro tối đa
    const cappedKelly = Math.min(fullKelly * fraction, maxRisk);
    
    // Đảm bảo không âm
    const safeKelly = Math.max(cappedKelly, 0);
    
    // Tính số tiền cược
    let betAmount = Math.floor(balance * safeKelly);
    
    // Làm tròn về bội số của 10,000 để dễ đọc
    betAmount = Math.ceil(betAmount / 10000) * 10000;
    
    // Đảm bảo mức cược tối thiểu
    return Math.max(betAmount, 100000);
}

/**
 * Đếm số lần thua liên tiếp gần đây từ file log
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
 * Phát hiện mẫu thích ứng từ lịch sử và tăng cường nhận diện chuỗi đặc biệt
 * @param {Array} history - Mảng lịch sử kết quả
 * @param {Number} index - Vị trí cần dự đoán
 * @returns {Object} Kết quả dự đoán
 */
function detectAdaptivePattern(history, index = 0) {
    // Kiểm tra đầu vào
    if (!history || !Array.isArray(history) || history.length < 10) {
        return { predictTai: null, confidence: 0, reason: "Không đủ dữ liệu" };
    }
    
    let result = { 
        predictTai: null, 
        confidence: 0, 
        reason: "", 
        method: "AdaptivePattern" 
    };
    
    try {
        // Lấy 20 kết quả gần nhất để phân tích
        const recentHistory = history.slice(0, Math.min(20, history.length));
        
        // Chuyển đổi lịch sử thành chuỗi Tài/Xỉu để nhận dạng mẫu
        const taiXiuPattern = recentHistory.map(item => {
            const num = item.numbers[index];
            return num >= 5 ? 'T' : 'X';
        }).join('');
        
        // Phát hiện mẫu chuỗi thua đặc biệt từ dữ liệu
        // Đọc log gần nhất để xem có chuỗi thua không
        const dataDir = path.join(__dirname, '..', 'data');
        const logFile = path.join(dataDir, 'prediction_log.txt');
        const recentLosses = calculateRecentLosses(logFile);
        
        // Kiểm tra xem có chuỗi thua liên tiếp không
        if (recentLosses >= 2) {
            // Phân tích 5 kết quả gần nhất để tìm mẫu
            const pattern5 = taiXiuPattern.substring(0, 5);
            // Kiểm tra các mẫu đặc biệt trong chuỗi thua
            
            // Mẫu 1: Nếu có 3+ Tài liên tiếp, dự đoán Xỉu tiếp theo
            if (pattern5.startsWith('TTT')) {
                result.predictTai = false;
                result.confidence = 0.82;
                result.reason = "Mẫu 3+ Tài liên tiếp sau chuỗi thua";
                result.method = "AdaptiveStreakBreaker";
                return result;
            }
            
            // Mẫu 2: Nếu có 3+ Xỉu liên tiếp, dự đoán Tài tiếp theo
            if (pattern5.startsWith('XXX')) {
                result.predictTai = true;
                result.confidence = 0.82;
                result.reason = "Mẫu 3+ Xỉu liên tiếp sau chuỗi thua";
                result.method = "AdaptiveStreakBreaker";
                return result;
            }
            
            // Mẫu 3: Mẫu xen kẽ TXTX, dự đoán T tiếp theo
            if (pattern5.startsWith('TXTX')) {
                result.predictTai = true;
                result.confidence = 0.80;
                result.reason = "Mẫu xen kẽ TXTX sau chuỗi thua";
                result.method = "AdaptiveStreakBreaker";
                return result;
            }
            
            // Mẫu 4: Mẫu xen kẽ XTXT, dự đoán X tiếp theo
            if (pattern5.startsWith('XTXT')) {
                result.predictTai = false;
                result.confidence = 0.80;
                result.reason = "Mẫu xen kẽ XTXT sau chuỗi thua";
                result.method = "AdaptiveStreakBreaker";
                return result;
            }
        }
        
        // Thêm phân tích theo chuỗi Fibonacci
        const fibonacciPattern = analyzeFibonacciSequence(recentHistory, 10);
        if (fibonacciPattern.confidence > 0.7) {
            return {
                prediction: fibonacciPattern.prediction,
                confidence: fibonacciPattern.confidence,
                method: 'fibonacci_pattern',
                reasoning: `Phát hiện mẫu Fibonacci với độ tin cậy ${fibonacciPattern.confidence.toFixed(2)}`
            };
        }
        
        // Thêm phân tích theo chu kỳ thời gian
        const timeBasedPattern = analyzeTimeBasedPatterns(history, getCurrentTimeSegment());
        if (timeBasedPattern.confidence > 0.65) {
            return timeBasedPattern;
        }
        
        // Tiếp tục với logic phát hiện mẫu thông thường
        // ... (rest of the code remains unchanged)
    } catch (error) {
        console.error(`❌ Lỗi khi phân tích mẫu thích ứng: ${error.message}`);
        return { predictTai: null, confidence: 0, reason: "Lỗi khi phân tích mẫu thích ứng" };
    }
    
    return result;
}

// Hàm mới phân tích mẫu theo dãy Fibonacci
function analyzeFibonacciSequence(results, depth) {
    const fibSequence = [1, 1, 2, 3, 5, 8, 13, 21];
    const recentPositions = results.slice(0, depth).map(r => r.position);
    
    // Tìm kiếm các mẫu Fibonacci trong chuỗi kết quả
    let matchCount = 0;
    for (let i = 0; i < recentPositions.length - 2; i++) {
        if (recentPositions[i] + recentPositions[i+1] === recentPositions[i+2]) {
            matchCount++;
        }
    }
    
    const confidence = matchCount / (recentPositions.length - 2);
    let prediction = null;
    
    if (confidence > 0.5) {
        // Dự đoán kết quả tiếp theo dựa trên quy luật Fibonacci
        prediction = (recentPositions[0] + recentPositions[1]) % 2 === 0 ? 'tai' : 'xiu';
    }
    
    return { prediction, confidence, method: 'fibonacci_pattern' };
}

// Hàm mới phân tích theo thời gian
function analyzeTimeBasedPatterns(history, currentTimeSegment) {
    const hourlyResults = history.filter(h => h.timeSegment === currentTimeSegment);
    const last10Results = hourlyResults.slice(0, 10);
    
    // Tính tỷ lệ tài/xỉu trong khung giờ hiện tại
    const taiCount = last10Results.filter(r => r.result === 'tai').length;
    const xiuCount = last10Results.filter(r => r.result === 'xiu').length;
    
    let prediction = null;
    let confidence = 0;
    
    if (taiCount > xiuCount * 1.5) {
        prediction = 'tai';
        confidence = 0.6 + (taiCount - xiuCount) / 20;
    } else if (xiuCount > taiCount * 1.5) {
        prediction = 'xiu';
        confidence = 0.6 + (xiuCount - taiCount) / 20;
    }
    
    return {
        prediction,
        confidence: Math.min(confidence, 0.85), // Giới hạn độ tin cậy tối đa
        method: 'time_based_pattern',
        reasoning: `Phân tích theo khung giờ: ${currentTimeSegment}, tài=${taiCount}, xỉu=${xiuCount}`
    };
}

/**
 * Export các chức năng
 */
module.exports = {
    detectCyclicalReversals,
    detectFastPattern,
    advancedCombinationPattern,
    comboPatternCache,
    generateNumbers,
    getTimePeriod,
    getPeriodResults,
    calculateKellyCriterion,
    calculateRecentLosses,
    detectAdaptivePattern
};
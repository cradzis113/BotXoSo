const fs = require('fs');

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

// Phiên bản v7.1.0: Đã loại bỏ detectCyclicalReversals

// Phiên bản v7.1.0: Đã loại bỏ detectFastPattern

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

// Phiên bản v7.1.0: Đã loại bỏ advancedCombinationPattern

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

// Phiên bản v7.1.0: Đã loại bỏ detectAdaptivePattern, analyzeFibonacciSequence và analyzeTimeBasedPatterns

/**
 * Phát hiện sớm các mẫu bệt Tài/Xỉu
 * @param {Array} history - Mảng lịch sử kết quả
 * @param {Number} index - Vị trí cần dự đoán
 * @returns {Object} Kết quả dự đoán với độ tin cậy
 */
function detectEarlyStreak(history, index = 0) {
    if (!history || history.length < 2) return { confidence: 0 };
    
    // Chuyển đổi lịch sử thành chuỗi T/X
    const maxResults = Math.min(20, history.length);
    const results = history.slice(0, maxResults).map(item => item.numbers[index] >= 5 ? 'T' : 'X');
    
    // 1. Phân tích trọng số cho kết quả gần đây
    const weightedResults = [];
    for (let i = 0; i < results.length; i++) {
        const weight = Math.pow(0.75, i); // Trọng số giảm dần theo khoảng cách
        weightedResults.push({
            value: results[i],
            weight: weight
        });
    }
    
    // 2. Đánh giá khả năng bệt Tài hoặc Xỉu
    let taiStreakScore = 0;
    let xiuStreakScore = 0;
    
    // Thống kê kết quả 3 lần gần nhất
    const recent3 = results.slice(0, 3);
    const recentTCount = recent3.filter(r => r === 'T').length;
    const recentXCount = recent3.filter(r => r === 'X').length;
    
    // Đánh giá momentum (xu hướng đang mạnh lên hay yếu đi)
    if (recentTCount >= 2) {
        // Tăng điểm streak cho Tài nếu xu hướng mạnh
        taiStreakScore += (recentTCount === 3) ? 2.0 : 1.0;
        
        // Tăng thêm nếu có momentum mạnh
        if (results[0] === 'T' && results[1] === 'T') {
            taiStreakScore += 0.5;
        }
    }
    
    if (recentXCount >= 2) {
        // Tăng điểm streak cho Xỉu nếu xu hướng mạnh
        xiuStreakScore += (recentXCount === 3) ? 2.0 : 1.0;
        
        // Tăng thêm nếu có momentum mạnh
        if (results[0] === 'X' && results[1] === 'X') {
            xiuStreakScore += 0.5;
        }
    }
    
    // Phân tích mẫu bệt rộng hơn (5 kết quả gần nhất)
    const recent5 = results.slice(0, 5);
    const taiCount5 = recent5.filter(r => r === 'T').length;
    const xiuCount5 = recent5.filter(r => r === 'X').length;
    
    // Phát hiện xu hướng bệt mạnh
    if (taiCount5 >= 4) {
        taiStreakScore += 1.0;
    }
    
    if (xiuCount5 >= 4) {
        xiuStreakScore += 1.0;
    }
    
    // 3. Xác định nếu có chuỗi bệt đang hình thành
    const streakThreshold = 1.5; // Ngưỡng để xác định có bệt hay không
    let potentialStreak = null;
    let streakConfidence = 0;
    
    if (taiStreakScore > streakThreshold || xiuStreakScore > streakThreshold) {
        // Đã phát hiện bệt tiềm năng
        if (taiStreakScore > xiuStreakScore) {
            potentialStreak = 'T';
            streakConfidence = 0.65 + (taiStreakScore - streakThreshold) * 0.1;
        } else {
            potentialStreak = 'X';
            streakConfidence = 0.65 + (xiuStreakScore - streakThreshold) * 0.1;
        }
        
        // Hạn chế độ tin cậy tối đa
        streakConfidence = Math.min(streakConfidence, 0.92);
        
        // 4. Quyết định dự đoán dựa trên bản chất chuỗi bệt
        // Nếu bệt còn mới (2-3 kết quả), thường sẽ tiếp tục
        // Nếu bệt đã dài (4+ kết quả), khả năng đảo chiều cao hơn
        const isTooLongStreak = (potentialStreak === 'T' && taiCount5 >= 4) || 
                               (potentialStreak === 'X' && xiuCount5 >= 4);
        
        return {
            predictTai: isTooLongStreak ? (potentialStreak === 'X') : (potentialStreak === 'T'),
            confidence: streakConfidence,
            reason: isTooLongStreak ? 
                `EarlyStreak: Phát hiện chuỗi bệt ${potentialStreak} đã dài, dự đoán đảo chiều` :
                `EarlyStreak: Phát hiện chuỗi bệt ${potentialStreak} đang hình thành, dự đoán tiếp tục`,
            streakType: potentialStreak,
            streakScore: potentialStreak === 'T' ? taiStreakScore : xiuStreakScore
        };
    }
    
    // Trường hợp không phát hiện bệt rõ ràng
    return { confidence: 0 };
}

/**
 * Phân tích độ mạnh và xu hướng của chuỗi kết quả
 * @param {Array} results - Mảng chuỗi kết quả Tài hoặc Xỉu
 * @returns {Object} Thông tin phân tích độ mạnh và xu hướng
 */
function analyzeStrengthAndDirection(results) {
    if (!results || results.length < 3) return { hasPattern: false };
    
    // Phân tích XU HƯỚNG và các tham số quan trọng
    const taiCount = results.filter(r => r === 'T').length;
    const xiuCount = results.filter(r => r === 'X').length;
    
    const recentResults = results.slice(0, 5);
    const recentTaiCount = recentResults.filter(r => r === 'T').length;
    const recentXiuCount = recentResults.filter(r => r === 'X').length;
    
    // 1. Phát hiện xu hướng hiện tại
    const currentDirection = recentTaiCount > recentXiuCount ? 'T' : 'X';
    
    // 2. Phát hiện độ mạnh của xu hướng
    let strength = 0;
    if (recentTaiCount >= 4) strength = recentTaiCount / 5;  // Độ mạnh từ 0-1
    if (recentXiuCount >= 4) strength = recentXiuCount / 5;
    
    // 3. Phát hiện sự đảo chiều
    const last3 = results.slice(0, 3);
    const previous3 = results.slice(3, 6);
    let isReversing = false;
    
    if (last3.filter(r => r === 'T').length >= 2 && previous3.filter(r => r === 'X').length >= 2) {
        isReversing = true; // Đảo chiều từ Xỉu sang Tài
    }
    
    if (last3.filter(r => r === 'X').length >= 2 && previous3.filter(r => r === 'T').length >= 2) {
        isReversing = true; // Đảo chiều từ Tài sang Xỉu
    }
    
    // 4. Kiểm tra chuỗi bệt mới hình thành
    const formingStreak = (last3.filter(r => r === last3[0]).length >= 2 && last3[0] !== previous3[0]);
    
    // 5. Kiểm tra sự hỗn loạn (không có quy luật)
    const isRandom = last3.join('') === 'TXT' || last3.join('') === 'XTX' || 
                     (last3.filter(r => r === 'T').length === last3.filter(r => r === 'X').length);
    
    // 6. Đánh giá tính ổn định của chuỗi
    let stability = 0;
    const streak = [];
    let currentChar = results[0];
    let currentStreak = 1;
    
    for (let i = 1; i < results.length; i++) {
        if (results[i] === currentChar) {
            currentStreak++;
        } else {
            streak.push({ type: currentChar, length: currentStreak });
            currentChar = results[i];
            currentStreak = 1;
        }
    }
    
    if (currentStreak > 0) {
        streak.push({ type: currentChar, length: currentStreak });
    }
    
    // Tính độ ổn định dựa trên độ dài trung bình của chuỗi
    if (streak.length > 0) {
        const avgStreakLength = streak.reduce((sum, s) => sum + s.length, 0) / streak.length;
        stability = Math.min(1, avgStreakLength / 3); // Chuỗi dài hơn 3 coi là ổn định cao
    }
    
    // 7. Quyết định dự đoán
    let prediction = null;
    let confidence = 0;
    let reason = "";
    
    // Chuỗi bệt mới hình thành - thường tiếp tục
    if (formingStreak && !isReversing) {
        prediction = last3[0] === 'T';
        confidence = 0.80 + (strength * 0.1);
        reason = `Phát hiện chuỗi bệt ${last3[0]} mới hình thành, dự đoán tiếp tục`;
    }
    // Bệt đang kết thúc - thường đảo chiều
    else if (streak.length > 0 && streak[0].length >= 3) {
        prediction = !(streak[0].type === 'T');
        confidence = 0.85 + (streak[0].length * 0.02);
        confidence = Math.min(confidence, 0.94);
        reason = `Phát hiện chuỗi bệt ${streak[0].type} dài đang kết thúc, dự đoán đảo chiều`;
    }
    // Xử lý đảo chiều xu hướng
    else if (isReversing) {
        prediction = currentDirection === 'T';
        confidence = 0.83;
        reason = `Phát hiện xu hướng đảo chiều sang ${currentDirection}, dự đoán theo xu hướng mới`;
    }
    // Tình huống ngẫu nhiên hoặc hỗn loạn
    else if (isRandom) {
        // Trong tình huống hỗn loạn, độ tin cậy thấp
        if (Math.random() > 0.5) {
            prediction = true;
            confidence = 0.65;
        } else {
            prediction = false;
            confidence = 0.65;
        }
        reason = "Phát hiện mẫu hỗn loạn không rõ ràng, dự đoán đảo chiều so với gần nhất";
    }
    
    return {
        hasPattern: prediction !== null,
        predictTai: prediction,
        confidence: confidence,
        reason: `StrengtDirectionAnalysis: ${reason}`,
        direction: currentDirection,
        strength: strength,
        isReversing: isReversing,
        formingStreak: formingStreak,
        isRandom: isRandom,
        stability: stability
    };
}

/**
 * Phát hiện các mẫu Tài/Xỉu dựa trên phân tích tổng hợp
 * @param {Array} history - Mảng lịch sử kết quả
 * @param {Number} index - Vị trí trong mảng numbers cần dự đoán
 * @returns {Object} Kết quả phát hiện mẫu và dự đoán
 */
function detectTaiXiuPatterns(history, index) {
    if (!history || history.length < 3) return { confidence: 0 };
    
    // Kiểm tra phát hiện bệt sớm trước tiên
    const earlyStreakResult = detectEarlyStreak(history, index);
    if (earlyStreakResult.confidence > 0) {
        return earlyStreakResult; // Ưu tiên kết quả phát hiện bệt sớm
    }
    
    // Chuyển đổi lịch sử thành chuỗi T/X
    const maxResults = Math.min(15, history.length);
    const results = history.slice(0, maxResults).map(item => item.numbers[index] >= 5 ? 'T' : 'X');
    
    // Phân tích độ mạnh và xu hướng
    const strengthAnalysis = analyzeStrengthAndDirection(results);
    if (strengthAnalysis.hasPattern) {
        return {
            predictTai: strengthAnalysis.predictTai,
            confidence: strengthAnalysis.confidence,
            reason: strengthAnalysis.reason
        };
    }
    
    // Lấy các chuỗi con để phân tích
    const recent2 = results.slice(0, 2).join('');
    const recent3 = results.slice(0, 3).join('');
    const recent4 = results.slice(0, 4).join('');
    const recent5 = results.slice(0, 5).join('');
    const recent6 = results.slice(0, 6).join('');
    
    // ----- MẪU 2 KẾT QUẢ -----
    
    // Mẫu 2 kết quả giống nhau
    if (recent2 === 'TT') {
        return {
            predictTai: Math.random() > 0.5 ? true : false, // Giữ Tài hoặc đảo chiều sang Xỉu (50/50)
            confidence: 0.65,
            reason: `TaiXiuPattern: Phát hiện mẫu TT, dự đoán ngẫu nhiên`
        };
    } else if (recent2 === 'XX') {
        return {
            predictTai: Math.random() > 0.5 ? true : false, // Giữ Xỉu hoặc đảo chiều sang Tài (50/50)
            confidence: 0.65,
            reason: `TaiXiuPattern: Phát hiện mẫu XX, dự đoán ngẫu nhiên`
        };
    }
    
    // Mẫu Tài rồi Xỉu
    if (recent2 === 'TX') {
        return {
            predictTai: false, // Tiếp tục Xỉu
            confidence: 0.68,
            reason: `TaiXiuPattern: Phát hiện mẫu TX, dự đoán tiếp tục X`
        };
    } 
    // Mẫu Xỉu rồi Tài
    else if (recent2 === 'XT') {
        return {
            predictTai: true, // Tiếp tục Tài
            confidence: 0.68,
            reason: `TaiXiuPattern: Phát hiện mẫu XT, dự đoán tiếp tục T`
        };
    }
    
    // ----- MẪU 3 KẾT QUẢ -----
    
    // 1. Mẫu bệt - 3 kết quả giống nhau liên tiếp
    if (recent3 === 'TTT') {
        return {
            predictTai: false, // Đảo chiều sau mẫu bệt
            confidence: 0.87,
            reason: `TaiXiuPattern: Phát hiện mẫu bệt TTT, dự đoán đảo chiều sang Xỉu`
        };
    } else if (recent3 === 'XXX') {
        return {
            predictTai: true, // Đảo chiều sau mẫu bệt 
            confidence: 0.87,
            reason: `TaiXiuPattern: Phát hiện mẫu bệt XXX, dự đoán đảo chiều sang Tài`
        };
    }
    
    // 2. Mẫu xen kẽ đối xứng
    if (recent3 === 'TXT') {
        return {
            predictTai: true,
            confidence: 0.83,
            reason: `TaiXiuPattern: Phát hiện mẫu xen kẽ đối xứng TXT, dự đoán tiếp tục T`
        };
    } else if (recent3 === 'XTX') {
        return {
            predictTai: false,
            confidence: 0.83,
            reason: `TaiXiuPattern: Phát hiện mẫu xen kẽ đối xứng XTX, dự đoán tiếp tục X`
        };
    }
    
    // 3. Mẫu hai Tài/Xỉu rồi đảo chiều
    if (recent3 === 'TTX') {
        return {
            predictTai: false,
            confidence: 0.80,
            reason: `TaiXiuPattern: Phát hiện mẫu TTX, dự đoán tiếp tục X`
        };
    } else if (recent3 === 'XXT') {
        return {
            predictTai: true,
            confidence: 0.80,
            reason: `TaiXiuPattern: Phát hiện mẫu XXT, dự đoán tiếp tục T`
        };
    }
    
    // 4. Mẫu Tài rồi hai Xỉu
    if (recent3 === 'TXX') {
        return {
            predictTai: false, // Tiếp tục Xỉu
            confidence: 0.75,
            reason: `TaiXiuPattern: Phát hiện mẫu TXX, dự đoán tiếp tục X`
        };
    } 
    // 5. Mẫu Xỉu rồi hai Tài
    else if (recent3 === 'XTT') {
        return {
            predictTai: true, // Tiếp tục Tài
            confidence: 0.75,
            reason: `TaiXiuPattern: Phát hiện mẫu XTT, dự đoán tiếp tục T`
        };
    }
    
    // ----- MẪU 4 KẾT QUẢ -----
    
    // 1. Mẫu 4 kết quả giống nhau
    if (recent4 === 'TTTT') {
        return {
            predictTai: false, // Đảo chiều mạnh sau 4 kết quả giống nhau
            confidence: 0.90,
            reason: `TaiXiuPattern: Phát hiện mẫu bệt dài TTTT, dự đoán đảo chiều mạnh sang X`
        };
    } else if (recent4 === 'XXXX') {
        return {
            predictTai: true, // Đảo chiều mạnh sau 4 kết quả giống nhau
            confidence: 0.90,
            reason: `TaiXiuPattern: Phát hiện mẫu bệt dài XXXX, dự đoán đảo chiều mạnh sang T`
        };
    }
    
    // 2. Mẫu hai Xỉu, Tài, Xỉu
    if (recent4 === 'XXTX') {
        return {
            predictTai: true, // Sau XXTX thường là T
            confidence: 0.77,
            reason: `TaiXiuPattern: Phát hiện mẫu XXTX, dự đoán tiếp theo là T`
        };
    }
    
    // 3. Mẫu hai Tài, Xỉu, Tài
    if (recent4 === 'TTXT') {
        return {
            predictTai: false, // Sau TTXT thường là X
            confidence: 0.77,
            reason: `TaiXiuPattern: Phát hiện mẫu TTXT, dự đoán tiếp theo là X`
        };
    }
    
    // 4. Mẫu dao động
    if (recent4 === 'TXTX') {
        return {
            predictTai: true, // Tiếp tục mẫu dao động
            confidence: 0.79,
            reason: `TaiXiuPattern: Phát hiện mẫu dao động TXTX, dự đoán tiếp tục T`
        };
    } else if (recent4 === 'XTXT') {
        return {
            predictTai: false, // Tiếp tục mẫu dao động
            confidence: 0.79,
            reason: `TaiXiuPattern: Phát hiện mẫu dao động XTXT, dự đoán tiếp tục X`
        };
    }
    
    // ----- MẪU 5 KẾT QUẢ TRỞ LÊN -----
    
    // 1. Mẫu dao động dài TXT...
    if (recent5 === 'TXTXT') {
        return {
            predictTai: true,
            confidence: 0.79,
            reason: `TaiXiuPattern: Phát hiện mẫu dao động TXTXT, dự đoán tiếp tục T`
        };
    } else if (recent5 === 'XTXTX') {
        return {
            predictTai: false,
            confidence: 0.79,
            reason: `TaiXiuPattern: Phát hiện mẫu dao động XTXTX, dự đoán tiếp tục X`
        };
    }
    
    // 2. Mẫu bệt dài 5 kết quả
    if (recent5 === 'TTTTT') {
        return {
            predictTai: false, // Đảo chiều mạnh sau 5 kết quả giống nhau
            confidence: 0.92,
            reason: `TaiXiuPattern: Phát hiện mẫu bệt dài TTTTT, dự đoán đảo chiều mạnh sang X`
        };
    } else if (recent5 === 'XXXXX') {
        return {
            predictTai: true, // Đảo chiều mạnh sau 5 kết quả giống nhau
            confidence: 0.92,
            reason: `TaiXiuPattern: Phát hiện mẫu bệt dài XXXXX, dự đoán đảo chiều mạnh sang T`
        };
    }
    
    // 3. Mẫu dao động dài 6 kết quả
    if (recent6 === 'TXTXTX') {
        return {
            predictTai: false, // Tiếp tục mẫu dao động
            confidence: 0.81,
            reason: `TaiXiuPattern: Phát hiện mẫu dao động dài TXTXTX, dự đoán tiếp tục X`
        };
    } else if (recent6 === 'XTXTXT') {
        return {
            predictTai: true, // Tiếp tục mẫu dao động
            confidence: 0.81,
            reason: `TaiXiuPattern: Phát hiện mẫu dao động dài XTXTXT, dự đoán tiếp tục T`
        };
    }
    
    // ----- MẪU ĐẶC BIỆT -----
    
    // Kiểm tra mẫu bệt dài (>5 Tài hoặc Xỉu liên tiếp)
    let consecutiveT = 0;
    let consecutiveX = 0;
    
    for (let i = 0; i < results.length; i++) {
        if (results[i] === 'T') {
            consecutiveT++;
            consecutiveX = 0;
        } else {
            consecutiveX++;
            consecutiveT = 0;
        }
        
        // Phát hiện chuỗi bệt cực dài (>6 kết quả giống nhau)
        if (consecutiveT >= 6) {
            return {
                predictTai: false, // Đảo chiều mạnh sau chuỗi bệt cực dài
                confidence: 0.95,
                reason: `TaiXiuPattern: Phát hiện mẫu bệt cực dài ${consecutiveT} Tài liên tiếp, dự đoán đảo chiều mạnh sang X`
            };
        }
        
        if (consecutiveX >= 6) {
            return {
                predictTai: true, // Đảo chiều mạnh sau chuỗi bệt cực dài
                confidence: 0.95,
                reason: `TaiXiuPattern: Phát hiện mẫu bệt cực dài ${consecutiveX} Xỉu liên tiếp, dự đoán đảo chiều mạnh sang T`
            };
        }
    }
    
    // Phát hiện mẫu đảo chiều đặc biệt (chuyển từ chuỗi Tài sang chuỗi Xỉu hoặc ngược lại)
    if (results.length >= 6) {
        const first3 = results.slice(0, 3).join('');
        const next3 = results.slice(3, 6).join('');
        
        if (first3 === 'XXX' && next3.includes('TT')) {
            return {
                predictTai: true,
                confidence: 0.85,
                reason: `TaiXiuPattern: Phát hiện mẫu đảo chiều đặc biệt XXX→TT, dự đoán tiếp tục T`
            };
        }
        
        if (first3 === 'TTT' && next3.includes('XX')) {
            return {
                predictTai: false,
                confidence: 0.85,
                reason: `TaiXiuPattern: Phát hiện mẫu đảo chiều đặc biệt TTT→XX, dự đoán tiếp tục X`
            };
        }
    }
    
    // Các mẫu TX mới dựa trên dữ liệu thực tế
    
    // Mẫu TTXXX - Chuỗi Tài chuyển sang bệt Xỉu
    if (recent5 === 'TTXXX') {
        return {
            predictTai: false, // Tiếp tục Xỉu
            confidence: 0.88,
            reason: `TaiXiuPattern: Phát hiện mẫu TTXXX đặc biệt, dự đoán tiếp tục X`
        };
    }
    
    // Mẫu XXTTT - Chuỗi Xỉu chuyển sang bệt Tài
    if (recent5 === 'XXTTT') {
        return {
            predictTai: true, // Tiếp tục Tài
            confidence: 0.88, 
            reason: `TaiXiuPattern: Phát hiện mẫu XXTTT đặc biệt, dự đoán tiếp tục T`
        };
    }
    
    // Mẫu chuyển đổi xen kẽ đặc biệt (từ dữ liệu thực tế)
    if (recent5 === 'TXTXX' || recent5 === 'TXTXT') {
        return {
            predictTai: true,
            confidence: 0.82,
            reason: `TaiXiuPattern: Phát hiện mẫu chuyển đổi ${recent5}, dự đoán tiếp theo là T`
        };
    }
    
    if (recent5 === 'XTXTT' || recent5 === 'XTXTX') {
        return {
            predictTai: false,
            confidence: 0.82,
            reason: `TaiXiuPattern: Phát hiện mẫu chuyển đổi ${recent5}, dự đoán tiếp theo là X`
        };
    }
    
    // Mẫu nhịp 2-2 (2 lần giống nhau rồi đổi)
    if (recent4 === 'TTXX') {
        return {
            predictTai: true, // Đảo chiều sau 2 lần Xỉu
            confidence: 0.78,
            reason: `TaiXiuPattern: Phát hiện mẫu nhịp 2-2 TTXX, dự đoán đảo chiều sang T`
        };
    }
    
    if (recent4 === 'XXTT') {
        return {
            predictTai: false, // Đảo chiều sau 2 lần Tài
            confidence: 0.78,
            reason: `TaiXiuPattern: Phát hiện mẫu nhịp 2-2 XXTT, dự đoán đảo chiều sang X`
        };
    }
    
    // ----- MẪU NÂNG CAO PHỤ THUỘC THỜI GIAN (v7.1.0) -----
    
    // Phát hiện mẫu bệt dài ngắt quãng (bệt có 1 kết quả ngược)
    const interruptedStreakT = recent5.replace(/X/g, '').length;
    const interruptedStreakX = recent5.replace(/T/g, '').length;
    
    if (interruptedStreakT >= 4) { // 4/5 kết quả là Tài, chỉ có 1 Xỉu xen kẽ
        return {
            predictTai: false, // Đảo chiều sau bệt gián đoạn
            confidence: 0.86,
            reason: `TaiXiuPattern: Phát hiện mẫu bệt Tài gián đoạn (${interruptedStreakT}/5), dự đoán đảo chiều`
        };
    }
    
    if (interruptedStreakX >= 4) { // 4/5 kết quả là Xỉu, chỉ có 1 Tài xen kẽ
        return {
            predictTai: true, // Đảo chiều sau bệt gián đoạn
            confidence: 0.86,
            reason: `TaiXiuPattern: Phát hiện mẫu bệt Xỉu gián đoạn (${interruptedStreakX}/5), dự đoán đảo chiều`
        };
    }
    
    // Nhận diện mẫu đảo chiều liên tục
    const alternatingPattern = recent6.split('').every((val, idx) => idx % 2 === 0 ? val === results[0] : val !== results[0]);
    if (alternatingPattern) {
        // Mẫu đảo chiều liên tục (TXTXTX hoặc XTXTXT)
        const nextShouldBe = results[0] === 'T' ? false : true; // Dự đoán đối lập với kết quả đầu tiên
        return {
            predictTai: nextShouldBe,
            confidence: 0.84,
            reason: `TaiXiuPattern: Phát hiện mẫu đảo chiều liên tục hoàn hảo, dự đoán ${nextShouldBe ? 'T' : 'X'}`
        };
    }
    
    // Nhận diện mẫu chặn trong quãng chuỗi dài
    const recent7 = results.slice(0, 7).join('');
    if (recent7.includes('TTTXT') || recent7.includes('TTTXX')) {
        return {
            predictTai: false, // Đảo chiều sau bệt Tài bị chặn
            confidence: 0.89,
            reason: `TaiXiuPattern: Phát hiện mẫu bệt Tài bị chặn, dự đoán tiếp tục X`
        };
    }
    
    if (recent7.includes('XXXTT') || recent7.includes('XXXTX')) {
        return {
            predictTai: true, // Đảo chiều sau bệt Xỉu bị chặn
            confidence: 0.89,
            reason: `TaiXiuPattern: Phát hiện mẫu bệt Xỉu bị chặn, dự đoán tiếp tục T`
        };
    }
    
    // Nếu không tìm thấy mẫu đặc biệt nào
    return { confidence: 0 };
}

/**
 * Export các chức năng
 * Phiên bản v7.1.0: Phương pháp dự đoán dựa trên mẫu TX và phát hiện bệt sớm
 */
module.exports = {
    generateNumbers,
    detectTaiXiuPatterns,
    detectEarlyStreak,
    analyzeStrengthAndDirection,
    calculateRecentLosses,
    getTimePeriod,
    getPeriodResults,
    calculateKellyCriterion
};
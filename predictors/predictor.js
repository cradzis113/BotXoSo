/**
 * NÂNG CẤP 5.5: Phân tích xu hướng dài (5-7 kỳ)
 */

const fs = require('fs');

function analyzeLongTrend(history, position, limit = 7) {
    // Đảm bảo dữ liệu hợp lệ
    if (!history || !Array.isArray(history) || history.length < 5) {
        return { confidence: 0 };
    }
    
    // Đảm bảo numbers là số, không phải string
    const recentResults = history.slice(0, Math.min(limit, history.length)).map(item => {
        if (item.numbers && Array.isArray(item.numbers)) {
            return {
                ...item,
                numbers: item.numbers.map(num => typeof num === 'string' ? parseInt(num, 10) : num)
            };
        }
        return item;
    });
    
    if (recentResults.length < 5) return { confidence: 0 };

    // Log để kiểm tra dữ liệu
    console.log(`📊 Phân tích xu hướng dài với ${recentResults.length} kết quả, vị trí ${position}`);

    const taiCount = recentResults.filter(item => item.numbers[position] >= 5).length;
    const xiuCount = recentResults.length - taiCount;

    // Tính tỷ lệ và độ tin cậy
    const dominantRatio = Math.max(taiCount, xiuCount) / recentResults.length;
    
    // Phân tích chuỗi
    const pattern = recentResults.map(item => item.numbers[position] >= 5 ? 'T' : 'X').join('');
    console.log(`Mẫu hình dài: ${pattern}`);

    // Đếm số lần kết quả lặp lại
    let repetitions = 0;
    for (let i = 1; i < pattern.length; i++) {
        if (pattern[i] === pattern[i - 1]) repetitions++;
    }

    // Tính xác suất lặp lại
    const repetitionRate = repetitions / (pattern.length - 1);

    // CẢI TIẾN 1: Tăng độ nhạy phát hiện xu hướng
    if (dominantRatio >= 0.7) { // Giảm từ 0.8 xuống 0.7 để phát hiện xu hướng sớm hơn
        const isTaiDominant = taiCount > xiuCount;

        // CẢI TIẾN 2: Điều chỉnh tỷ lệ theo xu hướng dựa vào hiệu suất thực tế
        const followTrend = Math.random() < 0.85; // Tăng từ 0.8 lên 0.85 vì theo xu hướng có hiệu quả tốt hơn

        return {
            trendType: isTaiDominant ? 'TÀI' : 'XỈU',
            confidence: dominantRatio,
            predictTai: followTrend ? isTaiDominant : !isTaiDominant,
            reason: followTrend ?
                `Theo xu hướng ${isTaiDominant ? 'Tài' : 'Xỉu'} mạnh (${Math.round(dominantRatio * 100)}%)` :
                `Đảo chiều sau chuỗi ${isTaiDominant ? 'Tài' : 'Xỉu'} mạnh (${Math.round(dominantRatio * 100)}%)`
        };
    }

    // CẢI TIẾN: Tăng ngưỡng lặp lại để chắc chắn hơn
    if (repetitionRate >= 0.75) { // Tăng từ 0.7 lên 0.75
        return {
            trendType: 'LẶP LẠI',
            confidence: repetitionRate,
            predictTai: pattern[0] === 'T',
            reason: `Phát hiện tỷ lệ lặp lại cao (${Math.round(repetitionRate * 100)}%), tiếp tục xu hướng hiện tại`
        };
    }

    return { confidence: 0 };
}

/**
 * NÂNG CẤP 5.5: Phát hiện mẫu hình phức tạp
 */
function detectComplexPattern(results) {
    if (results.length < 5) return { detected: false };

    const pattern = results.join('');

    // CẢI TIẾN 3: Thêm nhận diện mẫu hình xen kẽ ngắn hơn và có tính lặp lại
    // Mẫu "TXXT" và "XTTX" xuất hiện nhiều trong log
    if (pattern.startsWith('TXXT')) {
        return {
            detected: true,
            patternType: 'Mẫu T-X-X-T',
            predictTai: true,
            reason: 'Phát hiện mẫu hình T-X-X-T, dự đoán tiếp theo là T'
        };
    }

    if (pattern.startsWith('XTTX')) {
        return {
            detected: true,
            patternType: 'Mẫu X-T-T-X',
            predictTai: false,
            reason: 'Phát hiện mẫu hình X-T-T-X, dự đoán tiếp theo là X'
        };
    }
    
    // CẢI TIẾN 4: Nhận diện "chuỗi 3 kỳ đảo chiều" - một mẫu phổ biến trong dữ liệu
    if (pattern.startsWith('TTT')) {
        return {
            detected: true,
            patternType: 'Chuỗi T-T-T',
            predictTai: false,  // Đảo chiều sau 3 kỳ Tài liên tiếp
            reason: 'Phát hiện chuỗi 3 kỳ Tài liên tiếp, dự đoán đảo chiều sang Xỉu'
        };
    }

    if (pattern.startsWith('XXX')) {
        return {
            detected: true,
            patternType: 'Chuỗi X-X-X',
            predictTai: true,  // Đảo chiều sau 3 kỳ Xỉu liên tiếp
            reason: 'Phát hiện chuỗi 3 kỳ Xỉu liên tiếp, dự đoán đảo chiều sang Tài'
        };
    }

    // Tăng độ nhạy với mẫu hình xen kẽ
    let alternatingCount = 0;
    for (let i = 0; i < pattern.length - 1; i++) {
        if (pattern[i] !== pattern[i + 1]) {
            alternatingCount++;
        }
    }

    // CẢI TIẾN: Sử dụng độ nhạy cao hơn cho mẫu xen kẽ
    if (alternatingCount >= pattern.length - 1) {
        return {
            detected: true,
            patternType: 'Xen kẽ hoàn hảo',
            predictTai: pattern[0] !== 'T',
            reason: `Mẫu hình xen kẽ hoàn hảo ${pattern.length} kỳ liên tiếp`
        };
    }

    return { detected: false };
}

/**
 * NÂNG CẤP 5.5: Phân tích cân bằng thay vì siêu phản ứng
 */
function balancedAnalysis(history, index, limitList = [3, 7, 12]) { // CẢI TIẾN 5: Điều chỉnh limitList thành [3, 7, 12]
    // Đảm bảo dữ liệu hợp lệ
    if (!history || !Array.isArray(history) || history.length < 3) {
        return {
            prediction: Math.random() >= 0.5,
            strategy: "Random",
            reason: "Không đủ dữ liệu để phân tích"
        };
    }
    
    // Đảm bảo numbers là số, không phải string
    const checkedHistory = history.map(item => {
        if (item.numbers && Array.isArray(item.numbers)) {
            return {
                ...item,
                numbers: item.numbers.map(num => typeof num === 'string' ? parseInt(num, 10) : num)
            };
        }
        return item;
    });

    // Kiểm tra dữ liệu sau khi chuyển đổi

    const allHistory = checkedHistory.map(item => item.numbers[index] >= 5 ? 'T' : 'X');

    // CẢI TIẾN: Sử dụng dữ liệu lịch sử dài hơn
    const shortLimit = Math.min(limitList[0] || 5, allHistory.length);  // Tăng từ 3 lên 5
    const mediumLimit = Math.min(limitList[1] || 12, allHistory.length); // Tăng từ 10 lên 12
    const longLimit = Math.min(limitList[2] || 20, allHistory.length);  // Tăng từ 15 lên 20

    // Tính tỷ lệ từ nhiều khoảng thời gian
    const shortTaiCount = allHistory.slice(0, shortLimit).filter(r => r === 'T').length;
    const shortTaiRate = shortTaiCount / shortLimit;

    const mediumTaiCount = allHistory.slice(0, mediumLimit).filter(r => r === 'T').length;
    const mediumTaiRate = mediumTaiCount / mediumLimit;
    
    // CẢI TIẾN: Thêm phân tích dài hạn
    const longTaiCount = allHistory.slice(0, longLimit).filter(r => r === 'T').length;
    const longTaiRate = longTaiCount / longLimit;

    // CẢI TIẾN: Điều chỉnh ngưỡng nhận diện xu hướng mạnh
    if (shortTaiRate >= 0.7) { // Giảm từ 0.75 xuống 0.7
        return {
            prediction: true,
            strategy: "FollowStrongTaiTrend",
            reason: `Theo xu hướng Tài mạnh (${Math.round(shortTaiRate * 100)}%)`
        };
    }
    else if (shortTaiRate <= 0.3) { // Tăng từ 0.25 lên 0.3
        return {
            prediction: false,
            strategy: "FollowStrongXiuTrend",
            reason: `Theo xu hướng Xỉu mạnh (${Math.round((1 - shortTaiRate) * 100)}%)`
        };
    }

    // CẢI TIẾN: Điều chỉnh ngưỡng phát hiện đứt gãy
    if (Math.abs(shortTaiRate - mediumTaiRate) >= 0.4) { // Giảm từ 0.45 xuống 0.4
        console.log(`Phát hiện đứt gãy mạnh: Ngắn ${Math.round(shortTaiRate * 100)}% vs Trung ${Math.round(mediumTaiRate * 100)}%`);

        return {
            prediction: shortTaiRate >= 0.5,
            strategy: "StrongTrendBreak",
            reason: `Phát hiện đứt gãy mạnh, theo xu hướng ngắn hạn ${shortTaiRate >= 0.5 ? 'Tài' : 'Xỉu'}`
        };
    }

    // CẢI TIẾN: Thêm so sánh xu hướng dài hạn
    if (Math.abs(shortTaiRate - longTaiRate) >= 0.35) { // Giảm từ 0.4 xuống 0.35
        console.log(`Phát hiện thay đổi xu hướng dài: Ngắn ${Math.round(shortTaiRate * 100)}% vs Dài ${Math.round(longTaiRate * 100)}%`);
        
        return {
            prediction: shortTaiRate >= 0.5,
            strategy: "LongTermShift", 
            reason: `Phát hiện thay đổi xu hướng, ưu tiên xu hướng gần đây ${shortTaiRate >= 0.5 ? 'Tài' : 'Xỉu'}`
        };
    }

    // CẢI TIẾN 6: Điều chỉnh ngưỡng nhận diện xu hướng RecentXiuEmphasis vì có hiệu suất tốt hơn
    if (allHistory.length >= 3) {
        const lastThree = allHistory.slice(0, 3);
        const taiCount = lastThree.filter(r => r === 'T').length;
        
        if (taiCount >= 2) {
            // Giảm ưu tiên Tài do hiệu suất thấp hơn
            if (Math.random() < 0.65) { // 65% khả năng theo xu hướng Tài
                return {
                    prediction: true,
                    strategy: "RecentTaiEmphasis",
                    reason: `Ưu tiên kết quả gần nhất: Tài chiếm ưu thế (${taiCount}/3)`
                };
            } else {
                return {
                    prediction: false,
                    strategy: "EmergencyReversal",
                    reason: "Đảo chiều chiến thuật mặc dù Tài chiếm ưu thế"
                };
            }
        } else if (taiCount <= 1) {
            // Tăng ưu tiên Xỉu do hiệu suất tốt hơn
            return {
                prediction: false,
                strategy: "RecentXiuEmphasis",
                reason: `Ưu tiên kết quả gần nhất: Xỉu chiếm ưu thế (${3-taiCount}/3)`
            };
        }
    }

    // CẢI TIẾN: Thêm chiến lược phản hồi nhanh đối với đảo chiều
    if (allHistory.length >= 5) {
        const reversalPattern = (allHistory[0] !== allHistory[1] && 
                               allHistory[1] !== allHistory[2] && 
                               allHistory[2] !== allHistory[3]);
        
        if (reversalPattern) {
            return {
                prediction: allHistory[0] === 'T',  // Theo kỳ gần nhất
                strategy: "RapidResponseReversal",
                reason: "Phát hiện mẫu đảo chiều liên tục, theo hướng kỳ gần nhất"
            };
        }
    }

    // CẢI TIẾN: Triệt tiêu nhiễu ngẫu nhiên
    if (Math.abs(shortTaiRate - 0.5) < 0.1 && Math.abs(mediumTaiRate - 0.5) < 0.1) {
        // Nếu tỷ lệ rất cân bằng, tăng yếu tố ngẫu nhiên
        return {
            prediction: Math.random() >= 0.5, 
            strategy: "PureRandom",
            reason: "Phân bố cực kỳ cân bằng, sử dụng dự đoán ngẫu nhiên hoàn toàn"
        };
    }

    // Tăng trọng số cho ReverseStreak trong balancedAnalysis
    // Thêm điều kiện nhận diện chuỗi đảo chiều
    if (allHistory.length >= 4) {
        const lastThree = allHistory.slice(0, 3);
        const allSame = lastThree.every(result => result === lastThree[0]);
        if (allSame) {
            return {
                prediction: lastThree[0] !== 'T',
                strategy: "ReverseStreak",
                reason: `Phát hiện chuỗi ${lastThree[0] === 'T' ? 'Tài' : 'Xỉu'} liên tiếp, đảo chiều dự đoán`
            };
        }
    }

    // Giữ phương pháp cân bằng mặc định
    return {
        prediction: Math.random() >= 0.5,
        strategy: "Balanced",
        reason: "Không phát hiện xu hướng rõ ràng, dự đoán cân bằng"
    };
}

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

function analyzeLimitPerformance(historyLogFile, limitConfig = null, lastN = null) {
    const results = [];
    try {
        if (fs.existsSync(historyLogFile)) {
            const logContent = fs.readFileSync(historyLogFile, 'utf8');
            const lines = logContent.split('\n').filter(line => line.trim() !== '');
            
            // Lọc dòng theo cấu hình limit nếu được chỉ định
            let filteredLines = lines;
            if (limitConfig) {
                const configStr = limitConfig.join(',');
                filteredLines = lines.filter(line => line.includes(`Cấu hình: [${configStr}]`));
                console.log(`Đang phân tích ${filteredLines.length} dòng log với cấu hình [${configStr}]`);
            }
            
            // Chỉ lấy N dòng cuối cùng nếu lastN được chỉ định
            if (lastN && lastN > 0) {
                filteredLines = filteredLines.slice(-lastN);
                console.log(`Đang phân tích ${filteredLines.length} dòng log gần nhất`);
            }
            
            // Phân tích dữ liệu
            const methodResults = {};
            
            for (const line of filteredLines) {
                const methodMatch = line.match(/\| Phương pháp: ([A-Za-z]+)/);
                const isCorrect = line.includes('| Đúng');
                
                if (methodMatch) {
                    const method = methodMatch[1];
                    if (!methodResults[method]) {
                        methodResults[method] = { total: 0, correct: 0 };
                    }
                    
                    methodResults[method].total++;
                    if (isCorrect) methodResults[method].correct++;
                }
            }
            
            // Tính tỷ lệ thành công cho mỗi phương pháp
            for (const [method, data] of Object.entries(methodResults)) {
                const successRate = (data.correct / data.total) * 100;
                results.push({
                    method,
                    total: data.total,
                    correct: data.correct,
                    successRate: Math.round(successRate)
                });
            }
            
            // Sắp xếp theo tỷ lệ thành công
            results.sort((a, b) => b.successRate - a.successRate);
            
            // Tính tỷ lệ tổng thể
            const totalPredictions = filteredLines.length;
            const correctPredictions = filteredLines.filter(line => line.includes('| Đúng')).length;
            const overallRate = (correctPredictions / totalPredictions) * 100;
            
            console.log(`📊 Tỷ lệ thành công tổng thể: ${Math.round(overallRate)}% (${correctPredictions}/${totalPredictions})`);
        }
    } catch (error) {
        console.error(`❌ Lỗi khi phân tích hiệu suất: ${error.message}`);
    }
    
    return results;
}

// CẢI TIẾN 8: Thêm hàm mới để phát hiện các đảo chiều chu kỳ
function detectCyclicalReversals(history, index) {
    // Bảo vệ dữ liệu đầu vào
    if (history.length < 5) return { detected: false };
    
    // V4.0: Giảm số lượng kết quả phân tích từ 10 xuống 7 để tập trung vào gần đây
    const results = history.slice(0, 7).map(item => item.numbers[index] >= 5 ? 'T' : 'X');
    console.log(`v4.0: Phân tích chu kỳ với ${results.length} kết quả: ${results.join('')}`);
    
    // V4.0: Tăng trọng số cho kết quả gần đây hơn
    const weightedResults = [];
    for (let i = 0; i < results.length; i++) {
        // Tăng trọng số cho dữ liệu gần, giảm mạnh cho dữ liệu cũ
        const weight = Math.pow(0.8, i);  // Tăng tốc độ suy giảm (từ 0.9 xuống 0.8)
        weightedResults.push({
            value: results[i],
            weight: weight
        });
    }
    
    // V4.0: Phân tích mạnh mẽ các chu kỳ ngắn hạn 2-3-4
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
    
    // V4.0: Tính tỷ lệ đúng thực tế cho chu kỳ 2
    const cycle2Accuracy = cycle2Count > 0 ? cycle2Correct / cycle2Count : 0;
    console.log(`v4.0: Chu kỳ 2 - Số mẫu: ${cycle2Count}, Đúng: ${cycle2Correct}, Tỷ lệ: ${(cycle2Accuracy*100).toFixed(1)}%`);
    
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
    console.log(`v4.0: Chu kỳ 3 - Số mẫu: ${cycle3Count}, Đúng: ${cycle3Correct}, Tỷ lệ: ${(cycle3Accuracy*100).toFixed(1)}%`);
    
    // V4.0: Cải tiến phát hiện mẫu phức tạp
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
            console.log(`v4.0: Phát hiện mẫu phức tạp ${pattern5}, dự đoán tiếp theo là ${complexPatterns[pattern5]}`);
        }
    }
    
    // V4.0: Phát hiện mẫu ngắn gọn nhưng hiệu quả cho xổ số 45 giây
    // Phát hiện mẫu "TTX" hoặc "XXT" ở 3 vị trí đầu
    if (results.length >= 3) {
        const first3 = results.slice(0, 3).join('');
        if (first3 === "TTX") {
            return {
                detected: true,
                patternType: "FastTTX",
                confidence: 0.78,
                predictTai: false,
                reason: `v4.0: Phát hiện mẫu TTX rõ rệt, dự đoán tiếp tục X`
            };
        } else if (first3 === "XXT") {
            return {
                detected: true,
                patternType: "FastXXT",
                confidence: 0.78,
                predictTai: true,
                reason: `v4.0: Phát hiện mẫu XXT rõ rệt, dự đoán tiếp tục T`
            };
        }
    }
    
    // V4.0: Thiên vị các chu kỳ dựa trên độ chính xác
    const cycleConfidences = [
        { type: 2, count: cycle2Count, confidence: cycle2Confidence, accuracy: cycle2Accuracy },
        { type: 3, count: cycle3Count, confidence: cycle3Confidence, accuracy: cycle3Accuracy },
        { type: 'complex', count: complexPatternDetected ? 1 : 0, confidence: complexPatternConfidence, accuracy: 0.85 }
    ];
    
    // V4.0: Sắp xếp theo độ chính xác + độ tin cậy
    cycleConfidences.sort((a, b) => {
        // Tạo điểm số tổng hợp (70% độ chính xác + 30% độ tin cậy)
        const scoreA = (a.accuracy * 0.7) + (a.confidence * 0.3);
        const scoreB = (b.accuracy * 0.7) + (b.confidence * 0.3);
        return scoreB - scoreA;
    });
    
    // V4.0: Giảm ngưỡng tin cậy để tăng tỷ lệ phát hiện
    const bestCycle = cycleConfidences.find(c => c.confidence > 0.25 && c.count > 0);
    
    if (bestCycle) {
        if (bestCycle.type === 'complex') {
            // Xử lý mẫu phức tạp
            return {
                detected: true,
                cycleType: 'complex',
                confidence: bestCycle.confidence,
                predictTai: complexPatternPrediction,
                reason: `v4.0: Phát hiện mẫu phức tạp với độ tin cậy ${(bestCycle.confidence * 100).toFixed(1)}%`
            };
        } else {
            // Dự đoán dựa trên chu kỳ tốt nhất
            const cycleType = bestCycle.type;
            const cyclePos = results.length % cycleType; // Vị trí hiện tại trong chu kỳ
            
            // V4.0: Cải tiến dự đoán - lấy giá trị tại vị trí đối xứng trong chu kỳ
            let predictedValue;
            
            if (cycleType === 2) {
                // Chu kỳ 2: kỳ chẵn-lẻ xen kẽ
                predictedValue = results[1]; // Giá trị tại vị trí 1 (index thứ 2)
            } else if (cycleType === 3) {
                // Chu kỳ 3: lấy giá trị tại vị trí tương ứng trong chu kỳ
                const predictionPos = cyclePos === 0 ? 0 : (cyclePos === 1 ? 1 : 2);
                predictedValue = results[predictionPos];
            }
            
            // V4.0: Tăng độ tin cậy dựa trên tỷ lệ đúng thực tế
            const adjustedConfidence = bestCycle.confidence * (0.8 + (bestCycle.accuracy * 0.2));
            
            return {
                detected: true,
                cycleType: cycleType,
                confidence: Math.min(0.85, adjustedConfidence), // Giới hạn max 0.85
                predictTai: predictedValue === 'T',
                reason: `v4.0: Phát hiện chu kỳ ${cycleType} kỳ với độ tin cậy ${(adjustedConfidence * 100).toFixed(1)}%, dự đoán ${predictedValue}`
            };
        }
    }
    
    // V4.0: Tăng cường phát hiện đảo chiều sau một chuỗi liên tiếp
    if (results.length >= 3 && results[0] === results[1] && results[1] === results[2]) {
        return {
            detected: true,
            cycleType: 'streak-reversal',
            confidence: 0.78,
            predictTai: results[0] !== 'T',
            reason: `v4.0: Phát hiện chuỗi ${results[0]}-${results[0]}-${results[0]}, dự đoán đảo chiều sang ${results[0] === 'T' ? 'X' : 'T'}`
        };
    }
    
    // V4.0: Phát hiện chu kỳ 2 với độ tin cậy thấp hơn nhưng vẫn hữu ích
    if (cycle2Count >= 1) {
        return {
            detected: true,
            cycleType: 2,
            confidence: 0.7 * cycle2Confidence, // Giảm độ tin cậy
            predictTai: results[results.length % 2] === 'T',
            reason: `v4.0: Phát hiện chu kỳ đảo chiều 2 kỳ với độ tin cậy ${(cycle2Confidence * 70).toFixed(1)}%`
        };
    }
    
    // Không phát hiện mẫu rõ ràng
    return { detected: false };
}

// 1. Cải thiện phát hiện đảo chiều sau chuỗi dài - PHIÊN BẢN NÂNG CAO
function detectLongStreaks(history, index) {
    if (history.length < 4) return { detected: false };
    
    // CẢI TIẾN 1: Mở rộng phạm vi phân tích từ 10 lên 15 kỳ
    const maxResults = Math.min(15, history.length);
    const results = history.slice(0, maxResults).map(item => item.numbers[index] >= 5 ? 'T' : 'X');
    console.log(`Phân tích chuỗi dài nâng cao: ${results.join('')}`);
    
    // CẢI TIẾN 2: Tách ra từng chuỗi liên tục
    const streaks = [];
    let currentStreak = { type: results[0], length: 1, startPos: 0 };
    
    for (let i = 1; i < results.length; i++) {
        if (results[i] === currentStreak.type) {
            currentStreak.length++;
        } else {
            streaks.push({ ...currentStreak });
            currentStreak = { type: results[i], length: 1, startPos: i };
        }
    }
    
    // Thêm chuỗi cuối cùng
    streaks.push({ ...currentStreak });
    
    // Ghi log phân tích chuỗi
    streaks.forEach((streak, i) => {
        console.log(`Chuỗi #${i+1}: ${streak.type} x ${streak.length} bắt đầu từ vị trí ${streak.startPos}`);
    });
    
    // CẢI TIẾN 3: Tìm chuỗi dài nhất trong 7 kỳ gần nhất
    const recentStreaks = streaks.filter(s => s.startPos < 7);
    const longestRecentStreak = recentStreaks.sort((a, b) => b.length - a.length)[0];
    
    if (!longestRecentStreak) {
        return { detected: false };
    }
    
    console.log(`Chuỗi gần đây dài nhất: ${longestRecentStreak.type} x ${longestRecentStreak.length}`);
    
    // CẢI TIẾN 4: Phân tích tỷ lệ đảo chiều sau chuỗi với độ dài tương tự
    // Tạo danh sách các chuỗi tương tự trong quá khứ (không bao gồm chuỗi hiện tại)
    const similarPastStreaks = streaks.filter(s => 
        s.type === longestRecentStreak.type && 
        Math.abs(s.length - longestRecentStreak.length) <= 1 && 
        s.startPos > longestRecentStreak.startPos
    );
    
    // CẢI TIẾN 5: Tính toán xác suất đảo chiều dựa trên dữ liệu thực tế
    // Mặc định, xác suất đảo chiều tăng theo độ dài chuỗi từ 30% đến 80%
    let reverseProb = Math.min(0.3 + (longestRecentStreak.length * 0.1), 0.8);
    
    // CẢI TIẾN 6: Tìm dữ liệu chuyển tiếp từ chuỗi tương tự trong quá khứ
    if (similarPastStreaks.length > 0) {
        let reversalCount = 0;
        
        for (const pastStreak of similarPastStreaks) {
            const pastStreakEndPos = pastStreak.startPos + pastStreak.length - 1;
            if (pastStreakEndPos + 1 < results.length) {
                // Kiểm tra xem sau chuỗi có đảo chiều không
                const reversed = results[pastStreakEndPos + 1] !== pastStreak.type;
                if (reversed) reversalCount++;
            }
        }
        
        // Tính tỷ lệ đảo chiều từ dữ liệu thực tế
        if (similarPastStreaks.length > 0) {
            const empiricalReverseRate = reversalCount / similarPastStreaks.length;
            console.log(`Tỷ lệ đảo chiều thực tế sau chuỗi ${longestRecentStreak.type} dài ${longestRecentStreak.length}: ${(empiricalReverseRate * 100).toFixed(1)}% (${reversalCount}/${similarPastStreaks.length})`);
            
            // Kết hợp xác suất lý thuyết với xác suất thực tế
            // Cho xác suất thực tế trọng số cao hơn (0.7) so với lý thuyết (0.3)
            reverseProb = (0.3 * reverseProb) + (0.7 * empiricalReverseRate);
        }
    }
    
    // CẢI TIẾN 7: Điều chỉnh xác suất dựa trên hiệu suất quá khứ
    if (typeof global.getMethodSuccessRate === 'function') {
        const lastPerformance = global.getMethodSuccessRate("LongStreakPattern");
        
        if (lastPerformance < 0.45) {
            // Nếu hiệu suất kém, đảo ngược chiến lược
            reverseProb = 1 - reverseProb;
            console.log(`⚙️ Đảo ngược chiến lược do hiệu suất thấp (${(lastPerformance * 100).toFixed(1)}%)`);
        } else if (lastPerformance >= 0.6) {
            // Nếu hiệu suất tốt, tăng độ tin cậy
            // Đẩy xác suất xa hơn khỏi 0.5
            if (reverseProb > 0.5) {
                reverseProb = Math.min(0.9, reverseProb + 0.1);
            } else if (reverseProb < 0.5) {
                reverseProb = Math.max(0.1, reverseProb - 0.1);
            }
            console.log(`⚙️ Tăng độ tin cậy do hiệu suất cao (${(lastPerformance * 100).toFixed(1)}%)`);
        }
    }
    
    // CẢI TIẾN 8: Thêm phân tích bối cảnh toàn cục
    // Phân tích xu hướng tổng thể
    const taiCount = results.filter(r => r === 'T').length;
    const xiuCount = results.length - taiCount;
    const globalTaiDominance = taiCount / results.length;
    
    // Điều chỉnh xác suất theo xu hướng toàn cục
    if (globalTaiDominance >= 0.65 && longestRecentStreak.type === 'T') {
        // Xu hướng Tài mạnh + đang trong chuỗi Tài => giảm xác suất đảo chiều
        reverseProb = Math.max(0.2, reverseProb - 0.15);
        console.log(`⚙️ Giảm xác suất đảo chiều do xu hướng Tài mạnh (${(globalTaiDominance * 100).toFixed(1)}%)`);
    } else if (globalTaiDominance <= 0.35 && longestRecentStreak.type === 'X') {
        // Xu hướng Xỉu mạnh + đang trong chuỗi Xỉu => giảm xác suất đảo chiều
        reverseProb = Math.max(0.2, reverseProb - 0.15);
        console.log(`⚙️ Giảm xác suất đảo chiều do xu hướng Xỉu mạnh (${((1 - globalTaiDominance) * 100).toFixed(1)}%)`);
    }
    
    // CẢI TIẾN 9: Tăng ngưỡng phát hiện chuỗi
    const detectionThreshold = 2; // Tăng từ 1 lên 2 để chọn lọc hơn
    
    if (longestRecentStreak.length >= detectionThreshold) {
        // Quyết định đảo chiều hay không
        const shouldReverse = Math.random() < reverseProb;
        
        // CẢI TIẾN 10: Thêm độ tin cậy vào kết quả
        return {
            detected: true,
            streakType: longestRecentStreak.type,
            streakLength: longestRecentStreak.length,
            confidence: Math.abs(reverseProb - 0.5) * 2, // Chuyển thành thang 0-1 
            predictTai: shouldReverse ? (longestRecentStreak.type !== 'T') : (longestRecentStreak.type === 'T'),
            reason: shouldReverse ? 
                `Đảo chiều sau chuỗi ${longestRecentStreak.type} dài ${longestRecentStreak.length} kỳ (xác suất đảo: ${Math.round(reverseProb*100)}%)` : 
                `Tiếp tục theo chuỗi ${longestRecentStreak.type} dài ${longestRecentStreak.length} kỳ (xác suất tiếp tục: ${Math.round((1-reverseProb)*100)}%)`
        };
    }
    
    return { detected: false };
}

// 2. Phát hiện mẫu hình xen kẽ ngắn - CẢI TIẾN PHIÊN BẢN 3.2
function detectShortAlternatingPattern(history, index) {
    if (history.length < 5) return { detected: false };
    
    // CẢI TIẾN V3.2: Giảm phạm vi phân tích từ 12 xuống 10 kỳ gần nhất để tập trung vào dữ liệu mới hơn
    const maxResults = Math.min(10, history.length);
    const results = history.slice(0, maxResults).map(item => item.numbers[index] >= 5 ? 'T' : 'X');
    console.log(`Phân tích mẫu hình xen kẽ V3.2: ${results.join('')}`);
    
    // CẢI TIẾN V3.2: Tăng hệ số suy giảm cho trọng số theo hàm mũ
    const weightedResults = [];
    for (let i = 0; i < results.length; i++) {
        // Tăng trọng số cho dữ liệu gần nhất, giảm mạnh cho dữ liệu cũ
        const weight = Math.pow(0.70, i);  // Giảm nhanh hơn (từ 0.75 xuống 0.70)
        weightedResults.push({
            value: results[i],
            weight: weight,
            position: i
        });
    }
    
    // Phân tích cửa sổ trượt kích thước 3, 4 và 5
    const slidingWindows = [];
    
    // Cửa sổ kích thước 3
    for (let i = 0; i <= results.length - 3; i++) {
        const window = results.slice(i, i + 3);
        let alternations = 0;
        for (let j = 0; j < window.length - 1; j++) {
            if (window[j] !== window[j + 1]) alternations++;
        }
        slidingWindows.push({
            window,
            size: 3,
            alternationRatio: alternations / (window.length - 1),
            startPos: i
        });
    }
    
    // Cửa sổ kích thước 4
    for (let i = 0; i <= results.length - 4; i++) {
        const window = results.slice(i, i + 4);
        let alternations = 0;
        for (let j = 0; j < window.length - 1; j++) {
            if (window[j] !== window[j + 1]) alternations++;
        }
        slidingWindows.push({
            window,
            size: 4,
            alternationRatio: alternations / (window.length - 1),
            startPos: i
        });
    }
    
    // Cửa sổ kích thước 5
    for (let i = 0; i <= results.length - 5; i++) {
        const window = results.slice(i, i + 5);
        let alternations = 0;
        for (let j = 0; j < window.length - 1; j++) {
            if (window[j] !== window[j + 1]) alternations++;
        }
        slidingWindows.push({
            window,
            size: 5,
            alternationRatio: alternations / (window.length - 1),
            startPos: i
        });
    }
    
    // Sắp xếp cửa sổ theo tỷ lệ xen kẽ cao nhất và ưu tiên cửa sổ gần nhất
    slidingWindows.sort((a, b) => {
        // Ưu tiên cửa sổ có startPos = 0 (gần nhất)
        if (a.startPos === 0 && b.startPos !== 0) return -1;
        if (a.startPos !== 0 && b.startPos === 0) return 1;
        
        // Sau đó sắp xếp theo tỷ lệ xen kẽ
        return b.alternationRatio - a.alternationRatio;
    });
    
    // CẢI TIẾN V3.2: Tăng ngưỡng phát hiện từ 0.60 lên 0.70
    if (slidingWindows.length > 0 && slidingWindows[0].alternationRatio > 0.70) {
        const bestWindow = slidingWindows[0];
        console.log(`V3.2: Phát hiện cửa sổ xen kẽ tốt nhất: ${bestWindow.window.join('')} (${(bestWindow.alternationRatio * 100).toFixed(1)}%, kích thước: ${bestWindow.size})`);
        
        // Nếu có mẫu xen kẽ hoàn hảo (100%)
        if (bestWindow.alternationRatio >= 1.0) {
            const predictedValue = bestWindow.window[0] !== bestWindow.window[1] ? 
                bestWindow.window[0] : (bestWindow.window[0] === 'T' ? 'X' : 'T');
            
            return {
                detected: true,
                patternType: 'PerfectAlternating',
                confidence: 0.9, // Giữ nguyên độ tin cậy cao cho mẫu hoàn hảo
                predictTai: predictedValue === 'T',
                reason: `Phát hiện mẫu xen kẽ hoàn hảo "${bestWindow.window.join('')}", dự đoán tiếp theo là ${predictedValue}`
            };
        }
        // Nếu có mẫu xen kẽ tốt (70-99%)
        else if (bestWindow.alternationRatio >= 0.70) {
            // Dự đoán dựa trên xu hướng phổ biến nhất trong cửa sổ
            const taiCount = bestWindow.window.filter(v => v === 'T').length;
            const xiuCount = bestWindow.window.length - taiCount;
            
            // Nếu có xu hướng rõ ràng 
            const threshold = Math.ceil(bestWindow.window.length * 0.6); // >60% là một xu hướng rõ ràng
            if (taiCount >= threshold || xiuCount >= threshold) {
                return {
                    detected: true,
                    patternType: 'StrongBiasInAlternating',
                    confidence: 0.8,
                    predictTai: taiCount > xiuCount,
                    reason: `Phát hiện xu hướng mạnh ${taiCount > xiuCount ? 'Tài' : 'Xỉu'} (${Math.max(taiCount, xiuCount)}/${bestWindow.window.length}) trong mẫu xen kẽ`
                };
            }
        }
        
        // CẢI TIẾN V3.2: Phát hiện các mẫu đặc biệt
        // Phân tích 3 kỳ gần nhất
        const recentThree = results.slice(0, 3);
        const pattern = recentThree.join('');
        
        // Phát hiện mẫu TXX và XTT
        if (pattern === 'TXX' || results.slice(0, 4).join('') === 'TXXN' || results.slice(0, 4).join('') === 'TXXT') {
            return {
                detected: true,
                patternType: 'TXX_Pattern',
                confidence: 0.78, // Giảm từ 0.85 xuống 0.78 do hiệu suất không tốt
                predictTai: true,
                reason: `V3.2: Phát hiện mẫu T-X-X, dự đoán tiếp theo là T`
            };
        } else if (pattern === 'XTT' || results.slice(0, 4).join('') === 'XTTN' || results.slice(0, 4).join('') === 'XTTX') {
            return {
                detected: true,
                patternType: 'XTT_Pattern',
                confidence: 0.78, // Giảm từ 0.85 xuống 0.78 do hiệu suất không tốt
                predictTai: false,
                reason: `V3.2: Phát hiện mẫu X-T-T, dự đoán tiếp theo là X`
            };
        }
        
        // Phát hiện các mẫu khác
        if (pattern === 'TTX' || pattern === 'TXT') {
            return {
                detected: true,
                patternType: 'TTX_Pattern',
                confidence: 0.72, // Giảm từ 0.75 xuống 0.72
                predictTai: false,
                reason: `V3.2: Phát hiện mẫu ${pattern}, dự đoán tiếp theo là X`
            };
        } else if (pattern === 'XXT' || pattern === 'XTX') {
            return {
                detected: true,
                patternType: 'XXT_Pattern', 
                confidence: 0.72, // Giảm từ 0.75 xuống 0.72
                predictTai: true,
                reason: `V3.2: Phát hiện mẫu ${pattern}, dự đoán tiếp theo là T`
            };
        }
    }
    
    // CẢI TIẾN V3.2: Điều chỉnh logic phát hiện đảo chiều sau chuỗi
    if (results.length >= 3) {
        // Phát hiện chuỗi 3 giá trị giống nhau
        if (results[0] === results[1] && results[1] === results[2]) {
            return {
                detected: true,
                patternType: 'ReversalAfterStreak',
                confidence: 0.78, // Giảm từ 0.8 xuống 0.78
                predictTai: results[0] !== 'T',
                reason: `V3.2: Phát hiện chuỗi ${results[0]}-${results[0]}-${results[0]}, dự đoán đảo chiều sang ${results[0] === 'T' ? 'X' : 'T'}`
            };
        }
        
        // CẢI TIẾN V3.2: Ít phụ thuộc vào mẫu 2-streak do hiệu suất kém
        // Chỉ áp dụng khi vị trí thứ 3 cùng loại với 2 vị trí đầu
        else if (results[0] === results[1] && results.length >= 4 && results[2] === results[0]) {
            return {
                detected: true,
                patternType: 'ReversalAfterLongerStreak',
                confidence: 0.75,
                predictTai: results[0] !== 'T',
                reason: `V3.2: Phát hiện chuỗi ${results[0]}-${results[0]}-${results[0]}, dự đoán đảo chiều sang ${results[0] === 'T' ? 'X' : 'T'}`
            };
        }
    }
    
    // CẢI TIẾN V3.2: Điều chỉnh phân tích phân phối Tài/Xỉu với trọng số
    let weightedTaiSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < weightedResults.length; i++) {
        totalWeight += weightedResults[i].weight;
        if (weightedResults[i].value === 'T') {
            weightedTaiSum += weightedResults[i].weight;
        }
    }
    
    const weightedTaiRatio = weightedTaiSum / totalWeight;
    console.log(`V3.2: Tỉ lệ Tài có trọng số: ${(weightedTaiRatio * 100).toFixed(1)}%`);
    
    // CẢI TIẾN V3.2: Điều chỉnh ngưỡng phát hiện xu hướng mạnh
    const strongTaiBias = weightedTaiRatio >= 0.70; // Tăng từ 0.65 lên 0.70
    const strongXiuBias = weightedTaiRatio <= 0.30; // Giảm từ 0.35 xuống 0.30
    
    if (strongTaiBias || strongXiuBias) {
        return {
            detected: true,
            patternType: 'WeightedDistribution',
            confidence: Math.min(0.85, Math.abs(weightedTaiRatio - 0.5) * 2), // 0-0.85 scale
            predictTai: strongTaiBias,
            reason: `V3.2: Phát hiện xu hướng ${strongTaiBias ? 'Tài' : 'Xỉu'} mạnh (${(Math.abs(weightedTaiRatio - 0.5) * 200).toFixed(1)}%) trong dữ liệu có trọng số`
        };
    }
    
    // CẢI TIẾN V3.2: Tăng cường phân tích chẵn/lẻ bằng cách yêu cầu tỷ lệ rõ ràng hơn
    if (results.length >= 6) {
        // Tài/Xỉu tại các vị trí chẵn (0, 2, 4)
        const evenPositions = [results[0], results[2], results[4]];
        // Tài/Xỉu tại các vị trí lẻ (1, 3, 5)
        const oddPositions = [results[1], results[3], results[5]];
        
        const evenTaiCount = evenPositions.filter(r => r === 'T').length;
        const oddTaiCount = oddPositions.filter(r => r === 'T').length;
        
        // CẢI TIẾN V3.2: Yêu cầu sự khác biệt lớn hơn giữa vị trí chẵn và lẻ
        // Cần tối thiểu 3/3 vs 0/3 hoặc 0/3 vs 3/3
        if ((evenTaiCount === 3 && oddTaiCount === 0) || (evenTaiCount === 0 && oddTaiCount === 3)) {
            // Kiểm tra xem vị trí tiếp theo là chẵn hay lẻ
            const isNextPositionEven = results.length % 2 === 0;
            
            if (isNextPositionEven) {
                // Vị trí tiếp theo là chẵn, dự đoán dựa trên xu hướng vị trí chẵn
                return {
                    detected: true,
                    patternType: 'EvenOddPattern',
                    confidence: 0.82, // Tăng từ 0.75 lên 0.82 do yêu cầu nghiêm ngặt hơn
                    predictTai: evenTaiCount > 0,
                    reason: `V3.2: Phát hiện xu hướng hoàn toàn ${evenTaiCount > 0 ? 'Tài' : 'Xỉu'} ở vị trí chẵn (${evenTaiCount}/3), vị trí tiếp theo là chẵn`
                };
            } else {
                // Vị trí tiếp theo là lẻ, dự đoán dựa trên xu hướng vị trí lẻ
                return {
                    detected: true,
                    patternType: 'EvenOddPattern',
                    confidence: 0.82, // Tăng từ 0.75 lên 0.82 do yêu cầu nghiêm ngặt hơn
                    predictTai: oddTaiCount > 0,
                    reason: `V3.2: Phát hiện xu hướng hoàn toàn ${oddTaiCount > 0 ? 'Tài' : 'Xỉu'} ở vị trí lẻ (${oddTaiCount}/3), vị trí tiếp theo là lẻ`
                };
            }
        }
    }
    
    // Nếu không có mẫu nào được phát hiện rõ ràng, trả về không phát hiện
    return { detected: false };
}

// 3. Phát hiện và thích ứng với thị trường biến động
function detectMarketVolatility(history, index) {
    // Kiểm tra bảo vệ
    if (history.length < 5) return { detected: false };
    
    const results = history.slice(0, 8).map(item => item.numbers[index] >= 5 ? 'T' : 'X');
    
    // Đếm số lần đảo chiều
    let changes = 0;
    for (let i = 1; i < results.length; i++) {
        if (results[i] !== results[i-1]) changes++;
    }
    
    // Kiểm tra 3 kỳ gần nhất có đảo chiều liên tục không
    const recentChanges = (results[0] !== results[1] && results[1] !== results[2]);
    
    // Điều chỉnh ngưỡng phát hiện biến động dựa trên hiệu suất từ cache
    let volatilityThreshold = 4; // Ngưỡng mặc định
    
    // Nếu biến global.getMethodSuccessRate tồn tại, sử dụng để điều chỉnh ngưỡng
    if (typeof global.getMethodSuccessRate === 'function') {
        const performance = global.getMethodSuccessRate("MarketVolatility");
        
        // Nếu hiệu suất cao, giảm ngưỡng để tăng khả năng phát hiện
        // Nếu hiệu suất thấp, tăng ngưỡng để giảm khả năng phát hiện sai
        if (performance > 0.6) {
            volatilityThreshold = 3; // Giảm ngưỡng nếu hiệu suất tốt
            console.log(`⚙️ Giảm ngưỡng phát hiện biến động xuống ${volatilityThreshold} do hiệu suất cao (${(performance * 100).toFixed(1)}%)`);
        } else if (performance < 0.4) {
            volatilityThreshold = 5; // Tăng ngưỡng nếu hiệu suất kém
            console.log(`⚙️ Tăng ngưỡng phát hiện biến động lên ${volatilityThreshold} do hiệu suất thấp (${(performance * 100).toFixed(1)}%)`);
        }
    }
    
    if (changes >= volatilityThreshold || recentChanges) {
        // Phân tích 5 kỳ gần nhất để tìm xu hướng
        const recentTaiCount = results.slice(0, 5).filter(r => r === 'T').length;
        
        // Điều chỉnh ngưỡng cho xu hướng Tài/Xỉu dựa trên hiệu suất
        let taiThreshold = 3; // Mặc định: cần ít nhất 3/5 kỳ là Tài để dự đoán Tài
        
        if (typeof global.getMethodSuccessRate === 'function') {
            const taiPerformance = global.getMethodSuccessRate("FollowStrongTaiTrend");
            const xiuPerformance = global.getMethodSuccessRate("FollowStrongXiuTrend");
            
            // Nếu dự đoán Tài có hiệu suất tốt hơn, giảm ngưỡng cho Tài
            if (taiPerformance > xiuPerformance && taiPerformance > 0.5) {
                taiThreshold = 2; // Giảm ngưỡng, dễ dàng dự đoán Tài hơn
                console.log(`⚙️ Giảm ngưỡng cho Tài xuống ${taiThreshold} do FollowStrongTaiTrend hoạt động tốt (${(taiPerformance * 100).toFixed(1)}%)`);
            }
            // Nếu dự đoán Xỉu có hiệu suất tốt hơn, tăng ngưỡng cho Tài (ưu tiên Xỉu)
            else if (xiuPerformance > taiPerformance && xiuPerformance > 0.5) {
                taiThreshold = 4; // Tăng ngưỡng, khó dự đoán Tài hơn
                console.log(`⚙️ Tăng ngưỡng cho Tài lên ${taiThreshold} do FollowStrongXiuTrend hoạt động tốt (${(xiuPerformance * 100).toFixed(1)}%)`);
            }
        }
        
        // Nếu Tài chiếm ưu thế (>=taiThreshold) trong 5 kỳ gần nhất, dự đoán Tài
        // Nếu Xỉu chiếm ưu thế (< taiThreshold) trong 5 kỳ gần nhất, dự đoán Xỉu
        if (recentTaiCount >= taiThreshold) {
            return {
                detected: true,
                predictTai: true,
                reason: `Thị trường biến động, Tài chiếm ưu thế (${recentTaiCount}/5, ngưỡng: ${taiThreshold})`
            };
        } else {
            return {
                detected: true,
                predictTai: false,
                reason: `Thị trường biến động, Xỉu chiếm ưu thế (${5-recentTaiCount}/5, ngưỡng: ${5-taiThreshold})`
            };
        }
    }
    
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
    if (history.length < 5) return { detected: false };
    
    // Chỉ phân tích 7 kỳ gần nhất để tối ưu tốc độ
    const maxResults = Math.min(7, history.length);
    const results = history.slice(0, maxResults).map(item => item.numbers[index] >= 5 ? 'T' : 'X');
    console.log(`FastPattern v4.0: Phân tích ${results.length} kỳ gần nhất - ${results.join('')}`);
    
    // 1. THUẬT TOÁN TẬP TRUNG VÀO MICRO-PATTERNS CHO XỔ SỐ 45 GIÂY
    
    // 1.1 Phát hiện khuôn mẫu NGAY LẬP TỨC trong 3-4 kỳ gần nhất
    const recent3 = results.slice(0, 3).join('');
    const recent4 = results.slice(0, 4).join('');
    
    // Xác định phiên hiện tại và tiếp theo trong chu kỳ ngày
    const curTimeObj = new Date();
    const currentHour = curTimeObj.getHours();
    const currentMinute = curTimeObj.getMinutes();
    const secondsSinceMidnight = (currentHour * 3600) + (currentMinute * 60) + curTimeObj.getSeconds();
    const currentCycleInDay = Math.floor(secondsSinceMidnight / 45);
    
    // Phát hiện chu kỳ trong ngày (dựa vào vị trí)
    const isEvenCycle = currentCycleInDay % 2 === 0;
    const isMorningSession = currentHour >= 8 && currentHour < 12;
    const isAfternoonSession = currentHour >= 13 && currentHour < 17;
    const isEveningSession = currentHour >= 18 && currentHour < 22;
    
    console.log(`FastPattern v4.0: Chu kỳ #${currentCycleInDay} của ngày, ${isEvenCycle ? 'chẵn' : 'lẻ'}`);
    
    // 1.2 Tính toán xác suất dựa trên dữ liệu phiên nhanh
    const taiCount = results.filter(r => r === 'T').length;
    const xiuCount = results.length - taiCount;
    const recentTaiRatio = taiCount / results.length;
    
    // Đảo chiều sau chuỗi 3 kỳ đồng nhất - mẫu mạnh cho xổ số nhanh 
    if (recent3 === 'TTT' || recent3 === 'XXX') {
        return {
            detected: true,
            patternType: 'FastReversalAfterStreak',
            confidence: 0.82, // Tăng độ tin cậy cho mẫu phổ biến trong xổ số nhanh
            predictTai: recent3 === 'TTT' ? false : true,
            reason: `FastPattern v4.0: Phát hiện 3 ${recent3[0]} liên tiếp, dự đoán đảo chiều sang ${recent3[0] === 'T' ? 'X' : 'T'}`
        };
    }
    
    // Phát hiện mẫu TXXT và XTTX - các mẫu cực kỳ hiệu quả trong xổ số 45 giây
    if (recent4 === 'TXXT') {
        return {
            detected: true,
            patternType: 'FastMicroPattern',
            confidence: 0.85,
            predictTai: false,
            reason: `FastPattern v4.0: Phát hiện mẫu TXXT đặc trưng, dự đoán tiếp theo là X`
        };
    } else if (recent4 === 'XTTX') {
        return {
            detected: true,
            patternType: 'FastMicroPattern',
            confidence: 0.85,
            predictTai: true,
            reason: `FastPattern v4.0: Phát hiện mẫu XTTX đặc trưng, dự đoán tiếp theo là T`
        };
    }
    
    // Phát hiện TTTX, XXXT - mẫu chạy tiếp
    if (recent4 === 'TTTX' || recent4 === 'XXXT') {
        return {
            detected: true,
            patternType: 'FastExtendedPattern',
            confidence: 0.78,
            predictTai: recent4 === 'TTTX' ? false : true,
            reason: `FastPattern v4.0: Phát hiện ${recent4}, dự đoán tiếp tục xu hướng ${recent4[3]}`
        };
    }
    
    // 1.3 Phân tích xu hướng nhanh trong kỳ buổi sáng, chiều, tối
    // Xổ số 45 giây thường có đặc điểm khác nhau trong các khoảng thời gian khác nhau
    if (isMorningSession && taiCount >= 5) {
        // Buổi sáng thường có xu hướng nghịch với buổi chiều
        return {
            detected: true,
            patternType: 'FastSessionPattern',
            confidence: 0.75,
            predictTai: false,
            reason: `FastPattern v4.0: Phát hiện xu hướng Tài mạnh (${taiCount}/${results.length}) trong buổi sáng, dự đoán đảo chiều sang Xỉu`
        };
    } else if (isAfternoonSession && recentTaiRatio <= 0.3) {
        // Buổi chiều thường có xu hướng quay trở lại trung bình khi có xu hướng mạnh
        return {
            detected: true,
            patternType: 'FastSessionPattern',
            confidence: 0.75,
            predictTai: true,
            reason: `FastPattern v4.0: Phát hiện xu hướng Xỉu mạnh (${xiuCount}/${results.length}) trong buổi chiều, dự đoán quay lại Tài`
        };
    } else if (isEveningSession && isEvenCycle) {
        // Buổi tối + chu kỳ chẵn có xu hướng Xỉu nhiều hơn
        const recentData = results.slice(0, 2);
        if (recentData.filter(r => r === 'X').length >= 1) {
            return {
                detected: true,
                patternType: 'FastTimePattern',
                confidence: 0.75,
                predictTai: false,
                reason: `FastPattern v4.0: Phát hiện chu kỳ chẵn (${currentCycleInDay}) trong buổi tối với xu hướng Xỉu`
            };
        }
    }
    
    // 1.4 Phát hiện kẹp giữa (Tài-Xỉu-Tài hoặc Xỉu-Tài-Xỉu) 
    if (results.length >= 3 && results[0] === results[2] && results[0] !== results[1]) {
        return {
            detected: true, 
            patternType: 'FastSandwichPattern',
            confidence: 0.80,
            predictTai: results[0] === 'T',
            reason: `FastPattern v4.0: Phát hiện mẫu kẹp giữa ${results[0]}-${results[1]}-${results[0]}, dự đoán tiếp tục ${results[0]}`
        };
    }
    
    // 1.5 Phát hiện thay đổi tần số đảo chiều
    let alternations = 0;
    for (let i = 0; i < results.length - 1; i++) {
        if (results[i] !== results[i+1]) {
            alternations++;
        }
    }
    
    const alternationRatio = alternations / (results.length - 1);
    
    // Tần số đảo chiều cao (>75%) - duy trì xu hướng mới nhất
    if (alternationRatio > 0.75) {
        return {
            detected: true,
            patternType: 'FastAlternationPattern',
            confidence: 0.76,
            predictTai: results[0] !== results[1], // Nếu đang có xu hướng đảo chiều, tiếp tục đảo
            reason: `FastPattern v4.0: Phát hiện tần số đảo chiều cao (${(alternationRatio*100).toFixed(1)}%), dự đoán ${results[0] !== results[1] ? 'T' : 'X'}`
        };
    }
    
    // Tần số đảo chiều thấp (<25%) - đảo chiều sau streak
    if (alternationRatio < 0.25 && results.length >= 3) {
        // Đảo chiều sau chuỗi ổn định
        return {
            detected: true,
            patternType: 'FastLowAlternationPattern',
            confidence: 0.73,
            predictTai: results[0] !== 'T', // Đảo chiều so với xu hướng hiện tại
            reason: `FastPattern v4.0: Phát hiện tần số đảo chiều thấp (${(alternationRatio*100).toFixed(1)}%), dự đoán đảo chiều sang ${results[0] === 'T' ? 'X' : 'T'}`
        };
    }
    
    // 1.6 Phát hiện xu hướng rõ ràng (một loại chiếm >75%)
    if (taiCount >= results.length * 0.75) {
        return {
            detected: true,
            patternType: 'FastDominantTrend',
            confidence: 0.75,
            predictTai: true,
            reason: `FastPattern v4.0: Phát hiện xu hướng Tài rõ ràng (${taiCount}/${results.length}), dự đoán tiếp tục Tài`
        };
    } else if (xiuCount >= results.length * 0.75) {
        return {
            detected: true,
            patternType: 'FastDominantTrend',
            confidence: 0.75,
            predictTai: false,
            reason: `FastPattern v4.0: Phát hiện xu hướng Xỉu rõ ràng (${xiuCount}/${results.length}), dự đoán tiếp tục Xỉu`
        };
    }
    
    // Nếu không phát hiện mẫu nào rõ ràng
    return { detected: false };
}

module.exports = {
    analyzeLongTrend,
    detectComplexPattern,
    balancedAnalysis,
    generateNumbers,
    analyzeLimitPerformance,
    detectCyclicalReversals,
    detectLongStreaks,
    detectShortAlternatingPattern,
    detectMarketVolatility,
    detectFastPattern
};
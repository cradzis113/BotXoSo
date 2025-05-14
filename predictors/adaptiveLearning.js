/**
 * Module học máy thích ứng đơn giản
 * 
 * Module này giúp hệ thống học từ lịch sử dự đoán và điều chỉnh chiến lược:
 * 1. Phân tích các mẫu dự đoán từ lịch sử
 * 2. Nhận diện các mẫu lặp lại với độ tin cậy cao
 * 3. Ứng dụng vào dự đoán dựa trên mẫu hiện có
 * 4. Tự động điều chỉnh dựa trên hiệu suất
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

// Cache cho kết quả học được
let patternCache = {
    patterns: {},
    lastUpdated: 0
};

// Biến theo dõi hiệu suất
const performanceStats = {
    total: 0,
    correct: 0,
    patterns: {}
};

/**
 * Phân tích mẫu từ lịch sử
 * @param {string} logFile - Đường dẫn đến file log dự đoán
 * @returns {Object} Các mẫu đã học được
 */
function analyzeHistoricalPatterns(logFile) {
    // Chỉ cập nhật cache mỗi 10 phút
    const now = Date.now();
    if (now - patternCache.lastUpdated < 600000 && Object.keys(patternCache.patterns).length > 0) {
        return patternCache.patterns;
    }
    
    if (!fs.existsSync(logFile)) return {};
    
    try {
        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        
        // Tạo pattern ngắn 3 kỳ
        const patterns = {};
        
        for (let i = 0; i < lines.length - 4; i++) {
            const sequence = [];
            let isValid = true;
            
            // Lấy 3 kỳ liên tiếp
            for (let j = 0; j < 3; j++) {
                const match = lines[i + j].match(/Số thực tế: \d+ \((Tài|Xỉu)\)/);
                if (!match) {
                    isValid = false;
                    break;
                }
                sequence.push(match[1] === 'Tài' ? 'T' : 'X');
            }
            
            if (!isValid) continue;
            
            // Kỳ thứ 4 là kết quả
            const resultMatch = lines[i + 3].match(/Số thực tế: \d+ \((Tài|Xỉu)\)/);
            if (!resultMatch) continue;
            
            const result = resultMatch[1] === 'Tài' ? 'T' : 'X';
            const pattern = sequence.join('');
            
            if (!patterns[pattern]) {
                patterns[pattern] = { T: 0, X: 0 };
            }
            
            patterns[pattern][result]++;
        }
        
        // Lọc các mẫu có ít nhất 5 lần xuất hiện
        const filteredPatterns = {};
        for (const [pattern, counts] of Object.entries(patterns)) {
            const total = counts.T + counts.X;
            if (total >= config.betStreakFollower.minSamplesForAdjustment) {
                const taiProbability = counts.T / total;
                filteredPatterns[pattern] = {
                    predictTai: taiProbability > 0.6,
                    confidence: Math.max(taiProbability, 1 - taiProbability),
                    total: total
                };
            }
        }
        
        patternCache = {
            patterns: filteredPatterns,
            lastUpdated: now
        };
        
        return filteredPatterns;
    } catch (error) {
        console.error(`Lỗi khi phân tích mẫu lịch sử: ${error.message}`);
        return {};
    }
}

/**
 * Dự đoán dựa trên mẫu đã học
 * @param {Array} history - Mảng lịch sử kết quả
 * @param {string} logFile - Đường dẫn đến file log dự đoán
 * @param {Number} index - Vị trí cần dự đoán (thường là 0)
 * @returns {Object} Kết quả dự đoán
 */
function predictFromPatterns(history, logFile, index = 0) {
    if (!config.betStreakFollower.adaptiveLearning || !history || history.length < 3) {
        return { detected: false };
    }
    
    try {
        // Lấy 3 kỳ gần nhất
        const recentResults = history.slice(index, index + 3).map(item => 
            (Number(item.numbers[index]) >= 5) ? 'T' : 'X');
        
        if (recentResults.length < 3) return { detected: false };
        
        const pattern = recentResults.join('');
        const patterns = analyzeHistoricalPatterns(logFile);
        
        // Chỉ dự đoán nếu mẫu có độ tin cậy cao
        if (patterns[pattern] && patterns[pattern].confidence > 0.65) {
            return {
                detected: true,
                predictTai: patterns[pattern].predictTai,
                confidence: patterns[pattern].confidence,
                method: "AdaptiveLearning",
                reason: `Mẫu lặp lại "${pattern}" (${Math.round(patterns[pattern].confidence*100)}%)`
            };
        }
        
        return { detected: false };
    } catch (error) {
        console.error(`Lỗi khi dự đoán từ mẫu: ${error.message}`);
        return { detected: false };
    }
}

/**
 * Phân tích xu hướng thống kê
 * @param {Array} history - Mảng lịch sử kết quả
 * @param {Number} index - Vị trí cần dự đoán (thường là 0)
 * @returns {Object} Kết quả dự đoán
 */
function analyzeStatisticalPatterns(history, index = 0) {
    if (!config.analysis.statisticalAnalysis || !config.analysis.statisticalAnalysis.enabled || 
        !history || history.length < config.analysis.statisticalAnalysis.windowSize) {
        return { detected: false };
    }
    
    try {
        const lastResults = history.slice(index, index + config.analysis.statisticalAnalysis.windowSize)
            .map(item => (Number(item.numbers[index]) >= 5) ? 'T' : 'X');
        
        // Tỷ lệ Tài/Xỉu trong kết quả gần đây
        const taiCount = lastResults.filter(r => r === 'T').length;
        const xiuCount = lastResults.filter(r => r === 'X').length;
        
        // Tính trọng số dựa trên tỷ lệ lệch thực tế
        const balance = Math.abs(taiCount - xiuCount) / lastResults.length;
        
        // Nếu có sự mất cân bằng rõ rệt
        if (balance > config.analysis.statisticalAnalysis.regressionThreshold) {
            // Dự đoán xu hướng "quay trở lại trung bình" của dãy số
            const isPredictingTai = xiuCount > taiCount;
            const confidence = config.analysis.statisticalAnalysis.minConfidence + 
                balance * (config.analysis.statisticalAnalysis.maxConfidence - config.analysis.statisticalAnalysis.minConfidence);
            
            return {
                detected: true,
                predictTai: isPredictingTai,
                confidence: confidence,
                method: "StatisticalRegression",
                reason: `Xu hướng hồi quy ${isPredictingTai ? 'Tài' : 'Xỉu'} (${Math.round(confidence*100)}%)`
            };
        }
        
        return { detected: false };
    } catch (error) {
        console.error(`Lỗi khi phân tích xu hướng thống kê: ${error.message}`);
        return { detected: false };
    }
}

/**
 * Phát hiện sự kiện đặc biệt, như lặp lại mẫu
 * @param {Array} history - Mảng lịch sử kết quả
 * @param {Number} index - Vị trí cần dự đoán (thường là 0)
 * @returns {Object} Kết quả dự đoán
 */
function detectSpecialEvents(history, index = 0) {
    if (!config.specialEventDetection || !config.specialEventDetection.enabled || 
        !history || history.length < config.specialEventDetection.patternReplication.windowSize) {
        return { detected: false };
    }
    
    try {
        const recentResults = history.slice(index, index + config.specialEventDetection.patternReplication.windowSize);
        
        // Phát hiện lặp lại chính xác
        const halfSize = Math.floor(recentResults.length / 2);
        const firstHalf = recentResults.slice(0, halfSize).map(item => item.numbers[index]);
        const secondHalf = recentResults.slice(halfSize, 2*halfSize).map(item => item.numbers[index]);
        
        let exactMatches = 0;
        for (let i = 0; i < halfSize; i++) {
            if (firstHalf[i] === secondHalf[i]) exactMatches++;
        }
        
        // Nếu có đủ số trùng khớp tối thiểu
        if (exactMatches >= config.specialEventDetection.patternReplication.minMatchRequired) {
            // Dự đoán tiếp theo dựa trên kỳ tiếp theo của chuỗi trước
            if (halfSize < recentResults.length) {
                const predictedIndex = firstHalf.length;
                if (predictedIndex < history.length) {
                    const predictedResult = history[predictedIndex].numbers[index];
                    const isTai = Number(predictedResult) >= 5;
                    
                    // Tính độ tin cậy dựa trên số trùng khớp
                    const confidence = config.specialEventDetection.patternReplication.baseConfidence + 
                        (exactMatches - config.specialEventDetection.patternReplication.minMatchRequired) * 
                        config.specialEventDetection.patternReplication.confidencePerMatch;
                    
                    return {
                        detected: true,
                        predictTai: isTai,
                        confidence: Math.min(0.95, confidence),
                        method: "PatternReplication",
                        reason: `Lặp lại mẫu ${exactMatches}/${halfSize} số (${Math.round(confidence*100)}%)`
                    };
                }
            }
        }
        
        return { detected: false };
    } catch (error) {
        console.error(`Lỗi khi phát hiện sự kiện đặc biệt: ${error.message}`);
        return { detected: false };
    }
}

/**
 * Cập nhật hiệu suất của mẫu đã học
 * @param {Object} prediction - Dự đoán đã thực hiện
 * @param {boolean} isCorrect - Kết quả dự đoán đúng hay sai
 */
function updatePatternPerformance(prediction, isCorrect) {
    if (!prediction || !prediction.method || prediction.method !== "AdaptiveLearning") {
        return;
    }
    
    performanceStats.total++;
    if (isCorrect) {
        performanceStats.correct++;
    }
    
    // Lấy mẫu từ lý do dự đoán
    const patternMatch = prediction.reason.match(/"([^"]+)"/);
    if (patternMatch && patternMatch[1]) {
        const pattern = patternMatch[1];
        
        if (!performanceStats.patterns[pattern]) {
            performanceStats.patterns[pattern] = { total: 0, correct: 0 };
        }
        
        performanceStats.patterns[pattern].total++;
        if (isCorrect) {
            performanceStats.patterns[pattern].correct++;
        }
        
        // Áp dụng suy giảm trọng số theo thời gian nếu cần
        if (isCorrect && patternCache.patterns[pattern]) {
            // Tăng độ tin cậy khi dự đoán đúng
            patternCache.patterns[pattern].confidence = 
                Math.min(0.95, patternCache.patterns[pattern].confidence + 0.01);
        } else if (!isCorrect && patternCache.patterns[pattern]) {
            // Giảm độ tin cậy khi dự đoán sai
            patternCache.patterns[pattern].confidence = 
                Math.max(0.5, patternCache.patterns[pattern].confidence - 0.03);
        }
    }
}

/**
 * Phân tích hiệu suất dự đoán gần đây
 * @param {string} logFile - Đường dẫn đến file log dự đoán
 * @param {Number} windowSize - Số kỳ xem xét (mặc định là 20)
 * @param {Boolean} detailedInfo - Có trả về thông tin chi tiết hay không
 * @returns {Number|Object} Tỷ lệ dự đoán đúng gần đây hoặc đối tượng thông tin chi tiết
 */
function calculateRecentAccuracy(logFile, windowSize = 20, detailedInfo = false) {
    if (!fs.existsSync(logFile)) return detailedInfo ? { 
        accuracy: 0.5, 
        sampleSize: 0,
        correctCount: 0,
        methodStats: {},
        recentTrend: 'unknown'
    } : 0.5;
    
    try {
        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.split('\n')
            .filter(line => line.trim())
            .slice(0, windowSize);
        
        if (lines.length === 0) return detailedInfo ? { 
            accuracy: 0.5, 
            sampleSize: 0,
            correctCount: 0,
            methodStats: {},
            recentTrend: 'unknown'
        } : 0.5;
        
        const correctPredictions = lines.filter(line => line.includes('Đúng ✓')).length;
        const accuracy = correctPredictions / lines.length;
        
        // Nếu không cần thông tin chi tiết, trả về tỷ lệ đơn giản
        if (!detailedInfo) {
            return accuracy;
        }
        
        // Phân tích chi tiết từng phương pháp
        const methodStats = {};
        const methodCounts = {};
        const taiXiuResults = []; // Mảng lưu kết quả Tài/Xỉu theo thứ tự thời gian
        
        for (const line of lines) {
            // Trích xuất phương pháp
            const methodMatch = line.match(/\| Phương pháp: (\w+) \|/);
            if (methodMatch && methodMatch[1]) {
                const method = methodMatch[1];
                const isCorrect = line.includes('Đúng ✓');
                
                if (!methodStats[method]) {
                    methodStats[method] = {
                        correct: 0,
                        total: 0,
                        accuracy: 0
                    };
                }
                
                methodStats[method].total++;
                if (isCorrect) {
                    methodStats[method].correct++;
                }
                methodStats[method].accuracy = methodStats[method].correct / methodStats[method].total;
                
                // Đếm số lần sử dụng từng phương pháp
                methodCounts[method] = (methodCounts[method] || 0) + 1;
            }
            
            // Trích xuất kết quả thực tế (Tài/Xỉu)
            const actualMatch = line.match(/Số thực tế: \d+ \((Tài|Xỉu)\)/);
            if (actualMatch && actualMatch[1]) {
                taiXiuResults.push(actualMatch[1]);
            }
        }
        
        // Xác định phương pháp được sử dụng nhiều nhất
        let mostUsedMethod = null;
        let maxUseCount = 0;
        for (const method in methodCounts) {
            if (methodCounts[method] > maxUseCount) {
                maxUseCount = methodCounts[method];
                mostUsedMethod = method;
            }
        }
        
        // Xác định xu hướng kết quả gần đây
        let recentTrend = 'mixed';
        if (taiXiuResults.length >= 3) {
            // Kiểm tra chuỗi giống nhau
            let sameTaiXiuCount = 1;
            for (let i = 1; i < Math.min(5, taiXiuResults.length); i++) {
                if (taiXiuResults[i] === taiXiuResults[0]) {
                    sameTaiXiuCount++;
                } else {
                    break;
                }
            }
            
            if (sameTaiXiuCount >= 3) {
                recentTrend = `${sameTaiXiuCount} ${taiXiuResults[0]} liên tiếp`;
            } 
            else {
                // Kiểm tra mẫu luân phiên
                let alternatingCount = 0;
                for (let i = 1; i < Math.min(5, taiXiuResults.length); i++) {
                    if (taiXiuResults[i] !== taiXiuResults[i-1]) {
                        alternatingCount++;
                    }
                }
                
                if (alternatingCount >= 3) {
                    recentTrend = 'alternating';
                }
            }
        }
        
        // Trả về đối tượng chứa thông tin chi tiết
        return {
            accuracy,
            sampleSize: lines.length,
            correctCount: correctPredictions,
            methodStats,
            mostUsedMethod,
            mostUsedMethodCount: maxUseCount,
            recentTrend,
            recentResults: taiXiuResults.slice(0, 5) // 5 kết quả gần nhất
        };
    } catch (error) {
        console.error(`Lỗi khi tính độ chính xác gần đây: ${error.message}`);
        return detailedInfo ? { 
            accuracy: 0.5, 
            sampleSize: 0,
            correctCount: 0,
            methodStats: {},
            recentTrend: 'error'
        } : 0.5;
    }
}

module.exports = {
    analyzeHistoricalPatterns,
    predictFromPatterns,
    analyzeStatisticalPatterns,
    detectSpecialEvents,
    updatePatternPerformance,
    calculateRecentAccuracy
}; 
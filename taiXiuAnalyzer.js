// taiXiuAnalyzer.js

/**
 * Module phân tích cầu tài xỉu
 * Cung cấp các công cụ để phân tích mẫu cầu trong dữ liệu tài xỉu
 */

// Hàm tạo dữ liệu mẫu với số lượng mảng con nhất định
function createSampleData(numArrays = 100) {
    const data = [];
    for (let i = 0; i < numArrays; i++) {
        const subArray = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10));
        data.push(subArray);
    }
    return data;
}

// Phân loại số là 'xỉu' (0-4) hoặc 'tài' (5-9)
function classifyTaiXiu(number) {
    return number >= 0 && number <= 4 ? 'xỉu' : 'tài';
}

// Lấy giá trị tại một vị trí index cụ thể từ tất cả các mảng con
function getValuesAtIndex(data, index) {
    return data.map(subArray => subArray[index]);
}

// Chuyển đổi giá trị thành chuỗi tài xỉu
function convertToTaiXiu(values) {
    return values.map(val => classifyTaiXiu(val));
}

// Đếm số lượng xuất hiện của tài và xỉu
function countTaiXiu(taiXiuArray) {
    const counter = { 'tài': 0, 'xỉu': 0 };
    for (const value of taiXiuArray) {
        counter[value]++;
    }
    return counter;
}

// === CÁC MẪU CẦU ===

// 1. Cầu 11 (tài-tài hoặc xỉu-xỉu liên tiếp)
function findPattern11(array) {
    let count = 0;
    for (let i = 0; i < array.length - 1; i++) {
        if (array[i] === array[i + 1]) {
            count++;
        }
    }
    return count;
}

// 2. Cầu bệt (3 giá trị giống nhau liên tiếp)
function findBet(array) {
    let count = 0;
    for (let i = 0; i < array.length - 2; i++) {
        if (array[i] === array[i + 1] && array[i] === array[i + 2]) {
            count++;
        }
    }
    return count;
}

// 3. Cầu 4 con - bốn giá trị giống nhau liên tiếp
function findFourConsecutive(array) {
    let count = 0;
    for (let i = 0; i < array.length - 3; i++) {
        if (array[i] === array[i + 1] && array[i] === array[i + 2] && array[i] === array[i + 3]) {
            count++;
        }
    }
    return count;
}

// 4. Cầu 5 con - năm giá trị giống nhau liên tiếp
function findFiveConsecutive(array) {
    let count = 0;
    for (let i = 0; i < array.length - 4; i++) {
        if (array[i] === array[i + 1] && array[i] === array[i + 2] && 
            array[i] === array[i + 3] && array[i] === array[i + 4]) {
            count++;
        }
    }
    return count;
}

// 5. Cầu 212/121 (tài-xỉu-tài hoặc xỉu-tài-xỉu)
function findPattern212(array) {
    let count = 0;
    for (let i = 0; i < array.length - 2; i++) {
        if (array[i] === array[i + 2] && array[i] !== array[i + 1]) {
            count++;
        }
    }
    return count;
}

// 6. Cầu 123 (ba giá trị khác nhau liên tiếp)
function findPattern123(values) {
    let count = 0;
    for (let i = 0; i < values.length - 2; i++) {
        if (values[i] !== values[i + 1] && values[i] !== values[i + 2] && values[i + 1] !== values[i + 2]) {
            count++;
        }
    }
    return count;
}

// 7. Cầu 1234 - bốn giá trị khác nhau liên tiếp
function findPattern1234(values) {
    let count = 0;
    for (let i = 0; i < values.length - 3; i++) {
        const unique = new Set([values[i], values[i + 1], values[i + 2], values[i + 3]]);
        if (unique.size === 4) {
            count++;
        }
    }
    return count;
}

// 8. Cầu lẻ/chẵn - dãy số toàn lẻ hoặc chẵn liên tiếp (ít nhất 3 số)
function findEvenOddStreak(values) {
    let count = 0;
    for (let i = 0; i < values.length - 2; i++) {
        const isAllEven = values[i] % 2 === 0 && values[i + 1] % 2 === 0 && values[i + 2] % 2 === 0;
        const isAllOdd = values[i] % 2 === 1 && values[i + 1] % 2 === 1 && values[i + 2] % 2 === 1;
        if (isAllEven || isAllOdd) {
            count++;
        }
    }
    return count;
}

// 9. Cầu tăng dần hoặc giảm dần (ít nhất 3 số liên tiếp)
function findSequentialTrend(values) {
    let count = 0;
    for (let i = 0; i < values.length - 2; i++) {
        // Tăng dần
        const isIncreasing = values[i] < values[i + 1] && values[i + 1] < values[i + 2];
        // Giảm dần
        const isDecreasing = values[i] > values[i + 1] && values[i + 1] > values[i + 2];
        
        if (isIncreasing || isDecreasing) {
            count++;
        }
    }
    return count;
}

// 10. Cầu 3 đổi 1 - 3 tài rồi 1 xỉu hoặc 3 xỉu rồi 1 tài
function findPattern3Change1(array) {
    let count = 0;
    for (let i = 0; i < array.length - 3; i++) {
        if (array[i] === array[i + 1] && array[i] === array[i + 2] && array[i] !== array[i + 3]) {
            count++;
        }
    }
    return count;
}

// 11. Cầu 2 đổi 2 - 2 tài rồi 2 xỉu hoặc 2 xỉu rồi 2 tài
function findPattern2Change2(array) {
    let count = 0;
    for (let i = 0; i < array.length - 3; i++) {
        if (array[i] === array[i + 1] && array[i] !== array[i + 2] && array[i + 2] === array[i + 3]) {
            count++;
        }
    }
    return count;
}

// 12. Cầu 1 đổi 1 - xen kẽ tài xỉu
function findAlternatingPattern(array) {
    let count = 0;
    for (let i = 0; i < array.length - 3; i++) {
        if (array[i] !== array[i + 1] && array[i + 1] !== array[i + 2] && array[i + 2] !== array[i + 3]) {
            count++;
        }
    }
    return count;
}

// 13. Cầu biên - số 0 và số 9
function findBorderValues(values) {
    let count = 0;
    for (let i = 0; i < values.length; i++) {
        if (values[i] === 0 || values[i] === 9) {
            count++;
        }
    }
    return count;
}

// 14. Cầu lặp - các đôi số giống nhau xuất hiện trong một chuỗi ngắn
function findRepeatedPairs(values) {
    let count = 0;
    for (let i = 0; i < values.length - 3; i++) {
        const pair1 = `${values[i]}${values[i+1]}`;
        const pair2 = `${values[i+2]}${values[i+3]}`;
        if (pair1 === pair2) {
            count++;
        }
    }
    return count;
}

// 15. Cầu tài xỉu đồng thời - tại một vị trí, số lần xuất hiện tài xỉu gần bằng nhau
function findBalancedTaiXiu(taiXiuArray) {
    const counter = countTaiXiu(taiXiuArray);
    const total = taiXiuArray.length;
    const taiPercent = counter['tài'] / total;
    const xiuPercent = counter['xỉu'] / total;
    
    // Nếu tỉ lệ tài xỉu gần bằng nhau (chênh lệch dưới 10%)
    return Math.abs(taiPercent - xiuPercent) < 0.1;
}

// Phân tích cầu cho một cột cụ thể (theo index)
function analyzeColumn(data, index) {
    const values = getValuesAtIndex(data, index);
    const taiXiuArray = convertToTaiXiu(values);
    
    const counter = countTaiXiu(taiXiuArray);
    
    const patterns = [
        { name: "Cầu 11 (tài-tài/xỉu-xỉu)", count: findPattern11(taiXiuArray) },
        { name: "Cầu bệt (3 giống nhau liên tiếp)", count: findBet(taiXiuArray) },
        { name: "Cầu 4 con (4 giống nhau liên tiếp)", count: findFourConsecutive(taiXiuArray) },
        { name: "Cầu 5 con (5 giống nhau liên tiếp)", count: findFiveConsecutive(taiXiuArray) },
        { name: "Cầu 212/121 (tài-xỉu-tài/xỉu-tài-xỉu)", count: findPattern212(taiXiuArray) },
        { name: "Cầu 123 (3 giá trị khác nhau)", count: findPattern123(values) },
        { name: "Cầu 1234 (4 giá trị khác nhau)", count: findPattern1234(values) },
        { name: "Cầu lẻ/chẵn (3+ số lẻ/chẵn liên tiếp)", count: findEvenOddStreak(values) },
        { name: "Cầu tăng/giảm dần (3+ số liên tiếp)", count: findSequentialTrend(values) },
        { name: "Cầu 3 đổi 1 (3 tài rồi 1 xỉu hoặc ngược lại)", count: findPattern3Change1(taiXiuArray) },
        { name: "Cầu 2 đổi 2 (2 tài rồi 2 xỉu hoặc ngược lại)", count: findPattern2Change2(taiXiuArray) },
        { name: "Cầu 1 đổi 1 (xen kẽ tài xỉu)", count: findAlternatingPattern(taiXiuArray) },
        { name: "Cầu biên (số 0 và số 9)", count: findBorderValues(values) },
        { name: "Cầu lặp (các đôi số giống nhau)", count: findRepeatedPairs(values) },
        { name: "Cầu tài xỉu đồng thời (tỉ lệ cân bằng)", found: findBalancedTaiXiu(taiXiuArray) }
    ];
    
    // Sắp xếp mẫu cầu theo số lượng xuất hiện giảm dần
    patterns.sort((a, b) => {
        if ('count' in a && 'count' in b) return b.count - a.count;
        return 0;
    });
    
    return { 
        values, 
        taiXiuArray, 
        counter, 
        patterns,
        taiPercentage: (counter['tài'] / values.length * 100).toFixed(2),
        xiuPercentage: (counter['xỉu'] / values.length * 100).toFixed(2)
    };
}

// Hiển thị mảng con và phân loại tài xỉu
function showArraysWithTaiXiu(data) {
    console.log("\n=== MẢNG DỮ LIỆU VÀ PHÂN LOẠI TÀI XỈU ===");
    for (let i = 0; i < Math.min(data.length, 10); i++) {
        const subArray = data[i];
        const taiXiu = subArray.map(val => classifyTaiXiu(val));
        console.log(`Mảng ${i+1}: ${subArray} => ${taiXiu}`);
    }
    if (data.length > 10) {
        console.log(`... và ${data.length - 10} mảng khác`);
    }
}

// Hiển thị bảng thống kê dạng heatmap cho một cột
function showHeatmapStats(values) {
    const counts = Array(10).fill(0);
    values.forEach(value => counts[value]++);
    
    console.log("\n=== PHÂN BỐ GIÁ TRỊ ===");
    console.log("Số\tSố lần\tTỉ lệ\tHiển thị");
    
    const maxCount = Math.max(...counts);
    
    for (let i = 0; i < 10; i++) {
        const count = counts[i];
        const percent = (count / values.length * 100).toFixed(2);
        const bars = "#".repeat(Math.ceil(count / maxCount * 20));
        console.log(`${i}\t${count}\t${percent}%\t${bars}`);
    }
}

// Hàm hiển thị kết quả phân tích
function displayAnalysisResults(results, index) {
    console.log(`\n=== PHÂN TÍCH CỘT ${index + 1} ===`);
    console.log(`Tổng số mẫu: ${results.values.length}`);
    console.log(`Số lần xuất hiện tài: ${results.counter['tài']} (${results.taiPercentage}%)`);
    console.log(`Số lần xuất hiện xỉu: ${results.counter['xỉu']} (${results.xiuPercentage}%)`);
    
    console.log("\n--- PHÂN TÍCH MẪU CẦU ---");
    
    // Hiển thị kết quả phân tích cho tất cả các mẫu cầu
    results.patterns.forEach(pattern => {
        if ('count' in pattern) {
            console.log(`${pattern.name}: ${pattern.count}`);
        } else if ('found' in pattern) {
            console.log(`${pattern.name}: ${pattern.found ? 'Có' : 'Không'}`);
        }
    });
    
    // Hiển thị phân bố giá trị dạng heatmap
    showHeatmapStats(results.values);
}

// Hàm chính để chạy phân tích
function runAnalysis(data, columnIndexes = [0]) {
    if (!data) {
        data = createSampleData(500); // Tạo dữ liệu mẫu nếu không có dữ liệu đầu vào
    }
    
    // Hiển thị một phần dữ liệu
    showArraysWithTaiXiu(data);
    
    const allResults = {};
    
    // Phân tích các cột theo yêu cầu
    for (const index of columnIndexes) {
        const results = analyzeColumn(data, index);
        displayAnalysisResults(results, index);
        allResults[index] = results;
    }
    
    return {
        data,
        results: allResults
    };
}

/**
 * Hàm phân tích toàn diện - phân tích tất cả các mẫu cầu cho các vị trí được chỉ định
 * @param {Array} data - Mảng 2D chứa các mảng con (dữ liệu tài xỉu)
 * @param {Array} indexes - Mảng các vị trí index cần phân tích (mặc định là vị trí 0)
 * @param {boolean} displayOutput - Có hiển thị kết quả ra console không (mặc định là true)
 * @returns {Object} Kết quả phân tích đầy đủ
 */
function analyzeFullData(data, indexes = [0], displayOutput = true) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.error("Dữ liệu không hợp lệ. Vui lòng cung cấp mảng không rỗng.");
        return null;
    }

    // Hiển thị mẫu dữ liệu nếu cần
    if (displayOutput) {
        showArraysWithTaiXiu(data);
    }
    
    const result = {
        summary: {
            totalArrays: data.length,
            analyzedIndexes: indexes,
        },
        detailedResults: {}
    };
    
    // Phân tích từng vị trí được chỉ định
    for (const index of indexes) {
        if (index < 0 || index >= data[0].length) {
            console.warn(`Vị trí ${index} không hợp lệ. Bỏ qua...`);
            continue;
        }
        
        // Phân tích vị trí hiện tại
        const analysisResult = analyzeColumn(data, index);
        
        // Thêm vào kết quả
        result.detailedResults[index] = analysisResult;
        
        // Hiển thị kết quả nếu cần
        if (displayOutput) {
            displayAnalysisResults(analysisResult, index);
        }
        
        // Lưu một số thông tin tổng hợp
        if (!result.summary.patternSummary) {
            result.summary.patternSummary = {};
        }
        
        analysisResult.patterns.forEach(pattern => {
            const patternName = pattern.name.split(' ')[1]; // Lấy tên ngắn gọn của mẫu
            if (!result.summary.patternSummary[patternName]) {
                result.summary.patternSummary[patternName] = {};
            }
            
            if ('count' in pattern) {
                result.summary.patternSummary[patternName][`col${index}`] = pattern.count;
            } else if ('found' in pattern) {
                result.summary.patternSummary[patternName][`col${index}`] = pattern.found;
            }
        });
    }
    
    // Thêm phần dự đoán và nhận xét
    result.prediction = generatePrediction(result);
    
    if (displayOutput) {
        console.log("\n=== TỔNG KẾT PHÂN TÍCH ===");
        console.log(`Đã phân tích ${data.length} mảng con tại ${indexes.length} vị trí`);
        console.log("Dự đoán: ", result.prediction);
    }
    
    return result;
}

/**
 * Tạo dự đoán dựa trên kết quả phân tích
 * @param {Object} result - Kết quả phân tích
 * @returns {Object} Dự đoán
 */
function generatePrediction(result) {
    const prediction = {
        recommendedColumns: [],
        patterns: {},
        nextValuePrediction: {}
    };
    
    // Lấy số lượng mảng từ thông tin tổng hợp
    const totalArrays = result.summary.totalArrays;
    
    // Xem xét từng chỉ mục đã phân tích
    for (const index in result.detailedResults) {
        const columnResult = result.detailedResults[index];
        const taiPercent = parseFloat(columnResult.taiPercentage);
        const xiuPercent = parseFloat(columnResult.xiuPercentage);
        
        // Thêm vào dự đoán cho vị trí hiện tại
        prediction.nextValuePrediction[index] = {};
        
        // Xem tỷ lệ tài xỉu để dự đoán giá trị tiếp theo
        if (Math.abs(taiPercent - xiuPercent) > 10) {
            // Nếu tỷ lệ chênh lệch lớn, dự đoán sẽ theo xu hướng thống kê
            if (taiPercent > xiuPercent) {
                prediction.nextValuePrediction[index].expected = 'tài';
                prediction.nextValuePrediction[index].confidence = (taiPercent - 50) * 2; // 0-100%
            } else {
                prediction.nextValuePrediction[index].expected = 'xỉu';
                prediction.nextValuePrediction[index].confidence = (xiuPercent - 50) * 2; // 0-100%
            }
        } else {
            // Nếu tỷ lệ gần nhau, dự đoán sẽ có độ tin cậy thấp
            prediction.nextValuePrediction[index].expected = taiPercent >= xiuPercent ? 'tài' : 'xỉu';
            prediction.nextValuePrediction[index].confidence = 'thấp';
            prediction.nextValuePrediction[index].note = 'Tỷ lệ tài xỉu gần như cân bằng';
        }
        
        // Thêm một số phân tích mẫu cho dự đoán
        prediction.patterns[index] = {};
        
        // Tìm mẫu phổ biến nhất trong cột này
        const topPattern = columnResult.patterns[0];
        if ('count' in topPattern && topPattern.count > 0) {
            prediction.patterns[index].mostCommon = topPattern.name;
            prediction.patterns[index].count = topPattern.count;
        }
        
        // Kiểm tra xem cột này có đáng để dự đoán không
        if (Math.abs(taiPercent - xiuPercent) > 15 || 
            ('count' in topPattern && topPattern.count > totalArrays / 10)) {
            prediction.recommendedColumns.push(parseInt(index));
        }
    }
    
    return prediction;
}

/**
 * Xuất dự đoán mới nhất và lưu lịch sử các dự đoán, tự động giới hạn số lượng
 * Bổ sung: So sánh kết quả dự đoán trước đó với kết quả thực tế
 * @param {Array} data - Mảng dữ liệu đầu vào
 * @param {Array} predictedNumbers - Mảng các số dự đoán
 * @param {string|Array} outputPath - Đường dẫn file xuất hoặc mảng [tên file, giới hạn]
 * @param {Object} analysisInfo - Thông tin phân tích chi tiết
 * @param {Array} indexes - Các vị trí index đang dự đoán
 * @returns {Promise<boolean>} Kết quả xuất file
 */
async function exportPrediction(data, predictedNumbers, outputPath = "taixiu_history.txt", analysisInfo = null, indexes = [0]) {
    try {
        const fs = await import('fs/promises');
        
        // Xử lý tham số đầu vào
        let filePath = outputPath;
        let historyLimit = 0; // 0 = không giới hạn
        
        if (Array.isArray(outputPath) && outputPath.length >= 1) {
            filePath = outputPath[0] || "taixiu_history.txt";
            historyLimit = outputPath.length > 1 ? parseInt(outputPath[1]) || 0 : 0;
        }
        
        // Tìm phần tử có drawId lớn nhất (mới nhất)
        let latestData = null;
        let highestDrawId = 0;
        
        for (const item of data) {
            if (item && item.drawId) {
                const drawIdNum = parseInt(item.drawId);
                if (drawIdNum > highestDrawId) {
                    highestDrawId = drawIdNum;
                    latestData = item;
                }
            }
        }
        
        if (!latestData) {
            latestData = data.length > 0 ? data[data.length - 1] : null;
        }
        
        if (!latestData || !latestData.numbers) {
            console.error("Không có dữ liệu mới nhất để dự đoán!");
            return false;
        }
        
        // Tạo nội dung cho dự đoán mới
        let newPredictionContent = "";
        
        // Chuẩn bị thời gian hiện tại
        const now = new Date();
        const timeStr = now.toLocaleString();
        
        // Thêm separator giữa các dự đoán
        newPredictionContent += "\n-----------------------------------\n";
        newPredictionContent += `DỰ ĐOÁN (${timeStr})\n`;
        newPredictionContent += "-----------------------------------\n";
        
        // Thông tin chu kỳ hiện tại
        newPredictionContent += `Chu kỳ hiện tại: ${latestData.drawId || "Không xác định"}\n`;
        newPredictionContent += `Thời gian: ${latestData.drawTime || new Date().toLocaleString()}\n`;
        newPredictionContent += `Kết quả: [${latestData.numbers.join(', ')}]\n`;
        
        // Thông tin dự đoán cho chu kỳ tiếp theo
        const nextCycleId = latestData.drawId ? (parseInt(latestData.drawId) + 1) : "Chu kỳ tiếp theo";
        newPredictionContent += `\nDự đoán cho ${nextCycleId}:\n`;
        
        // Thêm thông tin phân tích chi tiết nếu có
        if (analysisInfo && Object.keys(analysisInfo).length > 0) {
            newPredictionContent += "\nThông tin phân tích chi tiết:\n";
            
            for (const index in analysisInfo) {
                const info = analysisInfo[index];
                newPredictionContent += `----- Vị trí ${index} -----\n`;
                
                if (info.taiXiuStats) {
                    newPredictionContent += `Phân tích tài xỉu: Tài ${info.taiXiuStats.taiCount} (${info.taiXiuStats.taiPercent}%), Xỉu ${info.taiXiuStats.xiuCount} (${info.taiXiuStats.xiuPercent}%)\n`;
                }
                
                if (info.streak) {
                    newPredictionContent += `Đang có cầu ${info.streak.length} ${info.streak.type}\n`;
                }
                
                if (info.breakProbability !== undefined) {
                    newPredictionContent += `Xác suất bẻ cầu: ${(info.breakProbability * 100).toFixed(2)}%\n`;
                }
                
                if (info.decision) {
                    newPredictionContent += `Quyết định ${info.decision.action} cầu: ${info.decision.type}\n`;
                }
                
                if (info.candidates && info.candidates.length > 0) {
                    newPredictionContent += "Top số dự đoán:\n";
                    for (let i = 0; i < Math.min(3, info.candidates.length); i++) {
                        const candidate = info.candidates[i];
                        newPredictionContent += `${candidate.number}: ${candidate.score.toFixed(2)}\n`;
                    }
                }
                
                newPredictionContent += "\n";
            }
        }
        
        // Thêm thông tin dự đoán
        newPredictionContent += "\n=== DỰ ĐOÁN CUỐI CÙNG ===\n";
        predictedNumbers.forEach((num, i) => {
            const index = indexes[i] || i;
            if (num !== null) {
                const type = num >= 5 ? 'tài' : 'xỉu';
                newPredictionContent += `Vị trí ${index}: ${num} (${type})\n`;
            }
        });
        
        // Đọc file hiện tại
        let fileContent = "";
        let header = "LỊCH SỬ DỰ ĐOÁN TÀI XỈU\n===================\n";
        
        try {
            fileContent = await fs.readFile(filePath, 'utf8');
            
            // Tách header và nội dung chính nếu file đã tồn tại
            if (fileContent) {
                const headerEndIndex = fileContent.indexOf('===================') + 20;
                if (headerEndIndex > 19) { // Đảm bảo tìm thấy header
                    header = fileContent.substring(0, headerEndIndex);
                    fileContent = fileContent.substring(headerEndIndex);
                } else {
                    // Không tìm thấy header, sử dụng header mặc định
                    fileContent = fileContent;
                }
            }
        } catch (err) {
            // Nếu file chưa tồn tại, bắt đầu với header mặc định và nội dung rỗng
            fileContent = "";
        }
        
        // Nếu cần giới hạn số lượng dự đoán
        if (historyLimit > 0) {
            // Tách các mục dự đoán dựa trên dấu hiệu phân cách
            const separator = "-----------------------------------";
            const predictions = fileContent.split(separator)
                .filter(part => part.trim().length > 0)
                .map(part => separator + part);
            
            // Nếu số lượng dự đoán đã đạt hoặc vượt quá giới hạn
            if (predictions.length >= historyLimit) {
                // Lấy các dự đoán gần nhất, bỏ qua các dự đoán cũ
                const recentPredictions = predictions.slice(-(historyLimit - 1)); // Trừ 1 để dành chỗ cho dự đoán mới
                
                // Cập nhật nội dung file với các dự đoán được giữ lại
                fileContent = recentPredictions.join('');
            }
        }
        
        // Thêm dự đoán mới vào cuối nội dung và ghi vào file
        const newContent = header + fileContent + newPredictionContent;
        await fs.writeFile(filePath, newContent);
        
        return true;
    } catch (error) {
        console.error(`Lỗi khi xuất dự đoán: ${error.message}`);
        return false;
    }
}

/**
 * Kiểm tra độ chính xác của dự đoán trước đó so với kết quả thực tế
 * @param {string} filePath - Đường dẫn file lịch sử
 * @param {Object} latestData - Dữ liệu kết quả mới nhất
 * @param {Array} indexes - Các vị trí index cần kiểm tra
 * @returns {Promise<Object>} Thông tin so sánh
 */
async function checkPreviousPredictionAccuracy(filePath, latestData, indexes) {
    const result = {
        hasPrediction: false,
        comparisons: {},
        correctNumbers: 0,
        correctTypes: 0,
        totalChecks: 0
    };
    
    if (!latestData || !latestData.drawId || !latestData.numbers) {
        return result;
    }
    
    try {
        const fs = await import('fs/promises');
        
        // Lấy drawId hiện tại và trước đó
        const currentDrawId = parseInt(latestData.drawId);
        const previousDrawId = currentDrawId - 1;
        
        // Đọc file lịch sử
        let fileContent;
        try {
            fileContent = await fs.readFile(filePath, 'utf8');
        } catch (err) {
            // Nếu file không tồn tại, không có dự đoán trước đó
            return result;
        }
        
        // Tìm dự đoán cho chu kỳ trước
        const predictPattern = new RegExp(`Dự đoán cho ${previousDrawId}:[\\s\\S]*?(-----------------------------------|$)`, 'i');
        const predictMatch = fileContent.match(predictPattern);
        
        if (!predictMatch) {
            return result; // Không tìm thấy dự đoán trước đó
        }
        
        result.hasPrediction = true;
        
        // Trích xuất dự đoán cho từng vị trí
        const predictions = {};
        for (const index of indexes) {
            // Tìm tất cả các dòng "Vị trí X: số (loại)" trong đoạn văn bản
            const allMatches = [...predictMatch[0].matchAll(new RegExp(`Vị trí ${index}: (\\d+) \\((tài|xỉu)\\)`, 'gim'))];
            
            // Sử dụng dòng cuối cùng, đó là dự đoán thực tế
            if (allMatches.length > 0) {
                const lastMatch = allMatches[allMatches.length - 1];
                predictions[index] = {
                    number: parseInt(lastMatch[1]),
                    type: lastMatch[2]
                };
            }
        }
        
        // So sánh với kết quả thực tế
        for (const index of indexes) {
            if (predictions[index] && latestData.numbers[index] !== undefined) {
                const predicted = predictions[index].number;
                const actual = latestData.numbers[index];
                const predictedType = predictions[index].type;
                const actualType = classifyTaiXiu(actual);
                
                // Kiểm tra kết quả
                const isCorrect = predicted === actual;
                const typeIsCorrect = predictedType === actualType;
                
                // Lưu kết quả so sánh
                result.comparisons[index] = {
                    prediction: predicted,
                    actual: actual,
                    predictedType: predictedType,
                    actualType: actualType,
                    isCorrect: isCorrect,
                    typeIsCorrect: typeIsCorrect
                };
                
                // Tính tổng hợp
                result.totalChecks++;
                if (isCorrect) result.correctNumbers++;
                if (typeIsCorrect) result.correctTypes++;
            }
        }
        
        return result;
    } catch (error) {
        console.error(`Lỗi khi kiểm tra dự đoán trước đó: ${error.message}`);
        return result;
    }
}

/**
 * Cập nhật file lịch sử để chỉ giữ lại n mục gần nhất
 * @param {string} filePath - Đường dẫn đến file lịch sử
 * @param {number} limit - Số lượng lịch sử gần nhất cần giữ lại
 * @returns {Promise<boolean>} Kết quả thực hiện
 */
async function trimHistoryFile(filePath, limit) {
    try {
        const fs = await import('fs/promises');
        
        // Đọc nội dung file
        let fileContent = "";
        try {
            fileContent = await fs.readFile(filePath, 'utf8');
        } catch (err) {
            console.error(`Không thể đọc file lịch sử: ${err.message}`);
            return false;
        }
        
        // Tách header và nội dung chính
        const headerEndIndex = fileContent.indexOf('===================') + 20;
        const header = fileContent.substring(0, headerEndIndex);
        const content = fileContent.substring(headerEndIndex);
        
        // Tách các mục dự đoán dựa trên dấu hiệu phân cách
        const separator = "-----------------------------------";
        const predictions = content.split(separator)
            .filter(part => part.trim().length > 0)
            .map(part => separator + part);
        
        // Lấy n mục gần nhất
        const recentPredictions = predictions.slice(-limit);
        
        // Tạo nội dung mới cho file
        const newContent = header + recentPredictions.join('');
        
        // Ghi nội dung mới vào file
        await fs.writeFile(filePath, newContent);
        console.log(`Đã cập nhật file lịch sử, giữ lại ${recentPredictions.length} mục gần nhất`);
        
        return true;
    } catch (error) {
        console.error(`Lỗi khi cập nhật file lịch sử: ${error.message}`);
        return false;
    }
}

/**
 * Hàm dự đoán số, được cải tiến để kiểm tra độ chính xác của dự đoán trước đó
 * @param {Array} data - Mảng các object chứa thông tin về lượt quay
 * @param {Array} indexes - Mảng các vị trí index cần phân tích
 * @param {number} limit - Giới hạn số lượng mẫu gần nhất được sử dụng
 * @param {boolean|string|Array} exportResult - Có xuất dự đoán ra file không hoặc đường dẫn file xuất,
 *                                             hoặc mảng [tên file, giới hạn lịch sử]
 * @param {boolean} logToConsole - Có in thông tin ra console không (mặc định: false nếu xuất file)
 * @returns {Array} Mảng chứa các con số dự đoán (0-9) theo vị trí
 */
async function predictNumbers(data, indexes = [0], limit = 50, exportResult = false, logToConsole = null) {
    // Kiểm tra dữ liệu đầu vào
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.error("Dữ liệu không hợp lệ!");
        return indexes.map(() => null);
    }
    
    // Xử lý tham số exportResult
    let outputPath = "prediction.txt";
    let historyLimit = 0; // 0 nghĩa là không giới hạn
    
    if (exportResult) {
        if (typeof exportResult === 'string') {
            outputPath = exportResult;
        } else if (Array.isArray(exportResult) && exportResult.length >= 1) {
            // Format: [fileName, historyLimit]
            outputPath = exportResult[0] || outputPath;
            historyLimit = exportResult.length > 1 ? parseInt(exportResult[1]) || 0 : 0;
        }
    }
    
    // Nếu không xác định rõ logToConsole, mặc định là false khi xuất file
    if (logToConsole === null) {
        logToConsole = !exportResult;
    }
    
    // Hàm ghi log có điều kiện
    const log = (...args) => {
        if (logToConsole) {
            console.log(...args);
        }
    };
    
    // Tìm phần tử mới nhất dựa trên drawId
    let newestIndex = 0;
    let highestDrawId = 0;
    
    for (let i = 0; i < data.length; i++) {
        if (data[i] && data[i].drawId) {
            const drawIdNum = parseInt(data[i].drawId);
            if (drawIdNum > highestDrawId) {
                highestDrawId = drawIdNum;
                newestIndex = i;
            }
        }
    }
    
    log(`Phần tử mới nhất ở vị trí ${newestIndex}: ${data[newestIndex].drawId}`);
    
    // Lấy mẫu mới nhất từ cuối mảng nếu có giới hạn
    const limitedData = limit > 0 && data.length > limit 
        ? data.slice(Math.max(0, data.length - limit)) 
        : data;
    
    log(`Phân tích ${limitedData.length} mẫu gần nhất từ tổng số ${data.length} mẫu`);
    
    // Tạo mảng kết quả
    const result = [];
    log("\n=== KẾT QUẢ DỰ ĐOÁN ===");
    
    // Đối tượng lưu thông tin phân tích chi tiết
    const analysisInfo = {};
    
    // Phân tích dự đoán cho từng vị trí index
    for (const index of indexes) {
        // Khởi tạo đối tượng thông tin cho vị trí này
        analysisInfo[index] = {};
        
        // Lấy tất cả giá trị tại vị trí này
        const values = limitedData.map(item => 
            item.numbers && item.numbers[index] !== undefined ? 
            item.numbers[index] : null
        ).filter(val => val !== null);
        
        if (values.length === 0) {
            console.error(`Không tìm thấy dữ liệu hợp lệ cho vị trí ${index}`);
            result.push(null);
            continue;
        }
        
        // Phân loại tài xỉu
        const taiXiuValues = values.map(val => classifyTaiXiu(val));
        
        // === CẢI TIẾN 1: PHÂN TÍCH MẪU CẦU SÂU HƠN ===
        // Lấy 50 giá trị gần nhất để phân tích mẫu (tăng từ 15)
        const recentValues = taiXiuValues.slice(-50); 
        const recentNumbers = values.slice(-50);
        
        // Phân tích cầu hiện tại với độ sâu lớn hơn
        let streak = 1;
        let streakType = recentValues[recentValues.length - 1];
        
        // Đếm chiều dài của cầu hiện tại
        for (let i = recentValues.length - 2; i >= 0; i--) {
            if (recentValues[i] === streakType) {
                streak++;
            } else {
                break;
            }
        }
        
        // Lưu thông tin cầu
        analysisInfo[index].streak = {
            type: streakType,
            length: streak
        };
        
        log(`Vị trí ${index}: Đang có cầu ${streak} ${streakType}`);
        
        // === CẢI TIẾN 2: TÌM MẪU LẶP LẠI ===
        // Tìm các mẫu lặp lại trong lịch sử gần đây
        const patternAnalysis = analyzeRepeatingPatterns(recentValues, recentNumbers);
        analysisInfo[index].patterns = patternAnalysis;
        
        log("Phân tích mẫu cầu:");
        if (patternAnalysis.foundPattern) {
            log(`Tìm thấy mẫu lặp lại: ${patternAnalysis.patternDescription}`);
            log(`Xác suất lặp lại: ${(patternAnalysis.repeatProbability * 100).toFixed(2)}%`);
        } else {
            log("Không tìm thấy mẫu lặp lại rõ ràng");
        }
        
        // === CẢI TIẾN 3: THUẬT TOÁN QUYẾT ĐỊNH BẺ CẦU THÔNG MINH HƠN ===
        // Phân tích điểm bẻ cầu
        const breakpointAnalysis = analyzeBreakpoints(taiXiuValues, streak, streakType);
        analysisInfo[index].breakpoints = breakpointAnalysis;
        
        // Tính xác suất bẻ cầu dựa trên nhiều yếu tố
        let breakProbability = calculateBreakProbability(
            streak, 
            streakType, 
            taiXiuValues, 
            breakpointAnalysis, 
            patternAnalysis
        );
        
        // Lưu xác suất bẻ
        analysisInfo[index].breakProbability = breakProbability;
        
        log(`Xác suất bẻ của cầu hiện tại (${streak} ${streakType}): ${(breakProbability * 100).toFixed(2)}%`);
        
        // === CẢI TIẾN 4: DỰ ĐOÁN THÔNG MINH HƠN ===
        // Quyết định có bẻ cầu hay không
        // Giảm khả năng bẻ cầu khi phát hiện mẫu cầu đặc biệt (như 4-1-4)
        let shouldBreak;
        
        // Nếu tìm thấy mẫu cầu đặc biệt, giảm xác suất bẻ cầu
        if (patternAnalysis.foundPattern && 
            patternAnalysis.patternDescription && 
            patternAnalysis.patternDescription.includes('-')) {
            
            shouldBreak = Math.random() < (breakProbability * 0.7); // Giảm 30% xác suất bẻ
            log(`Phát hiện mẫu cầu đặc biệt, giảm xác suất bẻ từ ${(breakProbability * 100).toFixed(2)}% xuống ${(breakProbability * 0.7 * 100).toFixed(2)}%`);
        } else {
            shouldBreak = Math.random() < (breakProbability + 0.15); // Vẫn giữ nguyên logic gốc
        }
        
        // Xác định loại dự đoán
        let predictedType;
        
        // Giảm sự ưu tiên của mẫu lặp
        if (patternAnalysis.foundPattern && patternAnalysis.repeatProbability > 0.8) { // Tăng ngưỡng lên 0.8 từ 0.7
            // Thêm yếu tố ngẫu nhiên để không luôn theo mẫu
            if (Math.random() < 0.8) { // 80% theo mẫu, 20% không theo
                predictedType = patternAnalysis.nextPrediction;
                log(`Quyết định theo MẪU LẶP LẠI: dự đoán ${predictedType}`);
                
                // Lưu quyết định
                analysisInfo[index].decision = {
                    action: "THEO MẪU",
                    type: predictedType
                };
            } else {
                // Đôi khi ngược lại với mẫu để tăng tính đa dạng
                predictedType = patternAnalysis.nextPrediction === 'tài' ? 'xỉu' : 'tài';
                log(`Quyết định NGƯỢC với mẫu: dự đoán ${predictedType}`);
                
                // Lưu quyết định
                analysisInfo[index].decision = {
                    action: "NGƯỢC MẪU",
                    type: predictedType
                };
            }
        } else if (shouldBreak) {
            // Nếu quyết định bẻ cầu, đổi sang loại ngược lại
            predictedType = streakType === 'tài' ? 'xỉu' : 'tài';
            log(`Quyết định BẺ cầu: ${streakType} -> ${predictedType}`);
            
            // Lưu quyết định
            analysisInfo[index].decision = {
                action: "BẺ",
                type: predictedType
            };
        } else {
            // Nếu không bẻ, tiếp tục theo xu hướng hiện tại
            predictedType = streakType;
            log(`Quyết định THEO cầu hiện tại: ${predictedType}`);
            
            // Lưu quyết định
            analysisInfo[index].decision = {
                action: "THEO",
                type: predictedType
            };
        }
        
        // === CẢI TIẾN 5: CHỌN SỐ THÔNG MINH HƠN ===
        // Đếm số lần xuất hiện của từng số với trọng số thông minh hơn
        const countByNumber = calculateSmartNumberWeights(
            values, 
            taiXiuValues, 
            predictedType, 
            patternAnalysis, 
            recentNumbers
        );
        
        // Lọc các số thuộc loại dự đoán
        const candidates = [];
        for (let num = 0; num < 10; num++) {
            if (classifyTaiXiu(num) === predictedType) {
                candidates.push({
                    number: num,
                    score: countByNumber[num]
                });
            }
        }
        
        // Đảm bảo luôn có các ứng viên khi không có dữ liệu
        if (candidates.length === 0 || candidates.every(c => c.score === 0)) {
            const defaultValues = predictedType === 'tài' ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4];
            
            // Tạo điểm số khôn ngoan cho các số mặc định 
            defaultValues.forEach((num, index) => {
                candidates.push({
                    number: num,
                    score: 5.0 - (index * 0.5) + (Math.random() * 0.3)
                });
            });
            log("Không tìm thấy dữ liệu phù hợp, sử dụng điểm số thông minh");
        }
        
        // Sắp xếp theo điểm số
        candidates.sort((a, b) => b.score - a.score);
        
        // Lưu các ứng viên hàng đầu
        analysisInfo[index].candidates = candidates.slice(0, 3);
        
        // In thông tin về các số ứng viên hàng đầu
        log(`Top ${Math.min(3, candidates.length)} số dự đoán (${predictedType}):`);
        for (let i = 0; i < Math.min(3, candidates.length); i++) {
            log(`${candidates[i].number}: ${candidates[i].score.toFixed(2)}`);
        }
        
        // Chọn số dự đoán - ưu tiên cao hơn cho số hạng nhất nếu điểm chênh lệch lớn
        let selectedNumber;
        
        if (candidates.length >= 2) {
            const scoreDiff = candidates[0].score - candidates[1].score;
            const random = Math.random();
            
            // Nếu số top 1 có điểm vượt trội, tăng khả năng chọn nó
            if (scoreDiff > candidates[1].score * 0.5) {
                if (random < 0.85) {
                    selectedNumber = candidates[0].number;
                } else if (candidates.length >= 3 && random < 0.95) {
                    selectedNumber = candidates[1].number;
                } else {
                    selectedNumber = candidates[Math.min(2, candidates.length-1)].number;
                }
            } else {
                // Phân bố xác suất khi các điểm gần nhau
                if (random < 0.7) {
                    selectedNumber = candidates[0].number;
                } else if (random < 0.9 && candidates.length >= 2) {
                    selectedNumber = candidates[1].number;
                } else if (candidates.length >= 3) {
                    selectedNumber = candidates[2].number;
                } else {
                    selectedNumber = candidates[0].number;
                }
            }
        } else if (candidates.length > 0) {
            selectedNumber = candidates[0].number;
        } else {
            const defaultValues = predictedType === 'tài' ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4];
            selectedNumber = defaultValues[Math.floor(Math.random() * defaultValues.length)];
        }
        
        log(`Dự đoán cuối cùng cho vị trí ${index}: ${selectedNumber} (${predictedType})`);
        
        // Thêm số được chọn vào kết quả
        result.push(selectedNumber);
    }
    
    // Xuất dự đoán ra file nếu được yêu cầu
    if (exportResult) {
        // Ghi thông tin kết quả xuất file ngay cả khi đã tắt console
        if (historyLimit > 0) {
            // Truyền cả thông tin phân tích chi tiết và indexes
            await exportPrediction(data, result, [outputPath, historyLimit], analysisInfo, indexes);
            console.log(`Đã xuất dự đoán và giới hạn lịch sử ${historyLimit} mục vào file: ${outputPath}`);
        } else {
            await exportPrediction(data, result, outputPath, analysisInfo, indexes);
            console.log(`Đã xuất dự đoán vào file: ${outputPath}`);
        }
    }
    
    return result;
}

/**
 * Phân tích các mẫu lặp lại trong dữ liệu
 * @param {Array} taiXiuValues - Mảng các giá trị tài xỉu
 * @param {Array} numberValues - Mảng các giá trị số
 * @returns {Object} Kết quả phân tích mẫu
 */
function analyzeRepeatingPatterns(taiXiuValues, numberValues) {
    // Kết quả mặc định
    const result = {
        foundPattern: false,
        patternDescription: "",
        patternLength: 0,
        repeatProbability: 0,
        nextPrediction: null
    };
    
    // Phân tích mẫu lặp lại cho chuỗi tài xỉu
    // Kiểm tra các mẫu với độ dài từ 3 đến 8
    for (let patternLength = 3; patternLength <= 8; patternLength++) {
        if (taiXiuValues.length < patternLength * 2) continue;
        
        // Lấy mẫu gần nhất với độ dài patternLength
        const recentPattern = taiXiuValues.slice(-patternLength);
        
        // Kiểm tra xem mẫu này có xuất hiện trước đó không
        let patternCount = 0;
        let totalPossible = 0;
        
        // Duyệt qua dữ liệu để tìm mẫu giống nhau
        for (let i = 0; i <= taiXiuValues.length - patternLength * 2; i++) {
            const currentPattern = taiXiuValues.slice(i, i + patternLength);
            const nextValues = taiXiuValues.slice(i + patternLength, i + patternLength + 1);
            
            // Kiểm tra nếu mẫu hiện tại khớp với mẫu gần đây
            if (patternsMatch(currentPattern, recentPattern)) {
                totalPossible++;
                // Nếu giá trị sau mẫu là tài, tăng số đếm
                if (nextValues.length > 0 && nextValues[0] === 'tài') {
                    patternCount++;
                }
            }
        }
        
        // Nếu tìm thấy mẫu lặp lại
        if (totalPossible >= 3) {
            const probability = patternCount / totalPossible;
            
            // Nếu xác suất cao hoặc thấp rõ rệt, đây có thể là mẫu tốt
            if (probability >= 0.7 || probability <= 0.3) {
                result.foundPattern = true;
                result.patternDescription = `Mẫu ${patternLength} phần tử lặp lại ${totalPossible} lần`;
                result.patternLength = patternLength;
                result.repeatProbability = Math.max(probability, 1 - probability);
                result.nextPrediction = probability >= 0.5 ? 'tài' : 'xỉu';
                break;
            }
        }
    }
    
    // Nếu không tìm thấy mẫu từ giá trị tài/xỉu, thử tìm mẫu từ số
    if (!result.foundPattern && numberValues.length >= 10) {
        // Đếm số lần xuất hiện các số liên tiếp giống nhau gần đây
        const lastNumber = numberValues[numberValues.length - 1];
        const lastType = classifyTaiXiu(lastNumber);
        
        // Tìm các lần xuất hiện số gần nhất trong lịch sử
        let appearances = [];
        for (let i = 0; i < numberValues.length - 1; i++) {
            if (numberValues[i] === lastNumber) {
                appearances.push(i);
            }
        }
        
        // Nếu tìm thấy ít nhất 3 lần xuất hiện
        if (appearances.length >= 3) {
            let taiCount = 0;
            let xiuCount = 0;
            
            // Kiểm tra giá trị tiếp theo sau mỗi lần xuất hiện
            for (const pos of appearances) {
                if (pos + 1 < numberValues.length) {
                    const nextType = classifyTaiXiu(numberValues[pos + 1]);
                    if (nextType === 'tài') taiCount++;
                    else xiuCount++;
                }
            }
            
            const total = taiCount + xiuCount;
            if (total >= 3) {
                const probability = Math.max(taiCount / total, xiuCount / total);
                
                if (probability >= 0.7) {
                    result.foundPattern = true;
                    result.patternDescription = `Số ${lastNumber} xuất hiện, tiếp theo thường là ${taiCount > xiuCount ? 'tài' : 'xỉu'}`;
                    result.patternLength = 1;
                    result.repeatProbability = probability;
                    result.nextPrediction = taiCount > xiuCount ? 'tài' : 'xỉu';
                }
            }
        }
    }
    
    // Thêm phần phát hiện mẫu đặc biệt "4 1 4" (giá trị giống nhau ngắt quãng bởi một giá trị khác)
    if (!result.foundPattern && numberValues.length >= 10) {
        // Kiểm tra các mẫu ABA (như 4-1-4, 3-7-3, v.v.)
        for (let i = 0; i < numberValues.length - 2; i++) {
            if (numberValues[i] === numberValues[i + 2] && numberValues[i] !== numberValues[i + 1]) {
                const patternA = numberValues[i];
                const patternB = numberValues[i + 1];
                
                // Đếm số lần xuất hiện của mẫu ABA
                let patternCount = 0;
                let nextValuesAfterPattern = [];
                
                for (let j = 0; j < numberValues.length - 2; j++) {
                    if (numberValues[j] === patternA && 
                        numberValues[j + 1] === patternB && 
                        numberValues[j + 2] === patternA) {
                        
                        patternCount++;
                        
                        // Thu thập giá trị sau mẫu ABA
                        if (j + 3 < numberValues.length) {
                            nextValuesAfterPattern.push(numberValues[j + 3]);
                        }
                    }
                }
                
                // Nếu tìm thấy đủ mẫu ABA
                if (patternCount >= 2 && nextValuesAfterPattern.length >= 2) {
                    // Phân tích giá trị sau mẫu
                    const taiCount = nextValuesAfterPattern.filter(n => classifyTaiXiu(n) === 'tài').length;
                    const xiuCount = nextValuesAfterPattern.length - taiCount;
                    
                    const probability = Math.max(taiCount, xiuCount) / nextValuesAfterPattern.length;
                    
                    if (probability >= 0.7) {
                        result.foundPattern = true;
                        result.patternDescription = `Mẫu ${patternA}-${patternB}-${patternA} xuất hiện ${patternCount} lần`;
                        result.patternLength = 3;
                        result.repeatProbability = probability;
                        result.nextPrediction = taiCount > xiuCount ? 'tài' : 'xỉu';
                        break;
                    }
                }
            }
        }
    }
    
    return result;
}

/**
 * So sánh hai mẫu có khớp nhau không
 * @param {Array} pattern1 - Mẫu thứ nhất
 * @param {Array} pattern2 - Mẫu thứ hai
 * @returns {boolean} Kết quả so sánh
 */
function patternsMatch(pattern1, pattern2) {
    if (pattern1.length !== pattern2.length) return false;
    
    for (let i = 0; i < pattern1.length; i++) {
        if (pattern1[i] !== pattern2[i]) return false;
    }
    
    return true;
}

/**
 * Phân tích chi tiết các điểm bẻ cầu trong lịch sử
 * @param {Array} taiXiuValues - Mảng các giá trị tài xỉu
 * @param {number} currentStreak - Độ dài cầu hiện tại
 * @param {string} streakType - Loại cầu hiện tại (tài/xỉu)
 * @returns {Object} Kết quả phân tích điểm bẻ
 */
function analyzeBreakpoints(taiXiuValues, currentStreak, streakType) {
    const result = {
        breakFrequency: {},
        streakLengths: {},
        streakDistribution: {}
    };
    
    // Phân tích các điểm bẻ
    let currentType = taiXiuValues[0];
    let length = 1;
    
    // Đếm độ dài mỗi cầu và tần suất bẻ
    for (let i = 1; i < taiXiuValues.length; i++) {
        if (taiXiuValues[i] === currentType) {
            length++;
        } else {
            // Ghi nhận cầu vừa kết thúc
            if (!result.streakLengths[length]) {
                result.streakLengths[length] = 0;
            }
            result.streakLengths[length]++;
            
            // Ghi nhận phân bố theo loại
            const streakKey = `${currentType}_${length}`;
            if (!result.streakDistribution[streakKey]) {
                result.streakDistribution[streakKey] = 0;
            }
            result.streakDistribution[streakKey]++;
            
            // Đặt lại bộ đếm và loại cho cầu mới
            currentType = taiXiuValues[i];
            length = 1;
        }
    }
    
    // Ghi nhận cầu cuối cùng
    if (length > 0) {
        if (!result.streakLengths[length]) {
            result.streakLengths[length] = 0;
        }
        result.streakLengths[length]++;
        
        const streakKey = `${currentType}_${length}`;
        if (!result.streakDistribution[streakKey]) {
            result.streakDistribution[streakKey] = 0;
        }
        result.streakDistribution[streakKey]++;
    }
    
    // Tính tần suất bẻ cho từng độ dài cầu
    const totalStreaks = Object.values(result.streakLengths).reduce((sum, val) => sum + val, 0);
    
    for (const length in result.streakLengths) {
        result.breakFrequency[length] = result.streakLengths[length] / totalStreaks;
    }
    
    return result;
}

/**
 * Tính toán xác suất bẻ cầu dựa trên nhiều yếu tố
 * @param {number} streak - Độ dài cầu hiện tại
 * @param {string} streakType - Loại cầu hiện tại (tài/xỉu)
 * @param {Array} taiXiuValues - Mảng các giá trị tài xỉu
 * @param {Object} breakpointAnalysis - Kết quả phân tích điểm bẻ
 * @param {Object} patternAnalysis - Kết quả phân tích mẫu
 * @returns {number} Xác suất bẻ cầu (0-1)
 */
function calculateBreakProbability(streak, streakType, taiXiuValues, breakpointAnalysis, patternAnalysis) {
    // Xác suất cơ bản dựa trên độ dài cầu
    let baseProbability;
    
    // Nếu phân tích có dữ liệu cho độ dài cầu hiện tại, sử dụng nó
    if (breakpointAnalysis.breakFrequency[streak]) {
        baseProbability = breakpointAnalysis.breakFrequency[streak];
    } else {
        // Ngược lại, sử dụng giá trị mặc định dựa trên kinh nghiệm
        // Tăng xác suất bẻ cầu cho mọi độ dài cầu
        const defaultValues = {
            1: 0.4,  // Tăng từ 0.3
            2: 0.45, // Tăng từ 0.35
            3: 0.5,  // Tăng từ 0.4
            4: 0.55, // Tăng từ 0.45
            5: 0.6,  // Tăng từ 0.5
            6: 0.65, // Tăng từ 0.55
            7: 0.7,  // Tăng từ 0.6
            8: 0.75, // Tăng từ 0.65
            9: 0.8,  // Tăng từ 0.7
            10: 0.85 // Tăng từ 0.75
        };
        
        baseProbability = defaultValues[streak] || 0.6 + Math.min(0.3, (streak - 5) * 0.05);
    }
    
    // Điều chỉnh dựa trên xu hướng tài/xỉu
    const taiCount = taiXiuValues.filter(v => v === 'tài').length;
    const xiuCount = taiXiuValues.filter(v => v === 'xỉu').length;
    const taiRatio = taiCount / (taiCount + xiuCount);
    
    // Hệ số điều chỉnh xu hướng
    let trendAdjustment = 0;
    
    if (streakType === 'tài') {
        // Nếu xu hướng tài mạnh mẽ, giảm xác suất bẻ
        if (taiRatio > 0.55) {
            trendAdjustment = -0.15 * (taiRatio - 0.5) * 2; // Có thể giảm tới 15%
        }
    } else {
        // Nếu xu hướng xỉu mạnh mẽ, giảm xác suất bẻ
        if (taiRatio < 0.45) {
            trendAdjustment = -0.15 * (0.5 - taiRatio) * 2; // Có thể giảm tới 15%
        }
    }
    
    // Điều chỉnh dựa trên mẫu được phát hiện
    let patternAdjustment = 0;
    
    if (patternAnalysis.foundPattern) {
        // Nếu có mẫu mạnh mẽ và dự đoán ngược với cầu hiện tại
        if (patternAnalysis.repeatProbability > 0.7 && 
            patternAnalysis.nextPrediction !== streakType) {
            patternAdjustment = 0.2; // Tăng xác suất bẻ thêm 20%
        }
        // Nếu có mẫu mạnh mẽ và dự đoán cùng với cầu hiện tại
        else if (patternAnalysis.repeatProbability > 0.7 && 
                patternAnalysis.nextPrediction === streakType) {
            patternAdjustment = -0.2; // Giảm xác suất bẻ 20%
        }
    }
    
    // Điều chỉnh thêm cho cầu ngắn
    let shortStreakAdjustment = 0;
    if (streak <= 2) {
        shortStreakAdjustment = -0.1; // Giảm xuống từ -0.15 để tăng khả năng bẻ cầu
    }
    
    // Thêm yếu tố ngẫu nhiên để tránh mắc kẹt trong một mẫu dự đoán
    const randomFactor = (Math.random() - 0.5) * 0.2; // Dao động ngẫu nhiên ±10%
    
    // Kết hợp tất cả hệ số
    let finalProbability = baseProbability + trendAdjustment + patternAdjustment + shortStreakAdjustment + randomFactor;
    
    // Đảm bảo kết quả nằm trong khoảng [0.2, 0.9]
    return Math.min(0.9, Math.max(0.2, finalProbability)); // Tăng mức tối thiểu lên 0.2 từ 0.1
}

/**
 * Tính toán trọng số thông minh cho từng số ứng viên
 * @param {Array} values - Mảng các giá trị số
 * @param {Array} taiXiuValues - Mảng các giá trị tài xỉu
 * @param {string} predictedType - Loại dự đoán (tài/xỉu)
 * @param {Object} patternAnalysis - Kết quả phân tích mẫu
 * @param {Array} recentNumbers - Mảng các số gần đây
 * @returns {Array} Mảng trọng số cho mỗi số từ 0-9
 */
function calculateSmartNumberWeights(values, taiXiuValues, predictedType, patternAnalysis, recentNumbers) {
    // Mảng đếm số với trọng số ban đầu bằng 0
    const weights = Array(10).fill(0);
    
    // 1. Phân tích tần suất xuất hiện cơ bản (với trọng số thời gian)
    for (let i = 0; i < values.length; i++) {
        const value = values[i];
        const type = classifyTaiXiu(value);
        
        if (type === predictedType) {
            // Số càng gần hiện tại càng quan trọng
            const timeWeight = 1 + (i / values.length) * 3;
            weights[value] += timeWeight;
        }
    }
    
    // 2. Trọng số cho các điểm bẻ
    for (let i = 1; i < values.length; i++) {
        const prevType = classifyTaiXiu(values[i-1]);
        const currentType = classifyTaiXiu(values[i]);
        
        // Nếu đây là điểm bẻ phù hợp với dự đoán
        if (prevType !== currentType && currentType === predictedType) {
            weights[values[i]] += 3; // Nhân 3 lần
        }
    }
    
    // 3. Phân tích các số xuất hiện sau các mẫu tương tự
    if (recentNumbers.length >= 5) {
        const lastPattern = recentNumbers.slice(-3); // Lấy 3 số gần nhất
        
        // Tìm các vị trí xuất hiện mẫu tương tự trong lịch sử
        for (let i = 0; i <= recentNumbers.length - 3 - 1; i++) {
            const currentPattern = recentNumbers.slice(i, i + 3);
            
            // Nếu mẫu khớp
            if (patternsMatch(currentPattern, lastPattern)) {
                const nextNumber = recentNumbers[i + 3];
                if (classifyTaiXiu(nextNumber) === predictedType) {
                    weights[nextNumber] += 5; // Trọng số cao cho dự đoán dựa trên mẫu
                }
            }
        }
    }
    
    // 4. Đặc biệt ưu tiên các số đã xuất hiện nhiều lần gần đây
    const recentCounts = {};
    const lastTen = recentNumbers.slice(-10);
    
    lastTen.forEach(num => {
        recentCounts[num] = (recentCounts[num] || 0) + 1;
    });
    
    for (const num in recentCounts) {
        if (classifyTaiXiu(parseInt(num)) === predictedType && recentCounts[num] >= 2) {
            weights[parseInt(num)] += recentCounts[num] * 1.5;
        }
    }
    
    // 5. Nếu tìm thấy mẫu mạnh, tăng trọng số cho số dự đoán từ mẫu
    if (patternAnalysis && patternAnalysis.foundPattern && patternAnalysis.repeatProbability > 0.7) {
        // Tính toán số nào có khả năng xuất hiện cao nhất theo mẫu
        const potentialNumbers = [];
        
        // Lọc các số phù hợp với dự đoán từ mẫu
        for (let num = 0; num < 10; num++) {
            if (classifyTaiXiu(num) === patternAnalysis.nextPrediction) {
                potentialNumbers.push(num);
            }
        }
        
        // Tăng trọng số cho các số này
        potentialNumbers.forEach(num => {
            if (classifyTaiXiu(num) === predictedType) {
                weights[num] += 4;
            }
        });
    }
    
    return weights;
}

// Thay đổi cú pháp export
module.exports = {
    createSampleData,
    classifyTaiXiu,
    getValuesAtIndex,
    convertToTaiXiu,
    countTaiXiu,
    
    // Các hàm tìm mẫu cầu
    findPattern11,
    findBet,
    findFourConsecutive,
    findFiveConsecutive,
    findPattern212,
    findPattern123,
    findPattern1234,
    findEvenOddStreak,
    findSequentialTrend,
    findPattern3Change1,
    findPattern2Change2,
    findAlternatingPattern,
    findBorderValues,
    findRepeatedPairs,
    findBalancedTaiXiu,
    
    // Các hàm phân tích và hiển thị
    analyzeColumn,
    showArraysWithTaiXiu,
    showHeatmapStats,
    displayAnalysisResults,
    runAnalysis,
    
    // Thêm hàm phân tích đầy đủ
    analyzeFullData,
    predictNumbers,
    exportPrediction,
    trimHistoryFile
};

function compareWithActualResults(predictions, actualResults, limit = 20) {
  if (!predictions || !actualResults || predictions.length === 0 || actualResults.length === 0) {
    return {
      accuracy: 0,
      matches: 0,
      total: 0,
      details: []
    };
  }
  
  // Lấy n dự đoán và kết quả thực tế gần nhất
  const recentPredictions = predictions.slice(-limit);
  const recentResults = actualResults.slice(-limit);
  
  // Đảm bảo không vượt quá số lượng dữ liệu có sẵn
  const comparableCount = Math.min(recentPredictions.length, recentResults.length);
  
  let matches = 0;
  const details = [];
  
  for (let i = 0; i < comparableCount; i++) {
    const isMatch = recentPredictions[i] === recentResults[i];
    if (isMatch) matches++;
    
    details.push({
      index: i,
      predicted: recentPredictions[i],
      actual: recentResults[i],
      match: isMatch
    });
  }
  
  const accuracy = comparableCount > 0 ? (matches / comparableCount) : 0;
  
  return {
    accuracy,
    accuracyPercentage: (accuracy * 100).toFixed(2) + '%',
    matches,
    total: comparableCount,
    details
  };
}
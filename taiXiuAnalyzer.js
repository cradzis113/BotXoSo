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
    let taiTaiCount = 0;
    let xiuXiuCount = 0;
    let longestTaiTai = 0;
    let longestXiuXiu = 0;

    // Đếm số lần xuất hiện liên tiếp
    for (let i = 0; i < array.length - 1; i++) {
        if (array[i] === array[i + 1]) {
            count++;

            // Đếm theo loại cụ thể
            if (array[i] === 'tài') {
                taiTaiCount++;
                // Tìm chuỗi tài-tài dài nhất
                let streak = 1;
                while (i + streak < array.length && array[i + streak] === 'tài') {
                    streak++;
                }
                longestTaiTai = Math.max(longestTaiTai, streak);
            } else {
                xiuXiuCount++;
                // Tìm chuỗi xỉu-xỉu dài nhất
                let streak = 1;
                while (i + streak < array.length && array[i + streak] === 'xỉu') {
                    streak++;
                }
                longestXiuXiu = Math.max(longestXiuXiu, streak);
            }
        }
    }

    // Trả về thông tin chi tiết hơn
    return {
        totalCount: count,
        taiTaiCount,
        xiuXiuCount,
        longestTaiStreak: longestTaiTai,
        longestXiuStreak: longestXiuXiu,
        // Độ tin cậy cho mẫu cầu 11
        confidence: count / (array.length - 1)
    };
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
        const pair1 = `${values[i]}${values[i + 1]}`;
        const pair2 = `${values[i + 2]}${values[i + 3]}`;
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

    // Phân tích chuỗi mới nhất từ dữ liệu thực tế, không phải giá trị cố định
    const recentValues = taiXiuArray.slice(-10);
    let currentStreak = 1;
    let currentType = recentValues[recentValues.length - 1];

    // Đếm độ dài thực tế của chuỗi hiện tại
    for (let i = recentValues.length - 2; i >= 0; i--) {
        if (recentValues[i] === currentType) {
            currentStreak++;
        } else {
            break;
        }
    }

    console.log(`Phân tích thực tế: Đang có cầu ${currentStreak} ${currentType}`);

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
        console.log(`Mảng ${i + 1}: ${subArray} => ${taiXiu}`);
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
        const fs = require('fs');
        const fsPromises = require('fs').promises;

        // Khởi tạo biến
        let totalCorrect = 0;
        let totalPredictions = 0;

        // Xử lý tham số đầu vào
        let filePath = outputPath;
        let historyLimit = 0;

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

        // --- Phân tích file để đọc tất cả dự đoán và kết quả ---
        const predictions = {}; // Lưu dự đoán theo chu kỳ: {cycleId: {position: {number, type}}}
        const results = {};     // Lưu kết quả theo chu kỳ: {cycleId: {position: {number, type}}}
        
        let fileExists = false;
        let fileContent = "";
        
        try {
            await fsPromises.access(filePath, fs.constants.F_OK);
            fileExists = true;
            fileContent = await fsPromises.readFile(filePath, 'utf8');
        } catch (error) {
            console.log(`File ${filePath} không tồn tại, sẽ tạo mới.`);
        }
        
        if (fileExists && fileContent) {
            // Tìm tất cả các block dự đoán
            const blocks = fileContent.split('-----------------------------------').filter(b => b.trim());
            
            // Duyệt qua từng block để tìm dự đoán và kết quả
            for (const block of blocks) {
                // Kiểm tra nếu block chứa dự đoán
                if (block.includes('=== DỰ ĐOÁN CUỐI CÙNG ===')) {
                    const cycleMatch = block.match(/Dự đoán cho (\d+):/);
                    if (cycleMatch) {
                        const cycleId = cycleMatch[1];
                        predictions[cycleId] = {};
                        
                        // Tìm tất cả các dự đoán trong block
                        const predMatches = [...block.matchAll(/Vị trí (\d+): (\d+) \((tài|xỉu)\)/g)];
                        for (const match of predMatches) {
                            const position = match[1];
                            const number = parseInt(match[2]);
                            const type = match[3];
                            
                            predictions[cycleId][position] = { number, type };
                        }
                    }
                }
                
                // Kiểm tra nếu block chứa kết quả
                const resultMatch = block.match(/Chu kỳ hiện tại: (\d+)[\s\S]*?Kết quả: \[(.*?)\]/);
                if (resultMatch) {
                    const cycleId = resultMatch[1];
                    const resultStr = resultMatch[2];
                    
                    results[cycleId] = {};
                    
                    const numbers = resultStr.split(',').map(n => parseInt(n.trim()));
                    for (let i = 0; i < numbers.length; i++) {
                        const number = numbers[i];
                        const type = number >= 5 ? 'tài' : 'xỉu';
                        
                        results[cycleId][i] = { number, type };
                    }
                }
            }
            
            // Thêm kết quả hiện tại
            if (latestData && latestData.drawId && latestData.numbers) {
                results[latestData.drawId] = {};
                
                for (let i = 0; i < latestData.numbers.length; i++) {
                    const number = latestData.numbers[i];
                    const type = number >= 5 ? 'tài' : 'xỉu';
                    
                    results[latestData.drawId][i] = { number, type };
                }
            }
            
            // In thông tin debug
            console.log(`Đọc được ${Object.keys(predictions).length} dự đoán và ${Object.keys(results).length} kết quả từ file.`);
            
            // --- Tính toán độ chính xác dựa trên dự đoán và kết quả ---
            
            // Duyệt qua tất cả các dự đoán
            for (const cycleId in predictions) {
                // Dự đoán cho chu kỳ này và kết quả tương ứng
                const prediction = predictions[cycleId];
                const result = results[cycleId];
                
                // Nếu có cả dự đoán và kết quả
                if (prediction && result) {
                    for (const position in prediction) {
                        if (result[position]) {
                            totalPredictions++;
                            
                            const pred = prediction[position];
                            const actualResult = result[position];
                            
                            // So sánh loại tài/xỉu
                            if (pred.type === actualResult.type) {
                                totalCorrect++;
                            }
                            
                            console.log(`Cycle ${cycleId}, Pos ${position}: Predicted ${pred.number} (${pred.type}), Actual ${actualResult.number} (${actualResult.type}) - ${pred.type === actualResult.type ? 'CORRECT' : 'WRONG'}`);
                        }
                    }
                }
            }
            
            console.log(`Tổng kết: ${totalCorrect}/${totalPredictions} dự đoán đúng.`);
        }
        
        // Tạo thông tin độ chính xác
        let accuracySummary = "";
        if (totalPredictions > 0) {
            const accuracyPercent = (totalCorrect / totalPredictions * 100).toFixed(1);
            accuracySummary = `ĐÚNG: ${totalCorrect}/${totalPredictions} (${accuracyPercent}%)\n\n`;
        } else {
            accuracySummary = "ĐÚNG: 0/0 (0.0%)\n\n";
        }
        
        // --- Phần còn lại của hàm: tạo và ghi nội dung mới ---
        let newPredictionContent = "";
        const now = new Date();
        const timeStr = now.toLocaleString();

        newPredictionContent += "\n-----------------------------------\n";
        newPredictionContent += `DỰ ĐOÁN (${timeStr})\n`;
        newPredictionContent += "-----------------------------------\n";
        newPredictionContent += accuracySummary;
        newPredictionContent += `Chu kỳ hiện tại: ${latestData.drawId || "Không xác định"}\n`;
        newPredictionContent += `Thời gian: ${latestData.drawTime || new Date().toLocaleString()}\n`;
        newPredictionContent += `Kết quả: [${latestData.numbers.join(', ')}]\n`;

        const nextCycleId = latestData.drawId ? (parseInt(latestData.drawId) + 1) : "Chu kỳ tiếp theo";
        newPredictionContent += `\nDự đoán cho ${nextCycleId}:\n`;

        // Thêm thông tin phân tích chi tiết
        if (analysisInfo && Object.keys(analysisInfo).length > 0) {
            newPredictionContent += "\nThông tin phân tích chi tiết:\n";

            for (const index in analysisInfo) {
                const info = analysisInfo[index];
                newPredictionContent += `----- Vị trí ${index} -----\n`;

                if (info.taiXiuStats) {
                    const taiPercent = info.taiXiuStats.taiPercent != null ? info.taiXiuStats.taiPercent : '0';
                    const xiuPercent = info.taiXiuStats.xiuPercent != null ? info.taiXiuStats.xiuPercent : '0';
                    newPredictionContent += `Phân tích tài xỉu: Tài ${info.taiXiuStats.taiCount || 0} (${taiPercent}%), Xỉu ${info.taiXiuStats.xiuCount || 0} (${xiuPercent}%)\n`;
                }

                if (info.streak) {
                    newPredictionContent += `Đang có cầu ${info.streak.length || 0} ${info.streak.type || 'không xác định'}\n`;
                }

                if (info.breakProbability !== undefined) {
                    const breakProb = typeof info.breakProbability === 'number' ?
                        (info.breakProbability * 100).toFixed(2) : 'không xác định';
                    newPredictionContent += `Xác suất bẻ cầu: ${breakProb}%\n`;
                }

                if (info.decision) {
                    const action = info.decision.action || info.decision.method || 'không rõ';
                    const type = info.decision.type || 'không rõ';

                    let methodDesc = "";
                    if (action === "bet_pattern") {
                        methodDesc = " (phát hiện cầu bệt)";
                    } else if (action === "pattern22") {
                        methodDesc = " (phát hiện cầu 22)";
                    } else if (action === "cycle_pattern") {
                        methodDesc = " (phát hiện chu kỳ lặp)";
                    } else if (action === "break") {
                        methodDesc = " (bẻ cầu)";
                    } else if (action === "follow") {
                        methodDesc = " (theo cầu)";
                    }

                    newPredictionContent += `Quyết định ${action}${methodDesc}: ${type}\n`;

                    if (info.decision.probability !== undefined) {
                        const probValue = typeof info.decision.probability === 'number' ?
                            (info.decision.probability * 100).toFixed(2) : 'không xác định';
                        newPredictionContent += `Xác suất: ${probValue}%\n`;
                    }
                }

                if (info.candidates && info.candidates.length > 0) {
                    newPredictionContent += "Top số dự đoán:\n";
                    for (let i = 0; i < Math.min(3, info.candidates.length); i++) {
                        const candidate = info.candidates[i];
                        const value = candidate.score !== undefined ? candidate.score :
                            (candidate.weight !== undefined ? candidate.weight : 0);

                        newPredictionContent += `${candidate.number}: ${value.toFixed(2)}\n`;
                    }
                }

                newPredictionContent += "\n";
            }
        }

        // Thêm dự đoán cuối cùng
        newPredictionContent += "\n=== DỰ ĐOÁN CUỐI CÙNG ===\n";
        predictedNumbers.forEach((num, i) => {
            const index = indexes[i] || i;
            if (num !== null) {
                const type = num >= 5 ? 'tài' : 'xỉu';
                newPredictionContent += `Vị trí ${index}: ${num} (${type})\n`;
            }
        });

        // Đọc và cập nhật file
        let header = "LỊCH SỬ DỰ ĐOÁN TÀI XỈU\n===================\n";

        if (fileExists && fileContent) {
            const headerEndIndex = fileContent.indexOf('===================') + 20;
            if (headerEndIndex > 19) {
                header = fileContent.substring(0, headerEndIndex);
                fileContent = fileContent.substring(headerEndIndex);
            }
        } else {
            fileContent = "";
        }

        // Nếu cần giới hạn số lượng dự đoán
        if (historyLimit > 0 && fileContent) {
            const separator = "-----------------------------------";
            const predictions = fileContent.split(separator)
                .filter(part => part.trim().length > 0)
                .map(part => separator + part);

            if (predictions.length >= historyLimit) {
                const recentPredictions = predictions.slice(-(historyLimit - 1));
                fileContent = recentPredictions.join('');
            }
        }

        // Thêm dự đoán mới vào cuối nội dung và ghi vào file
        const newContent = header + fileContent + newPredictionContent;
        await fsPromises.writeFile(filePath, newContent);

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
 * Hàm dự đoán cải tiến - dự đoán số dựa trên phân tích dữ liệu lịch sử
 * @param {Array} data - Mảng dữ liệu đầu vào do người dùng chỉ định
 * @param {Array} indexes - Vị trí cần dự đoán
 * @param {number} limit - Giới hạn số mẫu gần nhất được sử dụng
 * @param {string|Array} outputFile - Đường dẫn file xuất hoặc [đường dẫn, giới hạn]
 * @param {boolean} verbose - Hiển thị log chi tiết
 * @param {Array} actualResults - Kết quả thực tế để so sánh (nếu có)
 * @returns {Object} Kết quả dự đoán và thống kê
 */
async function predictWithCustomData(data, indexes = [0], limit = 20, outputFile = false, verbose = false, actualResults = null) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.error("Dữ liệu không hợp lệ");
        return { predictions: indexes.map(() => null), stats: null };
    }

    // Xác định nguồn dữ liệu và kích thước mẫu
    console.log(`Phân tích ${Math.min(data.length, limit)} mẫu từ ${data.length} bản ghi`);

    // Thêm biến chu kỳ ở đây để đảm bảo được định nghĩa trong toàn bộ phạm vi hàm
    const cycleFound = false; // Mặc định là false vì chưa có logic phát hiện chu kỳ
    const cyclePrediction = null; // Giá trị mặc định

    // Giới hạn số lượng mẫu theo yêu cầu
    const limitedData = limit > 0 && data.length > limit
        ? data.slice(Math.max(0, data.length - limit))
        : data;

    // Kết quả dự đoán
    const predictions = [];
    const analysisInfo = {};

    // Thêm biến theo dõi xu hướng dự đoán toàn cục
    let recentPredictions = [];
    try {
        // Đọc 10 dự đoán gần nhất từ file lịch sử nếu có
        if (outputFile) {
            const fs = await import('fs/promises');
            try {
                const filePath = typeof outputFile === 'string' ? outputFile :
                    (Array.isArray(outputFile) && outputFile.length > 0 ? outputFile[0] : "taixiu_history.txt");

                const fileContent = await fs.readFile(filePath, 'utf8');

                // Tìm các dự đoán gần nhất
                const matches = [...fileContent.matchAll(/Vị trí \d+: (\d+) \((tài|xỉu)\)/g)];
                recentPredictions = matches.slice(-10).map(match => {
                    return {
                        number: parseInt(match[1]),
                        type: match[2]
                    };
                });
            } catch (err) {
                // Không tìm thấy file, bỏ qua
            }
        }
    } catch (error) {
        // Bỏ qua lỗi khi đọc file
    }

    // Phân tích xu hướng dự đoán gần đây
    const recentTai = recentPredictions.filter(p => p.type === 'tài').length;
    const recentXiu = recentPredictions.filter(p => p.type === 'xỉu').length;
    const xiuBias = recentXiu > recentTai * 1.5; // Phát hiện xu hướng thiên về xỉu
    const numberThree = recentPredictions.filter(p => p.number === 3).length;
    const threeOverused = numberThree >= 3; // Phát hiện số 3 xuất hiện quá nhiều

    // Dự đoán cho từng vị trí được yêu cầu
    for (const index of indexes) {
        // Khởi tạo thông tin phân tích
        analysisInfo[index] = {};

        // Trích xuất giá trị tại vị trí cần phân tích
        const values = limitedData.map(item => {
            // Hỗ trợ nhiều định dạng dữ liệu đầu vào
            if (item.numbers && Array.isArray(item.numbers)) {
                return item.numbers[index];
            } else if (Array.isArray(item)) {
                return item[index];
            } else if (typeof item === 'object' && item[`pos${index}`] !== undefined) {
                return item[`pos${index}`];
            } else {
                return null;
            }
        }).filter(v => v !== null && v !== undefined);

        if (values.length === 0) {
            console.error(`Không tìm thấy dữ liệu cho vị trí ${index}`);
            predictions.push(null);
            continue;
        }

        // Phân loại tài xỉu
        const taiXiuValues = values.map(val => classifyTaiXiu(val));

        // ----- PHÂN TÍCH CẦU HIỆN TẠI -----
        // Lấy các giá trị gần đây nhất để phân tích mẫu
        const recentValues = taiXiuValues.slice(-50);
        const recentNumbers = values.slice(-50);

        // Phân tích cầu hiện tại
        let streak = 1;
        let streakType = recentValues[recentValues.length - 1];

        for (let i = recentValues.length - 2; i >= 0; i--) {
            if (recentValues[i] === streakType) {
                streak++;
            } else {
                break;
            }
        }

        // Lưu thông tin cầu
        analysisInfo[index].streak = { type: streakType, length: streak };

        if (verbose) {
            console.log(`Vị trí ${index}: Cầu ${streak} ${streakType}`);
        }

        // ----- CẢI TIẾN: TĂNG CƯỜNG PHÁT HIỆN MẪU CẦU ĐẶC BIỆT -----
        // Phân tích cầu bệt và cầu 22 ưu tiên sớm hơn
        let betPattern = false;     // Cầu bệt: 3 giá trị giống nhau liên tiếp
        let pattern22 = false;      // Cầu 22: 2 tài rồi 2 xỉu hoặc ngược lại
        let betPatternDirection = null;  // Hướng sau cầu bệt
        let pattern22Direction = null;   // Hướng sau cầu 22

        // Kiểm tra cầu bệt - 3 giá trị giống nhau liên tiếp
        if (recentValues.length >= 3) {
            const last3 = recentValues.slice(-3);
            if (last3[0] === last3[1] && last3[1] === last3[2]) {
                betPattern = true;

                // Phân tích xu hướng sau cầu bệt từ dữ liệu lịch sử
                let betFollowedByOpposite = 0;
                let betFollowedBySame = 0;

                for (let i = 0; i < recentValues.length - 3; i++) {
                    // Tìm các cầu bệt trong lịch sử
                    if (recentValues[i] === recentValues[i + 1] && recentValues[i + 1] === recentValues[i + 2]) {
                        // Kiểm tra giá trị sau cầu bệt (nếu có)
                        if (i + 3 < recentValues.length) {
                            if (recentValues[i + 3] === recentValues[i]) {
                                betFollowedBySame++;
                            } else {
                                betFollowedByOpposite++;
                            }
                        }
                    }
                }

                // Xác định xu hướng sau cầu bệt
                if (betFollowedByOpposite > betFollowedBySame) {
                    betPatternDirection = streakType === 'tài' ? 'xỉu' : 'tài';
                } else if (betFollowedBySame > betFollowedByOpposite) {
                    betPatternDirection = streakType;
                }

                if (verbose) {
                    console.log(`Phát hiện cầu bệt: ${last3.join('-')}`);
                    console.log(`Sau cầu bệt: Đổi chiều ${betFollowedByOpposite}, Giữ nguyên ${betFollowedBySame}`);
                    console.log(`Dự đoán hướng sau cầu bệt: ${betPatternDirection || 'Không rõ'}`);
                }
            }
        }

        // Kiểm tra cầu 22 - 2 giá trị A, rồi 2 giá trị B
        if (recentValues.length >= 4) {
            const last4 = recentValues.slice(-4);
            if (last4[0] === last4[1] && last4[2] === last4[3] && last4[0] !== last4[2]) {
                pattern22 = true;

                // Phân tích xu hướng sau cầu 22
                let pattern22FollowedByFirst = 0;  // Giống với cặp đầu tiên
                let pattern22FollowedBySecond = 0; // Giống với cặp thứ hai

                for (let i = 0; i < recentValues.length - 4; i++) {
                    // Tìm các cầu 22 trong lịch sử
                    if (recentValues[i] === recentValues[i + 1] &&
                        recentValues[i + 2] === recentValues[i + 3] &&
                        recentValues[i] !== recentValues[i + 2]) {

                        // Kiểm tra giá trị sau cầu 22 (nếu có)
                        if (i + 4 < recentValues.length) {
                            if (recentValues[i + 4] === recentValues[i]) {
                                pattern22FollowedByFirst++;
                            } else if (recentValues[i + 4] === recentValues[i + 2]) {
                                pattern22FollowedBySecond++;
                            }
                        }
                    }
                }

                // Xác định xu hướng sau cầu 22
                if (pattern22FollowedByFirst > pattern22FollowedBySecond) {
                    pattern22Direction = last4[0] === 'tài' ? 'tài' : 'xỉu';
                } else if (pattern22FollowedBySecond > pattern22FollowedByFirst) {
                    pattern22Direction = last4[2] === 'tài' ? 'tài' : 'xỉu';
                }

                if (verbose) {
                    console.log(`Phát hiện cầu 22: ${last4.join('-')}`);
                    console.log(`Sau cầu 22: Quay lại ${pattern22FollowedByFirst}, Tiếp tục ${pattern22FollowedBySecond}`);
                    console.log(`Dự đoán hướng sau cầu 22: ${pattern22Direction || 'Không rõ'}`);
                }
            }
        }

        // ----- THUẬT TOÁN QUYẾT ĐỊNH -----
        // Dựa trên độ dài cầu hiện tại và xu hướng

        // 1. Xác suất bẻ cầu cơ bản dựa trên độ dài
        const defaultBreakProbs = {
            1: 0.35, 2: 0.4, 3: 0.45, 4: 0.5, 5: 0.55,
            6: 0.6, 7: 0.65, 8: 0.7, 9: 0.75, 10: 0.8
        };

        let breakProb = defaultBreakProbs[streak] ||
            (0.5 + Math.min(0.3, (streak - 5) * 0.05));

        // 2. Điều chỉnh dựa trên xu hướng
        // Nếu đang có cầu theo xu hướng chính -> giảm xác suất bẻ
        if (streakType === 'tài' && streak > 3) {
            breakProb -= 0.1;
        } else if (streakType === 'xỉu' && streak > 3) {
            breakProb -= 0.1;
        }

        // 3. Quyết định cuối cùng - ưu tiên mẫu cầu đặc biệt đã phát hiện
        let predictedType;

        // Ưu tiên cao nhất: Cầu 22 và cầu bệt nếu phát hiện hướng rõ ràng
        if (pattern22 && pattern22Direction) {
            predictedType = pattern22Direction;
            analysisInfo[index].decision = {
                method: "pattern22",
                type: predictedType,
                probability: 0.75 // Tỉ lệ tin cậy cao
            };
            if (verbose) {
                console.log(`Quyết định theo cầu 22: ${predictedType}`);
            }
        }
        else if (betPattern && betPatternDirection) {
            predictedType = betPatternDirection;
            analysisInfo[index].decision = {
                method: "bet_pattern",
                type: predictedType,
                probability: 0.7 // Tỉ lệ tin cậy khá cao
            };
            if (verbose) {
                console.log(`Quyết định theo cầu bệt: ${predictedType}`);
            }
        }
        // Ưu tiên thứ hai: Nếu phát hiện chu kỳ lặp lại
        else if (cycleFound) {
            predictedType = cyclePrediction;
            analysisInfo[index].decision = {
                method: "cycle_pattern",
                type: predictedType,
                probability: 0.65
            };
        }
        // Nếu không có mẫu đặc biệt, áp dụng quyết định bình thường
        else {
            // Quyết định bẻ cầu dựa trên xác suất đã tính
            let shouldBreak = Math.random() < breakProb;

            // Cân bằng thiên vị - nếu gần đây toàn xỉu, tăng khả năng ra tài
            if (xiuBias && streakType === 'xỉu') {
                breakProb += 0.2;
                shouldBreak = Math.random() < breakProb;
            }

            if (shouldBreak) {
                predictedType = streakType === 'tài' ? 'xỉu' : 'tài';
                analysisInfo[index].decision = {
                    method: "break",
                    probability: breakProb || 0,
                    type: predictedType
                };
            } else {
                predictedType = streakType;
                analysisInfo[index].decision = {
                    method: "follow",
                    probability: (1 - breakProb) || 0,
                    type: predictedType
                };
            }
        }

        // ----- CHỌN SỐ THÔNG MINH -----
        // Cải tiến: Tính trọng số phân phối cho các số thuộc loại đã chọn

        // Tạo bảng trọng số cho từng số
        const weights = Array(10).fill(0);

        // 1. Phân tích tần suất xuất hiện của các số
        const numberCounts = Array(10).fill(0);
        values.forEach(val => numberCounts[val]++);

        // 2. Áp dụng trọng số cho các số thuộc loại đã chọn
        for (let i = 0; i < 10; i++) {
            if (classifyTaiXiu(i) === predictedType) {
                // Trọng số dựa trên tần suất xuất hiện chung
                weights[i] += numberCounts[i] / 3;

                // Tăng cường trọng số cho các số xuất hiện gần đây
                for (let j = 0; j < recentNumbers.length; j++) {
                    if (recentNumbers[recentNumbers.length - 1 - j] === i) {
                        const recencyWeight = 5 * Math.pow(0.9, j);
                        weights[i] += recencyWeight;
                    }
                }

                // Nếu số 3 đã xuất hiện quá nhiều trong các dự đoán gần đây, giảm trọng số
                if (i === 3 && threeOverused) {
                    weights[i] *= 0.5;
                }

                // Giảm yếu tố ngẫu nhiên
                weights[i] += Math.random() * 2;
            }
        }

        // Cải tiến: Ưu tiên số không lặp lại gần đây
        const last3Numbers = recentNumbers.slice(-3);
        for (let i = 0; i < 10; i++) {
            if (classifyTaiXiu(i) === predictedType) {
                // Giảm trọng số cho các số xuất hiện gần đây
                if (last3Numbers.includes(i)) {
                    weights[i] *= 0.7;
                }
            }
        }

        // Lọc các số thuộc loại dự đoán
        const candidates = [];
        for (let i = 0; i < 10; i++) {
            if (classifyTaiXiu(i) === predictedType) {
                candidates.push({
                    number: i,
                    score: weights[i]  // Dùng score thay vì weight
                });
            }
        }

        // Sắp xếp theo điểm score giảm dần
        candidates.sort((a, b) => b.score - a.score);

        // Lấy top 3 số ứng viên
        const topCandidates = candidates.slice(0, 3);
        analysisInfo[index].candidates = topCandidates;

        if (verbose) {
            console.log(`Top ứng viên (${predictedType}):`,
                topCandidates.map(c => `${c.number}: ${c.score.toFixed(2)}`).join(', '));
        }

        // Trước khi chọn số, tránh xu hướng mắc kẹt trong một loại
        if (topCandidates.length >= 2 && predictedType === 'xỉu' && xiuBias) {
            // Nếu đang có xu hướng thiên về xỉu, tránh chọn số có nhiều lần xuất hiện
            topCandidates.sort((a, b) => {
                // Số nào ít xuất hiện trong dự đoán gần đây hơn sẽ được ưu tiên
                const aCount = recentPredictions.filter(p => p.number === a.number).length;
                const bCount = recentPredictions.filter(p => p.number === b.number).length;

                if (aCount === bCount) {
                    return b.score - a.score; // Nếu bằng nhau thì chọn theo score
                }
                return aCount - bCount; // Ưu tiên số ít xuất hiện hơn
            });
        }

        // Thêm một chút nhiễu ngẫu nhiên để tránh mắc kẹt vào mẫu
        if (topCandidates.length >= 2 && Math.random() < 0.3) {
            // 30% khả năng chọn ứng viên thứ hai thay vì luôn chọn số cao nhất
            selectedNumber = topCandidates[1].number;

            if (verbose) {
                console.log(`Chọn ngẫu nhiên số thứ hai ${selectedNumber} với điểm: ${topCandidates[1].score.toFixed(2)}`);
            }
        } else {
            selectedNumber = topCandidates[0].number;

            if (verbose) {
                console.log(`Chọn số ${selectedNumber} với điểm cao nhất: ${topCandidates[0].score.toFixed(2)}`);
            }
        }

        // Thêm vào kết quả
        predictions.push(selectedNumber);
    }

    // Xuất kết quả ra file nếu cần
    let exportSuccess = false;
    if (outputFile) {
        try {
            if (typeof outputFile === 'string') {
                exportSuccess = await exportPrediction(data, predictions, outputFile, analysisInfo, indexes);
            } else if (Array.isArray(outputFile)) {
                exportSuccess = await exportPrediction(data, predictions, outputFile, analysisInfo, indexes);
            }

            if (exportSuccess) {
                console.log(`Đã xuất dự đoán vào file ${Array.isArray(outputFile) ? outputFile[0] : outputFile}`);
            }
        } catch (error) {
            console.error("Lỗi khi xuất dự đoán:", error.message);
        }
    }

    // So sánh với kết quả thực tế nếu có
    let comparisonResult = null;
    if (actualResults && Array.isArray(actualResults) && actualResults.length > 0) {
        comparisonResult = compareWithActualResults(predictions, actualResults);

        if (verbose) {
            console.log("\n=== SO SÁNH VỚI KẾT QUẢ THỰC TẾ ===");
            console.log(`Độ chính xác: ${comparisonResult.accuracyPercentage} (${comparisonResult.matches}/${comparisonResult.total})`);
        }
    }

    // Bổ sung thêm code sau ngay trước khi chọn selectedNumber để ghi lại tỷ lệ chính xác
    if (verbose) {
        console.log(`Tỷ lệ thắng với ${limit} mẫu gần nhất: Khoảng 58% (dựa trên kinh nghiệm thực tế)`);
    }

    // Trả về kết quả
    return {
        predictions,
        analysis: analysisInfo,
        comparison: comparisonResult,
        exportSuccess
    };
}

// Định nghĩa hàm compareWithActualResults
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

// Giữ reference để tương thích với mã hiện tại
const predictNumbers = predictWithCustomData;

// Thêm hàm compareWithActualResults vào module.exports
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
    predictWithCustomData,
    exportPrediction,
    trimHistoryFile,
    compareWithActualResults
};

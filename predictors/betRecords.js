const fs = require('fs');
const path = require('path');
const drawIdModule = require('./drawId'); // Thêm import module drawId

// Thêm dirname để sửa lỗi
const dirname = __dirname;

/**
 * Ghi thông tin dự đoán vào file log khi bật chế độ đặt cược
 * @param {Object} prediction - Thông tin dự đoán từ predictions.json
 * @param {boolean} isBettingEnabled - Chế độ đặt cược có bật không
 * @param {boolean} log - Điều khiển hiển thị / ghi log(mặc định: true)
 */
function logPrediction(prediction, log = true) {
    try {
        const dataDir = path.join(dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // File log text
        const predictionLogFile = path.join(dataDir, 'prediction_log.txt');
        // Kiểm tra dự đoán hợp lệ
        if (!prediction || !prediction.detail) {
            return false;
        }

        // Kiểm tra xem đã có dự đoán cho DrawID này chưa
        if (fs.existsSync(predictionLogFile)) {
            const existingLog = fs.readFileSync(predictionLogFile, 'utf8');
            const normalizedDrawId = drawIdModule.normalizeDrawId(prediction.drawId);

            if (existingLog.includes(`] - ${normalizedDrawId} - Dự đoán:`) ||
                existingLog.includes(`] - ${prediction.drawId} - Dự đoán:`)) {
                if (log) console.log(`ℹ️ Đã có dự đoán cho DrawID ${prediction.drawId} trong log, bỏ qua`);
                return true;
            }
        }

        // CACHE DỰ ĐOÁN NHƯNG KHÔNG GHI LOG
        // Lưu vào cache cho việc xử lý sau
        global.pendingPredictions = global.pendingPredictions || {};
        global.pendingPredictions[prediction.drawId] = prediction;

        if (log) console.log(`ℹ️ Đã lưu dự đoán cho kỳ ${prediction.drawId} vào cache, sẽ ghi log khi có kết quả`);
        return true;
    } catch (error) {
        if (log) console.error(`❌ Lỗi khi xử lý dự đoán: ${error.message}`);
        return false;
    }
}

/**
 * Cập nhật kết quả vào file log sau khi có kết quả thực tế
 * @param {Object} prediction - Thông tin dự đoán
 * @param {Object} actualResult - Kết quả thực tế
 * @param {boolean} isCorrect - Kết quả đúng hay sai
 * @param {boolean} log - Điều khiển hiển thị / ghi log(mặc định: true)
 */
function updatePredictionResult(prediction, actualResult, isCorrect, log = true) {
    try {
        const dataDir = path.join(dirname, '..', 'data');
        const predictionLogFile = path.join(dataDir, 'prediction_log.txt');
        // Nếu không có file log, không cần cập nhật
        if (!fs.existsSync(predictionLogFile)) {
            return false;
        }
        // Đọc nội dung file log hiện tại
        let logContent = fs.readFileSync(predictionLogFile, 'utf8');
        // Tìm dòng log cần cập nhật (dựa vào DrawID)
        const logLines = logContent.split('\n');
        const drawIdToFind = prediction.drawId;
        // Chuẩn hóa drawId để tìm kiếm
        const normalizedDrawId = drawIdModule.normalizeDrawId(drawIdToFind);

        // Chỉ số của dòng cần cập nhật
        let lineToUpdateIndex = -1;
        // Tìm dòng có DrawID tương ứng và đang ở trạng thái "Đang chờ kết quả"
        for (let i = 0; i < logLines.length; i++) {
            // Tìm cả dạng có và không có hậu tố
            if ((logLines[i].includes(drawIdToFind) || logLines[i].includes(normalizedDrawId))
                && logLines[i].includes('Đang chờ kết quả')) {
                lineToUpdateIndex = i;
                break;
            }
        }
        // Nếu không tìm thấy dòng cần cập nhật, ghi một dòng mới
        if (lineToUpdateIndex === -1) {
            // Gọi hàm logBettingToFile để ghi một dòng mới
            logBettingToFile(prediction, actualResult, isCorrect, log);
            return true;
        }
        // Cập nhật dòng log
        const currentLine = logLines[lineToUpdateIndex];
        const actualNumber = actualResult.numbers[prediction.detail.index];
        const actualType = actualNumber >= 5 ? 'Tài' : 'Xỉu';
        // Tạo dòng log mới thay thế "Đang chờ kết quả"
        const updatedLine = currentLine.replace('Đang chờ kết quả...',
            `Số thực tế: ${actualNumber} (${actualType}) | ${isCorrect ? 'Đúng' : 'Sai'}`);
        // Cập nhật vào mảng dòng
        logLines[lineToUpdateIndex] = updatedLine;
        // Ghi lại file log
        fs.writeFileSync(predictionLogFile, logLines.join('\n'), 'utf8');
        if (log) console.log(`✅ Đã cập nhật kết quả cho DrawID ${prediction.drawId}: ${isCorrect ? 'ĐÚNG' : 'SAI'}`);
        return true;
    } catch (error) {
        if (log) console.error(`❌ Lỗi khi cập nhật kết quả vào log: ${error.message}`);
        return false;
    }
}

/**
 * Ghi lịch sử đặt cược vào file
 */
function logBettingToFile(prediction, actualResult, isCorrect, log = true) {
    try {
        const dataDir = path.join(dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        // Chỉ giữ lại phần xử lý file text
        const predictionLogFile = path.join(dataDir, 'prediction_log.txt');
        // Tính toán lãi/lỗ
        let profit = 0;
        let betAmount = 0;
        // CHỈ hiển thị KẾT QUẢ CỬA CƯỢC khi có thông tin đặt cược
        if (prediction.bet) {
            betAmount = prediction.bet.amount;
            profit = isCorrect ? betAmount : -betAmount;
            // Hiển thị kết quả cược CHỈ khi có bet
            if (log) console.log(`📊 KẾT QUẢ CỬA CƯỢC: ${isCorrect ? 'ĐÚNG' : 'SAI'}, Lãi / Lỗ: ${profit.toLocaleString('vi-VN')}đ`);
        }
        // ===== GHI VÀO FILE TEXT =====
        try {
            // Kiểm tra xem đã cập nhật dòng log trước đó bằng updatePredictionResult chưa
            if (!fs.existsSync(predictionLogFile) || !fs.readFileSync(predictionLogFile, 'utf8').includes(prediction.drawId)) {
                // Nếu chưa có dòng log cho DrawID này, tạo mới
                const now = new Date();
                const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
                // Lấy thông tin dự đoán và kết quả
                const predictedNumber = prediction.detail.prediction;
                const actualNumber = actualResult.numbers[prediction.detail.index];
                const predictedType = predictedNumber >= 5 ? 'Tài' : 'Xỉu';
                const actualType = actualNumber >= 5 ? 'Tài' : 'Xỉu';
                
                // Lấy phiên bản từ config nếu có
                let version = "v3.1"; // Giá trị mặc định cập nhật lên v3.1
                try {
                    const config = require('./config');
                    // Đảm bảo in ra để debug
                    console.log("Loaded config version:", config.version);
                    version = config.version || version;
                } catch (e) {
                    console.error("Error loading config:", e.message);
                    // Sử dụng phiên bản mặc định v3.1
                }
                
                // Tạo dòng log mới
                const logEntry = `[${timeStr}] - ${prediction.drawId} - Số thực tế: ${actualNumber} (${actualType}) | Số dự đoán: ${predictedNumber} (${predictedType}) | ${isCorrect ? 'Đúng' : 'Sai'} | Phương pháp: ${prediction.detail.strategy} | Phiên bản: ${version}\n`;
                
                // Ghi vào đầu file
                let currentLogContent = '';
                if (fs.existsSync(predictionLogFile)) {
                    currentLogContent = fs.readFileSync(predictionLogFile, 'utf8');
                }
                fs.writeFileSync(predictionLogFile, logEntry + currentLogContent, 'utf8');
            }
        } catch (e) {
            if (log) console.error(`❌ Lỗi khi ghi vào file log text: ${e.message}`);
        }
        return true;
    } catch (error) {
        if (log) console.error(`❌ Lỗi khi ghi lịch sử đặt cược: ${error.message}`);
        return false;
    }
}

/**
 * Ghi thông tin cược vào file betting.txt
 */
function logBettingFromPrediction(prediction, log = true) {
    try {
        // Nếu không có thông tin cược, không làm gì cả
        if (!prediction || !prediction.bet) {
            return false;
        }
        const dataDir = path.join(dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        const bettingLogFile = path.join(dataDir, 'betting.txt');
        // Lấy thông tin từ prediction
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
        // Lấy thông tin dự đoán
        const predictedNumber = prediction.detail.prediction;
        const predictedType = predictedNumber >= 5 ? 'Tài' : 'Xỉu';
        const betAmount = prediction.bet.amount;
        const betType = prediction.bet.type;
        // Tạo dòng log
        const logLine = `[${timeStr}] - DrawID: ${prediction.drawId} | Dự đoán: ${predictedNumber} (${predictedType}) | Đặt cược: ${betType} | Tiền cược: ${betAmount.toLocaleString('vi-VN')} đ | Trạng thái: Chờ kết quả | Chiến lược: ${prediction.detail.strategy} \n`;
        // Đọc file hiện tại
        let currentContent = '';
        if (fs.existsSync(bettingLogFile)) {
            currentContent = fs.readFileSync(bettingLogFile, 'utf8');
        }
        // Ghi dòng mới vào đầu file
        fs.writeFileSync(bettingLogFile, logLine + currentContent, 'utf8');
        if (log) console.log(`✅ Đã ghi thông tin cược vào betting.txt: DrawID ${prediction.drawId}, Cược ${betType}, ${betAmount.toLocaleString('vi-VN')}đ`);
        return true;
    } catch (error) {
        if (log) console.error(`❌ Lỗi khi ghi thông tin cược: ${error.message}`);
        return false;
    }
}

/**
 * Cập nhật kết quả cược vào file betting.txt
 */
function updateBettingResult(drawId, actualResult, isCorrect, index = 0, log = true, accountInfo = null) {
    // Kiểm tra xem betting có enabled không
    const isBettingEnabled = accountInfo && accountInfo.betting && accountInfo.betting.enabled;
    try {
        const dataDir = path.join(dirname, '..', 'data');
        const bettingLogFile = path.join(dataDir, 'betting.txt');
        // Kiểm tra file tồn tại
        if (!fs.existsSync(bettingLogFile)) {
            if (log) console.log(`❌ Không tìm thấy file betting.txt để cập nhật kết quả`);
            return false;
        }
        // Đọc nội dung file
        const content = fs.readFileSync(bettingLogFile, 'utf8');
        const lines = content.split('\n');
        // Tìm dòng chứa DrawID và "Chờ kết quả"
        let lineIndex = -1;

        // Chuẩn hóa drawId (loại bỏ hậu tố _1, _2, v.v nếu có)
        const normalizedDrawId = drawIdModule.normalizeDrawId(drawId);

        if (log) console.log(`🔍 Đang tìm kết quả cho DrawID ${drawId} (chuẩn hóa: ${normalizedDrawId})`);

        for (let i = 0; i < lines.length; i++) {
            // Kiểm tra cả dạng drawId có và không có hậu tố
            if ((lines[i].includes(`DrawID: ${drawId}`) || lines[i].includes(`DrawID: ${normalizedDrawId}`))
                && lines[i].includes('Trạng thái: Chờ kết quả')) {
                lineIndex = i;
                if (log) console.log(`✅ Tìm thấy dòng cần cập nhật: ${i}`);
                break;
            }
        }
        // Nếu không tìm thấy dòng cần cập nhật, log và return
        if (lineIndex === -1) {
            if (log) console.log(`⚠️ Không tìm thấy dòng nào với DrawID ${drawId} có trạng thái "Chờ kết quả"`);
            return false;
        }

        // Lấy thông tin tiền cược từ dòng
        const betAmountMatch = lines[lineIndex].match(/Tiền cược: ([0-9,.]+)/);
        let betAmount = '0';

        if (betAmountMatch) {
            // Xử lý chuỗi số tiền cược (loại bỏ dấu "." ngăn cách hàng nghìn và "đ")
            betAmount = betAmountMatch[1].replace(/\./g, '').replace(' đ', '');
        }

        // Lấy số thực tế tại vị trí index
        const actualNumberAtIndex = parseInt(actualResult.numbers[index]);
        // Xác định loại thực tế dựa trên số tại vị trí index (0-4: Xỉu, 5-9: Tài)
        const actualTypeAtIndex = actualNumberAtIndex >= 5 ? 'Tài' : 'Xỉu';
        // Cập nhật dòng với kết quả hiện chính xác số tiền thắng/thua
        lines[lineIndex] = lines[lineIndex].replace('Trạng thái: Chờ kết quả',
            `Kết quả: ${actualNumberAtIndex}(${actualTypeAtIndex}) | Kết quả: ${isCorrect ? 'ĐÚNG ✓' : 'SAI ✗'} | ${isCorrect ? '+' : '-'}${betAmount}đ`);
        // Ghi lại file
        fs.writeFileSync(bettingLogFile, lines.join('\n'), 'utf8');
        // Chỉ hiển thị log nếu betting đã được bật
        if (isBettingEnabled && log) {
            console.log(`✅ Đã cập nhật kết quả cược cho DrawID ${drawId}: ${isCorrect ? 'ĐÚNG' : 'SAI'}`);
        }
        return true;
    } catch (error) {
        if (isBettingEnabled && log) console.error(`❌ Lỗi khi cập nhật kết quả cược: ${error.message}`);
        return false;
    }
}

/**
 * Cập nhật tất cả các cược cũ chưa có kết quả
 */
function updateAllPendingBets(history, log = true) {
    try {
        const dataDir = path.join(dirname, '..', 'data');
        const bettingLogFile = path.join(dataDir, 'betting.txt');
        if (!fs.existsSync(bettingLogFile) || !Array.isArray(history) || history.length === 0) {
            return false;
        }
        // Đọc nội dung file
        const content = fs.readFileSync(bettingLogFile, 'utf8');
        const lines = content.split('\n');
        // Tìm tất cả các dòng có "Chờ kết quả"
        let pendingLines = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('Trạng thái: Chờ kết quả')) {
                const drawIdMatch = lines[i].match(/DrawID: ([0-9_]+)/);
                if (drawIdMatch) {
                    pendingLines.push({
                        index: i,
                        drawId: drawIdMatch[1],
                        line: lines[i]
                    });
                }
            }
        }
        if (log) console.log(`🔍 Tìm thấy ${pendingLines.length} cược đang chờ kết quả`);
        let updatedCount = 0;
        for (const pending of pendingLines) {
            // Chuẩn hóa drawId (loại bỏ hậu tố _số)
            const normalizedPendingDrawId = drawIdModule.normalizeDrawId(pending.drawId);

            // Tìm kết quả phù hợp trong history
            let result = history.find(h => {
                const normalizedHistoryDrawId = drawIdModule.normalizeDrawId(h.drawId);
                return normalizedHistoryDrawId === normalizedPendingDrawId || h.drawId === pending.drawId;
            });

            if (result) {
                const betTypeMatch = pending.line.match(/Đặt cược: (Tài|Xỉu)/);
                const betType = betTypeMatch ? betTypeMatch[1] : null;
                const predictionMatch = pending.line.match(/Dự đoán: (\d+) \((Tài|Xỉu)\)/);
                if (!predictionMatch) continue;
                const index = 0;
                const actualNumberAtIndex = parseInt(result.numbers[index]);
                const actualTypeAtIndex = actualNumberAtIndex >= 5 ? 'Tài' : 'Xỉu';
                const isCorrect = betType === actualTypeAtIndex;
                const betAmountMatch = pending.line.match(/Tiền cược: ([0-9,.]+)/);
                let betAmount = '0';

                if (betAmountMatch) {
                    // Xử lý chuỗi số tiền cược (loại bỏ dấu "." ngăn cách hàng nghìn và "đ")
                    betAmount = betAmountMatch[1].replace(/\./g, '').replace(' đ', '');
                }

                lines[pending.index] = pending.line.replace('Trạng thái: Chờ kết quả',
                    `Kết quả: ${actualNumberAtIndex}(${actualTypeAtIndex}) | Kết quả: ${isCorrect ? 'ĐÚNG ✓' : 'SAI ✗'} | ${isCorrect ? '+' : '-'}${betAmount}đ`);
                updatedCount++;
                if (log) console.log(`✅ Đã cập nhật kết quả cho DrawID ${pending.drawId}: ${isCorrect ? 'ĐÚNG' : 'SAI'}`);
            }
        }
        // Ghi lại file nếu có cập nhật
        if (updatedCount > 0) {
            fs.writeFileSync(bettingLogFile, lines.join('\n'), 'utf8');
            if (log) console.log(`✅ Đã cập nhật ${updatedCount} / ${pendingLines.length} cược đang chờ kết quả`);
        } else {
            if (log) console.log(`ℹ️ Không tìm thấy kết quả cho cược nào`);
        }
        return true;
    } catch (error) {
        if (log) console.error(`❌ Lỗi khi cập nhật các cược đang chờ: ${error.message}`);
        return false;
    }
}

module.exports = {
    logPrediction,
    updatePredictionResult,
    logBettingToFile,
    logBettingFromPrediction,
    updateBettingResult,
    updateAllPendingBets
};
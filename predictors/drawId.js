const fs = require('fs');

/**
 * Tính toán drawId tiếp theo dựa trên drawId hiện tại
 */
function calculateNextDrawId(currentDrawId) {
    // Tách phần số từ currentDrawId (giả định format là: số hoặc "D-số")
    let numericPart;
    if (currentDrawId.includes('-')) {
        numericPart = parseInt(currentDrawId.split('-')[1]);
    } else {
        numericPart = parseInt(currentDrawId);
    }

    // Tăng số lên 1
    const nextNumericPart = numericPart + 1;

    // Trả về cùng định dạng với currentDrawId
    if (currentDrawId.includes('-')) {
        return `D-${nextNumericPart}`;
    } else {
        return nextNumericPart.toString();
    }
}

/**
 * Tính toán drawId tiếp theo an toàn, tránh trùng lặp với predictions.json hoặc prediction_log.txt
 */
/**
 * Tính toán drawId tiếp theo an toàn, luôn chỉ tăng 1 đơn vị từ hiện tại
 */
function normalizeDrawId(drawId) {
    if (!drawId) return drawId;
    return drawId.replace(/_\d+$/, '');
}

function calculateSafeNextDrawId(currentDrawId, predictionsFile, historyLogFile) {
    // Chuẩn hóa currentDrawId (loại bỏ hậu tố _1, _2, v.v nếu có)
    currentDrawId = currentDrawId.replace(/_\d+$/, '');
    
    // Lấy số cuối cùng của currentDrawId và tăng lên 1
    const currentNumber = parseInt(currentDrawId.slice(-4));
    let nextNumber = currentNumber + 1;
    
    // Giữ nguyên phần prefix của DrawID
    const prefix = currentDrawId.slice(0, -4);
    
    // Kiểm tra predictions.json hiện tại
    let existingDrawId = null;
    if (predictionsFile && fs.existsSync(predictionsFile)) {
        try {
            const predictions = JSON.parse(fs.readFileSync(predictionsFile, 'utf8'));
            if (predictions && predictions.drawId) {
                existingDrawId = predictions.drawId.replace(/_\d+$/, '');
                const existingNumber = parseInt(existingDrawId.slice(-4));
                
                // Nếu đã có dự đoán cho kỳ tiếp theo hoặc cao hơn, tăng thêm 1
                if (existingNumber >= nextNumber) {
                    console.log(`ℹ️ Phát hiện predictions.json đã có kỳ ${existingDrawId}, tăng nextNumber`);
                    nextNumber = existingNumber + 1;
                }
            }
        } catch (error) {
            console.error(`❌ Lỗi khi đọc predictions.json: ${error.message}`);
        }
    }
    
    // Kiểm tra prediction_log.txt để tránh trùng lặp
    if (historyLogFile && fs.existsSync(historyLogFile)) {
        try {
            const logContent = fs.readFileSync(historyLogFile, 'utf8');
            const logLines = logContent.split('\n');
            
            // Lấy dòng cuối cùng có nội dung
            for (let i = logLines.length - 1; i >= 0; i--) {
                if (logLines[i].trim()) {
                    const match = logLines[i].match(/] - (\d+) -/);
                    if (match && match[1]) {
                        const lastLoggedId = match[1];
                        const lastLoggedNumber = parseInt(lastLoggedId.slice(-4));
                        
                        // Nếu log đã có kỳ tiếp theo hoặc cao hơn, tăng thêm 1
                        if (lastLoggedNumber >= nextNumber) {
                            console.log(`ℹ️ Phát hiện log đã có kỳ ${lastLoggedId}, tăng nextNumber`);
                            nextNumber = lastLoggedNumber + 1;
                        }
                        break;
                    }
                }
            }
        } catch (error) {
            console.error(`❌ Lỗi khi đọc prediction_log.txt: ${error.message}`);
        }
    }
    
    const nextDrawId = prefix + nextNumber.toString().padStart(4, '0');
    console.log(`🔢 Tính toán DrawID tiếp theo: ${currentDrawId} -> ${nextDrawId}`);
    
    return nextDrawId;
}

module.exports = {
    calculateSafeNextDrawId,
    normalizeDrawId
};
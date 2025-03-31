// Đầu file - đảm bảo import fs đúng cách
const fs = require('fs').promises;

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
 * Dự đoán số tiếp theo dựa trên lịch sử
 * @param {Array} history - Mảng lịch sử kết quả (mỗi phần tử có drawId, numbers, drawTime)
 * @param {Number} index - Vị trí cần dự đoán trong mảng numbers (0, 1, 2, ...)
 * @param {Number} limit - Giới hạn số lượng kết quả gần nhất để phân tích
 * @param {Array} fileConfig - [Tên file performance, true/false để lưu performance]
 * @param {Boolean} log - Bật/tắt hiển thị log chi tiết
 * @returns {Promise<Object>} - Kết quả dự đoán và thống kê
 */
async function predictNumbers(history, index = 0, limit = 25, fileConfig = ["taixiu_performance", true], log = false) {
    // Đặt biến toàn cục để tất cả các hàm con đều có thể tham chiếu
    ENABLE_LOGGING = log;
    
    try {
        // Hàm helper để log khi cần
        const logInfo = (message) => {
            if (log) console.log(message);
        };
        
        // Đảm bảo history là mảng và có dữ liệu
        if (!Array.isArray(history) || history.length === 0) {
            throw new Error("Lịch sử không hợp lệ");
        }

        // Chuyển đổi index thành mảng indices để tương thích với code cũ
        const indices = [index];
        
        gameLog.info(`Dự đoán cho vị trí số ${index} trong mảng numbers`);
        
        // LẤY DỮ LIỆU TỪ ĐẦU MẢNG (phần tử 0 là mới nhất)
        const limitedHistory = history.slice(0, Math.min(limit, history.length));
        
        // Lấy phần tử mới nhất (đầu mảng)
        const currentDrawId = history[0]?.drawId ? String(history[0].drawId) : "N/A";
        
        // THIẾT LẬP TÊN FILE CHÍNH XÁC - KHÔNG THÊM .TXT
        const performanceFile = fileConfig[0] + ".performance";
        const predictionFile = fileConfig[0] + ".prediction";
        
        gameLog.info(`---------- BẮT ĐẦU PHIÊN DỰ ĐOÁN MỚI ----------`);
        gameLog.info(`File hiệu suất: ${performanceFile}`);
        gameLog.info(`File dự đoán: ${predictionFile}`);
        gameLog.info(`ID chu kỳ hiện tại: ${currentDrawId}`);
        gameLog.info(`Phân tích ${limitedHistory.length} kết quả gần nhất.`);
        
        // === PHẦN 1: Ghi log hiệu suất cho dự đoán trước đó nếu có ===
        let lastPrediction = null;
        let performanceData = [];
        
        if (fileConfig && fileConfig[1]) {
            try {
                // Đọc dự đoán trước (nếu có) - sử dụng try/catch trực tiếp
                try {
                    const predictionData = await fs.readFile(predictionFile, 'utf8');
                    lastPrediction = JSON.parse(predictionData);
                    gameLog.info(`Đọc được dự đoán trước đó: ${JSON.stringify(lastPrediction.predictions)}`);
                } catch (readError) {
                    gameLog.info(`Không tìm thấy file dự đoán hoặc lỗi: ${readError.message}`);
                }
                
                // Ghi log hiệu suất nếu có dự đoán trước và có lịch sử
                if (history.length > 0 && lastPrediction && lastPrediction.predictions) {
                    // Lấy kết quả từ phần tử mới nhất (index chỉ định)
                    const latestResult = history[0].numbers[index];
                    if (latestResult === undefined) {
                        gameLog.error(`Không tìm thấy kết quả tại vị trí ${index} trong mảng numbers`);
                    } else {
                        const previousPrediction = lastPrediction.predictions[0];
                        
                        // Định dạng thời gian VN HIỆN TẠI (không phụ thuộc vào chu kỳ)
                        const vnCurrentTime = getVietnamTimeNow(log);
                        
                        // Xác định Tài/Xỉu cho kết quả thực tế
                        const resultType = latestResult >= 5 ? "Tài" : "Xỉu";
                        
                        // Xác định Tài/Xỉu cho dự đoán
                        const predictionType = previousPrediction >= 5 ? "Tài" : "Xỉu";
                        
                        // Kiểm tra dự đoán đúng loại (Tài/Xỉu) hay không
                        const isCorrectType = (latestResult >= 5 && previousPrediction >= 5) || (latestResult < 5 && previousPrediction < 5);
                        const correctStr = isCorrectType ? "Đúng" : "Sai";
                        
                        // ĐỊNH DẠNG LOG MỚI SỬ DỤNG DẤU GẠCH | VÀ THÊM VỊ TRÍ INDEX
                        const performanceLog = `Chu kỳ | ${currentDrawId} | ${vnCurrentTime} | Số thực tế: ${latestResult} (${resultType}) | Số dự đoán: ${previousPrediction} (${predictionType}) | Vị trí: ${index} | ${correctStr}\n`;
                        gameLog.info(`GHI LOG MỚI: ${performanceLog.trim()}`);
                        
                        // TẠO FILE TRƯỚC KHI GHI NẾU KHÔNG TỒN TẠI
                        try {
                            // Kiểm tra file có tồn tại
                            await fs.access(performanceFile).catch(async () => {
                                // Nếu không, tạo file trống
                                await fs.writeFile(performanceFile, "");
                                gameLog.info(`Đã tạo file ${performanceFile} mới`);
                            });
                            
                            // Sau đó GHI THÊM (APPEND) log vào file
                            await fs.appendFile(performanceFile, performanceLog);
                            gameLog.info(`Đã ghi log hiệu suất thành công`);
                        } catch (error) {
                            gameLog.error(`LỖI KHI GHI LOG: ${error.message}`);
                        }
                    }
                }
                
                // Đọc toàn bộ lịch sử hiệu suất
                try {
                    const perfFileContent = await fs.readFile(performanceFile, 'utf8');
                    performanceData = perfFileContent.split('\n').filter(line => line.trim().length > 0);
                    gameLog.info(`Đọc được ${performanceData.length} dòng dữ liệu hiệu suất`);
                } catch (error) {
                    gameLog.info(`Không đọc được file hiệu suất: ${error.message}`);
                }
            } catch (error) {
                gameLog.info(`Không đọc được dự đoán trước đó: ${error.message}`);
            }
        }
        
        // === PHẦN 2: THUẬT TOÁN DỰ ĐOÁN NÂNG CAO ===
        
        // Phân tích dữ liệu cơ bản
        const stats = analyzeTaiXiu(limitedHistory, indices);
        gameLog.info(`Kết quả phân tích cơ bản: Tài ${stats.taiPercent}%, Xỉu ${stats.xiuPercent}%`);
        
        // Kiểm tra lượng dữ liệu hiệu suất
        const hasEnoughPerformanceData = performanceData && performanceData.length >= 10;
        gameLog.info(`Dữ liệu hiệu suất: ${performanceData ? performanceData.length : 0} dòng (${hasEnoughPerformanceData ? 'đủ' : 'chưa đủ'} cho phân tích nâng cao)`);
        
        // Hệ thống chiến lược và bỏ phiếu
        const strategies = [];
        const votes = { tài: 0, xỉu: 0 };
        
        // THÊM PHÂN TÍCH LỊCH SỬ - ĐẶT NGAY SAU KHI ĐỌC PERFORMANCEDATA
        if (performanceData && performanceData.length >= 10) {
            const historyAnalysis = analyzeHistory(performanceData);
            if (historyAnalysis && historyAnalysis.type) {
                // Tăng trọng số lên gấp đôi để ưu tiên kết quả phân tích lịch sử
                votes[historyAnalysis.type] += historyAnalysis.weight * 2;
                strategies.push(historyAnalysis.description);
                gameLog.info(`Áp dụng phân tích lịch sử: ${historyAnalysis.description} (${historyAnalysis.weight * 2} phiếu)`);
            }
        }
        
        // === 1. CHIẾN LƯỢC PHÂN TÍCH TẦN SUẤT ===
        // Luôn thực hiện vì chỉ cần history
        const frequencyVote = analyzeFrequency(limitedHistory, indices);
        if (frequencyVote) {
            votes[frequencyVote.type] += frequencyVote.weight;
            strategies.push(`Phân tích tần suất: ${frequencyVote.description} (${frequencyVote.weight} phiếu)`);
        }
        
        // === 2. CHIẾN LƯỢC PHÂN TÍCH XU HƯỚNG GẦN ĐÂY ===
        // Luôn thực hiện vì chỉ cần history
        const trendVote = analyzeTrend(limitedHistory, indices);
        if (trendVote) {
            votes[trendVote.type] += trendVote.weight;
            strategies.push(`Phân tích xu hướng: ${trendVote.description} (${trendVote.weight} phiếu)`);
        }
        
        // === 3. CHIẾN LƯỢC PHÂN TÍCH CHU KỲ ===
        // Luôn thực hiện vì chỉ cần history
        const cycleVote = analyzeCycle(limitedHistory, indices);
        if (cycleVote) {
            votes[cycleVote.type] += cycleVote.weight;
            strategies.push(`Phân tích chu kỳ: ${cycleVote.description} (${cycleVote.weight} phiếu)`);
        }
        
        // === PHẦN MỚI: XỬ LÝ KHI KHÔNG ĐỦ DỮ LIỆU HIỆU SUẤT ===
        // Nếu không đủ dữ liệu hiệu suất, tăng trọng số cho các chiến lược dựa trên history
        if (!hasEnoughPerformanceData) {
            // Tăng trọng số của các chiến lược dựa trên history
            if (frequencyVote) votes[frequencyVote.type] += 2;
            if (trendVote) votes[trendVote.type] += 2;
            if (cycleVote) votes[cycleVote.type] += 2;
            
            // Thêm chiến lược dựa trên mẫu gần đây nhất
            if (limitedHistory.length > 0) {
                const recentValues = [];
                
                // Lấy 5 giá trị gần nhất
                for (let i = 0; i < Math.min(5, limitedHistory.length); i++) {
                    if (limitedHistory[i].numbers && Array.isArray(limitedHistory[i].numbers) && 
                        index < limitedHistory[i].numbers.length) {
                        const num = Number(limitedHistory[i].numbers[index]);
                        if (!isNaN(num)) {
                            recentValues.push(num >= 5 ? "tài" : "xỉu");
                        }
                    }
                }
                
                // Nếu có ít nhất 3 giá trị gần đây
                if (recentValues.length >= 3) {
                    // Đếm số lần xuất hiện của Tài và Xỉu
                    const recentTai = recentValues.filter(v => v === "tài").length;
                    const recentXiu = recentValues.filter(v => v === "xỉu").length;
                    
                    // Chiến lược 1: Theo xu hướng nếu áp đảo
                    if (recentTai >= recentXiu * 2) {
                        votes["tài"] += 3;
                        strategies.push(`Xu hướng ngắn hạn: Tài đang chiếm ưu thế (${recentTai}/${recentValues.length}) (3 phiếu)`);
                    } else if (recentXiu >= recentTai * 2) {
                        votes["xỉu"] += 3;
                        strategies.push(`Xu hướng ngắn hạn: Xỉu đang chiếm ưu thế (${recentXiu}/${recentValues.length}) (3 phiếu)`);
                    }
                    
                    // Chiến lược 2: Đảo ngược nếu liên tiếp
                    if (recentValues[0] === recentValues[1] && recentValues[1] === recentValues[2]) {
                        const opposite = recentValues[0] === "tài" ? "xỉu" : "tài";
                        votes[opposite] += 4;
                        strategies.push(`Đảo chiều sau chuỗi ${recentValues[0]} liên tiếp (4 phiếu)`);
                    }
                }
                
                // Chiến lược 3: Chọn ngược với kết quả gần nhất
                if (recentValues.length > 0) {
                    const opposite = recentValues[0] === "tài" ? "xỉu" : "tài";
                    votes[opposite] += 2;
                    strategies.push(`Dự đoán ngược với kết quả gần nhất (${recentValues[0]}) (2 phiếu)`);
                }
            }
            
            // Thông báo về việc sử dụng chiến lược thay thế
            gameLog.info("Sử dụng chiến lược thay thế do chưa đủ dữ liệu hiệu suất");
        } else {
            // Nếu có đủ dữ liệu hiệu suất, thực hiện các chiến lược phụ thuộc vào nó
            // === 4. CHIẾN LƯỢC ĐẢO NGƯỢC ===
            const inverseVote = analyzeInverseStrategy(limitedHistory, indices, performanceData);
            if (inverseVote) {
                votes[inverseVote.type] += inverseVote.weight;
                strategies.push(`Chiến lược đảo ngược: ${inverseVote.description} (${inverseVote.weight} phiếu)`);
            }
            
            // === 6. PHÂN TÍCH HIỆU SUẤT BỎ PHIẾU ===
            const performanceVote = analyzePerformance(performanceData);
            if (performanceVote) {
                votes[performanceVote.type] += performanceVote.weight;
                strategies.push(`Phân tích hiệu suất: ${performanceVote.description} (${performanceVote.weight} phiếu)`);
            }
        }
        
        // === CHIẾN LƯỢC MỚI: TỰ HỌC TỪ HIỆU SUẤT ===
        if (hasEnoughPerformanceData) {
            // Thêm chiến lược tự học mới
            const learningVote = learnFromPerformance(performanceData, limitedHistory, index, log);
            if (learningVote) {
                votes[learningVote.type] += learningVote.weight;
                strategies.push(`Tự học: ${learningVote.description} (${learningVote.weight} phiếu)`);
            }
            
            // Thêm chiến lược điều chỉnh thiên lệch
            const biasVote = detectAndCorrectBias(performanceData, log);
            if (biasVote) {
                votes[biasVote.type] += biasVote.weight;
                strategies.push(`Điều chỉnh: ${biasVote.description} (${biasVote.weight} phiếu)`);
            }
            
            // THÊM ĐOẠN CODE MỚI VÀO ĐÂY:
            // === CHIẾN LƯỢC MỚI: PHÂN TÍCH BỆT VÀ BẺ ===
            const streakVote = analyzeStreakAndReversal(performanceData);
            if (streakVote) {
                // Tăng ưu tiên cho chiến lược theo bệt
                votes[streakVote.type] += streakVote.weight * 2; // Nhân đôi trọng số
                strategies.push(`${streakVote.description} (${streakVote.weight * 2} phiếu)`);
                
                // Ghi đè các chiến lược khác nếu phát hiện bệt mạnh
                if (streakVote.weight >= 15) {
                    // Reset các vote khác
                    votes.tài = 0;
                    votes.xỉu = 0;
                    // Chỉ giữ lại vote theo bệt
                    votes[streakVote.type] = streakVote.weight * 3;
                    strategies.length = 0; // Xóa các chiến lược cũ
                    strategies.push(`THEO BỆT ƯU TIÊN CAO: ${streakVote.description} (${streakVote.weight * 3} phiếu)`);
                }
            }
        }
        
        // === 5. PHÂN TÍCH THEO THỜI GIAN ===
        // Luôn thực hiện vì chỉ cần drawId
        const timeVote = analyzeTimePatterns(currentDrawId);
        if (timeVote) {
            votes[timeVote.type] += timeVote.weight;
            strategies.push(`Phân tích thời gian: ${timeVote.description} (${timeVote.weight} phiếu)`);
        }
        
        // === PHẦN ĐIỀU CHỈNH CÂN BẰNG DỰ ĐOÁN ===
        // Thêm đoạn code này trước khi quyết định dự đoán cuối cùng

        // Tổng hợp kết quả bỏ phiếu
        gameLog.info(`Kết quả bỏ phiếu ban đầu: Tài ${votes.tài} phiếu, Xỉu ${votes.xỉu} phiếu`);

        // KIỂM TRA VÀ CÂN BẰNG DỰ ĐOÁN
        // Phân tích tỷ lệ Tài/Xỉu trong lịch sử hiệu suất gần đây
        let recentTaiCount = 0;
        let recentXiuCount = 0;
        let recentTaiPredictions = 0;
        let recentXiuPredictions = 0;

        // Lấy 15 kết quả gần nhất từ file hiệu suất
        const recentPerformance = performanceData.slice(-Math.min(15, performanceData.length));
    for (const line of recentPerformance) {
            if (line.includes("Số thực tế:") && line.includes("Số dự đoán:")) {
                // Đếm kết quả thực tế
                if (line.includes("Số thực tế:") && line.includes("(Tài)")) {
                    recentTaiCount++;
                } else if (line.includes("Số thực tế:") && line.includes("(Xỉu)")) {
                    recentXiuCount++;
                }
                
                // Đếm dự đoán
                if (line.includes("Số dự đoán:") && line.includes("(Tài)")) {
                    recentTaiPredictions++;
                } else if (line.includes("Số dự đoán:") && line.includes("(Xỉu)")) {
                    recentXiuPredictions++;
                }
            }
        }

        gameLog.info(`Phân tích 15 kết quả gần đây:`);
        gameLog.info(`- Kết quả thực tế: Tài ${recentTaiCount}, Xỉu ${recentXiuCount}`);
        gameLog.info(`- Dự đoán: Tài ${recentTaiPredictions}, Xỉu ${recentXiuPredictions}`);

        // Điều chỉnh trọng số nếu dự đoán quá thiên về một bên
        const predictionRatio = recentXiuPredictions / (recentTaiPredictions + recentXiuPredictions || 1);
        if (predictionRatio > 0.65) { // Nếu dự đoán Xỉu > 65%
            // Tăng điểm cho Tài để cân bằng
            const balancingPoints = Math.ceil((predictionRatio - 0.5) * 10);
            votes.tài += balancingPoints;
            strategies.push(`Cân bằng dự đoán: +${balancingPoints} cho Tài do dự đoán Xỉu quá nhiều (${(predictionRatio * 100).toFixed(0)}%)`);
            gameLog.info(`Điều chỉnh cân bằng: +${balancingPoints} điểm cho Tài`);
        } else if (predictionRatio < 0.35) { // Nếu dự đoán Tài > 65%
            // Tăng điểm cho Xỉu để cân bằng
            const balancingPoints = Math.ceil((0.5 - predictionRatio) * 10);
            votes.xỉu += balancingPoints;
            strategies.push(`Cân bằng dự đoán: +${balancingPoints} cho Xỉu do dự đoán Tài quá nhiều (${((1 - predictionRatio) * 100).toFixed(0)}%)`);
            gameLog.info(`Điều chỉnh cân bằng: +${balancingPoints} điểm cho Xỉu`);
        }

        // ĐIỀU CHỈNH THÊM DỰA TRÊN KẾT QUẢ THỰC TẾ
        const actualRatio = recentTaiCount / (recentTaiCount + recentXiuCount || 1);
        if (actualRatio > 0.6) { // Nếu thực tế Tài xuất hiện > 60%
            // Tăng điểm cho Tài vì xu hướng rõ ràng
            votes.tài += 2;
            strategies.push(`Xu hướng thực tế: +2 cho Tài do Tài xuất hiện nhiều (${(actualRatio * 100).toFixed(0)}%)`);
            gameLog.info(`Điều chỉnh theo xu hướng: +2 điểm cho Tài`);
        } else if (actualRatio < 0.4) { // Nếu thực tế Xỉu xuất hiện > 60%
            // Tăng điểm cho Xỉu vì xu hướng rõ ràng
            votes.xỉu += 2;
            strategies.push(`Xu hướng thực tế: +2 cho Xỉu do Xỉu xuất hiện nhiều (${((1 - actualRatio) * 100).toFixed(0)}%)`);
            gameLog.info(`Điều chỉnh theo xu hướng: +2 điểm cho Xỉu`);
        }

        // Tổng hợp kết quả bỏ phiếu sau khi cân bằng
        gameLog.info(`Kết quả bỏ phiếu sau điều chỉnh: Tài ${votes.tài} phiếu, Xỉu ${votes.xỉu} phiếu`);
        strategies.forEach(strategy => gameLog.info(strategy));

        // ===== GIẢI PHÁP KHẨN CẤP CHỐNG THIÊN VỊ =====
        // Thêm đoạn code này ngay trước khi quyết định dự đoán cuối cùng

        // 1. PHÂN TÍCH TỶ LỆ DỰ ĐOÁN TRONG LOG
        let taiPredictions = 0;
        let xiuPredictions = 0;

        // Đếm tỷ lệ Tài/Xỉu trong TẤT CẢ các dự đoán trước đó
        for (const line of performanceData) {
            if (line.includes("Số dự đoán:")) {
                if (line.includes("(Tài)")) {
                    taiPredictions++;
                } else if (line.includes("(Xỉu)")) {
                    xiuPredictions++;
                }
            }
        }

        const totalPredictions = taiPredictions + xiuPredictions;
        const taiPredictionRatio = totalPredictions > 0 ? taiPredictions / totalPredictions : 0.5;
        gameLog.info(`Phân tích ${totalPredictions} dự đoán: Tài ${taiPredictions} (${(taiPredictionRatio * 100).toFixed(0)}%), Xỉu ${xiuPredictions} (${((1 - taiPredictionRatio) * 100).toFixed(0)}%)`);

        // 2. ÁP DỤNG BIỆN PHÁP KHẨN CẤP
        let emergencyBalancing = false;

        // Nếu tỷ lệ Tài < 45% hoặc Xỉu < 45%, áp dụng biện pháp khẩn cấp
        if (false && taiPredictionRatio < 0.45) {  // Thêm "false &&" để vô hiệu hóa
            // THIÊN VỊ XỈU QUÁ NHIỀU - BẮT BUỘC DỰ ĐOÁN TÀI
            gameLog.info(`CẢNH BÁO: Phát hiện thiên vị Xỉu nghiêm trọng (${((1 - taiPredictionRatio) * 100).toFixed(0)}%)!`);
            gameLog.info(`Áp dụng biện pháp khẩn cấp: BẮT BUỘC dự đoán TÀI`);
            
            // Ghi đè các phiếu bầu
            votes.tài = 999;
            votes.xỉu = 0;
            emergencyBalancing = true;
            strategies.push(`KHẨN CẤP: Bắt buộc chọn TÀI do phát hiện thiên vị Xỉu (${((1 - taiPredictionRatio) * 100).toFixed(0)}%)`);
        } else if (false && (1 - taiPredictionRatio) < 0.45) {  // Thêm "false &&" để vô hiệu hóa
            // THIÊN VỊ TÀI QUÁ NHIỀU - BẮT BUỘC DỰ ĐOÁN XỈU
            gameLog.info(`CẢNH BÁO: Phát hiện thiên vị Tài nghiêm trọng (${(taiPredictionRatio * 100).toFixed(0)}%)!`);
            gameLog.info(`Áp dụng biện pháp khẩn cấp: BẮT BUỘC dự đoán XỈU`);
            
            // Ghi đè các phiếu bầu
            votes.tài = 0;
            votes.xỉu = 999;
            emergencyBalancing = true;
            strategies.push(`KHẨN CẤP: Bắt buộc chọn XỈU do phát hiện thiên vị Tài (${(taiPredictionRatio * 100).toFixed(0)}%)`);
        }

        // 3. ĐIỀU CHỈNH CHO 5 DỰ ĐOÁN GẦN NHẤT
        if (!emergencyBalancing && totalPredictions >= 5) {
            // Kiểm tra 5 dự đoán gần nhất
            const recent5 = performanceData.slice(-5);
            let recentTai = 0;
            let recentXiu = 0;
            
            for (const line of recent5) {
                if (line.includes("Số dự đoán:")) {
                    if (line.includes("(Tài)")) {
                        recentTai++;
                    } else if (line.includes("(Xỉu)")) {
                        recentXiu++;
                    }
                }
            }
            
            // Nếu 5 dự đoán gần nhất thiên lệch nhiều về một bên
            if (recentTai >= 4 && recentXiu === 0) {
                gameLog.info(`CẢNH BÁO: ${recentTai}/5 dự đoán gần nhất đều là TÀI!`);
                gameLog.info(`Áp dụng biện pháp chống lặp: Tăng trọng số cho XỈU`);
                votes.xỉu = votes.xỉu + 15; // Tăng từ 10 lên 15
                strategies.push(`Chống lặp: +15 cho Xỉu do ${recentTai}/5 dự đoán gần nhất đều là Tài`);
            } else if (recentXiu >= 4 && recentTai === 0) {
                gameLog.info(`CẢNH BÁO: ${recentXiu}/5 dự đoán gần nhất đều là XỈU!`);
                gameLog.info(`Áp dụng biện pháp chống lặp: Tăng trọng số cho TÀI`);
                votes.tài = votes.tài + 15; // Tăng từ 10 lên 15
                strategies.push(`Chống lặp: +15 cho Tài do ${recentXiu}/5 dự đoán gần nhất đều là Xỉu`);
            }
        }

        // 4. THÊM YẾU TỐ NGẪU NHIÊN NẾU CẦN
        if (!emergencyBalancing) {
            // Thêm yếu tố ngẫu nhiên để tránh bị mắc kẹt vào mẫu
            // 20% cơ hội đảo ngược phiếu bầu khi không trong trường hợp khẩn cấp
            if (Math.random() < 0.2) { // Giảm từ 0.3 xuống 0.2
                const tmp = votes.tài;
                votes.tài = votes.xỉu;
                votes.xỉu = tmp;
                strategies.push(`Yếu tố ngẫu nhiên: Đảo ngược phiếu bầu (20% cơ hội)`);
                gameLog.info(`Áp dụng yếu tố ngẫu nhiên: Đảo ngược phiếu bầu Tài<->Xỉu`);
            }
        }

        // ===== BIỆN PHÁP KHẨN CẤP BỔ SUNG =====
        // Thêm đoạn này sau cơ chế khẩn cấp hiện tại, khoảng dòng 505

        // Kiểm tra dự đoán gần nhất để tránh lặp
        if (!emergencyBalancing) {
            // Lấy 3 dự đoán gần nhất
            const recent3 = performanceData.slice(-3);
            
            // Kiểm tra xem 3 dự đoán gần nhất có cùng loại không
            let allSameType = true;
            let recentType = null;
            
            for (const line of recent3) {
                if (line.includes("Số dự đoán:")) {
                    const currentType = line.includes("(Tài)") ? "tài" : "xỉu";
                    
                    if (recentType === null) {
                        recentType = currentType;
                    } else if (recentType !== currentType) {
                        allSameType = false;
                        break;
                    }
                }
            }
            
            // Nếu 3 dự đoán gần nhất cùng loại, bắt buộc đổi loại
            if (allSameType && recentType) {
                const oppositeType = recentType === "tài" ? "xỉu" : "tài";
                gameLog.info(`CẢNH BÁO: 3 dự đoán gần nhất đều là ${recentType.toUpperCase()}!`);
                gameLog.info(`Biện pháp chống lặp bổ sung: Tự động đổi sang ${oppositeType.toUpperCase()}`);
                
                // Tăng mạnh điểm cho loại ngược lại
                if (oppositeType === "tài") {
                    votes.tài += 15;  // Điểm cao để ghi đè các chiến lược khác
                } else {
                    votes.xỉu += 15;
                }
                
                strategies.push(`Chống lặp bổ sung: +15 cho ${oppositeType} do 3 dự đoán gần nhất đều là ${recentType}`);
            }
        }

        // Tổng hợp kết quả bỏ phiếu sau khi can thiệp
        gameLog.info(`Kết quả bỏ phiếu sau can thiệp: Tài ${votes.tài} phiếu, Xỉu ${votes.xỉu} phiếu`);

        // Chọn loại dự đoán dựa vào kết quả phiếu bầu sau can thiệp
        let predictedType;
        if (votes.tài > votes.xỉu) {
            predictedType = "tài";
        } else if (votes.xỉu > votes.tài) {
            predictedType = "xỉu";
        } else {
            // Nếu hòa, chọn ngẫu nhiên
            predictedType = Math.random() < 0.5 ? "tài" : "xỉu";
        }

        // Chọn số trong khoảng phù hợp với đa dạng hóa
        let prediction;
        if (predictedType === "tài") {
            // Chọn số Tài (5-9) với sự đa dạng
            const taiNumbers = [5, 6, 7, 8, 9];
            const recentTaiPredictions = new Set();
            
            // Tìm các số Tài đã dự đoán gần đây
            for (const line of performanceData.slice(-5)) {
                const match = line.match(/Số dự đoán: ([5-9]) \(Tài\)/);
                if (match) {
                    recentTaiPredictions.add(parseInt(match[1]));
                }
            }
            
            // Ưu tiên số chưa được dự đoán gần đây
            const availableTaiNumbers = taiNumbers.filter(n => !recentTaiPredictions.has(n));
            
            if (availableTaiNumbers.length > 0) {
                // Chọn ngẫu nhiên từ các số chưa dự đoán gần đây
                prediction = availableTaiNumbers[Math.floor(Math.random() * availableTaiNumbers.length)];
            } else {
                // Nếu đã dự đoán tất cả các số, chọn ngẫu nhiên
                prediction = taiNumbers[Math.floor(Math.random() * taiNumbers.length)];
            }
            gameLog.info(`Dự đoán: TÀI - Số ${prediction}`);
        } else {
            // Chọn số Xỉu (0-4) với sự đa dạng
            const xiuNumbers = [0, 1, 2, 3, 4];
            const recentXiuPredictions = new Set();
            
            // Tìm các số Xỉu đã dự đoán gần đây
            for (const line of performanceData.slice(-5)) {
                const match = line.match(/Số dự đoán: ([0-4]) \(Xỉu\)/);
                if (match) {
                    recentXiuPredictions.add(parseInt(match[1]));
                }
            }
            
            // Ưu tiên số chưa được dự đoán gần đây
            const availableXiuNumbers = xiuNumbers.filter(n => !recentXiuPredictions.has(n));
            
            if (availableXiuNumbers.length > 0) {
                // Chọn ngẫu nhiên từ các số chưa dự đoán gần đây
                prediction = availableXiuNumbers[Math.floor(Math.random() * availableXiuNumbers.length)];
            } else {
                // Nếu đã dự đoán tất cả các số, chọn ngẫu nhiên
                prediction = xiuNumbers[Math.floor(Math.random() * xiuNumbers.length)];
            }
            gameLog.info(`Dự đoán: XỈU - Số ${prediction}`);
        }

        // === PHẦN 4: LƯU DỰ ĐOÁN VÀO FILE ===
        if (fileConfig && fileConfig[1]) {
            // Tạo đối tượng dự đoán
            const predictionObject = {
                predictions: [prediction],
                stats,
                timestamp: new Date().toISOString(),
                drawId: currentDrawId,
                votes: votes,
                strategies: strategies,
                indexPredicted: index
            };
            
            // GHI DỰ ĐOÁN
            try {
                // Chuyển đổi thành chuỗi JSON và lưu
                const predictionJSON = JSON.stringify(predictionObject, null, 2);
                await fs.writeFile(predictionFile, predictionJSON);
                gameLog.info(`ĐÃ LƯU DỰ ĐOÁN: ${prediction} vào ${predictionFile}`);
            } catch (error) {
                gameLog.error(`LỖI KHI LƯU DỰ ĐOÁN: ${error.message}`);
            }
        }
        
        gameLog.info(`---------- KẾT THÚC PHIÊN DỰ ĐOÁN ----------`);
        
        // Thêm yếu tố ngẫu nhiên bổ sung
        const randomFactor = Math.random();
        if (randomFactor < 0.2) {  // 20% cơ hội
            const randomChoice = Math.random() < 0.5 ? "tài" : "xỉu";
            votes[randomChoice] += 5;
            strategies.push(`Yếu tố ngẫu nhiên bổ sung: +5 cho ${randomChoice} (20% cơ hội)`);
            gameLog.info(`Thêm yếu tố ngẫu nhiên: +5 cho ${randomChoice}`);
        }
        
        // Thêm biện pháp chống lặp 3 dự đoán liên tiếp
        const recentPredictions = [];
        for (const line of performanceData.slice(-3)) {
            const match = line.match(/Số dự đoán: (\d+) \((Tài|Xỉu)\)/);
            if (match) {
                recentPredictions.push(match[2]); // "Tài" hoặc "Xỉu"
            }
        }

        if (recentPredictions.length === 3 && 
            recentPredictions[0] === recentPredictions[1] && 
            recentPredictions[1] === recentPredictions[2]) {
            
            const oppositeType = recentPredictions[0] === "Tài" ? "xỉu" : "tài";
            gameLog.info(`CHỐNG LẶP: Phát hiện ${recentPredictions[0]} 3 lần liên tiếp, buộc chọn ${oppositeType}`);
            
            votes[oppositeType] += 20; // Tăng điểm mạnh nhưng không ghi đè hoàn toàn
            strategies.push(`CHỐNG LẶP: +20 cho ${oppositeType} do phát hiện 3 dự đoán ${recentPredictions[0]} liên tiếp`);
        }
        
        // Trả về kết quả cuối cùng
        return {
            predictions: [prediction],
            stats,
            drawId: currentDrawId,
            votes: votes,
            strategies: strategies,
            indexPredicted: index,
            message: "Đã dự đoán thành công"
        };
    } catch (error) {
        gameLog.error(`LỖI NGHIÊM TRỌNG: ${error.message}, ${error.stack}`);
        return {
            predictions: [0],
            stats: { tai: 0, xiu: 0, taiPercent: 0, xiuPercent: 0 },
            error: error.message
        };
    }
}

// Hàm phân tích giá trị
function analyzeTaiXiu(history, indices) {
    // Sửa lại để phân tích kết quả THỰC TẾ từ lịch sử
    // Kiểm tra xem history có phải là mảng các object hay mảng chuỗi
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
    
    // Nếu không tìm được kết quả nào, trả về kết quả mặc định
    if (processedResults.length === 0) {
        return { tai: 0, xiu: 0, taiPercent: 50, xiuPercent: 50 };
    }
    
    // Đếm số lượng Tài và Xỉu từ kết quả đã xử lý
    const taiCount = processedResults.filter(r => r.type === "Tài").length;
    const xiuCount = processedResults.filter(r => r.type === "Xỉu").length;

    const total = taiCount + xiuCount;
    const taiPercent = total > 0 ? ((taiCount / total) * 100).toFixed(2) : 50;
    const xiuPercent = total > 0 ? ((xiuCount / total) * 100).toFixed(2) : 50;
    
    return { 
        tai: taiCount, 
        xiu: xiuCount, 
        taiPercent, 
        xiuPercent,
        // Thêm thông tin dự đoán dựa trên xu hướng thực tế
        prediction: taiCount > xiuCount ? "Tài" : "Xỉu",
        confidence: Math.abs(taiCount - xiuCount) / (taiCount + xiuCount) * 0.5 + 0.5
    };
}

// Hàm lấy thời gian hiện tại Việt Nam (UTC+7) - SỬA LẠI
function getVietnamTimeNow(log = false) {
    // Lấy thời gian hiện tại theo UTC
    const now = new Date();
    
    // Tạo thời gian Việt Nam (UTC+7) theo cách chính xác hơn
    // Lấy giờ UTC
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
        // Tạo đối tượng Date mới cho ngày tiếp theo
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
    
    // DEBUG - in ra thông tin để kiểm tra
    if (log) gameLog.debug(`Giờ UTC: ${utcHours}:${utcMinutes}:${utcSeconds}`);
    if (log) gameLog.debug(`Giờ VN: ${vnHours}:${utcMinutes}:${utcSeconds} ${ampm}`);
    
    // Trả về chuỗi định dạng đầy đủ
    return `${dateStr} ${timeStr}`;
}

// ==== CÁC HÀM PHÂN TÍCH CHIẾN LƯỢC ====

// 1. Phân tích tần suất xuất hiện số
function analyzeFrequency(history, indices) {
    if (!history || history.length < 5) return null;
    
    // Đếm số lần xuất hiện của mỗi số
    const counts = Array(10).fill(0);
    const recentItems = history.slice(0, 20); // Chỉ xét 20 kết quả gần nhất
    
    for (const item of recentItems) {
        if (!item.numbers || !Array.isArray(item.numbers)) continue;
        
        for (const index of indices) {
            if (index >= item.numbers.length) continue;
            
            const num = Number(item.numbers[index]);
            if (isNaN(num) || num < 0 || num > 9) continue;
            
            counts[num]++;
        }
    }
    
    // Tìm số xuất hiện nhiều nhất và ít nhất
    let maxCount = 0, minCount = Infinity;
    let mostFrequent = -1, leastFrequent = -1;
    
    for (let i = 0; i < counts.length; i++) {
        if (counts[i] > maxCount) {
            maxCount = counts[i];
            mostFrequent = i;
        }
        if (counts[i] < minCount && counts[i] > 0) {
            minCount = counts[i];
            leastFrequent = i;
        }
    }
    
    // Tính tổng số Tài và Xỉu
    let taiCount = 0, xiuCount = 0;
    for (let i = 0; i < counts.length; i++) {
        if (i >= 5) taiCount += counts[i];
        else xiuCount += counts[i];
    }
    
    // Chiến lược 1: Số ít xuất hiện có xu hướng sẽ xuất hiện
    const leastFrequentType = leastFrequent >= 5 ? "tài" : "xỉu";
    
    // Chiến lược 2: Loại (Tài/Xỉu) ít xuất hiện có xu hướng sẽ xuất hiện
    const lessFrequentType = taiCount < xiuCount ? "tài" : "xỉu";
    
    // Kết hợp cả 2 chiến lược và quyết định cuối cùng
    if (leastFrequentType === lessFrequentType) {
        return {
            type: leastFrequentType,
            weight: 3,
            description: `Chọn ${leastFrequentType} do xuất hiện ít hơn (Tài:${taiCount}, Xỉu:${xiuCount})`
        };
    } else {
        // Nếu 2 chiến lược mâu thuẫn, chọn chiến lược "loại ít xuất hiện"
        return {
            type: lessFrequentType,
            weight: 2,
            description: `Chọn ${lessFrequentType} do tỷ lệ xuất hiện thấp hơn (Tài:${taiCount}, Xỉu:${xiuCount})`
        };
    }
}

// 2. Phân tích xu hướng gần đây
function analyzeTrend(history, indices) {
    if (!history || history.length < 5) return null;
    
    // Xét 10 kết quả gần nhất
    const recentResults = [];
    const recentItems = history.slice(0, 10);
    
    for (const item of recentItems) {
        if (!item.numbers || !Array.isArray(item.numbers) || indices[0] >= item.numbers.length) continue;
        const num = Number(item.numbers[indices[0]]);
        if (isNaN(num)) continue;
        
        recentResults.push({
            value: num,
            type: num >= 5 ? "tài" : "xỉu"
        });
    }
    
    if (recentResults.length < 5) return null;
    
    // Tìm chuỗi liên tiếp của kết quả
    let currentStreak = 1;
    let streakType = recentResults[0].type;
    
    for (let i = 1; i < recentResults.length; i++) {
        if (recentResults[i].type === streakType) {
            currentStreak++;
        } else {
            break;
        }
    }
    
    // Nếu có chuỗi dài >= 3, áp dụng chiến lược đảo chiều
    if (currentStreak >= 3) {
        const oppositeType = streakType === "tài" ? "xỉu" : "tài";
        return {
            type: oppositeType,
            weight: currentStreak + 1, // Trọng số tăng theo độ dài chuỗi
            description: `Đảo chiều sau chuỗi ${currentStreak} lần ${streakType} liên tiếp`
        };
    }
    
    // Tính tỉ lệ Tài/Xỉu trong 7 kết quả gần nhất
    const recentTaiCount = recentResults.filter(r => r.type === "tài").length;
    const recentXiuCount = recentResults.filter(r => r.type === "xỉu").length;
    
    // Nếu có sự chênh lệch lớn, áp dụng chiến lược hồi quy
    if (recentTaiCount >= recentXiuCount * 2) {
        return {
            type: "xỉu", 
            weight: 2,
            description: `Xu hướng hồi quy sau khi Tài xuất hiện nhiều (${recentTaiCount}/${recentResults.length})`
        };
    } else if (recentXiuCount >= recentTaiCount * 2) {
        return {
            type: "tài",
            weight: 2,
            description: `Xu hướng hồi quy sau khi Xỉu xuất hiện nhiều (${recentXiuCount}/${recentResults.length})`
        };
    }
    
    return null;
}

// 3. Phân tích chu kỳ
function analyzeCycle(history, indices) {
    if (!history || history.length < 10) return null;
    
    // Lấy 20 kết quả gần nhất
    const recentValues = [];
    const recentItems = history.slice(0, 20);
    
    for (const item of recentItems) {
        if (!item.numbers || !Array.isArray(item.numbers) || indices[0] >= item.numbers.length) continue;
        const num = Number(item.numbers[indices[0]]);
        if (isNaN(num)) continue;
        
        recentValues.push(num >= 5 ? "T" : "X");
    }
    
    if (recentValues.length < 10) return null;
    
    // Tìm chu kỳ lặp lại
    const patterns = {};
    
    // Xét các mẫu có độ dài 2-4
    for (let patternLength = 2; patternLength <= 4; patternLength++) {
        for (let i = 0; i < recentValues.length - patternLength - 1; i++) {
            // Xây dựng mẫu
            const pattern = recentValues.slice(i, i + patternLength).join('');
            
            // Kiểm tra kết quả sau mẫu
            const nextResult = recentValues[i + patternLength];
            
            // Lưu thống kê
            if (!patterns[pattern]) {
                patterns[pattern] = { total: 0, T: 0, X: 0 };
            }
            
            patterns[pattern].total++;
            patterns[pattern][nextResult]++;
        }
    }
    
    // Tìm mẫu đáng kể nhất (xuất hiện >= 3 lần và có tỷ lệ dự đoán >= 70%)
    let bestPattern = null;
    let bestConfidence = 0;
    let bestTotal = 0;
    let prediction = null;
    
    for (const pattern in patterns) {
        const { total, T, X } = patterns[pattern];
        
        if (total >= 3) {
            const tRatio = T / total;
            const xRatio = X / total;
            
            if (tRatio > 0.7 && tRatio > bestConfidence) {
                bestPattern = pattern;
                bestConfidence = tRatio;
                bestTotal = total;
                prediction = "tài";
            } else if (xRatio > 0.7 && xRatio > bestConfidence) {
                bestPattern = pattern;
                bestConfidence = xRatio;
                bestTotal = total;
                prediction = "xỉu";
            }
        }
    }
    
    if (bestPattern) {
        // Kiểm tra xem mẫu hiện tại có khớp với bestPattern không
        const currentPattern = recentValues.slice(0, bestPattern.length).join('');
        
        if (currentPattern === bestPattern) {
            return {
                type: prediction,
                weight: Math.min(4, bestTotal), // Trọng số tối đa là 4
                description: `Chu kỳ: Sau mẫu "${bestPattern}" → ${prediction} (${(bestConfidence * 100).toFixed(0)}%, ${bestTotal} lần)`
            };
        }
    }
    
    return null;
}

// 4. Phân tích chiến lược đảo ngược
function analyzeInverseStrategy(history, indices, performanceData) {
    // Nếu không có đủ dữ liệu hiệu suất, thì bỏ qua
    if (!performanceData || performanceData.length < 10) return null;
    
    // Phân tích 10 kết quả gần nhất từ dữ liệu hiệu suất
    const recentPerformance = performanceData.slice(-10);
    let correctCount = 0;
    let incorrectCount = 0;
    
    for (const line of recentPerformance) {
        if (line.includes("Đúng")) {
            correctCount++;
        } else if (line.includes("Sai")) {
            incorrectCount++;
        }
    }
    
    // Nếu tỷ lệ dự đoán gần đây quá thấp (< 30%), đảo ngược chiến lược
    if (correctCount < incorrectCount && correctCount < 0.3 * recentPerformance.length) {
        // Dự đoán cơ bản
        const stats = analyzeTaiXiu(history, indices);
        
        // Chọn ngược lại với dự đoán cơ bản
        const normalPrediction = stats.taiPercent > stats.xiuPercent ? "tài" : "xỉu";
        const inversePrediction = normalPrediction === "tài" ? "xỉu" : "tài";
        
        return {
            type: inversePrediction,
            weight: 5, // Trọng số cao vì hiệu suất kém
            description: `Đảo ngược dự đoán do hiệu suất thấp (${correctCount}/${recentPerformance.length} đúng)`
        };
    }
    
    return null;
}

// 5. Phân tích mẫu theo thời gian
function analyzeTimePatterns(drawId) {
    // Trích xuất thông tin thời gian từ drawId (giả định drawId có dạng YYYYMMDDXXXX)
    if (!drawId || drawId.length < 12) return null;
    
    try {
        const year = parseInt(drawId.substring(0, 4));
        const month = parseInt(drawId.substring(4, 6));
        const day = parseInt(drawId.substring(6, 8));
        
        // Tạo đối tượng Date
        const date = new Date(year, month - 1, day);
        const weekday = date.getDay(); // 0 = Chủ nhật, 1-6 = Thứ 2 - Thứ 7
        
        // Chiến lược theo ngày trong tuần
        // Ví dụ: Dựa vào thống kê, vào thứ 2, thứ 4, thứ 6 có xu hướng ra Tài nhiều hơn
        if ([1, 3, 5].includes(weekday)) { // Thứ 2, 4, 6
            return {
                type: "tài",
                weight: 1, // Trọng số thấp vì chỉ là ví dụ
                description: `Theo thống kê, vào ${getWeekdayName(weekday)} có xu hướng ra Tài nhiều hơn`
            };
        } else if ([0, 2, 4, 6].includes(weekday)) { // Chủ nhật, thứ 3, 5, 7
            return {
                type: "xỉu",
                weight: 1, // Trọng số thấp vì chỉ là ví dụ
                description: `Theo thống kê, vào ${getWeekdayName(weekday)} có xu hướng ra Xỉu nhiều hơn`
            };
        }
    } catch (error) {
        gameLog.error(`Lỗi phân tích mẫu theo thời gian: ${error.message}`);
    }
    
    return null;
}

// 6. Phân tích hiệu suất
function analyzePerformance(performanceData) {
    if (!performanceData || performanceData.length < 5) return null;
    
    // Đếm kết quả Tài/Xỉu trong 20 kết quả gần đây
    const recentPerformance = performanceData.slice(-Math.min(20, performanceData.length));
    let taiCount = 0;
    let xiuCount = 0;
    
    for (const line of recentPerformance) {
        if (line.includes("Số thực tế:")) {
            // Trích xuất giá trị kết quả
            const match = line.match(/Số thực tế: (\d+) \((Tài|Xỉu)\)/);
            if (match) {
                const resultType = match[2];
                if (resultType === "Tài") {
                    taiCount++;
                } else if (resultType === "Xỉu") {
                    xiuCount++;
                }
            }
        }
    }
    
    const total = taiCount + xiuCount;
    if (total === 0) return null;
    
    const taiRatio = taiCount / total;
    const xiuRatio = xiuCount / total;
    
    // Dùng nguyên tắc hồi quy về trung bình
    if (taiRatio > 0.65) {
        // Nếu Tài xuất hiện > 65%, có xu hướng Xỉu sẽ nhiều hơn
        return {
            type: "xỉu",
            weight: 3,
            description: `Hồi quy trung bình: Tài đã xuất hiện ${(taiRatio * 100).toFixed(0)}%, dự đoán sẽ có nhiều Xỉu hơn`
        };
    } else if (xiuRatio > 0.65) {
        // Nếu Xỉu xuất hiện > 65%, có xu hướng Tài sẽ nhiều hơn
        return {
            type: "tài",
            weight: 3,
            description: `Hồi quy trung bình: Xỉu đã xuất hiện ${(xiuRatio * 100).toFixed(0)}%, dự đoán sẽ có nhiều Tài hơn`
        };
    }
    
    return null;
}

// Hàm lấy tên thứ trong tuần
function getWeekdayName(weekday) {
    const weekdays = [
        "Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", 
        "Thứ năm", "Thứ sáu", "Thứ bảy"
    ];
    return weekdays[weekday] || "";
}

/**
 * Phân tích hiệu suất để tự học tối ưu
 * @param {Array} performanceData - Dữ liệu lịch sử hiệu suất
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} index - Vị trí cần dự đoán
 * @returns {Object} - Chiến lược và trọng số
 */
function learnFromPerformance(performanceData, limitedHistory, index, log = false) {
    if (!performanceData || performanceData.length < 10) return null;
    
    // Lấy 30 kết quả gần nhất từ dữ liệu hiệu suất
    const recentResults = performanceData.slice(-30);
    
    // Đếm kết quả THỰC TẾ gần đây
    let taiCount = 0;
    let xiuCount = 0;
    
    // Phân tích chính xác kết quả thực tế từ dữ liệu
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
    if (total === 0) return null;
    
    const taiRatio = taiCount / total;
    const xiuRatio = xiuCount / total;
    
    // Phân tích 10 kết quả gần nhất để phát hiện xu hướng ngắn hạn
    const latest10 = recentResults.slice(-10);
    let latestTai = 0;
    let latestXiu = 0;
    
    for (const line of latest10) {
        if (typeof line !== 'string') continue;
        
        const match = line.match(/Số thực tế: (\d+) \((Tài|Xỉu)\)/);
        if (match) {
            const type = match[2];
            if (type === "Tài") {
                latestTai++;
            } else if (type === "Xỉu") {
                latestXiu++;
            }
        }
    }
    
    if (log) gameLog.info(`10 KẾT QUẢ GẦN NHẤT: Tài ${latestTai}, Xỉu ${latestXiu}`);
    
    // QUAN TRỌNG: Tăng ngưỡng xu hướng từ 7 lên 8 để tránh phát hiện xu hướng giả
    // Phân tích một chuỗi lâu hơn và nhạy bén hơn
    if (latestTai >= 8) {
        return {
            type: "tài",
            weight: 12, // Tăng trọng số từ 8 lên 12 khi có xu hướng mạnh
            description: `TỰ HỌC: Theo xu hướng Tài mạnh (${latestTai}/10 kết quả gần nhất)`
        };
    } else if (latestXiu >= 8) {
        return {
            type: "xỉu",
            weight: 12, // Tăng trọng số khi có xu hướng mạnh
            description: `TỰ HỌC: Theo xu hướng Xỉu mạnh (${latestXiu}/10 kết quả gần nhất)`
        };
    }
    
    // Nếu xu hướng cân bằng hơn, phải xem xét kỹ 5 kết quả gần nhất để phát hiện xu hướng mới
    const latest5 = latest10.slice(0, 5); // 5 kết quả gần nhất
    let latest5Tai = 0;
    let latest5Xiu = 0;
    
    for (const line of latest5) {
        if (typeof line !== 'string') continue;
        
        const match = line.match(/Số thực tế: (\d+) \((Tài|Xỉu)\)/);
        if (match) {
            const type = match[2];
            if (type === "Tài") {
                latest5Tai++;
            } else if (type === "Xỉu") {
                latest5Xiu++;
            }
        }
    }
    
    // Phân tích xu hướng trong 5 kết quả gần nhất
    if (latest5.length >= 3) {
        if (latest5Tai >= 4) {
            return {
                type: "tài",
                weight: 9, // Trọng số cao cho xu hướng gần đây
                description: `TỰ HỌC: Xu hướng Tài mới (${latest5Tai}/5 kết quả gần nhất)`
            };
        } else if (latest5Xiu >= 4) {
            return {
                type: "xỉu",
                weight: 9, // Trọng số cao cho xu hướng gần đây
                description: `TỰ HỌC: Xu hướng Xỉu mới (${latest5Xiu}/5 kết quả gần nhất)`
            };
        }
    }
    
    // Xử lý xu hướng cân bằng hơn trong toàn bộ dữ liệu
    if (taiRatio > 0.65) { // Tăng ngưỡng từ 0.6 lên 0.65
        return {
            type: "tài", 
            weight: Math.round(taiRatio * 12), // Tăng hệ số từ 10 lên 12
            description: `TỰ HỌC: Theo xu hướng Tài (${(taiRatio*100).toFixed(0)}% trong ${total} kết quả gần đây)`
        };
    } else if (xiuRatio > 0.65) { // Tăng ngưỡng từ 0.6 lên 0.65
        return {
            type: "xỉu",
            weight: Math.round(xiuRatio * 12), // Tăng hệ số từ 10 lên 12
            description: `TỰ HỌC: Theo xu hướng Xỉu (${(xiuRatio*100).toFixed(0)}% trong ${total} kết quả gần đây)`
        };
    }
    
    // Khi không có xu hướng rõ ràng, ưu tiên phân tích đảo chiều
    return {
        type: taiRatio >= xiuRatio ? "tài" : "xỉu",
        weight: 1, // Giảm trọng số từ 2 xuống 1 khi không có xu hướng rõ rệt
        description: `TỰ HỌC: Không có xu hướng rõ rệt (Tài: ${taiCount}, Xỉu: ${xiuCount})`
    };
}

function detectAndCorrectBias(performanceData, log = false) {
    if (!performanceData || performanceData.length < 15) return null;
    
    // Phân tích 10 DỰ ĐOÁN gần nhất thay vì 20
    const recent10 = performanceData.slice(-10);
    
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
    
    // THÊM: Kiểm tra thiên lệch nghiêm trọng
    if (xiuPredictions >= 7) { // Nếu 7/10 lần gần nhất đều dự đoán Xỉu
        return {
            type: "tài",
            weight: 25, // Tăng trọng số rất cao để bắt buộc đổi sang Tài
            description: `CẢNH BÁO: Đang dự đoán Xỉu quá nhiều (${xiuPredictions}/10 lần), bắt buộc chuyển sang Tài`
        };
    } else if (taiPredictions >= 7) { // Nếu 7/10 lần gần nhất đều dự đoán Tài
        return {
            type: "xỉu",
            weight: 25,
            description: `CẢNH BÁO: Đang dự đoán Tài quá nhiều (${taiPredictions}/10 lần), bắt buộc chuyển sang Xỉu`
        };
    }

    // THÊM: Kiểm tra chuỗi dự đoán liên tiếp
    let consecutiveXiu = 0;
    let consecutiveTai = 0;
    
    for (const line of recent10) {
        if (typeof line === 'string' && line.includes("Số dự đoán:")) {
            if (line.includes("(Xỉu)")) {
                consecutiveXiu++;
                consecutiveTai = 0;
            } else if (line.includes("(Tài)")) {
                consecutiveTai++;
                consecutiveXiu = 0;
            }
            
            // Nếu có 3 dự đoán liên tiếp cùng loại
            if (consecutiveXiu >= 3) {
                return {
                    type: "tài",
                    weight: 20,
                    description: `CHỐNG LẶP: ${consecutiveXiu} lần dự đoán Xỉu liên tiếp, chuyển sang Tài`
                };
            } else if (consecutiveTai >= 3) {
                return {
                    type: "xỉu",
                    weight: 20,
                    description: `CHỐNG LẶP: ${consecutiveTai} lần dự đoán Tài liên tiếp, chuyển sang Xỉu`
                };
            }
        }
    }
    
    return null;
}

/**
 * Phân tích mẫu bệt và bẻ trong lịch sử kết quả
 * @param {Array} performanceData - Dữ liệu lịch sử từ file performance
 * @returns {Object} - Chiến lược và trọng số
 */
function analyzeStreakAndReversal(performanceData) {
    if (!performanceData || performanceData.length < 10) return null;
    
    // LẤY 20 KẾT QUẢ GẦN NHẤT THEO ĐÚNG THỨ TỰ (MỚI NHẤT Ở ĐẦU)
    const recentResults = performanceData.slice(-20).reverse();
    
    // Trích xuất chuỗi kết quả thực tế gần đây (Tài/Xỉu)
    const resultSequence = [];
    
    for (const line of recentResults) {
        if (typeof line !== 'string') continue;
        
        const match = line.match(/Số thực tế: (\d+) \((Tài|Xỉu)\)/);
        if (match) {
            resultSequence.push(match[2]); // "Tài" hoặc "Xỉu"
        }
    }
    
    if (resultSequence.length < 5) return null;
    
    gameLog.info(`PHÂN TÍCH CHUỖI: ${resultSequence.join(' → ')}`);
    
    // 1. PHÁT HIỆN BỆT (STREAK) - LOGIC MỚI
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
    
    gameLog.info(`Phát hiện chuỗi hiện tại: ${currentStreak} lần ${currentType} liên tiếp`);
    
    // TĂNG MẠNH TRỌNG SỐ CHO CHIẾN LƯỢC THEO BỆT
    if (currentStreak >= 3) {
        // Nếu đang có chuỗi Tài/Xỉu từ 3 lên, ưu tiên cao cho việc theo bệt
        return {
            type: currentType.toLowerCase(),
            weight: currentStreak * 5, // Tăng trọng số lên gấp 5 lần độ dài chuỗi
            description: `THEO BỆT MẠNH: ${currentType} đang có ${currentStreak} lần liên tiếp`
        };
    }
    
    // 2. PHÂN TÍCH MẪU BẺ (REVERSAL PATTERN)
    // Phân tích 10 kết quả gần nhất để phát hiện điểm bẻ
    const last10 = resultSequence.slice(-10);
    
    // Đếm số lượng lần đổi chiều trong 10 kết quả gần nhất
    let reversalCount = 0;
    for (let i = 1; i < last10.length; i++) {
        if (last10[i] !== last10[i-1]) {
            reversalCount++;
        }
    }
    
    // Tính tỷ lệ đổi chiều
    const reversalRate = reversalCount / (last10.length - 1);
    
    gameLog.info(`Chuỗi hiện tại: ${currentStreak} lần ${currentType} liên tiếp`);
    gameLog.info(`Chuỗi dài nhất: ${currentStreak} lần ${currentType}`);
    gameLog.info(`Tỷ lệ đổi chiều: ${(reversalRate * 100).toFixed(0)}%`);
    
    // 3. QUYẾT ĐỊNH CHIẾN LƯỢC - SỬA ĐỔI LỚN
    
    // Phân tích chuỗi hiện tại đang hình thành tại vị trí mới nhất
    const currentFormingStreak = [];
    let tempStreak = 1;
    let tempType = resultSequence[0];
    
    for (let i = 1; i < resultSequence.length; i++) {
        if (resultSequence[i] === tempType) {
            tempStreak++;
        } else {
            currentFormingStreak.push({type: tempType, length: tempStreak});
            tempType = resultSequence[i];
            tempStreak = 1;
        }
    }
    
    // Thêm chuỗi cuối cùng
    currentFormingStreak.push({type: tempType, length: tempStreak});
    
    // Phân tích chiều dài trung bình các chuỗi
    const avgStreakLength = currentFormingStreak.reduce((sum, streak) => sum + streak.length, 0) / currentFormingStreak.length;
    
    gameLog.info(`Chiều dài trung bình các chuỗi: ${avgStreakLength.toFixed(1)}`);
    
    // Quyết định chiến lược dựa trên THÔNG TIN MỚI
    if (currentStreak >= 3) {
        // Nếu chuỗi hiện tại đã vượt quá chiều dài trung bình, khả năng cao sẽ đảo chiều
        if (currentStreak > avgStreakLength * 1.5) {
            const oppositeType = currentType === "Tài" ? "xỉu" : "tài";
            return {
                type: oppositeType,
                weight: Math.min(currentStreak + 5, 15), // Tăng trọng số tối đa từ (currentStreak + 1) lên (currentStreak + 5, tối đa 15)
                description: `BẺ XU HƯỚNG: ${currentType} đã xuất hiện ${currentStreak} lần (vượt trung bình ${avgStreakLength.toFixed(1)}), khả năng cao sẽ đổi chiều`
            };
        } else if (reversalRate < 0.25) { // Giảm ngưỡng từ 0.3 xuống 0.25
            // Tỷ lệ đổi chiều rất thấp, xu hướng mạnh, nên THEO BỆT
            return {
                type: currentType.toLowerCase(),
                weight: currentStreak + 4, // Tăng trọng số từ (currentStreak + 2) lên (currentStreak + 4)
                description: `THEO BỆT: ${currentType} đã xuất hiện ${currentStreak} lần liên tiếp, xu hướng rất mạnh`
            };
        } else {
            // Phân tích thêm pattern đối chiếu
            // Tìm tất cả các chuỗi trong quá khứ có cùng độ dài với chuỗi hiện tại
            const similarStreaks = currentFormingStreak.filter(streak => 
                streak.length >= currentStreak - 1 && streak.length <= currentStreak + 1);
            
            // Nếu có các chuỗi tương tự, xem điều gì xảy ra sau đó
            if (similarStreaks.length > 1) {
                let continueCount = 0;
                let reverseCount = 0;
                
                for (let i = 0; i < currentFormingStreak.length - 1; i++) {
                    const streak = currentFormingStreak[i];
                    if (streak.length >= currentStreak - 1 && streak.length <= currentStreak + 1) {
                        // Kiểm tra chuỗi tiếp theo
                        if (currentFormingStreak[i+1].type === streak.type) {
                            continueCount++;
                        } else {
                            reverseCount++;
                        }
                    }
                }
                
                if (continueCount > reverseCount) {
                    // Xu hướng thường tiếp tục sau chuỗi tương tự
                    return {
                        type: currentType.toLowerCase(),
                        weight: 8, // Trọng số cao
                        description: `THEO PATTERN: Sau chuỗi ${currentStreak} lần ${currentType}, thường tiếp tục (${continueCount}/${continueCount+reverseCount} lần)`
                    };
                } else {
                    // Xu hướng thường đảo chiều sau chuỗi tương tự
                    const oppositeType = currentType === "Tài" ? "xỉu" : "tài";
                    return {
                        type: oppositeType,
                        weight: 8, // Trọng số cao
                        description: `ĐẢO CHIỀU THEO PATTERN: Sau chuỗi ${currentStreak} lần ${currentType}, thường đảo chiều (${reverseCount}/${continueCount+reverseCount} lần)`
                    };
                }
            }
            
            // Nếu không có đủ dữ liệu pattern, dùng chiến lược mặc định
            const oppositeType = currentType === "Tài" ? "xỉu" : "tài";
            return {
                type: oppositeType,
                weight: currentStreak + 2, // Giữ nguyên trọng số
                description: `BẺ XU HƯỚNG: ${currentType} đã xuất hiện ${currentStreak} lần liên tiếp, có thể sắp đổi chiều`
            };
        }
    }
    
    // Nếu tỷ lệ đổi chiều cao (>60%), thường là đổi chiều liên tục - Tăng ngưỡng từ 0.5 lên 0.6
    if (reversalRate > 0.6) {
        // Nếu kết quả gần nhất là Tài, thì kết quả tiếp theo có thể là Xỉu và ngược lại
        const lastResult = resultSequence[0]; // Lấy kết quả gần nhất (đầu mảng)
        const oppositeType = lastResult === "Tài" ? "xỉu" : "tài";
        
        return {
            type: oppositeType,
            weight: Math.round(reversalRate * 12), // Tăng hệ số từ 10 lên 12
            description: `ĐỔI CHIỀU LIÊN TỤC: Sau ${lastResult} thường là ${oppositeType === "tài" ? "Tài" : "Xỉu"} (tỷ lệ đổi chiều ${(reversalRate * 100).toFixed(0)}%)`
        };
    }
    
    // Nếu không có mẫu rõ ràng, thì xem xét xu hướng chung - Tăng hệ số từ 1.5 lên 1.7
    const taiCount = resultSequence.filter(r => r === "Tài").length;
    const xiuCount = resultSequence.length - taiCount;
    
    if (taiCount > xiuCount * 1.7) {
        return {
            type: "tài",
            weight: 4, // Tăng trọng số từ 3 lên 4
            description: `XU HƯỚNG TÀI: Tài chiếm ưu thế (${taiCount}/${resultSequence.length})`
        };
    } else if (xiuCount > taiCount * 1.7) {
        return {
            type: "xỉu",
            weight: 4, // Tăng trọng số từ 3 lên 4
            description: `XU HƯỚNG XỈU: Xỉu chiếm ưu thế (${xiuCount}/${resultSequence.length})`
        };
    }
    
    return null;
}

function analyzeHistory(performanceData) {
    if (!performanceData || performanceData.length < 10) return null;
    
    // Chỉ lấy 30 kết quả gần nhất thay vì 50 để tập trung vào xu hướng hiện tại
    const recentResults = performanceData.slice(-30).reverse();
    
    // Phân tích kết quả thực tế
    const resultSequence = [];
    for (const line of recentResults) {
        if (typeof line !== 'string') continue;
        const match = line.match(/Số thực tế: (\d+) \((Tài|Xỉu)\)/);
        if (match) {
            resultSequence.push({
                number: parseInt(match[1]),
                type: match[2]
            });
        }
    }

    if (resultSequence.length === 0) return null;

    // === PHÂN TÍCH BỆT HIỆN TẠI ===
    let currentStreak = 1;
    let currentType = resultSequence[0]?.type;
    
    for (let i = 1; i < resultSequence.length; i++) {
        if (resultSequence[i].type === currentType) {
            currentStreak++;
        } else {
            break;
        }
    }

    // Nếu có bệt từ 3 trở lên, ưu tiên cao nhất
    if (currentStreak >= 3) {
        // Tăng trọng số theo độ dài của bệt
        const weight = currentStreak * 8; // Tăng hệ số từ 5 lên 8
        return {
            type: currentType.toLowerCase(),
            weight: weight,
            description: `THEO BỆT MẠNH: ${currentType} đang có ${currentStreak} lần liên tiếp`
        };
    }

    // === PHÂN TÍCH 10 KẾT QUẢ GẦN NHẤT ===
    const recent10 = resultSequence.slice(0, 10);
    const taiCount10 = recent10.filter(r => r.type === "Tài").length;
    const xiuCount10 = recent10.length - taiCount10;

    // Nếu có xu hướng rõ ràng trong 10 kết quả gần nhất
    if (taiCount10 >= 7) {
        return {
            type: "tài",
            weight: 15,
            description: `XU HƯỚNG TÀI MẠNH: ${taiCount10}/10 kết quả gần nhất`
        };
    } else if (xiuCount10 >= 7) {
        return {
            type: "xỉu",
            weight: 15,
            description: `XU HƯỚNG XỈU MẠNH: ${xiuCount10}/10 kết quả gần nhất`
        };
    }

    // === PHÂN TÍCH 5 KẾT QUẢ GẦN NHẤT ===
    const recent5 = resultSequence.slice(0, 5);
    const taiCount5 = recent5.filter(r => r.type === "Tài").length;
    const xiuCount5 = recent5.length - taiCount5;

    // Phát hiện xu hướng ngắn hạn mạnh
    if (taiCount5 >= 4) {
        return {
            type: "tài",
            weight: 12,
            description: `XU HƯỚNG TÀI NGẮN: ${taiCount5}/5 kết quả gần nhất`
        };
    } else if (xiuCount5 >= 4) {
        return {
            type: "xỉu",
            weight: 12,
            description: `XU HƯỚNG XỈU NGẮN: ${xiuCount5}/5 kết quả gần nhất`
        };
    }

    // === PHÂN TÍCH MẪU LẶP LẠI ===
    // Kiểm tra mẫu lặp lại trong 3 kết quả gần nhất
    const recent3 = resultSequence.slice(0, 3);
    if (recent3.length === 3) {
        if (recent3.every(r => r.type === "Tài")) {
            return {
                type: "xỉu",
                weight: 10,
                description: "ĐẢO CHIỀU: 3 lần Tài liên tiếp, khả năng cao sẽ đổi sang Xỉu"
            };
        } else if (recent3.every(r => r.type === "Xỉu")) {
            return {
                type: "tài",
                weight: 10,
                description: "ĐẢO CHIỀU: 3 lần Xỉu liên tiếp, khả năng cao sẽ đổi sang Tài"
            };
        }
    }

    // === XỬ LÝ MẶC ĐỊNH ===
    // Nếu không có mẫu rõ ràng, dựa vào xu hướng chung của 10 kết quả gần nhất
    return {
        type: taiCount10 >= xiuCount10 ? "tài" : "xỉu",
        weight: 5,
        description: `Xu hướng yếu: ${taiCount10 >= xiuCount10 ? "Tài" : "Xỉu"} chiếm ưu thế nhẹ`
    };
}

module.exports = predictNumbers;

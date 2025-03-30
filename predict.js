const fs = require('fs').promises;

/**
 * Dự đoán số tiếp theo dựa trên lịch sử
 * @param {Array} history - Mảng lịch sử kết quả (mỗi phần tử có drawId, numbers, drawTime)
 * @param {Number} index - Vị trí cần dự đoán trong mảng numbers (0, 1, 2, ...)
 * @param {Number} limit - Giới hạn số lượng kết quả gần nhất để phân tích
 * @param {Array} fileConfig - [Tên file performance, true/false để lưu performance]
 * @returns {Promise<Object>} - Kết quả dự đoán và thống kê
 */
async function predictNumbers(history, index = 0, limit = 25, fileConfig = ["taixiu_performance", true]) {
    try {
        // Đảm bảo history là mảng và có dữ liệu
        if (!Array.isArray(history) || history.length === 0) {
            throw new Error("Lịch sử không hợp lệ");
        }

        // Chuyển đổi index thành mảng indices để tương thích với code cũ
        const indices = [index];
        
        console.log(`Dự đoán cho vị trí số ${index} trong mảng numbers`);
        
        // LẤY DỮ LIỆU TỪ ĐẦU MẢNG (phần tử 0 là mới nhất)
        const limitedHistory = history.slice(0, Math.min(limit, history.length));
        
        // Lấy phần tử mới nhất (đầu mảng)
        const currentDrawId = history[0]?.drawId ? String(history[0].drawId) : "N/A";
        
        // THIẾT LẬP TÊN FILE CHÍNH XÁC - KHÔNG THÊM .TXT
        const performanceFile = fileConfig[0] + ".performance";
        const predictionFile = fileConfig[0] + ".prediction";
        
        console.log(`---------- BẮT ĐẦU PHIÊN DỰ ĐOÁN MỚI ----------`);
        console.log(`File hiệu suất: ${performanceFile}`);
        console.log(`File dự đoán: ${predictionFile}`);
        console.log(`ID chu kỳ hiện tại: ${currentDrawId}`);
        console.log(`Phân tích ${limitedHistory.length} kết quả gần nhất.`);
        
        // Xử lý lỗi nếu vị trí index vượt quá kích thước mảng numbers
        if (history[0]?.numbers && index >= history[0].numbers.length) {
            console.error(`Lỗi: Index ${index} vượt quá kích thước mảng numbers (${history[0].numbers.length})`);
            throw new Error(`Index ${index} không hợp lệ`);
        }
        
        // In ra thông tin mẫu từ phần tử đầu tiên để kiểm tra
        if (history[0]) {
            console.log(`Mẫu dữ liệu đầu vào:`);
            console.log(`- drawId: ${history[0].drawId}`);
            console.log(`- numbers: [${history[0].numbers.join(', ')}]`);
            console.log(`- drawTime: ${history[0].drawTime}`);
            console.log(`- Số cần dự đoán (vị trí ${index}): ${history[0].numbers[index]}`);
        }
        
        // === PHẦN 1: Ghi log hiệu suất cho dự đoán trước đó nếu có ===
        let lastPrediction = null;
        let performanceData = [];
        
        if (fileConfig && fileConfig[1]) {
            try {
                // Đọc dự đoán trước (nếu có)
                const predictionData = await fs.readFile(predictionFile, 'utf8');
                lastPrediction = JSON.parse(predictionData);
                console.log(`Đọc được dự đoán trước đó: ${JSON.stringify(lastPrediction.predictions)}`);
                
                // Ghi log hiệu suất nếu có dự đoán trước
                if (history.length > 0) {
                    // Lấy kết quả từ phần tử mới nhất (index chỉ định)
                    const latestResult = history[0].numbers[index];
                    if (latestResult === undefined) {
                        console.error(`Không tìm thấy kết quả tại vị trí ${index} trong mảng numbers`);
                    } else {
                        const previousPrediction = lastPrediction.predictions[0];
                        
                        // Định dạng thời gian VN HIỆN TẠI (không phụ thuộc vào chu kỳ)
                        const vnCurrentTime = getVietnamTimeNow();
                        
                        // Xác định Tài/Xỉu cho kết quả thực tế
                        const resultType = latestResult >= 5 ? "Tài" : "Xỉu";
                        
                        // Xác định Tài/Xỉu cho dự đoán
                        const predictionType = previousPrediction >= 5 ? "Tài" : "Xỉu";
                        
                        // Kiểm tra dự đoán đúng loại (Tài/Xỉu) hay không
                        const isCorrectType = (latestResult >= 5 && previousPrediction >= 5) || (latestResult < 5 && previousPrediction < 5);
                        const correctStr = isCorrectType ? "Đúng" : "Sai";
                        
                        // ĐỊNH DẠNG LOG MỚI SỬ DỤNG DẤU GẠCH | VÀ THÊM VỊ TRÍ INDEX
                        const performanceLog = `Chu kỳ | ${currentDrawId} | ${vnCurrentTime} | Số thực tế: ${latestResult} (${resultType}) | Số dự đoán: ${previousPrediction} (${predictionType}) | Vị trí: ${index} | ${correctStr}\n`;
                        console.log(`GHI LOG MỚI: ${performanceLog.trim()}`);
                        
                        // TẠO FILE TRƯỚC KHI GHI NẾU KHÔNG TỒN TẠI
                        try {
                            // Kiểm tra file có tồn tại
                            await fs.access(performanceFile).catch(async () => {
                                // Nếu không, tạo file trống
                                await fs.writeFile(performanceFile, "");
                                console.log(`Đã tạo file ${performanceFile} mới`);
                            });
                            
                            // Sau đó GHI THÊM (APPEND) log vào file
                            await fs.appendFile(performanceFile, performanceLog);
                            console.log(`Đã ghi log hiệu suất thành công`);
                        } catch (error) {
                            console.error(`LỖI KHI GHI LOG: ${error.message}`);
                        }
                    }
                }
                
                // Đọc toàn bộ lịch sử hiệu suất
                try {
                    const perfFileContent = await fs.readFile(performanceFile, 'utf8');
                    performanceData = perfFileContent.split('\n').filter(line => line.trim().length > 0);
                    console.log(`Đọc được ${performanceData.length} dòng dữ liệu hiệu suất`);
                } catch (error) {
                    console.log(`Không đọc được file hiệu suất: ${error.message}`);
                }
            } catch (error) {
                console.log(`Không đọc được dự đoán trước đó: ${error.message}`);
            }
        }
        
        // === PHẦN 2: THUẬT TOÁN DỰ ĐOÁN NÂNG CAO ===
        
        // Phân tích dữ liệu cơ bản
        const stats = analyzeTaiXiu(limitedHistory, indices);
        console.log(`Kết quả phân tích cơ bản: Tài ${stats.taiPercent}%, Xỉu ${stats.xiuPercent}%`);
        
        // Kiểm tra lượng dữ liệu hiệu suất
        const hasEnoughPerformanceData = performanceData && performanceData.length >= 10;
        console.log(`Dữ liệu hiệu suất: ${performanceData ? performanceData.length : 0} dòng (${hasEnoughPerformanceData ? 'đủ' : 'chưa đủ'} cho phân tích nâng cao)`);
        
        // Hệ thống chiến lược và bỏ phiếu
        const strategies = [];
        const votes = { tài: 0, xỉu: 0 };
        
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
            console.log("Sử dụng chiến lược thay thế do chưa đủ dữ liệu hiệu suất");
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
            const learningVote = learnFromPerformance(performanceData, limitedHistory, index);
            if (learningVote) {
                votes[learningVote.type] += learningVote.weight;
                strategies.push(`Tự học: ${learningVote.description} (${learningVote.weight} phiếu)`);
            }
            
            // Thêm chiến lược điều chỉnh thiên lệch
            const biasVote = detectAndCorrectBias(performanceData);
            if (biasVote) {
                votes[biasVote.type] += biasVote.weight;
                strategies.push(`Điều chỉnh: ${biasVote.description} (${biasVote.weight} phiếu)`);
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
        console.log(`Kết quả bỏ phiếu ban đầu: Tài ${votes.tài} phiếu, Xỉu ${votes.xỉu} phiếu`);

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

        console.log(`Phân tích 15 kết quả gần đây:`);
        console.log(`- Kết quả thực tế: Tài ${recentTaiCount}, Xỉu ${recentXiuCount}`);
        console.log(`- Dự đoán: Tài ${recentTaiPredictions}, Xỉu ${recentXiuPredictions}`);

        // Điều chỉnh trọng số nếu dự đoán quá thiên về một bên
        const predictionRatio = recentXiuPredictions / (recentTaiPredictions + recentXiuPredictions || 1);
        if (predictionRatio > 0.65) { // Nếu dự đoán Xỉu > 65%
            // Tăng điểm cho Tài để cân bằng
            const balancingPoints = Math.ceil((predictionRatio - 0.5) * 10);
            votes.tài += balancingPoints;
            strategies.push(`Cân bằng dự đoán: +${balancingPoints} cho Tài do dự đoán Xỉu quá nhiều (${(predictionRatio * 100).toFixed(0)}%)`);
            console.log(`Điều chỉnh cân bằng: +${balancingPoints} điểm cho Tài`);
        } else if (predictionRatio < 0.35) { // Nếu dự đoán Tài > 65%
            // Tăng điểm cho Xỉu để cân bằng
            const balancingPoints = Math.ceil((0.5 - predictionRatio) * 10);
            votes.xỉu += balancingPoints;
            strategies.push(`Cân bằng dự đoán: +${balancingPoints} cho Xỉu do dự đoán Tài quá nhiều (${((1-predictionRatio) * 100).toFixed(0)}%)`);
            console.log(`Điều chỉnh cân bằng: +${balancingPoints} điểm cho Xỉu`);
        }

        // ĐIỀU CHỈNH THÊM DỰA TRÊN KẾT QUẢ THỰC TẾ
        const actualRatio = recentTaiCount / (recentTaiCount + recentXiuCount || 1);
        if (actualRatio > 0.6) { // Nếu thực tế Tài xuất hiện > 60%
            // Tăng điểm cho Tài vì xu hướng rõ ràng
            votes.tài += 2;
            strategies.push(`Xu hướng thực tế: +2 cho Tài do Tài xuất hiện nhiều (${(actualRatio * 100).toFixed(0)}%)`);
            console.log(`Điều chỉnh theo xu hướng: +2 điểm cho Tài`);
        } else if (actualRatio < 0.4) { // Nếu thực tế Xỉu xuất hiện > 60%
            // Tăng điểm cho Xỉu vì xu hướng rõ ràng
            votes.xỉu += 2;
            strategies.push(`Xu hướng thực tế: +2 cho Xỉu do Xỉu xuất hiện nhiều (${((1-actualRatio) * 100).toFixed(0)}%)`);
            console.log(`Điều chỉnh theo xu hướng: +2 điểm cho Xỉu`);
        }

        // Tổng hợp kết quả bỏ phiếu sau khi cân bằng
        console.log(`Kết quả bỏ phiếu sau điều chỉnh: Tài ${votes.tài} phiếu, Xỉu ${votes.xỉu} phiếu`);
        strategies.forEach(strategy => console.log(strategy));

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
        console.log(`Phân tích ${totalPredictions} dự đoán: Tài ${taiPredictions} (${(taiPredictionRatio * 100).toFixed(0)}%), Xỉu ${xiuPredictions} (${((1-taiPredictionRatio) * 100).toFixed(0)}%)`);

        // 2. ÁP DỤNG BIỆN PHÁP KHẨN CẤP
        let emergencyBalancing = false;

        // Nếu tỷ lệ Tài < 45% hoặc Xỉu < 45%, áp dụng biện pháp khẩn cấp
        if (taiPredictionRatio < 0.45) {
            // THIÊN VỊ XỈU QUÁ NHIỀU - BẮT BUỘC DỰ ĐOÁN TÀI
            console.log(`CẢNH BÁO: Phát hiện thiên vị Xỉu nghiêm trọng (${((1-taiPredictionRatio)*100).toFixed(0)}%)!`);
            console.log(`Áp dụng biện pháp khẩn cấp: BẮT BUỘC dự đoán TÀI`);
            
            // Ghi đè các phiếu bầu
            votes.tài = 999;
            votes.xỉu = 0;
            emergencyBalancing = true;
            strategies.push(`KHẨN CẤP: Bắt buộc chọn TÀI do phát hiện thiên vị Xỉu (${((1-taiPredictionRatio)*100).toFixed(0)}%)`);
        } else if ((1 - taiPredictionRatio) < 0.45) {
            // THIÊN VỊ TÀI QUÁ NHIỀU - BẮT BUỘC DỰ ĐOÁN XỈU
            console.log(`CẢNH BÁO: Phát hiện thiên vị Tài nghiêm trọng (${(taiPredictionRatio*100).toFixed(0)}%)!`);
            console.log(`Áp dụng biện pháp khẩn cấp: BẮT BUỘC dự đoán XỈU`);
            
            // Ghi đè các phiếu bầu
            votes.tài = 0;
            votes.xỉu = 999;
            emergencyBalancing = true;
            strategies.push(`KHẨN CẤP: Bắt buộc chọn XỈU do phát hiện thiên vị Tài (${(taiPredictionRatio*100).toFixed(0)}%)`);
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
            
            // Nếu 5 dự đoán gần nhất cùng một loại, bắt buộc đổi sang loại kia
            if (recentTai === 0 && recentXiu > 0) {
                console.log(`CẢNH BÁO: ${recentXiu}/5 dự đoán gần nhất đều là XỈU!`);
                console.log(`Áp dụng biện pháp chống lặp: Bắt buộc dự đoán TÀI`);
                votes.tài = votes.tài + 10;
                strategies.push(`Chống lặp: +10 cho Tài do ${recentXiu} dự đoán gần nhất đều là Xỉu`);
            } else if (recentXiu === 0 && recentTai > 0) {
                console.log(`CẢNH BÁO: ${recentTai}/5 dự đoán gần nhất đều là TÀI!`);
                console.log(`Áp dụng biện pháp chống lặp: Bắt buộc dự đoán XỈU`);
                votes.xỉu = votes.xỉu + 10;
                strategies.push(`Chống lặp: +10 cho Xỉu do ${recentTai} dự đoán gần nhất đều là Tài`);
            }
        }

        // 4. THÊM YẾU TỐ NGẪU NHIÊN NẾU CẦN
        if (!emergencyBalancing) {
            // Thêm yếu tố ngẫu nhiên để tránh bị mắc kẹt vào mẫu
            // 30% cơ hội đảo ngược phiếu bầu khi không trong trường hợp khẩn cấp
            if (Math.random() < 0.3) {
                const tmp = votes.tài;
                votes.tài = votes.xỉu;
                votes.xỉu = tmp;
                strategies.push(`Yếu tố ngẫu nhiên: Đảo ngược phiếu bầu (30% cơ hội)`);
                console.log(`Áp dụng yếu tố ngẫu nhiên: Đảo ngược phiếu bầu Tài<->Xỉu`);
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
                console.log(`CẢNH BÁO: 3 dự đoán gần nhất đều là ${recentType.toUpperCase()}!`);
                console.log(`Biện pháp chống lặp bổ sung: Tự động đổi sang ${oppositeType.toUpperCase()}`);
                
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
        console.log(`Kết quả bỏ phiếu sau can thiệp: Tài ${votes.tài} phiếu, Xỉu ${votes.xỉu} phiếu`);

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
            console.log(`Dự đoán: TÀI - Số ${prediction}`);
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
            console.log(`Dự đoán: XỈU - Số ${prediction}`);
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
                console.log(`ĐÃ LƯU DỰ ĐOÁN: ${prediction} vào ${predictionFile}`);
            } catch (error) {
                console.error(`LỖI KHI LƯU DỰ ĐOÁN: ${error.message}`);
            }
        }
        
        console.log(`---------- KẾT THÚC PHIÊN DỰ ĐOÁN ----------`);
        
        // Thêm yếu tố ngẫu nhiên bổ sung
        const randomFactor = Math.random();
        if (randomFactor < 0.2) {  // 20% cơ hội
            const randomChoice = Math.random() < 0.5 ? "tài" : "xỉu";
            votes[randomChoice] += 5;
            strategies.push(`Yếu tố ngẫu nhiên bổ sung: +5 cho ${randomChoice} (20% cơ hội)`);
            console.log(`Thêm yếu tố ngẫu nhiên: +5 cho ${randomChoice}`);
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
        console.error(`LỖI NGHIÊM TRỌNG: ${error.message}, ${error.stack}`);
        return {
            predictions: [0],
            stats: { tai: 0, xiu: 0, taiPercent: 0, xiuPercent: 0 },
            error: error.message
        };
    }
}

// Hàm phân tích giá trị
function analyzeTaiXiu(history, indices) {
    if (!Array.isArray(history) || history.length === 0) {
        return { tai: 0, xiu: 0, taiPercent: 0, xiuPercent: 0 };
    }

    let taiCount = 0;
    let xiuCount = 0;

    for (const item of history) {
        if (!item.numbers || !Array.isArray(item.numbers)) continue;

        for (const index of indices) {
            if (index >= item.numbers.length) continue;

            const num = Number(item.numbers[index]);
            if (isNaN(num)) continue;

            if (num >= 0 && num <= 4) {
                xiuCount++;
            } else if (num >= 5 && num <= 9) {
                taiCount++;
            }
        }
    }

    const total = taiCount + xiuCount;
    const taiPercent = total ? ((taiCount / total) * 100).toFixed(2) : 0;
    const xiuPercent = total ? ((xiuCount / total) * 100).toFixed(2) : 0;

    return { tai: taiCount, xiu: xiuCount, taiPercent, xiuPercent };
}

// Hàm lấy thời gian hiện tại Việt Nam (UTC+7) - SỬA LẠI
function getVietnamTimeNow() {
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
    console.log(`Giờ UTC: ${utcHours}:${utcMinutes}:${utcSeconds}`);
    console.log(`Giờ VN: ${vnHours}:${utcMinutes}:${utcSeconds} ${ampm}`);
    
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
        console.error(`Lỗi phân tích mẫu theo thời gian: ${error.message}`);
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

// Hàm hỗ trợ sinh số thông minh
function generateSmartNumber(min, max, history, indices) {
    // Mặc định, sinh số ngẫu nhiên trong khoảng
    let result = Math.floor(Math.random() * (max - min + 1)) + min;
    
    // Nếu có lịch sử, tìm số xuất hiện ít nhất trong khoảng này
    if (history && history.length > 0) {
        const counts = Array(10).fill(0);
        
        // Đếm số lần xuất hiện của mỗi số
        for (const item of history) {
            if (!item.numbers || !Array.isArray(item.numbers)) continue;
            
            for (const index of indices) {
                if (index >= item.numbers.length) continue;
                
                const num = Number(item.numbers[index]);
                if (isNaN(num) || num < 0 || num > 9) continue;
                
                counts[num]++;
            }
        }
        
        // Tìm số xuất hiện ít nhất trong khoảng [min, max]
        let minCount = Infinity;
        let leastFrequentNum = -1;
        
        for (let i = min; i <= max; i++) {
            if (counts[i] < minCount) {
                minCount = counts[i];
                leastFrequentNum = i;
            }
        }
        
        // 70% cơ hội chọn số xuất hiện ít nhất, 30% chọn ngẫu nhiên
        if (leastFrequentNum !== -1 && Math.random() < 0.7) {
            result = leastFrequentNum;
        }
    }
    
    return result;
}

// Hàm lấy tên thứ trong tuần
function getWeekdayName(weekday) {
    const weekdays = [
        "Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", 
        "Thứ năm", "Thứ sáu", "Thứ bảy"
    ];
    return weekdays[weekday] || "";
}

// Thêm hàm tạo số đa dạng
function generateDiverseNumber(min, max, recentLogs) {
    // Đếm số lần xuất hiện gần đây của các số
    const recentNumbers = Array(10).fill(0);
    
    // Lấy các số dự đoán gần đây từ logs
    for (const line of recentLogs) {
        const match = line.match(/Số dự đoán: (\d+)/);
        if (match) {
            const num = parseInt(match[1]);
            if (!isNaN(num) && num >= 0 && num <= 9) {
                recentNumbers[num]++;
            }
        }
    }
    
    // Ưu tiên số ít xuất hiện trong khoảng
    let leastFrequent = min;
    let minCount = Infinity;
    
    for (let i = min; i <= max; i++) {
        if (recentNumbers[i] < minCount) {
            minCount = recentNumbers[i];
            leastFrequent = i;
        }
    }
    
    // 70% cơ hội chọn số ít xuất hiện, 30% chọn ngẫu nhiên
    if (Math.random() < 0.7) {
        return leastFrequent;
    } else {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
}

/**
 * Phân tích hiệu suất để tự học tối ưu
 * @param {Array} performanceData - Dữ liệu lịch sử hiệu suất
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} index - Vị trí cần dự đoán
 * @returns {Object} - Chiến lược và trọng số
 */
function learnFromPerformance(performanceData, history, index) {
    if (!performanceData || performanceData.length < 10) return null;
    
    // Phân tích 15 kết quả gần nhất
    const recentResults = performanceData.slice(-15);
    
    // Lưu trữ chuỗi dự đoán và kết quả
    const predictionPatterns = [];
    const resultPatterns = [];
    
    // Điểm hiệu suất theo loại dự đoán
    let taiCorrect = 0, taiWrong = 0;
    let xiuCorrect = 0, xiuWrong = 0;
    
    // Ghi lại chuỗi dự đoán và kết quả
    for (const line of recentResults) {
        if (line.includes("Số thực tế:") && line.includes("Số dự đoán:")) {
            // Phân tích dự đoán
            const predMatch = line.match(/Số dự đoán: (\d+) \((Tài|Xỉu)\)/);
            // Phân tích kết quả thực tế
            const resultMatch = line.match(/Số thực tế: (\d+) \((Tài|Xỉu)\)/);
            
            if (predMatch && resultMatch) {
                const predType = predMatch[2];
                const resultType = resultMatch[2];
                
                // Thêm vào mẫu (T: Tài, X: Xỉu)
                predictionPatterns.push(predType === "Tài" ? "T" : "X");
                resultPatterns.push(resultType === "Tài" ? "T" : "X");
                
                // Tính điểm hiệu suất
                if (predType === "Tài") {
                    if (predType === resultType) taiCorrect++;
                    else taiWrong++;
                } else {
                    if (predType === resultType) xiuCorrect++;
                    else xiuWrong++;
                }
            }
        }
    }
    
    // Phân tích hiệu suất mỗi loại dự đoán
    const taiAccuracy = taiCorrect + taiWrong > 0 ? taiCorrect / (taiCorrect + taiWrong) : 0;
    const xiuAccuracy = xiuCorrect + xiuWrong > 0 ? xiuCorrect / (xiuCorrect + xiuWrong) : 0;
    
    // Chiến lược 1: Học từ độ chính xác của mỗi loại dự đoán
    if (Math.abs(taiAccuracy - xiuAccuracy) > 0.3 && (taiCorrect + taiWrong >= 5) && (xiuCorrect + xiuWrong >= 5)) {
        // Nếu một loại có độ chính xác cao hơn đáng kể, ưu tiên loại đó
        const betterType = taiAccuracy > xiuAccuracy ? "tài" : "xỉu";
        const accuracy = betterType === "tài" ? taiAccuracy : xiuAccuracy;
        
        return {
            type: betterType,
            weight: Math.ceil(accuracy * 10), // Trọng số dựa trên độ chính xác
            description: `Học từ hiệu suất: ${betterType} có độ chính xác cao hơn (${(accuracy * 100).toFixed(0)}%)`
        };
    }
    
    // Chiến lược 2: Học từ mẫu kết quả và dự đoán
    if (predictionPatterns.length >= 5 && resultPatterns.length >= 5) {
        // Tìm mẫu lặp lại trong dự đoán
        const lastPredictions = predictionPatterns.slice(-3).join('');
        const lastResults = resultPatterns.slice(-3).join('');
        
        // Đếm số lần xuất hiện của mẫu dự đoán này trong lịch sử
        let patternCount = 0;
        let taiAfterPattern = 0;
        let xiuAfterPattern = 0;
        
        for (let i = 0; i < predictionPatterns.length - 3; i++) {
            const pattern = predictionPatterns.slice(i, i + 3).join('');
            if (pattern === lastPredictions && i + 3 < resultPatterns.length) {
                patternCount++;
                if (resultPatterns[i + 3] === 'T') taiAfterPattern++;
                else xiuAfterPattern++;
            }
        }
        
        // Nếu có mẫu xuất hiện nhiều lần và có xu hướng rõ rệt
        if (patternCount >= 2) {
            const taiRatio = taiAfterPattern / patternCount;
            const xiuRatio = xiuAfterPattern / patternCount;
            
            if (Math.abs(taiRatio - xiuRatio) > 0.5) {
                const predictedType = taiRatio > xiuRatio ? "tài" : "xỉu";
                const ratio = predictedType === "tài" ? taiRatio : xiuRatio;
                
                return {
                    type: predictedType,
                    weight: Math.min(5, patternCount),
                    description: `Học từ mẫu dự đoán: Sau "${lastPredictions}" → ${predictedType} (${(ratio * 100).toFixed(0)}%, ${patternCount} lần)`
                };
            }
        }
        
        // Phân tích xu hướng ngược (khi dự đoán sai nhiều liên tiếp)
        let recentWrongs = 0;
        for (let i = predictionPatterns.length - 1; i >= Math.max(0, predictionPatterns.length - 5); i--) {
            if (predictionPatterns[i] !== resultPatterns[i]) {
                recentWrongs++;
            }
        }
        
        if (recentWrongs >= 3) {
            // Tính xu hướng thực tế gần đây
            const recentResults = resultPatterns.slice(-5);
            const recentTai = recentResults.filter(r => r === 'T').length;
            const recentXiu = recentResults.filter(r => r === 'X').length;
            
            if (Math.abs(recentTai - recentXiu) > 2) {
                // Xu hướng rõ rệt, nên theo
                const dominantType = recentTai > recentXiu ? "tài" : "xỉu";
                
                return {
                    type: dominantType,
                    weight: 6, // Trọng số cao do dự đoán sai nhiều
                    description: `Hiệu chỉnh sau nhiều dự đoán sai: Theo xu hướng thực tế (${dominantType})`
                };
            }
        }
    }
    
    // Chiến lược 3: Phân tích mẫu kết quả thực tế
    if (resultPatterns.length >= 10) {
        // Phân tích mẫu kết quả thực tế
        let taiCount = 0;
        let xiuCount = 0;
        
        // Đếm kết quả 5 chu kỳ gần nhất
        for (let i = resultPatterns.length - 1; i >= Math.max(0, resultPatterns.length - 5); i--) {
            if (resultPatterns[i] === 'T') taiCount++;
            else xiuCount++;
        }
        
        // Nếu chuỗi kết quả quá nghiêng về một bên, dự đoán sẽ đổi chiều
        if (taiCount >= 4) {
            return {
                type: "xỉu",
                weight: 4,
                description: `Học từ chu kỳ: Sau ${taiCount}/5 kết quả Tài liên tiếp, có xu hướng đổi sang Xỉu`
            };
        } else if (xiuCount >= 4) {
            return {
                type: "tài",
                weight: 4,
                description: `Học từ chu kỳ: Sau ${xiuCount}/5 kết quả Xỉu liên tiếp, có xu hướng đổi sang Tài`
            };
        }
    }
    
    // Sử dụng dữ liệu từ cả hai nguồn
    if (history && history.length > 0 && resultPatterns.length > 0) {
        // Tìm xu hướng từ cả hai nguồn
        let recentHistoryTai = 0;
        let recentHistoryXiu = 0;
        
        // Lấy 7 kết quả gần nhất từ history
        for (let i = 0; i < Math.min(7, history.length); i++) {
            if (history[i]?.numbers && index < history[i].numbers.length) {
                const num = Number(history[i].numbers[index]);
                if (!isNaN(num)) {
                    if (num >= 5) recentHistoryTai++;
                    else recentHistoryXiu++;
                }
            }
        }
        
        // Phối hợp với phân tích dự đoán gần đây
        if (recentHistoryTai >= 5 && xiuWrong > xiuCorrect) {
            // Hiện tại thực tế đang ra nhiều Tài và dự đoán Xỉu thường sai
            return {
                type: "tài",
                weight: 5,
                description: `Học từ hai nguồn: Thực tế đang ra nhiều Tài (${recentHistoryTai}/7) và dự đoán Xỉu thường sai`
            };
        } else if (recentHistoryXiu >= 5 && taiWrong > taiCorrect) {
            // Hiện tại thực tế đang ra nhiều Xỉu và dự đoán Tài thường sai
            return {
                type: "xỉu",
                weight: 5,
                description: `Học từ hai nguồn: Thực tế đang ra nhiều Xỉu (${recentHistoryXiu}/7) và dự đoán Tài thường sai`
            };
        }
    }
    
    return null;
}

/**
 * Phát hiện và khắc phục thiên lệch trong dự đoán
 * @param {Array} performanceData - Dữ liệu lịch sử hiệu suất
 * @returns {Object} - Chiến lược điều chỉnh thiên lệch
 */
function detectAndCorrectBias(performanceData) {
    if (!performanceData || performanceData.length < 10) return null;
    
    // Đếm số lượng dự đoán Tài/Xỉu trong toàn bộ lịch sử
    let taiPredictions = 0;
    let xiuPredictions = 0;
    let taiResults = 0;
    let xiuResults = 0;
    
    for (const line of performanceData) {
        if (line.includes("Số dự đoán:")) {
            if (line.includes("(Tài)")) {
                taiPredictions++;
            } else if (line.includes("(Xỉu)")) {
                xiuPredictions++;
            }
        }
        
        if (line.includes("Số thực tế:")) {
            if (line.includes("(Tài)")) {
                taiResults++;
            } else if (line.includes("(Xỉu)")) {
                xiuResults++;
            }
        }
    }
    
    const totalPredictions = taiPredictions + xiuPredictions;
    const totalResults = taiResults + xiuResults;
    
    if (totalPredictions < 10 || totalResults < 10) return null;
    
    // Tính tỷ lệ
    const taiPredictionRatio = taiPredictions / totalPredictions;
    const taiResultRatio = taiResults / totalResults;
    
    // Phát hiện thiên lệch
    const biasDifference = Math.abs(taiPredictionRatio - taiResultRatio);
    
    if (biasDifference > 0.25) { // Thiên lệch lớn (> 25%)
        // Nếu dự đoán Tài nhiều hơn thực tế
        if (taiPredictionRatio > taiResultRatio + 0.25) {
            return {
                type: "xỉu",
                weight: Math.min(10, Math.ceil(biasDifference * 20)),
                description: `Điều chỉnh thiên lệch: Đang dự đoán Tài quá nhiều (${(taiPredictionRatio*100).toFixed(0)}% vs ${(taiResultRatio*100).toFixed(0)}%)`
            };
        }
        // Nếu dự đoán Xỉu nhiều hơn thực tế
        else if (taiPredictionRatio + 0.25 < taiResultRatio) {
            return {
                type: "tài",
                weight: Math.min(10, Math.ceil(biasDifference * 20)),
                description: `Điều chỉnh thiên lệch: Đang dự đoán Xỉu quá nhiều (${((1-taiPredictionRatio)*100).toFixed(0)}% vs ${((1-taiResultRatio)*100).toFixed(0)}%)`
            };
        }
    }
    
    // Nếu lịch sử kết quả đang có xu hướng rõ rệt
    if (taiResultRatio > 0.65) {
        // Xu hướng đang là Tài, nhưng kiểm tra 5 kết quả gần nhất
        const recent5 = performanceData.slice(-5);
        let recentTaiResults = 0;
        
        for (const line of recent5) {
            if (line.includes("Số thực tế:") && line.includes("(Tài)")) {
                recentTaiResults++;
            }
        }
        
        // Nếu xu hướng gần đây vẫn mạnh
        if (recentTaiResults >= 3) {
            return {
                type: "tài",
                weight: 4,
                description: `Điều chỉnh theo xu hướng: Kết quả Tài đang chiếm ưu thế (${(taiResultRatio*100).toFixed(0)}%)`
            };
        }
    } else if (taiResultRatio < 0.35) {
        // Xu hướng đang là Xỉu, nhưng kiểm tra 5 kết quả gần nhất
        const recent5 = performanceData.slice(-5);
        let recentXiuResults = 0;
        
        for (const line of recent5) {
            if (line.includes("Số thực tế:") && line.includes("(Xỉu)")) {
                recentXiuResults++;
            }
        }
        
        // Nếu xu hướng gần đây vẫn mạnh
        if (recentXiuResults >= 3) {
            return {
                type: "xỉu",
                weight: 4,
                description: `Điều chỉnh theo xu hướng: Kết quả Xỉu đang chiếm ưu thế (${((1-taiResultRatio)*100).toFixed(0)}%)`
            };
        }
    }
    
    return null;
}

module.exports = predictNumbers;

/**
 * File cấu hình chung cho hệ thống dự đoán
 */

module.exports = {
    // Thông tin phiên bản
    version: "v4.0",
    
    // Trọng số mặc định cho các thuật toán
    defaultWeights: {
        CyclicalPattern: 0.65,        // Tăng từ 0.50 lên 0.65 - tối ưu cho tốc độ nhanh
        ShortAlternatingPattern: 0.25, // Giảm từ 0.40 xuống 0.25
        LongStreakPattern: 0.05,      // Giảm từ 0.10 xuống 0.05
        FastPatternDetector: 0.05     // Thêm thuật toán mới cho xổ số 45 giây
    },
    
    // Cấu hình phân tích
    analysis: {
        historyLimit: 25,             // Giảm từ 50 xuống 25 để tập trung vào lịch sử gần hơn
        minimumHistoryRequired: 5,    // Giữ nguyên min 5 kỳ để bắt đầu
        performanceWindow: 20,        // Giảm từ 30 xuống 20 - phù hợp cho chu kỳ nhanh
        confidenceThreshold: 0.72     // Thêm ngưỡng tin cậy - chỉ đặt cược khi tin cậy > 72%
    },
    
    // Cấu hình ghi log
    logging: {
        detailedLogs: true,
        predictionLogFile: './data/prediction_log.txt',
        methodPerformanceFile: './data/method_performance.json',
        skippedPredictionsLog: './data/skipped_predictions.txt' // Thêm log cho các dự đoán bị bỏ qua
    },
    
    // Cấu hình đặt cược
    betting: {
        initialBalance: 10000000,
        defaultBetAmount: 100000,
        maxConsecutiveLosses: 3,
        winMultiplier: 1.95,
        enableProgressiveBetting: true,
        betMultiplierAfterLoss: 1.5,
        enableSelective: true,       // Bật tính năng đặt cược chọn lọc
        maximumDailyBets: 500,       // Giới hạn số lần đặt cược mỗi ngày
        restPeriodAfterLosses: 5     // Số kỳ nghỉ sau một chuỗi thua
    },
    
    // Cấu hình cho xổ số 45 giây
    fastLottery: {
        enabled: true,               // Bật chế độ xổ số tốc độ cao
        cycleLength: 45,             // Thời gian chu kỳ (giây)
        patternDepth: 7,             // Giảm độ sâu phân tích mẫu (từ 10 xuống 7)
        adjustWeightsEvery: 30,      // Điều chỉnh trọng số mỗi 30 kỳ
        focusRecent: true            // Tập trung vào dữ liệu gần đây
    }
}; 
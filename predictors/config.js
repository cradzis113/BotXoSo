/**
 * File cấu hình thống nhất cho hệ thống dự đoán
 * Phiên bản: v7.1.0 - Cải tiến nhận diện bệt sớm
 */

const CONFIG = {
    // Thông tin phiên bản
    version: "v7.1.0",
    
    // Trọng số cho các thuật toán - dựa trên phân tích hiệu suất
    defaultWeights: {
        TaiXiuPatterns: 0.98,          // Phương pháp duy nhất sử dụng mẫu TX
    },
    
    // Cấu hình phân tích
    analysis: {
        historyLimit: 15,             // Tăng từ 10 lên 15 kỳ để hỗ trợ phát hiện bệt sớm
        minimumHistoryRequired: 5,    // Giữ nguyên min 5 kỳ để bắt đầu
        confidenceThreshold: 0.70,    // Giữ nguyên 0.70
        dynamicThreshold: true,       // Giữ tính năng ngưỡng tin cậy động theo giờ
        peakHoursThreshold: 0.65,     // Giữ nguyên 0.65
        peakHoursStart: 18,           // Giữ nguyên
        peakHoursEnd: 22,             // Giữ nguyên
        // Phát hiện bệt sớm - Tính năng mới v7.1.0
        earlyStreakDetection: {
            enabled: true,
            streakThreshold: 1.5,     // Ngưỡng phát hiện bệt
            minimumConfidence: 0.65,  // Độ tin cậy tối thiểu
            maximumConfidence: 0.92,  // Độ tin cậy tối đa
            weightDecayFactor: 0.75,  // Hệ số giảm trọng số theo thời gian
            momentumBoost: 0.5,       // Tăng cường cho đà phát triển
        }
    },
    
    // Cấu hình ghi log
    logging: {
        detailedLogs: true,
        predictionLogFile: './data/prediction_log.txt',
        reversalLogFile: './data/prediction_reversal_log.txt',
        performanceLogFile: './data/performance_log.txt'
    },
    
    // Cấu hình đặt cược
    betting: {
        initialBalance: 10000000,
        defaultBetAmount: 100000,
        maxConsecutiveLosses: 3,
        winMultiplier: 1.95,
        enableProgressiveBetting: true,
        betMultiplierAfterLoss: 1.3,
        dailyBetLimit: 20,           // Thay thế maximumDailyBets bằng dailyBetLimit
        restPeriodAfterLosses: 7,
        useKellyCriterion: true,
        kellyFraction: 0.25,
        maxRiskPerBet: 0.03,
        confidenceAdjustment: true,
        minConfidenceAfterLoss: 0.75,
        // Xử lý giai đoạn khó đoán
        difficultPeriodHandling: {
            enabled: true,
            accuracyThreshold: 0.4,
            recentAccuracyThreshold: 0.45,
            confidenceThreshold: 0.75,
            betAmountMultiplier: 0.7,
            minAccuracyToBet: 0.35,
            minSampleSize: 15
        }
    },
    
    // Cấu hình chống chuỗi thất bại liên tiếp
    streakBreaker: {
        enabled: true,
        maxConsecutiveFailures: 3,
        reverseAfterStreak: true,
        reversalScope: "all",
        maintainDirectionAfterLosses: true,
        longLossThreshold: 5,
        consecutiveDirectionCount: 3
    },
};

module.exports = CONFIG; 
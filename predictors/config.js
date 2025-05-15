/**
 * File cấu hình thống nhất cho hệ thống dự đoán
 * Phiên bản: v6.6.0
 */

const CONFIG = {
    // Thông tin phiên bản
    version: "v6.6.0",
    
    // Trọng số cho các thuật toán - dựa trên phân tích hiệu suất
    defaultWeights: {
        AdvancedCombination: 0.70,       // Tăng từ 0.60 lên 0.70
        CyclicalPattern: 0.13,           // Tăng từ 0.07 lên 0.13
        BetBreaker: 0.10,                // Tăng từ 0.08 lên 0.10
        FastPatternDetector: 0.01,       // Giảm từ 0.05 xuống 0.01
    },
    
    // Cấu hình phân tích
    analysis: {
        historyLimit: 10,             // Giữ nguyên 10 kỳ
        minimumHistoryRequired: 5,    // Giữ nguyên min 5 kỳ để bắt đầu
        confidenceThreshold: 0.68,    // Giữ nguyên 0.68
        dynamicThreshold: true,       // Giữ tính năng ngưỡng tin cậy động theo giờ
        peakHoursThreshold: 0.65,     // Giữ nguyên 0.65
        peakHoursStart: 18,           // Giữ nguyên
        peakHoursEnd: 22,             // Giữ nguyên
        // Phân tích xu hướng thống kê - Đã loại bỏ vì không hiệu quả
        statisticalAnalysis: {
            enabled: false,           // Vô hiệu hóa
            regressionThreshold: 0.2,  
            windowSize: 30,            
            minConfidence: 0.65,      
            maxConfidence: 0.85       
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
        enableSelective: true,
        maximumDailyBets: 200,
        restPeriodAfterLosses: 7,
        useKellyCriterion: true,
        kellyFraction: 0.25,
        maxRiskPerBet: 0.03,
        timeBasedBetting: true,
        morningBetMultiplier: 1.0,
        afternoonBetMultiplier: 0.8,
        eveningBetMultiplier: 1.0,
        nightBetMultiplier: 1.0,
        skipOnConsecutiveFailures: true,
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
        consecutiveDirectionCount: 3,
        // Cải tiến xử lý đảo ngược thích ứng
        adaptiveReversal: {
            enabled: true,
            activateAfterLosses: 4,
            confidenceBoost: 0.1,
            maxReversals: 3,
            minTimeBetweenReversals: 300000
        }
    },
    
    // Phát hiện và xử lý đặc biệt
    patternBreakers: {
        enabled: true,
        specialPatterns: {
            "TTT": { action: "predict", value: "X", confidence: 0.82 },
            "XXX": { action: "predict", value: "T", confidence: 0.82 },
            "TTTT": { action: "predict", value: "X", confidence: 0.85 },
            "XXXX": { action: "predict", value: "T", confidence: 0.85 },
            "TXTXT": { action: "predict", value: "X", confidence: 0.8 },
            "XTXTX": { action: "predict", value: "T", confidence: 0.8 },
            // Mẫu đặc biệt cho chuỗi bệt
            "TTTX": { action: "predict", value: "X", confidence: 0.83 },
            "XXXT": { action: "predict", value: "T", confidence: 0.83 },
            "TXTTXT": { action: "predict", value: "T", confidence: 0.81 },
            "XTXXTX": { action: "predict", value: "X", confidence: 0.81 }
        }
    },
    
    // Phát hiện và xử lý chuỗi bệt tài/xỉu
    betDetector: {
        enabled: true,
        // Phát hiện chuỗi bệt
        detection: {
            minBetLength: 3,
            earlyDetectionThreshold: 2,
            detectionWindowSize: 5,
            confidentBetLength: 4,
            checkSpecialHours: true,
            betTaiHours: [16, 17, 19, 20],
            betXiuHours: [14, 15, 18, 21]
        },
        // Chiến lược đối phó
        strategy: {
            reverseAfterBet: true,
            increaseConfidence: true,
            confidenceBoost: 0.12,
            forceMethod: "BetBreaker",
            skipAfterIncorrect: 1,
            adaptiveInversion: true,
            earlyDetectionConfidence: 0.72,
            confidentDetectionConfidence: 0.85
        },
        // Phát hiện và xử lý chuỗi bệt đặc biệt
        specialBetPatterns: {
            "TTTTT": { action: "reverse", confidence: 0.90 },
            "XXXXX": { action: "reverse", confidence: 0.90 },
            "TTTTX": { action: "continue", confidence: 0.88 },
            "XXXXТ": { action: "continue", confidence: 0.88 }
        }
    },
    
    // Phân tích theo khung giờ - Đã điều chỉnh
    timeAnalysis: {
        enabled: false,  // Tắt vì không hiệu quả
        minSamplesRequired: 20,
        segments: {
            morning: { 
                enabled: false,
                defaultPredictTai: false,
                confidenceBoost: 0.05
            },
            afternoon: { 
                enabled: false,
                defaultPredictTai: true,
                confidenceBoost: 0.02
            },
            evening: { 
                enabled: false,
                defaultPredictTai: false,
                confidenceBoost: 0.00
            },
            night: { 
                enabled: false,
                defaultPredictTai: true,
                confidenceBoost: 0.04
            }
        }
    },
    
    // Phát hiện sự kiện đặc biệt
    specialEventDetection: {
        enabled: true,
        patternReplication: {
            windowSize: 10,
            minMatchRequired: 3,
            baseConfidence: 0.75,
            confidencePerMatch: 0.05
        },
        // Phát hiện sự kiện không điển hình
        anomalyDetection: {
            enabled: true,
            windowSize: 20,
            thresholdDeviation: 2.0,
            minConfidence: 0.7
        }
    }
};

// Export cấu hình ra ngoài
module.exports = CONFIG; 
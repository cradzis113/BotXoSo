const connectDB = require('./config/database');
const dataCollector = require('./collectors/dataCollector');
const dataStorage = require('./database/dataStorage');
const { getAvailableStrategies, getCurrentStrategy } = require('./predictors/strategies');
const { predict, predictMultiple } = require('./predictors');
const { getAllLotteryNumbers } = require('./database/dataAccess');
const { openBettingPage, launchBrowser, getCountDownTime } = require('./betAutomatic');
const { savePrediction } = require('./predictors/fileUtils');
const { aggregatePredictions } = require('./predictors/predictionAggregator');

// Cấu hình dự đoán
const PREDICTION_CONFIG = {
  position: 0,                    // Vị trí cần dự đoán (0-4)
  useMultipleStrategies: true,   // true: dùng nhiều chiến lược, false: dùng 1 chiến lược
  strategy: 'short'    // 'auto' để tự động chọn theo giờ, hoặc tên chiến lược cụ thể
};

async function main() {
  try {
    await connectDB();
    await dataCollector.initialize();

    // Hiển thị các chiến lược dự đoán có sẵn
    const strategies = getAvailableStrategies();
    console.log('📋 Các chiến lược dự đoán có sẵn:');
    Object.keys(strategies).forEach(key => {
      console.log(`   - ${key}: ${strategies[key]}`);
    });
    
    if (PREDICTION_CONFIG.useMultipleStrategies) {
      console.log(`\n👉 Đang sử dụng tất cả ${Object.keys(strategies).length} chiến lược`);
    } else {
      if (PREDICTION_CONFIG.strategy === 'auto') {
        const currentStrategy = getCurrentStrategy();
        console.log(`\n👉 Đang sử dụng chế độ tự động`);
        console.log(`   Chiến lược hiện tại (${new Date().toLocaleTimeString()}): ${currentStrategy}`);
      } else {
        console.log(`\n👉 Đang sử dụng chiến lược: ${PREDICTION_CONFIG.strategy}`);
        if (!strategies[PREDICTION_CONFIG.strategy]) {
          console.error(`❌ Lỗi: Chiến lược "${PREDICTION_CONFIG.strategy}" không tồn tại!`);
          console.log('Các chiến lược hợp lệ:', Object.keys(strategies).join(', '));
          process.exit(1);
        }
      }
    }

    setInterval(async () => {
      try {
        const lotteryData = await dataCollector.getLotteryResults();
        await dataStorage.saveNumbers(lotteryData);
      } catch (error) {
        console.error('❌ Lỗi trong lúc lấy hoặc lưu dữ liệu:', error);
      }
    }, 5000);
    
    const browser = await launchBrowser();
    const page = await openBettingPage(browser);
    
    getCountDownTime(
      page, 
      getAllLotteryNumbers, 
      async (history) => {
        try {
          let finalPredictionObject;

          if (PREDICTION_CONFIG.useMultipleStrategies) {
            // Sử dụng nhiều chiến lược
            const predictions = await predictMultiple(history, PREDICTION_CONFIG.position);
            
            // Lấy lịch sử dự đoán của các chiến lược
            const strategyHistory = {}; // TODO: Implement strategy history tracking
            
            // Sử dụng phương pháp tổng hợp mới
            const aggregatedResult = aggregatePredictions(predictions, strategyHistory);
            
            console.log('\n🎊 Dự đoán cuối cùng:', aggregatedResult.prediction);
            console.log(`   Độ tin cậy: ${(aggregatedResult.confidence * 100).toFixed(1)}%`);
            console.log(`   Chi tiết: ${aggregatedResult.details}\n`);
            
            // Hiển thị điểm số cho từng số
            console.log('   Phân tích điểm số:');
            aggregatedResult.scores.forEach((score, number) => {
              if (score > 0) {
                console.log(`   ${number}: ${score.toFixed(3)} điểm`);
              }
            });
            
            finalPredictionObject = {
              drawId: predictions[0].drawId,
              numbers: predictions[0].numbers.map((n, i) => 
                i === PREDICTION_CONFIG.position ? aggregatedResult.prediction : n
              ),
              detail: {
                index: PREDICTION_CONFIG.position,
                prediction: aggregatedResult.prediction,
                reason: aggregatedResult.details,
                strategy: 'multiStrategy',
                usedStrategy: 'advancedAggregation',
                timeBasedStrategy: true,
                confidence: aggregatedResult.confidence,
                scores: aggregatedResult.scores,
                predictions: predictions.reduce((acc, p) => {
                  acc[p.detail.usedStrategy] = {
                    value: p.detail.prediction,
                    reason: p.detail.reason
                  };
                  return acc;
                }, {})
              },
              timestamp: new Date().toISOString()
            };
          } else {
            // Sử dụng một chiến lược duy nhất
            const selectedStrategy = PREDICTION_CONFIG.strategy === 'auto' ? 
              getCurrentStrategy() : PREDICTION_CONFIG.strategy;

            finalPredictionObject = await predict(history, PREDICTION_CONFIG.position, selectedStrategy);
            
            if (PREDICTION_CONFIG.strategy === 'auto') {
              console.log('\n🎊 Dự đoán:', finalPredictionObject.detail.prediction);
              console.log(`   Chiến lược tự động (${new Date().toLocaleTimeString()}): ${selectedStrategy}`);
              console.log(`   Lý do: ${finalPredictionObject.detail.reason}\n`);
            } else {
              console.log('\n🎊 Dự đoán:', finalPredictionObject.detail.prediction);
              console.log(`   Chiến lược: ${PREDICTION_CONFIG.strategy}`);
              console.log(`   Lý do: ${finalPredictionObject.detail.reason}\n`);
            }
          }

          // Lưu dự đoán cuối cùng vào file
          await savePrediction(finalPredictionObject);
          console.log('💾 Đã lưu dự đoán vào file');
          
          return finalPredictionObject;
        } catch (error) {
          console.error('❌ Lỗi khi tạo dự đoán:', error);
          return null;
        }
      },
      PREDICTION_CONFIG.position // Chỉ truyền position, không truyền strategy
    );

    process.on('SIGINT', async () => {
      console.log('🔄 Đang đóng ứng dụng...');
      await dataCollector.close();
      console.log('👋 Đã đóng tất cả kết nối. Thoát.');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Lỗi khởi tạo ứng dụng:', error.message);
    process.exit(1);
  }
}

console.log('🚀 Khởi động ứng dụng dự đoán kết quả xổ số...');
main();
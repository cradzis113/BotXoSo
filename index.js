const connectDB = require('./config/database');
const dataCollector = require('./collectors/dataCollector');
const dataStorage = require('./database/dataStorage');
const { getAvailableStrategies, getCurrentStrategy } = require('./predictors/strategies');
const { predict, predictMultiple } = require('./predictors');
const { getAllLotteryNumbers } = require('./database/dataAccess');
const { openBettingPage, launchBrowser, getCountDownTime } = require('./betAutomatic');
const { savePrediction } = require('./predictors/fileUtils');

// Cấu hình dự đoán
const PREDICTION_CONFIG = {
  position: 0,                    // Vị trí cần dự đoán (0-4)
  useMultipleStrategies: false,   // true: dùng nhiều chiến lược, false: dùng 1 chiến lược
  strategy: 'default'    // 'auto' để tự động chọn theo giờ, hoặc tên chiến lược cụ thể
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
            
            // Tính toán dự đoán cuối cùng
            const predictionCounts = {};
            predictions.forEach(p => {
              predictionCounts[p.detail.prediction] = (predictionCounts[p.detail.prediction] || 0) + 1;
            });
            
            const finalPrediction = Object.entries(predictionCounts)
              .reduce((a, b) => (b[1] > a[1] ? b : a))[0];
            
            const finalCount = Object.entries(predictionCounts)
              .filter(([num]) => num === finalPrediction)
              .map(([_, count]) => count)[0];
            
            // Tạo mô tả chi tiết về kết quả bình chọn
            const voteDetails = Object.entries(predictionCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([num, count]) => `${num}: ${count} phiếu`)
              .join(', ');
            
            console.log('\n🎊 Dự đoán cuối cùng:', finalPrediction);
            console.log(`   (${finalCount}/${predictions.length} chiến lược - ${(finalCount/predictions.length*100).toFixed(1)}%)`);
            console.log(`   Chi tiết bình chọn: ${voteDetails}\n`);
            
            finalPredictionObject = {
              drawId: predictions[0].drawId,
              numbers: predictions[0].numbers.map((n, i) => 
                i === PREDICTION_CONFIG.position ? finalPrediction : n
              ),
              detail: {
                index: PREDICTION_CONFIG.position,
                prediction: parseInt(finalPrediction),
                reason: `Kết quả bình chọn từ ${predictions.length} chiến lược (${voteDetails})`,
                strategy: 'multiStrategy',
                usedStrategy: 'multiVoting',
                timeBasedStrategy: false,
                votingDetails: predictionCounts,
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
      }
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
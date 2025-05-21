const connectDB = require('./config/database');
const dataCollector = require('./collectors/dataCollector');
const dataStorage = require('./database/dataStorage');
const predictors = require('./predictors/index');
const { getAllLotteryNumbers } = require('./database/dataAccess');
const { openBettingPage, launchBrowser, getCountDownTime } = require('./betAutomatic');

// Cấu hình cho thuật toán dự đoán - có thể dễ dàng thay đổi ở đây
const PREDICTION_CONFIG = {
  // Vị trí cần dự đoán (0-4)
  position: 0,
  
  // Chiến lược dự đoán:
  // - 'default': Sử dụng 10 kết quả gần nhất
  // - 'short': Sử dụng 5 kết quả gần nhất
  // - 'veryshort': Sử dụng 3 kết quả gần nhất
  // - 'combined': Kết hợp phân tích xu hướng ngắn hạn và dài hạn
  // - 'auto': Tự động chọn chiến lược dựa trên khung giờ
  strategy: 'auto'  // Thay đổi ở đây để sử dụng chiến lược khác
};

async function main() {
  try {
    await connectDB();
    await dataCollector.initialize();

    // Hiển thị các chiến lược dự đoán có sẵn
    const strategies = predictors.getAvailableStrategies();
    console.log('📋 Các chiến lược dự đoán có sẵn:');
    Object.keys(strategies).forEach(key => {
      const strategy = strategies[key];
      console.log(`   - ${key}: ${strategy.name} (${strategy.description})`);
    });
    
    console.log(`👉 Đang sử dụng chiến lược: ${PREDICTION_CONFIG.strategy}`);

    setInterval(async () => {
      try {
        const lotteryData = await dataCollector.getLotteryResults();
        await dataStorage.saveNumbers(lotteryData);
        
        // Không cần gọi verify riêng nữa vì hàm predict đã tự động xác nhận kết quả

      } catch (error) {
        console.error('❌ Lỗi trong lúc lấy hoặc lưu dữ liệu:', error);
      }
    }, 5000);
    
    const browser = await launchBrowser();
    const page = await openBettingPage(browser);
    
    // Truyền trực tiếp predict, position và strategy
    getCountDownTime(
      page, 
      getAllLotteryNumbers, 
      predictors.predict,
      PREDICTION_CONFIG.position,
      PREDICTION_CONFIG.strategy
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
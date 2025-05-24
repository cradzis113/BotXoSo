const connectDB = require('./config/database');
const dataCollector = require('./collectors/dataCollector');
const dataStorage = require('./database/dataStorage');
const { getAvailableStrategies } = require('./predictors/strategies');
const { predict } = require('./predictors');
const { getAllLotteryNumbers } = require('./database/dataAccess');
const { openBettingPage, launchBrowser, getCountDownTime } = require('./betAutomatic');

const PREDICTION_CONFIG = {
  position: 0,
  strategy: 'auto'  
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
      predict,
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
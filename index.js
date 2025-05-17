/**
 * BotXoSo - Hệ thống dự đoán tự động Tài/Xỉu
 * Phiên bản v7.1.0 - Cải tiến phát hiện bệt sớm và phân tích xu hướng
 * Tính năng mới:
 * - Phát hiện sớm các chuỗi bệt đang hình thành
 * - Phân tích độ mạnh và xu hướng kết quả
 * - Nhận diện các mẫu đặc biệt từ dữ liệu thực tế
 * - Cải thiện khả năng dự đoán sau các chuỗi bệt dài
 */

const connectDB = require('./config/database');
const dataCollector = require('./collectors/dataCollector');
const dataStorage = require('./database/dataStorage');
const predictors = require('./predictors/index');
const { getAllLotteryNumbers } = require('./database/dataAccess');
const { openBettingPage, launchBrowser, getCountDownTime, deleteServiceFloat } = require('./betAutomatic');

async function main() {
  try {
    await connectDB();
    await dataCollector.initialize();

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
    deleteServiceFloat(page)
    getCountDownTime(page, getAllLotteryNumbers, predictors.predict)

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
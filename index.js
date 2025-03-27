const watchCountdown = require('./countdownWatcher');
const connectDB = require('./service/database');
const scraper = require('./scraper');
const saveNumbers = require('./saveNumber');

async function main() {
  try {
    await connectDB();
    await scraper.initialize();
    await watchCountdown()

    setInterval(async () => {
      try {
        const opencodeArrays = await scraper.getNumbers();

        await saveNumbers.saveNumbers(opencodeArrays);
      } catch (error) {
        console.error('Lỗi trong lúc lấy hoặc lưu dữ liệu:', error);
      }
    }, 5000);

    process.on('SIGINT', async () => {
      console.log('Đóng ứng dụng...');
      await scraper.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Lỗi khởi tạo ứng dụng:', error);
    process.exit(1);
  }
}

main();
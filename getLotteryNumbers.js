const Lottery = require('./model/lotteryModel');

async function getLotteryNumbers() {
    try {
        // Không chỉ định trường cụ thể để lấy tất cả dữ liệu
        const records = await Lottery.find().sort({ createdAt: -1 });
        return records;
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error);
        return [];
    }
}

module.exports = getLotteryNumbers;

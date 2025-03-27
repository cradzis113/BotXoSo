const Lottery = require('./model/lotteryModel');

async function getLotteryNumbers() {
    try {
        const records = await Lottery.find({}, 'numbers');
        return records.map(record => record.numbers);
    } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error);
        return [];
    }
}

module.exports = getLotteryNumbers;

const Lottery = require('./model/lotteryModel');

async function saveNumbers(numbersArrays) {
    numbersArrays.reverse();

    for (const numbersArray of numbersArrays) {
        try {
            const exists = await Lottery.findOne({ numbers: numbersArray });

            if (!exists) {
                const count = await Lottery.countDocuments();

                if (count >= 500) {
                    const oldestRecord = await Lottery.findOne().sort({ timestamp: 1 });
                    if (oldestRecord) {
                        await Lottery.deleteOne({ _id: oldestRecord._id });
                        console.log('Đã xóa bản ghi cũ nhất:', oldestRecord.numbers);
                    }
                }

                const lotteryRecord = new Lottery({ numbers: numbersArray });
                await lotteryRecord.save();
                console.log('Đã lưu:', numbersArray);
            } else {
                console.log('Đã tồn tại:', numbersArray);
            }
        } catch (err) {
            console.error('Lỗi khi lưu vào DB:', err);
        }
    }
}

// Lấy tất cả bản ghi
async function getAllNumbers() {
    return await Lottery.find().sort({ timestamp: -1 });
}

// Lấy n bản ghi mới nhất
async function getLatestNumbers(limit = 10) {
    return await Lottery.find().sort({ timestamp: -1 }).limit(limit);
}

module.exports = {
    saveNumbers,
    getAllNumbers,
    getLatestNumbers
};
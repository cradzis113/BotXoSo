const mongoose = require("mongoose");

const LotterySchema = new mongoose.Schema({
    numbers: { type: [Number], required: true },
}, { timestamps: true });  // Tự động thêm createdAt & updatedAt

const Lottery = mongoose.model("Lottery", LotterySchema);
module.exports = Lottery;

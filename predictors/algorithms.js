/**
 * Các thuật toán dự đoán kết quả xổ số
 */

/**
 * Thuật toán theo xu hướng đơn giản
 * Phân tích mẫu và xu hướng dựa trên lịch sử kết quả gần đây
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @returns {Object} Kết quả dự đoán
 */
function simpleFollowTrend(history, position) {
  if (!history || history.length === 0) {
    // Nếu không có dữ liệu lịch sử, trả về dự đoán ngẫu nhiên
    const randomPrediction = Math.floor(Math.random() * 10);
    return {
      prediction: randomPrediction,
      reason: "Không có dữ liệu trước, dự đoán ngẫu nhiên " + (randomPrediction >= 5 ? "(Tài)" : "(Xỉu)"),
      strategy: "SimpleFollowTrend"
    };
  }

  // Lấy các kết quả gần đây nhất (10 kết quả nếu có)
  const recentResults = history.slice(0, 10).map(item => parseInt(item.numbers[position]));
  
  // Phân tích xu hướng
  let countBig = 0; // Đếm số lượng "Tài" (5-9)
  let countSmall = 0; // Đếm số lượng "Xỉu" (0-4)
  
  recentResults.forEach(num => {
    if (num >= 5) countBig++;
    else countSmall++;
  });
  
  let prediction;
  let reason;
  
  if (countBig > countSmall) {
    // Nếu xu hướng là Tài, dự đoán số Tài
    prediction = 5 + Math.floor(Math.random() * 5); // 5-9
    reason = `Xu hướng Tài (${countBig}/${recentResults.length}), dự đoán Tài`;
  } else if (countSmall > countBig) {
    // Nếu xu hướng là Xỉu, dự đoán số Xỉu
    prediction = Math.floor(Math.random() * 5); // 0-4
    reason = `Xu hướng Xỉu (${countSmall}/${recentResults.length}), dự đoán Xỉu`;
  } else {
    // Nếu bằng nhau, phân tích theo số mới nhất
    const lastResult = recentResults[0];
    if (lastResult >= 5) {
      // Nếu kết quả gần nhất là Tài, dự đoán ngược lại là Xỉu
      prediction = Math.floor(Math.random() * 5); // 0-4
      reason = `Xu hướng cân bằng, kết quả gần nhất là Tài (${lastResult}), dự đoán Xỉu`;
    } else {
      // Nếu kết quả gần nhất là Xỉu, dự đoán ngược lại là Tài
      prediction = 5 + Math.floor(Math.random() * 5); // 5-9
      reason = `Xu hướng cân bằng, kết quả gần nhất là Xỉu (${lastResult}), dự đoán Tài`;
    }
  }
  
  return {
    prediction,
    reason,
    strategy: "SimpleFollowTrend"
  };
}

/**
 * Thuật toán theo xu hướng đơn giản - Phiên bản ngắn hạn (5 kết quả)
 * Phân tích mẫu và xu hướng dựa trên 5 kết quả gần đây nhất
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @returns {Object} Kết quả dự đoán
 */
function simpleFollowTrendShort(history, position) {
  if (!history || history.length === 0) {
    // Nếu không có dữ liệu lịch sử, trả về dự đoán ngẫu nhiên
    const randomPrediction = Math.floor(Math.random() * 10);
    return {
      prediction: randomPrediction,
      reason: "Không có dữ liệu trước, dự đoán ngẫu nhiên " + (randomPrediction >= 5 ? "(Tài)" : "(Xỉu)"),
      strategy: "SimpleFollowTrendShort"
    };
  }

  // Lấy 5 kết quả gần đây nhất
  const recentResults = history.slice(0, 5).map(item => parseInt(item.numbers[position]));
  
  // Phân tích xu hướng
  let countBig = 0; // Đếm số lượng "Tài" (5-9)
  let countSmall = 0; // Đếm số lượng "Xỉu" (0-4)
  
  recentResults.forEach(num => {
    if (num >= 5) countBig++;
    else countSmall++;
  });
  
  let prediction;
  let reason;
  
  if (countBig > countSmall) {
    // Nếu xu hướng là Tài, dự đoán số Tài
    prediction = 5 + Math.floor(Math.random() * 5); // 5-9
    reason = `Xu hướng ngắn hạn Tài (${countBig}/${recentResults.length}), dự đoán Tài`;
  } else if (countSmall > countBig) {
    // Nếu xu hướng là Xỉu, dự đoán số Xỉu
    prediction = Math.floor(Math.random() * 5); // 0-4
    reason = `Xu hướng ngắn hạn Xỉu (${countSmall}/${recentResults.length}), dự đoán Xỉu`;
  } else {
    // Nếu bằng nhau, phân tích theo số mới nhất
    const lastResult = recentResults[0];
    if (lastResult >= 5) {
      // Nếu kết quả gần nhất là Tài, dự đoán ngược lại là Xỉu
      prediction = Math.floor(Math.random() * 5); // 0-4
      reason = `Xu hướng ngắn hạn cân bằng, kết quả gần nhất là Tài (${lastResult}), dự đoán Xỉu`;
    } else {
      // Nếu kết quả gần nhất là Xỉu, dự đoán ngược lại là Tài
      prediction = 5 + Math.floor(Math.random() * 5); // 5-9
      reason = `Xu hướng ngắn hạn cân bằng, kết quả gần nhất là Xỉu (${lastResult}), dự đoán Tài`;
    }
  }
  
  return {
    prediction,
    reason,
    strategy: "SimpleFollowTrendShort"
  };
}

/**
 * Thuật toán theo xu hướng đơn giản - Phiên bản rất ngắn hạn (3 kết quả)
 * Phân tích mẫu và xu hướng dựa trên 3 kết quả gần đây nhất
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @returns {Object} Kết quả dự đoán
 */
function simpleFollowTrendVeryShort(history, position) {
  if (!history || history.length === 0) {
    // Nếu không có dữ liệu lịch sử, trả về dự đoán ngẫu nhiên
    const randomPrediction = Math.floor(Math.random() * 10);
    return {
      prediction: randomPrediction,
      reason: "Không có dữ liệu trước, dự đoán ngẫu nhiên " + (randomPrediction >= 5 ? "(Tài)" : "(Xỉu)"),
      strategy: "SimpleFollowTrendVeryShort"
    };
  }

  // Lấy 3 kết quả gần đây nhất
  const recentResults = history.slice(0, 3).map(item => parseInt(item.numbers[position]));
  
  // Phân tích xu hướng
  let countBig = 0; // Đếm số lượng "Tài" (5-9)
  let countSmall = 0; // Đếm số lượng "Xỉu" (0-4)
  
  recentResults.forEach(num => {
    if (num >= 5) countBig++;
    else countSmall++;
  });
  
  let prediction;
  let reason;
  
  if (countBig > countSmall) {
    // Nếu xu hướng là Tài, dự đoán số Tài
    prediction = 5 + Math.floor(Math.random() * 5); // 5-9
    reason = `Xu hướng rất ngắn hạn Tài (${countBig}/${recentResults.length}), dự đoán Tài`;
  } else if (countSmall > countBig) {
    // Nếu xu hướng là Xỉu, dự đoán số Xỉu
    prediction = Math.floor(Math.random() * 5); // 0-4
    reason = `Xu hướng rất ngắn hạn Xỉu (${countSmall}/${recentResults.length}), dự đoán Xỉu`;
  } else {
    // Nếu bằng nhau, phân tích theo số mới nhất
    const lastResult = recentResults[0];
    if (lastResult >= 5) {
      // Nếu kết quả gần nhất là Tài, dự đoán ngược lại là Xỉu
      prediction = Math.floor(Math.random() * 5); // 0-4
      reason = `Xu hướng rất ngắn hạn cân bằng, kết quả gần nhất là Tài (${lastResult}), dự đoán Xỉu`;
    } else {
      // Nếu kết quả gần nhất là Xỉu, dự đoán ngược lại là Tài
      prediction = 5 + Math.floor(Math.random() * 5); // 5-9
      reason = `Xu hướng rất ngắn hạn cân bằng, kết quả gần nhất là Xỉu (${lastResult}), dự đoán Tài`;
    }
  }
  
  return {
    prediction,
    reason,
    strategy: "SimpleFollowTrendVeryShort"
  };
}

/**
 * Thuật toán kết hợp xu hướng ngắn hạn và dài hạn
 * Phân tích mẫu từ 5 kết quả gần nhất và 10 kết quả gần nhất
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @returns {Object} Kết quả dự đoán
 */
function simpleFollowTrendCombined(history, position) {
  if (!history || history.length === 0) {
    // Nếu không có dữ liệu lịch sử, trả về dự đoán ngẫu nhiên
    const randomPrediction = Math.floor(Math.random() * 10);
    return {
      prediction: randomPrediction,
      reason: "Không có dữ liệu trước, dự đoán ngẫu nhiên " + (randomPrediction >= 5 ? "(Tài)" : "(Xỉu)"),
      strategy: "SimpleFollowTrendCombined"
    };
  }

  // Lấy 5 kết quả gần đây nhất cho xu hướng ngắn hạn
  const shortTermResults = history.slice(0, 5).map(item => parseInt(item.numbers[position]));
  
  // Lấy 10 kết quả gần đây nhất cho xu hướng dài hạn
  const longTermResults = history.slice(0, 10).map(item => parseInt(item.numbers[position]));
  
  // Phân tích xu hướng ngắn hạn
  let shortTermBig = 0;
  let shortTermSmall = 0;
  
  shortTermResults.forEach(num => {
    if (num >= 5) shortTermBig++;
    else shortTermSmall++;
  });
  
  // Phân tích xu hướng dài hạn
  let longTermBig = 0;
  let longTermSmall = 0;
  
  longTermResults.forEach(num => {
    if (num >= 5) longTermBig++;
    else longTermSmall++;
  });
  
  // Xác định xu hướng ngắn hạn và dài hạn
  const shortTermTrend = shortTermBig > shortTermSmall ? "Tài" : (shortTermSmall > shortTermBig ? "Xỉu" : "Cân bằng");
  const longTermTrend = longTermBig > longTermSmall ? "Tài" : (longTermSmall > longTermBig ? "Xỉu" : "Cân bằng");
  
  let prediction;
  let reason;
  
  // Kiểm tra sự thay đổi xu hướng
  const trendShift = shortTermTrend !== "Cân bằng" && longTermTrend !== "Cân bằng" && shortTermTrend !== longTermTrend;
  
  if (trendShift) {
    // Nếu xu hướng ngắn hạn khác xu hướng dài hạn, ưu tiên xu hướng ngắn hạn
    if (shortTermTrend === "Tài") {
      prediction = 5 + Math.floor(Math.random() * 5); // 5-9
      reason = `Phát hiện thay đổi xu hướng từ ${longTermTrend} (${longTermBig}/${longTermResults.length}) sang ${shortTermTrend} (${shortTermBig}/${shortTermResults.length}), dự đoán Tài`;
    } else {
      prediction = Math.floor(Math.random() * 5); // 0-4
      reason = `Phát hiện thay đổi xu hướng từ ${longTermTrend} (${longTermBig}/${longTermResults.length}) sang ${shortTermTrend} (${shortTermSmall}/${shortTermResults.length}), dự đoán Xỉu`;
    }
  } else if (shortTermTrend !== "Cân bằng") {
    // Nếu xu hướng ngắn hạn rõ ràng, ưu tiên xu hướng ngắn hạn
    if (shortTermTrend === "Tài") {
      prediction = 5 + Math.floor(Math.random() * 5); // 5-9
      reason = `Xu hướng ngắn hạn mạnh: Tài (${shortTermBig}/${shortTermResults.length}), dự đoán Tài`;
    } else {
      prediction = Math.floor(Math.random() * 5); // 0-4
      reason = `Xu hướng ngắn hạn mạnh: Xỉu (${shortTermSmall}/${shortTermResults.length}), dự đoán Xỉu`;
    }
  } else if (longTermTrend !== "Cân bằng") {
    // Nếu chỉ xu hướng dài hạn rõ ràng, sử dụng xu hướng dài hạn
    if (longTermTrend === "Tài") {
      prediction = 5 + Math.floor(Math.random() * 5); // 5-9
      reason = `Xu hướng dài hạn: Tài (${longTermBig}/${longTermResults.length}), dự đoán Tài`;
    } else {
      prediction = Math.floor(Math.random() * 5); // 0-4
      reason = `Xu hướng dài hạn: Xỉu (${longTermSmall}/${longTermResults.length}), dự đoán Xỉu`;
    }
  } else {
    // Nếu cả hai xu hướng đều cân bằng, xem xét kết quả gần nhất
    const lastResult = shortTermResults[0];
    if (lastResult >= 5) {
      // Nếu kết quả gần nhất là Tài, dự đoán ngược lại là Xỉu
      prediction = Math.floor(Math.random() * 5); // 0-4
      reason = `Không có xu hướng rõ ràng, kết quả gần nhất là Tài (${lastResult}), dự đoán Xỉu`;
    } else {
      // Nếu kết quả gần nhất là Xỉu, dự đoán ngược lại là Tài
      prediction = 5 + Math.floor(Math.random() * 5); // 5-9
      reason = `Không có xu hướng rõ ràng, kết quả gần nhất là Xỉu (${lastResult}), dự đoán Tài`;
    }
  }
  
  return {
    prediction,
    reason,
    strategy: "SimpleFollowTrendCombined"
  };
}

module.exports = {
  simpleFollowTrend,
  simpleFollowTrendShort,
  simpleFollowTrendVeryShort,
  simpleFollowTrendCombined
}; 
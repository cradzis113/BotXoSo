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
    const randomPrediction = Math.floor(Math.random() * 10);
    return {
      prediction: randomPrediction,
      reason: "Không có dữ liệu trước, dự đoán ngẫu nhiên " + (randomPrediction >= 5 ? "(Tài)" : "(Xỉu)"),
      strategy: "SimpleFollowTrend"
    };
  }

  const recentResults = history.slice(0, 10).map(item => parseInt(item.numbers[position]));
  
  let countBig = 0;
  let countSmall = 0;
  
  recentResults.forEach(num => {
    if (num >= 5) countBig++;
    else countSmall++;
  });
  
  let prediction;
  let reason;
  
  if (countBig > countSmall) {
    prediction = 5 + Math.floor(Math.random() * 5);
    reason = `Xu hướng Tài (${countBig}/${recentResults.length}), dự đoán Tài`;
  } else if (countSmall > countBig) {
    prediction = Math.floor(Math.random() * 5);
    reason = `Xu hướng Xỉu (${countSmall}/${recentResults.length}), dự đoán Xỉu`;
  } else {
    const lastResult = recentResults[0];
    if (lastResult >= 5) {
      prediction = Math.floor(Math.random() * 5);
      reason = `Xu hướng cân bằng, kết quả gần nhất là Tài (${lastResult}), dự đoán Xỉu`;
    } else {
      prediction = 5 + Math.floor(Math.random() * 5);
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
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @returns {Object} Kết quả dự đoán
 */
function simpleFollowTrendShort(history, position) {
  if (!history || history.length === 0) {
    const randomPrediction = Math.floor(Math.random() * 10);
    return {
      prediction: randomPrediction,
      reason: "Không có dữ liệu trước, dự đoán ngẫu nhiên " + (randomPrediction >= 5 ? "(Tài)" : "(Xỉu)"),
      strategy: "SimpleFollowTrendShort"
    };
  }

  const recentResults = history.slice(0, 5).map(item => parseInt(item.numbers[position]));
  
  let countBig = 0;
  let countSmall = 0;
  
  recentResults.forEach(num => {
    if (num >= 5) countBig++;
    else countSmall++;
  });
  
  let prediction;
  let reason;
  
  if (countBig > countSmall) {
    prediction = 5 + Math.floor(Math.random() * 5);
    reason = `Xu hướng ngắn hạn Tài (${countBig}/${recentResults.length}), dự đoán Tài`;
  } else if (countSmall > countBig) {
    prediction = Math.floor(Math.random() * 5);
    reason = `Xu hướng ngắn hạn Xỉu (${countSmall}/${recentResults.length}), dự đoán Xỉu`;
  } else {
    const lastResult = recentResults[0];
    if (lastResult >= 5) {
      prediction = Math.floor(Math.random() * 5);
      reason = `Xu hướng ngắn hạn cân bằng, kết quả gần nhất là Tài (${lastResult}), dự đoán Xỉu`;
    } else {
      prediction = 5 + Math.floor(Math.random() * 5);
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
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @returns {Object} Kết quả dự đoán
 */
function simpleFollowTrendVeryShort(history, position) {
  if (!history || history.length === 0) {
    const randomPrediction = Math.floor(Math.random() * 10);
    return {
      prediction: randomPrediction,
      reason: "Không có dữ liệu trước, dự đoán ngẫu nhiên " + (randomPrediction >= 5 ? "(Tài)" : "(Xỉu)"),
      strategy: "SimpleFollowTrendVeryShort"
    };
  }

  const recentResults = history.slice(0, 7).map(item => parseInt(item.numbers[position])); // Tăng từ 5 lên 7 kết quả
  
  // Phân tích 3 kết quả gần nhất (siêu ngắn hạn)
  const veryRecentResults = recentResults.slice(0, 3);
  let countBig = 0;
  let countSmall = 0;
  
  veryRecentResults.forEach(num => {
    if (num >= 5) countBig++;
    else countSmall++;
  });

  // Phân tích mô hình số
  const isAscending = veryRecentResults.every((num, i) => i === 0 || num > veryRecentResults[i - 1]);
  const isDescending = veryRecentResults.every((num, i) => i === 0 || num < veryRecentResults[i - 1]);
  const hasExtremeDiff = Math.abs(veryRecentResults[0] - veryRecentResults[1]) >= 4 || 
                        Math.abs(veryRecentResults[1] - veryRecentResults[2]) >= 4;
  
  // Kiểm tra các trường hợp đặc biệt trước
  // Trường hợp 1: 3 kết quả giống nhau liên tiếp, rất có khả năng sẽ đổi chiều
  if (countBig === 3 || countSmall === 3) {
    // Nếu 3 kết quả liên tiếp đều là Tài, dự đoán tiếp theo là Xỉu và ngược lại
    if (countBig === 3) {
      return {
        prediction: Math.floor(Math.random() * 5), // Dự đoán Xỉu
        reason: `3 kết quả gần nhất đều là Tài (${veryRecentResults.join(', ')}), dự đoán đổi chiều thành Xỉu`,
        strategy: "SimpleFollowTrendVeryShort"
      };
    } else {
      return {
        prediction: 5 + Math.floor(Math.random() * 5), // Dự đoán Tài
        reason: `3 kết quả gần nhất đều là Xỉu (${veryRecentResults.join(', ')}), dự đoán đổi chiều thành Tài`,
        strategy: "SimpleFollowTrendVeryShort"
      };
    }
  }

  // Trường hợp 2: Chênh lệch lớn giữa các số liên tiếp
  if (hasExtremeDiff) {
    const lastResult = veryRecentResults[0];
    return {
      prediction: lastResult >= 5 ? Math.floor(Math.random() * 5) : 5 + Math.floor(Math.random() * 5),
      reason: `Phát hiện chênh lệch lớn giữa các số (${veryRecentResults.join(', ')}), dự đoán đổi chiều từ ${lastResult >= 5 ? 'Tài' : 'Xỉu'} sang ${lastResult >= 5 ? 'Xỉu' : 'Tài'}`,
      strategy: "SimpleFollowTrendVeryShort"
    };
  }
  
  // Trường hợp 3: Mô hình luân phiên rõ ràng (T-X-T hoặc X-T-X)
  if (veryRecentResults[0] >= 5 && veryRecentResults[1] < 5 && veryRecentResults[2] >= 5) {
    return {
      prediction: Math.floor(Math.random() * 5), // Dự đoán Xỉu theo mô hình luân phiên
      reason: `Phát hiện mô hình luân phiên T-X-T (${veryRecentResults.join(', ')}), dự đoán tiếp theo là Xỉu`,
      strategy: "SimpleFollowTrendVeryShort"
    };
  } else if (veryRecentResults[0] < 5 && veryRecentResults[1] >= 5 && veryRecentResults[2] < 5) {
    return {
      prediction: 5 + Math.floor(Math.random() * 5), // Dự đoán Tài theo mô hình luân phiên
      reason: `Phát hiện mô hình luân phiên X-T-X (${veryRecentResults.join(', ')}), dự đoán tiếp theo là Tài`,
      strategy: "SimpleFollowTrendVeryShort"
    };
  }
  
  // Trường hợp 4: Mô hình tăng/giảm liên tiếp
  if (isAscending) {
    // Nếu đã tăng liên tục 3 lần, khả năng cao sẽ đảo chiều
    return {
      prediction: Math.floor(Math.random() * 5), // Dự đoán Xỉu
      reason: `Phát hiện xu hướng tăng liên tục (${veryRecentResults.join(' → ')}), dự đoán sẽ đảo chiều thành Xỉu`,
      strategy: "SimpleFollowTrendVeryShort"
    };
  } else if (isDescending) {
    // Nếu đã giảm liên tục 3 lần, khả năng cao sẽ đảo chiều
    return {
      prediction: 5 + Math.floor(Math.random() * 5), // Dự đoán Tài
      reason: `Phát hiện xu hướng giảm liên tục (${veryRecentResults.join(' → ')}), dự đoán sẽ đảo chiều thành Tài`,
      strategy: "SimpleFollowTrendVeryShort"
    };
  }
  
  // Phân tích xu hướng trong 7 kết quả gần nhất
  let recentTaiCount = recentResults.filter(num => num >= 5).length;
  let recentXiuCount = recentResults.length - recentTaiCount;
  
  // Nếu có xu hướng mạnh trong 7 kết quả gần nhất
  if (recentTaiCount >= 5) {
    return {
      prediction: Math.floor(Math.random() * 5), // Dự đoán Xỉu
      reason: `Phát hiện ${recentTaiCount}/7 kết quả gần nhất là Tài, xu hướng có thể đảo chiều, dự đoán Xỉu`,
      strategy: "SimpleFollowTrendVeryShort"
    };
  } else if (recentXiuCount >= 5) {
    return {
      prediction: 5 + Math.floor(Math.random() * 5), // Dự đoán Tài
      reason: `Phát hiện ${recentXiuCount}/7 kết quả gần nhất là Xỉu, xu hướng có thể đảo chiều, dự đoán Tài`,
      strategy: "SimpleFollowTrendVeryShort"
    };
  }
  
  // Nếu không phát hiện các mô hình đặc biệt, quay lại phân tích tỷ lệ Tài/Xỉu trong 3 kết quả gần nhất
  if (countBig > countSmall) {
    // Kiểm tra kết quả mới nhất
    if (veryRecentResults[0] >= 5) {
      // Nếu xu hướng Tài và kết quả gần nhất là Tài, xem xét độ mạnh của xu hướng
      if (countBig === 2) {
        return {
          prediction: Math.floor(Math.random() * 5), // Dự đoán Xỉu
          reason: `Xu hướng ngắn hạn là Tài (${countBig}/3) và kết quả gần nhất là Tài (${veryRecentResults[0]}), dự đoán đảo chiều thành Xỉu`,
          strategy: "SimpleFollowTrendVeryShort"
        };
      } else {
        return {
          prediction: 5 + Math.floor(Math.random() * 5), // Dự đoán Tài
          reason: `Xu hướng ngắn hạn là Tài (${countBig}/3), kết quả gần nhất là Tài (${veryRecentResults[0]}), dự đoán tiếp tục Tài`,
          strategy: "SimpleFollowTrendVeryShort"
        };
      }
    } else {
      return {
        prediction: 5 + Math.floor(Math.random() * 5), // Dự đoán Tài
        reason: `Xu hướng ngắn hạn là Tài (${countBig}/3), kết quả gần nhất là Xỉu (${veryRecentResults[0]}), dự đoán quay lại Tài`,
        strategy: "SimpleFollowTrendVeryShort"
      };
    }
  } else if (countSmall > countBig) {
    // Kiểm tra kết quả mới nhất
    if (veryRecentResults[0] < 5) {
      // Nếu xu hướng Xỉu và kết quả gần nhất là Xỉu, xem xét độ mạnh của xu hướng
      if (countSmall === 2) {
        return {
          prediction: 5 + Math.floor(Math.random() * 5), // Dự đoán Tài
          reason: `Xu hướng ngắn hạn là Xỉu (${countSmall}/3) và kết quả gần nhất là Xỉu (${veryRecentResults[0]}), dự đoán đảo chiều thành Tài`,
          strategy: "SimpleFollowTrendVeryShort"
        };
      } else {
        return {
          prediction: Math.floor(Math.random() * 5), // Dự đoán Xỉu
          reason: `Xu hướng ngắn hạn là Xỉu (${countSmall}/3), kết quả gần nhất là Xỉu (${veryRecentResults[0]}), dự đoán tiếp tục Xỉu`,
          strategy: "SimpleFollowTrendVeryShort"
        };
      }
    } else {
      return {
        prediction: Math.floor(Math.random() * 5), // Dự đoán Xỉu
        reason: `Xu hướng ngắn hạn là Xỉu (${countSmall}/3), kết quả gần nhất là Tài (${veryRecentResults[0]}), dự đoán quay lại Xỉu`,
        strategy: "SimpleFollowTrendVeryShort"
      };
    }
  } else {
    // Nếu cân bằng, xem kết quả gần nhất để dự đoán ngược lại
    const lastResult = veryRecentResults[0];
    if (lastResult >= 5) {
      return {
        prediction: Math.floor(Math.random() * 5), // Dự đoán Xỉu
        reason: `Xu hướng ngắn hạn cân bằng (${countBig}:${countSmall}), kết quả gần nhất là Tài (${lastResult}), dự đoán Xỉu`,
        strategy: "SimpleFollowTrendVeryShort"
      };
    } else {
      return {
        prediction: 5 + Math.floor(Math.random() * 5), // Dự đoán Tài
        reason: `Xu hướng ngắn hạn cân bằng (${countBig}:${countSmall}), kết quả gần nhất là Xỉu (${lastResult}), dự đoán Tài`,
        strategy: "SimpleFollowTrendVeryShort"
      };
    }
  }
}

/**
 * Thuật toán kết hợp xu hướng ngắn hạn và dài hạn
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @returns {Object} Kết quả dự đoán
 */
function simpleFollowTrendCombined(history, position) {
  if (!history || history.length === 0) {
    const randomPrediction = Math.floor(Math.random() * 10);
    return {
      prediction: randomPrediction,
      reason: "Không có dữ liệu trước, dự đoán ngẫu nhiên " + (randomPrediction >= 5 ? "(Tài)" : "(Xỉu)"),
      strategy: "SimpleFollowTrendCombined"
    };
  }

  const shortTermResults = history.slice(0, 5).map(item => parseInt(item.numbers[position]));
  const longTermResults = history.slice(0, 10).map(item => parseInt(item.numbers[position]));
  
  let shortTermBig = 0;
  let shortTermSmall = 0;
  
  shortTermResults.forEach(num => {
    if (num >= 5) shortTermBig++;
    else shortTermSmall++;
  });
  
  let longTermBig = 0;
  let longTermSmall = 0;
  
  longTermResults.forEach(num => {
    if (num >= 5) longTermBig++;
    else longTermSmall++;
  });
  
  const shortTermTrend = shortTermBig > shortTermSmall ? "Tài" : (shortTermSmall > shortTermBig ? "Xỉu" : "Cân bằng");
  const longTermTrend = longTermBig > longTermSmall ? "Tài" : (longTermSmall > longTermBig ? "Xỉu" : "Cân bằng");
  
  let prediction;
  let reason;
  
  const trendShift = shortTermTrend !== "Cân bằng" && longTermTrend !== "Cân bằng" && shortTermTrend !== longTermTrend;
  
  if (trendShift) {
    if (shortTermTrend === "Tài") {
      prediction = 5 + Math.floor(Math.random() * 5);
      reason = `Phát hiện thay đổi xu hướng từ ${longTermTrend} sang ${shortTermTrend}, dự đoán Tài`;
    } else {
      prediction = Math.floor(Math.random() * 5);
      reason = `Phát hiện thay đổi xu hướng từ ${longTermTrend} sang ${shortTermTrend}, dự đoán Xỉu`;
    }
  } else if (shortTermTrend !== "Cân bằng") {
    if (shortTermTrend === "Tài") {
      prediction = 5 + Math.floor(Math.random() * 5);
      reason = `Xu hướng ngắn hạn mạnh: Tài (${shortTermBig}/${shortTermResults.length}), dự đoán Tài`;
    } else {
      prediction = Math.floor(Math.random() * 5);
      reason = `Xu hướng ngắn hạn mạnh: Xỉu (${shortTermSmall}/${shortTermResults.length}), dự đoán Xỉu`;
    }
  } else if (longTermTrend !== "Cân bằng") {
    if (longTermTrend === "Tài") {
      prediction = 5 + Math.floor(Math.random() * 5);
      reason = `Xu hướng dài hạn: Tài (${longTermBig}/${longTermResults.length}), dự đoán Tài`;
    } else {
      prediction = Math.floor(Math.random() * 5);
      reason = `Xu hướng dài hạn: Xỉu (${longTermSmall}/${longTermResults.length}), dự đoán Xỉu`;
    }
  } else {
    const lastResult = shortTermResults[0];
    if (lastResult >= 5) {
      prediction = Math.floor(Math.random() * 5);
      reason = `Không có xu hướng rõ ràng, kết quả gần nhất là Tài (${lastResult}), dự đoán Xỉu`;
    } else {
      prediction = 5 + Math.floor(Math.random() * 5);
      reason = `Không có xu hướng rõ ràng, kết quả gần nhất là Xỉu (${lastResult}), dự đoán Tài`;
    }
  }
  
  return {
    prediction,
    reason,
    strategy: "SimpleFollowTrendCombined"
  };
}

/**
 * Thuật toán theo xu hướng ngắn hạn có trọng số
 * Phân tích mẫu với trọng số cao hơn cho các kết quả gần đây
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @returns {Object} Kết quả dự đoán
 */
function weightedFollowTrendShort(history, position) {
  if (!history || history.length === 0) {
    const randomPrediction = Math.floor(Math.random() * 10);
    return {
      prediction: randomPrediction,
      reason: "Không có dữ liệu trước, dự đoán ngẫu nhiên " + (randomPrediction >= 5 ? "(Tài)" : "(Xỉu)"),
      strategy: "WeightedFollowTrendShort"
    };
  }

  // Lấy 5 kết quả gần đây nhất
  const recentResults = history.slice(0, 5).map(item => parseInt(item.numbers[position]));
  
  // Trọng số giảm dần: kết quả gần hơn có trọng số cao hơn [3, 2.5, 2, 1.5, 1]
  const weights = [3, 2.5, 2, 1.5, 1];
  
  // Tính toán điểm số có trọng số
  let weightedBig = 0;
  let weightedSmall = 0;
  
  recentResults.forEach((num, index) => {
    if (index < weights.length) {
      if (num >= 5) weightedBig += weights[index];
      else weightedSmall += weights[index];
    }
  });
  
  let prediction;
  let reason;
  
  if (weightedBig > weightedSmall) {
    prediction = 5 + Math.floor(Math.random() * 5);
    reason = `Xu hướng có trọng số Tài (${weightedBig.toFixed(1)}/${(weightedBig + weightedSmall).toFixed(1)}), dự đoán Tài`;
  } else if (weightedSmall > weightedBig) {
    prediction = Math.floor(Math.random() * 5);
    reason = `Xu hướng có trọng số Xỉu (${weightedSmall.toFixed(1)}/${(weightedBig + weightedSmall).toFixed(1)}), dự đoán Xỉu`;
  } else {
    // Nếu bằng nhau, xem xét kết quả gần đây nhất
    const lastResult = recentResults[0];
    if (lastResult >= 5) {
      prediction = Math.floor(Math.random() * 5);
      reason = `Xu hướng có trọng số cân bằng, kết quả gần nhất là Tài (${lastResult}), dự đoán Xỉu`;
    } else {
      prediction = 5 + Math.floor(Math.random() * 5);
      reason = `Xu hướng có trọng số cân bằng, kết quả gần nhất là Xỉu (${lastResult}), dự đoán Tài`;
    }
  }
  
  return {
    prediction,
    reason,
    strategy: "WeightedFollowTrendShort"
  };
}

/**
 * Thuật toán phân tích biên độ dao động
 * Phân tích biên độ dao động của các số và nhận diện xu hướng tăng/giảm
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @returns {Object} Kết quả dự đoán
 */
function waveTrend(history, position) {
  if (!history || history.length < 3) {
    const randomPrediction = Math.floor(Math.random() * 10);
    return {
      prediction: randomPrediction,
      reason: "Không đủ dữ liệu trước, dự đoán ngẫu nhiên " + (randomPrediction >= 5 ? "(Tài)" : "(Xỉu)"),
      strategy: "WaveTrend"
    };
  }

  // Lấy 12 kết quả gần đây (tăng từ 10 lên 12 để phân tích tốt hơn)
  const recentResults = history.slice(0, 12).map(item => parseInt(item.numbers[position]));
  
  // Tính toán sự thay đổi giữa các kết quả liên tiếp
  const changes = [];
  for (let i = 0; i < recentResults.length - 1; i++) {
    changes.push(recentResults[i] - recentResults[i+1]);
  }
  
  // Tính biên độ dao động trung bình
  const avgAmplitude = Math.abs(changes.reduce((sum, change) => sum + change, 0) / changes.length);
  
  // Đếm số lượng thay đổi tăng và giảm
  let increases = 0;
  let decreases = 0;
  let unchanged = 0;
  
  changes.forEach(change => {
    if (change > 0) increases++;
    else if (change < 0) decreases++;
    else unchanged++;
  });
  
  // Xác định xu hướng hiện tại dựa trên 5 kết quả gần nhất
  const lastFive = recentResults.slice(0, 5);
  
  // Phân tích mô hình trong 5 kết quả gần nhất
  const increasingTrend = lastFive[0] > lastFive[1] && lastFive[1] > lastFive[2] && lastFive[2] > lastFive[3];
  const decreasingTrend = lastFive[0] < lastFive[1] && lastFive[1] < lastFive[2] && lastFive[2] < lastFive[3];
  
  // Kiểm tra xem có mô hình sóng không
  const wavePeak = lastFive[0] < lastFive[1] && lastFive[1] > lastFive[2] && lastFive[2] < lastFive[3];
  const waveTrough = lastFive[0] > lastFive[1] && lastFive[1] < lastFive[2] && lastFive[2] > lastFive[3];
  
  // Kiểm tra mô hình sóng kép (5 kết quả)
  const doubleWavePeak = lastFive[0] < lastFive[1] && lastFive[1] > lastFive[2] && lastFive[2] < lastFive[3] && lastFive[3] > lastFive[4];
  const doubleWaveTrough = lastFive[0] > lastFive[1] && lastFive[1] < lastFive[2] && lastFive[2] > lastFive[3] && lastFive[3] < lastFive[4];
  
  // Kiểm tra xu hướng đảo chiều có đang hình thành không
  const potentialReversal = 
    (lastFive[0] < lastFive[1] && lastFive[1] < lastFive[2] && lastFive[2] > lastFive[3]) || // Giảm sau khi tăng 
    (lastFive[0] > lastFive[1] && lastFive[1] > lastFive[2] && lastFive[2] < lastFive[3]);   // Tăng sau khi giảm
  
  // Điều chỉnh ngưỡng biên độ
  const isHighAmplitude = avgAmplitude > 3.5; // Tăng ngưỡng từ 3.0 lên 3.5
  const isModerateAmplitude = avgAmplitude > 2.0 && avgAmplitude <= 3.5; // Điều chỉnh khoảng
  const isLowAmplitude = avgAmplitude <= 2.0; // Tăng ngưỡng từ 1.5 lên 2.0
  
  // Xác định xu hướng chung
  let currentTrend;
  
  if (doubleWavePeak) {
    currentTrend = "sóng kép đỉnh";
  } else if (doubleWaveTrough) {
    currentTrend = "sóng kép đáy";
  } else if (increasingTrend) {
    currentTrend = "tăng mạnh";
  } else if (decreasingTrend) {
    currentTrend = "giảm mạnh";
  } else if (increases > decreases + 2) {
    currentTrend = "tăng";
  } else if (decreases > increases + 2) {
    currentTrend = "giảm";
  } else if (wavePeak) {
    currentTrend = "đỉnh sóng";
  } else if (waveTrough) {
    currentTrend = "đáy sóng";
  } else if (potentialReversal) {
    currentTrend = "đảo chiều";
  } else {
    currentTrend = "dao động";
  }
  
  let prediction;
  let reason;
  
  // Phân tích xu hướng Tài/Xỉu gần nhất
  const recentTai = lastFive.filter(n => n >= 5).length;
  const recentXiu = lastFive.filter(n => n < 5).length;
  
  // Kiểm tra mô hình lặp lại
  const lastThree = recentResults.slice(0, 3);
  const lastSix = recentResults.slice(0, 6);
  const hasRepeatingPattern = lastSix.slice(0, 3).join('') === lastSix.slice(3, 6).join('');
  
  // Logic dự đoán dựa trên phân tích xu hướng và biên độ
  if (hasRepeatingPattern) {
    // Nếu phát hiện mô hình lặp lại, dự đoán tiếp theo sẽ giống với kết quả tương ứng
    prediction = lastThree[0] >= 5 ? (5 + Math.floor(Math.random() * 5)) : Math.floor(Math.random() * 5);
    reason = `Phát hiện mô hình lặp lại (${lastSix.slice(0, 3).join('-')} | ${lastSix.slice(3, 6).join('-')}), dự đoán ${prediction >= 5 ? 'Tài' : 'Xỉu'}`;
  } else if (currentTrend === "sóng kép đỉnh") {
    prediction = Math.floor(Math.random() * 5); // Dự đoán Xỉu
    reason = `Phát hiện mô hình sóng kép đỉnh, khả năng cao sẽ giảm, dự đoán Xỉu`;
  } else if (currentTrend === "sóng kép đáy") {
    prediction = 5 + Math.floor(Math.random() * 5); // Dự đoán Tài
    reason = `Phát hiện mô hình sóng kép đáy, khả năng cao sẽ tăng, dự đoán Tài`;
  } else if (currentTrend === "tăng mạnh") {
    if (isHighAmplitude) {
      prediction = Math.floor(Math.random() * 5); // Dự đoán Xỉu
      reason = `Xu hướng đang tăng mạnh với biên độ dao động cao (${avgAmplitude.toFixed(1)}), khả năng cao sẽ đảo chiều, dự đoán Xỉu`;
    } else if (isModerateAmplitude && recentTai > 3) {
      prediction = Math.floor(Math.random() * 5); // Dự đoán Xỉu
      reason = `Xu hướng tăng mạnh với nhiều Tài (${recentTai}/5) và biên độ trung bình (${avgAmplitude.toFixed(1)}), dự đoán đảo chiều Xỉu`;
    } else {
      prediction = 5 + Math.floor(Math.random() * 5); // Dự đoán Tài
      reason = `Xu hướng đang tăng mạnh với biên độ ổn định (${avgAmplitude.toFixed(1)}), dự đoán Tài`;
    }
  } else if (currentTrend === "giảm mạnh") {
    if (isHighAmplitude) {
      prediction = 5 + Math.floor(Math.random() * 5); // Dự đoán Tài
      reason = `Xu hướng đang giảm mạnh với biên độ dao động cao (${avgAmplitude.toFixed(1)}), khả năng cao sẽ đảo chiều, dự đoán Tài`;
    } else if (isModerateAmplitude && recentXiu > 3) {
      prediction = 5 + Math.floor(Math.random() * 5); // Dự đoán Tài
      reason = `Xu hướng giảm mạnh với nhiều Xỉu (${recentXiu}/5) và biên độ trung bình (${avgAmplitude.toFixed(1)}), dự đoán đảo chiều Tài`;
    } else {
      prediction = Math.floor(Math.random() * 5); // Dự đoán Xỉu
      reason = `Xu hướng đang giảm mạnh với biên độ ổn định (${avgAmplitude.toFixed(1)}), dự đoán Xỉu`;
    }
  } else if (currentTrend === "đỉnh sóng") {
    if (isHighAmplitude || (isModerateAmplitude && recentTai > 3)) {
      prediction = Math.floor(Math.random() * 5); // Dự đoán Xỉu
      reason = `Phát hiện mô hình đỉnh sóng với biên độ ${isHighAmplitude ? 'cao' : 'trung bình'} (${avgAmplitude.toFixed(1)}), dự đoán Xỉu`;
    } else {
      prediction = 5 + Math.floor(Math.random() * 5); // Dự đoán Tài
      reason = `Phát hiện mô hình đỉnh sóng với biên độ thấp (${avgAmplitude.toFixed(1)}), xu hướng có thể tiếp tục, dự đoán Tài`;
    }
  } else if (currentTrend === "đáy sóng") {
    if (isHighAmplitude || (isModerateAmplitude && recentXiu > 3)) {
      prediction = 5 + Math.floor(Math.random() * 5); // Dự đoán Tài
      reason = `Phát hiện mô hình đáy sóng với biên độ ${isHighAmplitude ? 'cao' : 'trung bình'} (${avgAmplitude.toFixed(1)}), dự đoán Tài`;
    } else {
      prediction = Math.floor(Math.random() * 5); // Dự đoán Xỉu
      reason = `Phát hiện mô hình đáy sóng với biên độ thấp (${avgAmplitude.toFixed(1)}), xu hướng có thể tiếp tục, dự đoán Xỉu`;
    }
  } else if (currentTrend === "đảo chiều") {
    // Kiểm tra điểm đảo chiều đang hướng lên hay xuống và kết hợp với biên độ
    if (lastFive[0] > lastFive[1]) {
      if (isHighAmplitude || (isModerateAmplitude && recentTai > 3)) {
        prediction = Math.floor(Math.random() * 5); // Dự đoán Xỉu
        reason = `Phát hiện dấu hiệu đảo chiều hướng lên nhưng biên độ ${isHighAmplitude ? 'cao' : 'trung bình'} (${avgAmplitude.toFixed(1)}) và nhiều Tài (${recentTai}/5), dự đoán Xỉu`;
      } else {
        prediction = 5 + Math.floor(Math.random() * 5); // Dự đoán Tài
        reason = `Phát hiện dấu hiệu đảo chiều hướng lên với biên độ ổn định (${avgAmplitude.toFixed(1)}), dự đoán Tài`;
      }
    } else {
      if (isHighAmplitude || (isModerateAmplitude && recentXiu > 3)) {
        prediction = 5 + Math.floor(Math.random() * 5); // Dự đoán Tài
        reason = `Phát hiện dấu hiệu đảo chiều hướng xuống nhưng biên độ ${isHighAmplitude ? 'cao' : 'trung bình'} (${avgAmplitude.toFixed(1)}) và nhiều Xỉu (${recentXiu}/5), dự đoán Tài`;
      } else {
        prediction = Math.floor(Math.random() * 5); // Dự đoán Xỉu
        reason = `Phát hiện dấu hiệu đảo chiều hướng xuống với biên độ ổn định (${avgAmplitude.toFixed(1)}), dự đoán Xỉu`;
      }
    }
  } else {
    // Xử lý xu hướng "tăng", "giảm" hoặc "dao động"
    if (recentTai > recentXiu + 1) {
      if (isModerateAmplitude || isHighAmplitude) {
        prediction = Math.floor(Math.random() * 5); // Dự đoán Xỉu
        reason = `Đa số kết quả gần đây là Tài (${recentTai}/5) và biên độ dao động ${isHighAmplitude ? 'cao' : 'trung bình'} (${avgAmplitude.toFixed(1)}), khả năng đảo chiều, dự đoán Xỉu`;
      } else {
        prediction = 5 + Math.floor(Math.random() * 5); // Dự đoán Tài
        reason = `Đa số kết quả gần đây là Tài (${recentTai}/5) và biên độ dao động thấp (${avgAmplitude.toFixed(1)}), dự đoán Tài`;
      }
    } else if (recentXiu > recentTai + 1) {
      if (isModerateAmplitude || isHighAmplitude) {
        prediction = 5 + Math.floor(Math.random() * 5); // Dự đoán Tài
        reason = `Đa số kết quả gần đây là Xỉu (${recentXiu}/5) và biên độ dao động ${isHighAmplitude ? 'cao' : 'trung bình'} (${avgAmplitude.toFixed(1)}), khả năng đảo chiều, dự đoán Tài`;
      } else {
        prediction = Math.floor(Math.random() * 5); // Dự đoán Xỉu
        reason = `Đa số kết quả gần đây là Xỉu (${recentXiu}/5) và biên độ dao động thấp (${avgAmplitude.toFixed(1)}), dự đoán Xỉu`;
      }
    } else {
      // Nếu không có xu hướng rõ ràng, xem xét kết quả mới nhất và biên độ
      const allSame = lastThree[0] === lastThree[1] && lastThree[1] === lastThree[2];
      
      if (allSame) {
        // Nếu 3 kết quả gần nhất giống nhau, dự đoán đảo chiều
        if (lastThree[0] >= 5) {
          prediction = Math.floor(Math.random() * 5);
          reason = `3 kết quả gần nhất đều là Tài (${lastThree.join(', ')}), khả năng cao sẽ đảo chiều, dự đoán Xỉu`;
        } else {
          prediction = 5 + Math.floor(Math.random() * 5);
          reason = `3 kết quả gần nhất đều là Xỉu (${lastThree.join(', ')}), khả năng cao sẽ đảo chiều, dự đoán Tài`;
        }
      } else {
        // Nếu không có xu hướng rõ ràng và không có mô hình đặc biệt
        if (isHighAmplitude) {
          // Khi biên độ cao, dự đoán ngược với kết quả gần nhất
          if (recentResults[0] >= 5) {
            prediction = Math.floor(Math.random() * 5);
            reason = `Biên độ dao động cao (${avgAmplitude.toFixed(1)}) và kết quả gần nhất là Tài (${recentResults[0]}), dự đoán Xỉu`;
          } else {
            prediction = 5 + Math.floor(Math.random() * 5);
            reason = `Biên độ dao động cao (${avgAmplitude.toFixed(1)}) và kết quả gần nhất là Xỉu (${recentResults[0]}), dự đoán Tài`;
          }
        } else {
          // Khi biên độ thấp hoặc trung bình, dự đoán theo kết quả gần nhất
          if (recentResults[0] >= 5) {
            prediction = 5 + Math.floor(Math.random() * 5);
            reason = `Biên độ dao động ${isModerateAmplitude ? 'trung bình' : 'thấp'} (${avgAmplitude.toFixed(1)}), kết quả gần nhất là Tài (${recentResults[0]}), dự đoán tiếp tục Tài`;
          } else {
            prediction = Math.floor(Math.random() * 5);
            reason = `Biên độ dao động ${isModerateAmplitude ? 'trung bình' : 'thấp'} (${avgAmplitude.toFixed(1)}), kết quả gần nhất là Xỉu (${recentResults[0]}), dự đoán tiếp tục Xỉu`;
          }
        }
      }
    }
  }
  
  return {
    prediction,
    reason,
    strategy: "WaveTrend"
  };
}

/**
 * Thuật toán kết hợp xu hướng có trọng số
 * Kết hợp phân tích xu hướng với trọng số cao hơn cho kết quả gần đây
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @returns {Object} Kết quả dự đoán
 */
function weightedFollowTrendCombined(history, position) {
  if (!history || history.length === 0) {
    const randomPrediction = Math.floor(Math.random() * 10);
    return {
      prediction: randomPrediction,
      reason: "Không có dữ liệu trước, dự đoán ngẫu nhiên " + (randomPrediction >= 5 ? "(Tài)" : "(Xỉu)"),
      strategy: "WeightedFollowTrendCombined"
    };
  }

  // Lấy 10 kết quả gần đây nhất
  const recentResults = history.slice(0, 10).map(item => parseInt(item.numbers[position]));
  
  // Trọng số giảm dần: 10 kết quả với trọng số giảm dần từ mới nhất đến cũ nhất
  const weights = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5];
  
  // Tính toán điểm số có trọng số
  let weightedBig = 0;
  let weightedSmall = 0;
  
  recentResults.forEach((num, index) => {
    if (index < weights.length) {
      if (num >= 5) weightedBig += weights[index];
      else weightedSmall += weights[index];
    }
  });
  
  // Phân tích xu hướng gần đây (3 kết quả gần nhất)
  const shortTermResults = recentResults.slice(0, 3);
  let shortTermBig = 0;
  let shortTermSmall = 0;
  
  shortTermResults.forEach(num => {
    if (num >= 5) shortTermBig++;
    else shortTermSmall++;
  });
  
  const shortTermTrend = shortTermBig > shortTermSmall ? "Tài" : (shortTermSmall > shortTermBig ? "Xỉu" : "Cân bằng");
  
  let prediction;
  let reason;
  
  // Nếu có xu hướng ngắn hạn rõ ràng và không trái ngược với xu hướng có trọng số
  if (shortTermTrend !== "Cân bằng" && 
      ((shortTermTrend === "Tài" && weightedBig > weightedSmall) || 
       (shortTermTrend === "Xỉu" && weightedSmall > weightedBig))) {
    
    if (shortTermTrend === "Tài") {
      prediction = 5 + Math.floor(Math.random() * 5);
      reason = `Xu hướng ngắn hạn (${shortTermTrend}) và xu hướng có trọng số (${weightedBig.toFixed(1)}/${(weightedBig + weightedSmall).toFixed(1)}) đều là Tài, dự đoán Tài`;
    } else {
      prediction = Math.floor(Math.random() * 5);
      reason = `Xu hướng ngắn hạn (${shortTermTrend}) và xu hướng có trọng số (${weightedSmall.toFixed(1)}/${(weightedBig + weightedSmall).toFixed(1)}) đều là Xỉu, dự đoán Xỉu`;
    }
  } 
  // Nếu xu hướng ngắn hạn và xu hướng có trọng số mâu thuẫn nhau
  else if (shortTermTrend !== "Cân bằng" && 
           ((shortTermTrend === "Tài" && weightedBig < weightedSmall) || 
            (shortTermTrend === "Xỉu" && weightedSmall < weightedBig))) {
    
    // Ưu tiên xu hướng ngắn hạn, vì nó phản ánh sự thay đổi mới nhất
    if (shortTermTrend === "Tài") {
      prediction = 5 + Math.floor(Math.random() * 5);
      reason = `Xu hướng ngắn hạn (${shortTermTrend}) và xu hướng có trọng số trái ngược nhau, ưu tiên xu hướng ngắn hạn, dự đoán Tài`;
    } else {
      prediction = Math.floor(Math.random() * 5);
      reason = `Xu hướng ngắn hạn (${shortTermTrend}) và xu hướng có trọng số trái ngược nhau, ưu tiên xu hướng ngắn hạn, dự đoán Xỉu`;
    }
  }
  // Trường hợp xu hướng ngắn hạn không rõ ràng, sử dụng xu hướng có trọng số
  else if (weightedBig > weightedSmall) {
    prediction = 5 + Math.floor(Math.random() * 5);
    reason = `Xu hướng ngắn hạn không rõ ràng, xu hướng có trọng số là Tài (${weightedBig.toFixed(1)}/${(weightedBig + weightedSmall).toFixed(1)}), dự đoán Tài`;
  } else if (weightedSmall > weightedBig) {
    prediction = Math.floor(Math.random() * 5);
    reason = `Xu hướng ngắn hạn không rõ ràng, xu hướng có trọng số là Xỉu (${weightedSmall.toFixed(1)}/${(weightedBig + weightedSmall).toFixed(1)}), dự đoán Xỉu`;
  } else {
    // Nếu mọi phân tích đều không rõ ràng, xem xét kết quả mới nhất
    const lastResult = recentResults[0];
    if (lastResult >= 5) {
      prediction = Math.floor(Math.random() * 5);
      reason = `Không có xu hướng rõ ràng, kết quả gần nhất là Tài (${lastResult}), dự đoán Xỉu`;
    } else {
      prediction = 5 + Math.floor(Math.random() * 5);
      reason = `Không có xu hướng rõ ràng, kết quả gần nhất là Xỉu (${lastResult}), dự đoán Tài`;
    }
  }
  
  return {
    prediction,
    reason,
    strategy: "WeightedFollowTrendCombined"
  };
}

/**
 * Thuật toán đặc biệt cho khung giờ đêm khuya
 * Phương pháp đặc biệt cho khung giờ đêm khuya, ưu tiên xu hướng dài hạn
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @returns {Object} Kết quả dự đoán
 */
function nightFollowTrend(history, position) {
  if (!history || history.length === 0) {
    const randomPrediction = Math.floor(Math.random() * 10);
    return {
      prediction: randomPrediction,
      reason: "Không có dữ liệu trước, dự đoán ngẫu nhiên " + (randomPrediction >= 5 ? "(Tài)" : "(Xỉu)"),
      strategy: "NightFollowTrend"
    };
  }

  // Khung giờ đêm khuya - xem xét nhiều kết quả hơn để tìm xu hướng ổn định
  // Lấy 15 kết quả gần đây
  const extendedHistory = history.slice(0, 15).map(item => parseInt(item.numbers[position]));
  
  // Chia thành 3 nhóm để phân tích xu hướng
  const recent = extendedHistory.slice(0, 5); // 5 kết quả gần nhất
  const mid = extendedHistory.slice(5, 10); // 5 kết quả tiếp theo
  const older = extendedHistory.slice(10); // 5 kết quả cũ nhất trong phạm vi
  
  // Phân tích từng nhóm
  let recentBig = 0, recentSmall = 0;
  let midBig = 0, midSmall = 0;
  let olderBig = 0, olderSmall = 0;
  
  recent.forEach(num => {
    if (num >= 5) recentBig++;
    else recentSmall++;
  });
  
  mid.forEach(num => {
    if (num >= 5) midBig++;
    else midSmall++;
  });
  
  older.forEach(num => {
    if (num >= 5) olderBig++;
    else olderSmall++;
  });
  
  // Xác định xu hướng cho mỗi nhóm
  const recentTrend = recentBig > recentSmall ? "Tài" : (recentSmall > recentBig ? "Xỉu" : "Cân bằng");
  const midTrend = midBig > midSmall ? "Tài" : (midSmall > midBig ? "Xỉu" : "Cân bằng");
  const olderTrend = olderBig > olderSmall ? "Tài" : (olderSmall > olderBig ? "Xỉu" : "Cân bằng");
  
  // Kiểm tra xem có xu hướng rõ ràng kéo dài không
  const consistentTrend = (recentTrend === midTrend && midTrend === olderTrend) && recentTrend !== "Cân bằng";
  
  // Kiểm tra có đang xảy ra chuyển hướng từ xu hướng dài hạn không
  const trendShift = recentTrend !== "Cân bằng" && midTrend !== "Cân bằng" && recentTrend !== midTrend;
  
  let prediction;
  let reason;
  
  if (consistentTrend) {
    // Nếu có xu hướng rõ ràng và nhất quán trong cả 3 nhóm
    if (recentTrend === "Tài") {
      prediction = 5 + Math.floor(Math.random() * 5);
      reason = `Đêm khuya: Phát hiện xu hướng Tài nhất quán và kéo dài qua thời gian, dự đoán Tài`;
    } else {
      prediction = Math.floor(Math.random() * 5);
      reason = `Đêm khuya: Phát hiện xu hướng Xỉu nhất quán và kéo dài qua thời gian, dự đoán Xỉu`;
    }
  } else if (trendShift) {
    // Nếu có sự chuyển hướng từ xu hướng dài hạn, có thể là bắt đầu một xu hướng mới
    if (recentTrend === "Tài") {
      prediction = 5 + Math.floor(Math.random() * 5);
      reason = `Đêm khuya: Phát hiện chuyển hướng từ ${midTrend} sang ${recentTrend}, dự đoán Tài`;
    } else {
      prediction = Math.floor(Math.random() * 5);
      reason = `Đêm khuya: Phát hiện chuyển hướng từ ${midTrend} sang ${recentTrend}, dự đoán Xỉu`;
    }
  } else {
    // Phân tích tổng thể tất cả 15 kết quả
    let totalBig = recentBig + midBig + olderBig;
    let totalSmall = recentSmall + midSmall + olderSmall;
    
    if (totalBig > totalSmall) {
      prediction = 5 + Math.floor(Math.random() * 5);
      reason = `Đêm khuya: Xu hướng tổng thể là Tài (${totalBig}/${totalBig + totalSmall}), dự đoán Tài`;
    } else if (totalSmall > totalBig) {
      prediction = Math.floor(Math.random() * 5);
      reason = `Đêm khuya: Xu hướng tổng thể là Xỉu (${totalSmall}/${totalBig + totalSmall}), dự đoán Xỉu`;
    } else {
      // Nếu không có xu hướng rõ ràng, xem xét 3 kết quả gần nhất để tìm mô hình đảo chiều
      const lastThree = extendedHistory.slice(0, 3);
      const allSame = lastThree[0] === lastThree[1] && lastThree[1] === lastThree[2];
      const alternating = lastThree[0] !== lastThree[1] && lastThree[1] !== lastThree[2] && lastThree[0] !== lastThree[2];
      
      if (allSame) {
        // Nếu 3 kết quả gần nhất giống nhau, dự đoán đảo chiều
        if (lastThree[0] >= 5) {
          prediction = Math.floor(Math.random() * 5);
          reason = `Đêm khuya: 3 kết quả gần nhất đều là Tài (${lastThree.join(', ')}), khả năng cao sẽ đảo chiều, dự đoán Xỉu`;
        } else {
          prediction = 5 + Math.floor(Math.random() * 5);
          reason = `Đêm khuya: 3 kết quả gần nhất đều là Xỉu (${lastThree.join(', ')}), khả năng cao sẽ đảo chiều, dự đoán Tài`;
        }
      } else if (alternating) {
        // Nếu 3 kết quả gần nhất luân phiên, theo mô hình luân phiên
        if (lastThree[0] >= 5) {
          prediction = Math.floor(Math.random() * 5);
          reason = `Đêm khuya: Phát hiện mô hình luân phiên, kết quả gần nhất là Tài (${lastThree[0]}), dự đoán Xỉu`;
        } else {
          prediction = 5 + Math.floor(Math.random() * 5);
          reason = `Đêm khuya: Phát hiện mô hình luân phiên, kết quả gần nhất là Xỉu (${lastThree[0]}), dự đoán Tài`;
        }
      } else {
        // Mô hình không rõ ràng, xem xét kết quả mới nhất
        if (lastThree[0] >= 5) {
          prediction = Math.floor(Math.random() * 5);
          reason = `Đêm khuya: Không có xu hướng rõ ràng, kết quả gần nhất là Tài (${lastThree[0]}), dự đoán Xỉu`;
        } else {
          prediction = 5 + Math.floor(Math.random() * 5);
          reason = `Đêm khuya: Không có xu hướng rõ ràng, kết quả gần nhất là Xỉu (${lastThree[0]}), dự đoán Tài`;
        }
      }
    }
  }
  
  return {
    prediction,
    reason,
    strategy: "NightFollowTrend"
  };
}

/**
 * Thuật toán nhận diện mẫu
 * Tìm kiếm các mẫu lặp lại trong lịch sử 20-30 kết quả gần nhất
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @returns {Object} Kết quả dự đoán
 */
function patternRecognition(history, position) {
  if (!history || history.length < 10) {
    const randomPrediction = Math.floor(Math.random() * 10);
    return {
      prediction: randomPrediction,
      reason: "Không đủ dữ liệu trước để nhận diện mẫu, dự đoán ngẫu nhiên " + (randomPrediction >= 5 ? "(Tài)" : "(Xỉu)"),
      strategy: "PatternRecognition"
    };
  }

  // Lấy tối đa 50 kết quả gần đây để phân tích mẫu (tăng từ 30 lên 50 để tìm mẫu chính xác hơn)
  const extendedHistory = history.slice(0, Math.min(50, history.length)).map(item => parseInt(item.numbers[position]));
  
  // Tạo chuỗi nhị phân đại diện cho kết quả Tài/Xỉu (1/0)
  const binaryPattern = extendedHistory.map(num => num >= 5 ? 1 : 0);
  
  // Tìm kiếm mẫu lặp lại gần đây với các độ dài khác nhau
  let bestPatternInfo = null;
  
  // Thử các độ dài mẫu khác nhau (3, 4, và 5) để tìm mẫu tốt nhất
  for (let patternLength of [3, 4, 5]) {
    if (extendedHistory.length < patternLength * 2) {
      continue; // Bỏ qua nếu không đủ dữ liệu cho độ dài mẫu này
    }
    
    const currentPattern = binaryPattern.slice(0, patternLength);
    let patternString = currentPattern.join('');
    
    // Tìm kiếm mẫu này trong phần còn lại của lịch sử
    let positions = [];
    let tempHistory = binaryPattern.slice(patternLength).join('');
    let pos = tempHistory.indexOf(patternString);
    
    while (pos !== -1) {
      positions.push(pos + patternLength);
      pos = tempHistory.indexOf(patternString, pos + 1);
    }
    
    // Nếu tìm thấy mẫu lặp lại ít nhất 2 lần
    if (positions.length >= 1) {
      // Xem kết quả tiếp theo sau mỗi lần xuất hiện của mẫu
      let nextResults = [];
      positions.forEach(index => {
        if (index + 1 < binaryPattern.length) {
          nextResults.push(binaryPattern[index + 1]);
        }
      });
      
      // Lưu thông tin về mẫu có số lần xuất hiện nhiều nhất
      if (!bestPatternInfo || positions.length > bestPatternInfo.occurrences) {
        bestPatternInfo = {
          pattern: currentPattern,
          occurrences: positions.length,
          nextResults: nextResults,
          patternLength: patternLength
        };
      }
    }
  }
  
  // Nếu tìm thấy mẫu lặp lại
  if (bestPatternInfo) {
    // Đếm số lượng Tài/Xỉu trong kết quả tiếp theo
    let nextBig = bestPatternInfo.nextResults.filter(r => r === 1).length;
    let nextSmall = bestPatternInfo.nextResults.filter(r => r === 0).length;
    
    let prediction;
    let reason;
    
    // Nếu có xu hướng rõ ràng trong kết quả tiếp theo
    let confidence = Math.max(nextBig, nextSmall) / bestPatternInfo.nextResults.length;
    if (confidence > 0.6) { // Nếu có trên 60% kết quả tiếp theo giống nhau
      if (nextBig > nextSmall) {
        prediction = 5 + Math.floor(Math.random() * 5);
        reason = `Nhận diện mẫu: Tìm thấy mẫu ${bestPatternInfo.pattern.map(v => v === 1 ? "T" : "X").join('')} lặp lại ${bestPatternInfo.occurrences} lần, kết quả tiếp theo thường là Tài (${nextBig}/${bestPatternInfo.nextResults.length}, ${Math.round(confidence * 100)}% tin cậy), dự đoán Tài`;
      } else {
        prediction = Math.floor(Math.random() * 5);
        reason = `Nhận diện mẫu: Tìm thấy mẫu ${bestPatternInfo.pattern.map(v => v === 1 ? "T" : "X").join('')} lặp lại ${bestPatternInfo.occurrences} lần, kết quả tiếp theo thường là Xỉu (${nextSmall}/${bestPatternInfo.nextResults.length}, ${Math.round(confidence * 100)}% tin cậy), dự đoán Xỉu`;
      }
    } else {
      // Nếu không có xu hướng rõ ràng trong kết quả tiếp theo
      
      // Kiểm tra xem có chuỗi các kết quả giống nhau gần đây không
      let maxConsecutive = 1;
      let currentConsecutive = 1;
      let currentValue = binaryPattern[0];
      
      for (let i = 1; i < 10 && i < binaryPattern.length; i++) {
        if (binaryPattern[i] === currentValue) {
          currentConsecutive++;
          if (currentConsecutive > maxConsecutive) {
            maxConsecutive = currentConsecutive;
          }
        } else {
          currentConsecutive = 1;
          currentValue = binaryPattern[i];
        }
      }
      
      // Kiểm tra xu hướng giống nhau trong 3 kết quả gần nhất
      const last3Same = binaryPattern[0] === binaryPattern[1] && binaryPattern[1] === binaryPattern[2];
      
      // Nếu có 3+ kết quả giống nhau liên tiếp gần đây, dự đoán đổi chiều
      if (maxConsecutive >= 3 && last3Same) {
        if (binaryPattern[0] === 1) {
          prediction = Math.floor(Math.random() * 5);
          reason = `Nhận diện mẫu: Phát hiện ${maxConsecutive} kết quả Tài liên tiếp, khả năng cao sẽ đổi xu hướng, dự đoán Xỉu`;
        } else {
          prediction = 5 + Math.floor(Math.random() * 5);
          reason = `Nhận diện mẫu: Phát hiện ${maxConsecutive} kết quả Xỉu liên tiếp, khả năng cao sẽ đổi xu hướng, dự đoán Tài`;
        }
      } 
      // Nếu có mẫu luân phiên
      else if (binaryPattern[0] !== binaryPattern[1] && binaryPattern[1] !== binaryPattern[2] && binaryPattern[0] === binaryPattern[2]) {
        if (binaryPattern[0] === 1) {
          prediction = 5 + Math.floor(Math.random() * 5);
          reason = `Nhận diện mẫu: Phát hiện mô hình luân phiên (T-X-T), theo mẫu nên dự đoán Tài`;
        } else {
          prediction = Math.floor(Math.random() * 5);
          reason = `Nhận diện mẫu: Phát hiện mô hình luân phiên (X-T-X), theo mẫu nên dự đoán Xỉu`;
        }
      } 
      // Phân tích xu hướng tổng thể
      else {
        const totalBig = binaryPattern.slice(0, 15).filter(b => b === 1).length;
        const totalSmall = binaryPattern.slice(0, 15).filter(b => b === 0).length;
        
        if (totalBig > totalSmall + 3) { // Xu hướng Tài rõ ràng
          prediction = Math.floor(Math.random() * 5);
          reason = `Nhận diện mẫu: Xu hướng tổng thể nghiêng mạnh về Tài (${totalBig}/15 kết quả gần đây), khả năng cao sẽ đổi xu hướng, dự đoán Xỉu`;
        } else if (totalSmall > totalBig + 3) { // Xu hướng Xỉu rõ ràng
          prediction = 5 + Math.floor(Math.random() * 5);
          reason = `Nhận diện mẫu: Xu hướng tổng thể nghiêng mạnh về Xỉu (${totalSmall}/15 kết quả gần đây), khả năng cao sẽ đổi xu hướng, dự đoán Tài`;
        } else {
          // Xem xét xu hướng ngắn hạn
          const recentBig = binaryPattern.slice(0, 5).filter(b => b === 1).length;
          const recentSmall = binaryPattern.slice(0, 5).filter(b => b === 0).length;
          
          if (recentBig > recentSmall) {
            prediction = Math.floor(Math.random() * 5);
            reason = `Nhận diện mẫu: Xu hướng ngắn hạn là Tài (${recentBig}/5), có thể sẽ đổi xu hướng, dự đoán Xỉu`;
          } else if (recentSmall > recentBig) {
            prediction = 5 + Math.floor(Math.random() * 5);
            reason = `Nhận diện mẫu: Xu hướng ngắn hạn là Xỉu (${recentSmall}/5), có thể sẽ đổi xu hướng, dự đoán Tài`;
          } else if (binaryPattern[0] === 1) {
            prediction = Math.floor(Math.random() * 5);
            reason = `Nhận diện mẫu: Không phát hiện mẫu rõ ràng, kết quả gần nhất là Tài, dự đoán Xỉu`;
          } else {
            prediction = 5 + Math.floor(Math.random() * 5);
            reason = `Nhận diện mẫu: Không phát hiện mẫu rõ ràng, kết quả gần nhất là Xỉu, dự đoán Tài`;
          }
        }
      }
    }
    
    return {
      prediction,
      reason,
      strategy: "PatternRecognition"
    };
  }
  
  // Nếu không tìm thấy mẫu lặp lại, quay lại phân tích đơn giản
  const lastFive = extendedHistory.slice(0, 5);
  let recentBig = lastFive.filter(n => n >= 5).length;
  let recentSmall = lastFive.filter(n => n < 5).length;
  
  let prediction;
  let reason;
  
  if (recentBig > recentSmall) {
    prediction = Math.floor(Math.random() * 5);
    reason = `Nhận diện mẫu: Không tìm thấy mẫu lặp lại rõ ràng, xu hướng gần đây là Tài (${recentBig}/5), dự đoán Xỉu`;
  } else if (recentSmall > recentBig) {
    prediction = 5 + Math.floor(Math.random() * 5);
    reason = `Nhận diện mẫu: Không tìm thấy mẫu lặp lại rõ ràng, xu hướng gần đây là Xỉu (${recentSmall}/5), dự đoán Tài`;
  } else {
    // Nếu cân bằng, dựa vào kết quả gần nhất
    if (extendedHistory[0] >= 5) {
      prediction = Math.floor(Math.random() * 5);
      reason = `Nhận diện mẫu: Không tìm thấy mẫu rõ ràng, tỷ lệ cân bằng, kết quả gần nhất là Tài (${extendedHistory[0]}), dự đoán Xỉu`;
    } else {
      prediction = 5 + Math.floor(Math.random() * 5);
      reason = `Nhận diện mẫu: Không tìm thấy mẫu rõ ràng, tỷ lệ cân bằng, kết quả gần nhất là Xỉu (${extendedHistory[0]}), dự đoán Tài`;
    }
  }
  
  return {
    prediction,
    reason,
    strategy: "PatternRecognition"
  };
}

/**
 * Thuật toán phân tích tần suất và chu kỳ xuất hiện
 * Phân tích tần suất xuất hiện của các số cũng như chu kỳ lặp lại
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @returns {Object} Kết quả dự đoán
 */
function frequencyPatternAnalysis(history, position) {
  if (!history || history.length < 20) {
    const randomPrediction = Math.floor(Math.random() * 10);
    return {
      prediction: randomPrediction,
      reason: "Không đủ dữ liệu trước để phân tích tần suất, dự đoán ngẫu nhiên " + (randomPrediction >= 5 ? "(Tài)" : "(Xỉu)"),
      strategy: "FrequencyPatternAnalysis"
    };
  }

  // Lấy 50 kết quả gần đây để phân tích
  const recentNumbers = history.slice(0, 50).map(item => parseInt(item.numbers[position]));
  
  // 1. Thống kê tần suất xuất hiện của từng số
  const frequencyMap = {};
  for (let i = 0; i < 10; i++) {
    frequencyMap[i] = 0;
  }
  
  recentNumbers.forEach(num => {
    frequencyMap[num]++;
  });
  
  // 2. Tìm các số xuất hiện nhiều nhất và ít nhất
  let maxFrequency = 0;
  let minFrequency = 50;
  let mostFrequentNumbers = [];
  let leastFrequentNumbers = [];
  
  for (let i = 0; i < 10; i++) {
    if (frequencyMap[i] > maxFrequency) {
      maxFrequency = frequencyMap[i];
      mostFrequentNumbers = [i];
    } else if (frequencyMap[i] === maxFrequency) {
      mostFrequentNumbers.push(i);
    }
    
    if (frequencyMap[i] < minFrequency) {
      minFrequency = frequencyMap[i];
      leastFrequentNumbers = [i];
    } else if (frequencyMap[i] === minFrequency) {
      leastFrequentNumbers.push(i);
    }
  }
  
  // 3. Phân tích khoảng cách giữa các lần xuất hiện của mỗi số
  const gapAnalysis = {};
  for (let i = 0; i < 10; i++) {
    gapAnalysis[i] = {
      lastPosition: -1,
      gaps: []
    };
  }
  
  recentNumbers.forEach((num, index) => {
    const numKey = num.toString();
    if (gapAnalysis[numKey].lastPosition !== -1) {
      const gap = index - gapAnalysis[numKey].lastPosition;
      gapAnalysis[numKey].gaps.push(gap);
    }
    gapAnalysis[numKey].lastPosition = index;
  });
  
  // 4. Tìm số có khả năng xuất hiện cao nhất dựa trên chu kỳ
  let potentialDueNumbers = [];
  
  for (let i = 0; i < 10; i++) {
    const numKey = i.toString();
    if (gapAnalysis[numKey].gaps.length > 0) {
      // Tính khoảng cách trung bình giữa các lần xuất hiện
      const avgGap = gapAnalysis[numKey].gaps.reduce((sum, gap) => sum + gap, 0) / gapAnalysis[numKey].gaps.length;
      
      // Tính khoảng cách hiện tại từ lần xuất hiện cuối cùng
      const currentGap = gapAnalysis[numKey].lastPosition;
      
      // Nếu khoảng cách hiện tại gần bằng hoặc lớn hơn khoảng cách trung bình, số này có khả năng xuất hiện
      if (currentGap >= avgGap * 0.8) {
        potentialDueNumbers.push({
          number: i,
          currentGap: currentGap, 
          avgGap: avgGap,
          dueScore: currentGap / avgGap  // Điểm "sắp đến" càng cao thì càng có khả năng xuất hiện
        });
      }
    }
  }
  
  // 5. Xác định số nào có khả năng cao nhất sẽ xuất hiện
  if (potentialDueNumbers.length > 0) {
    // Sắp xếp theo điểm "sắp đến" giảm dần
    potentialDueNumbers.sort((a, b) => b.dueScore - a.dueScore);
    
    // Lấy top 3 số có khả năng xuất hiện cao nhất
    const topDueNumbers = potentialDueNumbers.slice(0, Math.min(3, potentialDueNumbers.length));
    
    // Chọn một số từ top 3
    const selectedNumber = topDueNumbers[Math.floor(Math.random() * topDueNumbers.length)].number;
    
    return {
      prediction: selectedNumber,
      reason: `Phân tích chu kỳ: Số ${selectedNumber} có khả năng cao sẽ xuất hiện (${Math.round(potentialDueNumbers[0].dueScore * 100)}% chu kỳ)`,
      strategy: "FrequencyPatternAnalysis"
    };
  }
  
  // 6. Nếu không tìm thấy số nào có chu kỳ rõ ràng, dựa vào tần suất xuất hiện
  
  // Kiểm tra số lần xuất hiện Tài/Xỉu trong 10 kết quả gần nhất
  const recent10 = recentNumbers.slice(0, 10);
  const taiCount = recent10.filter(num => num >= 5).length;
  const xiuCount = recent10.filter(num => num < 5).length;
  
  // Nếu có xu hướng Tài/Xỉu rõ ràng trong 10 kết quả gần đây, dự đoán ngược lại
  if (taiCount >= 7) {
    // Xu hướng mạnh về Tài, dự đoán sẽ đảo chiều sang Xỉu
    // Chọn trong các số ít xuất hiện nhất và là Xỉu
    const rarestXiu = leastFrequentNumbers.filter(num => num < 5);
    if (rarestXiu.length > 0) {
      const prediction = rarestXiu[Math.floor(Math.random() * rarestXiu.length)];
      return {
        prediction,
        reason: `Phân tích tần suất: Tài xuất hiện nhiều (${taiCount}/10), số ${prediction} là Xỉu có tần suất thấp, dự đoán số ${prediction}`,
        strategy: "FrequencyPatternAnalysis"
      };
    }
    // Nếu không tìm thấy số Xỉu hiếm, chọn một số Xỉu ngẫu nhiên
    const prediction = Math.floor(Math.random() * 5);
    return {
      prediction,
      reason: `Phân tích tần suất: Tài xuất hiện nhiều (${taiCount}/10), dự đoán Xỉu với số ${prediction}`,
      strategy: "FrequencyPatternAnalysis"
    };
  } else if (xiuCount >= 7) {
    // Xu hướng mạnh về Xỉu, dự đoán sẽ đảo chiều sang Tài
    // Chọn trong các số ít xuất hiện nhất và là Tài
    const rarestTai = leastFrequentNumbers.filter(num => num >= 5);
    if (rarestTai.length > 0) {
      const prediction = rarestTai[Math.floor(Math.random() * rarestTai.length)];
      return {
        prediction,
        reason: `Phân tích tần suất: Xỉu xuất hiện nhiều (${xiuCount}/10), số ${prediction} là Tài có tần suất thấp, dự đoán số ${prediction}`,
        strategy: "FrequencyPatternAnalysis"
      };
    }
    // Nếu không tìm thấy số Tài hiếm, chọn một số Tài ngẫu nhiên
    const prediction = 5 + Math.floor(Math.random() * 5);
    return {
      prediction,
      reason: `Phân tích tần suất: Xỉu xuất hiện nhiều (${xiuCount}/10), dự đoán Tài với số ${prediction}`,
      strategy: "FrequencyPatternAnalysis"
    };
  }
  
  // Nếu không có xu hướng rõ ràng, dự đoán dựa trên số xuất hiện ít nhất gần đây
  // Chọn ngẫu nhiên một trong các số ít xuất hiện nhất
  const prediction = leastFrequentNumbers[Math.floor(Math.random() * leastFrequentNumbers.length)];
  const predictionType = prediction >= 5 ? "Tài" : "Xỉu";
  
  return {
    prediction,
    reason: `Phân tích tần suất: Số ${prediction} (${predictionType}) có tần suất thấp nhất (${minFrequency}/50), dự đoán số ${prediction}`,
    strategy: "FrequencyPatternAnalysis"
  };
}

/**
 * Thuật toán thích ứng theo khung giờ
 * Phân tích hiệu suất các phương pháp dự đoán khác nhau và đưa ra dự đoán tối ưu cho khung giờ hiện tại
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @returns {Object} Kết quả dự đoán
 */
function adaptiveTimeStrategy(history, position) {
  if (!history || history.length < 10) {
    const randomPrediction = Math.floor(Math.random() * 10);
    return {
      prediction: randomPrediction,
      reason: "Không đủ dữ liệu trước để phân tích khung giờ, dự đoán ngẫu nhiên " + (randomPrediction >= 5 ? "(Tài)" : "(Xỉu)"),
      strategy: "AdaptiveTimeStrategy"
    };
  }

  // 1. Xác định khung giờ hiện tại
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  // 2. Phân chia các khung giờ dự đoán
  // - Sáng sớm (5:00-8:00): thường có mẫu ổn định
  // - Buổi sáng (8:00-11:00): thường có nhiều biến động
  // - Trưa (11:00-14:00): thường có xu hướng rõ ràng
  // - Chiều (14:00-17:00): thường có nhiều đảo chiều
  // - Chiều tối (17:00-20:00): thường có mẫu luân phiên
  // - Tối (20:00-23:00): thường có xu hướng mạnh
  // - Đêm khuya (23:00-5:00): thường có mẫu ổn định, ít biến động
  
  // 3. Dựa vào khung giờ, chọn một hoặc kết hợp nhiều chiến lược khác nhau
  let selectedStrategies = [];
  
  if (hour >= 5 && hour < 8) {
    // Khung giờ sáng sớm: kết hợp mô hình ổn định và xu hướng
    selectedStrategies = [simpleFollowTrendShort, patternRecognition];
  } else if (hour >= 8 && hour < 11) {
    // Khung giờ buổi sáng: kết hợp nhiều mẫu phân tích
    selectedStrategies = [weightedFollowTrendCombined, waveTrend, frequencyPatternAnalysis];
  } else if (hour >= 11 && hour < 14) {
    // Khung giờ trưa: dùng phân tích xu hướng và mẫu
    selectedStrategies = [simpleFollowTrendCombined, patternRecognition];
  } else if (hour >= 14 && hour < 17) {
    // Khung giờ chiều: phân tích biến động và đảo chiều
    selectedStrategies = [waveTrend, frequencyPatternAnalysis];
  } else if (hour >= 17 && hour < 20) {
    // Khung giờ chiều tối: phân tích mô hình luân phiên
    selectedStrategies = [patternRecognition, weightedFollowTrendShort];
  } else if (hour >= 20 && hour < 23) {
    // Khung giờ tối: phân tích xu hướng mạnh
    selectedStrategies = [simpleFollowTrend, weightedFollowTrendCombined];
  } else {
    // Khung giờ đêm khuya: mô hình đặc biệt cho đêm
    selectedStrategies = [nightFollowTrend, simpleFollowTrendVeryShort];
  }
  
  // 4. Phân tích kết quả gần đây để xác định độ chuẩn xác của các thuật toán
  const shortHistory = history.slice(0, Math.min(20, history.length));
  
  // 5. Thực hiện dự đoán với tất cả các thuật toán đã chọn
  const predictions = [];
  
  for (const strategy of selectedStrategies) {
    try {
      const result = strategy(history, position);
      predictions.push(result);
    } catch (error) {
      console.log(`Lỗi khi thực thi thuật toán ${strategy.name}: ${error.message}`);
    }
  }
  
  // 6. Phân tích kết quả gần đây để xác định xu hướng
  const recent10 = shortHistory.slice(0, 10).map(item => parseInt(item.numbers[position]));
  const taiCount = recent10.filter(num => num >= 5).length;
  const xiuCount = recent10.filter(num => num < 5).length;
  
  const currentTrend = taiCount > xiuCount ? "Tài" : (xiuCount > taiCount ? "Xỉu" : "Cân bằng");
  
  // 7. Xác định mức độ nhất quán giữa các dự đoán
  let taiPredictions = 0;
  let xiuPredictions = 0;
  
  predictions.forEach(pred => {
    if (pred.prediction >= 5) taiPredictions++;
    else xiuPredictions++;
  });
  
  // Nếu tất cả các dự đoán đều giống nhau, tin tưởng vào kết quả đó
  if (taiPredictions === predictions.length || xiuPredictions === predictions.length) {
    const consensusPrediction = taiPredictions > 0 ? 
      5 + Math.floor(Math.random() * 5) : 
      Math.floor(Math.random() * 5);
    
    const consensusType = consensusPrediction >= 5 ? "Tài" : "Xỉu";
    
    // Phân tích xem xu hướng hiện tại có khớp với dự đoán không
    if ((consensusType === "Tài" && currentTrend === "Tài" && taiCount >= 8) || 
        (consensusType === "Xỉu" && currentTrend === "Xỉu" && xiuCount >= 8)) {
      // Nếu xu hướng quá mạnh và khớp với dự đoán, cân nhắc đảo chiều
      const reversedPrediction = consensusType === "Tài" ? 
        Math.floor(Math.random() * 5) : 
        5 + Math.floor(Math.random() * 5);
      
      return {
        prediction: reversedPrediction,
        reason: `Khung giờ ${hour}h: Các thuật toán nhất trí dự đoán ${consensusType}, nhưng xu hướng ${currentTrend} quá mạnh (${consensusType === "Tài" ? taiCount : xiuCount}/10), dự đoán đảo chiều`,
        strategy: "AdaptiveTimeStrategy"
      };
    }
    
    return {
      prediction: consensusPrediction,
      reason: `Khung giờ ${hour}h: Tất cả ${predictions.length} thuật toán đều dự đoán ${consensusType}, dự đoán số ${consensusPrediction}`,
      strategy: "AdaptiveTimeStrategy"
    };
  }
  
  // Nếu có sự mâu thuẫn giữa các dự đoán, xem xét xu hướng gần đây
  if (Math.abs(taiPredictions - xiuPredictions) <= 1) {
    // Các dự đoán không nhất quán, dựa vào xu hướng gần đây
    if (currentTrend === "Tài") {
      // Nếu xu hướng là Tài, nhưng không quá mạnh, tiếp tục dự đoán Tài
      if (taiCount <= 7) {
        const prediction = 5 + Math.floor(Math.random() * 5);
        return {
          prediction,
          reason: `Khung giờ ${hour}h: Các thuật toán không nhất quán, xu hướng hiện tại là Tài (${taiCount}/10), dự đoán Tài`,
          strategy: "AdaptiveTimeStrategy"
        };
      } else {
        // Nếu xu hướng Tài quá mạnh (8+/10), dự đoán đảo chiều sang Xỉu
        const prediction = Math.floor(Math.random() * 5);
        return {
          prediction,
          reason: `Khung giờ ${hour}h: Các thuật toán không nhất quán, xu hướng Tài quá mạnh (${taiCount}/10), dự đoán đảo chiều sang Xỉu`,
          strategy: "AdaptiveTimeStrategy"
        };
      }
    } else if (currentTrend === "Xỉu") {
      // Nếu xu hướng là Xỉu, nhưng không quá mạnh, tiếp tục dự đoán Xỉu
      if (xiuCount <= 7) {
        const prediction = Math.floor(Math.random() * 5);
        return {
          prediction,
          reason: `Khung giờ ${hour}h: Các thuật toán không nhất quán, xu hướng hiện tại là Xỉu (${xiuCount}/10), dự đoán Xỉu`,
          strategy: "AdaptiveTimeStrategy"
        };
      } else {
        // Nếu xu hướng Xỉu quá mạnh (8+/10), dự đoán đảo chiều sang Tài
        const prediction = 5 + Math.floor(Math.random() * 5);
        return {
          prediction,
          reason: `Khung giờ ${hour}h: Các thuật toán không nhất quán, xu hướng Xỉu quá mạnh (${xiuCount}/10), dự đoán đảo chiều sang Tài`,
          strategy: "AdaptiveTimeStrategy"
        };
      }
    } else {
      // Nếu không có xu hướng rõ ràng, dựa vào kết quả gần nhất và đảo chiều
      const lastResult = parseInt(history[0].numbers[position]);
      
      if (lastResult >= 5) {
        const prediction = Math.floor(Math.random() * 5);
        return {
          prediction,
          reason: `Khung giờ ${hour}h: Các thuật toán không nhất quán, không có xu hướng rõ ràng, kết quả gần nhất là Tài (${lastResult}), dự đoán Xỉu`,
          strategy: "AdaptiveTimeStrategy"
        };
      } else {
        const prediction = 5 + Math.floor(Math.random() * 5);
        return {
          prediction,
          reason: `Khung giờ ${hour}h: Các thuật toán không nhất quán, không có xu hướng rõ ràng, kết quả gần nhất là Xỉu (${lastResult}), dự đoán Tài`,
          strategy: "AdaptiveTimeStrategy"
        };
      }
    }
  }
  
  // Nếu đa số các thuật toán thiên về một hướng, chọn dự đoán đó
  if (taiPredictions > xiuPredictions) {
    const prediction = 5 + Math.floor(Math.random() * 5);
    return {
      prediction,
      reason: `Khung giờ ${hour}h: ${taiPredictions}/${predictions.length} thuật toán dự đoán Tài, dự đoán số ${prediction}`,
      strategy: "AdaptiveTimeStrategy"
    };
  } else {
    const prediction = Math.floor(Math.random() * 5);
    return {
      prediction,
      reason: `Khung giờ ${hour}h: ${xiuPredictions}/${predictions.length} thuật toán dự đoán Xỉu, dự đoán số ${prediction}`,
      strategy: "AdaptiveTimeStrategy"
    };
  }
}

/**
 * Thuật toán kết hợp có giới hạn
 * Chỉ sử dụng 2 thuật toán tốt nhất dựa trên phân tích gần đây
 * @param {Array} history - Lịch sử kết quả
 * @param {Number} position - Vị trí (index) trong mảng kết quả cần dự đoán
 * @returns {Object} Kết quả dự đoán
 */
function limitedCombinedPredictor(history, position) {
  if (!history || history.length < 10) {
    const randomPrediction = Math.floor(Math.random() * 10);
    return {
      prediction: randomPrediction,
      reason: "Không đủ dữ liệu trước để phân tích, dự đoán ngẫu nhiên " + (randomPrediction >= 5 ? "(Tài)" : "(Xỉu)"),
      strategy: "LimitedCombinedPredictor"
    };
  }

  // Chọn 2 thuật toán dựa trên thời điểm và điều kiện hiện tại
  const now = new Date();
  const hour = now.getHours();
  
  // Phân tích xu hướng gần đây
  const recent10 = history.slice(0, 10).map(item => parseInt(item.numbers[position]));
  const taiCount = recent10.filter(num => num >= 5).length;
  const xiuCount = recent10.filter(num => num < 5).length;
  
  // Tính biên độ dao động
  const changes = [];
  for (let i = 0; i < recent10.length - 1; i++) {
    changes.push(Math.abs(recent10[i] - recent10[i + 1]));
  }
  const avgAmplitude = changes.reduce((sum, change) => sum + change, 0) / changes.length;

  // Chọn thuật toán phù hợp nhất dựa trên điều kiện
  let predictor1, predictor2;

  // Điều kiện 1: Thời gian đêm khuya (23h-5h)
  if (hour >= 23 || hour < 5) {
    predictor1 = nightFollowTrend;
    predictor2 = simpleFollowTrendVeryShort;
  }
  // Điều kiện 2: Biên độ dao động cao (>3.5)
  else if (avgAmplitude > 3.5) {
    predictor1 = waveTrend;
    predictor2 = patternRecognition;
  }
  // Điều kiện 3: Xu hướng mạnh (8+ kết quả giống nhau trong 10 kết quả)
  else if (taiCount >= 8 || xiuCount >= 8) {
    predictor1 = weightedFollowTrendShort;
    predictor2 = simpleFollowTrendVeryShort;
  }
  // Điều kiện 4: Không có xu hướng rõ ràng (tỷ lệ 5:5 hoặc 6:4)
  else if (Math.abs(taiCount - xiuCount) <= 2) {
    predictor1 = patternRecognition;
    predictor2 = frequencyPatternAnalysis;
  }
  // Mặc định: Sử dụng kết hợp các thuật toán ngắn hạn
  else {
    predictor1 = simpleFollowTrendVeryShort;
    predictor2 = weightedFollowTrendShort;
  }

  // Thực hiện dự đoán với 2 thuật toán đã chọn
  const prediction1 = predictor1(history, position);
  const prediction2 = predictor2(history, position);

  // Nếu 2 thuật toán cho kết quả giống nhau
  if ((prediction1.prediction >= 5 && prediction2.prediction >= 5) ||
      (prediction1.prediction < 5 && prediction2.prediction < 5)) {
    return {
      prediction: prediction1.prediction,
      reason: `Cả hai thuật toán (${prediction1.strategy} và ${prediction2.strategy}) đều dự đoán ${prediction1.prediction >= 5 ? 'Tài' : 'Xỉu'}. ${prediction1.reason}`,
      strategy: "LimitedCombinedPredictor"
    };
  }

  // Nếu 2 thuật toán cho kết quả khác nhau, phân tích thêm
  const recentTrend = taiCount > xiuCount ? "Tài" : (xiuCount > taiCount ? "Xỉu" : "Cân bằng");
  const lastResult = recent10[0];
  
  // Ưu tiên dự đoán ngược với xu hướng nếu xu hướng quá mạnh
  if (taiCount >= 7) {
    return {
      prediction: Math.floor(Math.random() * 5), // Dự đoán Xỉu
      reason: `Hai thuật toán cho kết quả khác nhau, xu hướng Tài quá mạnh (${taiCount}/10), dự đoán đảo chiều sang Xỉu`,
      strategy: "LimitedCombinedPredictor"
    };
  } else if (xiuCount >= 7) {
    return {
      prediction: 5 + Math.floor(Math.random() * 5), // Dự đoán Tài
      reason: `Hai thuật toán cho kết quả khác nhau, xu hướng Xỉu quá mạnh (${xiuCount}/10), dự đoán đảo chiều sang Tài`,
      strategy: "LimitedCombinedPredictor"
    };
  }

  // Nếu không có xu hướng quá mạnh, ưu tiên thuật toán phù hợp với điều kiện hiện tại
  if (avgAmplitude > 3) {
    return {
      prediction: prediction1.prediction, // Ưu tiên predictor1 (thường là waveTrend hoặc patternRecognition)
      reason: `Hai thuật toán cho kết quả khác nhau, biên độ dao động cao (${avgAmplitude.toFixed(1)}), ưu tiên ${prediction1.strategy}. ${prediction1.reason}`,
      strategy: "LimitedCombinedPredictor"
    };
  }

  // Mặc định: dự đoán ngược với kết quả gần nhất
  return {
    prediction: lastResult >= 5 ? Math.floor(Math.random() * 5) : 5 + Math.floor(Math.random() * 5),
    reason: `Hai thuật toán cho kết quả khác nhau, không có xu hướng rõ ràng, kết quả gần nhất là ${lastResult >= 5 ? 'Tài' : 'Xỉu'}, dự đoán đảo chiều`,
    strategy: "LimitedCombinedPredictor"
  };
}

module.exports = {
  simpleFollowTrend,
  simpleFollowTrendShort,
  simpleFollowTrendVeryShort,
  simpleFollowTrendCombined,
  weightedFollowTrendShort,
  waveTrend,
  weightedFollowTrendCombined,
  nightFollowTrend,
  patternRecognition,
  frequencyPatternAnalysis,
  adaptiveTimeStrategy,
  limitedCombinedPredictor
}; 
/**
 * Dự đoán mảng tiếp theo dựa trên chuỗi các mảng đã cho
 * @param {Array<Array<number>>} arrays - Mảng các mảng số
 * @param {Array<number>|null} positions - Các vị trí cần dự đoán (từ 1 đến n), hoặc null để dự đoán tất cả
 * @param {number} min - Giới hạn dưới của phạm vi (mặc định: 0)
 * @param {number} max - Giới hạn trên của phạm vi (mặc định: 9)
 * @param {number} maxHistoryLength - Số lượng mảng gần nhất để sử dụng (mặc định: 20)
 * @returns {Array<number>} - Mảng dự đoán tiếp theo hoặc các phần tử đã được chọn
 */
function predictNextArray(arrays, positions = null, min = 0, max = 9, maxHistoryLength = 20) {
  // Kiểm tra đầu vào
  if (!arrays || !Array.isArray(arrays) || arrays.length < 2) {
    throw new Error("Cần ít nhất 2 mảng để dự đoán mảng tiếp theo");
  }

  // Giới hạn số lượng mảng lịch sử sử dụng để dự đoán
  const limitedArrays = arrays.length > maxHistoryLength 
    ? arrays.slice(-maxHistoryLength) 
    : arrays;

  const arrayLength = limitedArrays[0].length;
  
  // Kiểm tra xem tất cả các mảng có cùng độ dài không
  if (!limitedArrays.every(arr => arr.length === arrayLength)) {
    throw new Error("Tất cả các mảng phải có cùng độ dài");
  }

  // Dự đoán mảng tiếp theo
  const nextArray = [];
  
  // Với mỗi vị trí trong mảng
  for (let pos = 0; pos < arrayLength; pos++) {
    // Lấy tất cả các giá trị ở vị trí này từ tất cả các mảng
    const values = limitedArrays.map(arr => arr[pos]);
    
    // Sử dụng phương pháp kết hợp để dự đoán giá trị tiếp theo
    const nextValue = enhancedPredictNextValue(values, min, max);
    
    nextArray.push(nextValue);
  }

  // Nếu không có vị trí cụ thể được chỉ định, trả về toàn bộ mảng dự đoán
  if (!positions || !Array.isArray(positions) || positions.length === 0) {
    return nextArray;
  }
  
  // Nếu có vị trí cụ thể, chỉ trả về các giá trị ở các vị trí đó
  // Lưu ý: vị trí người dùng đưa vào bắt đầu từ 1, nhưng chỉ số mảng bắt đầu từ 0
  return positions.map(pos => {
    const index = pos - 1;
    if (index < 0 || index >= nextArray.length) {
      throw new Error(`Vị trí ${pos} không hợp lệ cho mảng có độ dài ${arrayLength}`);
    }
    return nextArray[index];
  });
}

/**
 * Dự đoán giá trị tiếp theo dựa trên chuỗi các giá trị với phương pháp nâng cao
 * @param {Array<number>} values - Chuỗi các giá trị
 * @param {number} min - Giới hạn dưới của phạm vi
 * @param {number} max - Giới hạn trên của phạm vi
 * @returns {number} - Giá trị dự đoán tiếp theo
 */
function enhancedPredictNextValue(values, min = 0, max = 9) {
  // Sử dụng kết hợp nhiều phương pháp để tăng độ chính xác
  
  // 1. Phân tích mẫu gần đây (nếu có ít nhất 5 giá trị)
  if (values.length >= 5) {
    // Kiểm tra các mẫu lặp lại
    const lastValues = values.slice(-5);
    const sum = lastValues.reduce((a, b) => a + b, 0);
    const avg = sum / lastValues.length;
    
    // Kiểm tra xu hướng gần đây
    const recentTrend = lastValues[lastValues.length - 1] - lastValues[lastValues.length - 2];
    
    // Nếu số gần nhất dưới trung bình, có xu hướng lớn hơn trung bình
    if (lastValues[lastValues.length - 1] < avg && recentTrend >= 0) {
      const prediction = Math.round(avg + 1);
      return Math.max(min, Math.min(max, prediction));
    }
    
    // Nếu số gần nhất trên trung bình, có xu hướng nhỏ hơn trung bình
    if (lastValues[lastValues.length - 1] > avg && recentTrend <= 0) {
      const prediction = Math.round(avg - 1);
      return Math.max(min, Math.min(max, prediction));
    }
  }
  
  // 2. Phương pháp "hot and cold numbers"
  const frequency = {};
  for (let i = min; i <= max; i++) {
    frequency[i] = 0;
  }
  
  // Đếm tần suất xuất hiện
  values.forEach(val => {
    if (val >= min && val <= max) {
      frequency[val]++;
    }
  });
  
  // Tìm số xuất hiện ít nhất (cold numbers)
  let coldNumbers = [];
  let minFreq = Number.MAX_SAFE_INTEGER;
  
  for (let i = min; i <= max; i++) {
    if (frequency[i] < minFreq) {
      minFreq = frequency[i];
      coldNumbers = [i];
    } else if (frequency[i] === minFreq) {
      coldNumbers.push(i);
    }
  }
  
  // 3. Chọn ngẫu nhiên từ các số cold (ít xuất hiện nhất)
  // Nếu số xuất hiện gần đây < 5, ưu tiên số lớn hơn
  const lastValue = values[values.length - 1];
  
  if (lastValue < 5) {
    // Lọc các số cold lớn hơn 5
    const highColdNumbers = coldNumbers.filter(n => n >= 5);
    if (highColdNumbers.length > 0) {
      return highColdNumbers[Math.floor(Math.random() * highColdNumbers.length)];
    }
  } else {
    // Lọc các số cold nhỏ hơn 5
    const lowColdNumbers = coldNumbers.filter(n => n < 5);
    if (lowColdNumbers.length > 0) {
      return lowColdNumbers[Math.floor(Math.random() * lowColdNumbers.length)];
    }
  }
  
  // 4. Nếu không có số cold phù hợp, sử dụng phương pháp gốc (hồi quy tuyến tính)
  return predictNextValue(values, min, max);
}

/**
 * Dự đoán giá trị tiếp theo dựa trên chuỗi các giá trị (phương pháp gốc)
 * @param {Array<number>} values - Chuỗi các giá trị
 * @param {number} min - Giới hạn dưới của phạm vi
 * @param {number} max - Giới hạn trên của phạm vi
 * @returns {number} - Giá trị dự đoán tiếp theo
 */
function predictNextValue(values, min = 0, max = 9) {
  // Phương pháp hồi quy tuyến tính đơn giản
  const n = values.length;
  const x = Array.from({length: n}, (_, i) => i + 1);
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += values[i];
    sumXY += x[i] * values[i];
    sumX2 += x[i] * x[i];
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const nextX = n + 1;
  let prediction = intercept + slope * nextX;
  
  if (values.every(val => Number.isInteger(val))) {
    prediction = Math.round(prediction);
  }
  
  // Áp dụng quy tắc đảo ngược (nếu xu hướng không rõ ràng)
  if (Math.abs(slope) < 0.2) {
    const lastValue = values[values.length - 1];
    if (lastValue < 5) {
      prediction = 5 + Math.floor(Math.random() * 5); // Chọn ngẫu nhiên từ 5-9
    } else {
      prediction = Math.floor(Math.random() * 5); // Chọn ngẫu nhiên từ 0-4
    }
  }
  
  // Giới hạn kết quả trong phạm vi min-max
  prediction = Math.max(min, Math.min(max, prediction));
  
  return prediction;
}

// Ví dụ sử dụng
// const arrays = [[2, 3, 2, 5, 6], [0, 6, 3, 6, 7]];
// console.log("Dự đoán mảng tiếp theo:", predictNextArray(arrays));
// console.log("Dự đoán chỉ phần tử thứ 2 và 4:", predictNextArray(arrays, [2, 4]));

// Export các hàm để sử dụng trong các file khác
module.exports = {
  predictNextArray,
  predictNextValue,
  enhancedPredictNextValue
};

/**
 * Lấy danh sách các chiến lược dự đoán có sẵn
 * @returns {Object} Danh sách chiến lược và mô tả
 */
function getAvailableStrategies() {
  return {
    'default': 'Phương pháp theo xu hướng cơ bản',
    'short': 'Phân tích xu hướng ngắn hạn',
    'veryshort': 'Phân tích xu hướng rất ngắn',
    'combined': 'Kết hợp nhiều phương pháp xu hướng',
    'weightedShort': 'Phân tích xu hướng ngắn có trọng số',
    'waveTrend': 'Phân tích biên độ dao động',
    'weightedCombined': 'Kết hợp nhiều phương pháp có trọng số',
    'nightTrend': 'Phương pháp đặc biệt cho đêm khuya',
    'patternRecognition': 'Nhận dạng mẫu số liệu',
    'frequencyPattern': 'Phân tích tần suất xuất hiện',
    'adaptiveTime': 'Tự điều chỉnh theo thời gian',
    'limited': 'Kết hợp có giới hạn'
  };
}

/**
 * Lấy chiến lược dự đoán dựa trên thời gian hiện tại
 * @returns {String} Tên chiến lược dự đoán
 */
function getCurrentStrategy() {
  const now = new Date();
  const hour = now.getHours();

  // Chọn chiến lược dựa trên khung giờ
  if (hour >= 0 && hour < 3) {
    return 'nightTrend';  // Đêm khuya: Sử dụng phương pháp đặc biệt cho đêm
  } else if (hour >= 3 && hour < 6) {
    return 'veryshort';   // Đêm muộn: Biến động ít
  } else if (hour >= 6 && hour < 8) {
    return 'short';       // Sáng sớm: Hiệu suất tốt
  } else if (hour >= 8 && hour < 10) {
    return 'veryshort';   // Buổi sáng: Ổn định
  } else if (hour >= 10 && hour < 12) {
    return 'waveTrend';   // Trưa sớm: Phân tích biên độ
  } else if (hour >= 12 && hour < 14) {
    return 'short';       // Buổi trưa: Xu hướng ngắn
  } else if (hour >= 14 && hour < 16) {
    return 'waveTrend';   // Chiều sớm: Biến động mạnh
  } else if (hour >= 16 && hour < 18) {
    return 'veryshort';   // Buổi chiều: Nhanh nhạy
  } else if (hour >= 18 && hour < 20) {
    return 'short';       // Tối sớm: Ổn định
  } else if (hour >= 20 && hour < 22) {
    return 'waveTrend';   // Buổi tối: Phân tích dao động
  } else {
    return 'nightTrend';  // Đêm: Phương pháp đặc biệt
  }
}

module.exports = {
  getCurrentStrategy,
  getAvailableStrategies
}; 
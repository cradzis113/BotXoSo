const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { formatDate } = require('./utils');

// Đường dẫn đến các file dữ liệu
const DATA_DIR = path.join(__dirname, '../data');
const PREDICTIONS_FILE = path.join(DATA_DIR, 'predictions.json');
const PREDICTION_LOG_FILE = path.join(DATA_DIR, 'prediction_log.txt');

/**
 * Kiểm tra và tạo thư mục hoặc file nếu chúng không tồn tại
 */
function ensureDirectoryAndFilesExist() {
  // Kiểm tra và tạo thư mục data nếu không tồn tại
  if (!fs.existsSync(DATA_DIR)) {
    console.log(`📁 Thư mục data không tồn tại. Đang tạo thư mục: ${DATA_DIR}`);
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Kiểm tra và tạo file prediction_log.txt nếu nó không tồn tại
  if (!fs.existsSync(PREDICTION_LOG_FILE)) {
    console.log(`📄 File prediction_log.txt không tồn tại. Đang tạo...`);
    fs.writeFileSync(PREDICTION_LOG_FILE, '', 'utf8');
  }

  // Kiểm tra và tạo file predictions.json nếu nó không tồn tại
  if (!fs.existsSync(PREDICTIONS_FILE)) {
    console.log(`📄 File predictions.json không tồn tại. Đang tạo...`);
    const defaultPrediction = {
      drawId: formatDate(new Date(), 'YYYYMMDD') + '0001',
      numbers: ['?', '?', '?', '?', '?'],
      detail: {
        index: 0,
        prediction: Math.floor(Math.random() * 10),
        reason: "Dự đoán mặc định khi tạo file",
        strategy: "SimpleFollowTrend"
      },
      timestamp: new Date().toISOString()
    };
    fs.writeFileSync(PREDICTIONS_FILE, JSON.stringify(defaultPrediction, null, 2), 'utf8');
  }
}

/**
 * Đọc dữ liệu dự đoán hiện tại
 * @returns {Promise<Object>} Dữ liệu dự đoán
 */
async function readPrediction() {
  try {
    // Đảm bảo thư mục và file tồn tại
    ensureDirectoryAndFilesExist();
    
    const data = await fsPromises.readFile(PREDICTIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Không thể đọc file dự đoán:', error.message);
    // Trả về dự đoán mặc định nếu không thể đọc
    return {
      drawId: formatDate(new Date(), 'YYYYMMDD') + '0001',
      numbers: ['?', '?', '?', '?', '?'],
      detail: {
        index: 0,
        prediction: Math.floor(Math.random() * 10),
        reason: "Dự đoán mặc định do lỗi đọc file",
        strategy: "SimpleFollowTrend"
      },
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Lưu dữ liệu dự đoán
 * @param {Object} prediction - Dữ liệu dự đoán
 * @returns {Promise<void>}
 */
async function savePrediction(prediction) {
  try {
    // Đảm bảo thư mục và file tồn tại
    ensureDirectoryAndFilesExist();
    
    const data = JSON.stringify(prediction, null, 2);
    await fsPromises.writeFile(PREDICTIONS_FILE, data, 'utf8');
  } catch (error) {
    console.error('Không thể lưu file dự đoán:', error.message);
  }
}

/**
 * Ghi log dự đoán mới
 * @param {Object} predictionData - Dữ liệu dự đoán hiện tại
 * @param {Object} actualResult - Kết quả thực tế
 * @returns {Promise<void>}
 */
async function logPredictionResult(predictionData, actualResult) {
  try {
    if (!predictionData || !actualResult) return;

    // Đảm bảo thư mục và file tồn tại
    ensureDirectoryAndFilesExist();

    const prediction = predictionData.detail.prediction;
    const strategy = predictionData.detail.strategy;
    const position = predictionData.detail.index;
    
    const actualNumber = parseInt(actualResult.numbers[position]);
    const predictionNumber = parseInt(prediction);
    
    // Xác định Tài/Xỉu cho dự đoán và kết quả thực tế
    const predictionType = predictionNumber >= 5 ? "Tai" : "Xiu";
    const actualType = actualNumber >= 5 ? "Tai" : "Xiu";
    
    // Xác định dự đoán đúng hay sai
    const isCorrect = (predictionNumber >= 5 && actualNumber >= 5) || 
                       (predictionNumber < 5 && actualNumber < 5);
    const resultText = isCorrect ? "Dung" : "Sai";
    
    // Định dạng thời gian
    const now = new Date();
    const timeStr = formatDate(now, "HH:mm:ss DD/MM/YYYY");
    
    // Tạo nội dung log
    const logContent = `[${timeStr}] - ${actualResult.drawId} - Du doan: ${predictionNumber} (${predictionType}) | So thuc te: ${actualNumber} (${actualType}) | [${resultText}] | Phuong phap: ${strategy} | Vi tri: ${position}\n`;
    
    // Đọc nội dung file log hiện tại
    let currentLog = '';
    try {
      currentLog = await fsPromises.readFile(PREDICTION_LOG_FILE, 'utf8');
    } catch (error) {
      // Nếu file không tồn tại, bỏ qua lỗi
    }
    
    // Thêm log mới vào đầu file
    const newLog = logContent + currentLog;
    
    // Lưu log
    await fsPromises.writeFile(PREDICTION_LOG_FILE, newLog, 'utf8');
    
  } catch (error) {
    console.error('Không thể ghi log dự đoán:', error.message);
  }
}

module.exports = {
  readPrediction,
  savePrediction,
  logPredictionResult
}; 
const fs = require('fs');

/**
 * Phân tích kết quả gần đây từ file log
 */
function analyzeRecentResults(logFile, limit = 15) {
  const results = [];

  if (!fs.existsSync(logFile)) {
    return results;
  }

  try {
    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '');

    // Lấy các dòng gần nhất
    const recentLines = lines.slice(-limit);

    for (const line of recentLines) {
      const actualMatch = line.match(/Số thực tế: (\d+) \((Tài|Xỉu)\)/);
      const predictedMatch = line.match(/Số dự đoán: (\d+) \((Tài|Xỉu)\)/);
      const isCorrect = line.includes('| Đúng');

      if (actualMatch && predictedMatch) {
        results.push({
          actualNumber: parseInt(actualMatch[1]),
          actualType: actualMatch[2],
          predictedNumber: parseInt(predictedMatch[1]),
          predictedType: predictedMatch[2],
          isCorrect: isCorrect
        });
      }
    }

    // Đảo ngược mảng để các kết quả gần nhất ở đầu
    return results.reverse();
  } catch (error) {
    console.error(`❌ Lỗi khi đọc file log: ${error.message}`);
    return [];
  }
}

/**
 * Phân tích thống kê gần đây
 */
function analyzeRecentStats(historyLogFile) {
  try {
    if (fs.existsSync(historyLogFile)) {
      const logContent = fs.readFileSync(historyLogFile, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim() !== '');
      
      // Đếm số dự đoán đúng/sai trong 15 kỳ gần nhất
      const recent = logLines.slice(Math.max(0, logLines.length - 15));
      const correctCount = recent.filter(line => line.includes('Đúng')).length;
      
      return {
        correct: correctCount,
        total: recent.length,
        rate: correctCount / recent.length
      };
    }
  } catch (error) {
    console.error('Error analyzing stats:', error);
  }
  
  return { correct: 0, total: 0, rate: 0 };
}

/**
 * Đếm chính xác các dự đoán sai liên tiếp
 */
function countConsecutiveErrors(results) {
  if (!results || results.length === 0) return 0;

  let count = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i].isCorrect === false) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

/**
 * Phân tích hiệu suất gần đây
 */
function analyzeRecentPerformance(historyLogFile, n = 10) {
  try {
    if (fs.existsSync(historyLogFile)) {
      const logContent = fs.readFileSync(historyLogFile, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim() !== '');
      
      // Đếm số dự đoán đúng/sai trong n kỳ gần nhất
      const recent = logLines.slice(Math.max(0, logLines.length - n));
      const correctCount = recent.filter(line => line.includes('Đúng')).length;
      
      // Phân tích theo phương pháp
      const methodStats = {};
      for (const line of recent) {
        const methodMatch = line.match(/Phương pháp: (\w+)/);
        const isCorrect = line.includes('Đúng');
        
        if (methodMatch && methodMatch[1]) {
          const method = methodMatch[1];
          if (!methodStats[method]) {
            methodStats[method] = { correct: 0, total: 0 };
          }
          
          methodStats[method].total++;
          if (isCorrect) {
            methodStats[method].correct++;
          }
        }
      }
      
      // Tính tỷ lệ thành công cho từng phương pháp
      const methodPerformance = [];
      for (const [method, stats] of Object.entries(methodStats)) {
        if (stats.total > 0) {
          methodPerformance.push({
            method,
            correct: stats.correct,
            total: stats.total,
            successRate: (stats.correct / stats.total * 100).toFixed(1)
          });
        }
      }
      
      return {
        overall: {
          correct: correctCount,
          total: recent.length,
          successRate: recent.length > 0 ? (correctCount / recent.length * 100).toFixed(1) : 0
        },
        methods: methodPerformance.sort((a, b) => b.successRate - a.successRate)
      };
    }
  } catch (error) {
    console.error('Error analyzing recent performance:', error);
  }
  
  return { overall: { correct: 0, total: 0, successRate: 0 }, methods: [] };
}

module.exports = {
  analyzeRecentResults,
  analyzeRecentStats,
  countConsecutiveErrors,
  analyzeRecentPerformance
};
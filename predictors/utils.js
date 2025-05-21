/**
 * Utility functions for prediction system
 */

/**
 * Format date theo định dạng cụ thể
 * @param {Date} date - Date object cần format
 * @param {string} format - Định dạng (HH:mm:ss DD/MM/YYYY)
 * @returns {string} Chuỗi ngày đã được format
 */
function formatDate(date, format) {
  const pad = (num, size = 2) => String(num).padStart(size, '0');
  
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  
  return format
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year);
}

/**
 * Tạo ID cho kỳ xổ tiếp theo
 * @param {string} currentId - ID kỳ xổ hiện tại
 * @returns {string} ID kỳ xổ tiếp theo
 */
function generateNextDrawId(currentId) {
  // Format: YYYYMMDDXXXX (năm, tháng, ngày, số kỳ trong ngày)
  if (!currentId || currentId.length !== 12) {
    // Nếu không có ID hiện tại hoặc sai định dạng, tạo ID mới
    const now = new Date();
    const dateStr = formatDate(now, 'YYYYMMDD');
    return `${dateStr}0001`;
  }
  
  // Tách phần ngày và số kỳ
  const dateStr = currentId.substring(0, 8);
  const drawNumber = parseInt(currentId.substring(8));
  
  // Tăng số kỳ lên 1
  const nextDrawNumber = drawNumber + 1;
  
  // Format lại với padding 4 chữ số
  return `${dateStr}${String(nextDrawNumber).padStart(4, '0')}`;
}

module.exports = {
  formatDate,
  generateNextDrawId
}; 
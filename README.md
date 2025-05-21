# Bot Dự Đoán Xổ Số (Bot XS1) - Phiên Bản Cải Tiến

Bot này giúp tự động dự đoán kết quả xổ số dựa trên phân tích các kết quả trước đó.

## Tính Năng Mới

Phiên bản cải tiến bổ sung các thuật toán dự đoán khác nhau cho phép thử nghiệm với các giới hạn dữ liệu đầu vào khác nhau:

### Các chiến lược dự đoán có sẵn:

1. **default**: Sử dụng 10 kết quả gần nhất (thuật toán gốc)
2. **short**: Sử dụng 5 kết quả gần nhất
3. **veryshort**: Sử dụng 3 kết quả gần nhất
4. **combined**: Kết hợp phân tích xu hướng ngắn hạn (5 kết quả) và dài hạn (10 kết quả)
5. **auto**: Tự động chọn chiến lược tối ưu dựa trên khung giờ (MỚI)

## Cách thay đổi chiến lược dự đoán

Để thay đổi chiến lược dự đoán, hãy mở file `index.js` và chỉnh sửa giá trị của `strategy` trong biến `PREDICTION_CONFIG`:

```javascript
const PREDICTION_CONFIG = {
  // Vị trí cần dự đoán (0-4)
  position: 0,
  
  // Chiến lược dự đoán:
  // - 'default': Sử dụng 10 kết quả gần nhất
  // - 'short': Sử dụng 5 kết quả gần nhất
  // - 'veryshort': Sử dụng 3 kết quả gần nhất
  // - 'combined': Kết hợp phân tích xu hướng ngắn hạn và dài hạn
  // - 'auto': Tự động chọn chiến lược dựa trên khung giờ
  strategy: 'auto'  // Mặc định sử dụng chiến lược tự động
};
```

## Cách sử dụng

1. Đảm bảo đã cài đặt Node.js và các phụ thuộc (dependencies)
2. Chạy lệnh sau để khởi động bot:

```
node index.js
```

3. Bot sẽ tự động khởi động và hiển thị các chiến lược dự đoán có sẵn
4. Bot sẽ tự động theo dõi và đưa ra dự đoán theo các kỳ xổ

## Giải thích thuật toán

### 1. SimpleFollowTrend (default)
- Phân tích xu hướng dựa trên 10 kết quả gần nhất
- Phù hợp cho dự đoán ổn định, ít biến động

### 2. SimpleFollowTrendShort (short)
- Phân tích xu hướng dựa trên 5 kết quả gần nhất
- Phù hợp cho phát hiện xu hướng vừa phải, cân bằng giữa ổn định và phản ứng nhanh

### 3. SimpleFollowTrendVeryShort (veryshort)
- Phân tích xu hướng dựa trên 3 kết quả gần nhất
- Phù hợp cho phát hiện xu hướng nhanh, nhạy cảm với sự thay đổi gần đây nhất

### 4. SimpleFollowTrendCombined (combined)
- Kết hợp phân tích xu hướng ngắn hạn (5 kết quả) và dài hạn (10 kết quả)
- Tự động phát hiện sự thay đổi xu hướng và điều chỉnh dự đoán
- Phù hợp cho các thị trường có chu kỳ thay đổi

### 5. Auto Strategy (auto)
- Tự động chọn chiến lược dự đoán tối ưu dựa trên khung giờ
- Khung giờ 11:00-14:00: Sử dụng chiến lược 'combined' (giải quyết vấn đề tỷ lệ sai cao trong giờ trưa)
- Khung giờ 6:00-9:00: Sử dụng chiến lược 'short' (5 kết quả)
- Khung giờ 20:00-23:00: Sử dụng chiến lược 'default' (10 kết quả)
- Các khung giờ khác: Sử dụng chiến lược 'veryshort' (3 kết quả)

## Ghi chú

- Tất cả dự đoán được lưu trong file `data/prediction_log.txt`
- Bạn có thể theo dõi hiệu suất của từng chiến lược dự đoán bằng cách phân tích log
- Sau khi thử nghiệm, bạn có thể chọn chiến lược hiệu quả nhất cho trường hợp sử dụng của mình 
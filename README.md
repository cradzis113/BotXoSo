# Bot Dự Đoán Xổ Số (Bot XS1) - Phiên Bản Cải Tiến

Bot này giúp tự động dự đoán kết quả xổ số dựa trên phân tích các kết quả trước đó.

## Tính Năng Mới

### 1. Sử dụng nhiều chiến lược đồng thời
- Có thể chạy tất cả các chiến lược cùng một lúc
- Tổng hợp kết quả dự đoán từ tất cả chiến lược
- Hiển thị chi tiết số phiếu bầu cho mỗi con số
- Chọn kết quả dựa trên số phiếu bầu cao nhất

### 2. Các chiến lược dự đoán có sẵn:

1. **default**: Sử dụng 10 kết quả gần nhất (thuật toán gốc)
2. **short**: Sử dụng 5 kết quả gần nhất
3. **veryshort**: Sử dụng 3 kết quả gần nhất
4. **combined**: Kết hợp phân tích xu hướng ngắn hạn (5 kết quả) và dài hạn (10 kết quả)
5. **weightedShort**: Phân tích xu hướng ngắn hạn với trọng số cho kết quả gần đây
6. **waveTrend**: Phân tích biên độ dao động và nhận diện xu hướng tăng/giảm
7. **weightedCombined**: Kết hợp phân tích xu hướng với trọng số cao hơn cho kết quả gần đây
8. **nightTrend**: Phương pháp đặc biệt cho khung giờ đêm khuya, ưu tiên xu hướng dài hạn
9. **patternRecognition**: Tìm kiếm các mẫu lặp lại trong lịch sử 20-30 kết quả gần nhất
10. **frequencyPattern**: Phân tích tần suất xuất hiện của các con số
11. **adaptiveTime**: Tự điều chỉnh theo thời gian
12. **limited**: Kết hợp 2 thuật toán tốt nhất dựa trên phân tích điều kiện hiện tại

## Cách thay đổi chế độ dự đoán

Để thay đổi chế độ dự đoán, hãy mở file `index.js` và chỉnh sửa cấu hình trong biến `PREDICTION_CONFIG`:

```javascript
const PREDICTION_CONFIG = {
  // Vị trí cần dự đoán (0-4)
  position: 0,
  
  // Chọn chế độ dự đoán
  useMultipleStrategies: false,  // true: dùng tất cả chiến lược, false: dùng 1 chiến lược
  
  // Chiến lược dự đoán khi useMultipleStrategies = false:
  strategy: 'auto'  // 'auto' hoặc tên chiến lược cụ thể
};
```

### Có 3 chế độ dự đoán:

1. **Dùng một chiến lược cụ thể:**
```javascript
{
  useMultipleStrategies: false,
  strategy: 'weightedCombined'  // hoặc bất kỳ chiến lược nào khác
}
```

2. **Dùng chế độ tự động theo giờ:**
```javascript
{
  useMultipleStrategies: false,
  strategy: 'auto'  // tự động chọn theo khung giờ
}
```

3. **Dùng tất cả chiến lược:**
```javascript
{
  useMultipleStrategies: true,
  strategy: 'auto'  // không quan trọng khi useMultipleStrategies = true
}
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

### 5. WeightedFollowTrendShort (weightedShort)
- Phân tích 5 kết quả gần đây nhưng gán trọng số cao hơn cho các kết quả gần nhất
- Sử dụng hệ thống trọng số [5, 4, 3, 2, 1] cho 5 kết quả gần nhất
- Phù hợp cho khung giờ có biến động nhanh và cần phản ứng kịp thời với xu hướng gần nhất

### 6. WaveTrend (waveTrend)
- Phân tích biên độ dao động và xu hướng tăng/giảm liên tiếp
- Tính toán tốc độ thay đổi và phát hiện mẫu dao động có tần suất cao
- Nhận diện và dự đoán dựa trên xu hướng tăng/giảm
- Phù hợp cho các khung giờ có biến động mạnh theo sóng

### 7. WeightedFollowTrendCombined (weightedCombined)
- Kết hợp phân tích xu hướng ngắn hạn và dài hạn với trọng số
- Sử dụng hệ thống trọng số [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] cho 10 kết quả gần nhất
- Phát hiện thay đổi xu hướng giữa ngắn hạn và dài hạn để đưa ra dự đoán chính xác
- Phù hợp cho khung thời gian chuyển tiếp khi xu hướng có thể đang thay đổi

### 8. NightFollowTrend (nightTrend)
- Thuật toán đặc biệt dành cho khung giờ đêm khuya
- Phân tích 15 kết quả gần đây và đo lường độ ổn định của chuỗi
- Ưu tiên xu hướng dài hạn và các mẫu ổn định
- Tối ưu cho khung giờ ít biến động và có tính chu kỳ cao

### 9. PatternRecognition (patternRecognition)
- Tìm kiếm mẫu lặp lại trong 30 kết quả gần nhất
- Nhận diện các mẫu lặp lại có độ dài 3-5 kết quả
- Dự đoán dựa trên kết quả tiếp theo trong mẫu đã được xác định
- Phù hợp cho phân tích chuyên sâu và phát hiện chu kỳ phức tạp

### 10. Auto Strategy (auto)
- Tự động chọn chiến lược dự đoán tối ưu dựa trên khung giờ hiện tại
- Khung giờ đêm khuya (0:00-3:00): Sử dụng chiến lược 'nightTrend' (phương pháp đặc biệt cho đêm khuya)
- Khung giờ đêm muộn (3:00-6:00): Sử dụng chiến lược 'veryshort' (biến động ít vào cuối đêm)
- Khung giờ sáng sớm (6:00-8:00): Sử dụng chiến lược 'short' (hiệu suất tốt vào giờ này)
- Khung giờ sáng (8:00-10:00): Sử dụng chiến lược 'veryshort' (ổn định buổi sáng)
- Khung giờ trưa sớm (10:00-12:00): Sử dụng chiến lược 'waveTrend' (phân tích biên độ dao động)
- Khung giờ trưa (12:00-14:00): Sử dụng chiến lược 'short' (phân tích xu hướng 5 kết quả)
- Khung giờ chiều sớm (14:00-16:00): Sử dụng chiến lược 'waveTrend' (biến động mạnh buổi chiều)
- Khung giờ chiều (16:00-18:00): Sử dụng chiến lược 'veryshort' (nhanh nhạy với thay đổi)
- Khung giờ tối sớm (18:00-20:00): Sử dụng chiến lược 'short' (kết quả ổn định hơn)
- Khung giờ tối (20:00-22:00): Sử dụng chiến lược 'waveTrend' (phân tích dao động buổi tối)
- Khung giờ đêm (22:00-24:00): Sử dụng chiến lược 'nightTrend' (phương pháp đặc biệt cho đêm)

### 11. Limited Combined Predictor (limited)
- Chỉ sử dụng 2 thuật toán tốt nhất dựa trên phân tích điều kiện hiện tại
- Tự động chọn thuật toán phù hợp nhất theo thời gian và điều kiện thị trường:
  + Đêm khuya (23h-5h): Kết hợp nightTrend và simpleFollowTrendVeryShort
  + Biên độ dao động cao (>3.5): Kết hợp waveTrend và patternRecognition
  + Xu hướng mạnh (8+ kết quả giống nhau): Kết hợp weightedFollowTrendShort và simpleFollowTrendVeryShort
  + Không có xu hướng rõ ràng: Kết hợp patternRecognition và frequencyPatternAnalysis
- Phân tích kết quả từ cả hai thuật toán để đưa ra dự đoán cuối cùng
- Tối ưu hóa hiệu suất bằng cách giới hạn số lượng thuật toán sử dụng
- Phù hợp cho mọi khung giờ và điều kiện thị trường

## Chế độ đa chiến lược (Multiple Strategies)

Khi bật chế độ `useMultipleStrategies: true`, bot sẽ:

1. Chạy tất cả 12 chiến lược đồng thời
2. Thu thập kết quả dự đoán từ mỗi chiến lược
3. Thống kê số phiếu bầu cho mỗi con số
4. Chọn con số được nhiều chiến lược bầu chọn nhất
5. Hiển thị chi tiết:
   - Dự đoán của từng chiến lược
   - Thống kê số phiếu cho mỗi con số
   - Tỷ lệ phần trăm ủng hộ cho con số được chọn

Ví dụ kết quả:
```
🎯 Kết quả dự đoán từ tất cả chiến lược:
   [default] 5 - Dự đoán theo xu hướng cơ bản
   [short] 7 - Phân tích ngắn hạn
   ...

📈 Thống kê dự đoán:
   Số 5: 4 chiến lược (33.3%)
   Số 6: 2 chiến lược (16.7%)
   Số 7: 6 chiến lược (50.0%)

🎊 Dự đoán cuối cùng: 7
   (6/12 chiến lược - 50.0%)
```

## Ghi chú

- Tất cả dự đoán được lưu trong file `data/predictions.json` và `data/prediction_log.txt`
- Khi sử dụng chế độ đa chiến lược, file predictions.json sẽ lưu thêm thông tin chi tiết về kết quả của từng chiến lược
- Bạn có thể theo dõi hiệu suất của từng chiến lược dự đoán bằng cách phân tích log
- Sau khi thử nghiệm, bạn có thể chọn chiến lược hiệu quả nhất cho trường hợp sử dụng của mình 
# BotXoSo - Hệ thống Dự đoán Tài Xỉu

## Phiên bản v7.1.0 - Cải tiến Nhận diện Bệt Tài/Xỉu

Dự án BotXoSo là hệ thống dự đoán tự động kết quả Tài/Xỉu dựa trên các mẫu và quy luật lịch sử.

### Tính năng mới trong v7.1.0

1. **Thuật toán phát hiện bệt sớm**: Khả năng phát hiện xu hướng tạo thành chuỗi bệt khi chỉ mới có 2-3 kết quả
2. **Phân tích độ mạnh và xu hướng**: Phân tích chi tiết về độ mạnh, hướng và tính ổn định của chuỗi kết quả
3. **Hỗ trợ nhận diện nhiều mẫu hơn**: Bổ sung nhận diện các mẫu phức tạp như mẫu bệt gián đoạn (4/5 kết quả giống nhau)
4. **Tăng cường xử lý sau chuỗi bệt**: Nâng cao khả năng dự đoán sau khi xuất hiện chuỗi bệt để giảm thua liên tiếp
5. **Đánh giá theo xu hướng thời gian**: Phân tích biến động và đà phát triển của kết quả theo thời gian

### Cải tiến thuật toán

Phiên bản 7.1.0 tập trung vào giải quyết vấn đề cốt lõi của các phiên bản trước: Chuỗi bệt Tài/Xỉu. Dựa trên phân tích dữ liệu thực tế, hệ thống đã được nâng cấp để:

- Nhận diện sớm chuỗi bệt đang hình thành
- Đánh giá chính xác hơn thời điểm đảo chiều sau bệt
- Tận dụng phân tích xu hướng để đưa ra dự đoán có độ tin cậy cao hơn
- Thích ứng với các mẫu đặc biệt xuất hiện trong dữ liệu thực tế

### Các cải tiến kỹ thuật

- Thêm mới các hàm phân tích chuyên biệt: `detectEarlyStreak` và `analyzeStrengthAndDirection`
- Nâng cấp thuật toán nhận diện mẫu TX để tăng độ chính xác
- Mở rộng số lượng dữ liệu lịch sử phân tích (từ 10 lên 15 kỳ)
- Cải thiện cấu trúc và tối ưu hóa mã nguồn 
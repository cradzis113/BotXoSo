const puppeteer = require('puppeteer-core');
const getLotteryNumbers = require('./getLotteryNumbers');
const predict = require('./predict');

async function watchCountdown() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: null,
    protocolTimeout: 60000, // tăng thời gian chờ xử lý giao tiếp trình duyệt
  });

  const page = await browser.newPage();
  await page.goto('https://bet.6nluck8.cc/home/?inviteCode=4592386#/lottery?tabName=Lottery&id=47', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  try {
    await page.waitForSelector("ul.menu.el-menu", { timeout: 15000 });

    const targetIndex = await page.evaluate(() => {
      const items = document.querySelectorAll("ul.menu.el-menu > li.el-submenu.is-active.is-opened li.el-menu-item");
      for (let i = 0; i < items.length; i++) {
        if (items[i].textContent.includes("Miền Bắc VIP 45 giây")) {
          return i;
        }
      }
      return -1;
    });

    if (targetIndex === -1) {
      console.log("❌ Không tìm thấy mục 'Miền Bắc VIP 45 giây'");
      await browser.close();
      return;
    }

    console.log("✅ Tìm thấy mục 'Miền Bắc VIP 45 giây', bắt đầu theo dõi countdown...");

    let isPredicting = false;
    let hasPredicted = false;

    setInterval(async () => {
      if (page.isClosed()) return;

      let timeValues = null;

      try {
        timeValues = await page.evaluate(index => {
          const items = document.querySelectorAll("ul.menu.el-menu > li.el-submenu.is-active.is-opened li.el-menu-item");
          if (!items[index]) return null;

          const countdownEl = items[index].querySelector(".vue-count-time .time");
          if (!countdownEl) return null;

          return Array.from(countdownEl.querySelectorAll("span"))
            .map(span => span.textContent.trim());
        }, targetIndex);
      } catch (err) {
        console.error("⚠️ Lỗi khi đọc countdown:", err.message);
        return;
      }

      if (timeValues) {
        const countdown = timeValues.slice(-2).join("");
        console.log("⏳ Thời gian đếm ngược:", countdown);

        if (parseInt(countdown) > 10 && parseInt(countdown) < 30 && !isPredicting && !hasPredicted) {
          console.log("🎯 Đếm ngược phù hợp, bắt đầu gọi dự đoán...");

          isPredicting = true;
          hasPredicted = true;

          try {
            const history = await getLotteryNumbers();
            const arrays = await predict(history, 0, { limitList: [5, 10, 15], defaultLimit: 15 });
            console.log("📈 Kết quả dự đoán:", arrays);
          } catch (error) {
            console.error("❌ Lỗi khi dự đoán:", error.message);
          }

          setTimeout(() => {
            isPredicting = false;
          }, 1000);
        }

        // Reset cờ khi đếm ngược về 00
        if (countdown === "00") {
          hasPredicted = false;
        }

      } else {
        console.log("⚠️ Không tìm thấy countdown!");
      }
    }, 1000);

  } catch (error) {
    console.error("❌ Lỗi trong quá trình khởi động:", error.message);
    await browser.close();
  }
}

module.exports = watchCountdown;

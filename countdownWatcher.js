const puppeteer = require('puppeteer-core');
const getLotteryNumbers = require('./getLotteryNumbers');
const predict = require('./predict');

async function watchCountdown() {
  let browser = null;
  let page = null;
  let intervalId = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  async function setupBrowser() {
    try {
      if (browser) await browser.close().catch(() => { });

      browser = await puppeteer.launch({
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        headless: true,
        defaultViewport: null,
        protocolTimeout: 60000,
      });

      page = await browser.newPage();
      await page.goto('https://bet.6nluck8.cc/home/?inviteCode=4592386#/lottery?tabName=Lottery&id=47', {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      await page.waitForSelector("ul.menu.el-menu", { timeout: 15000 });
      reconnectAttempts = 0;
      return true;
    } catch (error) {
      console.error("❌ Lỗi khi thiết lập trình duyệt:", error.message);
      if (browser) await browser.close().catch(() => { });
      return false;
    }
  }

  async function findTargetIndex() {
    try {
      if (!page || page.isClosed()) return -1;

      return await page.evaluate(() => {
        const items = document.querySelectorAll("ul.menu.el-menu > li.el-submenu.is-active.is-opened li.el-menu-item");
        for (let i = 0; i < items.length; i++) {
          if (items[i].textContent.includes("Miền Bắc VIP 45 giây")) {
            return i;
          }
        }
        return -1;
      });
    } catch (error) {
      console.error("❌ Lỗi khi tìm mục:", error.message);
      return -1;
    }
  }

  async function getCountdown(targetIndex) {
    try {
      if (!page || page.isClosed()) return null;

      const timeValues = await page.evaluate(index => {
        const items = document.querySelectorAll("ul.menu.el-menu > li.el-submenu.is-active.is-opened li.el-menu-item");
        if (!items[index]) return null;

        const countdownEl = items[index].querySelector(".vue-count-time .time");
        if (!countdownEl) return null;

        return Array.from(countdownEl.querySelectorAll("span"))
          .map(span => span.textContent.trim());
      }, targetIndex);

      return timeValues;
    } catch (error) {
      console.error("⚠️ Lỗi khi đọc countdown:", error.message);
      return null;
    }
  }

  async function startWatching() {
    if (!(await setupBrowser())) {
      await handleReconnect();
      return;
    }

    const targetIndex = await findTargetIndex();
    if (targetIndex === -1) {
      console.log("❌ Không tìm thấy mục 'Miền Bắc VIP 45 giây'");
      await handleReconnect();
      return;
    }

    console.log("✅ Tìm thấy mục 'Miền Bắc VIP 45 giây', bắt đầu theo dõi countdown...");

    let isPredicting = false;
    let hasPredicted = false;

    if (intervalId) clearInterval(intervalId);

    intervalId = setInterval(async () => {
      try {
        if (!page || page.isClosed()) {
          await handleReconnect();
          return;
        }

        const timeValues = await getCountdown(targetIndex);

        if (!timeValues) {
          console.log("⚠️ Không tìm thấy countdown!");
          return;
        }

        const countdown = timeValues.slice(-2).join("");
        console.log("⏳ Thời gian đếm ngược:", countdown);

        if (parseInt(countdown) > 10 && parseInt(countdown) < 30 && !isPredicting && !hasPredicted) {
          console.log("🎯 Đếm ngược phù hợp, bắt đầu gọi dự đoán...");

          isPredicting = true;
          hasPredicted = true;

          try {
            const history = await getLotteryNumbers();
            const arrays = await predict(history, 0, { limitList: [1, 2, 3], defaultLimit: 3 });
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
      } catch (error) {
        console.error("❌ Lỗi trong quá trình theo dõi:", error.message);
        await handleReconnect();
      }
    }, 1000);
  }

  async function handleReconnect() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }

    if (browser) {
      await browser.close().catch(() => { });
      browser = null;
      page = null;
    }

    reconnectAttempts++;

    if (reconnectAttempts <= maxReconnectAttempts) {
      console.log(`🔄 Thử kết nối lại lần ${reconnectAttempts}/${maxReconnectAttempts}...`);
      // Exponential backoff for reconnect
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
      setTimeout(startWatching, delay);
    } else {
      console.error("❌ Đã vượt quá số lần thử kết nối lại. Dừng theo dõi.");
    }
  }

  // Bắt sự kiện khi process kết thúc để cleanup
  process.on('SIGINT', async () => {
    if (intervalId) clearInterval(intervalId);
    if (browser) await browser.close().catch(() => { });
    process.exit();
  });

  // Bắt đầu theo dõi
  await startWatching();
}

module.exports = watchCountdown;

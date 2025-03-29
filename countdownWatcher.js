const puppeteer = require('puppeteer-core');
const getLotteryNumbers = require('./getLotteryNumbers')
const { predictNumbers } = require('./taiXiuAnalyzer')

async function watchCountdown() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: null
  });

  const page = await browser.newPage();
  await page.goto('https://bet.6nluck8.cc/home/?inviteCode=4592386#/lottery?tabName=Lottery&id=47', { waitUntil: 'networkidle2' });

  await page.waitForSelector("ul.menu.el-menu", { timeout: 10000 });

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
    console.log("Không tìm thấy mục 'Miền Bắc VIP 45 giây'");
    await browser.close();
    return;
  }

  console.log("Tìm thấy mục 'Miền Bắc VIP 45 giây', bắt đầu theo dõi countdown...");

  let lastCountdown = "";
  let isPredicting = false;
  let hasPredicted = false;  // New flag to track if prediction has been made

  setInterval(async () => {
    if (page.isClosed()) return;

    const timeValues = await page.evaluate(index => {
      const items = document.querySelectorAll("ul.menu.el-menu > li.el-submenu.is-active.is-opened li.el-menu-item");
      if (!items[index]) return null;

      const countdownEl = items[index].querySelector(".vue-count-time .time");
      if (!countdownEl) return null;

      return Array.from(countdownEl.querySelectorAll("span"))
        .map(span => span.textContent.trim());
    }, targetIndex);

    if (timeValues) {
      const countdown = timeValues.slice(-2).join("");
      // console.log("Thời gian đếm ngược:", countdown);

      // Check if countdown is 30 seconds or more, not already predicting, and hasn't predicted yet
      if (parseInt(countdown) > 10 && parseInt(countdown) < 30 && !isPredicting && !hasPredicted) {
        console.log("Đếm ngược bắt đầu từ 30 giây trở lên, gọi predictNextNumber...");
        isPredicting = true;
        hasPredicted = true;  // Set flag to true after prediction
        try {
          const h = await getLotteryNumbers()
          const arrays = await predictNumbers(h, [0], 100, "taixiu_history.txt", false);
          console.log(arrays)

        } catch (error) {
          console.error("Lỗi khi gọi predictNextNumber:", error);
        }
        setTimeout(() => {
          isPredicting = false;
        }, 1000);
      }

      // Reset the prediction flag when countdown resets
      if (countdown === "00") {
        hasPredicted = false;
      }

      lastCountdown = countdown;
    } else {
      console.log("Không tìm thấy countdown!");
    }
  }, 1000);
}

module.exports = watchCountdown; 
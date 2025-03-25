const puppeteer = require('puppeteer-core');

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

  // Chạy liên tục, không đóng trình duyệt
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
      console.log("Thời gian đếm ngược:", timeValues.slice(-2).join(""));
    } else {
      console.log("Không tìm thấy countdown!");
    }
  }, 1000);
}

// Xuất hàm watchCountdown
module.exports = { watchCountdown }; 
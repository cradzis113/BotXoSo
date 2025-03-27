const puppeteer = require('puppeteer-core');

// Biến lưu trữ trạng thái
let browser = null;
let page = null;

// Khởi tạo scraper
async function initialize() {
  browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true, 
    defaultViewport: null,
    args: ['--disable-blink-features=AutomationControlled'] 
  });

  page = await browser.newPage();
  await page.goto('https://1.bot/Lottery/MienBacVIP45', { waitUntil: 'networkidle2' });

  await autoScroll(page);

  console.log('Scraper đã được khởi tạo');
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 500; 
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

async function getNumbers() {
  if (!page) {
    throw new Error('Scraper chưa được khởi tạo');
  }

  try {
    await page.waitForSelector('#tableHistory tr:last-child .number', { timeout: 5000 });

    return await page.$$eval('#tableHistory tr .number', divs => {
      return divs.map(div => {
        const spans = div.querySelectorAll('span.opencode');
        return Array.from(spans).map(span => span.textContent.trim());
      });
    });
  } catch (error) {
    console.error('Lỗi khi lấy số:', error);
    throw error; // Ném lại lỗi để xử lý ở nơi khác nếu cần
  }
}

async function close() {
  if (browser) {
    await browser.close();
    browser = null;
    page = null;
  }
}

module.exports = {
  initialize,
  getNumbers,
  close
};

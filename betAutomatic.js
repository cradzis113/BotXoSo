const puppeteer = require('puppeteer-core');
const os = require('os');

// Các hằng số cấu hình
function getChromePath() {
  const platform = os.platform();
  if (platform === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  } else if (platform === 'linux') {
    const linuxPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium'
    ];
    return linuxPaths[0];
  }
  throw new Error('Hệ điều hành không được hỗ trợ');
}

const CHROME_PATH = getChromePath();
const BETTING_URL = 'https://bet.6nluck8.cc/home/?inviteCode=4592386#/lottery?tabName=Lottery&id=47';

const SELECTORS = {
  secondLastDigit: '._timeDown .vue-count-time .time span:nth-last-child(2)',
  lastDigit: '._timeDown .vue-count-time .time span:last-child',
};

/**
 * Khởi chạy trình duyệt với cấu hình tối ưu
 * @returns {Promise<Browser>} Instance trình duyệt
 */
async function launchBrowser() {
  const isLinux = os.platform() === 'linux';
  return await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: null,
    protocolTimeout: 120000,
    timeout: 30000,
    args: [
      '--disable-extensions',
      '--disable-component-extensions-with-background-pages',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-client-side-phishing-detection',
      '--disable-default-apps',
      '--disable-dev-shm-usage',
      '--disable-features=Translate,TranslateUI',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-popup-blocking',
      '--disable-prompt-on-repost',
      '--disable-renderer-backgrounding',
      '--disable-sync',
      '--force-color-profile=srgb',
      '--metrics-recording-only',
      '--no-first-run',
      '--password-store=basic',
      '--use-mock-keychain',
      '--mute-audio',
      ...(isLinux ? [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--window-size=1920x1080'
      ] : [])
    ]
  });
}

/**
 * Mở trang cá cược
 * @param {Browser} browser Instance trình duyệt
 * @returns {Promise<Page>} Trang web đã mở
 */
async function openBettingPage(browser) {
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(60000);
  await page.setCacheEnabled(false);

  try {
    await page.goto(BETTING_URL, {
      waitUntil: 'networkidle2', // Thay đổi lại để đảm bảo trang tải đầy đủ
      timeout: 60000,
    });
  } catch (error) {
    console.error("Lỗi khi mở trang betting:", error.message);
    // Thử lại với waitUntil khác nếu lỗi
    try {
      await page.goto(BETTING_URL, {
        waitUntil: 'load',
        timeout: 60000,
      });
    } catch (secondError) {
      console.error("Lỗi khi thử mở trang lần 2:", secondError.message);
    }
  }

  return page;
}

async function getCountDownTime(page, getAllLotteryNumbers, predictFunction, position = 0, strategy = 'auto') {
  console.log(`✅ Bắt đầu theo dõi countdown... (Vị trí dự đoán: ${position}, Chiến lược: ${strategy})`);

  let isPredicting = false;
  let hasPredicted = false;
  let lastSeconds = -1;

  const intervalId = setInterval(async () => {
    if (page.isClosed()) {
      clearInterval(intervalId);
      return;
    }

    try {
      const timeElements = await Promise.all([
        page.$eval(SELECTORS.secondLastDigit, el => el.textContent),
        page.$eval(SELECTORS.lastDigit, el => el.textContent)
      ]);

      const seconds = parseInt(timeElements[0] + timeElements[1]);

      if (seconds !== lastSeconds) {
        console.log("⏳ Số giây còn lại:", seconds);
        lastSeconds = seconds;
      }

      if (lastSeconds === 0 && seconds > 30) {
        console.log("🔄 Bắt đầu kỳ mới!");
        hasPredicted = false;
        hasClickedWinningNotice = false;
      }

      if (seconds >= 15 && seconds <= 28 && !isPredicting && !hasPredicted) {
        console.log("🎯 Đếm ngược phù hợp, bắt đầu gọi dự đoán...");

        isPredicting = true;
        hasPredicted = true;

        try {
          const history = await getAllLotteryNumbers();
          const prediction = await predictFunction(history, position, strategy);
          console.log("📈 Kết quả dự đoán:", prediction);
        } catch (error) {
          console.error("❌ Lỗi khi dự đoán:", error.message);
        } finally {
          isPredicting = false;
        }
      }

      if (seconds <= 1) {
        hasPredicted = false;
      }

    } catch (error) {
      console.error("⚠️ Lỗi khi đọc countdown:", error.message);
    }
  }, 1000);

  return intervalId;
}

module.exports = {
  launchBrowser,
  openBettingPage,
  getCountDownTime,
};
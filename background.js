// === Настройки ===
let creating = null;
const PROXY_TIMEOUT = 4000; // 4 секунды на проверку

// === Списки доменов для проксирования ===
const DEFAULT_UNBLOCKLIST = [
  "*://*.youtube.com/*",
  "*://*.youtube.com/",
  "*://*.browsebetter.io/*",
  "*://*.browsebetter.io/",
  "*://whatismyipaddress.com/",
  "*://*.googlevideo.com/*",
  "*://*.ytimg.com/*",
  "*://*.ggpht.com/*",
  "*://*.google.com/*",
  "*://*.googleapis.com/*",
  "*://*.gstatic.com/*",
];

const DEFAULT_UNBLOCKLIST2 = [
  "youtube.com",
  "browsebetter.io",
  "s3.browsebetter.io",
  "whatismyipaddress.com",
  "no.youtubeunblocked.notld",
  "googlevideo.com",
  "ytimg.com",
  "ggpht.com",
  "google.com",
  "googleapis.com",
  "gstatic.com",
];

let unblocklist = [...DEFAULT_UNBLOCKLIST];
let unblocklist2 = [...DEFAULT_UNBLOCKLIST2];
let customU = null;
let proxyList = [];

// === Генерация списка прокси ===
function setIPs() {
  proxyList = [
    "161.0.0.206:20000",
    "161.0.0.207:20000",
    "188.42.15.245:20000",
    "45.89.174.102:20000",
    "103.165.20.88:20000",
    "194.180.48.150:20000",
    "89.117.88.234:20000",
    "185.242.5.10:20000",
    "91.238.52.100:20000",
    "176.113.74.182:20000"
  ];
  // Убираем дубли и перемешиваем
  proxyList = [...new Set(proxyList)].sort(() => Math.random() - 0.5);
}

// === Проверка URL ===
function isValidURL(string) {
  try {
    new URL(string);
    return string.includes(".");
  } catch {
    return false;
  }
}

// === Обновление списков под кастомный сайт ===
async function updateUnblockLists() {
  const result = await chrome.storage.local.get("custom_website");
  const customUrl = result.custom_website;

  if (customUrl && isValidURL(customUrl)) {
    const host = new URL(customUrl).hostname;
    unblocklist = [
      "*://*.browsebetter.io/*",
      "*://*.browsebetter.io/",
      "*://whatismyipaddress.com/",
      "*://*.googlevideo.com/*",
      "*://*.ytimg.com/*",
      "*://*.ggpht.com/*",
      "*://*.google.com/*",
      "*://*.googleapis.com/*",
      "*://*.gstatic.com/*",
    ];
    unblocklist.push(`*://*.${host}/*`, `*://*.${host}/`);

    unblocklist2 = [
      "browsebetter.io",
      "s3.browsebetter.io",
      "whatismyipaddress.com",
      "no.youtubeunblocked.notld",
      "googlevideo.com",
      "ytimg.com",
      "ggpht.com",
      "google.com",
      "googleapis.com",
      "gstatic.com",
    ];
    unblocklist2.push(host);
    customU = host;
  } else {
    unblocklist = [...DEFAULT_UNBLOCKLIST];
    unblocklist2 = [...DEFAULT_UNBLOCKLIST2];
    customU = null;
  }
}

// === Аутентификация прокси ===
chrome.webRequest.onAuthRequired.addListener(
  () => ({
    authCredentials: {
      username: "DhanurSehgal",
      password: `viepdnvCIRC49-'+3MCDSsm`,
    },
  }),
  { urls: unblocklist },
  ["blocking"]
);

// === Применение прокси через PAC ===
function applyProxy(proxy) {
  // Проверка доступности chrome.proxy API (для совместимости с Kiwi Browser)
  if (!chrome.proxy || !chrome.proxy.settings) {
    console.error("❌ Proxy API недоступен");
    chrome.storage.sync.set({ proxySuccess: "ERR " + performance.now() });
    // Показываем предупреждение для Android
    chrome.storage.local.get(["android_warning_shown"], (result) => {
      if (!result.android_warning_shown) {
        chrome.storage.local.set({ android_warning_shown: true });
        console.warn("⚠️ На Android Proxy API может быть недоступен. Расширение может не работать.");
      }
    });
    return;
  }
  
  const conditions = unblocklist2.map(h => `dnsDomainIs(host, '${h}')`).join(" || ");
  const pacScript = `
    function FindProxyForURL(url, host) {
      if (${conditions}) return 'PROXY ${proxy}';
      return 'DIRECT';
    }
  `;
  
  // Сначала пробуем PAC-скрипт (предпочтительный метод)
  chrome.proxy.settings.set({
    value: { mode: "pac_script", pacScript: {  pacScript } },
    scope: "regular"
  }, (details) => {
    if (chrome.runtime.lastError) {
      console.warn("⚠️ PAC-скрипт не работает, пробуем fixed_servers:", chrome.runtime.lastError.message);
      // Fallback: пробуем fixed_servers (может работать на Android)
      const [host, port] = proxy.split(':');
      chrome.proxy.settings.set({
        value: {
          mode: "fixed_servers",
          rules: {
            singleProxy: {
              scheme: "http",
              host: host,
              port: parseInt(port)
            }
          }
        },
        scope: "regular"
      }, (details2) => {
        if (chrome.runtime.lastError) {
          console.error("❌ Ошибка установки прокси (оба метода):", chrome.runtime.lastError.message);
          chrome.storage.sync.set({ proxySuccess: "ERR " + performance.now() });
          return;
        }
        console.log("✅ Proxy активирован через fixed_servers:", proxy);
        chrome.storage.sync.set({ proxySuccess: "Works " + performance.now() });
        if (customU) {
          chrome.storage.local.set({ p1: Date.now() });
          if (chrome.tabs && chrome.tabs.create) {
            chrome.tabs.create({ url: "https://" + customU });
          }
        }
      });
      return;
    }
    console.log("✅ Proxy активирован через PAC:", proxy);
    chrome.storage.sync.set({ proxySuccess: "Works " + performance.now() });
    if (customU) {
      chrome.storage.local.set({ p1: Date.now() });
      // Проверка доступности chrome.tabs API
      if (chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url: "https://" + customU });
      }
    }
  });
}

// === Отключение прокси ===
function disableProxy() {
  // Проверка доступности chrome.proxy API
  if (!chrome.proxy || !chrome.proxy.settings) {
    console.warn("⚠️ Proxy API недоступен для отключения");
    chrome.storage.sync.set({ proxyEnabled: "false " + performance.now() });
    return;
  }
  
  chrome.proxy.settings.clear({ scope: "regular" }, () => {
    if (chrome.runtime.lastError) {
      console.error("❌ Ошибка отключения прокси:", chrome.runtime.lastError.message);
    } else {
      console.log("⏹️ Прокси отключён");
    }
    chrome.storage.sync.set({ proxyEnabled: "false " + performance.now() });
  });
}

// === Проверка одного прокси ===
async function testSingleProxy(proxy) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT);
  try {
    const response = await fetch("https://s3.browsebetter.io/checkcors.html", {
      method: "HEAD",
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response.ok ? proxy : null;
  } catch (e) {
    clearTimeout(timeoutId);
    return null;
  }
}

// === Активация прокси (основная логика) ===
async function activateProxy() {
  await updateUnblockLists();
  setIPs();

  // Пробуем последний рабочий прокси первым
  const { lastWorkingProxy } = await chrome.storage.local.get("lastWorkingProxy");
  if (lastWorkingProxy && !proxyList.includes(lastWorkingProxy)) {
    proxyList.unshift(lastWorkingProxy);
  }

  // Параллельная проверка
  const testPromises = proxyList.map(p => testSingleProxy(p));
  const results = await Promise.all(testPromises);
  const workingProxy = results.find(p => p !== null);

  if (workingProxy) {
    await chrome.storage.local.set({ lastWorkingProxy: workingProxy });
    applyProxy(workingProxy);
  } else {
    console.error("❌ Все прокси недоступны");
    chrome.storage.sync.set({ proxySuccess: "ERR " + performance.now() });
    disableProxy();
  }
}

// === Слушатель изменений настроек ===
chrome.storage.onChanged.addListener((changes) => {
  if (changes.proxyEnabled) {
    const newValue = changes.proxyEnabled.newValue;
    if (typeof newValue === "string" && newValue.startsWith("true")) {
      activateProxy();
    } else {
      disableProxy();
    }
  }
});

// === При запуске браузера — отключаем прокси ===
chrome.runtime.onStartup.addListener(() => {
  disableProxy();
});


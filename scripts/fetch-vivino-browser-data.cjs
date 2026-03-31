const { chromium } = require("playwright");
const { existsSync } = require("node:fs");

const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
];

async function main() {
  const url = process.argv[2];
  const executablePath = process.argv[3] || browserCandidates.find((candidate) => existsSync(candidate));

  if (!url) {
    throw new Error("Missing Vivino URL.");
  }

  if (!executablePath) {
    throw new Error("No supported browser is installed for Vivino enrichment.");
  }

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--disable-blink-features=AutomationControlled"]
  });

  try {
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(4000);

    const html = await page.content();
    const title = await page.title();
    const scoreTexts = await page.locator("text=/^[0-9]\\.[0-9]$/").allTextContents();
    const bodyText = (await page.textContent("body")) ?? "";

    process.stdout.write(
      JSON.stringify({
        finalUrl: page.url(),
        html,
        title,
        scoreTexts,
        bodyText
      })
    );
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  process.stderr.write(String(error instanceof Error ? error.stack || error.message : error));
  process.exitCode = 1;
});

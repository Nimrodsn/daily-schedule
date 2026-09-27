// Dev helper: capture mobile screenshots of routes in light and dark mode.
// Usage: node scripts/shots.mjs [baseUrl] [route ...]
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const [, , baseUrlArg, ...routeArgs] = process.argv;
const baseUrl = baseUrlArg ?? "http://localhost:3111";
const routes = routeArgs.length ? routeArgs : ["/"];
const outDir = ".screenshots";

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();

for (const colorScheme of ["light", "dark"]) {
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "he-IL",
    timezoneId: "Asia/Jerusalem",
    colorScheme,
  });

  for (const route of routes) {
    const page = await context.newPage();
    await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
    const slug = route === "/" ? "today" : route.replace(/\//g, "-").slice(1);
    const file = `${outDir}/${slug}-${colorScheme}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
    await page.close();
  }

  await context.close();
}

await browser.close();

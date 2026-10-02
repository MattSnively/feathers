import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const REPO = "C:/Users/matts/projects/feathers";
const require = createRequire(`${REPO}/package.json`);
const Ajv = require("ajv");
const ajv = new Ajv({ strict: false, validateSchema: false, allErrors: true, formats: { "uri-reference": true } });
const load = (f) => JSON.parse(fs.readFileSync(`${REPO}/schemas/${f}`, "utf-8"));
const validatePbi = ajv.compile(load("powerbi-theme-2.157.json"));
const validateTab = ajv.compile(load("tableau-theme-1.0.0.json"));

const OUT = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ""));
const SHOTS = path.join(OUT, "shots");
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`);
};

const browser = await chromium.launch({
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://localhost:4173" });
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("response", (r) => r.status() >= 400 && consoleErrors.push(`HTTP ${r.status()} ${r.url()}`));
page.on("pageerror", (e) => consoleErrors.push(String(e)));

await page.goto("http://localhost:4173/");
const color = (n) => page.getByLabel(`Color ${n}`, { exact: true });
const focusKey = () => page.evaluate(() => document.activeElement?.dataset?.key ?? null);

// 1. initial render
check("renders heading", (await page.locator("h1").textContent()) === "Feathers");
check("loads Playfair by default", (await color(1).inputValue()) === "#0A3746");
check("8 categorical rows", (await page.locator(".swatch-row").count()) === 8);
await page.screenshot({ path: path.join(SHOTS, "desktop-light.png"), fullPage: true });

// 2. invalid hex is flagged, not committed, and reverts on blur
await color(1).fill("#12");
check("invalid hex sets aria-invalid", (await color(1).getAttribute("aria-invalid")) === "true");
check("invalid hex shows message", await page.getByText("Use a 6-digit hex color").first().isVisible());
check("export stays enabled while input invalid", await page.getByRole("button", { name: "Download" }).first().isEnabled());
await color(1).blur();
check("blur restores last valid value", (await color(1).inputValue()) === "#0A3746");

// 3. valid hex commits and syncs the picker
await color(1).fill("#112233");
check("valid hex clears invalid flag", (await color(1).getAttribute("aria-invalid")) === null);
check("picker syncs to hex", (await page.getByLabel("Color 1, color picker").inputValue()) === "#112233");
check("typing keeps focus (no rebuild)", (await focusKey()) === "cat-0");

// 4. reorder via button, focus follows
await color(1).fill("#0A3746");
await page.getByRole("button", { name: "Move color 1 down" }).click();
check("move down swaps order", (await color(1).inputValue()) === "#F99A2B" && (await color(2).inputValue()) === "#0A3746");
check("focus stays on the move-down button", (await focusKey()) === "cat-1-down");

// 5. drag reorder: drag handle of row 1 onto row 3
const before = await color(1).inputValue();
await page.locator(".drag-handle").first().dragTo(page.locator(".swatch-row").nth(2));
check("drag-and-drop reorders", (await color(3).inputValue()) === before, `row3=${await color(3).inputValue()} expected ${before}`);

// 6. add / remove
await page.getByRole("button", { name: "Add color" }).click();
check("add color -> 9 rows", (await page.locator(".swatch-row").count()) === 9);
check("focus lands in the new color", (await focusKey()) === "cat-8");
await page.getByRole("button", { name: "Remove color 9" }).click();
check("remove color -> 8 rows", (await page.locator(".swatch-row").count()) === 8);

// 7. sequential / diverging tabs
await page.getByRole("button", { name: "Diverging", exact: true }).click();
check("diverging tab shows 3 fields", (await page.getByLabel("Center", { exact: true }).count()) === 1);
await page.getByRole("button", { name: "Categorical", exact: true }).click();

// 8. tool toggle swaps font list
await page.getByRole("button", { name: "Tableau", exact: true }).click();
check("fonts panel retitled for Tableau", await page.getByText("Fonts (Tableau)").isVisible());
const tabFonts = await page.getByLabel("Body font").locator("option").allTextContents();
check("Tableau fonts include Tableau Book", tabFonts.includes("Tableau Book") && !tabFonts.includes("Segoe UI"));
await page.getByRole("button", { name: "Power BI", exact: true }).click();
const pbiFonts = await page.getByLabel("Body font").locator("option").allTextContents();
check("Power BI fonts include Segoe (Bold)", pbiFonts.includes("Segoe (Bold)") && pbiFonts.includes("DIN"));
check("card value size only for Power BI", (await page.getByLabel("Card value size (pt)").count()) === 1);

// 9. number validation
await page.getByLabel("Width (1-5)").first().fill("9");
check("line width 9 rejected", (await page.getByLabel("Width (1-5)").first().getAttribute("aria-invalid")) === "true");

// 10. preset swap + naming
await page.getByLabel("Start from").selectOption({ label: "Okabe-Ito (colorblind-safe)" });
check("preset loads Okabe-Ito color 1", (await color(1).inputValue()) === "#E69F00");
check("preset sets theme name", (await page.getByLabel("Name", { exact: true }).inputValue()).startsWith("Okabe-Ito"));
check("filename follows slug", await page.getByText("okabe-ito-colorblind-safe.powerbi.json").isVisible());
check("tps file is not named Preferences.tps", await page.getByText("feathers-okabe-ito-colorblind-safe.tps").isVisible());

await page.getByLabel("Width (1-5)").first().fill("3");

// 11. empty name -> inline export error, downloads disabled
await page.getByLabel("Name", { exact: true }).fill("");
check("empty name shows export error", await page.getByText("name must not be empty").first().isVisible());
check("downloads disabled on error", await page.getByRole("button", { name: "Download" }).first().isDisabled());
await page.getByLabel("Name", { exact: true }).fill("QA Theme #1");
check("slug sanitizes punctuation", await page.getByText("qa-theme-1.powerbi.json").isVisible());

// 12. real downloads, validated against the published schemas
const dl = async (cardTitle) => {
  const card = page.locator(".export-card", { hasText: cardTitle });
  const [d] = await Promise.all([page.waitForEvent("download"), card.getByRole("button", { name: "Download" }).click()]);
  const file = path.join(OUT, d.suggestedFilename());
  await d.saveAs(file);
  return { name: d.suggestedFilename(), text: fs.readFileSync(file, "utf-8") };
};
const pbi = await dl("Power BI theme");
check("PBI filename", pbi.name === "qa-theme-1.powerbi.json", pbi.name);
const pbiJson = JSON.parse(pbi.text);
check("PBI download validates vs schema 2.157", validatePbi(pbiJson) === true, JSON.stringify(validatePbi.errors?.slice(0, 2)));
check("PBI download carries edited palette", pbiJson.dataColors[0] === "#E69F00" && pbiJson.name === "QA Theme #1");
const tab = await dl("Tableau theme");
check("Tableau theme filename", tab.name === "qa-theme-1.tableau.json", tab.name);
const tabJson = JSON.parse(tab.text);
check("Tableau download validates vs schema", validateTab(tabJson) === true, JSON.stringify(validateTab.errors?.slice(0, 2)));
check("Tableau gridline width follows edit (3)", tabJson.styles.gridline["line-width"] === 3);
const tps = await dl("Tableau palettes");
check("tps filename", tps.name === "feathers-qa-theme-1.tps", tps.name);
check("tps has 3 palette types", ["regular", "ordered-sequential", "ordered-diverging"].every((t) => tps.text.includes(`type="${t}"`)));
check("tps escapes the # nothing odd and uses straight quotes", !/[\u201C\u201D]/.test(tps.text));

// 13. copy XML
await page.locator(".export-card", { hasText: "Tableau palettes" }).getByRole("button", { name: "Copy XML" }).click();
const clip = await page.evaluate(() => navigator.clipboard.readText());
check("Copy XML puts palette blocks on the clipboard", clip.includes("<color-palette") && !clip.includes("<preferences>"));
check("status announces the copy", await page.getByText("Copied the palette XML").isVisible());

// 14. view file toggle keeps focus
await page.locator(".export-card", { hasText: "Power BI theme" }).getByRole("button", { name: "View file" }).click();
check("view file shows code", await page.locator("pre.code").first().isVisible());
check("view toggle keeps focus", (await focusKey()) === "powerbi-view");

// 15. persistence across reload
await page.getByRole("button", { name: "Tableau", exact: true }).click();
await page.reload();
check("reload restores theme name", (await page.getByLabel("Name", { exact: true }).inputValue()) === "QA Theme #1");
check("reload restores tool", (await page.getByRole("button", { name: "Tableau", exact: true }).getAttribute("aria-pressed")) === "true");

// 16. corrupt storage falls back to default
await page.evaluate(() => localStorage.setItem("feathers.state.v1", "{broken"));
await page.reload();
check("corrupt storage falls back to Playfair", (await color(1).inputValue()) === "#0A3746");

// 17. phone layout + dark mode
await page.setViewportSize({ width: 375, height: 800 });
await page.reload();
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check("no horizontal scroll at 375px", overflow <= 0, `overflow ${overflow}px`);
await page.screenshot({ path: path.join(SHOTS, "phone-light.png"), fullPage: true });
await page.emulateMedia({ colorScheme: "dark" });
await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(600);
const dark = await page.evaluate(() => {
  const css = (sel) => getComputedStyle(document.querySelector(sel));
  return { input: css("input[type=text]").backgroundColor, inputText: css("input[type=text]").color,
           btn: css("button.secondary").backgroundColor, body: css("body").backgroundColor };
});
console.log("dark computed:", JSON.stringify(dark));
check("dark inputs use the dark surface", dark.input === "rgb(32, 25, 20)", dark.input);
check("dark input text is light", dark.inputText === "rgb(243, 244, 239)", dark.inputText);
check("dark buttons use the dark surface", dark.btn === "rgb(32, 25, 20)", dark.btn);
await page.screenshot({ path: path.join(SHOTS, "desktop-dark.png"), fullPage: true });

check("no console errors", consoleErrors.length === 0, consoleErrors.join(" | "));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);

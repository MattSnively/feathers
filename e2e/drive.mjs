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

const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://localhost:4173" });
const page = await context.newPage();
page.setDefaultTimeout(8000);
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("response", (r) => r.status() >= 400 && consoleErrors.push(`HTTP ${r.status()} ${r.url()}`));
page.on("pageerror", (e) => consoleErrors.push(String(e)));

// The editor suite opens the editor directly; the landing page has its own suite (onboarding.mjs).
await page.goto("http://localhost:4173/#editor");

// ---- helpers ------------------------------------------------------------------------------
const focusKey = () => page.evaluate(() => document.activeElement?.dataset?.key ?? null);
const tab = (name) => page.locator(`.rail-btn[data-tab="${name}"]`).click();
const activeTab = () => page.locator('.rail-btn[aria-pressed="true"]').getAttribute("data-tab");
const chip = (i, kind = "categorical") => page.locator(`[data-key="chip-${kind}-${i}"]`);
const chipColor = (i, kind = "categorical") => chip(i, kind).evaluate((e) => e.style.getPropertyValue("--c").trim().toUpperCase());
const hexInput = (key) => page.locator(`input[data-key="${key}"]`);
const setRange = (loc, v) => loc.evaluate((el, value) => { el.value = String(value); el.dispatchEvent(new Event("input", { bubbles: true })); }, v);
const range = (label) => page.locator(".panel").getByLabel(label, { exact: true });
const pressed = (name) => page.getByRole("button", { name, exact: true }).first().getAttribute("aria-pressed");
const setMode = (m) => page.getByRole("button", { name: m, exact: true }).click();
const barFill = (n) => page.locator(`svg rect[aria-label="Edit color ${n}"]`).first().getAttribute("fill");
const panelText = () => page.locator(".panel").innerText();
const has = async (label) => (await page.locator(".panel").getByLabel(label, { exact: true }).count()) > 0;
const box = async (sel) => page.locator(sel).first().boundingBox();
const openDrawer = async () => { await page.locator(".topbar .download").click(); await page.locator("dialog[open]").waitFor(); };
const closeDrawer = async () => { await page.keyboard.press("Escape"); await page.waitForFunction(() => !document.querySelector("dialog[open]")); };
const reset = async () => {
  await page.locator("#preset").selectOption({ label: "Playfair Data brand" });
  await page.getByRole("button", { name: "Power BI", exact: true }).first().click();
};

// =============================================================================================
// 1. Layout: the app fills the viewport
// =============================================================================================
const app = await box(".app");
const stage = await box(".stage");
const panel = await box(".panel");
const frame = await box(".pv-frame");
check("app fills a 1920px viewport", Math.abs(app.width - 1920) < 2 && Math.abs(app.height - 1080) < 2, JSON.stringify(app));
check("stage takes the remaining width (>1400px)", stage.width > 1400, `stage ${stage.width}`);
check("panel is a compact fixed column (300-400px)", panel.width >= 300 && panel.width <= 400, `panel ${panel.width}`);
check("report uses most of the stage width (>75%; Fit is also limited by height)", frame.width > stage.width * 0.75, `frame ${frame.width} / stage ${stage.width}`);
check("no horizontal page scroll at 1920", (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
check("page itself doesn't scroll (panel and stage do)", (await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)) <= 1);
const noScroll = async () => (await page.evaluate(() => { const sc = document.querySelector(".stage-scroll"); return sc.scrollHeight - sc.clientHeight; })) <= 2;
check("Fit shows the whole Power BI report without scrolling the stage", await noScroll());
for (const [label, name] of [["column", "Sample column chart"], ["line", "Sample line chart"], ["scatter", "Sample scatter plot"], ["share bar", "Sample stacked share bar"]]) {
  check(`Power BI suite has a ${label} chart`, (await page.locator(`.pv-canvas svg[aria-label="${name}"]`).count()) === 1);
}
check("Power BI suite has 4 KPI cards and a table", (await page.locator(".pv-kpis > .pv-card").count()) === 4 && (await page.locator(".pv-table tbody tr").count()) === 4);
check("Power BI line chart draws 3 series", (await page.locator('svg[aria-label="Sample line chart"] polyline[stroke-width="2.5"]').count()) === 3);
check("Power BI scatter draws 18 points", (await page.locator('svg[aria-label="Sample scatter plot"] circle').count()) === 18);
await page.screenshot({ path: path.join(SHOTS, "e2e-1920.png") });

// =============================================================================================
// 2. Defaults and Beginner
// =============================================================================================
check("defaults: Beginner, Power BI, Colors tab", (await pressed("Beginner")) === "true" && (await pressed("Power BI")) === "true" && (await activeTab()) === "colors");
check("8 swatch chips for Playfair", (await page.locator('[data-key^="chip-categorical-"]').count()) === 8);
check("first swatch selected, its hex shown", (await chip(0).getAttribute("aria-pressed")) === "true" && (await hexInput("cat-0").inputValue()) === "#0A3746");
check("Beginner hides status/text color sections", !(await panelText()).includes("Status") && !(await panelText()).includes("Primary"));
check("Beginner points to Advanced", (await panelText()).includes("More settings are in Advanced"));
await tab("text");
check("Beginner Text: one Font control, no sizes", (await has("Font")) && !(await has("Font size")));
await tab("lines");
check("Beginner Lines: gridlines only, no width/zero line", !(await has("Width")) && !(await panelText()).includes("Zero line"));
await tab("canvas");
check("Beginner Canvas (Power BI) lists canvas, page, chart area", (await has("Canvas (Power BI)")) && (await has("Page (Power BI)")) && (await has("Chart area")));
await tab("colors");

// =============================================================================================
// 3. Color editing: swatches, hex, HSL sliders
// =============================================================================================
await chip(2).click();
check("clicking a swatch selects it", (await chip(2).getAttribute("aria-pressed")) === "true" && (await chip(0).getAttribute("aria-pressed")) === "false");
check("editor follows the selection (Color 3)", (await hexInput("cat-2").inputValue()) === "#0F542C");
await hexInput("cat-2").fill("#FF0000");
check("valid hex updates the swatch", (await chipColor(2)) === "#FF0000");
check("valid hex redraws the preview bar", (await barFill(3)) === "#FF0000");
check("typing keeps focus in the hex field", (await focusKey()) === "cat-2");
check("hex moves the sliders (red = 0deg/100%/50%)", (await range("Hue").inputValue()) === "0" && (await range("Saturation").inputValue()) === "100" && (await range("Lightness").inputValue()) === "50");
check("sliders show live readouts", (await page.locator(".range-out").first().innerText()) === "0\u00B0");
await setRange(range("Hue"), 120);
check("dragging Hue rewrites the hex (green)", (await hexInput("cat-2").inputValue()) === "#00FF00");
check("...and the swatch and preview", (await chipColor(2)) === "#00FF00" && (await barFill(3)) === "#00FF00");
await setRange(range("Lightness"), 25);
check("dragging Lightness darkens the color", (await hexInput("cat-2").inputValue()) === "#008000");
await range("Saturation").focus();
await page.keyboard.press("ArrowLeft");
check("sliders respond to the keyboard", (await range("Saturation").inputValue()) === "99");
await hexInput("cat-2").fill("#12");
check("invalid hex is flagged", (await hexInput("cat-2").getAttribute("aria-invalid")) === "true" && (await page.getByText("Use a 6-digit hex color").isVisible()));
check("...and not committed", (await chipColor(2)) !== "#112222");
await hexInput("cat-2").blur();
check("blur restores the last valid hex", /^#[0-9A-F]{6}$/.test(await hexInput("cat-2").inputValue()));
await hexInput("cat-2").fill("#0F542C");

// reorder: buttons, focus, drag
await chip(0).click();
await page.getByRole("button", { name: /Move Color 1 later/ }).click();
check("move later swaps and keeps the color selected", (await chipColor(1)) === "#0A3746" && (await chip(1).getAttribute("aria-pressed")) === "true");
check("focus stays on the Move later button", (await focusKey()) === "move-later");
await chip(1).dragTo(chip(4));
check("drag-and-drop reorders swatches", (await chipColor(4)) === "#0A3746");
await reset();
await page.locator('[data-key="add-color"]').click();
check("add color -> 9 swatches, new one selected", (await page.locator('[data-key^="chip-categorical-"]').count()) === 9 && (await chip(8).getAttribute("aria-pressed")) === "true");
await page.getByRole("button", { name: /Remove Color 9/ }).click();
check("remove color -> 8 swatches", (await page.locator('[data-key^="chip-categorical-"]').count()) === 8);
check("Remove is a spelled-out button, apart from the move arrows", (await page.locator(".remove-color").innerText()).includes("Remove Color") && (await page.locator(".color-editor-head .danger").count()) === 0);

// sequential / diverging use the same editor
await page.getByRole("button", { name: "Diverging", exact: true }).click();
check("diverging has 3 swatches and a ramp strip", (await page.locator('[data-key^="chip-diverging-"]').count()) === 3 && (await page.locator(".ramp").count()) === 1);
const before = await page.locator(".ramp").evaluate((e) => e.style.background);
await hexInput("diverging-0").fill("#FF00FF");
check("editing a ramp end repaints the strip", (await page.locator(".ramp").evaluate((e) => e.style.background)) !== before);
await page.getByRole("button", { name: "Sequential", exact: true }).click();
check("sequential has 2 swatches", (await page.locator('[data-key^="chip-sequential-"]').count()) === 2);
await page.getByRole("button", { name: "Categorical", exact: true }).click();
await reset();

// =============================================================================================
// 4. Click-to-edit from the preview
// =============================================================================================
check("preview has many click-to-edit parts", (await page.locator(".stage .editable").count()) > 15);
check("every editable is a labelled button", await page.locator(".stage .editable").evaluateAll((els) => els.every((e) => e.getAttribute("role") === "button" && e.getAttribute("tabindex") === "0" && /^Edit /.test(e.getAttribute("aria-label") ?? ""))));
await tab("text");
await page.locator('svg rect[aria-label="Edit color 2"]').first().click();
check("clicking a bar opens Colors, selects that swatch", (await activeTab()) === "colors" && (await chip(1).getAttribute("aria-pressed")) === "true");
check("...and focuses its hex field", (await focusKey()) === "cat-1", String(await focusKey()));
await tab("text");
await page.locator('svg[aria-label="Sample scatter plot"] circle').nth(6).click();
check("clicking a scatter point jumps to its group color", (await activeTab()) === "colors" && (await focusKey()) === "cat-1", String(await focusKey()));
await tab("text");
await page.locator('svg[aria-label="Sample line chart"] g.editable[aria-label="Edit color 3"] circle').first().click();
check("clicking a line jumps to its series color", (await activeTab()) === "colors" && (await focusKey()) === "cat-2", String(await focusKey()));

await page.locator(".pv-card").first().click({ position: { x: 3, y: 3 } });
check("clicking a chart area opens Canvas and focuses it", (await activeTab()) === "canvas" && (await focusKey()) === "bg-container", `${await activeTab()} ${await focusKey()}`);
check("preview announces where it jumped", (await page.locator(".pv-status").innerText()).includes("chart area background"));
await page.locator('[aria-label="Edit gridlines"]').first().focus();
await page.keyboard.press("Enter");
check("keyboard Enter on gridlines opens Lines", (await activeTab()) === "lines" && (await focusKey()) === "gridline-color");
await page.locator('.pv-title[aria-label="Edit title font"]').focus();
await page.keyboard.press("Enter");
check("Beginner: title click lands on the single Font control", (await activeTab()) === "text" && (await focusKey()) === "font-body", String(await focusKey()));
check("Beginner: card values aren't clickable", (await page.locator(".pv-kpi").evaluateAll((els) => els.filter((e) => e.getAttribute("role") === "button").length)) === 0);
await page.getByRole("button", { name: "Edit hints" }).click();
check("Edit hints outlines clickable parts", (await page.locator(".stage.hints").count()) === 1 && (await pressed("Edit hints")) === "true");
await page.getByRole("button", { name: "Edit hints" }).click();

// zoom
const z0 = await page.locator(".pv-frame").evaluate((e) => e.style.zoom);
check("default zoom is Fit (>1 at 1920)", Number(z0) > 1, z0);
await page.getByLabel("Zoom").selectOption("0.5");
check("zoom select scales the report", (await page.locator(".pv-frame").evaluate((e) => e.style.zoom)) === "0.5");
await page.getByLabel("Zoom").selectOption("fit");

// =============================================================================================
// 5. Advanced: sliders reach the preview
// =============================================================================================
await setMode("Advanced");
check("Advanced is pressed", (await pressed("Advanced")) === "true");
await tab("text");
check("Advanced Text: Body/Titles/Card sections with size sliders", (await page.locator('.panel input[type="range"]').count()) === 3);
check("size sliders show pt readouts", (await page.locator(".range-out").allInnerTexts()).join(",") === "10pt,14pt,40pt");
await setRange(page.locator('[data-key="size-body"]'), 14);
const stylePx = async (sel) => parseFloat(/font-size:\s*([\d.]+)px/.exec(await page.locator(sel).first().getAttribute("style"))[1]);
check("body size slider reaches the preview (14pt = 18.67px)", Math.abs((await stylePx(".pv-table td")) - 18.667) < 0.01);
await setRange(page.locator('[data-key="size-callout"]'), 20);
check("card value slider reaches the preview (20pt = 26.67px)", Math.abs((await stylePx(".pv-kpi")) - 26.667) < 0.01);
await page.locator('[data-key="font-title"]').selectOption("Verdana");
check("title font reaches the preview", (await page.locator(".pv-title").first().evaluate((e) => getComputedStyle(e).fontFamily)).includes("Verdana"));
await tab("lines");
check("Advanced Lines: gridline and zero line sections with width sliders", (await page.locator('.panel input[type="range"]').count()) === 2);
await setRange(page.locator('[data-key="gridline-width"]'), 4);
check("width slider reaches the gridlines", (await page.locator('[aria-label="Edit gridlines"] line').first().getAttribute("stroke-width")) === "4");
await page.locator(".panel").getByRole("button", { name: "Dashed" }).first().click();
check("style segmented control reaches the preview", (await page.locator('[aria-label="Edit gridlines"] line').first().getAttribute("stroke-dasharray")) === "16 12");
const showGrid = page.locator(".panel .switch").first();
await showGrid.uncheck();
check("switching gridlines off removes them", (await page.locator('[aria-label="Edit gridlines"]').count()) === 0);
await showGrid.check();
await tab("canvas");
await hexInput("bg-canvas").fill("#102030");
check("canvas color reaches the preview", (await page.locator(".pv-canvas").evaluate((e) => getComputedStyle(e).backgroundColor)) === "rgb(16, 32, 48)");
await tab("colors");
check("Advanced Colors adds Status and Text sections", (await panelText()).includes("Status") && (await panelText()).includes("Primary"));
check("Advanced card values are clickable", (await page.locator(".pv-kpi").evaluateAll((els) => els.filter((e) => e.getAttribute("role") === "button").length)) > 0);
await page.locator(".pv-kpi").first().click();
check("clicking a card value opens its size slider", (await activeTab()) === "text" && (await focusKey()) === "size-callout", `${await activeTab()} ${await focusKey()}`);
await tab("canvas");
await setMode("Beginner");
check("switching modes keeps edits", (await page.locator(".pv-canvas").evaluate((e) => getComputedStyle(e).backgroundColor)) === "rgb(16, 32, 48)");
await reset();
await setMode("Advanced");

// =============================================================================================
// 6. Tool toggle
// =============================================================================================
await page.getByRole("button", { name: "Tableau", exact: true }).click();
check("Tableau preview renders with a zero line", (await page.locator(".pv-tab").count()) === 1 && (await page.locator('[aria-label="Edit zero line"]').count()) >= 1);
check("Fit shows the whole Tableau dashboard without scrolling", await noScroll());
check("Tableau suite has KPI cards (4), bar, line, scatter and a table", (await page.locator(".pv-tab .pv-kpis > .pv-card").count()) === 4 && (await page.locator('.pv-tab svg[aria-label="Sample bar chart colored by category"]').count()) === 1 && (await page.locator('.pv-tab svg[aria-label="Sample line chart in the theme mark color"]').count()) === 1 && (await page.locator('.pv-tab svg[aria-label="Sample scatter plot colored by category"]').count()) === 1 && (await page.locator(".pv-tab .pv-table tbody tr").count()) === 5);
check("Tableau scatter has 15 points and a zero line on each axis", (await page.locator('.pv-tab svg[aria-label^="Sample scatter plot"] circle').count()) === 15 && (await page.locator('.pv-tab svg[aria-label^="Sample scatter plot"] [aria-label="Edit zero line"] line:not([stroke="transparent"])').count()) === 2);
await page.locator('.pv-tab svg[aria-label^="Sample scatter plot"] circle').nth(3).click();
check("clicking a Tableau scatter point jumps to its category color", (await activeTab()) === "colors" && (await focusKey()) === "cat-1", String(await focusKey()));
await tab("text");
check("schema chip follows the tool", (await page.locator(".schema-chip").innerText()).includes("Tableau theme"));
await tab("text");
check("one font list in the editor for either tool, labeled by tool", (await page.locator('[data-key="font-body"] option').count()) === 26 && (await page.locator('[data-key="font-body"] option').allTextContents()).includes("Tableau Book · Tableau") && (await page.locator('[data-key="font-body"] option').allTextContents()).includes("Arial · both"));
await page.locator('[data-key="font-body"]').selectOption("Tableau Medium");
check("a one-tool font in the editor says what the other tool will use", (await page.locator(".font-notice").first().innerText()).includes("Power BI theme will use Segoe UI"));
await page.locator('[data-key="font-body"]').selectOption("Arial");
check("a shared font in the editor says it works in both", (await page.locator(".font-notice").first().innerText()).includes("works in both"));
await page.locator(".tool-tabs button", { hasText: "Power BI" }).click(); await tab("text");
check("the same list and choice show for Power BI", (await page.locator('[data-key="font-body"]').inputValue()) === "Arial" && (await page.locator('[data-key="font-body"] option').count()) === 26);
await page.locator(".tool-tabs button", { hasText: "Tableau" }).click(); await tab("text");
check("no card-value slider for Tableau", (await page.locator('[data-key="size-callout"]').count()) === 0);
await page.locator('svg rect[aria-label="Edit color 3"]').first().click();
check("clicking a Tableau bar jumps to its color", (await activeTab()) === "colors" && (await focusKey()) === "cat-2");
await setMode("Beginner");
await tab("canvas");
check("Beginner Tableau shows only the chart area background", !(await has("Canvas (Power BI)")) && (await has("Chart area")));
await setMode("Advanced");
await reset();

// =============================================================================================
// 7. Presets, name, checks
// =============================================================================================
await tab("checks");
const badge1 = Number(await page.locator(".rail-badge").innerText());
const summary1 = await page.locator(".a11y-summary").innerText();
check("Checks badge matches the findings count", summary1.startsWith(`${badge1} thing`), `${badge1} vs ${summary1}`);
check("Checks tab lists Playfair's real problems", (await panelText()).includes("Muted text is hard to read") && (await panelText()).includes("look alike"));
check("Checks cards have a uniform border (no left accent)", await page.locator(".finding").first().evaluate((e) => { const c = getComputedStyle(e); return c.borderLeftWidth === c.borderTopWidth && c.borderLeftColor === c.borderTopColor; }));
check("simulated palettes for 3 vision types", (await page.locator(".a11y .chips").count()) === 3);
await page.locator("#preset").selectOption({ label: "Okabe-Ito (colorblind-safe)" });
check("preset sets the name", (await page.locator("#theme-name").inputValue()).startsWith("Okabe-Ito"));
check("Okabe-Ito has nothing to check, so the badge is hidden", !(await page.locator(".rail-badge").isVisible()), await page.locator(".rail-badge").innerText());
check("the light-yellow note shows separately under Good to know", (await panelText()).includes("Good to know") && (await panelText()).includes("Light data colors on the chart background") && (await page.locator(".a11y-summary").innerText()) === "No problems found by these checks.");
check("Okabe-Ito: no color-confusion findings", !(await panelText()).includes("look alike"));
await tab("colors");
check("preset loads its swatches", (await chipColor(0)) === "#E69F00");
await reset();

// =============================================================================================
// 8. Download drawer
// =============================================================================================
await page.locator("#theme-name").fill("");
await openDrawer();
check("empty name: export error shown in the drawer", (await page.locator("dialog").innerText()).includes("name must not be empty"));
check("empty name: downloads disabled", await page.locator("dialog .export-card").first().getByRole("button", { name: "Download", exact: true }).isDisabled());
await closeDrawer();
await page.locator("#theme-name").fill("QA Theme #1");
await openDrawer();
check("drawer opens as a modal sheet on the right", await page.locator("dialog.drawer").evaluate((d) => d.getBoundingClientRect().right >= innerWidth - 1 && d.getBoundingClientRect().width <= 740));
check("filenames follow the slug", (await page.locator("dialog .filename").allInnerTexts()).join("|") === "qa-theme-1.powerbi.json|qa-theme-1.tableau.json|feathers-qa-theme-1.tps");
check("Advanced offers View file", (await page.locator("dialog").getByRole("button", { name: "View file" }).count()) === 3);
const dl = async (title) => {
  const card = page.locator("dialog .export-card", { hasText: title });
  const [d] = await Promise.all([page.waitForEvent("download"), card.getByRole("button", { name: "Download" }).click()]);
  const file = path.join(OUT, d.suggestedFilename());
  await d.saveAs(file);
  return { name: d.suggestedFilename(), text: fs.readFileSync(file, "utf-8") };
};
const pbi = await dl("Power BI theme");
const pbiJson = JSON.parse(pbi.text);
check("Power BI file validates vs schema 2.157", validatePbi(pbiJson) === true, JSON.stringify(validatePbi.errors?.slice(0, 2)));
check("Power BI file carries the UI's settings", pbiJson.name === "QA Theme #1" && pbiJson.dataColors[0] === "#0A3746" && pbiJson.textClasses.title.fontSize === 14);
const tabl = await dl("Tableau theme");
const tabJson = JSON.parse(tabl.text);
check("Tableau theme validates vs its schema", validateTab(tabJson) === true, JSON.stringify(validateTab.errors?.slice(0, 2)));
const tps = await dl("Tableau palettes");
check("tps has 3 palette types, straight quotes", ["regular", "ordered-sequential", "ordered-diverging"].every((t) => tps.text.includes(`type="${t}"`)) && !/[\u201C\u201D]/.test(tps.text));
check("downloading opens the matching guide with the real filename", await page.locator("dialog .guide", { hasText: "Add the palettes" }).evaluate((el) => el.open) && (await page.locator("dialog .guide", { hasText: "Add the palettes" }).innerText()).includes("feathers-qa-theme-1.tps"));
await page.locator("dialog .export-card", { hasText: "Tableau palettes" }).getByRole("button", { name: "Copy XML" }).click();
const clip = await page.evaluate(() => navigator.clipboard.readText());
check("Copy XML copies just the palette blocks", clip.includes("<color-palette") && !clip.includes("<preferences>"));
check("no unreplaced {file} placeholders", !(await page.locator("dialog").innerText()).includes("{file}"));
await page.screenshot({ path: path.join(SHOTS, "e2e-drawer.png") });
await closeDrawer();
check("Escape returns focus to the Download button", await page.evaluate(() => document.activeElement?.classList.contains("download")));
await openDrawer();
await page.mouse.click(40, 300);
await page.waitForFunction(() => !document.querySelector("dialog[open]"));
check("clicking the dimmed backdrop closes the drawer", true);
await setMode("Beginner");
await openDrawer();
check("Beginner hides View file but keeps Download and Copy XML", (await page.locator("dialog").getByRole("button", { name: "View file" }).count()) === 0 && (await page.locator("dialog").getByRole("button", { name: "Copy XML" }).count()) === 1);
await closeDrawer();
await setMode("Advanced");

// =============================================================================================
// 9. Persistence
// =============================================================================================
await page.getByRole("button", { name: "Tableau", exact: true }).click();
await page.reload();
check("reload restores name, tool and mode", (await page.locator("#theme-name").inputValue()) === "QA Theme #1" && (await pressed("Tableau")) === "true" && (await pressed("Advanced")) === "true");
await page.evaluate(() => localStorage.setItem("feathers.state.v1", "{broken"));
await page.reload();
check("corrupt storage falls back to Playfair/Beginner", (await pressed("Beginner")) === "true" && (await chipColor(0)) === "#0A3746");

// =============================================================================================
// 10. Other viewport sizes and dark mode
// =============================================================================================
for (const [w, h] of [[1440, 900], [1280, 720]]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(300); // let the stage's ResizeObserver refit the report
  const s = await box(".stage");
  const f = await box(".pv-frame");
  check(`${w}px: fills the viewport, report fits the stage`, Math.abs((await box(".app")).width - w) < 2 && f.width <= s.width && (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, `stage ${s.width} frame ${f.width}`);
}
await page.setViewportSize({ width: 768, height: 1024 });
check("768px: stacked layout, no horizontal scroll", (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
await page.setViewportSize({ width: 375, height: 812 });
await page.reload();
check("375px: no horizontal scroll", (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0, String(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)));
const dlBtn = await box(".topbar .download");
check("375px: Download is on the first row of the top bar", dlBtn.y < 70, `y=${dlBtn.y}`);
check("375px: report reflows to the screen width", (await box(".pv-frame")).width <= 375);
await page.screenshot({ path: path.join(SHOTS, "e2e-375.png"), fullPage: false });
await page.setViewportSize({ width: 1920, height: 1080 });
await page.emulateMedia({ colorScheme: "dark" });
await page.waitForTimeout(400);
const dark = await page.evaluate(() => ({ body: getComputedStyle(document.body).backgroundColor, panel: getComputedStyle(document.querySelector(".panel")).backgroundColor, text: getComputedStyle(document.body).color }));
check("dark mode: dark surfaces, light text", dark.body === "rgb(20, 23, 29)" && dark.panel === "rgb(20, 23, 29)" && dark.text === "rgb(238, 240, 244)", JSON.stringify(dark));
await page.screenshot({ path: path.join(SHOTS, "e2e-dark.png") });

// ---- Sample pages (Overview / Trends / Breakdown) ----------------------------------------------
await page.emulateMedia({ colorScheme: "light" });
const pickTool = (name) => page.locator(".tool-tabs button", { hasText: name }).click();
const pickPage = (p) => page.locator(`.page-tab[data-page="${p}"]`).click();
await pickTool("Power BI");
check("pages: three tabs, Overview selected by default after a reload", (await page.locator(".page-tab").count()) === 3 && (await page.locator('.page-tab[aria-pressed="true"]').innerText()) === "Overview");
await pickPage("trends");
check("Power BI Trends: stacked area, stacked columns and a line chart", (await page.locator('.pv-canvas svg[aria-label="Sample stacked area chart"] polygon').count()) === 3 && (await page.locator('svg[aria-label="Sample stacked column chart"] rect').count()) === 12 && (await page.locator('svg[aria-label="Sample year-over-year line chart"] polyline').count()) >= 2);
await pickPage("breakdown");
check("Power BI Breakdown: donut (5), heatmap (16 cells), variance bars (6), status tiles (3)", (await page.locator('svg[aria-label="Sample donut chart"] path').count()) === 5 && (await page.locator(".pv-heat td").count()) === 16 && (await page.locator('svg[aria-label^="Sample variance bars"] rect:not([stroke])').count()) >= 6 && (await page.locator(".pv-tile").count()) === 3);
await page.locator(".pv-heat td").first().click();
check("clicking a heatmap cell jumps to a gradient color", (await focusKey()) === "diverging-2" || (await focusKey()) === "diverging-1" || (await focusKey()) === "diverging-0", String(await focusKey()));
await pickTool("Tableau");
check("switching tool keeps the page; Tableau has no status tiles and shows a sequential scale", (await page.locator('.page-tab[aria-pressed="true"]').innerText()) === "Breakdown" && (await page.locator(".pv-tile").count()) === 0 && (await page.locator(".pv-scale").count()) === 2);
await page.locator(".pv-heat td").first().click();
check("Tableau heatmap cell jumps to a sequential color", ["sequential-0", "sequential-1"].includes(await focusKey()), String(await focusKey()));
check("Tableau variance center rule is the zero line", (await page.locator('svg[aria-label^="Sample variance bars"] line:not([stroke="transparent"])').count()) === 1);
await pickPage("overview");
check("back on Overview the full suite returns", (await page.locator(".pv-tab .pv-kpis > .pv-card").count()) === 4);
await page.reload();
check("page choice is a view preference and is not saved", (await page.locator('.page-tab[aria-pressed="true"]').innerText()) === "Overview");

// ---- Page gray and the Power BI visual border ----------------------------------------------------
await page.locator(".tool-tabs button", { hasText: "Power BI" }).click();
await page.locator("#preset").selectOption({ label: "Okabe-Ito (colorblind-safe)" });
await tab("canvas");
check("the neutral presets default to a #F0F0F0 page", (await page.locator('[data-key="bg-page"]').first().inputValue()).toUpperCase() === "#F0F0F0");
check("Power BI Canvas has a visual border switch and color", (await page.getByRole("switch", { name: "Show border" }).count()) === 1 && (await page.locator('[data-key="border-color"]').count()) >= 1);
check("the border is off by default in the preview", !(await page.locator(".pv-card").first().getAttribute("style")).includes("border"));
await page.getByRole("switch", { name: "Show border" }).check();
// The preview is scaled with CSS zoom, so read the declared style, not the computed width.
check("switching it on outlines the visuals in black", (await page.locator(".pv-card").first().getAttribute("style")).includes("border: 1px solid rgb(0, 0, 0)"));
await page.getByRole("switch", { name: "Show border" }).uncheck();
await page.locator(".tool-tabs button", { hasText: "Tableau" }).click();
await tab("canvas");
check("Tableau Canvas has no border control", (await page.getByRole("switch", { name: "Show border" }).count()) === 0);
check("neutral presets still pass the text-contrast check on the gray page", !(await (async () => { await tab("checks"); return page.locator(".a11y").innerText(); })()).includes("hard to read"));

await tab("colors");

// ---- Live code panel ---------------------------------------------------------------------------
await pickTool("Power BI");
await page.locator(".code-toggle").click();
check("Code panel opens with the Power BI file", (await page.locator(".code-panel").isVisible()) && (await page.locator(".code-tab").count()) === 1 && (await page.locator(".code-tab").innerText()).endsWith(".powerbi.json"));
check("Code panel shows valid JSON", (() => { try { JSON.parse(""); } catch {} return true; })() && await page.locator(".code-text").evaluateAll((els) => { try { JSON.parse(els.map((e) => e.textContent).join("\n")); return true; } catch { return false; } }));
check("nothing is highlighted before an edit", (await page.locator(".code-line.changed").count()) === 0);
await hexInput("cat-0").fill("#123456");
// The first color feeds dataColors, tableAccent and the card callout color, so three lines change.
check("editing a color highlights exactly the three lines that use it", (await page.locator(".code-line.changed").count()) === 3 && (await page.locator(".code-line.changed").allInnerTexts()).every((t) => t.toLowerCase().includes("#123456")), String(await page.locator(".code-line.changed").count()));
const fr = await box(".pv-frame"); const sc = await box(".stage-scroll");
check("preview refits beside the panel", fr.width <= sc.width + 1, `frame ${fr.width} stage ${sc.width}`);
await pickTool("Tableau");
check("Tableau shows both of its files", (await page.locator(".code-tab").count()) === 2);
await page.locator(".code-tab").nth(1).click();
check("the palettes tab shows the .tps XML", (await page.locator(".code-text").first().innerText()).includes("<?xml") || (await page.locator(".code-body").innerText()).includes("<preferences"));
await page.locator(".code-toggle").click();
check("Code panel closes", !(await page.locator(".code-panel").isVisible()));

check("no console errors", consoleErrors.length === 0, consoleErrors.join(" | "));

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);

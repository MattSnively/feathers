import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const REPO = "C:/Users/matts/projects/feathers";
const OUT = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, ""));
const SHOTS = path.join(OUT, "shots");
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`);
};

const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const errors = [];
const watch = (page) => {
  page.setDefaultTimeout(8000);
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("response", (r) => r.status() >= 400 && errors.push(`HTTP ${r.status()} ${r.url()}`));
  page.on("pageerror", (e) => errors.push(String(e)));
};

const fresh = async (viewport = { width: 1920, height: 1080 }) => {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  watch(page);
  await page.goto("http://localhost:4173/");
  await page.locator(".onboard").waitFor();
  return { context, page };
};

// =============================================================================================
// A. First visit
// =============================================================================================
let { context, page } = await fresh();
const ob = page.locator(".onboard");
// The headline has a hard line break after "fonts"; read it as one sentence.
const h1 = async () => (await page.locator(".onboard h1").innerText()).replace(/\s+/g, " ").trim();
const tiles = () => page.locator(".ob-tile");
const tileHex = () => page.locator(".ob-tile-hex").allInnerTexts();
const palettePressed = (id) => page.locator(`[data-palette="${id}"]`).getAttribute("aria-pressed");
const previewFill = () => page.locator(".ob-pv-frame svg rect").first().getAttribute("fill");
const feedback = () => page.locator(".ob-feedback").innerText();
const activeTag = () => page.evaluate(() => document.activeElement?.tagName);
const nextBtn = () => page.getByRole("button", { name: "Continue" });

check("first visit shows the flow", await ob.isVisible());
check("heading is 'Customize your colors and fonts before you even start your dashboard.' and has focus", (await h1()) === "Customize your colors and fonts before you even start your dashboard." && (await activeTag()) === "H1");
check("no step navigation in the header", (await page.locator(".ob-head nav, .ob-step").count()) === 0);
check("subhead explains the output", (await page.locator(".ob-lead").innerText()).startsWith("Import custom .json and .tps files directly into Tableau or Power BI with Feathers. Your styles made easy."));
const actions = await page.locator(".ob-actions").boundingBox(); const firstCard = await page.locator(".ob-own").boundingBox();
check("Continue sits under the header text, above the choices and in view", actions.y + actions.height < 400 && (await page.locator(".ob-actions").getByRole("button", { name: "Continue to fonts" }).isVisible()), JSON.stringify(actions));
check("the editor behind the flow is inert", await page.locator(".app").evaluate((e) => e.inert === true));
check("Playfair is preselected, own colors is not", (await palettePressed("playfair")) === "true" && !(await page.locator(".ob-own.is-selected").count()));
check("8 color tiles from the preselected palette", (await tiles().count()) === 8 && (await tileHex())[0] === "#0A3746");
check("one example dashboard, labeled, on the left", (await page.locator(".ob-pv-frame").count()) === 1 && (await page.locator(".ob-example h2").innerText()) === "Example dashboard" && (await page.locator(".ob-example").boundingBox()).x < firstCard.x);
check("palettes and own colors are on the right, below nothing but the header", (await page.locator(".ob-palettes").boundingBox()).x > (await page.locator(".ob-example").boundingBox()).x + 200);
check("preview uses the palette", (await previewFill()) === "#0A3746");
check("preview is decorative (hidden from assistive tech)", (await page.locator(".ob-example [aria-hidden=\"true\"]").count()) === 1);
check("the example fits in view at 1920x1080", await page.locator(".ob-example").evaluate((e) => e.getBoundingClientRect().bottom <= innerHeight), String(await page.locator(".ob-example").evaluate((e) => e.getBoundingClientRect().bottom)));
check("hard line break after 'fonts', so the second line never moves", (await page.locator(".onboard h1 br").count()) === 1 && await page.locator(".onboard h1").evaluate((h) => { const f = h.querySelector(".cycle-fonts").getBoundingClientRect(); const br = h.querySelector("br").previousSibling; const r = document.createRange(); r.selectNodeContents(h); const last = [...r.getClientRects()].pop(); return last.top > f.bottom - 4; }));
const fontOf = () => page.locator(".cycle-fonts").evaluate((e) => e.style.fontFamily);
const colorOf = () => page.locator(".cycle-colors").evaluate((e) => e.style.color);
check("the headline still reads as one sentence", (await h1()) === "Customize your colors and fonts before you even start your dashboard.");
const seenFonts = new Set(), seenColors = new Set();
for (let i = 0; i < 9; i++) { seenFonts.add(await fontOf()); seenColors.add(await colorOf()); await page.waitForTimeout(700); }
check("'colors' cycles through several colors", seenColors.size >= 3, [...seenColors].join(" | "));
check("'fonts' cycles through several fonts", seenFonts.size >= 3, [...seenFonts].join(" | "));
const only = [...seenFonts].filter((f) => f).every((f) => /Arial|Calibri|Courier New|Georgia|Times New Roman|Trebuchet MS|Verdana/.test(f));
check("only fonts that work in both tools are shown", only, [...seenFonts].join(" | "));
check("cycled colors come from the palette and are readable", [...seenColors].filter((c) => c).every((c) => ["rgb(10, 55, 70)", "rgb(15, 84, 44)", "rgb(138, 30, 0)", "rgb(179, 96, 0)", "rgb(3, 34, 44)", "rgb(156, 143, 130)", "rgb(249, 154, 43)", "rgb(178, 175, 115)"].includes(c)), [...seenColors].join(" | "));
{
  const rm = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: "reduce" });
  const rp = await rm.newPage();
  await rp.goto("http://localhost:4173/");
  await rp.locator(".onboard").waitFor();
  await rp.waitForTimeout(4500);
  check("reduced motion: the headline stays still", (await rp.locator(".cycle-fonts").evaluate((e) => e.style.fontFamily)) === "" && (await rp.locator(".cycle-colors").evaluate((e) => e.style.color)) === "");
  await rm.close();
}
await page.screenshot({ path: path.join(SHOTS, "ob-1.png") });

// keyboard stays inside the flow
let escaped = false;
for (let i = 0; i < 40; i++) {
  await page.keyboard.press("Tab");
  // Tabbing past the last control hands focus to the browser's own UI (body); what must never happen is landing in the editor.
  if (await page.evaluate(() => !!document.activeElement?.closest(".app, dialog"))) escaped = true;
}
check("Tab never leaves the flow for the inert editor", !escaped);

// palette cards
await page.locator('[data-palette="okabe"]').click();
check("choosing Okabe-Ito selects its card and loads its colors", (await palettePressed("okabe")) === "true" && (await palettePressed("playfair")) === "false" && (await tileHex())[0] === "#E69F00");
check("...and the preview follows", (await previewFill()) === "#E69F00" || (await page.waitForFunction(() => document.querySelector(".ob-pv-frame svg rect")?.getAttribute("fill") === "#E69F00").then(() => true)));

// edit a tile
await tiles().nth(1).locator("input").evaluate((el) => { el.value = "#112233"; el.dispatchEvent(new Event("input", { bubbles: true })); });
check("editing a tile switches to 'Your own colors'", await page.locator(".ob-own.is-selected").count() === 1 && (await palettePressed("okabe")) === "false");
check("...and updates the tile's hex", (await tileHex())[1] === "#112233");

// paste
await page.getByLabel("Paste hex codes").fill("#112233 #445566, 778899 nope");
check("pasting hex codes replaces the tiles", (await tiles().count()) === 3 && (await tileHex()).join(",") === "#112233,#445566,#778899");
check("...and says what it used and skipped", (await feedback()).includes("Using 3 colors") && (await feedback()).includes("nope"));
await page.getByLabel("Paste hex codes").fill("hello there");
check("paste with no colors shows an error and keeps the tiles", (await feedback()).includes("No hex colors found") && (await tiles().count()) === 3);
await page.getByLabel("Paste hex codes").fill("#0045E5 #FFB81C #FF5C39 #00A878 #8DB4FF #1B1E3C");
check("six brand colors give six tiles", (await tiles().count()) === 6);

// import a Power BI theme
await page.locator('input[type="file"]').setInputFiles(`${REPO}/research/handtest/feathers-playfair.powerbi.json`);
await page.waitForFunction(() => document.querySelector(".ob-feedback")?.textContent?.includes("Imported"));
check("importing a Power BI theme loads its colors", (await tiles().count()) === 8 && (await tileHex())[0] === "#0A3746");
check("...and reports what it read", (await feedback()).includes("data colors") && (await feedback()).includes("fonts"));
const badFile = path.join(OUT, "bad-theme.json");
fs.writeFileSync(badFile, "{nope");
await page.locator('input[type="file"]').setInputFiles(badFile);
await page.waitForFunction(() => document.querySelector(".ob-feedback")?.textContent?.includes("valid JSON"));
check("a broken file shows a readable error and keeps your colors", (await tiles().count()) === 8);
const emptyFile = path.join(OUT, "empty-theme.json");
fs.writeFileSync(emptyFile, '{"hello":"world"}');
await page.locator('input[type="file"]').setInputFiles(emptyFile);
await page.waitForFunction(() => document.querySelector(".ob-feedback")?.textContent?.includes("no settings"));
check("a file with nothing usable is explained", true);

// =============================================================================================
// B. Fonts
// =============================================================================================
await page.locator('[data-palette="tol"]').click();
await nextBtn().click();
check("step 2 heading and focus", (await h1()) === "Pick a font" && (await activeTag()) === "H1");
check("one font list, not two groups", (await page.locator(".ob-fonts").count()) === 1 && (await page.locator(".ob-sub").count()) === 0);
check("26 fonts, each labeled with where it works", (await page.locator(".ob-font").count()) === 26 && (await page.locator(".ob-font", { hasText: "Power BI + Tableau" }).count()) === 7 && (await page.locator(".ob-font", { hasText: "Power BI only" }).count()) === 13 && (await page.locator(".ob-font", { hasText: "Tableau only" }).count()) === 6);
const edgeOf = (cls) => page.locator(`.ob-font.${cls}`).first().evaluate((e) => getComputedStyle(e).borderTopColor);
check("card edges are color-coded: yellow Power BI, blue Tableau, green both", (await edgeOf("powerbi")) === "rgb(209, 154, 0)" && (await edgeOf("tableau")) === "rgb(47, 111, 222)" && (await edgeOf("both")) === "rgb(30, 158, 87)", [await edgeOf("powerbi"), await edgeOf("tableau"), await edgeOf("both")].join(" "));
check("exactly one font is selected", (await page.locator('.ob-font[aria-pressed="true"]').count()) === 1);
check("the notice starts with the current font", (await page.locator(".ob-font-notice").innerText()).includes("Segoe UI is a Power BI font"));
check("current fonts are marked", (await page.locator(".ob-font", { hasText: "Segoe UI" }).first().getAttribute("aria-pressed")) === "true");
await page.locator(".ob-font", { hasText: "Tableau Medium" }).click();
check("a Tableau-only font warns that Power BI will use Segoe UI", (await page.locator(".ob-font-notice").innerText()).includes("Power BI theme will use Segoe UI"));
await page.waitForFunction(() => /Tableau Medium/.test(getComputedStyle(document.querySelector(".ob-pv-frame .pv-title")).fontFamily));
await page.locator(".ob-font", { hasText: "Verdana" }).first().click();
check("a shared font says it works in both", (await page.locator(".ob-font-notice").innerText()).includes("works in both Power BI and Tableau"));
check("choosing a font marks it", (await page.locator(".ob-font", { hasText: "Verdana" }).first().getAttribute("aria-pressed")) === "true");
await page.waitForFunction(() => /Verdana/.test(getComputedStyle(document.querySelector(".ob-pv-frame .pv-title")).fontFamily));
check("the Power BI preview switches font", true);
await page.screenshot({ path: path.join(SHOTS, "ob-2.png") });
await page.locator(".ob-actions").getByRole("button", { name: "Back" }).click();
check("Back returns to colors and keeps the choice", (await h1()) === "Customize your colors and fonts before you even start your dashboard." && (await palettePressed("tol")) === "true");
await nextBtn().click();
await nextBtn().click();
check("Continue twice reaches the naming step", (await h1()) === "Name your theme");

// =============================================================================================
// C. Name and launch
// =============================================================================================
check("name defaults to the chosen palette's name", (await page.locator("#ob-name").inputValue()) === "Paul Tol Muted");
await page.locator("#ob-name").fill("My Brand Theme");
const files = await page.locator(".ob-files code").allInnerTexts();
check("file names follow the name as you type", files.join("|") === "my-brand-theme.powerbi.json|my-brand-theme.tableau.json|feathers-my-brand-theme.tps", files.join("|"));
check("summary names the colors and fonts", (await page.locator(".ob-note").first().innerText()).includes("9 colors") && (await page.locator(".ob-note").first().innerText()).includes("Verdana in Power BI") && (await page.locator(".ob-note").first().innerText()).includes("Verdana in Tableau"));
await page.screenshot({ path: path.join(SHOTS, "ob-3.png") });
await page.getByRole("button", { name: "Open the editor" }).click();
check("launching closes the flow and unlocks the editor", (await page.locator(".onboard").count()) === 0 && (await page.locator(".app").evaluate((e) => e.inert === false)));
check("the editor has the theme name", (await page.locator("#theme-name").inputValue()) === "My Brand Theme");
check("...the chosen palette (Tol Muted, 9 swatches)", (await page.locator('[data-key^="chip-categorical-"]').count()) === 9 && (await page.locator('input[data-key="cat-0"]').inputValue()) === "#CC6677");
await page.locator('.rail-btn[data-tab="text"]').click();
check("...and the chosen fonts (Verdana in Power BI)", (await page.locator('select[data-key="font-body"]').inputValue()) === "Verdana");
check("focus lands in the editor", await page.evaluate(() => !!document.activeElement?.closest(".rail")));
await page.screenshot({ path: path.join(SHOTS, "ob-editor.png") });

// =============================================================================================
// D. First visit only; New theme; Skip
// =============================================================================================
check("the flag is stored", (await page.evaluate(() => localStorage.getItem("feathers.onboarded.v1"))) === "1");
await page.reload();
check("reload goes straight to the editor", (await page.locator(".onboard").count()) === 0 && (await page.locator("#theme-name").inputValue()) === "My Brand Theme");
const savedState = await page.evaluate(() => localStorage.getItem("feathers.state.v1"));

await page.getByRole("button", { name: "New theme" }).click();
check("New theme reopens the flow", await page.locator(".onboard").isVisible() && (await h1()) === "Customize your colors and fonts before you even start your dashboard.");
check("...starting from the current theme (9 Tol colors)", (await tiles().count()) === 9 && (await palettePressed("tol")) === "true");
await page.getByRole("button", { name: "Skip for now" }).click();
check("Skip closes it without changing anything", (await page.locator(".onboard").count()) === 0 && (await page.locator("#theme-name").inputValue()) === "My Brand Theme");
check("focus returns to the editor after Skip", await page.evaluate(() => !!document.activeElement?.closest(".rail")));
await context.close();

// skipping on a true first visit
({ context, page } = await fresh());
await page.getByRole("button", { name: "Skip for now" }).click();
check("Skip on first visit shows the default Playfair editor", (await page.locator("#theme-name").inputValue()) === "Playfair Data" && (await page.locator(".onboard").count()) === 0);
await page.reload();
check("...and doesn't come back after reload", (await page.locator(".onboard").count()) === 0);
await context.close();

// a user with a saved theme from before the flow existed goes straight to the editor
context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
await context.addInitScript((state) => { try { localStorage.setItem("feathers.state.v1", state); } catch {} }, savedState);
page = await context.newPage();
watch(page);
await page.goto("http://localhost:4173/");
await page.locator("#theme-name").waitFor();
check("a saved theme with no flag skips the flow", (await page.locator(".onboard").count()) === 0 && (await page.locator("#theme-name").inputValue()) === "My Brand Theme");
await context.close();

// =============================================================================================
// E. Phone and dark mode
// =============================================================================================
({ context, page } = await fresh({ width: 375, height: 812 }));
check("375px: no horizontal scroll", (await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0 && (await page.evaluate(() => document.querySelector(".onboard").scrollWidth - document.querySelector(".onboard").clientWidth)) <= 0);
check("375px: the example is hidden to keep the flow usable", !(await page.locator(".ob-example").isVisible()));
check("375px: tiles and Continue are reachable", (await tiles().count()) === 8 && (await nextBtn().isVisible()));
await page.screenshot({ path: path.join(SHOTS, "ob-375.png") });
await page.getByRole("button", { name: "Continue" }).click();
await page.getByRole("button", { name: "Continue" }).click();
await page.getByRole("button", { name: "Open the editor" }).click();
check("375px: completes into the editor", (await page.locator(".onboard").count()) === 0 && (await page.locator(".topbar .download").isVisible()));
await context.close();

({ context, page } = await fresh());
await page.emulateMedia({ colorScheme: "dark" });
await page.waitForTimeout(300);
check("dark mode: flow uses dark surfaces", (await page.locator(".onboard").evaluate((e) => getComputedStyle(e).backgroundColor)) === "rgb(20, 23, 29)");
await page.screenshot({ path: path.join(SHOTS, "ob-dark.png") });
await context.close();

check("no console errors", errors.length === 0, errors.join(" | "));
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);

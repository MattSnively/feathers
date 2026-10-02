# Hand-verification checklist (feathers-5ct.14)

About 45 minutes. Each item is a claim our guides make, or a known risk. Mark each ✓ (matches), ✗ (differs: write what you saw) or ? (couldn't test). Reply with the results and I'll fix `src/guides/content.ts`.

Live site: https://mattsnively.github.io/feathers/

## 0. Prep (5 min)

1. Open the site. Click **Advanced** (top, "Detail level").
2. **Start from > Playfair Data brand.** Set **Name** to `Checklist Test`.
3. Under **Fonts**, set **Body size** to `12` and **Title size** to `20`. (These make size problems obvious.)
4. Download all three files from the Download section. (Switch **I'm building for** between Power BI and Tableau to see the Tableau fonts panel; sizes are shared.) You should have:
   - `checklist-test.powerbi.json`
   - `checklist-test.tableau.json`
   - `feathers-checklist-test.tps`

What the Playfair theme should look like: dark teal first color (`#0A3746`), then orange, dark green, dark red. Dotted pale gridlines, solid gray zero line. Page and chart areas white; Power BI canvas pale `#F3F4EF`.

## A. Power BI Desktop (15 min)

| # | Check | Guide says | Result |
|---|---|---|---|
| A1 | Which command imports a theme? Write the exact menu path. | Design ribbon > **Import theme** (older: View > Themes > Browse for themes) | |
| A2 | Import `checklist-test.powerbi.json`. Is there a success message? Quote it. | Power BI shows a message when the import succeeds | |
| A3 | Add a clustered column chart with a legend (or 3 measures). Do series use the palette in order (dark teal, orange, dark green)? | Series use your colors in order | |
| A4 | **Design > Customize theme > Colors** shows your palette? | Yes | |
| A5 | Text uses Segoe UI; visual titles use Segoe UI Semibold at about 14? | Fonts follow the theme | |
| A6 | Gridlines are dotted and pale? | Gridlines follow the theme | |
| A7 | Page background white, canvas (area behind the page) pale `#F3F4EF`? | Backgrounds follow the theme | |
| A8 | Import a theme **over** a visual you already formatted by hand. Does that visual keep its formatting until you Reset to default? | Yes | |
| A9 | Did importing wipe any theme-level customization you had? | Yes, importing replaces them | |
| A10 | **Segoe (Bold):** in Feathers set **Title font** to `Segoe (Bold)`, download, import. Do visual titles render **bold**? | Not yet verified | |

## B. Tableau Desktop: theme JSON (15 min)

| # | Check | Guide says | Result |
|---|---|---|---|
| B1 | **Help > About Tableau**: your version? (must be 2025.1+) | Menu item needs 2025.1 or later | |
| B2 | Exact menu path and label for the import? | Format > **Import Custom Theme…** | |
| B3 | After choosing `checklist-test.tableau.json`: quote the dialog text and **exact button labels**. | Override / Preserve | |
| B4 | On a bar chart with a continuous axis: gridlines dotted and pale; zero line solid gray; fonts Tableau Book / Tableau Semibold? | Yes | |
| B5 | View background white? On a chart with **no** color field, is the mark color dark teal `#0A3746`? | Yes (first palette color) | |
| B6 | **Font sizes (the known risk).** Worksheet title is 20pt? Tooltip text is 12pt? Dashboard title 20pt bold? Worksheet text 12pt? A blogger reported title and tooltip sizes did **not** apply from a hand-written theme. Which applied? | Sizes apply | |
| B7 | Format a worksheet title by hand first (say, red). Import again with **Preserve**: still red? With **Override**: replaced? | Preserve keeps your formatting; Override replaces it | |
| B8 | Style text with the **rich text editor** (e.g. bold part of a title), import with Override. Does that styling survive? | Yes, rich text isn't touched | |

## C. Tableau Desktop: palettes (.tps) (15 min)

| # | Check | Guide says | Result |
|---|---|---|---|
| C1 | Folder path on your machine? Does `Documents\My Tableau Repository` exist? (Mac users: `Documents/My Tableau Repository`, or tell me if you can't test.) | In your Documents folder | |
| C2 | Does a `Preferences.tps` already exist? Does it have `<preferences>` tags? Make a backup first. | Backup, then edit the existing file | |
| C3 | In Feathers click **Copy XML** and paste between `<preferences>` and `</preferences>`. Did Copy XML work? | Copies just the palette blocks | |
| C4 | Restart Tableau. In **Edit Colors**, are `Checklist Test`, `Checklist Test Sequential` and `Checklist Test Diverging` at the **bottom** of the palette dropdown? | Bottom of the list | |
| C5 | Color a **discrete** field (blue pill): which of the three palettes appear? | Categorical one | |
| C6 | Color a **continuous** measure (green pill): which appear? Do Sequential and Diverging show only here? | Sequential and Diverging for continuous | |
| C7 | Click **Assign Palette** then **OK**. Do marks use the colors in order? | Yes | |
| C8 | **Mistake test:** paste the palette *outside* `<preferences>` (or use curly quotes), restart. What happens? (Restore your backup afterward.) | Palettes missing, or Tableau ignores the file | |

## D. Optional (if you have access)

| # | Check | Result |
|---|---|---|
| D1 | Publish a workbook with the theme imported to Tableau Cloud/Server. Is the formatting kept for viewers? (Docs are silent.) | |
| D2 | Open it as someone **without** the `.tps` palette: do the palette colors still show? | |

## E. Guide readability (5 min)

Open each guide on the site ("How to import"). Note any step that was wrong, out of order, or confusing, and any step you had to guess at. Which of the three guides would a first-time user struggle with most?

## Reply format

```
A1: ✓/✗/?  notes...
A2: ...
```

Anything you want to add that isn't on the list is welcome.

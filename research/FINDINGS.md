# Export format research (feathers-5ct.1)

Verified 2026-10-01 against raw schema files, not summaries. Hand-test status at the bottom.

## Tableau theme JSON (Desktop 2025.1+)
Schema: https://help.tableau.com/samples/en-us/custom_themes/CustomThemesSchema_1.0.0.json
Import: Format > Import Custom Theme... (Override or Preserve). Limits: 15,000 bytes, filename chars alnum . - _ space, path <= 256.

Required: `version` ("1.0.0"), `base-theme`, `styles`. `additionalProperties: false` everywhere, so unknown keys fail.

**The docs page and the schema disagree. Follow the schema.**

| Item | Docs page says | Schema says |
|---|---|---|
| `base-theme` values | smooth, clean, modern, classic | also `default` |
| `line-width` | 1-99 | **1-5** |
| `font-color`, `mark-color`, `view.background-color` | 8-digit hex (alpha) allowed | **6-digit only** |
| `legend/filter/parameter-ctrl/highlighter` `background-color`, `*line-color` | alpha allowed | 6 or 8 digit |
| `page-ctrl-title` | color, family, size | **color, family only** |
| `view` | background-color | background-color (6-digit only) |

Style elements (20): all, worksheet, worksheet-title, tooltip, dashboard-title (+font-weight normal|bold), story-title, header, legend, legend-title, filter, filter-title, parameter-ctrl, parameter-ctrl-title, highlighter, highlighter-title, page-ctrl-title, view, gridline, zeroline, mark. `font-size` int 1-99. `font-family` 1-50 chars. `line-visibility` on|off, `line-pattern` dotted|dashed|solid.

Only palette field is `mark.mark-color` (single color), hence `.tps` for full palettes.

Fonts: Tableau ships Tableau Book, Light, Regular, Medium, Semibold, Bold, (Black). Treat the list as unverified until hand-tested (see open items).

## Tableau Preferences.tps
Location: `Documents\My Tableau Repository\Preferences.tps`. Restart Tableau after editing.
Structure: `<workbook><preferences><color-palette name=".." type="regular|ordered-sequential|ordered-diverging"><color>#RRGGBB</color>...`
- Sequential: 2+ colors; Tableau interpolates. Diverging: two sequential palettes sharing a center color (fixture uses 3 colors).
- Edit Colors dialog shows max 20 colors. Straight quotes only. Users may already have a `Preferences.tps`: guide must say paste the block, never overwrite.

## Power BI theme JSON (schema 2.157, Aug 2026)
Import: Design ribbon > Import theme (or Customize theme > Theme settings > Import theme). Only `name` is required.
Schema: https://github.com/microsoft/powerbi-desktop-samples/tree/main/Report%20Theme%20JSON%20Schema
- Colors are strings `#RGB`, `#RRGGBB` or `#RRGGBBAA` at top level; inside `visualStyles` they are `{ "solid": { "color": "#RRGGBB" } }`.
- Palette: `dataColors[]`, `good/neutral/bad`, `maximum/center/minimum/null`. Structural: `foreground`, `background`, `tableAccent`, `first..fourthLevelElements`, `secondaryBackground`.
- Fonts: `textClasses.{title,label,callout,header,...}` each `{fontFace, fontSize, fontWeight, color}`. Documented defaults: Segoe UI (label), Segoe UI Semibold (header), DIN (title, callout).
- Page background: `visualStyles.page["*"].background[{color, transparency}]`; canvas (area outside the page): `.outspace[{color, transparency}]`.
- Visual container background: `visualStyles["*"]["*"].background[{show, color, transparency}]`.
- Gridlines: per axis card, `categoryAxis` / `valueAxis`: `gridlineShow`, `gridlineStyle` (solid|dashed|dotted|custom), `gridlineColor`, `gridlineThickness`, `gridlineTransparency`. The wildcard `visualStyles["*"]["*"]` applies to all visuals (documented example sets `categoryAxis.gridlineStyle`).
- Importing a theme removes existing report customizations (document in the guide).
- Competitor note: the schema is the same one PwrTheme targets.

## Competitors found
- pwrtheme.com (Power BI only, no import guide).
- LA Data Viz "Theme Generator for Tableau" (ladataviz.com/tools/custom-theme): exists, features not verified (page didn't render details). Review by hand before positioning.

## Fixtures (`research/handtest/`)
`feathers-playfair.powerbi.json`, `feathers-playfair.tableau.json`, `Preferences.tps`.
Validated 2026-10-01: Power BI file VALID vs schema 2.157; Tableau file VALID vs Tableau schema (832 bytes); .tps well-formed XML.

## Open items (blocking close of feathers-5ct.1)
1. Hand-import each fixture and screenshot results (Power BI Desktop, Tableau Desktop). Confirm gridlines/backgrounds/fonts visibly apply and `.tps` palettes show in Edit Colors.
2. Confirm which fonts are usable: Tableau theme `font-family` values; Power BI default font list (Segoe UI family, DIN, others).
3. Check whether Tableau Cloud/Server/Public honor theme JSON (docs say Desktop 2025.1 only; may be stale).
4. Review LA Data Viz's Tableau theme generator.

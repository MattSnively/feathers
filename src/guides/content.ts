import type { ExportId } from "../export/files";

export interface Guide {
  title: string;
  /** What the user needs installed before starting. */
  requires: string;
  /** "{file}" is replaced with the actual download name, so steps match what's in their Downloads folder. */
  steps: string[];
  /** A concrete, visible way to confirm the import worked. */
  verify: string;
  troubleshooting: { problem: string; fix: string }[];
}

/**
 * Menu paths and limits come from Microsoft's and Tableau's own docs (see research/FINDINGS.md).
 * Keep this tool-accurate: every instruction here is something a first-time user will follow literally.
 */
export const GUIDES: Record<ExportId, Guide> = {
  powerbi: {
    title: "Import into Power BI Desktop",
    requires: "Power BI Desktop with a report open.",
    steps: [
      "Download {file} with the button above. It usually lands in your Downloads folder.",
      "Open your report in Power BI Desktop.",
      "On the Design ribbon, select Import theme. (In older versions it's the View tab, then the Themes dropdown, then Browse for themes.)",
      "Pick {file} and open it. Power BI shows a message when the import succeeds.",
    ],
    verify:
      "Add a column chart with a legend or several measures. The series use your colors in order. You can also open Design > Customize theme > Colors to see your palette.",
    troubleshooting: [
      {
        problem: "Power BI says the theme file isn't valid.",
        fix: "Power BI lists the exact problem. Download a fresh copy from Feathers and import that. If you edited the file by hand, undo your edits.",
      },
      {
        problem: "A chart still has its old colors.",
        fix: "A chart you formatted by hand keeps that formatting. Select it, open the Format pane and choose Reset to default.",
      },
      {
        problem: "I lost formatting I had added to the report.",
        fix: "Importing a theme replaces the theme-level customizations already in the report. Charts you formatted individually keep their changes until you reset them.",
      },
      {
        problem: "Fonts look different on another computer.",
        fix: "A font that isn't installed on the viewer's computer is swapped for a substitute. DIN and Segoe fonts in particular can be missing on non-Windows devices.",
      },
      {
        problem: "My conditional formatting rules disappeared.",
        fix: "Themes can't contain conditional formatting rules. Add those to the individual visuals after importing.",
      },
    ],
  },

  "tableau-theme": {
    title: "Import into Tableau Desktop",
    requires: "Tableau Desktop 2025.1 or later, with a workbook open.",
    steps: [
      "Download {file} with the button above. Save it somewhere with a short path, like your Documents folder, because Tableau rejects file paths over 256 characters.",
      "Open your workbook in Tableau Desktop.",
      "Choose Format > Import Custom Theme…",
      "Pick {file} and click Open.",
      "Choose how to apply it. Override applies the theme over formatting already in the workbook. Preserve keeps the formatting you already did and fills in the rest.",
    ],
    verify:
      "On a chart, the gridlines and zero line take the style you chose, the fonts change, the view background changes, and charts with no color field use your first palette color.",
    troubleshooting: [
      {
        problem: "There's no Import Custom Theme… in the Format menu.",
        fix: "Custom themes arrived in Tableau Desktop 2025.1. Check your version under Help > About Tableau and update if it's older.",
      },
      {
        problem: "Tableau shows an error naming a spot in the file, like font color.",
        fix: "The file is invalid or was changed after download. Download a fresh copy from Feathers. Tableau also rejects files over 15 KB and file names with unusual characters.",
      },
      {
        problem: "Only one color came through.",
        fix: "A Tableau theme file can only hold a single mark color. For your full palette, use the Tableau palettes file too.",
      },
      {
        problem: "Some text didn't change.",
        fix: "Override doesn't touch text you formatted in the rich text editor, such as styled titles. Reformat that text by hand.",
      },
      {
        problem: "A font looks wrong.",
        fix: "Fonts must be installed with Tableau or on your computer. Feathers only offers fonts that ship with Tableau or Windows.",
      },
    ],
  },

  "tableau-tps": {
    title: "Add the palettes to Tableau Desktop",
    requires: "Tableau Desktop (closed while you do steps 2 to 6) and a plain-text editor such as Notepad.",
    steps: [
      "Download {file} with the button above. Don't rename it yet.",
      "Close Tableau Desktop.",
      "Open the My Tableau Repository folder inside your Documents folder.",
      "If the folder has no Preferences.tps, copy {file} into it and rename the copy to Preferences.tps. Then skip to step 8.",
      "If it already has a Preferences.tps, make a backup copy of it first. You'll edit your existing file so your own palettes survive.",
      "Open Preferences.tps in a plain-text editor, not Word. In Feathers, click Copy XML above. Paste the copied palettes between <preferences> and </preferences>. If your file has no <preferences> tags, add them inside <workbook>.",
      "Save the file.",
      "Start Tableau Desktop. It only reads Preferences.tps at startup, so a restart is required.",
      "To use a palette, drag a field onto Color on the Marks card, open the color legend's menu and choose Edit Colors. Pick your palette from the dropdown, click Assign Palette, then OK.",
    ],
    verify:
      "In Edit Colors, scroll to the bottom of the palette dropdown. You should see your theme name for categories, plus the same name with Sequential and Diverging for continuous fields.",
    troubleshooting: [
      {
        problem: "My palettes aren't in the list.",
        fix: "Tableau wasn't fully restarted, the file isn't in My Tableau Repository, or the palettes landed outside the <preferences> tags. Check all three.",
      },
      {
        problem: "Tableau won't start, or it ignores the whole file.",
        fix: "The XML is probably broken by a stray character from editing. Put your backup back and paste again.",
      },
      {
        problem: "I see only some of my colors.",
        fix: "Tableau's Edit Colors dialog shows at most 20 colors of a palette.",
      },
      {
        problem: "It worked once and then my old palettes vanished.",
        fix: "Replacing Preferences.tps overwrites the palettes already in it. Restore your backup and use Copy XML to paste instead.",
      },
      {
        problem: "The pasted text has curly quotes.",
        fix: "Tableau needs straight quotes. Copy from Feathers into a plain-text editor, never through Word or a chat app.",
      },
    ],
  },
};

/** Tells the user which downloads matter for the tool they selected. */
export const WHICH_FILES: Record<"powerbi" | "tableau", string> = {
  powerbi: "For Power BI you need one file: the Power BI theme.",
  tableau:
    "For Tableau you want both files. The theme sets fonts, gridlines and backgrounds; the palettes file adds your full set of colors.",
};

export const fillFile = (text: string, filename: string): string => text.replaceAll("{file}", filename);

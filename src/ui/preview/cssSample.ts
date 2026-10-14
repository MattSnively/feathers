// Fixed sample markup that uses every helper class in the generated stylesheet.
const SAMPLE = `<body class="feathers-canvas" style="margin:0;padding:12px">
<div class="feathers-root" style="padding:12px">
  <h1 style="margin:0 0 4px">Sales overview</h1>
  <p style="margin:0 0 12px">Body text with a <a href="#">link</a> and a <span class="feathers-muted">muted note</span>.</p>
  <div class="feathers-card">
    <h3 class="feathers-card-title">Revenue</h3>
    <div class="feathers-kpi">$4.2M</div>
    <div class="feathers-label">vs last year <span class="feathers-good">+8%</span> <span class="feathers-neutral">0%</span> <span class="feathers-bad">-2%</span></div>
    <table class="feathers-table">
      <tr><th>Region</th><th>Sales</th></tr>
      <tr><td class="feathers-series-1">East</td><td>10</td></tr>
      <tr><td class="feathers-series-2">West</td><td>8</td></tr>
    </table>
  </div>
</div>
</body>`;

/**
 * The generated stylesheet inlined into a sample page, for a sandboxed iframe. An iframe rather than a
 * shadow root because the file's `:root` token block only matches in a real document, so this shows
 * exactly what a page that links the download would get.
 */
export function cssSampleDoc(css: string): string {
  // The theme name reaches the stylesheet's header comment; keep it from closing the <style> element.
  const safe = css.replace(/<\/style/gi, "<\\/style");
  return `<!doctype html><meta charset="utf-8"><style>${safe}</style>${SAMPLE}`;
}

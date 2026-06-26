import esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const widgetDir = import.meta.dirname;
const outdir = path.join(widgetDir, 'dist');

async function build() {
  if (!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true });

  await esbuild.build({
    entryPoints: [
      path.join(widgetDir, 'src/widget.ts'),
      path.join(widgetDir, 'src/widget.css')
    ],
    outdir: outdir,
    bundle: true,
    minify: true,
    format: 'esm'
  });

  const css = fs.readFileSync(path.join(outdir, 'widget.css'), 'utf8');
  const js = fs.readFileSync(path.join(outdir, 'widget.js'), 'utf8');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${css}</style>
</head>
<body>
  <div id="app"></div>
  <script type="module">${js}</script>
</body>
</html>`;

  fs.writeFileSync(path.join(outdir, 'widget.html'), html);
  console.log('Widget built successfully into dist/widget.html.');
}

build().catch(console.error);

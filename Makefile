define DATAURIFY
###########################################
import os, sys, re, base64
mimecss = {'.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf'}
mimejs = {'.jpg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif'}
with open(sys.argv[1], 'r') as f: orig = f.read()
root_dir = os.path.dirname(sys.argv[1])
seen = set()
def dataurifyincss(s):
    o = s.group(0)
    g = s.group(1).strip("'" + '"')
    e = os.path.splitext(g)[-1]
    p = os.path.join(root_dir, g.lstrip('/')) if g.startswith('/') else g
    if g.startswith('data:'):
        return g
    elif e in mimecss:
        t = 'url(data:{mime};base64,{encoded})'.format(mime = mimecss[e], encoded = base64.b64encode(open(p, 'rb').read()).decode())
        seen.add(p)
        return t
    else:
        return o
def dataurifyinjs(s):
    o = s.group(0)
    g = s.group(1).strip("'" + '"')
    e = os.path.splitext(g)[-1]
    p = os.path.join(root_dir, g.lstrip('/')) if g.startswith('/') else g
    if g.startswith('data:'):
        return g
    elif e in mimejs:
        t = '"data:{mime};base64,{encoded}"'.format(mime = mimejs[e], encoded = base64.b64encode(open(p, 'rb').read()).decode())
        seen.add(p)
        return t
    else:
        return o
if sys.argv[-1].endswith('css'):
    res = re.sub('url\((.+?)\)', dataurifyincss, orig)
if sys.argv[-1].endswith('js'):
    res = re.sub('"(/.+?\.(' + '|'.join(ext.lstrip('.') for ext in mimejs) + '))"', dataurifyinjs, orig)
for p in seen: os.remove(p)
with open(sys.argv[1], 'w') as f: f.write(res)
###########################################
endef
export DATAURIFY

.PHONY: assets
assets:
	-rm -rf packages/lexical-playground/build
	cp indexToolbar.tsx packages/lexical-playground/src/plugins/ToolbarPlugin/index.tsx
	cp indexEditorOnly.tsx packages/lexical-playground/src/indexEditorOnly.tsx
	sed -i 's@index.tsx@indexEditorOnly.tsx@' packages/lexical-playground/index.html
	sed -i "s@FigmaEmbedConfig,@@" packages/lexical-playground/src/plugins/AutoEmbedPlugin/index.tsx
	sed -i "s@import moduleResolution from '../shared/viteModuleResolution';@import * as path from 'node:path';@" packages/lexical-playground/vite.prod.config.ts
	sed -i "s@alias: moduleResolution('production')@alias: [ { find: 'shared', replacement: path.resolve('../shared/src') } ]@" packages/lexical-playground/vite.prod.config.ts
	sed -i "s@split: new URL('./split/index.html', import.meta.url).pathname,@},output: { format: 'iife',/*'es',*/ compact: false, manualChunks: false, inlineDynamicImports: true, entryFileNames: '[name].js',   /* currently does not work for the legacy bundle*/ assetFileNames: '[name].[ext]', /* currently does not work for images*/@" packages/lexical-playground/vite.prod.config.ts
	sed -i "s@minify: 'terser'@minify: false@" packages/lexical-playground/vite.prod.config.ts
	#
	npm install --force --prefix packages/lexical-playground @rollup/plugin-babel @babel/plugin-transform-flow-strip-types @babel/preset-react 
	npm run --prefix packages/lexical-playground build-prod
	#python -c "$$DATAURIFY" assets/main.js css
	#python -c "$$DATAURIFY" assets/main.js js

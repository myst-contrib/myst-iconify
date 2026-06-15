// MyST plugin that renders inline Iconify icons.
// https://icon-sets.iconify.design
//
// Pipeline:
//   1. The `{icon}` role emits an `iconifyPlaceholder` node.
//   2. The transform fetches each SVG (disk-cached) and replaces placeholders
//      with rendered icon spans (see `buildIconNode`).
//   3. A pass over `link` nodes vertically centers any icon inside a link, and
//      promotes any link that starts with an icon to a button-styled CTA
//      (icon-only or icon + text). Icons mid-sentence stay as inline decoration.
//
// Two render paths in `buildIconNode`:
//   * Mono icons (SVGs with `fill="currentColor"`) render as a CSS mask on the
//     span, so the icon inherits the parent's text color and follows the theme.
//   * Colored icons (e.g. `logos:python`) render as a regular `<img>` so their
//     baked-in colors survive.
//
// In both paths the span contains an `<img>` (zero-sized for mono). The hidden
// img on the mono path is what lets the myst-theme rule
// `a:has(img) > .link-icon { display:none }` keep suppressing external-link
// arrows on `[{icon}](url)` — the plugin ships no CSS of its own.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const ICONIFY_API = 'https://api.iconify.design';
const DEFAULT_PREFIX = 'mdi';
const CACHE_DIR = '_build/cache/iconify';

// Tailwind utilities applied to icon-led links to make them feel like buttons.
const BUTTON_CLASSES = [
  'inline-flex items-center align-middle leading-none p-1 rounded no-underline',
  'text-stone-800 dark:text-stone-200',
  'hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors',
].join(' ');

// Normalize role input to "prefix:name", defaulting the prefix to mdi.
function normalize(raw) {
  const s = raw.trim();
  return s.includes(':') ? s : `${DEFAULT_PREFIX}:${s}`;
}

// Fetch an icon SVG and cache to _build/cache/iconify/{prefix}/{name}.svg
async function fetchIcon(key) {
  const [prefix, name] = key.split(':');
  const cachePath = join(CACHE_DIR, prefix, `${name}.svg`);
  if (existsSync(cachePath)) return readFileSync(cachePath, 'utf8');
  try {
    const res = await fetch(`${ICONIFY_API}/${prefix}/${name}.svg`);
    if (!res.ok) return null;
    const svg = await res.text();
    mkdirSync(join(CACHE_DIR, prefix), { recursive: true });
    writeFileSync(cachePath, svg);
    return svg;
  } catch {
    return null;
  }
}

const plugin = {
  name: 'Iconify Icons',
  roles: [
    {
      name: 'icon',
      doc: 'Inline icon from Iconify. Usage: {icon}`mdi:home` or {icon color=red}`home`',
      body: { type: String, required: true },
      options: {
        color: { type: String, doc: 'CSS color for the icon (e.g. red, #ff0000).' },
      },
      run(data) {
        return [{ type: 'iconifyPlaceholder', key: normalize(data.body), color: data.options?.color }];
      },
    },
  ],
  transforms: [
    {
      name: 'iconify-resolve',
      stage: 'document',
      plugin: (_, utils) => async (tree) => {
        const placeholders = utils.selectAll('iconifyPlaceholder', tree);
        if (!placeholders.length) return;

        // Fetch each unique icon once (cache hits return immediately).
        const keys = [...new Set(placeholders.map((n) => n.key))];
        const svgs = {};
        await Promise.all(keys.map(async (k) => { svgs[k] = await fetchIcon(k); }));

        for (const node of placeholders) {
          const { key, color } = node;
          const svg = svgs[key];
          Object.keys(node).forEach((k) => delete node[k]);
          if (!svg) {
            console.warn(`⚠️  iconify: could not fetch icon "${key}" - check the name at https://icon-sets.iconify.design`);
            Object.assign(node, { type: 'text', value: `[${key}]` });
            continue;
          }
          const finalSvg = color ? svg.replace(/currentColor/g, color) : svg;
          Object.assign(node, buildIconNode(key, finalSvg));
        }

        // Vertically center icons inside any link; promote links that start
        // with an icon (icon-only or icon + text) to button-styled CTAs.
        for (const link of utils.selectAll('link', tree)) {
          const icons = (link.children || []).flatMap(collectIcons);
          if (!icons.length) continue;
          for (const icon of icons) {
            icon.style = { ...icon.style, verticalAlign: 'middle' };
          }
          const meaningful = (link.children || []).filter(
            (c) => !(c.type === 'text' && !c.value?.trim()),
          );
          if (meaningful[0] === icons[0]) {
            link.class = [link.class, BUTTON_CLASSES].filter(Boolean).join(' ');
            // Scale up the icon only for icon-only buttons; in icon + text
            // buttons the icon should match the text size.
            if (meaningful.length === 1 && icons.length === 1) {
              icons[0].style = { ...icons[0].style, width: '1.5em', height: '1.5em' };
            }
          }
        }
      },
    },
  ],
};

// Walk an AST node and return any iconify-icon spans inside it.
function collectIcons(node) {
  if (!node) return [];
  if (node.type === 'span' && node.class === 'iconify-icon') return [node];
  return (node.children || []).flatMap(collectIcons);
}

function buildIconNode(key, finalSvg) {
  const dataUri = `data:image/svg+xml;base64,${Buffer.from(finalSvg).toString('base64')}`;
  const isMono = finalSvg.includes('currentColor');
  const node = {
    type: 'span',
    class: 'iconify-icon',
    style: {
      display: 'inline-block',
      verticalAlign: '-0.125em',
      width: '1em',
      height: '1em',
    },
    children: [
      {
        type: 'image',
        url: dataUri,
        alt: key,
        width: isMono ? '0' : '100%',
        height: isMono ? '0' : '100%',
        class: 'not-prose',
      },
    ],
  };
  if (isMono) {
    Object.assign(node.style, {
      backgroundColor: 'currentColor',
      maskImage: `url("${dataUri}")`,
      maskSize: 'contain',
      maskRepeat: 'no-repeat',
      WebkitMaskImage: `url("${dataUri}")`,
      WebkitMaskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
    });
  } else {
    // Collapse the phantom line-box that the block <img> would otherwise
    // create inside the span and push following text down a line.
    node.style.lineHeight = '0';
  }
  return node;
}

export default plugin;

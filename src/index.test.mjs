import { describe, it, expect, vi } from 'vitest';
import plugin from './index.mjs';

const role = plugin.roles[0];
const transform = plugin.transforms[0];

// Minimal mock of MyST's utils.selectAll - filters nodes by type from a tree.
function selectAll(type, tree) {
  const results = [];
  (function walk(node) {
    if (node.type === type) results.push(node);
    if (node.children) node.children.forEach(walk);
  })(tree);
  return results;
}
const utils = { selectAll };

// Helper to extract the base64 SVG from the image child's data URI
function decodeSvg(node) {
  const image = node.children.find((c) => c.type === 'image');
  const match = image.url.match(/base64,(.+)$/);
  return Buffer.from(match[1], 'base64').toString();
}

describe('icon role', () => {
  it('parses prefix:name format', () => {
    const [node] = role.run({ body: 'fa6-solid:gear' });
    expect(node.key).toBe('fa6-solid:gear');
  });

  it('defaults to mdi prefix when no colon', () => {
    const [node] = role.run({ body: 'home' });
    expect(node.key).toBe('mdi:home');
  });

  it('trims whitespace', () => {
    const [node] = role.run({ body: '  mdi:home  ' });
    expect(node.key).toBe('mdi:home');
  });

  it('passes color option to placeholder', () => {
    const [node] = role.run({ body: 'mdi:home', options: { color: 'red' } });
    expect(node.color).toBe('red');
  });
});

describe('iconify-resolve transform', () => {
  it('replaces placeholder with span node on success', async () => {
    const tree = {
      type: 'root',
      children: [{ type: 'iconifyPlaceholder', key: 'mdi:home' }],
    };
    await transform.plugin(null, utils)(tree);
    const node = tree.children[0];
    expect(node.type).toBe('span');
    const image = node.children.find((c) => c.type === 'image');
    expect(image.url).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('falls back to text and warns for invalid icon', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const tree = {
      type: 'root',
      children: [{ type: 'iconifyPlaceholder', key: 'mdi:this-icon-does-not-exist-xyz' }],
    };
    await transform.plugin(null, utils)(tree);
    const node = tree.children[0];
    expect(node.type).toBe('text');
    expect(node.value).toBe('[mdi:this-icon-does-not-exist-xyz]');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('could not fetch icon "mdi:this-icon-does-not-exist-xyz"'),
    );
    warn.mockRestore();
  });

  it('applies color to SVG when specified', async () => {
    const tree = {
      type: 'root',
      children: [{ type: 'iconifyPlaceholder', key: 'mdi:home', color: 'red' }],
    };
    await transform.plugin(null, utils)(tree);
    const node = tree.children[0];
    expect(node.type).toBe('span');
    const svg = decodeSvg(node);
    expect(svg).toContain('red');
    expect(svg).not.toContain('currentColor');
  });

  it('skips trees with no placeholders', async () => {
    const tree = {
      type: 'root',
      children: [{ type: 'text', value: 'hello' }],
    };
    await transform.plugin(null, utils)(tree);
    expect(tree.children[0].type).toBe('text');
    expect(tree.children[0].value).toBe('hello');
  });

  it('renders a mono icon as a CSS mask with a zero-sized <img>', async () => {
    const tree = {
      type: 'root',
      children: [{ type: 'iconifyPlaceholder', key: 'mdi:home' }],
    };
    await transform.plugin(null, utils)(tree);
    const node = tree.children[0];
    expect(node.style.maskImage).toMatch(/^url\("data:image\/svg\+xml;base64,/);
    expect(node.style.backgroundColor).toBe('currentColor');
    const image = node.children.find((c) => c.type === 'image');
    expect(image.width).toBe('0');
    expect(image.height).toBe('0');
  });

  it('renders a colored icon as a plain <img> with no mask', async () => {
    const tree = {
      type: 'root',
      children: [{ type: 'iconifyPlaceholder', key: 'logos:python' }],
    };
    await transform.plugin(null, utils)(tree);
    const node = tree.children[0];
    expect(node.style.maskImage).toBeUndefined();
    expect(node.style.backgroundColor).toBeUndefined();
    const image = node.children.find((c) => c.type === 'image');
    expect(image.width).toBe('100%');
    expect(image.height).toBe('100%');
  });

  it('promotes a link wrapping only an icon to button-styled', async () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'link',
          url: 'https://github.com/example',
          children: [{ type: 'iconifyPlaceholder', key: 'mdi:home' }],
        },
      ],
    };
    await transform.plugin(null, utils)(tree);
    const link = tree.children[0];
    expect(link.class).toContain('rounded');
    expect(link.class).toContain('hover:bg-stone-200');
    const icon = link.children[0];
    expect(icon.style.width).toBe('1.5em');
    expect(icon.style.verticalAlign).toBe('middle');
  });

  it('promotes a link that starts with an icon followed by text to button-styled', async () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'link',
          url: 'https://github.com/example',
          children: [
            { type: 'iconifyPlaceholder', key: 'mdi:home' },
            { type: 'text', value: ' Home' },
          ],
        },
      ],
    };
    await transform.plugin(null, utils)(tree);
    const link = tree.children[0];
    expect(link.class).toContain('rounded');
    expect(link.class).toContain('hover:bg-stone-200');
    // Icon should stay text-sized (1em default) when text follows, not the
    // 1.5em scale-up used for icon-only buttons.
    const icon = link.children[0];
    expect(icon.style.width).toBe('1em');
    expect(icon.style.verticalAlign).toBe('middle');
  });

  it('leaves links with an icon mid-sentence unstyled', async () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'link',
          url: 'https://github.com/example',
          children: [
            { type: 'text', value: 'Read the ' },
            { type: 'iconifyPlaceholder', key: 'mdi:book' },
            { type: 'text', value: ' docs' },
          ],
        },
      ],
    };
    await transform.plugin(null, utils)(tree);
    const link = tree.children[0];
    expect(link.class).toBeUndefined();
  });
});

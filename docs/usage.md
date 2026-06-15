# Use as an author

Use the `{icon}` role with any icon identifier in `prefix:name` format.
Browse available icons at [icon-sets.iconify.design](https://icon-sets.iconify.design).

## Basic usage

The behavior of an icon depends on where it sits relative to a link.

:::::{myst:demo}
Links that **start with an icon** are styled as buttons (icon-only or icon + text):

- [{icon}`home`](https://mystmd.org)
- [{icon}`download` Download](https://mystmd.org)

Icons in plain text, or mid-sentence inside a link, render in-line:

- {icon}`home` Home
- [Read the {icon}`book` docs](https://mystmd.org)

:::::

See the other icons on this page for more examples.

## Prefix chooses an icon library

The prefix before `:` selects icons from a specific library.
The default library is `mdi` if none is given.
Here we'll make the library explicit.

:::::{myst:demo}
- {icon}`mdi:home`
- {icon}`lucide:home`
:::::

Icons without a prefix default to [Material Design Icons](https://icon-sets.iconify.design/mdi/) (`mdi`):

:::::{myst:demo}
- {icon}`home` Home
- {icon}`star` Star
- {icon}`cog` Settings
- {icon}`magnify` Search
:::::

## Brand logos

Use the [`simple-icons`](https://icon-sets.iconify.design/simple-icons/) or [`logos`](https://icon-sets.iconify.design/logos/) prefix for logos:

:::::{myst:demo}
**Simple Icons** (`simple-icons`) - monochrome brand icons:
{icon}`simple-icons:python` {icon}`simple-icons:jupyter` {icon}`simple-icons:github` {icon}`simple-icons:numpy`

**Logos** (`logos`) - full-color brand logos:
{icon}`logos:python` {icon}`logos:jupyter` {icon}`logos:react` {icon}`logos:github-icon`
:::::

## Other popular icon sets

:::::{myst:demo}
**Font Awesome** (`fa6-solid`):
{icon}`fa6-solid:star` {icon}`fa6-solid:heart` {icon}`fa6-solid:bell` {icon}`fa6-solid:gear`

**Lucide** (`lucide`):
{icon}`lucide:rocket` {icon}`lucide:zap` {icon}`lucide:globe` {icon}`lucide:terminal`
:::::

## Custom colors

Use the `color` option to override the icon color. Accepts any CSS color value:

:::::{myst:demo}
{icon color=green}`mdi:check-circle` Passed
{icon color=red}`mdi:close-circle` Failed
{icon color="#ff9800"}`mdi:alert` Warning
{icon color=dodgerblue}`mdi:information` Info
:::::

:::{note}
Color only affects mono-color icons (those using `currentColor`). Multi-color icons like `logos:python` have their colors baked in and won't change.
:::

## Add icon links to site parts (e.g. navbar or footer)

MyST supports [site parts](https://mystmd.org/guide/document-parts) for adding content to theme UI elements like the navigation bar.
You can use `{icon}` roles in parts just like any other MyST content.

For example, this documentation site adds GitHub and MyST Community Contributions icon links to the navbar with:

**`myst.yml`:**

```yaml
site:
  parts:
    navbar_end: parts/navbar_end.md
```

**`parts/navbar_end.md`:**

```markdown
[{icon}`simple-icons:github`](https://github.com/choldgraf/myst-iconify)
[{icon}`mdi:book-open-variant`](https://contrib.mystmd.org)
```

Look at the top-right of this page to see the result.

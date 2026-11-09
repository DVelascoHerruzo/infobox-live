# Infobox Live

Infobox callouts, like the ones in [ITS Theme](https://github.com/SlRvb/Obsidian--ITS-Theme), sit neatly beside your text in Reading mode. In Live Preview, the mode most notes are written in, they stretch across the whole page.

**Infobox Live keeps them at the side while you write.** It also lets you insert an infobox from the right-click menu, as you would a table or callout, and gives every infobox its own right-click menu.

## Features

### Infoboxes float in Live Preview
Infoboxes stay to the right (or left) of your text while you edit, at the same size as in Reading mode. Size and position keywords work as usual:

```
> [!infobox|left wsmall]
```

The plugin adds one keyword, **`third`**, which makes an infobox one third of the page wide.

Tips:
- An infobox floats next to the text that comes *after* it, so put it above the paragraphs it belongs to. The top of the note usually works best.
- To make an infobox full width again, use the `wfull` keyword.
- On phones, infoboxes stay full width unless they have the `mobile` keyword, the same rule ITS Theme uses.

### Insert → Infobox
Right-click in a note and choose **Insert → Infobox**. The command palette has **Insert infobox** too, which you can also bind to a hotkey or use as a `/` slash command. This adds:

```
> [!infobox|right third]
> # Title
> ![[image.png]]
> | | |
> | --- | --- |
> | Field | Value |
> | Field | Value |
```

"Title" is selected, ready for you to type over.

### Right-click an infobox
| Option | What it does |
| --- | --- |
| Edit infobox source | Puts the cursor in the infobox so you can edit its Markdown |
| Position | Right / Left |
| Width | Third, Small (30%), Medium (50%), Large (65%), Default |
| Delete infobox | Removes the whole infobox (Ctrl/Cmd+Z brings it back) |

The menu works in both Live Preview and Reading mode.

## Installation

### From Community plugins
1. In Obsidian, open **Settings → Community plugins** and make sure Restricted mode is off.
2. Select **Browse**, search for **Infobox Live**, then select **Install** and **Enable**.

### With BRAT, for beta versions or before the plugin is listed
1. Install and enable the **BRAT** plugin from Community plugins.
2. Run the command **BRAT: Add a beta plugin for testing** and paste:
   `https://github.com/DVelascoHerruzo/obsidian-infobox-live`
3. Enable **Infobox Live** in **Settings → Community plugins**.

### Manually
1. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/DVelascoHerruzo/obsidian-infobox-live/releases/latest).
2. Put them in `<your vault>/.obsidian/plugins/infobox-live/`. Create the folder if it doesn't exist. The `.obsidian` folder is hidden, so turn on "show hidden files" if you can't see it.
3. Restart Obsidian, or reload plugins, then enable **Infobox Live** in **Settings → Community plugins**.

## Compatibility
- Made for **ITS Theme** infoboxes. In other themes, `[!infobox]` callouts still float, but they look like ordinary callouts.
- Pairs with **[Infobox Scroll](https://github.com/DVelascoHerruzo/obsidian-infobox-scroll)**, which adds infoboxes and images you can flip through with arrows. With both installed, scrollable infoboxes float in Live Preview too.
- Desktop and mobile. Requires Obsidian 1.5.7 or newer.

## Development
```
npm install
npm run dev     # rebuild on change
npm run build   # type-check + production build
```
The build copies the plugin into a test vault's `.obsidian/plugins/infobox-live/` folder. Set `OBSIDIAN_VAULT` to choose the vault.

To release a new version:
1. Bump `version` in `manifest.json` and `package.json`, and add the new version to `versions.json`.
2. Build, commit and push.
3. Run `gh release create <version> main.js manifest.json styles.css`. The tag has no `v` prefix.

## License
[MIT](LICENSE)

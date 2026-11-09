import { MarkdownPostProcessorContext, MarkdownView, Menu, MenuItem, Notice, Plugin, TFile } from "obsidian";
import { EditorView } from "@codemirror/view";

const INFOBOX_SELECTOR = '.callout[data-callout~="infobox"]';
/** `> [!infobox|meta words]+ rest` */
const HEADER = /^(\s*>\s*\[!)(infobox)(?:\|([^\]]*))?(\][+-]?.*)$/i;

const SIDES = ["left", "right", "p+l", "p+r"];
/** ITS-theme width keywords (plus our own `third`). Only one should be present at a time. */
const WIDTHS = [
	"third", "wmicro", "wtiny", "wsmall", "ws-med", "wm-sm", "wmed", "wm-tl", "wtl-med", "wtall", "wfull",
	"wtiny-c", "wsmall-c", "ws-med-c", "wm-sm-c", "wmed-c", "wm-tl-c", "wtl-med-c", "wtall-c",
];
const WIDTH_CHOICES: [string, string | null][] = [
	["Third (33%)", "third"],
	["Small (30%)", "wsmall"],
	["Medium (50%)", "wmed"],
	["Large (65%)", "wm-tl"],
	["Default (300px)", null],
];

type Action = { kind: "delete" } | { kind: "meta"; edit: (tokens: string[]) => string[] };
type Change = { from: number; to: number; insert: string };

type Location =
	| { kind: "editor"; view: EditorView; line: number }
	| { kind: "file"; file: TFile; line: number; callout: HTMLElement };

const isQuote = (line: string) => /^\s*>/.test(line);

/** Rendered sections (Reading mode, embeds) -> their post-processor context, for line lookup. */
const sectionLookup = new WeakMap<HTMLElement, MarkdownPostProcessorContext>();

export function registerContextMenu(plugin: Plugin) {
	plugin.registerMarkdownPostProcessor((el, ctx) => {
		sectionLookup.set(el, ctx);
	});

	const onContextMenu = (evt: MouseEvent) => {
		// Obsidian's instanceOf (not instanceof) so this also works in popout windows.
		const target = evt.target as Node | null;
		if (!target?.instanceOf?.(HTMLElement)) return;
		let callout = target.closest<HTMLElement>(INFOBOX_SELECTOR);
		if (!callout) return;
		// Use the outermost infobox (ITS lets infoboxes be nested as sections).
		for (let p = callout.parentElement?.closest<HTMLElement>(INFOBOX_SELECTOR); p; p = p.parentElement?.closest<HTMLElement>(INFOBOX_SELECTOR)) {
			callout = p;
		}
		const loc = locate(plugin, callout);
		if (!loc) return; // Not something we can edit: leave Obsidian's own menu alone.
		evt.preventDefault();
		evt.stopPropagation();
			showMenu(plugin, loc, callout, evt);
	};

	// Main window, plus any popout windows opened later.
	const attach = (doc: Document) => plugin.registerDomEvent(doc, "contextmenu", onContextMenu, { capture: true });
	attach(document);
	plugin.registerEvent(plugin.app.workspace.on("window-open", (win) => attach(win.doc)));
}

function locate(plugin: Plugin, callout: HTMLElement): Location | null {
	// Live Preview: the callout is the direct child of a CodeMirror block widget.
	const widget = callout.parentElement;
	if (widget?.matches(".cm-embed-block.cm-callout")) {
		const editorEl = widget.closest<HTMLElement>(".cm-editor");
		const view = editorEl ? EditorView.findFromDOM(editorEl) : null;
		if (view) {
			let pos: number;
			try {
				pos = view.posAtDOM(widget);
			} catch {
				return null;
			}
			const doc = view.state.doc;
			const line = doc.lineAt(Math.min(pos, doc.length)).number - 1; // 0-based
			const lines = doc.toString().split("\n");
			for (const l of [line, line + 1, line - 1]) {
				if (l >= 0 && l < lines.length && findBlock(lines, l)) return { kind: "editor", view, line: l };
			}
			return null;
		}
	}

	// Reading mode (or an embed): use the section info recorded by the post-processor.
	for (let el: HTMLElement | null = callout; el; el = el.parentElement) {
		const ctx = sectionLookup.get(el);
		if (!ctx) continue;
		const info = ctx.getSectionInfo(el);
		const file = plugin.app.vault.getFileByPath(ctx.sourcePath);
		if (!info || !file) return null;
		const lines = info.text.split("\n");
		// The section should start at the infobox header; check the first few lines to be safe.
		for (let l = info.lineStart; l <= Math.min(info.lineEnd, info.lineStart + 2); l++) {
			if (findBlock(lines, l)) return { kind: "file", file, line: l, callout };
		}
		return null;
	}
	return null;
}

/** Finds the quote block containing `line` and checks that it is an infobox. 0-based, inclusive. */
function findBlock(lines: string[], line: number): { start: number; end: number } | null {
	if (!isQuote(lines[line] ?? "")) return null;
	let start = line;
	while (start > 0 && isQuote(lines[start - 1])) start--;
	if (!HEADER.test(lines[start])) return null;
	let end = line;
	while (end < lines.length - 1 && isQuote(lines[end + 1])) end++;
	return { start, end };
}

function headerTokens(header: string): string[] {
	const m = HEADER.exec(header);
	return m?.[3] ? m[3].trim().split(/\s+/).filter(Boolean) : [];
}

export function computeChange(text: string, line: number, action: Action): Change | null {
	const lines = text.split("\n");
	const block = findBlock(lines, line);
	if (!block) return null;
	const { start, end } = block;

	const starts: number[] = [];
	let off = 0;
	for (const l of lines) {
		starts.push(off);
		off += l.length + 1;
	}
	const lineStart = (i: number) => (i < lines.length ? starts[i] : text.length);

	if (action.kind === "delete") {
		let from = lineStart(start);
		let to = lineStart(end + 1);
		if (end + 1 < lines.length && lines[end + 1].trim() === "") {
			to = lineStart(end + 2); // also remove the blank line that separated it from the text
		} else if (to === text.length && start > 0) {
			from -= 1; // last block in the note: remove the newline before it
		}
		return { from, to, insert: "" };
	}

	const m = HEADER.exec(lines[start]);
	if (!m) return null;
	const tokens = action.edit(headerTokens(lines[start]));
	const header = m[1] + m[2] + (tokens.length ? "|" + tokens.join(" ") : "") + m[4];
	return { from: lineStart(start), to: lineStart(start) + lines[start].length, insert: header };
}

async function apply(plugin: Plugin, loc: Location, action: Action) {
	if (loc.kind === "editor") {
		const change = computeChange(loc.view.state.doc.toString(), loc.line, action);
		if (!change) return void new Notice("Couldn't find this infobox in the note.");
		loc.view.dispatch({ changes: change, userEvent: action.kind === "delete" ? "delete" : "input" });
		return;
	}
	let ok = false;
	await plugin.app.vault.process(loc.file, (data) => {
		const change = computeChange(data, loc.line, action);
		if (!change) return data;
		ok = true;
		return data.slice(0, change.from) + change.insert + data.slice(change.to);
	});
	if (!ok) new Notice("Couldn't find this infobox in the note.");
}

function currentTokens(loc: Location): string[] {
	if (loc.kind === "editor") {
		const lines = loc.view.state.doc.toString().split("\n");
		const block = findBlock(lines, loc.line);
		return block ? headerTokens(lines[block.start]) : [];
	}
	// Reading mode: the rendered element carries the metadata.
	return (loc.callout.getAttribute("data-callout-metadata") ?? "").split(/\s+/).filter(Boolean);
}

async function editSource(plugin: Plugin, loc: Location, callout: HTMLElement) {
	if (loc.kind === "editor") {
		const doc = loc.view.state.doc;
		const lines = doc.toString().split("\n");
		const block = findBlock(lines, loc.line);
		const target = doc.line((block?.start ?? loc.line) + 1);
		loc.view.dispatch({ selection: { anchor: target.to }, scrollIntoView: true });
		loc.view.focus();
		return;
	}
	const leaf = plugin.app.workspace
		.getLeavesOfType("markdown")
		.find((l) => l.view instanceof MarkdownView && l.view.containerEl.contains(callout));
	const view = leaf?.view instanceof MarkdownView ? leaf.view : null;
	if (!view || view.file?.path !== loc.file.path) {
		await plugin.app.workspace.getLeaf(false).openFile(loc.file, { state: { mode: "source" } });
	} else {
		await view.setState({ ...view.getState(), mode: "source" }, { history: false });
	}
	const md = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (md) {
		md.editor.setCursor({ line: loc.line, ch: md.editor.getLine(loc.line).length });
		md.editor.scrollIntoView({ from: { line: loc.line, ch: 0 }, to: { line: loc.line, ch: 0 } }, true);
		md.editor.focus();
	}
}

/** Uses the (runtime-only) submenu API when present, otherwise falls back to a flat section. */
function group(menu: Menu, title: string, icon: string, build: (sub: Menu, flat: boolean) => void) {
	const holder: { sub: Menu | null } = { sub: null };
	menu.addItem((item) => {
		item.setTitle(title).setIcon(icon);
		const setSubmenu = (item as MenuItem & { setSubmenu?: () => Menu }).setSubmenu;
		holder.sub = setSubmenu ? setSubmenu.call(item) : null;
	});
	if (holder.sub) build(holder.sub, false);
	else build(menu, true);
}

function showMenu(plugin: Plugin, loc: Location, callout: HTMLElement, evt: MouseEvent) {
	const tokens = currentTokens(loc);
	const side = tokens.some((t) => t === "left" || t === "p+l") ? "left" : "right";
	const width = tokens.find((t) => WIDTHS.includes(t)) ?? null;
	const menu = new Menu();

	menu.addItem((item) =>
		item.setTitle("Edit infobox source").setIcon("lucide-pencil").onClick(() => editSource(plugin, loc, callout))
	);

	group(menu, "Position", "lucide-move-horizontal", (sub, flat) => {
		for (const [label, value] of [["Right", "right"], ["Left", "left"]] as const) {
			sub.addItem((item) =>
				item
					.setTitle(flat ? `Position: ${label}` : label)
					.setChecked(side === value)
					.onClick(() =>
						apply(plugin, loc, {
							kind: "meta",
							edit: (t) => [...t.filter((x) => !SIDES.includes(x)), value],
						})
					)
			);
		}
	});

	group(menu, "Width", "lucide-ruler", (sub, flat) => {
		for (const [label, value] of WIDTH_CHOICES) {
			sub.addItem((item) =>
				item
					.setTitle(flat ? `Width: ${label}` : label)
					.setChecked(width === value)
					.onClick(() =>
						apply(plugin, loc, {
							kind: "meta",
							edit: (t) => [...t.filter((x) => !WIDTHS.includes(x)), ...(value ? [value] : [])],
						})
					)
			);
		}
	});

	menu.addSeparator();
	menu.addItem((item) =>
		item
			.setTitle("Delete infobox")
			.setIcon("lucide-trash-2")
			.setWarning(true)
			.onClick(() => apply(plugin, loc, { kind: "delete" }))
	);

	menu.showAtMouseEvent(evt);
}

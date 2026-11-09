import { Plugin } from "obsidian";
import { registerInsert } from "./insert";
import { registerContextMenu } from "./contextMenu";

/**
 * Infobox Live
 *  - styles.css makes ITS-theme infoboxes float in Live Preview like they do in Reading mode
 *  - "Infobox" in the editor's right-click > Insert menu (+ an "Insert infobox" command)
 *  - right-click on an infobox: edit source, position, width, delete
 */
export default class InfoboxLivePlugin extends Plugin {
	async onload() {
		registerInsert(this);
		registerContextMenu(this);
	}
}

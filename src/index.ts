import joplin from 'api';
import { MenuItemLocation, ToastType, ToolbarButtonLocation } from 'api/types';
import { registerSettings, getSettings } from './settings';
import { loadPlaces, savePlaces, resolveNoteId } from './placesStore';
import { matchPlace, Place } from './geo';
import { parseNote, formatLine, LogEntry } from './parse';
import { showLogDialog, showPlacesDialog, showMapDialog } from './dialogs';

async function toast(message: string, type: ToastType = ToastType.Info) {
	try {
		await joplin.views.dialogs.showToast({ message, type, duration: 4000 });
	} catch (e) {
		console.info('Placelog:', message);
	}
}

async function platform(): Promise<string> {
	try {
		const v = await joplin.versionInfo();
		return v.platform || 'desktop';
	} catch (e) {
		return 'desktop';
	}
}

// ---------------------------------------------------------------- Insert text

async function insertIntoNote(noteId: string, text: string, atCursor: boolean): Promise<void> {
	if (atCursor) {
		try {
			await joplin.commands.execute('insertText', text);
			return;
		} catch (e) {
			console.warn('Placelog: insertText failed, appending to note body instead', e);
		}
	}
	const note = await joplin.data.get(['notes', noteId], { fields: ['body'] });
	const body: string = note.body || '';
	const sep = body.length === 0 || body.endsWith('\n') ? '' : '\n';
	await joplin.data.put(['notes', noteId], null, { body: `${body}${sep}${text}\n` });
}

// ---------------------------------------------------------------- Commands

async function logPlace(): Promise<void> {
	const note = await joplin.workspace.selectedNote();
	if (!note) {
		await toast('Open a note first.', ToastType.Error);
		return;
	}
	const settings = await getSettings();
	const store = await loadPlaces();
	const form = await showLogDialog(store.places, settings.defaultRadius, await platform());
	if (!form) return;

	const lat = parseFloat(form.lat);
	const lon = parseFloat(form.lon);
	const pos = isFinite(lat) && isFinite(lon) ? { lat, lon } : null;

	let placeName: string | null = null;
	let geoComment: { lat: number; lon: number } | undefined;

	const newName = (form.newName || '').trim();
	if (newName) {
		if (!pos) {
			await toast('No position available, so the new place could not be saved.', ToastType.Error);
			return;
		}
		const radius = parseInt(form.newRadius, 10);
		const place: Place = { name: newName, lat, lon, radius: isFinite(radius) && radius > 0 ? radius : settings.defaultRadius };
		const places = store.places.filter(p => p.name.toLowerCase() !== newName.toLowerCase());
		places.push(place);
		await savePlaces(places);
		placeName = newName;
	} else if (form.choice === '__none__') {
		if (!pos) {
			await toast('No position and no place chosen.', ToastType.Error);
			return;
		}
		placeName = 'Unknown place';
		geoComment = pos;
	} else if (form.choice === '__auto__') {
		if (!pos) {
			await toast('No position available. Pick a place from the list.', ToastType.Error);
			return;
		}
		const m = matchPlace(pos, store.places);
		if (m) {
			placeName = m.place.name;
		} else {
			placeName = 'Unknown place';
			geoComment = pos;
		}
	} else {
		const idx = parseInt(form.choice, 10);
		const p = store.places[idx];
		if (!p) {
			await toast('Invalid place choice.', ToastType.Error);
			return;
		}
		placeName = p.name;
	}

	const line = formatLine(settings.template, placeName, new Date(), geoComment);
	await insertIntoNote(note.id, line, settings.insertAtCursor);
	await toast(`Logged: ${placeName}`, ToastType.Success);
}

async function managePlaces(): Promise<void> {
	const settings = await getSettings();
	const store = await loadPlaces();
	const updated = await showPlacesDialog(store.places, settings.defaultRadius);
	if (!updated) return;
	await savePlaces(updated);
	await toast(`Saved ${updated.length} place${updated.length === 1 ? '' : 's'}.`, ToastType.Success);
}

async function openPlacesNote(): Promise<void> {
	const id = await resolveNoteId(true);
	if (id) await joplin.commands.execute('openNote', id);
}

interface NoteRow { id: string; title: string; body: string }

async function fetchNotes(ids: string[]): Promise<NoteRow[]> {
	const out: NoteRow[] = [];
	for (const id of ids) {
		try {
			out.push(await joplin.data.get(['notes', id], { fields: ['id', 'title', 'body'] }));
		} catch (e) {
			console.warn('Placelog: could not load note', id, e);
		}
	}
	return out;
}

async function fetchFolderNotes(folderId: string): Promise<NoteRow[]> {
	const out: NoteRow[] = [];
	let page = 1;
	for (;;) {
		const r = await joplin.data.get(['folders', folderId, 'notes'], {
			fields: ['id', 'title', 'body'], page, limit: 100, order_by: 'title', order_dir: 'ASC',
		});
		out.push(...r.items);
		if (!r.has_more) break;
		page++;
	}
	return out;
}

async function showMap(notes: NoteRow[], title: string): Promise<void> {
	const settings = await getSettings();
	const store = await loadPlaces();
	const entries: LogEntry[] = [];
	for (const n of notes) {
		entries.push(...parseNote(n.id, n.title, n.body, settings.marker, store.places));
	}
	if (!entries.length) {
		await toast(`No logged places found. The map looks for lines containing "${settings.marker}".`, ToastType.Info);
		return;
	}
	const openId = await showMapDialog(entries, store.places, title);
	if (openId) await joplin.commands.execute('openNote', openId);
}

async function mapSelectedNotes(): Promise<void> {
	const ids = await joplin.workspace.selectedNoteIds();
	if (!ids.length) {
		await toast('Select one or more notes first.', ToastType.Error);
		return;
	}
	const notes = await fetchNotes(ids);
	const title = notes.length === 1 ? `Map: ${notes[0].title}` : `Map: ${notes.length} notes`;
	await showMap(notes, title);
}

async function mapNotebook(): Promise<void> {
	const folder = await joplin.workspace.selectedFolder();
	if (!folder) {
		await toast('Select a notebook first.', ToastType.Error);
		return;
	}
	const notes = await fetchFolderNotes(folder.id);
	await showMap(notes, `Map: ${folder.title}`);
}

// ---------------------------------------------------------------- Registration

joplin.plugins.register({
	onStart: async function() {
		await registerSettings();

		await joplin.commands.register({
			name: 'placelogLogPlace',
			label: 'Placelog: Log time and place',
			iconName: 'fas fa-map-marker-alt',
			execute: logPlace,
		});
		await joplin.commands.register({
			name: 'placelogManagePlaces',
			label: 'Placelog: Manage places',
			iconName: 'fas fa-list',
			execute: managePlaces,
		});
		await joplin.commands.register({
			name: 'placelogOpenPlacesNote',
			label: 'Placelog: Open the places note',
			execute: openPlacesNote,
		});
		await joplin.commands.register({
			name: 'placelogMapSelected',
			label: 'Placelog: Map of selected note(s)',
			iconName: 'fas fa-map',
			execute: mapSelectedNotes,
		});
		await joplin.commands.register({
			name: 'placelogMapNotebook',
			label: 'Placelog: Map of current notebook',
			iconName: 'fas fa-map',
			execute: mapNotebook,
		});

		// UI locations differ between desktop and mobile, so each registration is independent.
		const safe = async (what: string, fn: () => Promise<unknown>) => {
			try { await fn(); } catch (e) { console.warn(`Placelog: could not register ${what}`, e); }
		};
		await safe('editor toolbar button', () => joplin.views.toolbarButtons.create('placelogLogPlaceButton', 'placelogLogPlace', ToolbarButtonLocation.EditorToolbar));
		await safe('note toolbar button', () => joplin.views.toolbarButtons.create('placelogMapButton', 'placelogMapSelected', ToolbarButtonLocation.NoteToolbar));
		await safe('Tools menu', () => joplin.views.menus.create('placelogMenu', 'Placelog', [
			{ commandName: 'placelogLogPlace', accelerator: 'CmdOrCtrl+Shift+L' },
			{ commandName: 'placelogMapSelected' },
			{ commandName: 'placelogMapNotebook' },
			{ commandName: 'placelogManagePlaces' },
			{ commandName: 'placelogOpenPlacesNote' },
		], MenuItemLocation.Tools));
	},
});

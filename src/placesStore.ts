import joplin from 'api';
import { Place } from './geo';
import { KEYS } from './settings';

export const PLACES_NOTE_TITLE = 'Placelog places';

const HEADER = [
	'Known places for the Placelog plugin.',
	'',
	'Use the "Placelog: Manage places" command to edit this list, or edit the JSON below by hand.',
	'Each place has a name, a latitude, a longitude and a radius in metres.',
	'',
].join('\n');

const JSON_BLOCK = /```json\s*([\s\S]*?)```/;

export interface PlacesStore {
	noteId: string;
	places: Place[];
}

async function noteExists(id: string): Promise<boolean> {
	if (!id) return false;
	try {
		await joplin.data.get(['notes', id], { fields: ['id'] });
		return true;
	} catch (e) {
		return false;
	}
}

async function findNoteByTitle(): Promise<string | null> {
	let page = 1;
	for (;;) {
		const r = await joplin.data.get(['search'], {
			query: `title:"${PLACES_NOTE_TITLE}"`,
			type: 'note',
			fields: ['id', 'title'],
			page,
		});
		for (const n of r.items) {
			if (n.title === PLACES_NOTE_TITLE) return n.id;
		}
		if (!r.has_more) return null;
		page++;
	}
}

async function createNote(): Promise<string> {
	const folder = await joplin.workspace.selectedFolder();
	const body = `${HEADER}\n\`\`\`json\n[]\n\`\`\`\n`;
	const note = await joplin.data.post(['notes'], null, {
		title: PLACES_NOTE_TITLE,
		body,
		parent_id: folder ? folder.id : undefined,
	});
	return note.id;
}

/** Find or create the note that stores known places, and remember its ID. */
export async function resolveNoteId(create: boolean): Promise<string | null> {
	let id: string = await joplin.settings.value(KEYS.placesNoteId);
	if (await noteExists(id)) return id;

	id = await findNoteByTitle();
	if (!id && create) id = await createNote();
	if (!id) return null;

	await joplin.settings.setValue(KEYS.placesNoteId, id);
	return id;
}

function parsePlaces(body: string): Place[] {
	const m = body.match(JSON_BLOCK);
	if (!m) return [];
	try {
		const raw = JSON.parse(m[1]);
		if (!Array.isArray(raw)) return [];
		return raw
			.filter(p => p && typeof p.name === 'string' && isFinite(p.lat) && isFinite(p.lon))
			.map(p => ({
				name: String(p.name),
				lat: Number(p.lat),
				lon: Number(p.lon),
				radius: isFinite(p.radius) ? Number(p.radius) : 100,
			}));
	} catch (e) {
		console.warn('Placelog: could not parse places JSON', e);
		return [];
	}
}

export async function loadPlaces(): Promise<PlacesStore> {
	const noteId = await resolveNoteId(false);
	if (!noteId) return { noteId: '', places: [] };
	const note = await joplin.data.get(['notes', noteId], { fields: ['body'] });
	return { noteId, places: parsePlaces(note.body) };
}

export async function savePlaces(places: Place[]): Promise<void> {
	const noteId = await resolveNoteId(true);
	const note = await joplin.data.get(['notes', noteId], { fields: ['body'] });
	const json = JSON.stringify(places, null, 2);
	let body: string = note.body;
	if (JSON_BLOCK.test(body)) {
		body = body.replace(JSON_BLOCK, '```json\n' + json + '\n```');
	} else {
		body = `${body.trimEnd()}\n\n\`\`\`json\n${json}\n\`\`\`\n`;
	}
	await joplin.data.put(['notes', noteId], null, { body });
}

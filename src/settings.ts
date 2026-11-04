import joplin from 'api';
import { SettingItemType } from 'api/types';

export const SECTION = 'placelog';

export const KEYS = {
	template: 'template',
	marker: 'marker',
	defaultRadius: 'defaultRadius',
	insertAtCursor: 'insertAtCursor',
	placesNoteId: 'placesNoteId',
};

export interface Settings {
	template: string;
	marker: string;
	defaultRadius: number;
	insertAtCursor: boolean;
	placesNoteId: string;
}

export async function registerSettings(): Promise<void> {
	await joplin.settings.registerSection(SECTION, {
		label: 'Placelog',
		iconName: 'fas fa-map-marker-alt',
		description: 'Log the time and your current place in a note, and show notes on a map.',
	});

	await joplin.settings.registerSettings({
		[KEYS.template]: {
			value: '- {time} 📍 {place}',
			type: SettingItemType.String,
			section: SECTION,
			public: true,
			label: 'Log line template',
			description: 'Placeholders: {time} (HH:MM), {date} (YYYY-MM-DD), {datetime}, {place}. The line must contain the marker so the map can find it.',
		},
		[KEYS.marker]: {
			value: '📍',
			type: SettingItemType.String,
			section: SECTION,
			public: true,
			label: 'Place marker',
			description: 'Text that precedes the place name in a logged line. The map looks for this marker when it reads notes.',
		},
		[KEYS.defaultRadius]: {
			value: 100,
			type: SettingItemType.Int,
			section: SECTION,
			public: true,
			minimum: 10,
			maximum: 5000,
			step: 10,
			label: 'Default radius for new places (metres)',
			description: 'A position within this distance of a known place is reported as that place.',
		},
		[KEYS.insertAtCursor]: {
			value: true,
			type: SettingItemType.Bool,
			section: SECTION,
			public: true,
			label: 'Insert at cursor',
			description: 'If off, the log line is appended to the end of the note instead.',
		},
		[KEYS.placesNoteId]: {
			value: '',
			type: SettingItemType.String,
			section: SECTION,
			public: false,
			label: 'ID of the note that stores known places',
		},
	});
}

export async function getSettings(): Promise<Settings> {
	const v = await joplin.settings.values(Object.values(KEYS));
	return {
		template: v[KEYS.template],
		marker: v[KEYS.marker],
		defaultRadius: v[KEYS.defaultRadius],
		insertAtCursor: v[KEYS.insertAtCursor],
		placesNoteId: v[KEYS.placesNoteId],
	};
}

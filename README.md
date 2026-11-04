# Placelog — a Joplin plugin

Log the time and your current place into a diary note with one tap, keep a list of
known places, and show the places mentioned in one or more notes on a map.

## What it does

- **Log time and place.** A toolbar button opens a dialog that reads your position,
  matches it against your known places, and inserts a line such as
  `- 14:32 📍 The Library` at the cursor.
- **Known places.** Each place has a name, coordinates and a radius. If you are
  somewhere new, type a name in the log dialog and it is saved for next time. The
  list lives in a normal Joplin note titled "Placelog places", so it syncs between
  your devices.
- **Map.** Show every logged place in the selected note(s) or in the current
  notebook on an OpenStreetMap map. Entries from one note are joined into a path.
  Click a marker, then "Open note" to jump to it.

Coordinates stay in the places note. A logged line contains only the place name.
The one exception is a place you choose not to name: its coordinates are kept in
an HTML comment on the line, which Joplin hides when it renders the note.

## Commands

| Command | Where |
| --- | --- |
| Placelog: Log time and place | Editor toolbar button, Tools menu, Cmd/Ctrl+Shift+L |
| Placelog: Map of selected note(s) | Note toolbar button, Tools menu |
| Placelog: Map of current notebook | Tools menu |
| Placelog: Manage places | Tools menu |
| Placelog: Open the places note | Tools menu |

## Settings

Tools › Options › Placelog:

- **Log line template.** Default `- {time} 📍 {place}`. Placeholders: `{time}`,
  `{date}`, `{datetime}`, `{place}`.
- **Place marker.** The text the map looks for in notes. Default `📍`.
- **Default radius.** How close you must be to a place for it to match, in metres.
- **Insert at cursor.** Off appends the line to the end of the note instead.

## Where the position comes from

The plugin reads the position with the browser geolocation API from inside its
dialog. On a phone this is GPS. On the desktop Joplin build, geolocation is not
available to plugins, so the dialog asks you to pick a place from the list instead.

## Build

```
npm install
npm run dist
```

The plugin archive is written to `publish/no.nordby.placelog.jpl`.

## Install for testing

- **Desktop.** Tools › Options › Plugins › Advanced settings › Development plugins:
  add the path to this folder, then restart Joplin.
- **Mobile.** Configuration › Plugins › Advanced › Install from file, and choose the
  `.jpl` file from `publish/`.

## Note format

The map reads any line that contains the marker followed by a place name, with an
optional time earlier on the line and an optional hidden coordinate comment:

```
- 09:12 📍 Home
- 12:30 📍 The Library
- 15:02 📍 Unknown place <!-- geo:59.950000,10.700000 -->
```

Lines you write by hand in this form show up on the map too, as long as the place
name exists in the places note.

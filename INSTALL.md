# Installing Placelog for testing

The plugin is not in the Joplin plugin repository yet, so it has to be installed from
the `.jpl` file. The latest test build is attached to the newest GitHub release:
https://github.com/agnordby/joplin-plugin-placelog/releases

To build the file yourself, run `npm install` and `npm run dist`. The archive is
written to `publish/no.nordby.placelog.jpl`.

## Desktop (macOS, Windows, Linux)

Either install the archive:

1. Tools › Options › Plugins.
2. Press the gear button and choose "Install from file".
3. Select the `.jpl` file and restart Joplin.

Or load the project folder directly, which picks up every rebuild on restart:

1. Tools › Options › Plugins › Advanced settings.
2. Add the path to this project folder under "Development plugins".
3. Restart Joplin. Repeat the restart after each `npm run dist`.

## Android

1. Download the `.jpl` file to the phone, for example from the GitHub release page.
2. In Joplin, open Configuration › Plugins.
3. Turn on plugin support if it is off.
4. Open Advanced settings and tap "Install from file".
5. Choose the downloaded file.

## iPhone and iPad

The iOS app only installs plugins that the Joplin team has marked as recommended. It
has no "Install from file" option. Two ways to test on iOS:

- **Joplin web app.** The mobile app also runs in a browser at
  https://app.joplincloud.com/. Open it in Safari, set up sync to your existing sync
  target, then use Configuration › Plugins › Advanced › "Install from file". This is a
  separate Joplin profile that lives in the browser, not the installed app. GPS goes
  through Safari, so it may ask for location permission.
- **Publish and get recommended.** Publishing the plugin to the Joplin plugin
  repository and asking the Joplin team to vet it is the only way into the native iOS
  app.

## First test: does GPS work?

The plugin reads the position with the browser geolocation API inside its dialog.
Whether Joplin's mobile web view allows this is the main open question.

1. Open a diary note and start the editor.
2. Tap the map-marker button in the editor toolbar, or run "Placelog: Log time and
   place" from the command list.
3. Read the grey debug line at the bottom of the dialog. It shows the platform and
   either the coordinates with their accuracy, or the geolocation error.

If the line says that geolocation is undefined or reports an error, the plugin falls
back to manual place selection, and a different position source is needed.

## Notes

- The manifest declares both `mobile` and `desktop` under `platforms`. Joplin mobile
  refuses to install a plugin that does not list `mobile`.
- The places list is stored in a note titled "Placelog places". It is created in the
  current notebook the first time a place is saved, and it syncs like any other note.

Sources: [Joplin plugins help](https://joplinapp.org/help/apps/plugins),
[Joplin mobile plugin debugging](https://github.com/laurent22/joplin/blob/dev/readme/api/references/mobile_plugin_debugging.md).

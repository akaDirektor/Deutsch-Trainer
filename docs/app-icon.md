# App shortcut icon

The square green/turquoise icon was generated with the built-in imagegen tool
using the Fokus Deutsch B2 cover as a visual reference, at the user's request.
It is an adapted personal-trainer icon, not an official Cornelsen app icon.

Reference: Cornelsen, Fokus Deutsch B2, ISBN 9783065213172:
https://www.cornelsen.de/produkte/fokus-deutsch-erfolgreich-in-alltag-und-beruf-neue-ausgabe-kurs-und-uebungsbuch-passend-zum-neuen-deutsch-test-fuer-den-beruf-b2-b2-9783065213172

Cover image:
https://static.cornelsen.de/media/9783065213172/9783065213172_COVER_STD_B260_X2.png

Generation prompt: Adapt the reference cover's green background, turquoise
polygon badge and white FOKUS DEUTSCH lettering into a square home-screen icon
with a clear B2 label. Keep it legible at small sizes; no photograph, people,
publisher logo, extra copy, rounded outer corners or mockup.

The selected generated source is retained in the task workspace under
`outputs/deutsch-b2-icon-source.png`. App assets: `icons/deutsch-b2-32.png`,
`icons/deutsch-b2-180.png`, `icons/deutsch-b2-192.png`,
`icons/deutsch-b2-512.png`. PNGs are opaque and square.

The HTML declares a favicon and an Apple touch icon. The manifest uses paths
relative to itself, so the start URL and scope remain under `/Deutsch-Trainer/`
on GitHub Pages. There is no service worker or new cache strategy. Vocabulary,
authentication and progress persistence are unaffected.

After deployment, create a new shortcut through Safari's Add to Home Screen
or Add to Dock, or the equivalent browser shortcut/install action. Existing
shortcuts can retain cached icons; recreating the shortcut picks up the new
asset. Removing a shortcut is distinct from clearing website data.

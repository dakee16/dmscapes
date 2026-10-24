#!/bin/sh
# Renders the synthetic schedule fixtures from src/*.html (no real student schedules).
#   sh scripts/fixtures/schedules/render.sh     (macOS: Chrome + sips)
set -e
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shot() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor="$4" --window-size="$2" --screenshot="$PWD/$3" "file://$PWD/src/$1" 2>/dev/null; }
shot psu-grid.html 1120,560 psu-grid.png 2
shot psu-list.html 880,640 psu-list.png 2
shot ucla-dark.html 390,700 ucla-dark.png 3
cp psu-grid.png src/psu-grid.png
shot photo.html 1400,1000 photo.png 2
shot not-a-schedule.html 900,640 not-a-schedule.png 1
rm src/psu-grid.png
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$PWD/psu-schedule.pdf" "file://$PWD/src/psu-print.html" 2>/dev/null
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="$PWD/four-pages.pdf" "file://$PWD/src/four-pages.html" 2>/dev/null
# Phone-style JPEGs: the dark app screen, and the photo of a laptop screen (heavier compression).
sips -s format jpeg -s formatOptions 85 ucla-dark.png --out ucla-dark.jpg >/dev/null && rm ucla-dark.png
sips -s format jpeg -s formatOptions 62 photo.png --out photo-of-screen.jpg >/dev/null && rm photo.png
# Rejection fixture: a text file wearing a .png name.
printf 'BEGIN:VCALENDAR\nThis is not an image.\n' > fake-extension.png
ls -la

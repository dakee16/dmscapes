# Homepage video

The launch section on the homepage plays one clip:

- dormscape-launch.mp4        -> the 30 second product tour
- dormscape-launch-poster.jpg -> first frame, shown before playback starts

MP4 (H.264/AAC), 16:9, faststart. It autoplays muted when the section scrolls
into view and pauses when it leaves; the viewer turns sound on with the button
on the clip. Re-encode a new master with:

    ffmpeg -i master.mp4 -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p \
      -movflags +faststart -c:a aac -b:a 128k dormscape-launch.mp4
    ffmpeg -ss 0.5 -i dormscape-launch.mp4 -frames:v 1 -q:v 4 dormscape-launch-poster.jpg

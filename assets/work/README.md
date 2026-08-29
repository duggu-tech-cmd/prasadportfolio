# Project media

Put screenshots and videos for the "Selected Work" detail pages in this folder,
then reference them from `js/data.js` under the matching project's `media` array.

Example:

```js
media: [
  { type: 'image', src: 'assets/work/tournament-01.jpg', caption: 'Overlay in play' },
  { type: 'video', src: 'assets/work/tournament-demo.mp4', caption: 'Live video playback' },
  { type: 'youtube', id: 'dQw4w9WgXcQ', caption: 'Walkthrough' },
],
```

- `image` → any web format (.jpg, .png, .webp)
- `video` → .mp4 (H.264) plays everywhere; keep it under ~50 MB for GitHub
- `youtube` → use the video ID only, not the full URL. Best option for large
  videos since it avoids GitHub's file size limits entirely.

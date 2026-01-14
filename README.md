# YouTube Music Player CLI

A minimal CLI music player that searches YouTube and streams audio directly without saving files.

## Features

- Search YouTube for music
- Interactive selection with arrow keys
- Stream audio on-demand (no local storage)
- Simple and minimal

## Prerequisites

You need to have these installed:

1. **Bun** - JavaScript runtime
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **FFmpeg** - For audio playback
   - macOS: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg` or `sudo dnf install ffmpeg`
   - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

3. **yt-dlp** - For YouTube streaming
   - macOS: `brew install yt-dlp`
   - Linux: `sudo apt install yt-dlp` or `pip install yt-dlp`
   - Windows: Download from [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp)

## Installation

```bash
bun install
```

## Usage

Run the music player:

```bash
bun run index.ts
```

Or make it executable and run directly:

```bash
./index.ts
```

## How it works

1. Enter your search query (e.g., "lofi hip hop")
2. Select a track from the results using arrow keys
3. Press Enter to play
4. Press Ctrl+C to stop playback

## Notes

- Audio streams directly from YouTube (no files saved)
- Requires active internet connection
- Uses `yt-dlp` CLI tool to get stream URLs
- Uses `ffplay` (part of FFmpeg) for audio playback
- Uses `yt-search` for YouTube search

#!/usr/bin/env bun

import { input, select } from '@inquirer/prompts';
import ytSearch from 'yt-search';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

interface VideoInfo {
  title: string;
  videoId: string;
  url: string;
  duration: {
    timestamp: string;
  };
  author: {
    name: string;
  };
}

async function searchYouTube(query: string): Promise<VideoInfo[]> {
  try {
    const result = await ytSearch(query);
    return result.videos.slice(0, 10);
  } catch (error) {
    console.error('Error searching YouTube:', error);
    return [];
  }
}

async function playAudio(videoUrl: string) {
  try {
    console.log('\n🎵 Getting audio stream...\n');

    // Use yt-dlp to get the best audio stream URL
    const { stdout } = await exec(`yt-dlp -f bestaudio -g "${videoUrl}"`);
    const audioUrl = stdout.trim();

    if (!audioUrl) {
      throw new Error('Could not get audio stream URL');
    }

    // Use ffplay to play the audio stream directly
    const ffplay = spawn('ffplay', [
      '-nodisp',           // No video display
      '-autoexit',         // Exit when done
      '-loglevel', 'quiet', // Suppress ffplay logs
      audioUrl
    ]);

    return new Promise<void>((resolve, reject) => {
      ffplay.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Playback finished\n');
          resolve();
        } else if (code !== null) {
          reject(new Error(`ffplay exited with code ${code}`));
        }
      });

      ffplay.on('error', (error) => {
        reject(error);
      });

      // Handle Ctrl+C
      process.on('SIGINT', () => {
        ffplay.kill();
        console.log('\n\n⏹️  Playback stopped\n');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Error playing audio:', error instanceof Error ? error.message : error);
    throw error;
  }
}

async function main() {
  console.log('🎵 YouTube Music Player\n');

  while (true) {
    try {
      // Get search query from user
      const query = await input({
        message: 'Search for music:',
      });

      if (!query.trim()) {
        console.log('Please enter a search query\n');
        continue;
      }

      console.log('\n🔍 Searching...\n');

      // Search YouTube
      const results = await searchYouTube(query);

      if (results.length === 0) {
        console.log('No results found\n');
        continue;
      }

      // Let user select a video
      const choices = results.map((video) => ({
        name: `${video.title} - ${video.author.name} [${video.duration.timestamp}]`,
        value: video,
      }));

      const selectedVideo = await select({
        message: 'Select a track:',
        choices,
      });

      console.log(`\n▶️  Now playing: ${selectedVideo.title}\n`);

      // Play the selected video
      await playAudio(selectedVideo.url);

    } catch (error) {
      if (error instanceof Error && error.message.includes('User force closed')) {
        console.log('\n👋 Goodbye!\n');
        process.exit(0);
      }
      console.error('Error:', error);
      console.log('\n');
    }
  }
}

main();

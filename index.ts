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

function parseDuration(timestamp: string): number {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 2) {
    // Format: MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // Format: HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function drawProgressBar(current: number, total: number) {
  const barWidth = 40;
  const percentage = Math.min(current / total, 1);
  const filled = Math.floor(barWidth * percentage);
  const empty = barWidth - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const timeDisplay = `${formatTime(current)} / ${formatTime(total)}`;
  const percentDisplay = `${Math.floor(percentage * 100)}%`;

  // Clear line and write progress
  process.stdout.write(`\r${bar} ${timeDisplay} ${percentDisplay}`);
}

async function playAudio(videoUrl: string, duration: string): Promise<{ stoppedByUser: boolean }> {
  try {
    console.log('\n🎵 Getting audio stream...\n');

    // Use yt-dlp to get the best audio stream URL
    const { stdout } = await exec(`yt-dlp -f bestaudio -g "${videoUrl}"`);
    const audioUrl = stdout.trim();

    if (!audioUrl) {
      throw new Error('Could not get audio stream URL');
    }

    const totalSeconds = parseDuration(duration);

    // Use ffplay to play the audio stream directly
    const ffplay = spawn('ffplay', [
      '-nodisp',           // No video display
      '-autoexit',         // Exit when done
      '-loglevel', 'quiet', // Suppress ffplay logs
      audioUrl
    ]);

    // Enable raw mode to capture Esc key
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
    }

    return new Promise<{ stoppedByUser: boolean }>((resolve, reject) => {
      console.log('Press ESC to stop playback\n');

      let currentTime = 0;

      // Simple timer-based progress (updates every second)
      const progressInterval = setInterval(() => {
        currentTime++;
        if (currentTime <= totalSeconds) {
          drawProgressBar(currentTime, totalSeconds);
        }
      }, 1000);

      const cleanup = () => {
        clearInterval(progressInterval);
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
          process.stdin.pause();
        }
        process.stdin.removeListener('data', keyHandler);
        process.removeListener('SIGINT', sigintHandler);
        process.stdout.write('\n'); // Move to new line after progress bar
      };

      const keyHandler = (data: Buffer) => {
        // Check for Esc key (code 27)
        if (data[0] === 27) {
          ffplay.kill();
          console.log('\n⏹️  Playback stopped\n');
          cleanup();
          resolve({ stoppedByUser: true });
        }
      };

      const sigintHandler = () => {
        ffplay.kill();
        console.log('\n⏹️  Playback stopped\n');
        cleanup();
        process.exit(0);
      };

      // Listen for key presses
      process.stdin.on('data', keyHandler);

      // Handle Ctrl+C
      process.on('SIGINT', sigintHandler);

      ffplay.on('close', (code) => {
        cleanup();
        if (code === 0) {
          console.log('\n✅ Playback finished\n');
          resolve({ stoppedByUser: false });
        } else if (code !== null) {
          reject(new Error(`ffplay exited with code ${code}`));
        }
      });

      ffplay.on('error', (error) => {
        cleanup();
        reject(error);
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

      // Keep showing the same results until user finishes a song naturally
      let continueWithSameResults = true;
      while (continueWithSameResults) {
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
        const { stoppedByUser } = await playAudio(selectedVideo.url, selectedVideo.duration.timestamp);

        // If stopped by user (Esc), show the same results again
        // If finished naturally, exit loop and ask for new search
        continueWithSameResults = stoppedByUser;
      }

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

import wav from 'wav';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { rootLogger as logger } from './logger.js';

const execPromise = promisify(exec);

export default class LocalStorage {
  static loadFile(filePath: string) {
    return fs.createReadStream(filePath);
  }
  static async saveWavFile(
    filename: string,
    pcmData: Buffer,
    channels = 1,
    rate = 24000,
    sampleWidth = 2
  ) {
    return new Promise((resolve, reject) => {
      const writer = new wav.FileWriter(filename, {
        channels,
        sampleRate: rate,
        bitDepth: sampleWidth * 8,
      });

      writer.on('finish', resolve);
      writer.on('error', reject);

      writer.write(pcmData);
      writer.end();
    });
  }
  static async saveOpusFile(wavFile: string, opusFile: string): Promise<void> {
    try {
      // Convert to Ogg/Opus using FFmpeg
      await execPromise(
        `ffmpeg -i ${wavFile} -c:a libopus -b:a 64k ${opusFile}`
      );
    } catch (error) {
      logger.error(
        `Failed to convert ${wavFile} to opus/ogg format: ${error}`,
        { wavFile: wavFile, opusFile: opusFile }
      );

      throw error;
    } finally {
      // Clean up
      await fs.promises.unlink(wavFile);
    }
  }

  static resolvePath(filePath: string) {
    return path.resolve(process.cwd() + filePath);
  }
}

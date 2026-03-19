'use server';

/**
 * @fileOverview Verificador de status de lives no YouTube.
 */

import { ai } from '../genkit';
import { z } from 'genkit';
import { google } from 'googleapis';

const CheckLiveStatusInputSchema = z.object({ videoId: z.string() });
const CheckLiveStatusOutputSchema = z.object({ isLive: z.boolean() });

export const checkLiveStatusFlow = ai.defineFlow(
  {
    name: 'checkLiveStatus',
    inputSchema: CheckLiveStatusInputSchema,
    outputSchema: CheckLiveStatusOutputSchema,
  },
  async ({ videoId }) => {
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY não está configurada.');
    }

    try {
      const youtube = google.youtube({
        version: 'v3',
        auth: YOUTUBE_API_KEY,
      });

      const response = await youtube.videos.list({
        part: ['liveStreamingDetails'],
        id: [videoId],
      });

      const video = response.data.items?.[0];
      const liveDetails = video?.liveStreamingDetails;

      const isLive = !!(liveDetails?.actualStartTime && !liveDetails?.actualEndTime);

      return { isLive };

    } catch (error) {
      console.error('Erro ao verificar status da live:', error);
      throw new Error('Falha ao consultar a API do YouTube.');
    }
  }
);

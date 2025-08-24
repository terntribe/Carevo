import { config } from '#config/index.js';
import { RequestsManager } from './requests.js';
import FormData from 'form-data';
import fs from 'fs';

import { MessageResponse, FileUploadResponse } from './types.js';

const requests = new RequestsManager();
// const audioStore = new AudioStorageHandler(); this will be used to upload and store audio files

/*
{
      messaging_product: 'whatsapp',
      to: RECIPIENT_WAID,
      recepient_type: 'individual',
      type: 'text',
      text: { preview_url: false, body: message },
    }

*/

export default class WhatsAppService {
  static async sendMessage(data: MessageResponse) {
    const url = `https://graph.facebook.com/${config.whatsapp.api_version}/${config.whatsapp.phone_number_id}/messages`;
    const reponse = await requests.post({
      url: url,
      body: JSON.stringify(data),
      headers: {
        Authorization: `Bearer ${config.whatsapp.acess_token}`,
        'Content-Type': 'application/json',
      },
    });
    return reponse;
  }

  static async uploadAudioFile(filePath: string): Promise<FileUploadResponse> {
    const url = `https://graph.facebook.com/${config.whatsapp.api_version}/${config.whatsapp.phone_number_id}/media`;
    const form = new FormData();

    form.append('file', fs.createReadStream(filePath), {
      contentType: 'audio/ogg',
      filename: filePath,
    });
    form.append('messaging_product', 'whatsapp');

    const response = await requests.post({
      url: url,
      body: form,
      headers: {
        Authorization: `Bearer ${config.whatsapp.acess_token}`,
        ...form.getHeaders(), // Include FormData headers
      },
    });

    if (response.status !== 200) {
      console.log(response.data);
      throw new Error(`Failed to upload media: ${response.statusText}`);
    }
    return response.data as FileUploadResponse;
  }

  static getOutgoingMessageData(message: MessageResponse) {
    const baseResponseData = {
      messaging_product: 'whatsapp',
      to: config.whatsapp.reciepient_id,
      recepient_type: 'individual',
    };
    return { ...baseResponseData, ...message };
  }
}

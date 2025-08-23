import FormData from 'form-data';

export type Request = {
  url: string;
  body?: string | FormData;
  headers?: any;
};

export type FileUploadResponse = { id: string };

export type MessageResponse = {
  type: 'text' | 'audio';
  text?: { preview_url: boolean; body: string };
  audio?: { id: string };
};

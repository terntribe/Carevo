import sessionManager from '#models/sessions/sessions.model.js';
import MessageConfig from '#utils/responses.ts';

export const matchIntent = (
  keyword: string,
  phoneNumber: string
): 'obs' | string => {
  const session = sessionManager.retrieve(phoneNumber);
  const lastQueryKeyword = session?.lastQueryKeyword;

  if (MessageConfig.languages.includes(keyword)) {
    return 'obs';
  } else {
    return `${lastQueryKeyword}:${keyword}`;
  }
};

export const processMessage = async () => {};

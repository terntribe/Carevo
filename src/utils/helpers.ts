import axios from 'axios';

export function initRequestClient() {
  const client = axios.create({ timeout: 10000 });

  //attach debug log for requests
  client.interceptors.request.use(
    (request) => {
      console.log(`${request.method} - pinging ${request.url}`);
      return request;
    },
    (error) => error // we will come back here to log errors
  );

  // attach retry logic for timeouts and network errors
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (
        (axios.isAxiosError(error) && !error.response) ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK' ||
        error.code === 'ERR_BAD_RESPONSE'
      ) {
        // Retry logic for network errors or timeouts
        const config = error.config;

        if (!config || !config.__retryCount) {
          config.__retryCount = 0;
          config._backOff = 1;
        }

        if (config.__retryCount < 4) {
          config.__retryCount += 1;
          config._backOff =
            config.__retryCount > 1 ? config._backOff * 2 : config._backOff;

          const delay = config.__retryCount > 1 ? config._backOff * 1000 : 1000;

          console.log(
            `attempt ${config.__retryCount} failed, retrying in ${delay / 1000} seconds...`
          );
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(client(config));
            }, delay); // Wait a bit before retrying...
          });
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
}

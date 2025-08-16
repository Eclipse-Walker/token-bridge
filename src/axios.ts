import type { AxiosInstance } from 'axios';
import { getToken } from '.';

export function attachAxios(axios: AxiosInstance) {
  const reqId = axios.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return () => {
    axios.interceptors.request.eject(reqId);
  };
}

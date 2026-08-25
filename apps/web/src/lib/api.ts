import axios, { type AxiosError } from 'axios';

/**
 * 唯一 Control API 实例（UI_TECH_STACK 7.3）。
 * Cookie Session（HttpOnly + Secure + SameSite），凭据随请求携带。
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_CONTROL_API_URL as string,
  withCredentials: true,
  timeout: 15_000,
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // TODO: 统一未登录跳转 / 权限不足提示 / 服务端错误结构转换 / 前端 Trace ID
    // 禁止在错误上报中发送 Authorization、Cookie、API Key（UI_TECH_STACK 13）
    return Promise.reject(error);
  },
);

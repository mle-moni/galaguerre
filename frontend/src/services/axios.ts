import axios, { type InternalAxiosRequestConfig, isAxiosError } from "axios";
import { notifyApiError } from "./toasts.js";

export const TOKEN_STORAGE_KEY = "token";

export const setToken = (newToken: string) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
};

export const privateAxios = axios.create({
    baseURL: "/",
});

const tokenRequestSetup = (axiosConfig: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    axiosConfig.headers.Authorization = `Bearer ${token}`;

    return axiosConfig;
};

privateAxios.interceptors.request.use(tokenRequestSetup);

privateAxios.interceptors.response.use(undefined, (error) => {
    if (isAxiosError(error)) {
        notifyApiError(error.response?.data);
    }
    throw error;
});

export const privateAxiosWithoutToasts = axios.create({
    baseURL: "/",
});

privateAxiosWithoutToasts.interceptors.request.use(tokenRequestSetup);

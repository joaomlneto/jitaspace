import Axios from "axios";

export const AXIOS_INSTANCE = Axios.create({
  baseURL: "https://esi.evetech.net",
});

type CustomClient<T> = (data: {
  url: string;
  method: "get" | "post" | "put" | "delete" | "patch";
  params?: Record<string, any>;
  headers?: Record<string, any>;
  data?: BodyType<unknown>;
  signal?: AbortSignal;
}) => Promise<T>;

export const useCustomClient = <T>(): CustomClient<T> => {
  return async ({ url, method, params, data }) => {
    const response = await fetch(url + new URLSearchParams(params), {
      method,
      //headers: { ...data?.headers, Authorization: `Bearer ${token}` },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });

    return response.json();
  };
};

export default useCustomClient;

export type ErrorType<ErrorData> = ErrorData;

export type BodyType<BodyData> = BodyData & { headers?: any };
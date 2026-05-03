export interface SdeLastModifiedResponse {
  _key: "sde";
  buildNumber: number;
  releaseDate: string;
}

export interface VercelStatusResponse {
  page: {
    id: string;
    name: string;
    url: string;
    time_zone: string;
    updated_at: string;
  };
  status: {
    indicator: string;
    description: string;
  };
}

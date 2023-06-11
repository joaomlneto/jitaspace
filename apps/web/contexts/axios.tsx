import { type ReactNode } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";

export default function AxiosContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { data: session, status } = useSession();

  // Set the URL for the API server
  // https://orval.dev/guides/set-base-url
  axios.defaults.baseURL = "https://esi.evetech.net/latest";

  if (status === "authenticated") {
    //console.log("injecting token");
    axios.defaults.headers.common[
      "Authorization"
    ] = `Bearer ${session?.accessToken}`;
  }

  return <>{children}</>;
}

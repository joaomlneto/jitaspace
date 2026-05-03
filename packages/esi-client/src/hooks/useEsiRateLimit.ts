"use client";

import { useEffect, useState } from "react";

import { getRateLimitState, subscribeToRateLimitState } from "../rate-limit";

export const useEsiRateLimit = () => {
  const [state, setState] = useState(() => getRateLimitState());

  useEffect(() => {
    return subscribeToRateLimitState((newState) => {
      setState({ ...newState });
    });
  }, []);

  return state;
};

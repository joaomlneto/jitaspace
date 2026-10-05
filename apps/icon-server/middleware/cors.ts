import { defineEventHandler, handleCors } from "h3";

/**
 * Allow any origin to embed/fetch icons (e.g. for use in `<canvas>` or
 * cross-origin `fetch`). Also short-circuits CORS preflight (OPTIONS).
 */
export default defineEventHandler((event) => {
  handleCors(event, {
    origin: "*",
    methods: ["GET", "HEAD", "OPTIONS"],
    allowHeaders: "*",
  });
});

import "@testing-library/jest-dom/jest-globals";

import { TextDecoder, TextEncoder } from "util";

Object.assign(global, { TextEncoder, TextDecoder });

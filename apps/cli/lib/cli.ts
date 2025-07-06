import { program } from "@commander-js/extra-typings";

import download from "../commands/download.js";
import generate from "../commands/generate.js";
import { version } from "../package.json";

export const TITLE_WIDTH = 35;

program
  .name("sde-converter")
  .version(version)
  .description("JitaSpace SDE parser")
  .option("-w, --workDir <path>", "Working directory", "./sde-workdir");

program.hook("preAction", () => {
  const banner = `     _  _  _          ___                      
  _ | |(_)| |_  __ _ / __| _ __  __ _  __  ___ 
 | || || ||  _|/ _\` |\\__ \\| '_ \\/ _\` |/ _|/ -_)
  \\__/ |_| \\__|\\__,_||___/| .__/\\__,_|\\__|\\___|
                          |_| SDE Utilities
`;

  console.log(banner);
});

[download, generate].forEach((command) => {
  program.addCommand(command);
});

export function parse() {
  program.parse();
}

export function getWorkingDirectory() {
  return (program.opts() as { workDir: string }).workDir;
}

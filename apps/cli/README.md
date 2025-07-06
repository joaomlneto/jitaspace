# SDE Converter

This tool converts the SDE data from the [EVE Static Data Export](https://developers.eveonline.com/resource/resources) into an OpenAPI spec backed by static JSON files.

## Basic Usage

The script can be invoked via `npx`:
```bash
$ npx @jitaspace/sde-converter
```

Or installed globally:
```bash
$ npm install -g @jitaspace/sde-converter
$ sde-converter
```

### Available Commands

```
Usage: sde-converter [options] [command]

JitaSpace SDE parser

Options:
  -V, --version         output the version number
  -w, --workDir <path>  Working directory (default: "./sde-workdir")
  -h, --help            display help for command

Commands:
  download-only         Retrieve the latest SDE archive and extracts it
  generate              Generate OpenAPI spec and JSON files from latest SDE
  help [command]        display help for command
```

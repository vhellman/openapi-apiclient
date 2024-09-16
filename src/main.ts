import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { OpenAPIV3 } from 'openapi-types';
import { generateZodSchemas } from './generateSchemas.js';
import { generateApiClientCode } from './generateClient.js';
import { generateEndpoints } from './generateEndpoints.js';

// ANSI escape codes for styling
const styles = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",
  
  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    crimson: "\x1b[38m"
  },
  bg: {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    magenta: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m",
    crimson: "\x1b[48m"
  }
};


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


interface Arguments {
  input: string;
  output: string;
}

  const argv = yargs(hideBin(process.argv))
    .options({
      input: {
        alias: 'i',
        describe: 'The URL or file path to the OpenAPI specification',
        type: 'string',
        demandOption: true
      },
      output: {
        alias: 'o',
        describe: 'The output directory for the generated files',
        type: 'string',
        default: './__generated__'
      }
    })
    .help()
    .alias('help', 'h')
    .parse() as Arguments;

// Function to fetch OpenAPI specification from a URL
async function fetchOpenAPISpec(url: string): Promise<OpenAPIV3.Document> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText}`);
    }
    return await response.json() as OpenAPIV3.Document;
  } catch (error) {
    console.error('Error fetching OpenAPI spec:', error);
    process.exit(1);
  }
}

// Function to read OpenAPI specification from a local file
function readOpenAPISpecFromFile(filePath: string): OpenAPIV3.Document {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error reading OpenAPI spec from file:', error);
    process.exit(1);
  }
}

// Function to determine if the input is a URL
function isUrl(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch (_) {
    return false;
  }
}

// Function to parse OpenAPI spec
async function parseOpenAPISpec(input: string): Promise<OpenAPIV3.Document> {
  if (isUrl(input)) {
    return await fetchOpenAPISpec(input);
  } else {
    return readOpenAPISpecFromFile(input);
  }
}

// Function to extract the common base path from OpenAPI paths
function extractCommonBasePath(paths: string[]): string {
  if (paths.length === 0) return '';
  const commonPrefix = findCommonPrefix(paths);
  return commonPrefix.endsWith('/') ? commonPrefix.slice(0, -1) : commonPrefix;
  }
  
  // Function to find the common prefix of an array of strings
  function findCommonPrefix(strings: string[]): string {
  if (strings.length === 0) return '';
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
      while (strings[i].indexOf(prefix) !== 0) {
      prefix = prefix.substring(0, prefix.length - 1);
      if (prefix === '') return '';
      }
  }
  return prefix;
  }

async function main() {
  const { input, output } = argv;

  const spec = await parseOpenAPISpec(input);
  const baseUrl = extractCommonBasePath(Object.keys(spec.paths));

  // Create output directory if it does not exist
  const outputDir = path.resolve(process.cwd(), output);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`${styles.dim}Generating schemas...${styles.reset}`);
  const schemasContent = generateZodSchemas(spec);
  fs.writeFileSync(path.join(outputDir, 'schemas.api.ts'), schemasContent, 'utf-8');
  console.log(`${styles.fg.green}✔ Schemas generated${styles.reset}\n`);

  console.log(`${styles.dim}Generating API client...${styles.reset}`);
  const clientContent = generateApiClientCode(baseUrl);
  fs.writeFileSync(path.join(outputDir, 'client.ts'), clientContent, 'utf-8');
  console.log(`${styles.fg.green}✔ API client generated${styles.reset}\n`);

  console.log(`${styles.dim}Generating API routes...${styles.reset}`);
  const routesContent = generateEndpoints(spec, baseUrl);
  fs.writeFileSync(path.join(outputDir, 'routes.api.ts'), routesContent, 'utf-8');
  console.log(`${styles.fg.green}✔ API routes generated${styles.reset}\n`);

  console.log(`${styles.bright}${styles.fg.green}Generation complete!${styles.reset}`);
  console.log(`${styles.fg.yellow}Files generated in: ${styles.underscore}${outputDir}${styles.reset}\n`);
}

main().catch(error => {
  console.error('An error occurred:', error);
  process.exit(1);
});
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generateSchemasFile } from './generateSchemas';
const argv = yargs(hideBin(process.argv))
    .option('input', {
    alias: 'i',
    description: 'The URL or file path to the OpenAPI specification',
    type: 'string',
    demandOption: true,
})
    .option('output', {
    alias: 'o',
    description: 'The output directory for the generated files',
    type: 'string',
    default: './__generated__',
})
    .help()
    .alias('help', 'h')
    .parse();
// Function to fetch OpenAPI specification from a URL
async function fetchOpenAPISpec(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText}`);
        }
        return (await response.json());
    }
    catch (error) {
        console.error('Error fetching OpenAPI spec:', error);
        process.exit(1);
    }
}
// Function to read OpenAPI specification from a local file
async function readOpenAPISpecFromFile(filePath) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(fileContent);
    }
    catch (error) {
        console.error('Error reading OpenAPI spec from file:', error);
        process.exit(1);
    }
}
// Function to determine if the input is a URL
function isUrl(input) {
    try {
        new URL(input);
        return true;
    }
    catch (_) {
        return false;
    }
}
// Function to extract the common base path from OpenAPI paths
function extractCommonBasePath(paths) {
    if (paths.length === 0)
        return '';
    const commonPrefix = findCommonPrefix(paths);
    return commonPrefix.endsWith('/') ? commonPrefix.slice(0, -1) : commonPrefix;
}
// Function to find the common prefix of an array of strings
function findCommonPrefix(strings) {
    if (strings.length === 0)
        return '';
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++) {
        while (strings[i].indexOf(prefix) !== 0) {
            prefix = prefix.substring(0, prefix.length - 1);
            if (prefix === '')
                return '';
        }
    }
    return prefix;
}
// Function to generate the client.ts content
function generateClientContent() {
    return `type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface ApiClientOptions {
  baseUrl: string;
}

interface RequestOptions<T> {
  method: HttpMethod;
  path: string;
  body?: T;
}

class ApiClient {
  private baseUrl: string;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl;
  }

  async request<TResponse, TRequest = undefined>(options: RequestOptions<TRequest>): Promise<TResponse> {
    const { method, path, body } = options;
    const url = \`\${this.baseUrl}\${path}\`;
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, fetchOptions);
      if (!response.ok) {
        throw new Error(\`HTTP error! Status: \${response.status}\`);
      }
      return (await response.json()) as TResponse;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  get<TResponse>(path: string): Promise<TResponse> {
    return this.request<TResponse>({ method: 'GET', path });
  }

  post<TResponse, TRequest>(path: string, body: TRequest): Promise<TResponse> {
    return this.request<TResponse, TRequest>({ method: 'POST', path, body });
  }

  put<TResponse, TRequest>(path: string, body: TRequest): Promise<TResponse> {
    return this.request<TResponse, TRequest>({ method: 'PUT', path, body });
  }

  delete<TResponse>(path: string): Promise<TResponse> {
    return this.request<TResponse>({ method: 'DELETE', path });
  }
}

export const apiClient = new ApiClient({ baseUrl: '' }); // Base URL will be set dynamically
`;
}
// You'll need to implement or use a library for actual parsing
async function parseOpenAPISpec(input) {
    let rawSpec;
    if (isUrl(input)) {
        rawSpec = await fetchOpenAPISpec(input);
    }
    else {
        rawSpec = await readOpenAPISpecFromFile(input);
    }
    // Note: You might need to implement actual parsing logic here
    // or use a library like 'swagger-parser' for full OpenAPI parsing
    return rawSpec;
}
function generateApiFunctions(spec) {
    const paths = Object.keys(spec.paths);
    const BASE_URL = extractCommonBasePath(paths);
    console.log(`Extracted BASE_URL: ${BASE_URL}`);
    const functions = {};
    Object.entries(spec.paths).forEach(([path, pathItem]) => {
        const relativePath = path.slice(BASE_URL.length);
        Object.entries(pathItem).forEach(([method, operation]) => {
            if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
                const operationId = operation.operationId || `${method}${relativePath.replace(/\W+/g, '_')}`;
                functions[operationId] = async (params = {}, body) => {
                    let url = `${BASE_URL}${relativePath}`;
                    // Replace path parameters
                    url = url.replace(/{(\w+)}/g, (_, key) => encodeURIComponent(params[key]));
                    const queryParams = operation.parameters?.filter((p) => p.in === 'query') || [];
                    const queryString = queryParams
                        .map(p => `${p.name}=${encodeURIComponent(params[p.name] || '')}`)
                        .join('&');
                    if (queryString) {
                        url += `?${queryString}`;
                    }
                    const options = {
                        method: method.toUpperCase(),
                        headers: {
                            'Content-Type': 'application/json',
                            ...params.headers,
                        },
                    };
                    if (body) {
                        options.body = JSON.stringify(body);
                    }
                    const response = await fetch(url, options);
                    if (!response.ok) {
                        throw new Error(`HTTP error! Status: ${response.status}`);
                    }
                    return response.json();
                };
            }
        });
    });
    return { BASE_URL, functions };
}
function capitalizeCamelCase(str) {
    return str
        .replace(/^\//, '') // Remove leading slash
        .replace(/{([^}]+)}/g, '$1') // Remove curly braces from path parameters
        .split(/[^a-zA-Z0-9]+/) // Split on non-alphanumeric characters
        .map((part, index) => part.charAt(0).toUpperCase() + part.slice(1) // Capitalize first letter of each part
    )
        .join('');
}
// Modify the main function
async function main() {
    const { input, output } = argv;
    const spec = await parseOpenAPISpec(input);
    // Generate content for client.ts and routes.api.ts
    const clientContent = generateClientContent();
    const routesContent = generateApiFunctions(spec);
    // Create output directory if it does not exist
    const outputDir = path.resolve(process.cwd(), output);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    // Write the generated files
    fs.writeFileSync(path.join(outputDir, 'client.ts'), clientContent, 'utf-8');
    fs.writeFileSync(path.join(outputDir, 'routes.api.ts'), routesContent, 'utf-8');
    // Generate and write schemas.api.ts
    generateSchemasFile(spec, outputDir);
    console.log(`API client, routes, and schemas have been generated in ${outputDir}`);
}
main();

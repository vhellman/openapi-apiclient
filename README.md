# openapi-client-generator

Generates zod schemas and type types for an OpenAPI specification.

## Installation

You can install this package globally or use it directly with npx without installation:

```bash
# Global installation

# Using npm
npm install -g openapi-client-generator

# Using yarn
yarn global add openapi-client-generator

# Using pnpm
pnpm add -g openapi-client-generator

# Or, use npx without installation (see Usage section)
```

## Usage

You can use this package as a command-line tool. The usage varies depending on your preferred method:

```bash
# Using npx (no installation required)
npx openapi-client-generator -i <input-openapi-spec> -o <output-directory>

# If globally installed:

# Using npm
generate-api -i <input-openapi-spec> -o <output-directory>

# Using yarn
generate-api -i <input-openapi-spec> -o <output-directory>

# Using pnpm
generate-api -i <input-openapi-spec> -o <output-directory>
```

### Flags

- `-i, --input`: Specifies the input OpenAPI specification. This can be either a URL or a file path to a JSON file.
- `-o, --output`: Specifies the output directory for the generated files. If not provided, the default output folder is `./__generated__`.

### Examples:

```bash
# Using a URL as input
npx openapi-client-generator -i http://localhost:8080/v3/api-docs -o ./my-api-client

# Using a local JSON file as input
npx openapi-client-generator -i ./path/to/openapi-spec.json -o ./my-api-client

# Using default output directory
npx openapi-client-generator -i http://localhost:8080/v3/api-docs
```

## Features

- Generates Zod schemas from OpenAPI specifications
- Creates TypeScript types based on the OpenAPI definitions

## Dependencies

- node-fetch: ^3.3.2
- yargs: ^17.7.2

## Dev Dependencies

- @types/yargs: ^17.0.33
- openapi-types: ^12.1.3
- ts-node: ^10.9.2
- typescript: ^5.6.2

## Author

Viktor Hellman

## License

ISC

## Repository

[GitHub Repository](https://github.com/vhellman/openapi-apiclient.git)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Issues

If you find a bug or have a suggestion, please file an issue on the [GitHub repository](https://github.com/vhellman/openapi-apiclient/issues).

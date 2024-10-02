# openapi-client-generator

Generates zod schemas and type types for an OpenAPI specification.

## Installation

```bash
npm install openapi-client-generator
```

or

```bash
yarn add openapi-client-generator
```

## Usage

You can use this package as a command-line tool:

```bash
npx generate-api -i <input-openapi-spec> -o <output-directory>
```

Example:

```bash
npx generate-api -i http://localhost:8080/v3/api-docs -o ./output-dir
```

## Features

- Generates Zod schemas from OpenAPI specifications
- Creates TypeScript types based on the OpenAPI definitions

## Scripts

- `build`: Compile TypeScript to JavaScript
- `start`: Build the project and run it with example parameters

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

[GitHub Repository](https://github.com/username/repository.git)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Issues

If you find a bug or have a suggestion, please file an issue on the [GitHub repository](https://github.com/username/repository/issues).

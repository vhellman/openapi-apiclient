import { OpenAPIV3 } from "openapi-types";

function generateOperationId(method: string, path: string): string {
  const parts = path.split("/").filter(Boolean);
  const camelCaseParts = parts.map((part, index) => {
    if (part.startsWith("{") && part.endsWith("}")) {
      return "By" + part[1].toUpperCase() + part.slice(2, -1);
    }
    return index === 0 ? part : part[0].toUpperCase() + part.slice(1);
  });
  return method + camelCaseParts.join("");
}

function isSchemaObject(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
): schema is OpenAPIV3.SchemaObject {
  return !("$ref" in schema);
}

function getSchemaType(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined,
  contentType?: string
): string {
  if (!schema) return "void";
  if ("$ref" in schema) {
    const refParts = schema.$ref.split("/");
    return `Schemas.${refParts[refParts.length - 1]}`;
  } else if (schema.type === "string" && schema.format === "binary") {
    return "Blob";
  } else if (schema.type === "array" && schema.items) {
    if (isSchemaObject(schema.items)) {
      if (schema.items.type === "string" && schema.items.format === "byte") {
        return "Blob";
      }
    }
    return `${getSchemaType(schema.items, contentType)}[]`;
  } else if (schema.type === "object") {
    if (schema.additionalProperties) {
      const valueType = getSchemaType(
        schema.additionalProperties as
          | OpenAPIV3.SchemaObject
          | OpenAPIV3.ReferenceObject,
        contentType
      );
      return `Record<string, ${valueType}>`;
    }
    return "Record<string, any>";
  } else if (
    schema.type === "string" ||
    schema.type === "number" ||
    schema.type === "boolean"
  ) {
    return schema.type;
  }
  return "any";
}

function getResponseType(responses: OpenAPIV3.ResponsesObject): string {
  const successResponses = new Set(["200", "201", "204"]);
  
  for (const [status, response] of Object.entries(responses)) {
    if (!successResponses.has(status) || !response){
      continue;
    } 

    if (typeof response !== 'object' || response === null) {
      continue;
    }

    if (!('content' in response) || !response.content) {
      return 'void';
    }

    const content = response.content;
    const supportedTypes = [
      'application/pdf',
      'application/octet-stream',
      'application/json'
    ] as const;

    for (const type of supportedTypes) {
      const schemaContent = content[type];
      if (schemaContent && 'schema' in schemaContent) {
        const schema = schemaContent.schema;
        if (schema) {
          return getSchemaType(schema, type);
        }
      }
    }
  }

  return 'any';
}

function getRequestBodyType(
  requestBody:
    | OpenAPIV3.RequestBodyObject
    | OpenAPIV3.ReferenceObject
    | undefined
): string {
  if (requestBody && "content" in requestBody) {
    const content = requestBody.content;
    if (content) {
      if ("application/octet-stream" in content) {
        const schema = content["application/octet-stream"].schema;
        if (schema) {
          return getSchemaType(schema, "application/octet-stream");
        }
      }
      if ("application/pdf" in content) {
        const schema = content["application/pdf"].schema;
        if (schema) {
          return getSchemaType(schema, "application/pdf");
        }
      }
      if ("application/json" in content) {
        const schema = content["application/json"].schema;
        if (schema) {
          return getSchemaType(schema, "application/json");
        }
      }
    }
  }
  return "any";
}

export function generateEndpoints(
  spec: OpenAPIV3.Document,
  baseUrl: string
): string {
  let functionsCode = `import apiClient, { RequestOptions, ApiResponse } from './client.api';\n`;
  functionsCode += `import * as Schemas from './schemas.api';\n\n`;
  functionsCode += `export const BASE_URL = '${baseUrl}';\n\n`;

  Object.entries(spec.paths).forEach(([path, pathItem]) => {
    const relativePath = path.slice(baseUrl.length);
    Object.entries(pathItem as OpenAPIV3.PathItemObject).forEach(
      ([method, operation]) => {
        if (["get", "post", "put", "patch", "delete"].includes(method)) {
          const operationObject = operation as OpenAPIV3.OperationObject;
          const operationId =
            operationObject.operationId ||
            generateOperationId(method, relativePath);

          const pathParams =
            operationObject.parameters
              ?.filter(
                (p): p is OpenAPIV3.ParameterObject =>
                  "in" in p && p.in === "path"
              )
              .map((p) => p.name) || [];

          const queryParams =
            operationObject.parameters
              ?.filter(
                (p): p is OpenAPIV3.ParameterObject =>
                  "in" in p && p.in === "query"
              )
              .map((p) => p.name) || [];

          const responseType = getResponseType(operationObject.responses);
          const requestBodyType = getRequestBodyType(
            operationObject.requestBody
          );

          functionsCode += `export async function ${operationId}(`;

          const params: string[] = [];
          if (pathParams.length > 0) {
            params.push(...pathParams.map((p) => `${p}: string`));
          }
          if (queryParams.length > 0) {
            params.push(
              `params?: { ${queryParams
                .map((p) => `${p}?: string`)
                .join(", ")} }`
            );
          }
          if (["post", "put", "patch"].includes(method)) {
            params.push(`body: ${requestBodyType}`);
          }
          params.push("options: RequestOptions");

          functionsCode += params.join(", ");

          functionsCode += `): Promise<ApiResponse<${responseType}>> {\n`;

          // Construct the URL template
          let urlTemplate = `\`${relativePath.replace(/{/g, "${")}\``;

          // Add query params to options if they exist
          if (queryParams.length > 0) {
            functionsCode += `  if (params) {\n`;
            functionsCode += `    options.params = { ...options.params, ...params };\n`;
            functionsCode += `  }\n\n`;
          }

          // Construct the apiClient call
          functionsCode += `  return apiClient.${method}<${responseType}>(${urlTemplate}`;
          if (["post", "put", "patch"].includes(method)) {
            functionsCode += `, body`;
          }
          functionsCode += `, options);\n`;

          functionsCode += `}\n\n`;
        }
      }
    );
  });

  return functionsCode;
}

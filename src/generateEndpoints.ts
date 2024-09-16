import { OpenAPIV3 } from 'openapi-types';

function generateOperationId(method: string, path: string): string {
  const parts = path.split('/').filter(Boolean);
  const camelCaseParts = parts.map((part, index) => {
    if (part.startsWith('{') && part.endsWith('}')) {
      return 'By' + part[1].toUpperCase() + part.slice(2, -1);
    }
    return index === 0 ? part : part[0].toUpperCase() + part.slice(1);
  });
  return method + camelCaseParts.join('');
}

function getSchemaType(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined): string {
  if (!schema) return 'void';
  if ('$ref' in schema) {
    const refParts = schema.$ref.split('/');
    return refParts[refParts.length - 1];
  } else if (schema.type === 'array' && schema.items) {
    return `${getSchemaType(schema.items)}[]`;
  } else if (schema.type === 'object') {
    return 'Record<string, any>';
  } else if (schema.type === 'string' || schema.type === 'number' || schema.type === 'boolean') {
    return schema.type;
  }
  return 'any';
}

function getResponseType(responses: OpenAPIV3.ResponsesObject): string {
  const successResponses = ['200', '201', '204'];
  for (const status of successResponses) {
    const response = responses[status];
    if (response) {
      if ('content' in response) {
        const content = response.content;
        if (content && 'application/json' in content) {
          const schema = content['application/json'].schema;
          if (schema) {
            return getSchemaType(schema);
          }
        }
      } else {
        // For responses without content (e.g., 204 No Content)
        return 'void';
      }
    }
  }
  return 'any';
}

function getRequestBodyType(requestBody: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject | undefined): string {
  if (requestBody && 'content' in requestBody) {
    const content = requestBody.content;
    if (content && 'application/json' in content) {
      const schema = content['application/json'].schema;
      if (schema) {
        return getSchemaType(schema);
      }
    }
  }
  return 'any';
}

export function generateEndpoints(spec: OpenAPIV3.Document, baseUrl: string): string {
  let functionsCode = `import apiClient from './client';\n`;
  functionsCode += `import { RequestOptions, ApiResponse } from './client';\n`;
  functionsCode += `import * as Schemas from './schemas.api';\n\n`;
  functionsCode += `export const BASE_URL = '${baseUrl}';\n\n`;

  Object.entries(spec.paths).forEach(([path, pathItem]) => {
    const relativePath = path.slice(baseUrl.length);
    Object.entries(pathItem as OpenAPIV3.PathItemObject).forEach(([method, operation]) => {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
        const operationObject = operation as OpenAPIV3.OperationObject;
        const operationId = operationObject.operationId || generateOperationId(method, relativePath);
        
        const pathParams = operationObject.parameters
          ?.filter((p): p is OpenAPIV3.ParameterObject => 'in' in p && p.in === 'path')
          .map(p => p.name) || [];

        const queryParams = operationObject.parameters
          ?.filter((p): p is OpenAPIV3.ParameterObject => 'in' in p && p.in === 'query')
          .map(p => p.name) || [];

        const responseType = getResponseType(operationObject.responses);
        const requestBodyType = getRequestBodyType(operationObject.requestBody);

        functionsCode += `export async function ${operationId}(`;
        
        const params: string[] = [];
        if (pathParams.length > 0) {
          params.push(...pathParams.map(p => `${p}: string`));
        }
        if (queryParams.length > 0) {
          params.push(`params?: { ${queryParams.map(p => `${p}?: string`).join(', ')} }`);
        }
        if (['post', 'put', 'patch'].includes(method)) {
          params.push(`body: ${requestBodyType === 'any' ? 'any' : `Schemas.${requestBodyType}`}`);
        }
        params.push('options: RequestOptions = {}');
        
        functionsCode += params.join(', ');
        
        functionsCode += `): Promise<ApiResponse<${responseType === 'any' || responseType === 'void' ? responseType : `Schemas.${responseType}`}>> {\n`;

        // Construct the URL template
        let urlTemplate = `\`${relativePath.replace(/{/g, '${')}\``;

        // Add query params to options if they exist
        if (queryParams.length > 0) {
          functionsCode += `  if (params) {\n`;
          functionsCode += `    options.params = { ...options.params, ...params };\n`;
          functionsCode += `  }\n\n`;
        }

        // Construct the apiClient call
        functionsCode += `  return apiClient.${method}<${responseType === 'any' || responseType === 'void' ? responseType : `Schemas.${responseType}`}>(${urlTemplate}`;
        if (['post', 'put', 'patch'].includes(method)) {
          functionsCode += `, body`;
        }
        functionsCode += `, options);\n`;

        functionsCode += `}\n\n`;
      }
    });
  });

  return functionsCode;
}
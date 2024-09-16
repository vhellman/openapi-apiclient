import { OpenAPIV3 } from 'openapi-types';
import { z } from 'zod';

function zodToString(schema: z.ZodTypeAny, indentLevel: number = 0): string {
  const indent = '  '.repeat(indentLevel);
  const indentInner = '  '.repeat(indentLevel + 1);

  if (schema instanceof z.ZodString) return 'z.string()';
  if (schema instanceof z.ZodNumber) return 'z.number()';
  if (schema instanceof z.ZodBoolean) return 'z.boolean()';
  if (schema instanceof z.ZodArray) return `z.array(${zodToString(schema.element, indentLevel)})`;
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape as { [key: string]: z.ZodTypeAny };
    const fields = Object.entries(shape)
      .map(([key, value]) => `${indentInner}${key}: ${zodToString(value, indentLevel + 1)}`)
      .join(',\n');
    return `z.object({\n${fields}\n${indent}})`;
  }
  return 'z.any()';
}

function convertToZodSchema(property: OpenAPIV3.SchemaObject): z.ZodTypeAny {
  switch (property.type) {
    case 'string':
      return z.string();
    case 'number':
    case 'integer':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'array':
      return z.array(convertToZodSchema(property.items as OpenAPIV3.SchemaObject));
    case 'object':
      return z.object(
        Object.entries(property.properties || {}).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: convertToZodSchema(value as OpenAPIV3.SchemaObject),
          }),
          {}
        )
      );
    default:
      return z.any();
  }
}

export function generateZodSchemas(spec: OpenAPIV3.Document): string {
  const components = spec.components;
  
  if (!components || !components.schemas || Object.keys(components.schemas).length === 0) {
    console.log("No schemas found in the OpenAPI spec components");
    return "// No schemas found in the OpenAPI spec components";
  }
  
  let output = "import { z } from 'zod';\n\n";

  for (const [name, schema] of Object.entries(components.schemas)) {
    const zodSchema = convertToZodSchema(schema as OpenAPIV3.SchemaObject);
    const schemaName = `${name}Schema`;
    
    output += `export const ${schemaName} = ${zodToString(zodSchema)};\n`;
    output += `export type ${name} = z.infer<typeof ${schemaName}>;\n\n`;
  }

  return output;
}
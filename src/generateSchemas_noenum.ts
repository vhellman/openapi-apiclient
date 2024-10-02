import { OpenAPIV3 } from "openapi-types";
import { z } from "zod";

function generateZodSchemas(spec: OpenAPIV3.Document): string {
  const components = spec.components?.schemas || {};
  const schemaDefinitions: string[] = [];

  for (const [name, schema] of Object.entries(components)) {
    const zodSchema = convertToZodSchema(
      schema as OpenAPIV3.SchemaObject,
      components
    );
    schemaDefinitions.push(`export const ${name}Schema = ${zodSchema};`);
    schemaDefinitions.push(
      `export type ${name} = z.infer<typeof ${name}Schema>;`
    );
  }

  return `
// @ts-nocheck
import { z } from 'zod';

${schemaDefinitions.join("\n\n")}
`;
}

function convertToZodSchema(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
  components: {
    [key: string]: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
  }
): string {
  if ("$ref" in schema) {
    const refName = schema.$ref.split("/").pop() as string;
    return `${refName}Schema`;
  }

  switch (schema.type) {
    case "string":
      return "z.string()";
    case "number":
    case "integer":
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    case "array":
      if (schema.items) {
        const itemSchema = convertToZodSchema(schema.items, components);
        return `z.array(${itemSchema})`;
      }
      return "z.array(z.unknown())";
    case "object":
      if (schema.properties) {
        const requiredFields = schema.required || [];
        const shape = Object.entries(schema.properties)
          .map(([prop, propSchema]) => {
            let zodSchema = convertToZodSchema(propSchema, components);
            if (!requiredFields.includes(prop)) {
              zodSchema += ".optional()";
            }
            return `${prop}: ${zodSchema}`;
          })
          .join(",\n    ");
        return `z.object({\n    ${shape}\n  })`;
      }
      return "z.record(z.unknown())";
    default:
      return "z.unknown()";
  }
}

export { generateZodSchemas };

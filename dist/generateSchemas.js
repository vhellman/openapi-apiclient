import { z } from 'zod';
import fs from 'fs';
import path from 'path';
// Function to convert OpenAPI types to Zod schemas
function convertToZodSchema(property) {
    switch (property.type) {
        case 'string':
            return z.string();
        case 'number':
            return z.number();
        case 'integer':
            return z.number().int();
        case 'boolean':
            return z.boolean();
        case 'array':
            return z.array(convertToZodSchema(property.items));
        case 'object':
            return z.object(Object.entries(property.properties || {}).reduce((acc, [key, value]) => ({
                ...acc,
                [key]: convertToZodSchema(value),
            }), {}));
        default:
            return z.any();
    }
}
// Function to generate Zod schemas and TypeScript types
function generateZodSchemas(components) {
    let output = "import { z } from 'zod';\n\n";
    for (const [name, schema] of Object.entries(components.schemas || {})) {
        const zodSchema = convertToZodSchema(schema);
        const schemaName = `${name}Schema`;
        output += `export const ${schemaName} = ${zodSchema.toString()};\n`;
        output += `export type ${name} = z.infer<typeof ${schemaName}>;\n\n`;
    }
    return output;
}
// Main function to generate schemas.api.ts
export function generateSchemasFile(spec, outputDir) {
    const schemasContent = generateZodSchemas(spec.components);
    const outputPath = path.join(outputDir, 'schemas.api.ts');
    fs.writeFileSync(outputPath, schemasContent, 'utf-8');
    console.log(`Zod schemas and types have been generated in ${outputPath}`);
}

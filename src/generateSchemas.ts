import { OpenAPIV3 } from "openapi-types";

function generateZodSchemas(spec: OpenAPIV3.Document): string {
  const components = spec.components?.schemas || {};
  const schemaDefinitions: string[] = [];

  const dependencyGraph: { [key: string]: Set<string> } = {};

  // Build dependency graph with immediate dependencies
  for (const [name, schema] of Object.entries(components)) {
    const dependencies = getImmediateDependencies(
      schema as OpenAPIV3.SchemaObject
    );
    dependencyGraph[name] = dependencies;
  }

  // Perform topological sort
  const sortedSchemaNames = topologicalSort(dependencyGraph);
  const reverserSchemaNames = sortedSchemaNames.reverse();

  // Now generate schemas in sorted order
  for (const name of reverserSchemaNames) {
    const schema = components[name];
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
  import { z } from 'zod';

  ${schemaDefinitions.join("\n\n")}
  `;
}

function getImmediateDependencies(
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
): Set<string> {
  const dependencies = new Set<string>();

  if ("$ref" in schema) {
    const refName = schema.$ref.split("/").pop() as string;
    dependencies.add(refName);
  } else {
    if (schema.type === "array" && schema.items) {
      const itemDeps = getImmediateDependencies(schema.items);
      for (const dep of itemDeps) {
        dependencies.add(dep);
      }
    }
    if (schema.properties) {
      for (const propSchema of Object.values(schema.properties)) {
        const propDeps = getImmediateDependencies(propSchema);
        for (const dep of propDeps) {
          dependencies.add(dep);
        }
      }
    }
    if (schema.allOf) {
      for (const subSchema of schema.allOf) {
        const subDeps = getImmediateDependencies(subSchema);
        for (const dep of subDeps) {
          dependencies.add(dep);
        }
      }
    }
    if (schema.oneOf) {
      for (const subSchema of schema.oneOf) {
        const subDeps = getImmediateDependencies(subSchema);
        for (const dep of subDeps) {
          dependencies.add(dep);
        }
      }
    }
    if (schema.anyOf) {
      for (const subSchema of schema.anyOf) {
        const subDeps = getImmediateDependencies(subSchema);
        for (const dep of subDeps) {
          dependencies.add(dep);
        }
      }
    }
    if (schema.not) {
      const notDeps = getImmediateDependencies(schema.not);
      for (const dep of notDeps) {
        dependencies.add(dep);
      }
    }
  }
  return dependencies;
}

function topologicalSort(graph: { [key: string]: Set<string> }): string[] {
  // Based on Kahn's algorithm
  const inDegree = new Map<string, number>();
  const queue: string[] = [];
  const result: string[] = [];
  
  // Initialize in-degree for all nodes
  for (const node in graph) {
    if (!inDegree.has(node)) {
      inDegree.set(node, 0);
    }
    for (const neighbor of graph[node]) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) + 1);
    }
  }
    
  // Find all nodes with in-degree 0
  inDegree.forEach((degree, node) => {
    if (degree === 0) queue.push(node);
  });
  
  // Process the queue
  while (queue.length > 0) {
    const node = queue.pop()!;
    result.push(node);
    
    const neighbors = graph[node];
    if (neighbors) {
      for (const neighbor of neighbors) {
        const newDegree = inDegree.get(neighbor)! - 1;
        if (newDegree === 0) {
          queue.push(neighbor);
        }
        inDegree.set(neighbor, newDegree);
      }
    }
  }
    
  // Check for cycles
  if (result.length !== Object.keys(graph).length) {
    throw new Error("Circular dependency detected");
  }
  
  return result;
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

  if (schema.enum) {
    return `z.enum([${schema.enum
      .map((value) => JSON.stringify(value))
      .join(", ")}])`;
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

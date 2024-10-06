import { describe, it, expect } from 'vitest'
import { topologicalSort } from './generateSchemas';

describe('Topological Sort', () => {
  it('should correctly sort a simple graph', () => {
    const graph: { [key: string]: Set<string> } = {
      'A': new Set(['B', 'C']),
      'B': new Set(['D']),
      'C': new Set(['D']),
      'D': new Set(['E']),
      'E': new Set<string>()
    };
    const result = topologicalSort(graph);
    expect(result).toHaveLength(5);
    expect(result).toContain('A');
    expect(result).toContain('B');
    expect(result).toContain('C');
    expect(result).toContain('D');
    expect(result).toContain('E');
    expect(result.indexOf('A')).toBeLessThan(result.indexOf('B'));
    expect(result.indexOf('A')).toBeLessThan(result.indexOf('C'));
    expect(result.indexOf('B')).toBeLessThan(result.indexOf('D'));
    expect(result.indexOf('C')).toBeLessThan(result.indexOf('D'));
    expect(result.indexOf('D')).toBeLessThan(result.indexOf('E'));
  });

  it('should throw an error for a graph with a cycle', () => {
    const graph: { [key: string]: Set<string> } = {
      'A': new Set(['B']),
      'B': new Set(['C']),
      'C': new Set(['A'])
    };
    expect(() => topologicalSort(graph)).toThrow('Circular dependency detected');
  });

  it('should return an empty array for an empty graph', () => {
    const graph: { [key: string]: Set<string> } = {};
    const result = topologicalSort(graph);
    expect(result).toEqual([]);
  });

  it('should correctly handle a graph with a single node', () => {
    const graph: { [key: string]: Set<string> } = { 'A': new Set<string>() };
    const result = topologicalSort(graph);
    expect(result).toEqual(['A']);
  });

  it('should handle a graph with disconnected components', () => {
    const graph: { [key: string]: Set<string> } = {
      'A': new Set(['B']),
      'B': new Set<string>(),
      'C': new Set(['D']),
      'D': new Set<string>()
    };
    const result = topologicalSort(graph);
    expect(result).toHaveLength(4);
    expect(result.indexOf('A')).toBeLessThan(result.indexOf('B'));
    expect(result.indexOf('C')).toBeLessThan(result.indexOf('D'));
  });

  it('should correctly sort a more complex graph', () => {
    const graph: { [key: string]: Set<string> } = {
      'A': new Set(['B', 'C', 'D']),
      'B': new Set(['E', 'F']),
      'C': new Set(['D', 'G']),
      'D': new Set(['F', 'G']),
      'E': new Set(['H']),
      'F': new Set(['I']),
      'G': new Set(['I']),
      'H': new Set(['I', 'J']),
      'I': new Set(['J']),
      'J': new Set<string>()
    };
    const result = topologicalSort(graph);
    expect(result).toHaveLength(10);
    
    // Check for correct order
    expect(result.indexOf('A')).toBeLessThan(result.indexOf('B'));
    expect(result.indexOf('A')).toBeLessThan(result.indexOf('C'));
    expect(result.indexOf('A')).toBeLessThan(result.indexOf('D'));
    expect(result.indexOf('B')).toBeLessThan(result.indexOf('E'));
    expect(result.indexOf('B')).toBeLessThan(result.indexOf('F'));
    expect(result.indexOf('C')).toBeLessThan(result.indexOf('G'));
    expect(result.indexOf('D')).toBeLessThan(result.indexOf('F'));
    expect(result.indexOf('D')).toBeLessThan(result.indexOf('G'));
    expect(result.indexOf('E')).toBeLessThan(result.indexOf('H'));
    expect(result.indexOf('F')).toBeLessThan(result.indexOf('I'));
    expect(result.indexOf('G')).toBeLessThan(result.indexOf('I'));
    expect(result.indexOf('H')).toBeLessThan(result.indexOf('I'));
    expect(result.indexOf('H')).toBeLessThan(result.indexOf('J'));
    expect(result.indexOf('I')).toBeLessThan(result.indexOf('J'));
  });
});
import { defineConfig } from 'orval';

export default defineConfig({
  mockApi: {
    // The hand-written OpenAPI spec is the source of truth for the API contract.
    input: { target: '../server/openapi.yaml' },
    output: {
      // One file per OpenAPI tag: endpoints/products/products.ts, endpoints/orders/orders.ts, ...
      mode: 'tags-split',
      target: 'src/api/generated/endpoints',
      // TypeScript types for every component schema (Product, Order, ...).
      schemas: 'src/api/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      // Wipe the output folder before each run so removed endpoints don't linger.
      clean: true,
      override: {
        // Every generated function and hook goes through this instead of plain fetch.
        mutator: { path: 'src/api/mutator.ts', name: 'customFetch' },
        // Return the parsed body (ProductListResponse) instead of { data, status, headers }.
        // Errors throw ApiError in the mutator, so a status union would never hold an error anyway.
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
});

// Mock implementation — used in development via Vite alias swap.
// Mirrors the exact export signature of ../dataService.ts so the app
// works locally without a Power Apps runtime or Dataverse connection.
import type { ExampleItem } from "../../types/ExampleItem";

const MOCK_ITEMS: ExampleItem[] = [
  { id: "mock-001", name: "Example item 1", createdAt: new Date().toISOString() },
  { id: "mock-002", name: "Example item 2", createdAt: new Date().toISOString() },
];

export async function getItems(): Promise<ExampleItem[]> {
  return structuredClone(MOCK_ITEMS);
}

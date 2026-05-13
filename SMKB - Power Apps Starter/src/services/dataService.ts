import { getClient } from "@microsoft/power-apps/data";

// Replace TABLE with your table's OData entity set name.
// The entity set name is the table logical name + 's' (e.g. evt_sessions).
// Confirm it from the table definition in Power Platform admin center.
const TABLE = "sol_example_items";

const client = getClient({});

// Replace ExampleItem with your actual record type.
// Field names must match the Dataverse column logical names (e.g. sol_name, sol_status).
export async function getItems<T = Record<string, unknown>>(): Promise<T[]> {
  const result = await client.retrieveMultipleRecordsAsync<T>(TABLE);
  return result.data;
}

export async function getItem<T = Record<string, unknown>>(id: string): Promise<T> {
  return client.retrieveRecordAsync<T>(TABLE, id);
}

export async function createItem(data: Record<string, unknown>): Promise<void> {
  await client.createRecordAsync(TABLE, data);
}

export async function updateItem(id: string, data: Record<string, unknown>): Promise<void> {
  await client.updateRecordAsync(TABLE, id, data);
}

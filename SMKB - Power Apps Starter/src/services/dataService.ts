import { getClient } from "@microsoft/power-apps/data";

// SDK API shapes:
//   retrieveMultipleRecordsAsync<T>(table, options) — options: { select: string[], orderBy: string[], filter: string }
//   retrieveRecordAsync<T>(table, id)
//   Both return IOperationResult<T> — always unwrap with .data to get the typed value.

// Replace TABLE with your table's OData entity set name (logical name + 's', e.g. evt_sessions).
// Confirm from the table definition in Power Platform admin center.
const TABLE = "sol_example_items";

// Replace with your actual column logical names (e.g. 'sol_name', 'sol_status', 'createdon').
const FIELDS: string[] = [
  // e.g. 'sol_name', 'sol_status', 'createdon'
];

const client = getClient({});

// Replace ExampleItem with your actual record type.
// Field names must match the Dataverse column logical names (e.g. sol_name, sol_status).
export async function getItems<T = Record<string, unknown>>(): Promise<T[]> {
  const result = await client.retrieveMultipleRecordsAsync<T>(TABLE, {
    select: FIELDS,               // string[] — do NOT .join(',')
    orderBy: ["createdon desc"],  // string[] — not a plain string
    filter: "statecode eq 0",
  });
  return result.data;
}

export async function getItem<T = Record<string, unknown>>(id: string): Promise<T> {
  const result = await client.retrieveRecordAsync<T>(TABLE, id);
  return result.data; // unwrap IOperationResult<T>
}

export async function createItem(data: Record<string, unknown>): Promise<void> {
  await client.createRecordAsync(TABLE, data);
}

export async function updateItem(id: string, data: Record<string, unknown>): Promise<void> {
  await client.updateRecordAsync(TABLE, id, data);
}

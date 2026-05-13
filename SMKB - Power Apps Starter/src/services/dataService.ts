import { getClient } from "@microsoft/power-apps/data";
import type { ExampleItem } from "../types/ExampleItem";

// Replace 'sol_example_items' below with your table's OData entity set name.
// The entity set name is usually the table logical name + 's' (e.g. evt_sessions).
// You can confirm it from the table definition in the Power Platform admin center.
const TABLE = "sol_example_items";

export async function getItems(): Promise<ExampleItem[]> {
  const client = getClient();
  const result = await client.executeAsync({
    method: "GET",
    entitySetName: TABLE,
    queryParameters: "$orderby=createdon desc",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (result.value as any[]).map((r) => ({
    id: r.sol_example_itemid,
    name: r.sol_name ?? "",
    createdAt: r.createdon ?? "",
  }));
}

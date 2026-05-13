// Replace this interface with the fields from your actual Dataverse table.
// Field names should match the Dataverse column logical names (e.g. sol_name, sol_status).
export interface ExampleItem {
  id: string;        // Primary key — maps to sol_example_itemid
  name: string;      // Maps to sol_name (or smkb_name)
  createdAt: string; // Maps to createdon
}

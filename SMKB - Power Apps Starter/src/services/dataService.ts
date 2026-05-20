// ─── Dataverse Data Service ───────────────────────────────────────────────────
//
// SETUP REQUIRED before this service is usable:
//   1. Deploy the app once:  powershell -ExecutionPolicy Bypass -File deploy.ps1
//   2. Connect the Dataverse data source (run from inside the Power App folder):
//        pac code add-data-source --apiId "shared_commondataserviceforapps" --connectionId "<id>"
//      The connectionId is the last path segment of `sharedConnectionId` in any working
//      app's power.config.json in this environment.
//   3. Run deploy.ps1 again to push the updated power.config.json.
//
// This generates src/generated/services/MicrosoftDataverseService.ts.
// Commit that folder — it is deterministic and safe to version-control.
//
// ─── Usage pattern after setup ───────────────────────────────────────────────
//
//   import { MicrosoftDataverseService } from '../generated/services/MicrosoftDataverseService';
//   import { getOrgUrl } from './configService';
//
//   const ENTITY = 'sol_example_items';  // OData entity set name: logical name + 's'
//
//   export async function getItems(): Promise<ExampleItem[]> {
//     const org = await getOrgUrl();
//     const result = await MicrosoftDataverseService.ListRecordsWithOrganization(
//       org, ENTITY, undefined, 'application/json',
//       undefined, undefined, undefined, 'statecode eq 0', 'createdon desc',
//     );
//     if (!result.success) throw result.error ?? new Error('Failed to retrieve records');
//     return (result.data as { value?: ExampleItem[] })?.value ?? [];
//   }
//
//   export async function getItem(id: string): Promise<ExampleItem> {
//     const org = await getOrgUrl();
//     const result = await MicrosoftDataverseService.GetItemWithOrganization(org, ENTITY, id);
//     if (!result.success) throw result.error ?? new Error('Record not found');
//     return result.data as ExampleItem;
//   }
//
//   export async function createItem(data: Partial<ExampleItem>): Promise<void> {
//     const org = await getOrgUrl();
//     const result = await MicrosoftDataverseService.CreateRecordWithOrganization(org, ENTITY, data);
//     if (!result.success) throw result.error ?? new Error('Failed to create record');
//   }
//
//   export async function updateItem(id: string, data: Partial<ExampleItem>): Promise<void> {
//     const org = await getOrgUrl();
//     const result = await MicrosoftDataverseService.UpdateRecordWithOrganization(org, ENTITY, id, data);
//     if (!result.success) throw result.error ?? new Error('Failed to update record');
//   }
//
// Replace ExampleItem with your actual record interface.
// Replace sol_example_items with your table's OData entity set name (logical name + 's').

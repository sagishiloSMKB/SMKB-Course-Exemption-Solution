// Dataverse OData API for anonymous calls from Power Pages.
//
// CSRF TOKEN: Power Pages requires __RequestVerificationToken on all POST/PATCH calls.
// Inject the token into the page via the Liquid shell:
//   window.__SMKB_TOKEN = {{ request.request_verification_token | json }};
// Then read it with getToken() below.
//
// USAGE: import { createRecord, updateRecord } from "./services/dataService";

const API_BASE = "/_api";

function getToken(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).__SMKB_TOKEN ?? "";
}

const BASE_HEADERS = {
  "Content-Type": "application/json",
  "OData-MaxVersion": "4.0",
  "OData-Version": "4.0",
};

export async function createRecord(
  entitySetName: string,
  data: Record<string, unknown>
): Promise<void> {
  const response = await fetch(`${API_BASE}/${entitySetName}`, {
    method: "POST",
    headers: {
      ...BASE_HEADERS,
      "__RequestVerificationToken": getToken(),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Dataverse POST failed: ${response.status} ${response.statusText}`);
  }
}

export async function updateRecord(
  entitySetName: string,
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const response = await fetch(`${API_BASE}/${entitySetName}(${id})`, {
    method: "PATCH",
    headers: {
      ...BASE_HEADERS,
      "__RequestVerificationToken": getToken(),
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Dataverse PATCH failed: ${response.status} ${response.statusText}`);
  }
}

export async function fetchRecords<T = Record<string, unknown>>(
  entitySetName: string,
  select?: string,
  filter?: string
): Promise<T[]> {
  const params = new URLSearchParams();
  if (select) params.set("$select", select);
  if (filter) params.set("$filter", filter);
  const query = params.toString() ? `?${params}` : "";

  const response = await fetch(`${API_BASE}/${entitySetName}${query}`, {
    method: "GET",
    headers: BASE_HEADERS,
  });
  if (!response.ok) {
    throw new Error(`Dataverse GET failed: ${response.status} ${response.statusText}`);
  }
  const json = await response.json();
  return json.value as T[];
}

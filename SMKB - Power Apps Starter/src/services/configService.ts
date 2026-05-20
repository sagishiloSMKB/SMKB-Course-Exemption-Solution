import { MicrosoftDataverseService } from '../generated/services/MicrosoftDataverseService';

// NOTE: src/generated/ is created by: pac code add-data-source --apiId "shared_commondataserviceforapps" --connectionId "<id>"

let orgUrlCache: string | null = null;

export async function getOrgUrl(): Promise<string> {
  if (orgUrlCache) return orgUrlCache;
  const result = await MicrosoftDataverseService.GetOrganizations();
  const orgs = result.success ? result.data?.value : undefined;
  if (orgs?.length) {
    orgUrlCache = orgs[0]!.Url ?? '';
    return orgUrlCache;
  }
  const url = import.meta.env.VITE_DATAVERSE_ORG_URL as string | undefined;
  if (url) { orgUrlCache = url; return url; }
  throw new Error('Could not determine Dataverse organization URL');
}

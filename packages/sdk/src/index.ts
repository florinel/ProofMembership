import type { Campaign, Club, Membership, MembershipNftMetadata } from "@proofmembership/types";

export interface PlatformClient {
  getClubs(): Promise<Club[]>;
  getCampaigns(clubId: string): Promise<Campaign[]>;
  getMemberships(wallet: string): Promise<Membership[]>;
  getAssetMetadata(assetId: string): Promise<MembershipNftMetadata>;
}

export function createPlatformClient(baseUrl: string): PlatformClient {
  const fetchJson = async <T>(path: string): Promise<T> => {
    const response = await fetch(`${baseUrl}${path}`);
    if (!response.ok) {
      throw new Error(`Request failed: ${path}`);
    }
    return (await response.json()) as T;
  };

  return {
    getClubs: () => fetchJson<Club[]>("/api/clubs"),
    getCampaigns: (clubId: string) => fetchJson<Campaign[]>(`/api/clubs/${clubId}/campaigns`),
    getMemberships: (wallet: string) => fetchJson<Membership[]>(`/api/memberships/${wallet}`),
    getAssetMetadata: (assetId: string) =>
      fetchJson<MembershipNftMetadata>(`/api/metadata/${assetId}`),
  };
}

import { useQuery } from "@tanstack/react-query";

import { getWorkspaceData } from "../services/workspace-service";

export function useWorkspaceData(workspaceId?: string) {
  return useQuery({
    queryKey: ["workspace", workspaceId ?? "mock"],
    queryFn: () => getWorkspaceData(workspaceId),
  });
}

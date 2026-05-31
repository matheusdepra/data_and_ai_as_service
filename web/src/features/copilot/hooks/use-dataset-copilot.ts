import { useQuery } from "@tanstack/react-query";

import { getDatasetCopilotData } from "../services/dataset-copilot-service";

export function useDatasetCopilot(datasetId?: string) {
  return useQuery({
    queryKey: ["dataset-copilot", datasetId ?? "mock"],
    queryFn: () => getDatasetCopilotData(datasetId),
  });
}

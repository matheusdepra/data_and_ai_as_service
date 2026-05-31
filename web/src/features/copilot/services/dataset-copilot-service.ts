import { datasetCopilotMock } from "../mocks/dataset-copilot.mock";
import type { DatasetCopilotData } from "../types";

export async function getDatasetCopilotData(_datasetId?: string): Promise<DatasetCopilotData> {
  return Promise.resolve(datasetCopilotMock);
}

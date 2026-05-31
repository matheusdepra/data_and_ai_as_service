import { workspaceMock } from "../mocks/workspace.mock";
import type { WorkspaceData } from "../types";

export async function getWorkspaceData(_workspaceId?: string): Promise<WorkspaceData> {
  return Promise.resolve(workspaceMock);
}

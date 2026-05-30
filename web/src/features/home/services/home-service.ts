import { emptyHomeMock, homeMock } from "../mocks/home.mock";
import type { HomeData } from "../types";

const CONTINUE_WORKING_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 10;

type GetHomeDataOptions = {
  empty?: boolean;
};

function limitHomeData(data: HomeData): HomeData {
  return {
    actions: data.actions,
    continueWorking: data.continueWorking.slice(0, CONTINUE_WORKING_LIMIT),
    recentActivity: data.recentActivity.slice(0, RECENT_ACTIVITY_LIMIT),
    suggestions: data.suggestions,
  };
}

export async function getHomeData(options: GetHomeDataOptions = {}): Promise<HomeData> {
  const data = options.empty ? emptyHomeMock : homeMock;

  await new Promise((resolve) => window.setTimeout(resolve, 180));

  return limitHomeData(data);
}

export function isHomeEmpty(data: HomeData): boolean {
  return data.continueWorking.length === 0 && data.recentActivity.length === 0 && data.suggestions.length === 0;
}

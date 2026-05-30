import { useQuery } from "@tanstack/react-query";
import { getHomeData } from "../services/home-service";

type UseHomeDataOptions = {
  empty?: boolean;
};

export function useHomeData(options: UseHomeDataOptions = {}) {
  return useQuery({
    queryKey: ["home", options.empty ? "empty" : "default"],
    queryFn: () => getHomeData(options),
  });
}

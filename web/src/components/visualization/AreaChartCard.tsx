import { ChartCard } from "./ChartCard";

type AreaChartCardProps = React.ComponentProps<typeof ChartCard>;

export function AreaChartCard(props: AreaChartCardProps) {
  return <ChartCard {...props} />;
}

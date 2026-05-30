import { ChartCard } from "./ChartCard";

type LineChartCardProps = React.ComponentProps<typeof ChartCard>;

export function LineChartCard(props: LineChartCardProps) {
  return <ChartCard {...props} />;
}

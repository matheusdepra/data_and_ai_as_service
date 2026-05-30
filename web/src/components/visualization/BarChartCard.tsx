import { ChartCard } from "./ChartCard";

type BarChartCardProps = React.ComponentProps<typeof ChartCard>;

export function BarChartCard(props: BarChartCardProps) {
  return <ChartCard {...props} />;
}

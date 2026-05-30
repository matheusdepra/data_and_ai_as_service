import { ChartCard } from "./ChartCard";

type DonutChartCardProps = React.ComponentProps<typeof ChartCard>;

export function DonutChartCard(props: DonutChartCardProps) {
  return <ChartCard {...props} />;
}

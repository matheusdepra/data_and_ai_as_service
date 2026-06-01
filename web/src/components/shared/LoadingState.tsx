import { Card, CardContent } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

type LoadingStateProps = {
  rows?: number;
  label?: string;
};

export function LoadingState({ rows = 3, label = "Loading page" }: LoadingStateProps) {
  return (
    <section className="grid gap-4" aria-label={label} aria-busy="true">
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: rows }).map((_, index) => (
          <Card key={index}>
            <CardContent className="space-y-3 p-5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-48" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

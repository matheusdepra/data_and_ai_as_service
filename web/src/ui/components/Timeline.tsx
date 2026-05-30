export type TimelineItem = {
  label: string;
  description: string;
  state: "done" | "current" | "pending" | "error";
  timestamp?: string | null;
};

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="timeline">
      {items.map((item) => (
        <li key={item.label} className={`timelineItem timelineItem-${item.state}`}>
          <span className="timelineMarker" aria-hidden="true" />
          <div>
            <div className="timelineItemHeader">
              <strong>{item.label}</strong>
              {item.timestamp ? <span>{item.timestamp}</span> : null}
            </div>
            <p>{item.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

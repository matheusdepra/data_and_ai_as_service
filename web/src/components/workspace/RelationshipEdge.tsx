import { Badge } from "../ui/badge";

type RelationshipEdgeProps = {
  relationshipKey: string;
  confidence: string | number;
  type: string;
};

export function RelationshipEdge({ relationshipKey, confidence, type }: RelationshipEdgeProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-dv-card">
      <div>
        <p className="text-sm font-semibold text-[#111827]">{relationshipKey}</p>
        <p className="mt-1 text-xs text-[#6B7280]">Confidence {confidence}</p>
      </div>
      <Badge variant="outline">{type}</Badge>
    </div>
  );
}

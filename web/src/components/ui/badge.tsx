import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#6E5BFF] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#6E5BFF] text-white",
        secondary: "border-transparent bg-[#F3F1FF] text-[#5F4CF0]",
        outline: "border-[#E5E7EB] bg-white text-[#6B7280]",
        success: "border-[#22C55E]/20 bg-[#F0FDF4] text-green-700",
        warning: "border-[#F59E0B]/20 bg-[#FFFBEB] text-amber-700",
        destructive: "border-[#EF4444]/20 bg-[#FEF2F2] text-red-700",
        info: "border-[#3B82F6]/20 bg-[#EFF6FF] text-blue-700",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}
function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
export { Badge, badgeVariants };

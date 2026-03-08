import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-primary/20 bg-primary/10 text-primary hover:bg-primary/20",
        secondary:
          "border-border bg-secondary text-secondary-foreground hover:bg-secondary/70",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20",
        outline:
          "border-border text-foreground bg-transparent hover:bg-muted",
        success:
          "border-success/20 bg-success/10 text-success hover:bg-success/20",
        warning:
          "border-warning/20 bg-warning/10 text-warning hover:bg-warning/20",
        gold:
          "border-primary/30 bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

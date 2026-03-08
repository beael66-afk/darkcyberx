import { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  index: number;
  loading?: boolean;
  trend?: string;
}

export const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  index,
  loading = false,
  trend,
}: StatCardProps) => {
  return (
    <div
      className={cn(
        "group relative rounded-xl border border-border/60 bg-card p-5 transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-lg hover:border-primary/30",
        "animate-fade-in overflow-hidden"
      )}
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      {/* subtle background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/3 group-hover:to-transparent transition-all duration-500 rounded-xl" />

      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-2">
            {title}
          </p>
          {loading ? (
            <Skeleton className="h-9 w-16 mt-1" />
          ) : (
            <p className="text-3xl font-bold tracking-tight text-foreground">
              {value.toLocaleString("ar-EG")}
            </p>
          )}
          {trend && !loading && (
            <p className="text-xs text-muted-foreground mt-1.5">{trend}</p>
          )}
        </div>

        <div className={cn("p-3 rounded-xl flex-shrink-0", bgColor, "transition-transform duration-300 group-hover:scale-110")}>
          <Icon className={cn("h-5 w-5", color)} />
        </div>
      </div>

      {/* bottom accent line */}
      <div className={cn("absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded-b-xl bg-gradient-primary")} />
    </div>
  );
};

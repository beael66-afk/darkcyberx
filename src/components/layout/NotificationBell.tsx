import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9"
      aria-label="الإشعارات"
    >
      <Bell className="h-4 w-4" />
    </Button>
  );
}

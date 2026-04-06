"use client";

import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Bell,
  FolderOpen,
  Package,
  Storefront,
  ShoppingCart,
  User,
  Info,
  CheckCircle,
} from "@phosphor-icons/react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications } from "@/hooks/use-notifications";
import { useNotificationContext } from "@/providers/notification-provider";
import type { Notification, NotificationEntityType } from "@/types/notification";

const entityRouteMap: Record<NotificationEntityType, string> = {
  dossier: "/dossiers",
  lot: "/lots",
  vente: "/ventes",
  commande: "/commandes",
  client: "/clients",
};

const entityIconMap: Record<NotificationEntityType, React.ElementType> = {
  dossier: FolderOpen,
  lot: Package,
  vente: Storefront,
  commande: ShoppingCart,
  client: User,
};

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  const router = useRouter();
  const Icon = notification.entity_type
    ? entityIconMap[notification.entity_type]
    : Info;

  function handleClick() {
    if (!notification.is_read) {
      onRead(notification.id);
    }
    if (notification.entity_type && notification.entity_id) {
      router.push(
        `${entityRouteMap[notification.entity_type]}/${notification.entity_id}`
      );
    }
  }

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-start gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted/50"
    >
      <div className="mt-0.5 shrink-0">
        <Icon size={18} weight="duotone" className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight">{notification.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
          {notification.message}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {formatDistanceToNow(new Date(notification.created_at), {
            addSuffix: true,
            locale: fr,
          })}
        </p>
      </div>
      {!notification.is_read && (
        <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  );
}

export function NotificationBell() {
  const { userId } = useNotificationContext();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications(userId);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
            <Bell size={20} weight="duotone" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 p-0"
      >
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCircle size={14} weight="duotone" />
              Tout marquer comme lu
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="size-5 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2.5 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell size={32} weight="duotone" className="mb-2 opacity-50" />
              <p className="text-sm">Aucune notification.</p>
            </div>
          ) : (
            <div className="py-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markAsRead}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

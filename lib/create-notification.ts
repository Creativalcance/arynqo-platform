type NotificationChannel = "in_app" | "email" | "push";

type CreateNotificationInput = {
  userId: string;
  title: string;
  message: string;
  relatedType?: string | null;
  relatedId?: string | null;
  relatedUrl?: string | null;
  actionLabel?: string | null;
  channels?: NotificationChannel[];
};

export async function createNotification(input: CreateNotificationInput) {
  const response = await fetch("/api/notifications/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: input.userId,
      title: input.title,
      message: input.message,
      relatedType: input.relatedType || null,
      relatedId: input.relatedId || null,
      relatedUrl: input.relatedUrl || null,
      actionLabel: input.actionLabel || null,
      channels: input.channels || ["in_app", "email", "push"],
    }),
  });

  const data = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    error?: string;
  };

  if (!response.ok || !data.success) {
    throw new Error(data.error || "Não foi possível criar a notificação.");
  }

  return data;
}
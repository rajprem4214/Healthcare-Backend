declare type NotificationMedium = ['email' | 'whatsapp' | 'in-app'];

declare type CreateNotificationRequestBody = {
    name: string;
    tags: "system" | "custom" | "alert" | "social" | "event";
    subject: string;
    medium: NotificationMedium;
    status: "active" | "sent" | "archive";
    message: string;
    triggerAt: string | null;
}
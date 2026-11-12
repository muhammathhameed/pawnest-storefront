import { requireCustomer } from "../../../lib/account/user";
import { Card, PageTitle } from "../../../components/account/ui";
import { NotificationForm } from "../../../components/account/Forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications | AuraFinds" };

export default async function NotificationsPage() {
  const { profile } = await requireCustomer("/account/notifications");
  return (
    <>
      <PageTitle title="Notifications" subtitle="Choose what we email you about." />
      <Card><NotificationForm prefs={profile?.notification_prefs ?? { order_updates: true, promotions: false, price_drops: false }} /></Card>
    </>
  );
}

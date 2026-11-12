import { requireCustomer } from "../../../lib/account/user";
import { Card, PageTitle } from "../../../components/account/ui";
import { ProfileForm } from "../../../components/account/Forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile settings | AuraFinds" };

export default async function ProfilePage() {
  const { user, profile, displayName } = await requireCustomer("/account/profile");
  return (
    <>
      <PageTitle title="Profile settings" subtitle="Your name, contact details and photo." />
      <Card>
        <ProfileForm
          userId={user.id}
          name={profile?.full_name ?? displayName}
          email={user.email ?? ""}
          phone={profile?.phone ?? ""}
          avatar={profile?.avatar_url ?? user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null}
        />
      </Card>
    </>
  );
}

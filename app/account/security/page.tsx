import { requireCustomer } from "../../../lib/account/user";
import { Card, PageTitle } from "../../../components/account/ui";
import { SecurityForms } from "../../../components/account/Forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Security | AuraFinds" };

export default async function SecurityPage() {
  const { user } = await requireCustomer("/account/security");
  const provider = (user.app_metadata?.provider as string | undefined) ?? "email";
  return (
    <>
      <PageTitle title="Security" subtitle={provider === "email" ? "Password, sessions and account deletion." : `You sign in with ${provider === "azure" ? "Microsoft" : provider}. Setting a password adds an email login too.`} />
      <Card><SecurityForms /></Card>
    </>
  );
}

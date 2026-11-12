import { requireCustomer } from "../../../lib/account/user";
import { Card, Empty, PageTitle } from "../../../components/account/ui";
import AddressManager from "../../../components/account/AddressManager";
import type { Addr } from "../../../components/account/Forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Addresses | AuraFinds" };

export default async function AddressesPage() {
  const { supabase, user } = await requireCustomer("/account/addresses");
  const { data } = await supabase.from("customer_addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at");
  return (
    <>
      <PageTitle title="Addresses" subtitle="Where we send your orders." />
      <AddressManager addresses={(data ?? []) as Addr[]} />
    </>
  );
}

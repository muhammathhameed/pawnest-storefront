import { redirect } from "next/navigation";

// The old /profile page stored a fake user in localStorage. Account lives at /account.
export default function ProfilePage() {
  redirect("/account");
}

import { AuthForm } from "@/components/auth-form";
import { backendConfig } from "@/lib/config";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthForm
      mode="login"
      configured={!!backendConfig()}
      verificationError={params.error === "verification"}
    />
  );
}

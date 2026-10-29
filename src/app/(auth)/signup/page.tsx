import { AuthForm } from "@/components/auth-form";
import { backendConfig } from "@/lib/config";
export default function Page() {
  return <AuthForm mode="signup" configured={!!backendConfig()} />;
}

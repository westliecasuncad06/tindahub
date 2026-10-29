import { AuthForm } from "@/components/auth-form";
import { backendConfig } from "@/lib/config";
export default function Page() {
  return <AuthForm mode="forgot" configured={!!backendConfig()} />;
}

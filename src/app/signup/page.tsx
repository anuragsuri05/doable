import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <Suspense>
      <AuthForm kind="signup" />
    </Suspense>
  );
}

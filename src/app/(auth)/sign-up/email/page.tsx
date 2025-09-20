import EmailSignUp from "@/components/auth/email-sign-up";
import { getIsFirstUser } from "lib/auth/server";

export default async function EmailSignUpPage() {
  const isFirstUser = await getIsFirstUser();
  return <EmailSignUp isFirstUser={isFirstUser} />;
}

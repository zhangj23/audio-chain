import { AuthGuard } from "@/components/AuthGuard";

export default function Index() {
  return <AuthGuard>{null}</AuthGuard>;
}

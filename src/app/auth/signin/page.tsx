import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome to Fineract</CardTitle>
          <CardDescription>
            Sign in to access the banking administration interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server";
              await signIn("keycloak", {
                redirectTo: searchParams.callbackUrl || "/config",
              });
            }}
          >
            <Button type="submit" className="w-full" size="lg">
              Sign in with Keycloak
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

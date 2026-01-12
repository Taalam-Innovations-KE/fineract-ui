import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
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
        <CardContent className="space-y-4">
          {searchParams.error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              Authentication failed. Please check your credentials.
            </div>
          )}

          {/* Credentials Form */}
          <form
            action={async (formData: FormData) => {
              "use server";
              const username = formData.get("username");
              const password = formData.get("password");
              const tenantId = formData.get("tenantId") || "default";

              await signIn("credentials", {
                username,
                password,
                tenantId,
                redirectTo: searchParams.callbackUrl || "/config",
              });
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantId">Tenant ID</Label>
              <Input
                id="tenantId"
                name="tenantId"
                type="text"
                placeholder="default"
                defaultValue="default"
              />
            </div>

            <Button type="submit" className="w-full" size="lg">
              Sign in with Credentials
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Keycloak Form */}
          <form
            action={async () => {
              "use server";
              await signIn("keycloak", {
                redirectTo: searchParams.callbackUrl || "/config",
              });
            }}
          >
            <Button type="submit" variant="outline" className="w-full" size="lg">
              Sign in with Keycloak
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

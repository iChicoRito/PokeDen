"use client";

import { useState } from "react";

import Image from "next/image";

import { LogOut, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/features/auth/auth-provider";

export function AccountCard() {
  const { session, user, loading, signIn, signOut } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Sign in to sync your data across devices.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Spinner className="size-4" />
            Checking session…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (session && user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your data syncs automatically when signed in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-full bg-muted">
              <User className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-sm">{user.email ?? "Signed in"}</p>
              <p className="text-muted-foreground text-xs">Synced with Supabase</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void signOut().then(() => {
                  toast.success("Signed out. Data stays on this device.");
                });
              }}
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Sign in to sync your data across devices.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Your data is stored locally on this device. Sign in with Google to enable cross-device sync.
        </p>
        <Button
          disabled={signingIn}
          variant="outline"
          onClick={() => {
            setSigningIn(true);
            void signIn().finally(() => setSigningIn(false));
          }}
        >
          {signingIn ? (
            <>
              <Spinner className="size-4" />
              Redirecting…
            </>
          ) : (
            <>
              <Image alt="" height={16} src="/assets/icons/google-g.svg" unoptimized width={16} />
              Sign in with Google
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

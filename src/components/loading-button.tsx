"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type LoadingButtonProps = React.ComponentProps<typeof Button> & {
  /** When true the button is disabled, marked aria-busy, and shows a spinner. */
  loading?: boolean;
  /** Optional label shown while loading; defaults to the button's children. */
  loadingLabel?: string;
};

/**
 * Button with a built-in loading state. Renders the same `Button` visually;
 * while `loading` it disables interaction and replaces the content with a
 * spinner plus the (loading) label.
 */
export function LoadingButton({
  loading = false,
  loadingLabel,
  className,
  children,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      aria-busy={loading ? true : undefined}
      aria-live="polite"
      className={cn(loading && "pointer-events-none", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Spinner className="size-4" />
          <span>{loadingLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}

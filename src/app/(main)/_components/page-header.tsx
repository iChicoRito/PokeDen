import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <h1 className="min-w-0 font-heading font-semibold text-3xl tracking-tight">
        {title}
        <span className="font-normal text-muted-foreground"> — {description}</span>
      </h1>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  );
}

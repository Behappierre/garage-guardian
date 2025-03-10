
import React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
  return (
    <div className={cn(
      "sticky top-0 z-10 bg-background py-6 px-8 border-b mb-6",
      "dark:bg-background dark:border-border",
      className
    )}>
      <div className="flex flex-wrap items-center justify-between gap-4 max-w-[1400px] mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

interface PageActionButtonProps extends ButtonProps {
  icon?: React.ReactNode;
}

export function PageActionButton({ 
  children, 
  icon, 
  className, 
  ...props 
}: PageActionButtonProps) {
  return (
    <Button
      className={cn(
        "bg-primary hover:bg-primary/90 text-primary-foreground rounded-md shadow-sm flex items-center gap-1.5",
        className
      )}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </Button>
  );
}


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
    <div className={cn("mb-6 flex flex-wrap items-center justify-between gap-4", className)}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
      </div>
      {children}
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
        "bg-primary hover:bg-primary/90 text-white rounded-md shadow-sm flex items-center gap-1.5",
        className
      )}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </Button>
  );
}

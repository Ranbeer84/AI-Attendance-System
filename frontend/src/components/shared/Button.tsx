import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: ReactNode;
}

export default function Button({ variant = "primary", children, className, ...rest }: ButtonProps) {
  const variantClass = `btn btn-${variant}`;
  return (
    <button className={`${variantClass} ${className || ""}`} {...rest}>
      {children}
    </button>
  );
}
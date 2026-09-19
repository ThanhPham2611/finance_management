import * as icons from "lucide-react";
import type { LucideProps } from "lucide-react";

type IconLibrary = Record<string, React.ComponentType<LucideProps>>;

function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** Renders a lucide-react icon by its kebab-case name, e.g. "shopping-bag". */
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Component = (icons as unknown as IconLibrary)[toPascalCase(name)];
  if (!Component) return null;
  return <Component {...props} />;
}

import type { HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLElement> & { children: React.ReactNode };

export function Card({ children, className = '', ...props }: Props) {
  return <section className={`card ${className}`} {...props}>{children}</section>;
}

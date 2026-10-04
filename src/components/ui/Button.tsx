import React from 'react';

/**
 * Chunky 3D "press" button — parentia-inspired, re-branded to the botanical palette.
 * Visuals live in `.btn3d*` classes (src/index.css); this component only composes
 * variant + size + width and can render as a link when `href` is provided.
 */

export type ButtonVariant = 'primary' | 'gold' | 'wa' | 'ghost';
export type ButtonSize = 'md' | 'lg';

interface BaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** stretch to full container width (parentia CTAs are full-width) */
  full?: boolean;
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = BaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    href?: undefined;
  };

type ButtonAsLink = BaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children'> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const SIZE: Record<ButtonSize, string> = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3.5 text-base'
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  full = false,
  className = '',
  children,
  ...rest
}) => {
  const cls = `btn3d btn3d-${variant} ${SIZE[size]} ${full ? 'w-full' : ''} ${className}`
    .replace(/\s+/g, ' ')
    .trim();

  if ('href' in rest && rest.href) {
    return (
      <a className={cls} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }
  return (
    <button className={cls} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
};

export default Button;

"use client";

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  CSSProperties,
  ElementType,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import "./arrow-fill-button.css";

type ArrowFillButtonProps = {
  children?: ReactNode;
  className?: string;
  bgColor?: string;
  textColor?: string;
  fillBgColor?: string;
  fillTextColor?: string;
  hoverFillBgColor?: string;
  hoverFillTextColor?: string;
  arrowColor?: string;
  hoverArrowColor?: string;
  as?: ElementType;
  style?: CSSProperties;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "color">;

/**
 * ObsidianUI arrow-fill-button (slice 6.12).
 * Defaults restyled to BrandMyBeast stainless / signal — no orange kit palette.
 */
export function ArrowFillButton({
  children = "Explore components",
  className = "",
  bgColor = "#d6ff3f",
  textColor = "#12160a",
  fillBgColor = "#0c0e11",
  fillTextColor = "#d6ff3f",
  hoverFillBgColor = "#14181e",
  hoverFillTextColor = "#d6ff3f",
  arrowColor,
  hoverArrowColor,
  as: Component = "a",
  style,
  ...props
}: ArrowFillButtonProps) {
  return (
    <Component
      type={Component === "button" ? "button" : undefined}
      {...props}
      className={cn("obsidian-arrow-fill-btn", className)}
      style={
        {
          "--btn-bg": bgColor,
          "--btn-text": textColor,
          "--btn-fill-bg": fillBgColor,
          "--btn-fill-text": fillTextColor,
          "--btn-fill-bg-hover": hoverFillBgColor,
          "--btn-fill-text-hover": hoverFillTextColor,
          "--btn-arrow": arrowColor || fillTextColor,
          "--btn-arrow-hover": hoverArrowColor || hoverFillTextColor,
          ...style,
        } as CSSProperties
      }
    >
      <span className="obsidian-arrow-fill-btn__text">{children}</span>

      <div aria-hidden="true" className="obsidian-arrow-fill-btn__circle">
        <span>{children}</span>

        <div className="obsidian-arrow-fill-btn__circle-text">
          <svg
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="obsidian-arrow-fill-btn__icon"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.82475e-07 5.625L7.625 5.625L4.125 9.125L5 10L10 5L5 -4.37114e-07L4.125 0.874999L7.625 4.375L4.91753e-07 4.375L3.82475e-07 5.625Z"
              className="obsidian-arrow-fill-btn__path"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.82475e-07 5.625L7.625 5.625L4.125 9.125L5 10L10 5L5 -4.37114e-07L4.125 0.874999L7.625 4.375L4.91753e-07 4.375L3.82475e-07 5.625Z"
              className="obsidian-arrow-fill-btn__path"
            />
          </svg>
        </div>
      </div>
    </Component>
  );
}

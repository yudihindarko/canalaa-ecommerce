import React from "react";

/**
 * Server component rendered by Payload as an `afterNavLinks` entry.
 * Adds a "Sales Dashboard" link to the left admin nav so the
 * admin can jump from /admin to /dashboard in one click.
 *
 * Uses native <a> instead of next/link to stay a Server Component
 * (no Client Component bundling needed for a static link).
 */
export const DashboardNavLink: React.FC = () => {
  return (
    <a
      href="/dashboard"
      className="nav__link"
      style={{
        alignItems: "center",
        color: "inherit",
        display: "flex",
        gap: "8px",
        padding: "8px 16px",
        textDecoration: "none",
      }}
    >
      <span aria-hidden style={{ fontSize: "16px" }}>
        📊
      </span>
      <span>Sales Dashboard</span>
    </a>
  );
};

export default DashboardNavLink;

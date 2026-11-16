"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import NavTabs from "@/components/NavTabs/NavTabs.jsx";
import Header from "@/components/Header/Header.jsx";
import PageHeading from "@/components/PageHeading.jsx";
import "@/components/Layout/Layout.css";

const HangoutsChat = dynamic(
  () => import("@/components/HangoutsChat/HangoutsChat.jsx"),
  { ssr: false }
);

export default function SerpShell({ children }) {
  const pathname = usePathname();
  const isMaps = pathname === "/maps";
  const mainRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("serp-route-enter");
    void root.offsetWidth;
    root.classList.add("serp-route-enter");
    const clearRoute = window.setTimeout(
      () => root.classList.remove("serp-route-enter"),
      720
    );

    const main = mainRef.current;
    if (main) {
      main.classList.remove("site-main--motion");
      void main.offsetWidth;
      main.classList.add("site-main--motion");
    }

    return () => window.clearTimeout(clearRoute);
  }, [pathname]);

  return (
    <div className={`site-layout ${isMaps ? "site-layout--maps" : "site-layout--contained"}`}>
      <Header currentPath={pathname} />
      <NavTabs />
      <main
        ref={mainRef}
        className={isMaps ? "site-main site-main--maps" : "site-main"}
      >
        <PageHeading pathname={pathname} />
        {children}
      </main>
      <HangoutsChat />
    </div>
  );
}

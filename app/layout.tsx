"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DialogDemo } from "./dialog";
import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { UserProvider, useUser } from "./context";
import { ErrorBoundary } from "react-error-boundary";
import { Spinner } from "@/components/ui/spinner";
import { fetcher } from "@/lib/utils";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <DialogDemo open={open} />
        <Home openState={setOpen}>{children}</Home>
      </body>
    </html>
  );
}

function Home({
  children,
  openState,
}: {
  children: React.ReactNode;
  openState: React.Dispatch<React.SetStateAction<boolean>>;
}) {

  function ApiData({ children }: { children: React.ReactNode }) {
    const { data, error, isLoading } = useSWR(
      `${process.env.NEXT_PUBLIC_URL}/user`,
      fetcher
    );

    const { setCurrentUser } = useUser();

    useEffect(() => {
      if (data?.user) setCurrentUser(data.user);
    }, [data, setCurrentUser]);

    // let ErrorBoundary handle it
    if (error) throw error;

    // "fallback" while loading – same idea as Suspense fallback
    if (isLoading) {
      return (
        <div className="w-screen h-screen bg-black grid place-items-center">
          <Spinner className="w-[200px] h-[200px] text-white" />
        </div>
      );
    }

    return <>{children}</>;
  }

  return (
    <ErrorBoundary
      fallbackRender={() => <div className="w-screen h-screen bg-black grid place-items-center">
          <Spinner className="w-[200px] h-[200px] text-white" />
        </div>}
      onError={(error) => {
        console.error(error);
        openState(true); // open dialog when API fails
      }}
    >
      <UserProvider>
        <ApiData>{children}</ApiData>
      </UserProvider>
    </ErrorBoundary>
  );
}

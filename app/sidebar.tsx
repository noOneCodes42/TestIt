"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconArrowLeft,
  IconBrandTabler,
  IconSettings,
  IconUserBolt,
} from "@tabler/icons-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { BookIcon, LogOutIcon } from "lucide-react";
import { PixelatedCanvas } from "@/components/ui/pixelated-canvas";
import { TabProvider, useTab } from "./context";

interface data {
  data: teacher,
  setOpen?: any
}

export function SpecialSidebar({data, setOpen: setDialogOpen}: data) {
  const links = [
    {
      label: "Log Out",
      href: "#",
      icon: (
        <LogOutIcon className="h-5 w-5 shrink-0 text-neutral-200" />
      ),
    },
    {
      label: "Join / Create a Classroom",
      href: "#",
      icon: (
        <BookIcon className="h-5 w-5 shrink-0 text-neutral-200" />
      ),
    }
  ];
  const [open, setOpen] = useState(false);
  const ctx = useTab()

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-7xl z-50 flex-1 flex-col overflow-hidden rounded-md bg-neutral-800 md:flex-row",
        "h-screen", // for your use case, use `h-screen` instead of `h-[60vh]`
      )}
    >
      <Sidebar open={open} setOpen={setOpen} animate={false}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            <>
              <Logo data={data} />
            </>
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} onClick={async () => {
                  setOpen(false)
                  if(idx == 0) {
                    await fetch(`${process.env.NEXT_PUBLIC_URL}/logout`, {credentials: "include", method: "POST"})
                    window.location.reload()
                  } else if(idx == 1) {
                    setDialogOpen(true)
                  }
                }}/>
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: `${data.first_name} ${data.last_name}`,
                href: "#",
                icon: (
                  <PixelatedCanvas
                    src={data.image_url}
                    className="h-7 w-7 shrink-0 rounded-full"
                    width={50}
                    height={50}
                  />
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>
    </div>
  );
}
export const Logo = ({data}: data) => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium whitespace-pre text-white"
      >
      {data.pronouns}.{data.first_name}
      </motion.span>
    </a>
  );
};
export const LogoIcon = () => {
  return (
    <a
      href="#"
      className="relative z-20 flex items-center space-x-2 py-1 text-sm font-normal text-black"
    >
      <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-black dark:bg-white" />
    </a>
  );
};

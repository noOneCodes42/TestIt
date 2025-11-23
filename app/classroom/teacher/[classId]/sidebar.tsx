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
import { BookIcon } from "lucide-react";
import { PixelatedCanvas } from "@/components/ui/pixelated-canvas";
import { TabProvider, useTab } from "./context";

interface data {
  data: classroom
}

export function SpecialSidebar({data}: data) {
  const links = [
    {
      label: "Quizzes",
      href: "#",
      icon: (
        <BookIcon className="h-5 w-5 shrink-0 text-neutral-200" />
      ),
    },
    {
      label: "Teacher Profile",
      href: "#",
      icon: (
        <IconUserBolt className="h-5 w-5 shrink-0 text-neutral-200" />
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
                <SidebarLink key={idx} link={link} onClick={() => {
                  setOpen(false)
                  ctx.setCurrentTab(idx == 0 ? "quiz" : idx == 1 ? "profile" : "")
                }}/>
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: `${data.teacher.first_name} ${data.teacher.last_name}`,
                href: "#",
                icon: (
                  <PixelatedCanvas
                    src={data.teacher.image_url}
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
      {data.teacher.pronouns}.{data.teacher.first_name}
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

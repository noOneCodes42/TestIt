'use client'
import { PixelatedCanvas } from "@/components/ui/pixelated-canvas";
import { LucideHamburger, MenuIcon, XIcon } from "lucide-react";
import Image from "next/image";
import {SpecialSidebar} from "./sidebar"
import { useState } from "react";
import { TabProvider, useTab } from "./context";
import { SpecialExpandableCard } from "./expandable-card";

export default function Home() {
  return <TabProvider>
    <Page />
  </TabProvider>
}

export function Page() {
  const [userClassroom, setClassroom] = useState<classroom | null>()
  const ctx = useTab()
  if(!userClassroom) return null;
  return (
    <div className="flex">
        <div className="z-10 bg-neutral-800">
            <SpecialSidebar data={userClassroom}></SpecialSidebar>
        </div>
        <div className="flex flex-wrap gap-6 min-h-screen w-full font-sans bg-black p-8">
        {ctx.currentTab == "quiz" ? <QuizUI data={userClassroom}></QuizUI> : <div>
          
        </div>}
        </div>
    </div>
  );
}

function QuizUI({data}: {data: classroom}) {
  return <div className="w-full">
    <p className="text-white text-4xl">Quizzes</p>
    <hr className="h-1 w-full bg-white" />
    <div className="pt-8">
      <SpecialExpandableCard cards={data.quizzes.filter(e => !e.completed).map(e => {
        return {
          title: e.name,
          description: e.name,
          content: () => {
            return <div>Your MOM</div>
          },
          src: "https://media.istockphoto.com/id/1273544978/photo/open-book-with-pages-on-a-red-background.jpg?s=612x612&w=0&k=20&c=38NYzQmRrACHMIggxFrPMm4bdux0-sSPBYcJPMEP1rY="
        }
      })}></SpecialExpandableCard>
    </div>
  </div>
}
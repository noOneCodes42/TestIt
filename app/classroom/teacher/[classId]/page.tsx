'use client'
import { PixelatedCanvas } from "@/components/ui/pixelated-canvas";
import { LucideHamburger, MenuIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { SpecialSidebar } from "./sidebar"
import { Suspense, use, useState } from "react";
import { TabProvider, useTab } from "./context";
import { SpecialExpandableCard } from "./expandable-card";
import useSWR from "swr";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { QuizDialog } from "./dialog";
import { RadioGroup } from "@/components/ui/radio-group";
import { RadioGroupItem } from "@radix-ui/react-radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("Failed to fetch teachers");
    return r.json();
  });

export default function Home({ params: parameters }: { params: any }) {
  const params: any = use(parameters);
  const { data } = useSWR(`${process.env.NEXT_PUBLIC_URL}/classroom/${params.classId}`, fetcher, { suspense: true })
  return <Suspense fallback={<div className="w-screen h-screen bg-black grid place-items-center">
    <Spinner className="w-[200px] h-[200px] text-white" />
  </div>}><TabProvider>
      <Page classId={params.classId} data={data} />
    </TabProvider>
  </Suspense>
}

interface dataInterface {
  status: string;
  classroom: classroom;
  members: teacher,
  quizzes: [quiz_info],
  your_role: "student" | "teacher"
}

export function Page({ classId, data }: { classId: string, data: dataInterface }) {
  const ctx = useTab()
  if (!data || data.your_role != "teacher") return <div className="w-screen h-screen bg-black grid place-items-center">
    <Spinner className="w-[200px] h-[200px] text-white" />
  </div>;
  return (
    <div className="flex">
      <div className="z-10 bg-neutral-800">
        <SpecialSidebar data={data.classroom}></SpecialSidebar>
      </div>
      <div className="flex flex-wrap gap-6 min-h-screen w-full font-sans bg-black p-8">
        {ctx.currentTab == "quiz" ? <QuizUI data={data}></QuizUI> : <div>

        </div>}
      </div>
    </div>
  );
}

const QuizContent = ({ classroomId, quizId }: any) => {
  const { data: quizData, error, isLoading } = useSWR(
    `${process.env.NEXT_PUBLIC_URL}/classroom/${classroomId}/quiz/${quizId}`,
    fetcher
  )

  if (isLoading) {
    return (
      <div className="w-full h-full p-6 place-items-center">
        <Spinner className="w-[100px] h-[100px]" />
      </div>
    )
  }

  if (error) {
    return <div>Failed to load quiz</div>
  }

  if (!quizData) {
    return <div>No quiz data found</div>
  }
  const mappings = ["A", "B", "C", "D"]
  return (
    <div>
      {quizData.map((e:any, k:number) => {
        return <div key={k}>
          <p className="text-white text-xl mb-4">{e.question_text}</p>
          <RadioGroup className="mb-4">
           {e.options.map((j:string, i:number) => {
            return  <div key={i} className="flex items-center gap-3" defaultValue={e.correct_answer[0]}>
              <RadioGroupItem disabled value={j} id={`r${i}`} className={`w-4 h-4 ${i == mappings.indexOf(e.correct_answer[0]) ? "bg-blue-700" : "bg-black"} rounded-full`} />
              <Label htmlFor={`r${i}`}>{j}</Label>
            </div>
           })}
          </RadioGroup>
        </div>
      })}
    </div>
  )
}


function QuizUI({ data }: { data: dataInterface }) {
  return <div className="w-full">
    <p className="text-white text-4xl">Quizzes</p>
    <hr className="h-1 w-full bg-white" />
    <div className="pt-8">
      <div className="grid place-items-center">
        <QuizDialog classId={data.classroom.id}></QuizDialog>
      </div>
      <p className="text-2xl text-white pt-16 mb-4">Past Quizzes</p>
      <SpecialExpandableCard cards={data.quizzes.map(e => {
        return {
          title: e.name,
          description: `Created on ${new Date(e.created_at).toDateString()}`,
          content: () => <QuizContent classroomId={data.classroom.id} quizId={e.id} />,
          src: "https://media.istockphoto.com/id/1273544978/photo/open-book-with-pages-on-a-red-background.jpg?s=612x612&w=0&k=20&c=38NYzQmRrACHMIggxFrPMm4bdux0-sSPBYcJPMEP1rY="
        }
      }) || []}></SpecialExpandableCard>
    </div>
  </div>
}
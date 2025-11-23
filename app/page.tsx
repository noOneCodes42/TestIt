'use client'
import { PixelatedCanvas } from "@/components/ui/pixelated-canvas";
import Image from "next/image";
import { Suspense, useEffect, useRef, useState } from "react";
import { SpecialSidebar } from "./sidebar";
import { TabProvider, useTab, useUser } from "./context";
import { DialogDemo } from "./dialog";
import useSWR from "swr"
import { Spinner } from "@/components/ui/spinner";
import { fetcher } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ClassroomDialog } from "./classroom_dialog";

export default function Home() {

  return <Suspense fallback={<div className="w-screen h-screen bg-black grid place-items-center">
            <Spinner className="w-[200px] h-[200px] text-white" />
          </div>}>
    <TabProvider>
      <Page></Page>
  </TabProvider>
  </Suspense>
}

interface classroomres {
  status: string;
  classrooms: classroom[]
}

export function TeacherPage({open, setOpen}: {open: boolean, setOpen: any}) {
  const {data} = useSWR<classroomres>(`${process.env.NEXT_PUBLIC_URL}/classrooms`, fetcher, {suspense: true})
  const teachers = data?.classrooms ?? []
  return <>
    {teachers.length ? teachers.map(e => <div key={e.id} className="bg-neutral-primary-soft block max-w-sm border border-blue-400 h-80 rounded-xl rounded-base shadow-xs">
        <div className="h-16 bg-blue-400 rounded-tr-xl rounded-tl-xl grid place-items-center">
          <p className="text-xl text-center text-black font-bold">{e.name}</p>
        </div>
                 <PixelatedCanvas
            src={e.teacher.image_url}
            width={300}
            height={200}
            cellSize={3}
            dotScale={0.9}
            shape="square"
            backgroundColor="#000000"
            dropoutStrength={0.4}
            interactive
            distortionStrength={3}
            distortionRadius={80}
            distortionMode="swirl"
            followSpeed={0.2}
            jitterStrength={4}
            jitterSpeed={4}
            sampleAverage
            tintColor="#FFFFFF"
            tintStrength={0.2}
            className="rounded-xl border border-neutral-800 shadow-lg"
        />
    <div className="pt-3 pl-3">
        <p className="text-base text-white">{e.teacher.first_name} {e.teacher.last_name}</p>
        <ClassroomDialog open={open} setOpen={setOpen} hideButton={true}></ClassroomDialog>
    </div>
</div>) : <div className="w-full h-full grid place-items-center">
      <div className="grid place-items-center space-y-10">
        <p className="text-white text-center text-5xl">Join Your First Classroom</p>
        <ClassroomDialog open={open} setOpen={setOpen}></ClassroomDialog>
      </div>
  </div>}
  </>
}

export function Page() {
  const {currentUser, setCurrentUser} = useUser()
  const [teachers, setTeachers] = useState<teacher[]>([])
  const [open, setOpen] = useState(false)
  if(!currentUser) return null

  return (
    
    <div className="flex">
    <div className="z-10 bg-neutral-800">
                <SpecialSidebar data={currentUser as teacher} setOpen={setOpen}></SpecialSidebar>
            </div>
    <div className="flex flex-wrap gap-6 min-h-screen w-full font-sans bg-black p-8">
      <Suspense fallback={<div className="w-full h-full bg-transparent grid place-items-center">
                <Spinner className="w-[100px] h-[100px] text-white" />
              </div>}>
        <TeacherPage open={open} setOpen={setOpen} ></TeacherPage>
      </Suspense>
    </div>
    </div>
  );
}

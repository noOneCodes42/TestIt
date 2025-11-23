'use client'
import { PixelatedCanvas } from "@/components/ui/pixelated-canvas";
import { LucideHamburger, MenuIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { SpecialSidebar } from "./sidebar"
import { Suspense, use, useEffect, useRef, useState } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  if (!data || data.your_role != "student") return <div className="w-screen h-screen bg-black grid place-items-center">
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

const QuizContent = ({ classroomId, quizId, ref }: any) => {
  const { data: quizData, error, isLoading } = useSWR(
    `${process.env.NEXT_PUBLIC_URL}/classroom/${classroomId}/quiz/${quizId}`,
    fetcher
  )
   // Move ALL hooks to the top, before any conditional returns
  const [answers, setAnswers] = useState<number[]>([])
  const [err, setError] = useState("")
  // Initialize answers once when quizData is available
  useEffect(() => {
    if (quizData && answers.length === 0) {
      setAnswers(Array(quizData.length).fill(-1))
    }
  }, [quizData, answers.length])
  
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
  return (
    <div className="space-y-4">
      {quizData[0].map((e:any, k:number) => {
        return <div key={k} className="border-2 rounded-2xl p-4 border-neutral-700">
          <p className="text-white text-xl mb-4">{k+1}. {e.question_text}</p>
          <RadioGroup className="mb-4">
           {e.options.map((j:string, i:number) => {
            return  <div key={i} className="flex items-center gap-3">
              <RadioGroupItem value={j} id={`r${i}${k}`} onClick={() => {
                const a = structuredClone(answers)
                a.splice(k, 1, i)
                setAnswers(a)
              }} className={`w-4 h-4 rounded-full ${answers[k] == i ? "bg-blue-700" : "bg-black"}`} />
              <Label htmlFor={`r${i}${k}`} onClick={() => {
                const a = structuredClone(answers)
                a.splice(k, 1, i)
                setAnswers(a)
              }}>{j}</Label>
            </div>
           })}
          </RadioGroup>
        </div>
      })}
      <div className="w-full grid place-items-center">
        <p className="text-red-700 text-xl text-center" style={{lineBreak: "anywhere"}}>{err}</p>
        <Button variant={"secondary"} disabled={answers.indexOf(-1) != -1} onClick={async () => {
          const letters = ["A", "B", "C", "D"]
          ref.current?.click()
          try {
            const req = await fetch(`${process.env.NEXT_PUBLIC_URL}/results/${quizId}/answers/${answers.map(e => letters[e]).join("")}`, {
              method: "POST",
              credentials: "include"
            })
            if(!req.ok) {
              const json = await req.json()
              setError(JSON.stringify(json.detail))
            } else {
              const json = await req.json()
              let {correct_answers, user_answers} = json
              user_answers = user_answers[0].split("")
              const score = correct_answers.filter((e: number, i: number) => e == user_answers[i]).length
              alert(`You got a ${score} out of ${answers.length}, which is: ${(score / answers.length * 100).toFixed(1)}%`)
              window.location.reload()
            }
          } catch(_) {
            setError("An internal server error has occured, please try again")
          }

        }}>Submit</Button>
      </div>
    </div>
  )
}

const ReviewQuizContent = ({ classroomId, quizId }: any) => {
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
  const user_answers = JSON.parse(quizData[1][0].answer)[0].split("")
  return (
    <div>
      {quizData[0].map((e:any, k: number) => {
        return <div key={k}>
          <p className="text-white text-xl mb-4">{e.question_text}</p>
          <RadioGroup className="mb-4">
           {e.options.map((j:string, i:number) => {
            return  <div key={i} className="flex items-center gap-3" defaultValue={e.correct_answer[0]}>
              <RadioGroupItem disabled value={j} id={`r${i}`} className={`w-4 h-4 ${mappings.indexOf(e.correct_answer[0]) == i ?  "bg-blue-700" : user_answers[k] == mappings[i] ? "bg-red-700" :  "bg-black"} rounded-full`} />
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
  const ref = useRef(null)
  return <div className="w-full">
    <p className="text-white text-4xl">Quizzes</p>
    <hr className="h-1 w-full bg-white" />
    <div className="pt-8">
      <p className="text-2xl text-white pt-16 mb-4">New Quizzes</p>
      <SpecialExpandableCard ref={ref} cards={data.quizzes.filter(e => !e.is_completed).map(e => {
        return {
          title: e.name,
          description: `Created on ${new Date(e.created_at).toDateString()}`,
          content: () => <QuizContent classroomId={data.classroom.id} quizId={e.id} ref={ref} />,
          src: "https://media.istockphoto.com/id/1273544978/photo/open-book-with-pages-on-a-red-background.jpg?s=612x612&w=0&k=20&c=38NYzQmRrACHMIggxFrPMm4bdux0-sSPBYcJPMEP1rY="
        }
      }) || []}></SpecialExpandableCard>
      <p className="text-2xl text-white pt-16 mb-4">Past Quizzes</p>
      <SpecialExpandableCard ref={ref} cards={data.quizzes.filter(e => e.is_completed ||  Date.parse(e.created_at) < (Date.now() - 640800000)).map(e => {
        return {
          title: e.name,
          description: `Created on ${new Date(e.created_at).toDateString()}`,
          content: () => <ReviewQuizContent classroomId={data.classroom.id} quizId={e.id} />,
          src: "https://media.istockphoto.com/id/1273544978/photo/open-book-with-pages-on-a-red-background.jpg?s=612x612&w=0&k=20&c=38NYzQmRrACHMIggxFrPMm4bdux0-sSPBYcJPMEP1rY="
        }
      }) || []}></SpecialExpandableCard>
    </div>
  </div>
}
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Ref, useRef } from "react"
import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileUpload } from "@/components/ui/file-upload"

// Updated schema to include name field
const formSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  file: z
    .instanceof(File)
    .refine((file) => file.size > 0, "File is required")
    .refine((file) => file.size <= 5 * 1024 * 1024, "File size must be less than 5MB"),
  num_questions: z
    .number()
    .min(1, "Number of questions must be at least 1")
    .max(50, "Number of questions cannot exceed 50"),
  mcq: z
    .number()
    .min(0, "MCQ count cannot be negative")
    .max(50, "MCQ count cannot exceed total number of questions")
})

function CreateQuizForm({classId}: {classId: string}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      file: undefined,
      num_questions: 0, // Default value
      mcq: 0, // Default value
    },
  })

  // Watch the values to calculate frq and validate mcq
  const numQuestions = form.watch("num_questions") || 0
  const mcqCount = form.watch("mcq") || 0

  // Calculate FRQ count (num_questions - mcq)
  const frqCount = Math.max(0, numQuestions - mcqCount)

  async function onSubmit(data: z.infer<typeof formSchema>) {
    // Create FormData for file upload
    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('file', data.file)
    formData.append('num_questions', data.num_questions.toString())
    formData.append('mcq', data.mcq.toString())
    formData.append('frq', '0') // Always set frq to 0 as requested
    formData.append('classroom_id', classId) // Always set frq to 0 as requested


    let req = await fetch(`${process.env.NEXT_PUBLIC_URL}/generate-quiz`, {
      method: "POST",
      credentials: "include",
      body: formData
    })
    
    if(!req.ok) {
      try {
        const json = await req.json()
        form.setError("root", {message: JSON.stringify(json.detail)})
      } catch(_) {
        form.setError("root", {message: "An Internal Server Error has occurred, please try again"})
      }
    } else {
      window.location.reload()
    }
  }

  // Handle file input change
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      form.setValue("file", file)
      form.clearErrors("file")
    }
  }

  // Handle name input change
  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue("name", event.target.value)
    form.clearErrors("name")
  }

  // Handle number input changes
  const handleNumQuestionsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value) || 0
    form.setValue("num_questions", value)
    
    // Adjust mcq if it exceeds the new total
    const currentMcq = form.getValues("mcq") || 0
    if (currentMcq > value) {
      form.setValue("mcq", value)
    }
  }

  const handleMcqChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value) || 0
    form.setValue("mcq", value)
  }

  return (
    <Card className="w-full sm:max-w-md bg-neutral-600 border-none">
      <CardHeader>
        <CardTitle className="text-neutral-200">Create Classroom</CardTitle>
        <CardDescription className="text-neutral-200">
          Create Your Own Testit Classroom
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="form-rhf-demo" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {/* Name Field */}
            <Field>
              <FieldLabel htmlFor="form-rhf-demo-name" className="text-neutral-200">
                Quiz Name
              </FieldLabel>
              <Input 
                id="form-rhf-demo-name"
                type="text"
                className="border-neutral-800 text-white"
                aria-invalid={!!form.formState.errors.name}
                value={form.watch("name") || ""}
                onChange={handleNameChange}
                placeholder="Enter quiz name"
                maxLength={100}
              />
              {form.formState.errors.name && (
                <FieldError errors={[form.formState.errors.name]} />
              )}
              <FieldDescription className="text-neutral-300 mt-1">
                {form.watch("name")?.length || 0}/100 characters
              </FieldDescription>
            </Field>

            {/* File Upload Field */}
            <Field>
              <FieldLabel htmlFor="form-rhf-demo-file" className="text-neutral-200">
                File
              </FieldLabel>
              <Input 
                id="form-rhf-demo-file"
                type="file"
                className="border-neutral-800 text-white"
                aria-invalid={!!form.formState.errors.file}
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,.quiz,.json"
              />
              {form.formState.errors.file && (
                <FieldError errors={[form.formState.errors.file]} />
              )}
              {form.watch("file") && (
                <FieldDescription className="text-neutral-300 mt-2">
                  Selected file: {form.watch("file").name}
                </FieldDescription>
              )}
            </Field>

            {/* Number of Questions Field */}
            <Field>
              <FieldLabel htmlFor="form-rhf-demo-num-questions" className="text-neutral-200">
                Number of Questions
              </FieldLabel>
              <Input 
                id="form-rhf-demo-num-questions"
                type="number"
                min="1"
                max="50"
                className="border-neutral-800 text-white"
                aria-invalid={!!form.formState.errors.num_questions}
                value={form.watch("num_questions") || ""}
                onChange={handleNumQuestionsChange}
                placeholder="Enter number of questions (1-50)"
              />
              {form.formState.errors.num_questions && (
                <FieldError errors={[form.formState.errors.num_questions]} />
              )}
            </Field>

            {/* MCQ Count Field */}
            <Field>
              <FieldLabel htmlFor="form-rhf-demo-mcq" className="text-neutral-200">
                Number of MCQ Questions
              </FieldLabel>
              <Input 
                id="form-rhf-demo-mcq"
                type="number"
                min="0"
                max={numQuestions}
                className="border-neutral-800 text-white"
                aria-invalid={!!form.formState.errors.mcq}
                value={form.watch("mcq") || ""}
                onChange={handleMcqChange}
                placeholder={`Enter MCQ count (0-${numQuestions})`}
              />
              {form.formState.errors.mcq && (
                <FieldError errors={[form.formState.errors.mcq]} />
              )}
              <FieldDescription className="text-neutral-300 mt-2">
                FRQ Questions: {frqCount} (automatically calculated)
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Field orientation="horizontal">
          <Button 
            type="button" 
            className="bg-neutral-500 text-neutral-50" 
            variant="secondary" 
            onClick={() => {
              form.reset({ 
                name: "",
                file: undefined, 
                num_questions: 10, 
                mcq: 5 
              })
              const fileInput = document.getElementById('form-rhf-demo-file') as HTMLInputElement
              if (fileInput) fileInput.value = ''
            }}
          >
            Reset
          </Button>
          <Button 
            type="submit" 
            form="form-rhf-demo"
            disabled={!form.watch("file") || !form.watch("name")}
          >
            Submit
          </Button>
        </Field>
      </CardFooter>
      {form.formState.errors.root && (
        <p className="text-red-700 pl-6 text-sm" style={{lineBreak: "anywhere"}}>
          {form.formState.errors.root.message}
        </p>
      )}
    </Card>
  )
}

export function QuizDialog({classId}: {classId: string}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={"secondary"}>+ Create Quiz</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-neutral-800 border-none p-0 overflow-hidden">
        <ScrollArea className="max-h-[80vh] w-full">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-neutral-200">Create Quiz</DialogTitle>
              <DialogDescription className="text-neutral-200">
                Upload a file and configure your quiz
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              <CreateQuizForm classId={classId} />
            </div>

            <DialogFooter className="mt-6" style={{justifyContent: "center"}}>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
            </DialogFooter>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
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

const formSchemaCreate = z.object({
  name: z
    .string()
    .min(4, "Name must be at least 4 characters.")
})

const formSchemaJoin = z.object({
  classroom_id: z
    .string()
    .min(4, "Name must be at least 4 characters.")
})



function UserCreateForm() {
  const form = useForm<z.infer<typeof formSchemaCreate>>({
    resolver: zodResolver(formSchemaCreate),
    defaultValues: {
      name: "",
    },
  })

  async function onSubmit(data: z.infer<typeof formSchemaCreate>) {
    let req = await fetch(`${process.env.NEXT_PUBLIC_URL}/classroom`, {
        method: "POST",
        credentials: "include",
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    if(!req.ok) {
        try {
            const json = await req.json()
            form.setError("root", {message: JSON.stringify(json.detail)})
        } catch(_) {
            form.setError("root", {message: "An Internal Server Error has occured, please try again"})
        }
    } else {
        window.location.reload()
    }
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
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-rhf-demo-email" className="text-neutral-200">
                    Name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-rhf-demo-email"
                    className="border-neutral-800 text-white"
                    aria-invalid={fieldState.invalid}
                    placeholder="name..."
                    autoComplete="on"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Field orientation="horizontal">
          <Button type="button" className="bg-neutral-500 text-neutral-50" variant="secondary" onClick={() => form.reset({name: ""})}>
            Reset
          </Button>
          <Button type="submit" form="form-rhf-demo">
            Submit
          </Button>
        </Field>
      </CardFooter>
            {form.formState.errors.root && (
                    <p className="text-red-700 pl-6 text-sm" style={{lineBreak: "anywhere"}}>{form.formState.errors.root.message}</p>
                  )}
    </Card>
  )
}

function UserJoinForm() {
  const form = useForm<z.infer<typeof formSchemaJoin>>({
    resolver: zodResolver(formSchemaJoin),
    defaultValues: {
      classroom_id: "",
    },
  })

  async function onSubmit(data: z.infer<typeof formSchemaJoin>) {
    let req = await fetch(`${process.env.NEXT_PUBLIC_URL}/classroom/join`, {
        method: "POST",
        credentials: "include",
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    if(!req.ok) {
        try {
            const json = await req.json()
            form.setError("root", {message: JSON.stringify(json.detail)})
        } catch(_) {
            form.setError("root", {message: "An Internal Server Error has occured, please try again"})
        }
    } else {
        window.location.reload()
    }
  }

  return (
    <Card className="w-full sm:max-w-md bg-neutral-600 border-none">
      <CardHeader>
        <CardTitle className="text-neutral-200">Join Classroom</CardTitle>
        <CardDescription className="text-neutral-200">
            Join an existing Testit Classroom
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="form-rhf-demo" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="classroom_id"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-rhf-demo-email" className="text-neutral-200">
                    Classroom ID
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-rhf-demo-email"
                    className="border-neutral-800 text-white"
                    aria-invalid={fieldState.invalid}
                    placeholder="classroom..."
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Field orientation="horizontal">
          <Button type="button" className="bg-neutral-500 text-neutral-50" variant="secondary" onClick={() => form.reset({classroom_id: ""})}>
            Reset
          </Button>
          <Button type="submit" form="form-rhf-demo">
            Submit
          </Button>
        </Field>
      </CardFooter>
            {form.formState.errors.root && (
                    <p className="text-red-700 pl-6 text-sm" style={{lineBreak: "anywhere"}}>{form.formState.errors.root.message}</p>
                  )}
    </Card>
  )
}

export function ClassroomDialog({open, hideButton, setOpen}: {open: boolean, hideButton?: boolean, setOpen: any}) {
    const [tab, setTab] = React.useState<"create" | "join">("create")
  return (
    <Dialog open={open} onOpenChange={(e) => setOpen(e)}>
      <form>
        <DialogTrigger asChild>
          <Button variant={"secondary"} style={{display: hideButton ? "none" : "block"}}>+ Classroom</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] bg-neutral-800 border-none p-0 overflow-hidden">
          <ScrollArea className="max-h-[80vh] w-full">
            <div className="p-6"> {/* Add padding container inside ScrollArea */}
              <DialogHeader>
                <DialogTitle className="text-neutral-200">Login / Signup</DialogTitle>
                <DialogDescription className="text-neutral-200">
                  Create / Join a Classroom
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid place-items-center">
                <Tabs value={tab} className="w-full max-w-[400px]">
                  <TabsList className="bg-neutral-600">
                    <TabsTrigger
                      value="create"
                      className="text-white"
                      onClick={() => setTab("create")}
                    >
                      Create
                    </TabsTrigger>
                    <TabsTrigger
                      value="join"
                      className="text-white"
                      onClick={() => setTab("join")}
                    >
                      Join
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="mt-4">
                {tab === "create" ? <UserCreateForm /> : <UserJoinForm />}
              </div>

              <DialogFooter className="mt-6" style={{justifyContent: "center"}}>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
              </DialogFooter>
            </div>
          </ScrollArea>
        </DialogContent>
      </form>
    </Dialog>
  )
}
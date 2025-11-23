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

const formSchemaSignup = z.object({
  email: z
    .email(),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters."),
  first_name: z
    .string(),
  last_name: z
    .string(),
  pronouns: z
    .string(),
  image_url: z
    .url()
})

const formSchemaLogin = z.object({
  email: z
    .email(),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters.")
})

function UserSignupForm() {
  const form = useForm<z.infer<typeof formSchemaSignup>>({
    resolver: zodResolver(formSchemaSignup),
    defaultValues: {
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      pronouns: "",
      image_url: ""
    },
  })

  async function onSubmit(data: z.infer<typeof formSchemaSignup>) {
    let req = await fetch(`${process.env.NEXT_PUBLIC_URL}/signup`, {
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
        <CardTitle className="text-neutral-200">Signup Form</CardTitle>
        <CardDescription className="text-neutral-200">
            Create a new account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="form-rhf-signin" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-rhf-signin-email" className="text-neutral-200">
                    Email
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-rhf-signin-email"
                    className="border-neutral-800 text-white"
                    aria-invalid={fieldState.invalid}
                    placeholder="email..."
                    autoComplete="on"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-rhf-signin-password text-white" className="text-neutral-200">
                    Password
                  </FieldLabel>
                  <Input
                    {...field}
                    type="password"
                    id="form-rhf-signin-password"
                    className="border-neutral-800 text-white"
                    aria-invalid={fieldState.invalid}
                    placeholder="password..."
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="first_name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-rhf-signin-first_name text-white" className="text-neutral-200">
                    First Name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-rhf-signin-first_name"
                    className="border-neutral-800 text-white"
                    aria-invalid={fieldState.invalid}
                    placeholder="First name......"
                    autoComplete="on"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="last_name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-rhf-signin-last_name text-white" className="text-neutral-200">
                    Last Name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-rhf-signin-last_name"
                    className="border-neutral-800 text-white"
                    aria-invalid={fieldState.invalid}
                    placeholder="Last name......"
                    autoComplete="on"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="pronouns"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-rhf-signin-pronoun text-white" className="text-neutral-200">
                    Pronouns
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-rhf-signin-pronoun"
                    className="border-neutral-800 text-white"
                    aria-invalid={fieldState.invalid}
                    placeholder="Mr, Mrs, etc..."
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="image_url"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-rhf-signin-image_url text-white" className="text-neutral-200">
                    Image URL
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-rhf-signin-image_url"
                    className="border-neutral-800 text-white"
                    aria-invalid={fieldState.invalid}
                    placeholder="Image URL..."
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
          <Button type="button" className="bg-neutral-500 text-neutral-50" variant="secondary" onClick={() => form.reset({email: "", password: "", first_name: "", last_name: "", image_url: "", pronouns: ""})}>
            Reset
          </Button>
          <Button type="submit" form="form-rhf-signin">
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

function UserLoginForm() {
  const form = useForm<z.infer<typeof formSchemaLogin>>({
    resolver: zodResolver(formSchemaLogin),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(data: z.infer<typeof formSchemaLogin>) {
    let req = await fetch(`${process.env.NEXT_PUBLIC_URL}/login`, {
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
        <CardTitle className="text-neutral-200">Login Form</CardTitle>
        <CardDescription className="text-neutral-200">
            Login to an already existing account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="form-rhf-demo" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-rhf-demo-email" className="text-neutral-200">
                    Email
                  </FieldLabel>
                  <Input
                    {...field}
                    id="form-rhf-demo-email"
                    className="border-neutral-800 text-white"
                    aria-invalid={fieldState.invalid}
                    placeholder="email..."
                    autoComplete="on"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="form-rhf-demo-password text-white" className="text-neutral-200">
                    Password
                  </FieldLabel>
                  <Input
                    {...field}
                    type="password"
                    id="form-rhf-demo-password"
                    className="border-neutral-800 text-white"
                    aria-invalid={fieldState.invalid}
                    placeholder="password..."
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
          <Button type="button" className="bg-neutral-500 text-neutral-50" variant="secondary" onClick={() => form.reset({email: "", password: ""})}>
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

export function DialogDemo({open}: {open: boolean}) {
    const [tab, setTab] = React.useState<"login" | "signup">("login")
  return (
    <Dialog open={open}>
      <form>
        <DialogTrigger asChild>
          <Button variant="outline" className="hidden"></Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] bg-neutral-800 border-none p-0 overflow-hidden">
          <ScrollArea className="max-h-[80vh] w-full">
            <div className="p-6"> {/* Add padding container inside ScrollArea */}
              <DialogHeader>
                <DialogTitle className="text-neutral-200">Login / Signup</DialogTitle>
                <DialogDescription className="text-neutral-200">
                  The Login / Signup Popup
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 grid place-items-center">
                <Tabs value={tab} className="w-full max-w-[400px]">
                  <TabsList className="bg-neutral-600">
                    <TabsTrigger
                      value="login"
                      className="text-white"
                      onClick={() => setTab("login")}
                    >
                      Login
                    </TabsTrigger>
                    <TabsTrigger
                      value="signup"
                      className="text-white"
                      onClick={() => setTab("signup")}
                    >
                      Signup
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="mt-4">
                {tab === "login" ? <UserLoginForm /> : <UserSignupForm />}
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
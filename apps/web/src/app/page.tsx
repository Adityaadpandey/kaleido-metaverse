
import { auth, signIn } from "@/lib/auth"

export default async function SignIn() {
  const session = await auth()

  if (!session) {
    return (
      <form
        action={async () => {
          "use server"
          await signIn("github")
        }}
      >
        <button type="submit">Signin with GitHub</button>
      </form>
    )
  }
  console.log(session)
  return (
    <div>
      <p>Already signed in</p>
      <pre>{JSON.stringify(session, null, 2)}</pre>
    </div>
  )

}

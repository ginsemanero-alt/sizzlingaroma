"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn, type LoginState } from "@/app/actions/auth";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signIn, {});
  const [show, setShow] = useState(false);
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error && (
        <p className="rounded-2xl bg-bad-soft px-4 py-3 text-sm font-semibold text-bad" role="alert">
          {state.error}
        </p>
      )}
      <Field id="login" label="Email or username" error={fe.login}>
        <input
          id="login"
          name="login"
          className="input"
          autoComplete="username"
          autoCapitalize="none"
          autoFocus
          required
          defaultValue={state.values?.login}
          aria-invalid={!!fe.login}
          aria-describedby={fe.login ? "login-error" : undefined}
        />
      </Field>
      <Field id="password" label="Password" error={fe.password}>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            className="input pr-12"
            autoComplete="current-password"
            required
            aria-invalid={!!fe.password}
            aria-describedby={fe.password ? "password-error" : undefined}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-muted hover:bg-sand"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      <SubmitButton pending={pending} className="btn-primary w-full py-3.5 text-base">
        Sign in
      </SubmitButton>
    </form>
  );
}

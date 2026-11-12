"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, Pencil, ShieldCheck, UserPlus, Users } from "lucide-react";
import { createUser, resetPassword, updateUser } from "@/app/actions/users";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ROLE_LABEL } from "@/lib/permissions";
import type { AppRole, Profile } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const ROLE_HELP: Record<AppRole, string> = {
  owner: "Everything, incl. reports, products, menu & users",
  staff: "Dashboard, products (stock only), inventory, scan, expiry, sales, best sellers",
  kitchen: "Kitchen inventory only (Phase 2)",
  dine_in: "Dine-in / front inventory only (Phase 2)",
};
const ROLE_STYLE: Record<AppRole, string> = {
  owner: "bg-primary text-white",
  staff: "bg-ink text-white",
  kitchen: "bg-warn-soft text-warn",
  dine_in: "bg-sky-100 text-sky-700",
};

export function UsersManager({ users, emails, meId, canCreate }: { users: Profile[]; emails: Record<string, string>; meId: string; canCreate: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<{ kind: "new" } | { kind: "edit"; user: Profile } | { kind: "password"; user: Profile } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const close = () => {
    setMode(null);
    setErrors({});
  };
  const done = (res: Awaited<ReturnType<typeof createUser>>) => {
    if (!res.ok) {
      setErrors(res.fieldErrors ?? {});
      toast.error(res.error);
      return;
    }
    toast.success(res.message);
    close();
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {!canCreate && (
        <p className="rounded-3xl bg-warn-soft px-5 py-4 text-sm font-semibold text-warn">
          Set <code className="font-mono">SUPABASE_SECRET_KEY</code> on the server to create users and reset passwords here. Roles and access can still be changed.
        </p>
      )}
      <div className="flex justify-end">
        <button type="button" className="btn-primary" disabled={!canCreate} onClick={() => setMode({ kind: "new" })}><UserPlus className="size-4" /> Add user</button>
      </div>
      {users.length === 0 ? (
        <div className="card"><EmptyState icon={<Users className="size-7" />} title="No users" /></div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {users.map((u) => (
            <li key={u.id} className={cn("card flex flex-col gap-3 p-5", !u.active && "opacity-70")}>
              <div className="flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-lg font-black text-primary">{(u.name || "?").slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black">{u.name || "Unnamed"} {u.id === meId && <span className="text-xs font-semibold text-muted">(you)</span>}</p>
                  <p className="truncate text-xs text-muted">{u.username ? `@${u.username}` : emails[u.id] ?? "—"}</p>
                  <p className="text-[11px] text-muted">Since {formatDate(u.created_at)}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={cn("badge", ROLE_STYLE[u.role])}><ShieldCheck className="size-3" /> {ROLE_LABEL[u.role]}</span>
                <span className={cn("badge", u.active ? "bg-ok-soft text-ok" : "bg-bad-soft text-bad")}>{u.active ? "Active" : "Disabled"}</span>
              </div>
              <div className="mt-auto flex gap-2">
                <button type="button" className="btn-ghost flex-1" onClick={() => setMode({ kind: "edit", user: u })}><Pencil className="size-4" /> Edit</button>
                {canCreate && <button type="button" className="btn-ghost" onClick={() => setMode({ kind: "password", user: u })} aria-label={`Reset password for ${u.name}`}><KeyRound className="size-4" /></button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={mode?.kind === "new"} onClose={close} title="Add user">
        <form
          noValidate
          className="space-y-4"
          action={(fd) =>
            start(async () =>
              done(await createUser({
                name: String(fd.get("name") ?? ""),
                login: String(fd.get("login") ?? ""),
                password: String(fd.get("password") ?? ""),
                role: String(fd.get("role") ?? "staff") as AppRole,
              })),
            )
          }
        >
          <Field id="nu-name" label="Full name" error={errors.name}><input id="nu-name" name="name" className="input" required aria-invalid={!!errors.name} /></Field>
          <Field id="nu-login" label="Username or email" error={errors.login} hint="A username like “maria” signs in without an email."><input id="nu-login" name="login" className="input" autoCapitalize="none" required aria-invalid={!!errors.login} /></Field>
          <Field id="nu-pass" label="Temporary password" error={errors.password}><input id="nu-pass" name="password" type="password" minLength={8} className="input" autoComplete="new-password" required aria-invalid={!!errors.password} /></Field>
          <RoleSelect id="nu-role" defaultValue="staff" />
          <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={close}>Cancel</button><SubmitButton pending={pending}>Create user</SubmitButton></div>
        </form>
      </Modal>

      <Modal open={mode?.kind === "edit"} onClose={close} title="Edit user">
        {mode?.kind === "edit" && (
          <form
            noValidate
            className="space-y-4"
            action={(fd) =>
              start(async () =>
                done(await updateUser({ id: mode.user.id, name: String(fd.get("name") ?? ""), role: String(fd.get("role")) as AppRole, active: fd.get("active") === "on" })),
              )
            }
          >
            <Field id="eu-name" label="Full name"><input id="eu-name" name="name" className="input" defaultValue={mode.user.name} required /></Field>
            <RoleSelect id="eu-role" defaultValue={mode.user.role} />
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="active" defaultChecked={mode.user.active} className="size-5 accent-[#FF5A1F]" /> Account active (can sign in)</label>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={close}>Cancel</button><SubmitButton pending={pending}>Save</SubmitButton></div>
          </form>
        )}
      </Modal>

      <Modal open={mode?.kind === "password"} onClose={close} title="Reset password">
        {mode?.kind === "password" && (
          <form noValidate className="space-y-4" action={(fd) => start(async () => done(await resetPassword(mode.user.id, String(fd.get("password") ?? ""))))}>
            <p className="text-sm text-muted">Set a new password for <strong className="text-ink">{mode.user.name}</strong>.</p>
            <Field id="rp-pass" label="New password" error={errors.password}><input id="rp-pass" name="password" type="password" minLength={8} className="input" autoComplete="new-password" required /></Field>
            <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={close}>Cancel</button><SubmitButton pending={pending}>Change password</SubmitButton></div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function RoleSelect({ id, defaultValue }: { id: string; defaultValue: AppRole }) {
  const [role, setRole] = useState<AppRole>(defaultValue);
  return (
    <Field id={id} label="Role" hint={ROLE_HELP[role]}>
      <select id={id} name="role" className="input" value={role} onChange={(e) => setRole(e.target.value as AppRole)}>
        {(Object.keys(ROLE_LABEL) as AppRole[]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
      </select>
    </Field>
  );
}

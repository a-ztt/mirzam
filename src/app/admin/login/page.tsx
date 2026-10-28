import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  clearLoginAttempt,
  getSession,
  getLoginThrottle,
  registerFailedLoginAttempt,
  setAdminSession,
  validateAdminCredentials,
} from "@/lib/auth";

export const runtime = "nodejs";

function getClientIpFromHeaders(headersStore: Headers): string {
  const xForwardedFor = headersStore.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const xRealIp = headersStore.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();

  return "unknown";
}

function buildLoginThrottleKey(user: string, ip: string): string {
  return `${ip.toLowerCase()}|${user.trim().toLowerCase() || "-"}`;
}

async function delayMs(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session) redirect("/admin");

  async function loginAction(formData: FormData) {
    "use server";

    const user = String(formData.get("user") ?? "");
    const password = String(formData.get("password") ?? "");
    const headersStore = await headers();
    const clientIp = getClientIpFromHeaders(headersStore);
    const throttleKey = buildLoginThrottleKey(user, clientIp);

    const throttle = getLoginThrottle(throttleKey);
    if (throttle.blocked) {
      const store = await cookies();
      store.set("ap_login_error", "1", { path: "/", maxAge: 10 });
      redirect("/admin/login");
    }

    if (!validateAdminCredentials({ user, password })) {
      registerFailedLoginAttempt(throttleKey);
      await delayMs(500);
      const store = await cookies();
      store.set("ap_login_error", "1", { path: "/", maxAge: 10 });
      redirect("/admin/login");
    }

    clearLoginAttempt(throttleKey);
    await setAdminSession();
    redirect("/admin");
  }

  const store = await cookies();
  const hasError = store.get("ap_login_error")?.value === "1";

  return (
    <main className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Вход администратора</h1>

      {hasError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          Неверный логин или пароль.
        </div>
      ) : null}

      <form
        action={loginAction}
        className="space-y-3 rounded-xl border bg-white p-4"
      >
        <div>
          <label className="text-sm font-medium text-slate-700">Логин</label>
          <input
            name="user"
            defaultValue="admin"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            autoComplete="username"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-700">Пароль</label>
          <input
            name="password"
            type="password"
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            autoComplete="current-password"
          />
        </div>

        <button className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Войти
        </button>
      </form>
    </main>
  );
}

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  CaptchaField,
  type CaptchaFieldHandle,
} from "@/components/auth/captcha-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkReservedNickname } from "@/lib/reserved-names";

const fieldClass =
  "border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/25";
const labelClass = "text-sm font-medium text-slate-200";

export function UserAuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const captchaRef = useRef<CaptchaFieldHandle>(null);
  const isRegister = mode === "register";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password || !captchaAnswer) return;
    if (isRegister) {
      const reservedError = checkReservedNickname(username);
      if (reservedError) {
        setError(reservedError);
        return;
      }
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        isRegister ? "/api/user/register" : "/api/user/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nickname: username,
            password,
            captchaToken,
            captchaAnswer,
          }),
        }
      );
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        captchaFailed?: boolean;
      } | null;
      if (!res.ok) {
        // 验证码错误或密码错误都要换新验证码，防止同一验证码反复尝试
        captchaRef.current?.refresh();
        setCaptchaAnswer("");
        throw new Error(data?.error ?? "操作失败");
      }
      router.push("/user");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className={labelClass}>
          用户名
        </label>
        <Input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={labelClass}>
          密码
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isRegister ? "new-password" : "current-password"}
          required
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="captcha" className={labelClass}>
          图形验证
        </label>
        <CaptchaField
          ref={captchaRef}
          answer={captchaAnswer}
          onAnswerChange={setCaptchaAnswer}
          onTokenChange={setCaptchaToken}
        />
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500"
      >
        {loading && <Loader2 className="animate-spin" />}
        {isRegister ? "注册并登录" : "登录"}
      </Button>

      <p className="text-center text-sm text-slate-400">
        {isRegister ? (
          <>
            已有账号？{" "}
            <Link href="/user/login" className="font-medium text-cyan-300 hover:text-cyan-200">
              去登录
            </Link>
          </>
        ) : (
          <>
            还没有账号？{" "}
            <Link
              href="/user/register"
              className="font-medium text-cyan-300 hover:text-cyan-200"
            >
              去注册
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

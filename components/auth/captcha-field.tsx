"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { RefreshCw } from "lucide-react";

import { Input } from "@/components/ui/input";

export interface CaptchaFieldHandle {
  /** 重新拉取验证码并清空已输入答案 */
  refresh: () => void;
}

/**
 * 图形验证码字段：右侧图片点击可换，看不清也可点刷新。
 * token 通过 onTokenChange 上报给父表单，随登录/注册请求一起提交。
 */
export const CaptchaField = forwardRef<
  CaptchaFieldHandle,
  {
    answer: string;
    onAnswerChange: (value: string) => void;
    onTokenChange: (token: string) => void;
  }
>(function CaptchaField({ answer, onAnswerChange, onTokenChange }, ref) {
  const [svg, setSvg] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/captcha");
      const data = (await res.json()) as { token: string; svg: string };
      setSvg(data.svg);
      onTokenChange(data.token);
    } finally {
      setLoading(false);
    }
  }, [onTokenChange]);

  useEffect(() => {
    load();
  }, [load]);

  useImperativeHandle(ref, () => ({ refresh: load }), [load]);

  return (
    <div className="flex gap-2">
      <Input
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value.toUpperCase())}
        placeholder="验证码"
        maxLength={4}
        autoComplete="off"
        className="flex-1 border-white/10 bg-white/5 uppercase tracking-widest text-white placeholder:text-slate-500 focus-visible:border-cyan-400/60 focus-visible:ring-cyan-400/25"
      />
      <button
        type="button"
        onClick={load}
        aria-label="看不清，换一张"
        title="看不清，换一张"
        className="group relative h-9 w-28 shrink-0 overflow-hidden rounded-md border border-input bg-white"
      >
        {svg ? (
          <span
            className="block [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : null}
        <span className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 transition-opacity group-hover:opacity-100">
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
        </span>
      </button>
    </div>
  );
});

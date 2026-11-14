import { useMemo } from "react";
import { Check, X } from "lucide-react";

const labels = ["Muito fraca", "Fraca", "Razoável", "Forte", "Muito forte"];
const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];

export function calcStrength(pwd: string) {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[a-z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

export function PasswordStrength({ password }: { password: string }) {
  const strength = useMemo(() => calcStrength(password), [password]);
  const rules = [
    { ok: password.length >= 8, label: "Mínimo 8 caracteres" },
    { ok: /[A-Z]/.test(password), label: "Uma letra maiúscula" },
    { ok: /[a-z]/.test(password), label: "Uma letra minúscula" },
    { ok: /[0-9]/.test(password), label: "Um número" },
    { ok: /[^A-Za-z0-9]/.test(password), label: "Um símbolo" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all"
            style={{
              background: i < strength ? colors[strength - 1] : "rgba(255,255,255,0.08)",
              boxShadow: i < strength ? `0 0 8px ${colors[strength - 1]}80` : "none",
            }}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="uppercase tracking-[0.18em] text-white/40">Força</span>
        <span style={{ color: strength > 0 ? colors[strength - 1] : "rgba(255,255,255,0.4)" }}>
          {strength > 0 ? labels[strength - 1] : "—"}
        </span>
      </div>
      <ul className="grid grid-cols-1 gap-1 pt-1 text-[11px] sm:grid-cols-2">
        {rules.map((r) => (
          <li key={r.label} className="flex items-center gap-1.5">
            <span
              className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full transition"
              style={{ background: r.ok ? "#10b981" : "rgba(255,255,255,0.08)" }}
            >
              {r.ok ? (
                <Check className="h-2 w-2 text-white" />
              ) : (
                <X className="h-2 w-2 text-white/30" />
              )}
            </span>
            <span className={r.ok ? "text-white/80" : "text-white/40"}>{r.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
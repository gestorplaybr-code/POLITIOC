import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Vote,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import heroComicio from "@/assets/hero-comicio.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Política+" },
      { name: "description", content: "Acesse a plataforma cinematográfica de gestão política." },
    ],
  }),
  component: AuthPage,
});

const display = { fontFamily: "var(--font-display)", letterSpacing: "0.01em" };

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
});

const signupSchema = z
  .object({
    nome: z.string().trim().min(2, "Informe seu nome completo"),
    email: z.string().trim().email("E-mail inválido"),
    password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
    confirmPassword: z.string(),
    aceito: z.literal(true, { message: "Você precisa aceitar a Política de Privacidade." }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

function calcStrength(pwd: string) {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[a-z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

const strengthLabels = ["Muito fraca", "Fraca", "Razoável", "Forte", "Muito forte"];
const strengthColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div
      className="grid min-h-screen text-white lg:grid-cols-[1.2fr_1fr]"
      style={{ background: "#05050f", fontFamily: "var(--font-body)" }}
    >
      <CinematicPanel />
      <div className="relative flex items-center justify-center px-6 py-12 sm:px-12">
        <div
          className="absolute inset-0 -z-10 lg:hidden"
          style={{ background: "linear-gradient(180deg,rgba(5,5,15,0.6),#05050f 60%)" }}
        />
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-sm text-white/60 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Voltar para o site
            </Link>
          </div>

          <h2 className="text-5xl leading-none sm:text-6xl" style={display}>
            {tab === "login" ? "Bem-vindo de volta." : "Crie sua conta."}
          </h2>
          <p className="mt-3 text-white/60">
            {tab === "login"
              ? "Entre e continue conduzindo sua campanha."
              : "Em minutos sua plataforma estará no ar."}
          </p>

          <div className="mt-8 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            {(["login", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="relative rounded-full px-4 py-2 text-sm font-medium transition"
                style={
                  tab === t
                    ? {
                        background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                        boxShadow: "0 0 20px rgba(79,70,229,0.5)",
                      }
                    : { color: "rgba(255,255,255,0.6)" }
                }
              >
                {t === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {tab === "login" ? (
              <LoginForm
                loading={loading}
                setLoading={setLoading}
                onForgot={() => setResetOpen(true)}
              />
            ) : (
              <SignupForm loading={loading} setLoading={setLoading} />
            )}
          </div>
        </div>
      </div>

      <ResetDialog open={resetOpen} onOpenChange={setResetOpen} />
    </div>
  );
}

function CinematicPanel() {
  return (
    <div className="relative hidden overflow-hidden lg:block">
      <img
        src={heroComicio}
        alt="Comício político brasileiro"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ animation: "kenburns 28s ease-out infinite alternate" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(5,5,15,0.85) 0%, rgba(5,5,15,0.4) 50%, rgba(79,70,229,0.4) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 30% 70%, rgba(79,70,229,0.4), transparent 60%)" }}
      />
      <div className="relative flex h-full flex-col justify-between p-12">
        <Link to="/" className="flex items-center gap-2">
          <div
            className="grid h-10 w-10 place-items-center rounded-md"
            style={{ background: "linear-gradient(135deg,#4f46e5,#818cf8)" }}
          >
            <Vote className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl tracking-widest" style={display}>
            POLÍTICA+
          </span>
        </Link>
        <div className="max-w-xl">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.4em] text-indigo-300/80">
            <span className="h-px w-10 bg-indigo-300/60" />
            Cinema da gestão política
          </div>
          <h1
            className="mt-6 text-6xl leading-[0.9] sm:text-7xl xl:text-8xl"
            style={display}
          >
            A campanha
            <br />
            <span
              style={{
                background: "linear-gradient(90deg,#818cf8,#c4b5fd,#4f46e5)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              começa aqui.
            </span>
          </h1>
          <p className="mt-6 text-lg text-white/70">
            Pleitos, eleitores, coordenadores, enquetes e WhatsApp em uma só experiência.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          © {new Date().getFullYear()} Política+
        </div>
      </div>
      <style>{`@keyframes kenburns{0%{transform:scale(1.05)}100%{transform:scale(1.18) translate(-1%,-1%)}}`}</style>
    </div>
  );
}

/* ---------------- Inputs ---------------- */

type FieldProps = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string | null;
  valid?: boolean;
  autoComplete?: string;
  rightSlot?: React.ReactNode;
  onKeyUp?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
};

function Field({
  id, label, icon: Icon, type = "text", value, onChange, onBlur, error, valid,
  autoComplete, rightSlot, onKeyUp, placeholder,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs uppercase tracking-widest text-white/60">
        {label}
      </label>
      <div
        className="group relative flex items-center rounded-xl border bg-white/5 backdrop-blur transition focus-within:bg-white/[0.08]"
        style={{
          borderColor: error ? "#ef4444" : valid ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.1)",
          boxShadow: error
            ? "0 0 0 3px rgba(239,68,68,0.15)"
            : "0 0 0 0 transparent",
        }}
      >
        <Icon className="ml-3.5 h-4 w-4 shrink-0 text-white/40" />
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyUp={onKeyUp}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="w-full bg-transparent px-3 py-3 text-sm text-white placeholder-white/30 outline-none"
        />
        {rightSlot ? <div className="pr-2">{rightSlot}</div> : null}
        {valid && !error && !rightSlot && (
          <Check className="mr-3 h-4 w-4 shrink-0 text-emerald-400" />
        )}
      </div>
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="h-3 w-3" /> {error}
        </div>
      )}
    </div>
  );
}

function SubmitButton({
  loading, children, disabled,
}: {
  loading: boolean;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      disabled={loading || disabled}
      className="h-12 w-full rounded-xl text-base font-semibold"
      style={{
        background: disabled
          ? "rgba(79,70,229,0.3)"
          : "linear-gradient(135deg,#4f46e5,#6366f1)",
        boxShadow: disabled ? "none" : "0 0 40px rgba(79,70,229,0.5)",
      }}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
    </Button>
  );
}

/* ---------------- Login ---------------- */

function LoginForm({
  loading, setLoading, onForgot,
}: {
  loading: boolean;
  setLoading: (v: boolean) => void;
  onForgot: () => void;
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [capsOn, setCapsOn] = useState(false);

  const emailValid = emailRegex.test(email.trim());
  const emailError = touched.email && email && !emailValid ? "E-mail inválido" : null;
  const pwdError = touched.password && password.length > 0 && password.length < 6
    ? "Mínimo 6 caracteres"
    : null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Credenciais inválidas." : error.message);
      return;
    }
    toast.success("Bem-vindo!");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        id="login-email"
        label="E-mail"
        icon={Mail}
        type="email"
        value={email}
        onChange={setEmail}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        valid={emailValid}
        error={emailError}
        autoComplete="email"
        placeholder="voce@exemplo.com"
      />
      <Field
        id="login-password"
        label="Senha"
        icon={Lock}
        type={showPwd ? "text" : "password"}
        value={password}
        onChange={setPassword}
        onBlur={() => setTouched((t) => ({ ...t, password: true }))}
        error={pwdError}
        autoComplete="current-password"
        placeholder="••••••••"
        onKeyUp={(e) => setCapsOn(e.getModifierState && e.getModifierState("CapsLock"))}
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="grid h-8 w-8 place-items-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white"
            aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />
      {capsOn && (
        <div className="flex items-center gap-1.5 text-xs text-amber-400">
          <AlertCircle className="h-3 w-3" /> Caps Lock está ativado
        </div>
      )}

      <SubmitButton loading={loading}>Entrar</SubmitButton>

      <button
        type="button"
        onClick={onForgot}
        className="block w-full text-center text-sm text-white/60 transition hover:text-indigo-300"
      >
        Esqueci minha senha
      </button>
    </form>
  );
}

/* ---------------- Signup ---------------- */

function SignupForm({
  loading, setLoading,
}: {
  loading: boolean;
  setLoading: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [aceito, setAceito] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [touched, setTouched] = useState({ nome: false, email: false, password: false, confirm: false });

  const nomeValid = nome.trim().length >= 2;
  const emailValid = emailRegex.test(email.trim());
  const strength = useMemo(() => calcStrength(password), [password]);
  const checks = {
    len: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    num: /[0-9]/.test(password),
    sym: /[^A-Za-z0-9]/.test(password),
  };
  const matchOk = confirm.length > 0 && password === confirm;
  const canSubmit = nomeValid && emailValid && strength >= 3 && matchOk && aceito;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ nome: true, email: true, password: true, confirm: true });
    const parsed = signupSchema.safeParse({ nome, email, password, confirmPassword: confirm, aceito });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { nome: parsed.data.nome },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada! Bem-vindo.");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        id="su-nome"
        label="Nome completo"
        icon={User}
        value={nome}
        onChange={setNome}
        onBlur={() => setTouched((t) => ({ ...t, nome: true }))}
        valid={nomeValid}
        error={touched.nome && nome && !nomeValid ? "Informe seu nome completo" : null}
        placeholder="Maria Silva"
      />
      <Field
        id="su-email"
        label="E-mail"
        icon={Mail}
        type="email"
        value={email}
        onChange={setEmail}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        valid={emailValid}
        error={touched.email && email && !emailValid ? "E-mail inválido" : null}
        autoComplete="email"
        placeholder="voce@exemplo.com"
      />
      <div>
        <Field
          id="su-password"
          label="Senha"
          icon={Lock}
          type={showPwd ? "text" : "password"}
          value={password}
          onChange={setPassword}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          autoComplete="new-password"
          placeholder="Crie uma senha forte"
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="grid h-8 w-8 place-items-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white"
              aria-label={showPwd ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
        {password.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-full transition-all"
                  style={{
                    background: i < strength ? strengthColors[strength - 1] : "rgba(255,255,255,0.1)",
                    boxShadow: i < strength ? `0 0 8px ${strengthColors[strength - 1]}80` : "none",
                  }}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/50">Força:</span>
              <span style={{ color: strength > 0 ? strengthColors[strength - 1] : "rgba(255,255,255,0.4)" }}>
                {strength > 0 ? strengthLabels[strength - 1] : "—"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <Rule ok={checks.len} label="8+ caracteres" />
              <Rule ok={checks.upper} label="Letra maiúscula" />
              <Rule ok={checks.lower} label="Letra minúscula" />
              <Rule ok={checks.num} label="Número" />
              <Rule ok={checks.sym} label="Símbolo (!@#)" />
            </div>
          </div>
        )}
      </div>
      <Field
        id="su-confirm"
        label="Confirmar senha"
        icon={Lock}
        type={showPwd ? "text" : "password"}
        value={confirm}
        onChange={setConfirm}
        onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
        valid={matchOk}
        error={
          touched.confirm && confirm.length > 0 && !matchOk
            ? "As senhas não coincidem"
            : null
        }
        autoComplete="new-password"
        placeholder="Repita a senha"
      />

      <label className="flex cursor-pointer items-start gap-3 text-sm text-white/70">
        <input
          type="checkbox"
          checked={aceito}
          onChange={(e) => setAceito(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-indigo-500"
        />
        <span>
          Aceito a{" "}
          <Link to="/politica-privacidade" className="text-indigo-300 underline-offset-2 hover:underline">
            Política de Privacidade
          </Link>{" "}
          e os termos de uso.
        </span>
      </label>

      <SubmitButton loading={loading} disabled={!canSubmit}>
        <Sparkles className="h-4 w-4" /> Criar conta
      </SubmitButton>
    </form>
  );
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="grid h-4 w-4 shrink-0 place-items-center rounded-full transition"
        style={{
          background: ok ? "#10b981" : "rgba(255,255,255,0.08)",
        }}
      >
        {ok ? <Check className="h-2.5 w-2.5 text-white" /> : <X className="h-2.5 w-2.5 text-white/30" />}
      </div>
      <span style={{ color: ok ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)" }}>{label}</span>
    </div>
  );
}

/* ---------------- Reset Dialog ---------------- */

function ResetDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const valid = emailRegex.test(email.trim());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Se o e-mail existir, enviamos instruções.");
    onOpenChange(false);
    setEmail("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-white/10 text-white sm:max-w-md"
        style={{ background: "#0a0a1a" }}
      >
        <DialogHeader>
          <DialogTitle className="text-3xl" style={display}>
            Recuperar senha
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field
            id="reset-email"
            label="E-mail"
            icon={Mail}
            type="email"
            value={email}
            onChange={setEmail}
            valid={valid}
            placeholder="voce@exemplo.com"
            autoComplete="email"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-white/70 hover:bg-white/10 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!valid || sending}
              style={{
                background: !valid
                  ? "rgba(79,70,229,0.3)"
                  : "linear-gradient(135deg,#4f46e5,#6366f1)",
                boxShadow: !valid ? "none" : "0 0 30px rgba(79,70,229,0.5)",
              }}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
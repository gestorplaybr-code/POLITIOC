import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Vote,
  Users,
  BarChart3,
  ShieldCheck,
  MessageCircle,
  Map,
  Flag,
  FileText,
  ArrowRight,
  Play,
  Sparkles,
} from "lucide-react";
import heroComicio from "@/assets/hero-comicio.jpg";
import eleitor from "@/assets/eleitor-sorrindo.jpg";
import bairro from "@/assets/bairro-mapa.jpg";
import whatsapp from "@/assets/whatsapp-celular.jpg";
import dashboard from "@/assets/dashboard-mockup.jpg";
import coordenadores from "@/assets/coordenadores.jpg";
import dadosRede from "@/assets/dados-rede.jpg";
import ogCover from "@/assets/og-cover.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Política+ — Cinema da Gestão Política" },
      {
        name: "description",
        content:
          "Plataforma cinematográfica para políticos, candidatos e equipes. Pleitos, eleitores, enquetes e WhatsApp em um só lugar.",
      },
      { property: "og:title", content: "Política+ — Cinema da Gestão Política" },
      {
        property: "og:description",
        content: "Gestão política completa, vibrante e fácil de entender. Para vencer a próxima eleição.",
      },
      { property: "og:image", content: ogCover },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: ogCover },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div
      className="min-h-screen overflow-x-hidden text-white antialiased"
      style={{ background: "#05050f", fontFamily: "var(--font-body)" }}
    >
      <Nav />
      <Hero />
      <Problema />
      <Solucao />
      <Capitulos />
      <ComoFunciona />
      <Stats />
      <Seguranca />
      <CtaFinal />
      <Footer />
    </div>
  );
}

const display = { fontFamily: "var(--font-display)", letterSpacing: "0.01em" };

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 backdrop-blur-xl" style={{ background: "rgba(5,5,15,0.6)" }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md" style={{ background: "linear-gradient(135deg,#4f46e5,#818cf8)" }}>
            <Vote className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl tracking-widest" style={display}>POLÍTICA+</span>
        </Link>
        <Link to="/auth">
          <Button className="rounded-full px-6" style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 0 30px rgba(79,70,229,0.4)" }}>
            Entrar
          </Button>
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-screen items-end overflow-hidden pb-16 pt-32 sm:pb-24">
      <img
        src={heroComicio}
        alt="Comício político brasileiro vibrante com multidão e bandeiras"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ animation: "kenburns 24s ease-out infinite alternate" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(5,5,15,0.85) 0%, rgba(5,5,15,0.3) 35%, rgba(5,5,15,0.6) 75%, #05050f 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 70% 40%, rgba(79,70,229,0.35), transparent 60%)" }}
      />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-6">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.4em] text-indigo-300/80">
          <span className="h-px w-10 bg-indigo-300/60" />
          Uma nova era da gestão política
        </div>
        <h1
          className="mt-6 max-w-5xl text-6xl leading-[0.9] sm:text-8xl md:text-9xl lg:text-[10rem]"
          style={display}
        >
          A campanha
          <br />
          <span style={{ background: "linear-gradient(90deg,#818cf8,#c4b5fd,#4f46e5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            começa aqui.
          </span>
        </h1>
        <p className="mt-8 max-w-2xl text-lg text-white/70 sm:text-xl">
          A plataforma cinematográfica que une políticos, equipes e eleitores em uma única experiência.
          Gestão completa, intuitiva e feita para vencer.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link to="/auth">
            <Button size="lg" className="h-14 rounded-full px-8 text-base" style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 0 50px rgba(79,70,229,0.6)" }}>
              <Play className="h-5 w-5 fill-current" /> Acessar plataforma
            </Button>
          </Link>
          <a href="#capitulos">
            <Button size="lg" variant="outline" className="h-14 rounded-full border-white/30 bg-white/5 px-8 text-base text-white hover:bg-white/10 hover:text-white">
              Descobrir como funciona <ArrowRight className="h-5 w-5" />
            </Button>
          </a>
        </div>
      </div>
      <style>{`@keyframes kenburns{0%{transform:scale(1.05) translate(0,0)}100%{transform:scale(1.18) translate(-1.5%,-1%)}}`}</style>
    </section>
  );
}

function Problema() {
  const atos = [
    { n: "01", t: "Planilhas perdidas", d: "Dados de eleitores espalhados em dezenas de arquivos sem controle." },
    { n: "02", t: "Equipe desconectada", d: "Coordenadores sem visão do que acontece em cada bairro." },
    { n: "03", t: "Decisão no escuro", d: "Sem números reais, campanhas se perdem em achismos." },
  ];
  return (
    <section className="relative px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs uppercase tracking-[0.4em] text-indigo-400">Capítulo I</p>
        <h2 className="mt-4 max-w-3xl text-5xl leading-[0.95] sm:text-7xl" style={display}>
          Gestão política não precisa ser caos.
        </h2>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {atos.map((a) => (
            <div key={a.n} className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
              <div className="text-5xl text-indigo-400" style={display}>{a.n}</div>
              <h3 className="mt-4 text-2xl" style={display}>{a.t}</h3>
              <p className="mt-2 text-white/60">{a.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Solucao() {
  return (
    <section className="relative overflow-hidden px-6 py-32">
      <img src={dadosRede} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" loading="lazy" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#05050f 0%,transparent 50%,#05050f 100%)" }} />
      <div className="relative mx-auto grid max-w-7xl items-center gap-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="text-xs uppercase tracking-[0.4em] text-indigo-400">Capítulo II</p>
          <h2 className="mt-4 text-5xl leading-[0.95] sm:text-7xl" style={display}>
            Tudo em um único lugar.
          </h2>
          <p className="mt-6 text-lg text-white/70">
            Uma plataforma desenhada para quem não é técnico. Interface intuitiva, números claros,
            decisões rápidas. Como assistir a um filme — só que você é o protagonista.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm text-indigo-300">
            <Sparkles className="h-4 w-4" /> Pronto em minutos. Sem treinamento.
          </div>
        </div>
        <div className="md:col-span-7">
          <div className="relative">
            <div className="absolute -inset-8 rounded-3xl" style={{ background: "radial-gradient(circle,#4f46e5 0%,transparent 70%)", filter: "blur(40px)", opacity: 0.5 }} />
            <img
              src={dashboard}
              alt="Dashboard da plataforma Política+ exibindo métricas"
              className="relative w-full rounded-2xl border border-white/10 shadow-2xl"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Capitulos() {
  const itens = [
    {
      n: "01",
      icon: Flag,
      title: "Políticos & Candidatos",
      desc: "Cadastre quem você representa. Histórico, partido, cargo, redes sociais — tudo num único perfil.",
      img: eleitor,
      span: "md:col-span-7",
    },
    {
      n: "02",
      icon: Vote,
      title: "Pleitos Eleitorais",
      desc: "Organize cada eleição como um capítulo. Vereador, prefeito, deputado — você no controle.",
      img: ogCover,
      span: "md:col-span-5",
    },
    {
      n: "03",
      icon: Map,
      title: "Eleitores & Território",
      desc: "Veja sua base por bairro, cidade e estado. Saiba onde você é forte e onde precisa crescer.",
      img: bairro,
      span: "md:col-span-5",
    },
    {
      n: "04",
      icon: Users,
      title: "Coordenadores em Rede",
      desc: "Sua equipe organizada por território. Cada coordenador com sua área, suas metas, seus eleitores.",
      img: coordenadores,
      span: "md:col-span-7",
    },
    {
      n: "05",
      icon: MessageCircle,
      title: "WhatsApp em Massa",
      desc: "Envie mensagens personalizadas para milhares de eleitores. Com templates, variáveis e relatórios.",
      img: whatsapp,
      span: "md:col-span-7",
    },
    {
      n: "06",
      icon: BarChart3,
      title: "Enquetes & Relatórios",
      desc: "Ouça sua base. Crie enquetes, colete respostas, gere relatórios em PDF e Excel num clique.",
      img: dadosRede,
      span: "md:col-span-5",
    },
  ];
  return (
    <section id="capitulos" className="relative px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-20 flex items-end justify-between gap-8">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-indigo-400">Capítulo III</p>
            <h2 className="mt-4 max-w-3xl text-5xl leading-[0.95] sm:text-7xl" style={display}>
              Seis módulos.<br />Uma só história.
            </h2>
          </div>
          <p className="hidden max-w-sm text-white/60 md:block">
            Cada módulo foi pensado para ser entendido sem manual. Aponte, clique, decida.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-12">
          {itens.map((it) => (
            <article
              key={it.n}
              className={`${it.span} group relative col-span-12 overflow-hidden rounded-3xl border border-white/10`}
              style={{ background: "#0a0a1a" }}
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={it.img}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 30%,rgba(5,5,15,0.95) 100%)" }} />
                <div className="absolute left-6 top-6 text-5xl text-white/90" style={display}>{it.n}</div>
                <div className="absolute right-6 top-6 grid h-12 w-12 place-items-center rounded-full backdrop-blur" style={{ background: "rgba(79,70,229,0.3)" }}>
                  <it.icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-3xl sm:text-4xl" style={display}>{it.title}</h3>
                <p className="mt-3 text-white/65">{it.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComoFunciona() {
  const passos = [
    { n: "1", t: "Cadastre", d: "Em minutos: seu político, seus pleitos, sua base de eleitores." },
    { n: "2", t: "Engaje", d: "Dispare mensagens, lance enquetes, ative coordenadores." },
    { n: "3", t: "Analise", d: "Relatórios visuais, dashboards em tempo real, decisões certeiras." },
  ];
  return (
    <section className="relative px-6 py-32" style={{ background: "linear-gradient(180deg,#05050f,#0a0a1a 50%,#05050f)" }}>
      <div className="mx-auto max-w-7xl">
        <p className="text-xs uppercase tracking-[0.4em] text-indigo-400">Capítulo IV</p>
        <h2 className="mt-4 max-w-3xl text-5xl leading-[0.95] sm:text-7xl" style={display}>
          Três passos.<br />Resultado imediato.
        </h2>
        <div className="mt-20 grid gap-12 md:grid-cols-3">
          {passos.map((p, i) => (
            <div key={p.n} className="relative">
              <div className="text-[8rem] leading-none text-transparent sm:text-[10rem]" style={{ ...display, WebkitTextStroke: "1px #4f46e5" }}>
                {p.n}
              </div>
              <h3 className="mt-2 text-3xl" style={display}>{p.t}</h3>
              <p className="mt-2 text-white/65">{p.d}</p>
              {i < 2 && <div className="absolute right-0 top-20 hidden h-px w-16 bg-gradient-to-r from-indigo-500 to-transparent md:block" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { n: "100K+", l: "eleitores gerenciados" },
    { n: "5.5K", l: "municípios atendidos" },
    { n: "98%", l: "taxa de entrega WhatsApp" },
    { n: "24/7", l: "disponibilidade" },
  ];
  return (
    <section className="relative px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-12 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l}>
              <div className="text-6xl leading-none sm:text-7xl md:text-8xl" style={{ ...display, background: "linear-gradient(180deg,#fff,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {s.n}
              </div>
              <div className="mt-3 text-xs uppercase tracking-[0.3em] text-white/50">{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Seguranca() {
  const itens = [
    { icon: ShieldCheck, t: "LGPD nativo", d: "Conformidade com a Lei Geral de Proteção de Dados desde o primeiro clique." },
    { icon: Users, t: "Multiusuário", d: "Perfis com permissões granulares. Cada equipe vê apenas o que precisa." },
    { icon: FileText, t: "Auditoria total", d: "Cada ação registrada. Saiba sempre quem fez o quê e quando." },
  ];
  return (
    <section className="relative px-6 py-32">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs uppercase tracking-[0.4em] text-indigo-400">Capítulo V</p>
        <h2 className="mt-4 max-w-3xl text-5xl leading-[0.95] sm:text-7xl" style={display}>
          Confiança em cada<br />linha de código.
        </h2>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {itens.map((it) => (
            <div key={it.t} className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur">
              <div className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: "linear-gradient(135deg,#4f46e5,#818cf8)" }}>
                <it.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-6 text-2xl" style={display}>{it.t}</h3>
              <p className="mt-2 text-white/60">{it.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaFinal() {
  return (
    <section className="relative overflow-hidden px-6 py-40">
      <img src={ogCover} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(5,5,15,0.7),rgba(5,5,15,0.95))" }} />
      <div className="relative mx-auto max-w-5xl text-center">
        <h2 className="text-6xl leading-[0.9] sm:text-8xl md:text-9xl" style={display}>
          A próxima eleição<br />
          <span style={{ background: "linear-gradient(90deg,#818cf8,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            é sua.
          </span>
        </h2>
        <p className="mx-auto mt-8 max-w-xl text-lg text-white/70">
          Comece agora. Sem cartão de crédito. Sem instalação. Sem complicação.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link to="/auth">
            <Button size="lg" className="h-16 rounded-full px-10 text-lg" style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)", boxShadow: "0 0 60px rgba(79,70,229,0.8)" }}>
              <Play className="h-5 w-5 fill-current" /> Entrar agora
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-white/40 md:flex-row">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded" style={{ background: "linear-gradient(135deg,#4f46e5,#818cf8)" }}>
            <Vote className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="tracking-widest" style={display}>POLÍTICA+</span>
        </div>
        <div>© {new Date().getFullYear()} Política+ — Cinema da Gestão Política</div>
        <Link to="/politica-privacidade" className="hover:text-white">Política de Privacidade</Link>
      </div>
    </footer>
  );
}

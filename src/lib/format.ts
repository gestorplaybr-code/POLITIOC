export function maskCpf(cpf?: string | null): string {
  if (!cpf) return "—";
  const d = cpf.replace(/\D/g, "");
  if (d.length < 11) return cpf;
  return `***.***.***-${d.slice(-2)}`;
}

export function formatCpf(cpf?: string | null): string {
  if (!cpf) return "";
  const d = cpf.replace(/\D/g, "").slice(0, 11);
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function isValidCpf(cpf?: string | null): boolean {
  if (!cpf) return false;
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const calc = (slice: number) => {
    let sum = 0;
    for (let i = 0; i < slice; i++) sum += parseInt(d[i]) * (slice + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(d[9]) && calc(10) === parseInt(d[10]);
}

export function formatPhone(p?: string | null): string {
  if (!p) return "";
  const d = p.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return p;
}

export function formatDateTime(s?: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return s;
  }
}

export function formatDate(s?: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("pt-BR");
  } catch {
    return s;
  }
}

export const QUESTION_TYPES = [
  { value: "unica",       label: "Escolha única — 1 resposta (radio)",     hint: "O eleitor marca APENAS UMA opção da lista. Ideal para intenção de voto." },
  { value: "multipla",    label: "Múltipla escolha — várias (checkbox)",   hint: "O eleitor pode marcar VÁRIAS opções. Ideal para checklists e prioridades." },
  { value: "simnao",      label: "Sim ou Não (2 botões fixos)",             hint: "Resposta binária. NÃO usa lista de opções — apenas Sim/Não." },
  { value: "escala",      label: "Escala 0 a 10 (NPS)",                     hint: "O eleitor escolhe uma nota de 0 a 10. Ideal para avaliação/NPS." },
  { value: "texto",       label: "Resposta curta (1 linha)",                hint: "Campo de texto curto. Use para nome, frase, palavra-chave." },
  { value: "longa",       label: "Resposta longa / dissertativa",           hint: "Caixa de texto grande. Use para opiniões e justificativas." },
  { value: "telefone",    label: "Telefone",                                hint: "Campo com máscara de telefone." },
  { value: "cpf",         label: "CPF",                                     hint: "Valida o CPF informado." },
  { value: "email",       label: "E-mail",                                  hint: "Valida o formato do e-mail." },
  { value: "data",        label: "Data",                                    hint: "Seletor de data." },
  { value: "endereco",    label: "Endereço",                                hint: "Texto livre para endereço." },
  { value: "cidade",      label: "Cidade",                                  hint: "Cidade do eleitor." },
  { value: "bairro",      label: "Bairro",                                  hint: "Bairro do eleitor." },
  { value: "localizacao", label: "Localização (GPS)",                       hint: "Captura coordenadas do dispositivo." },
  { value: "observacao",  label: "Observação livre",                        hint: "Campo aberto para observações adicionais." },
] as const;

export function questionTypeLabel(t: string): string {
  return QUESTION_TYPES.find((q) => q.value === t)?.label ?? t;
}

export function questionTypeHint(t: string): string {
  return (QUESTION_TYPES.find((q) => q.value === t) as any)?.hint ?? "";
}

export const TIPOS_COM_OPCOES = new Set(["unica", "multipla"]);
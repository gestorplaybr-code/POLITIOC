export type TemplatePergunta = {
  texto: string;
  tipo: string;
  obrigatoria?: boolean;
  permitir_outro?: boolean;
  opcoes?: string[];
};

export type EnqueteTemplate = {
  id: string;
  nome: string;
  descricao: string;
  emoji: string;
  perguntas: TemplatePergunta[];
};

export const ENQUETE_TEMPLATES: EnqueteTemplate[] = [
  {
    id: "satisfacao",
    nome: "Pesquisa de satisfação",
    descricao: "Avalie como o eleitor se sente sobre seu mandato em 4 perguntas.",
    emoji: "⭐",
    perguntas: [
      { texto: "De 0 a 10, como você avalia o trabalho desenvolvido?", tipo: "escala", obrigatoria: true },
      { texto: "Você se sente representado pelo nosso mandato?", tipo: "simnao", obrigatoria: true },
      { texto: "O que você mais valoriza no nosso trabalho?", tipo: "unica", obrigatoria: false, permitir_outro: true, opcoes: ["Transparência", "Proximidade com a comunidade", "Propostas concretas", "Atendimento das demandas"] },
      { texto: "Deixe um comentário (opcional)", tipo: "longa", obrigatoria: false },
    ],
  },
  {
    id: "checklist-bairro",
    nome: "Checklist de demandas do bairro",
    descricao: "Múltipla escolha com as principais áreas de demanda.",
    emoji: "📋",
    perguntas: [
      { texto: "Quais áreas mais precisam de atenção no seu bairro? (marque todas que se aplicam)", tipo: "multipla", obrigatoria: true, permitir_outro: true, opcoes: ["Saúde", "Segurança", "Asfalto e calçadas", "Iluminação pública", "Coleta de lixo", "Transporte público", "Educação", "Lazer e esporte"] },
      { texto: "Conte um pouco mais sobre a principal demanda do seu bairro", tipo: "longa", obrigatoria: false },
    ],
  },
  {
    id: "nps",
    nome: "NPS / Recomendação",
    descricao: "Mede a chance de o eleitor recomendar seu mandato.",
    emoji: "📈",
    perguntas: [
      { texto: "De 0 a 10, qual a chance de você recomendar nosso mandato a um amigo?", tipo: "escala", obrigatoria: true },
      { texto: "Por quê?", tipo: "longa", obrigatoria: false },
    ],
  },
  {
    id: "simnao-rapido",
    nome: "Sim ou Não rápido",
    descricao: "Uma única pergunta binária. Ótimo para consultas express.",
    emoji: "✅",
    perguntas: [
      { texto: "Você apoia esta proposta?", tipo: "simnao", obrigatoria: true },
    ],
  },
  {
    id: "a-ou-b",
    nome: "A ou B (duas opções)",
    descricao: "Escolha entre duas alternativas. Edite as opções depois.",
    emoji: "🅰️",
    perguntas: [
      { texto: "Qual das duas alternativas você prefere?", tipo: "unica", obrigatoria: true, opcoes: ["Opção A", "Opção B"] },
      { texto: "Quer justificar sua escolha?", tipo: "longa", obrigatoria: false },
    ],
  },
  {
    id: "prioridades",
    nome: "Múltipla escolha de prioridades",
    descricao: "Eleitor escolhe as prioridades para o próximo mandato.",
    emoji: "🎯",
    perguntas: [
      { texto: "Quais devem ser as 3 prioridades do próximo mandato?", tipo: "multipla", obrigatoria: true, permitir_outro: true, opcoes: ["Saúde", "Educação", "Segurança", "Emprego e renda", "Mobilidade urbana", "Meio ambiente"] },
    ],
  },
];
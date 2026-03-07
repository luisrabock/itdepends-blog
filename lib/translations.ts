export type Language = "pt-BR" | "en";

export const translations = {
  "pt-BR": {
    // nav
    posts: "posts",
    about: "sobre",
    // header
    subtitle: "arquiteto de software, dev, e o que mais aparecer",
    // home
    publishedCount: (n: number) =>
      `${n} ${n === 1 ? "post publicado" : "posts publicados"}.`,
    // search
    searchPlaceholder: "buscar posts...",
    searchAriaLabel: "buscar posts",
    noResults: (q: string) => `nenhum post encontrado para "${q}"`,
    // post page
    back: "← voltar",
    allPosts: "← ver todos os posts",
    // footer
    footer: (year: number) => `© ${year} Luis Rabock`,
    // about
    greeting: "oi, eu sou o Luis",
    role: "Arquiteto de Software Sênior · Jaraguá do Sul, SC",
    bio: "virei arquiteto de software meio sem querer. comecei como júnior em 2017, cozinhando código como todo mundo, e em algum momento alguém achou razoável me deixar desenhar sistemas inteiros.\n\nhoje lidero migrações para cloud e ajudo a quebrar monólitos em serviços menores. também analiso a melhor forma de estruturar o ambiente para cada conjunto de aplicações — desde arquitetura e infraestrutura até decisões mais específicas de comunicação e protocolos.",
    focus: "Java é meu habitat natural. passo boa parte do tempo pegando aplicações grandes e recortando em serviços menores. também tenho bastante estrada com Node.js e com as bibliotecas de UI da moda no frontend.\n\no que mais me diverte é encontrar onde uma aplicação trava, escala mal ou simplesmente não aguenta o tranco — e consertar isso.",
    techTitle: "tecnologias",
    contactTitle: "onde me encontrar",
    techItems: [
      "Java · Spring Boot · Quarkus",
      "Javascript/Typescript · Node.js · React · Next.js",
      "PostgreSQL · Oracle · MySQL",
      "AWS · Oracle Cloud · Azure · Docker · Kubernetes",
      "GitHub Actions · Jenkins · CI/CD",
      "Mensageria · Keycloak · Serviços distribuídos",
      "System Design · Arquitetura de Sistemas",
      "API Gateway · Proxies · Load Balancers",
      "Observabilidade: métricas, traces, logs — ELK, Prometheus, Grafana, New Relic, SigNoz",
    ],
    // date locale
    dateLocale: "pt-BR",
  },
  en: {
    posts: "posts",
    about: "about",
    subtitle: "software architect, dev, and whatever comes up",
    publishedCount: (n: number) =>
      `${n} ${n === 1 ? "post" : "posts"} published.`,
    searchPlaceholder: "search posts...",
    searchAriaLabel: "search posts",
    noResults: (q: string) => `no posts found for "${q}"`,
    back: "← back",
    allPosts: "← all posts",
    footer: (year: number) => `© ${year} Luis Rabock`,
    greeting: "hey, I'm Luis",
    role: "Senior Software Architect · Jaraguá do Sul, SC — Brazil",
    bio: "became a software architect somewhat by accident. started as a junior dev in 2017, cooking code like everyone else, and at some point someone thought it was reasonable to let me design entire systems.\n\nthese days I lead cloud migrations and help break monoliths into smaller services. I also figure out the best way to structure environments for each set of applications — from architecture and infrastructure down to more specific decisions around communication and protocols.",
    focus: "Java is my natural habitat. I spend a good chunk of my time taking large applications apart and splitting them into smaller services. I also have solid experience with Node.js and the trendy UI libraries on the frontend.\n\nwhat I enjoy most is finding where an application chokes, scales poorly, or just can't take the load — and fixing it.",
    techTitle: "technologies",
    contactTitle: "find me",
    techItems: [
      "Java · Spring Boot · Quarkus",
      "Javascript/Typescript · Node.js · React · Next.js",
      "PostgreSQL · Oracle · MySQL",
      "AWS · Oracle Cloud · Azure · Docker · Kubernetes",
      "GitHub Actions · Jenkins · CI/CD",
      "Messaging · Keycloak · Distributed services",
      "System Design · Systems Architecture",
      "API Gateway · Proxies · Load Balancers",
      "Observability: metrics, traces, logs — ELK, Prometheus, Grafana, New Relic, SigNoz",
    ],
    dateLocale: "en-US",
  },
} as const;

export function t(lang: Language) {
  return translations[lang];
}

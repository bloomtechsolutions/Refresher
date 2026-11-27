// All programme content lives here. Edit text, questions and order freely.

export type Phase = "idle" | "open" | "locked" | "revealed";

type Base = { id: string; section: string; label: string };

export type Scene = Base &
  (
    | { type: "welcome" }
    | { type: "title"; kicker: string; title: string; subtitle?: string; presenter?: string; number?: string; accent?: string }
    | { type: "holding"; kicker: string; title: string; subtitle: string; presenter: string }
    | { type: "wordcloud"; prompt: string; hint: string; index: number }
    | { type: "wordwall" }
    | { type: "agenda" }
    | { type: "cards"; kicker: string; title: string; subtitle?: string; cards: { icon: string; title: string; body: string; tag?: string }[] }
    | { type: "steps"; kicker: string; title: string; subtitle?: string; steps: { title: string; body: string }[]; note?: string }
    | { type: "countdown"; kicker: string; title: string; target: string; targetLabel: string; schemes: string[]; note: string; extra?: { title: string; body: string } }
    | { type: "facts"; kicker: string; title: string; facts: { value: string; label: string; sub?: string }[]; note?: string }
    | { type: "slides"; kicker: string; title: string; images: string[] }
    | { type: "quiz"; kicker: string; question: string; options: string[]; answer: number; explain: string; limit: number; points: number }
    | { type: "scenario"; kicker: string; title: string; prompt: string; tips: string[] }
    | { type: "splitpay" }
    | { type: "ams" }
    | { type: "leaderboard" }
    | { type: "thanks" }
  );

export const SECTIONS = [
  { key: "open", name: "Welcome" },
  { key: "s1", name: "Session 1 · Strategy & Vision" },
  { key: "s2", name: "Session 2 · Performance Update" },
  { key: "s3", name: "Session 3 · Commercial Updates" },
  { key: "p1", name: "Part 1 · Commercial updates" },
  { key: "p2", name: "Part 2 · Advance Merchant Settlement" },
  { key: "p3", name: "Part 3 · BML SplitPay" },
  { key: "p4", name: "Part 4 · Payment Solutions" },
  { key: "final", name: "Knowledge check & close" },
];

const slides = (nums: number[]) => nums.map((n) => `/slides/s${n}.jpg`);

export const WORD_PROMPTS = [
  "Why do you work at BML?",
  "What should BML be known for?",
  "What should we do better?",
];

export const SCENES: Scene[] = [
  // ───────── Opening
  { id: "welcome", section: "open", label: "Welcome & join", type: "welcome" },
  { id: "teams", section: "open", label: "Meet the teams", type: "leaderboard" },

  // ───────── Session 1
  {
    id: "s1-title", section: "s1", label: "Session title", type: "title",
    kicker: "Day 1 · Session 1", number: "01",
    title: "Our Strategy, Vision and Business Focus",
    subtitle: "Where Retail & SME Banking is heading, and the part each of us plays",
    presenter: "Director of Retail & SME Banking",
  },
  { id: "wc-why", section: "s1", label: "Word cloud · Why BML?", type: "wordcloud", index: 0, prompt: WORD_PROMPTS[0], hint: "Short words or phrases. Send as many as your team agrees on." },
  { id: "wc-known", section: "s1", label: "Word cloud · Known for", type: "wordcloud", index: 1, prompt: WORD_PROMPTS[1], hint: "One idea per submission. Think like a customer." },
  { id: "wc-better", section: "s1", label: "Word cloud · Do better", type: "wordcloud", index: 2, prompt: WORD_PROMPTS[2], hint: "Be honest and specific. Every idea counts." },
  { id: "wc-wall", section: "s1", label: "All three clouds", type: "wordwall" },

  // ───────── Session 2
  {
    id: "s2-hold", section: "s2", label: "Performance update", type: "holding",
    kicker: "Day 1 · Session 2", title: "Performance Update",
    subtitle: "How we performed, where we are winning, and where we need to push",
    presenter: "Functional Managers",
  },

  // ───────── Session 3
  {
    id: "s3-title", section: "s3", label: "Session title", type: "title",
    kicker: "Day 1 · Session 3 · 60 minutes", number: "03",
    title: "Commercial Updates",
    subtitle: "What changed, what’s new, and how to talk about it with customers",
  },
  { id: "s3-agenda", section: "s3", label: "How the hour runs", type: "agenda" },

  // ───────── Part 1
  {
    id: "p1-title", section: "p1", label: "Part 1 title", type: "title",
    kicker: "Part 1 · 15 minutes", number: "01", title: "Commercial updates", subtitle: "Developments implemented or announced, Sep – Nov 2026", presenter: "Shaig",
  },
  {
    id: "p1-now", section: "p1", label: "Now available", type: "cards",
    kicker: "Live now", title: "Customers can do more without a counter visit",
    subtitle: "Point customers to self-service first",
    cards: [
      { icon: "📱", title: "Contact & email update", body: "Customers update their contact details and email address themselves in the Lounge app.", tag: "Lounge app" },
      { icon: "🏪", title: "Business Portal: Merchant Applications", body: "Merchant applications are now submitted through the Business Portal.", tag: "Business Portal" },
      { icon: "📄", title: "Online statements", body: "Statements for up to 5 years can be generated from Internet Banking.", tag: "Internet Banking" },
    ],
  },
  {
    id: "p1-ongoing", section: "p1", label: "Ongoing projects", type: "cards",
    kicker: "In the pipeline", title: "Ongoing projects & automations",
    cards: [
      { icon: "🚀", title: "One onboarding journey", body: "Personal Banking onboarding and the first-experience journey are being merged.", tag: "Personal" },
      { icon: "👥", title: "Joint account opening", body: "A new joint account onboarding flow via Internet Banking.", tag: "Internet Banking" },
      { icon: "🕋", title: "Umrah Dollar Sale", body: "Umrah dollar sales credited straight to the customer’s account.", tag: "USD" },
      { icon: "🪪", title: "Simpler KYC", body: "Simplifying the KYC process for customers and for staff.", tag: "KYC" },
      { icon: "⚙️", title: "Business automations", body: "Balance confirmation and reference letters automated; digital onboarding for businesses and partnerships.", tag: "Business Portal" },
    ],
  },
  {
    id: "p1-onboard", section: "p1", label: "Onboarding journey", type: "steps",
    kicker: "Personal Banking", title: "New customer onboarding becomes one journey",
    subtitle: "Onboarding and the first-experience journey are merged",
    steps: [
      { title: "Start onboarding", body: "Account opening and card application submitted in the same journey." },
      { title: "Receive credentials", body: "The customer gets their login credentials." },
      { title: "Complete KYC", body: "Completed KYC is submitted after getting the credentials." },
    ],
    note: "What changes for you: no separate first-experience step before applying for a card.",
  },
  {
    id: "p1-housing", section: "p1", label: "Help to Buy & Build", type: "countdown",
    kicker: "Important information", title: "Help to Buy & Help to Build",
    target: "2026-11-29T11:00:00+05:00", targetLabel: "Applications open 11:00 AM · Sunday 29 November 2026",
    schemes: ["Help to Buy Scheme", "Help to Build Scheme"],
    note: "Gazetted under the National Home Ownership Programme. Expect more enquiries at Service Centres, the Lounge and the Contact Centre. Use approved guidance only.",
    extra: { title: "Changes to Guesthouse & Liveaboard", body: "Updated requirements for guesthouse and liveaboard customers. Presenter walks through the details." },
  },
  { id: "p1-q1", section: "p1", label: "Quiz · Housing schemes", type: "quiz", kicker: "Quick check · Part 1", question: "When do Help to Buy and Help to Build applications open?", options: ["9:00 AM, Sun 29 Nov", "11:00 AM, Sun 29 Nov", "11:00 AM, Mon 30 Nov", "They are already open"], answer: 1, explain: "Applications open at 11:00 AM on Sunday, 29 November 2026.", limit: 20, points: 100 },
  { id: "p1-q2", section: "p1", label: "Quiz · KYC timing", type: "quiz", kicker: "Quick check · Part 1", question: "In the new onboarding journey, when does the customer submit completed KYC?", options: ["Before starting onboarding", "Together with the card application", "After getting their credentials", "At the first branch visit"], answer: 2, explain: "Account opening and card application go in together; completed KYC comes after the credentials.", limit: 20, points: 100 },
  { id: "p1-q3", section: "p1", label: "Quiz · Statements", type: "quiz", kicker: "Quick check · Part 1", question: "How many years of statements can customers generate from Internet Banking?", options: ["1 year", "2 years", "3 years", "Up to 5 years"], answer: 3, explain: "Online statements of up to 5 years are available in Internet Banking.", limit: 15, points: 100 },

  // ───────── Part 2 AMS
  { id: "p2-title", section: "p2", label: "Part 2 title", type: "title", kicker: "Part 2 · 12 minutes", number: "02", title: "Advance Merchant Settlement", subtitle: "Working capital sized on card settlements, repaid from daily settlements", presenter: "Mahuza" },
  { id: "p2-slides", section: "p2", label: "AMS deck", type: "slides", kicker: "Advance Merchant Settlement", title: "AMS", images: slides([12, 13, 14, 15, 16, 17, 18]) },
  { id: "p2-facts", section: "p2", label: "AMS in numbers", type: "facts", kicker: "Advance Merchant Settlement", title: "AMS in four numbers", facts: [
      { value: "MVR 2M", label: "Maximum facility", sub: "needs 24 months of history" },
      { value: "MVR 20K", label: "Min. monthly avg. volume", sub: "merchant settlements" },
      { value: "20%", label: "Max. of daily settlement", sub: "goes to repayment" },
      { value: "0", label: "Financial statements", sub: "eligibility from settlement data" },
    ], note: "Apply through Internet Banking. No branch visit, no lump-sum repayments, no cheques." },
  { id: "p2-ladder", section: "p2", label: "AMS history ladder", type: "ams" },
  { id: "p2-q1", section: "p2", label: "Quiz · Max facility", type: "quiz", kicker: "Quick check · AMS", question: "What is the maximum AMS facility?", options: ["MVR 500,000", "MVR 1 million", "MVR 2 million", "MVR 5 million"], answer: 2, explain: "Up to MVR 2 million, with 24 months of merchant history.", limit: 20, points: 100 },
  { id: "p2-q2", section: "p2", label: "Quiz · Min volume", type: "quiz", kicker: "Quick check · AMS", question: "What minimum monthly average merchant volume is needed to qualify?", options: ["MVR 5,000", "MVR 10,000", "MVR 20,000", "MVR 50,000"], answer: 2, explain: "A steady minimum monthly average merchant volume of MVR 20,000.", limit: 20, points: 100 },
  { id: "p2-q3", section: "p2", label: "Quiz · Repayment share", type: "quiz", kicker: "Quick check · AMS", question: "How much of the daily settlement can go to AMS repayment?", options: ["Up to 10%", "Up to 20%", "Up to 50%", "Up to 80%"], answer: 1, explain: "Up to 20%, so at least 80% stays with the business.", limit: 20, points: 100 },
  { id: "p2-case", section: "p2", label: "Scenario · Café owner", type: "scenario", kicker: "Team challenge · AMS", title: "The café owner", prompt: "A café has accepted BML cards for 14 months with about MVR 35,000 in monthly card sales. The owner needs MVR 900,000 to renovate but has no audited financials. What do you tell them?", tips: ["Are they eligible?", "How much could they get?", "How do they apply and repay?"] },

  // ───────── Part 3 SplitPay
  { id: "p3-title", section: "p3", label: "Part 3 title", type: "title", kicker: "Part 3 · 14 minutes", number: "03", title: "BML SplitPay", subtitle: "Buy now. Pay over time. Fixed monthly instalments at the POS.", presenter: "Zima" },
  { id: "p3-slides", section: "p3", label: "SplitPay deck", type: "slides", kicker: "BML SplitPay", title: "SplitPay", images: slides([21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]) },
  { id: "p3-calc", section: "p3", label: "Live SplitPay calculator", type: "splitpay" },
  { id: "p3-q1", section: "p3", label: "Quiz · Min purchase", type: "quiz", kicker: "Quick check · SplitPay", question: "What is the minimum SplitPay purchase?", options: ["MVR 500", "MVR 1,000", "MVR 1,500", "MVR 2,000"], answer: 2, explain: "MVR 1,500, with plans of 3, 6, 12, 18 or 24 months.", limit: 15, points: 100 },
  { id: "p3-q2", section: "p3", label: "Quiz · POS void", type: "quiz", kicker: "Quick check · SplitPay", question: "True or false: a completed SplitPay sale can be voided at the POS.", options: ["True", "False"], answer: 1, explain: "False. Check the plan before entering the PIN.", limit: 15, points: 100 },
  { id: "p3-q3", section: "p3", label: "Quiz · Rewards", type: "quiz", kicker: "Quick check · SplitPay", question: "Do SplitPay purchases earn BML rewards points?", options: ["Yes, double points", "Yes, normal points", "No"], answer: 2, explain: "No rewards points on SplitPay purchases.", limit: 15, points: 100 },
  { id: "p3-q4", section: "p3", label: "Quiz · Do the maths", type: "quiz", kicker: "Maths round · double points", question: "MVR 6,000 on SplitPay over 6 months at 9% p.a. What is the monthly payment?", options: ["MVR 1,000", "MVR 1,045", "MVR 1,090", "MVR 1,135"], answer: 1, explain: "Finance = 6,000 × 9% × 6 ÷ 12 = 270. Total 6,270 ÷ 6 = MVR 1,045.", limit: 45, points: 200 },

  // ───────── Part 4 Payment Solutions
  { id: "p4-title", section: "p4", label: "Part 4 title", type: "title", kicker: "Part 4 · 12 minutes", number: "04", title: "Payment Solutions", subtitle: "Acceptance products, Merchant Portal & mPOS, Virtual Terminal and DCC", presenter: "Umran" },
  { id: "p4-slides", section: "p4", label: "Payments deck", type: "slides", kicker: "Payment Solutions", title: "Payment Solutions", images: slides([35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47]) },
  { id: "p4-facts", section: "p4", label: "Payments in numbers", type: "facts", kicker: "Merchant services", title: "Numbers to remember", facts: [
      { value: "13+", label: "Payment methods", sub: "cards & digital wallets" },
      { value: "MVR 0", label: "Setup & monthly fees", sub: "competitive rates" },
      { value: "+2%", label: "Virtual card fee", sub: "on top of MDR (Virtual Terminal)" },
      { value: "1%", label: "Monthly DCC rebate", sub: "offer DCC to every foreign card" },
    ], note: "September snapshot: USD 2,721 in DCC rebates missed because DCC wasn’t offered." },
  { id: "p4-q1", section: "p4", label: "Quiz · VT fee", type: "quiz", kicker: "Quick check · Payments", question: "What extra fee applies to virtual card transactions on the Virtual Terminal?", options: ["None", "1% on top of MDR", "2% on top of MDR", "5% on top of MDR"], answer: 2, explain: "An additional 2% on top of MDR.", limit: 20, points: 100 },
  { id: "p4-q2", section: "p4", label: "Quiz · DCC rebate", type: "quiz", kicker: "Quick check · Payments", question: "What monthly rebate can merchants earn on DCC transactions?", options: ["0.5%", "1%", "2%", "No rebate"], answer: 1, explain: "1% monthly rebates, plus zero POS transaction fees when the minimum DCC volume is met.", limit: 20, points: 100 },
  { id: "p4-q3", section: "p4", label: "Quiz · Acquiring", type: "quiz", kicker: "Quick check · Payments", question: "Which of these is NOT one of BML’s acquiring products?", options: ["Static QR", "Merchant Portal / mPOS", "Unattended terminals", "Cheque deposit kiosk"], answer: 3, explain: "Acquiring products: POS terminals, static QR, Merchant Portal / mPOS and unattended terminals.", limit: 20, points: 100 },
  { id: "p4-case", section: "p4", label: "Scenario · Resort guest", type: "scenario", kicker: "Team challenge · DCC", title: "Pitch it in one line", prompt: "A guest with a UK card is paying USD 480 at a resort boutique. Write the one-line DCC offer the cashier should say, and why the merchant benefits.", tips: ["What the guest hears", "What the merchant earns", "Keep it under 30 words"] },

  // ───────── Final
  { id: "fk-1", section: "final", label: "Final · Housing", type: "quiz", kicker: "Knowledge check · 1 of 6", question: "When do Help to Buy and Help to Build applications open?", options: ["9:00 AM, Sun 29 Nov", "11:00 AM, Sun 29 Nov", "11:00 AM, Mon 30 Nov", "Already open"], answer: 1, explain: "11:00 AM, Sunday 29 November 2026.", limit: 15, points: 150 },
  { id: "fk-2", section: "final", label: "Final · AMS max", type: "quiz", kicker: "Knowledge check · 2 of 6", question: "Maximum Advance Merchant Settlement facility?", options: ["MVR 500,000", "MVR 1 million", "MVR 2 million", "MVR 5 million"], answer: 2, explain: "MVR 2 million.", limit: 15, points: 150 },
  { id: "fk-3", section: "final", label: "Final · AMS share", type: "quiz", kicker: "Knowledge check · 3 of 6", question: "Share of daily settlement that can go to AMS repayment?", options: ["10%", "20%", "50%", "80%"], answer: 1, explain: "Up to 20%.", limit: 15, points: 150 },
  { id: "fk-4", section: "final", label: "Final · SplitPay min", type: "quiz", kicker: "Knowledge check · 4 of 6", question: "Minimum SplitPay purchase?", options: ["MVR 500", "MVR 1,000", "MVR 1,500", "MVR 2,000"], answer: 2, explain: "MVR 1,500.", limit: 15, points: 150 },
  { id: "fk-5", section: "final", label: "Final · POS void", type: "quiz", kicker: "Knowledge check · 5 of 6", question: "A completed SplitPay sale can be voided at the POS.", options: ["True", "False"], answer: 1, explain: "False. No POS void after completion.", limit: 15, points: 150 },
  { id: "fk-6", section: "final", label: "Final · VT fee", type: "quiz", kicker: "Knowledge check · 6 of 6", question: "Extra fee on Virtual Terminal virtual card transactions?", options: ["None", "1%", "2%", "5%"], answer: 2, explain: "2% on top of MDR.", limit: 15, points: 150 },
  { id: "final-board", section: "final", label: "Final leaderboard", type: "leaderboard" },
  { id: "thanks", section: "final", label: "Takeaways & thanks", type: "thanks" },
];

export const sceneById = (id: string) => SCENES.find((s) => s.id === id) || SCENES[0];

export const AGENDA = [
  { time: "0:00", part: "Opening", topic: "Welcome and session map", who: "Shaig", min: 2 },
  { time: "0:02", part: "Part 1", topic: "Commercial updates, Sep–Nov 2026", who: "Shaig", min: 15 },
  { time: "0:17", part: "Part 2", topic: "Advance Merchant Settlement", who: "Mahuza", min: 12 },
  { time: "0:29", part: "Part 3", topic: "BML SplitPay", who: "Zima", min: 14 },
  { time: "0:43", part: "Part 4", topic: "Payment Solutions", who: "Umran", min: 12 },
  { time: "0:55", part: "Wrap-up", topic: "Knowledge check and questions", who: "Shaig", min: 5 },
];

export const TAKEAWAYS = [
  "Point customers to self-service: Lounge app, onboarding, joint accounts",
  "Housing schemes open 11:00 AM, Sun 29 Nov: use approved guidance only",
  "Offer AMS to steady BML merchants: up to MVR 2M, repaid from settlements",
  "SplitPay: check the plan before the PIN; no POS void",
  "Merchants: offer DCC to every foreign card",
];

export const OPTION_COLORS = ["#FF5A5F", "#00B8D9", "#FFB020", "#22C55E"];
export const OPTION_SHAPES = ["▲", "◆", "●", "■"];

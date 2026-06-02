export interface Procedure {
  id: number;
  title: string;
  when: string;
  script?: string;
  steps: string[];
  capture?: string[];
  escalate?: string;
  never?: string;
}

// Full list of TurboAnswer call-center procedures. Reference material shown
// read-only to receptionists in the limited receptionist panel.
export const PROCEDURES: Procedure[] = [
  {
    id: 1,
    title: "Standard Greeting (every call)",
    when: "All inbound calls, business hours.",
    script: "Thank you for calling TurboAnswer, this is [Name]. How can I help you today?",
    steps: [
      "Listen and identify the reason for the call.",
      "Match it to one of the procedures below.",
      "If unsure, take a message (Procedure 2).",
    ],
    capture: ["Caller name", "Callback number", "Reason for call"],
  },
  {
    id: 2,
    title: "Message Taking (default fallback)",
    when: "No one available, or the request doesn't fit another procedure.",
    script: "I'll take a message and make sure the right person gets back to you.",
    steps: [
      "Collect the details below.",
      "Close with: \"You can expect a callback within one business day. Is there anything else?\"",
    ],
    capture: [
      "Full name",
      "Best callback number",
      "Email (spell it back to confirm)",
      "Reason for call (one or two sentences)",
      "Best time to reach them",
    ],
  },
  {
    id: 3,
    title: "New Customer / Sales Inquiry",
    when: "Caller asks about plans, pricing, or what TurboAnswer does.",
    script: "Happy to help. TurboAnswer is an AI assistant with plans from Free up to Enterprise.",
    steps: [
      "Ask what they want to use it for (personal, business, team).",
      "Note which features they mention (Code Studio, AI Video, team/Enterprise, etc.).",
      "If they want to upgrade now, you can take their card details and set their plan (see Procedure 4).",
    ],
    capture: ["Name", "Email", "Phone", "Use case", "Plan they're interested in"],
    escalate: "Forward hot leads / Enterprise interest to the sales contact immediately.",
  },
  {
    id: 4,
    title: "Upgrade / Downgrade a Subscription (by phone)",
    when: "Caller wants to start, change, or cancel a paid plan.",
    script: "I can take care of that for you right now.",
    steps: [
      "Verify the account email on file.",
      "Confirm the plan they want (Free, Pro, Research, Enterprise).",
      "If payment is needed, take the card details to process the upgrade.",
      "In the Accounts tab, search for the user and set their new tier.",
      "Confirm the change back to the caller.",
    ],
    capture: ["Account email", "New plan", "Payment details (if upgrading)"],
    never: "Never save card numbers anywhere after the charge is processed.",
  },
  {
    id: 5,
    title: "Billing & Payment Questions",
    when: "Questions about charges, subscriptions, trial, or invoices.",
    script: "I can take the details and have our billing team look into this for you.",
    steps: [
      "Confirm the account email on file.",
      "Note the specific issue (double charge, trial ended, can't update payment, etc.).",
    ],
    capture: ["Account email", "Description of the issue", "Date/amount if a charge is disputed"],
    escalate: "Anything about disputed charges or failed payments to the billing team, same day.",
  },
  {
    id: 6,
    title: "Refund Requests",
    when: "Caller asks for a refund or mentions cancelling and getting money back.",
    script: "I understand. I'll pass this to the team that handles refunds and they'll follow up directly.",
    steps: [
      "Stay neutral and polite — do not promise or deny a refund.",
      "Capture the details only.",
    ],
    capture: ["Account email", "Reason for refund", "Amount/date of charge"],
    escalate: "Always to the billing/refunds team. Do not commit to any outcome.",
  },
  {
    id: 7,
    title: "Technical Support / \"The app isn't working\"",
    when: "Caller reports the app is broken, slow, won't load, or a feature fails.",
    script: "Sorry about that — let's get this logged so our support team can fix it.",
    steps: [
      "Gather the details below.",
      "Close with: \"I'll open a support ticket for you and you'll get an update by email.\"",
    ],
    capture: [
      "Account email",
      "Device and app version (phone/computer, Android/web)",
      "What they were doing when it broke",
      "Any error message (ask them to read it exactly)",
    ],
    escalate: "Widespread outage reports (\"nobody can log in\") — flag as urgent to tech support.",
  },
  {
    id: 8,
    title: "Crisis Support Bot / Mental Health Calls (SENSITIVE)",
    when: "Caller mentions the Crisis Support feature, or sounds distressed/in crisis.",
    script: "Thank you for reaching out. I want to make sure you get the right help.",
    steps: [
      "If the caller is in immediate danger, advise them to call their local emergency number (911 / 000 / 999) or a crisis hotline right away.",
      "Do not try to counsel them yourself — be kind, stay calm, keep them on the line if they're in danger.",
      "For non-emergency questions about the feature, take a message for the support team.",
    ],
    capture: ["Only what's needed — keep it private."],
    escalate: "Immediately to the on-call/support contact for anything urgent.",
  },
  {
    id: 9,
    title: "Enterprise / Team & B2B Inquiry",
    when: "Caller represents a company, team, or wants the embeddable AI widget / workgroups.",
    script: "Great — that's something our Enterprise team handles directly.",
    steps: ["Collect the details below and pass to Enterprise/sales."],
    capture: [
      "Company name",
      "Caller's role",
      "Team size",
      "What they want (widget, team accounts, integration)",
      "Email and phone",
    ],
    escalate: "Send to Enterprise/sales contact as a priority lead.",
  },
  {
    id: 10,
    title: "Promo Codes & Free Access",
    when: "Caller asks about a promo code, discount, or free/lifetime access.",
    script: "I can pass that along to the team that manages promo codes.",
    steps: ["Capture the details below."],
    capture: ["Account email", "The code they're asking about", "The issue (code not working, requesting a code, etc.)"],
    escalate: "To support — do not issue or invent codes over the phone.",
  },
  {
    id: 11,
    title: "Frustrated or Angry Caller (de-escalation)",
    when: "Caller is upset.",
    script: "I hear you, and I'm sorry for the frustration. Let me make sure this gets to the right person.",
    steps: [
      "Stay calm and neutral — don't argue or take it personally.",
      "Acknowledge the problem, then focus on the next step.",
      "Capture details and assure a callback.",
    ],
    never: "Do not make promises about refunds, outcomes, or blame. Just route it.",
    escalate: "Repeat complaints or threats — supervisor/management contact.",
  },
  {
    id: 12,
    title: "Spam, Robocalls & Solicitors",
    when: "Sales pitch, robocall, or obvious spam.",
    script: "We're not interested, thank you.",
    steps: [
      "End the call politely.",
      "Don't confirm account details or transfer.",
      "If repeated from the same number, note it for the blocked-callers list.",
    ],
  },
  {
    id: 13,
    title: "Press / Media Inquiry",
    when: "Journalist or media contact.",
    script: "Thank you — media questions go to our communications team. May I take your details?",
    steps: ["Collect the details below. Do not give statements."],
    capture: ["Name", "Outlet", "Deadline", "Topic", "Contact info"],
    escalate: "To the designated PR/owner contact.",
  },
  {
    id: 14,
    title: "After-Hours / Voicemail",
    when: "Calls outside business hours.",
    script:
      "Thanks for calling TurboAnswer. Our team is currently unavailable. Please leave your name, number, and a short message, and we'll get back to you next business day. For urgent app issues, please use in-app support.",
    steps: ["Capture the voicemail details below."],
    capture: ["Name", "Number", "Message"],
  },
];

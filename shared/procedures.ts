export type Difficulty = "easy" | "medium" | "complex";

export interface Procedure {
  id: number;
  title: string;
  when: string;
  script?: string;
  steps: string[];
  capture?: string[];
  escalate?: string;
  never?: string;
  category?: string;
  difficulty?: Difficulty;
  keywords?: string[];
}

// The 14 hand-written core call-handling procedures. These are the most
// important ones and always appear first.
const CORE_PROCEDURES: Procedure[] = [
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

// ---- Generated library ----------------------------------------------------
// The remaining procedures are built from realistic call-center scenarios,
// each expanded across the surface/context it can happen on. This produces a
// large, searchable knowledge base (1,000 total) that stays coherent because
// every scenario carries its own steps and each context adds one sensible
// first step.

type Scenario = {
  t: string;
  d: Difficulty;
  when: string;
  script?: string;
  steps: string[];
  capture?: string[];
  escalate?: string;
  never?: string;
};

type CategoryConfig = { category: string; scenarios: Scenario[] };

const CONTEXTS: Array<{ label: string; hint: string }> = [
  { label: "on the website", hint: "Confirm the customer is using TurboAnswer in a web browser." },
  { label: "on the Android app", hint: "Confirm the customer is using the TurboAnswer Android app." },
  { label: "on iPhone or iPad", hint: "Confirm the customer is using TurboAnswer in a browser on their iPhone or iPad." },
  { label: "on a desktop browser", hint: "Confirm the customer is on a desktop or laptop browser." },
  { label: "while on the call", hint: "Walk the customer through it live while they stay on the phone with you." },
  { label: "with a slow connection", hint: "Ask the customer to check their internet connection first." },
  { label: "after an app update", hint: "Confirm whether the issue started right after an app or browser update." },
  { label: "on the Free plan", hint: "Confirm the customer is on the Free plan." },
  { label: "on the Pro plan", hint: "Confirm the customer is on the Pro plan." },
  { label: "on the Research plan", hint: "Confirm the customer is on the Research plan." },
  { label: "on the Enterprise plan", hint: "Confirm the customer is on the Enterprise plan or using a team seat." },
  { label: "as a guest with no account", hint: "The customer has no account yet — collect an email so support can follow up." },
];

const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    category: "Account Access",
    scenarios: [
      { t: "Customer is locked out of their account", d: "medium", when: "Customer cannot get into their account at all.", steps: ["Confirm the email on file by asking them to read it back.", "Have them use Forgot Password on the login screen.", "If no email arrives, check spam and confirm the spelling.", "If still stuck, open a support ticket."], capture: ["Account email", "What happens when they try to log in"], escalate: "Repeated lockouts or a suspected hacked account → support, same day." },
      { t: "Customer wants to change their login email", d: "medium", when: "Customer asks to update the email on their account.", steps: ["Verify identity using the current email on file.", "Note the new email they want.", "Open a support ticket — email changes are handled by support."], capture: ["Current email", "Requested new email"] },
      { t: "Customer never received the verification text", d: "medium", when: "The SMS verification code didn't arrive at sign up.", steps: ["Confirm the phone number including country code.", "Ask them to wait 60 seconds and request a new code.", "If it still fails, take a message for support."], capture: ["Phone number", "Account email"] },
      { t: "Customer can't set up two-factor authentication", d: "complex", when: "2FA setup keeps failing.", steps: ["Confirm they are scanning the code with an authenticator app.", "Have them check the phone clock is set to automatic.", "If it still fails, open a support ticket."], capture: ["Account email", "Authenticator app they use"] },
      { t: "Customer lost their two-factor device", d: "complex", when: "Customer can't pass 2FA because they lost their phone.", steps: ["Verify identity carefully using account details.", "Do not bypass 2FA yourself.", "Escalate to support for a secure reset."], capture: ["Account email", "Identity details"], escalate: "Always to support — never disable 2FA over the phone." },
    ],
  },
  {
    category: "Login & Password",
    scenarios: [
      { t: "Customer forgot their password", d: "easy", when: "Customer can't remember their password.", steps: ["Direct them to Forgot Password on the login page.", "Have them check email and spam for the reset link.", "Confirm they can log in after resetting."], capture: ["Account email"] },
      { t: "Password reset email never arrives", d: "medium", when: "The reset email is not received.", steps: ["Confirm the email spelling.", "Check the spam or junk folder.", "Wait five minutes and retry once.", "If still missing, open a support ticket."], capture: ["Account email"] },
      { t: "Customer's password keeps being rejected", d: "medium", when: "Login keeps refusing a password they believe is correct.", steps: ["Ask them to check Caps Lock is off.", "Have them reset the password to be safe.", "Confirm a successful login."], capture: ["Account email"] },
      { t: "Customer wants to change their password", d: "easy", when: "Customer asks how to update their password.", steps: ["Point them to Settings, or Forgot Password if they're logged out.", "Advise a long, unique password."] },
      { t: "Customer thinks their account was hacked", d: "complex", when: "Customer reports suspicious activity on the account.", steps: ["Have them reset the password immediately.", "Advise turning on two-factor authentication.", "Open an urgent support ticket."], capture: ["Account email", "What they noticed"], escalate: "Urgent → support, same day." },
    ],
  },
  {
    category: "Billing & Charges",
    scenarios: [
      { t: "Customer sees a charge they don't recognize", d: "complex", when: "An unknown charge appears on their statement.", steps: ["Confirm the account email.", "Note the amount and date of the charge.", "Do not confirm or deny — capture details for billing."], capture: ["Account email", "Charge amount", "Charge date"], escalate: "Disputed charges → billing team, same day." },
      { t: "Customer was charged twice", d: "complex", when: "A duplicate charge is reported.", steps: ["Confirm the account email.", "Note both amounts and dates.", "Reassure them billing will review and correct duplicates."], capture: ["Account email", "Both charge dates and amounts"], escalate: "Always to billing." },
      { t: "Customer needs a copy of their invoice or receipt", d: "easy", when: "Customer asks for billing paperwork.", steps: ["Confirm the account email.", "Let them know billing will email the receipt.", "Open a billing request."], capture: ["Account email", "Which charge"] },
      { t: "Customer's card was declined", d: "medium", when: "Payment failed at checkout.", steps: ["Ask them to check the card details and available funds.", "Suggest trying another card.", "If needed, take card details to process the upgrade by phone."], capture: ["Account email", "Plan they want"] },
      { t: "Customer wants to update the card on file", d: "medium", when: "Customer needs to change their payment method.", steps: ["Verify the account email.", "Take the new card details to process the change.", "Confirm the plan stays active."], capture: ["Account email", "New card details"], never: "Never store card numbers after processing." },
    ],
  },
  {
    category: "Subscriptions & Plans",
    scenarios: [
      { t: "Customer wants to upgrade to Pro", d: "easy", when: "Customer asks to move up to the Pro plan.", steps: ["Verify the account email.", "Take payment details if needed.", "In the Accounts tab, set the user to Pro and confirm."], capture: ["Account email", "Payment details"] },
      { t: "Customer wants to upgrade to Research", d: "easy", when: "Customer asks for the Research plan.", steps: ["Verify the account email.", "Explain Research adds the research engine and AI video.", "Take payment, set them to Research, and confirm."], capture: ["Account email", "Payment details"] },
      { t: "Customer wants to upgrade to Enterprise", d: "medium", when: "Customer asks for Enterprise or team access.", steps: ["Verify the account email.", "Confirm team size and that they want a shared team code.", "Take payment, set them to Enterprise, and share that a team code is generated."], capture: ["Account email", "Team size", "Payment details"], escalate: "Large teams or custom needs → Enterprise/sales contact." },
      { t: "Customer wants to downgrade their plan", d: "easy", when: "Customer wants to move to a lower tier.", steps: ["Verify the account email.", "Confirm which plan they want to move to.", "Set the new tier in the Accounts tab and confirm."], capture: ["Account email", "New plan"] },
      { t: "Customer asks what each plan includes", d: "easy", when: "Customer wants a plan comparison.", steps: ["Summarize Free, Pro, Research, and Enterprise briefly.", "Ask what features matter most to them.", "Recommend the best fit."] },
    ],
  },
  {
    category: "Refunds & Cancellations",
    scenarios: [
      { t: "Customer wants to cancel their subscription", d: "medium", when: "Customer asks to stop their paid plan.", steps: ["Verify the account email.", "Confirm they want to cancel and when it should take effect.", "Use Cancel plan in the Accounts tab, then confirm."], capture: ["Account email", "Reason for cancelling"] },
      { t: "Customer wants a refund", d: "medium", when: "Customer asks for money back.", steps: ["Stay neutral — do not promise or deny.", "Capture the charge details.", "Escalate to the billing/refunds team."], capture: ["Account email", "Reason", "Charge amount and date"], escalate: "Always to billing — do not commit to an outcome." },
      { t: "Customer cancelled but was charged again", d: "complex", when: "A charge appears after a cancellation.", steps: ["Confirm the account email and cancellation date.", "Note the new charge amount and date.", "Escalate to billing for review and correction."], capture: ["Account email", "Cancellation date", "New charge details"], escalate: "Billing, same day." },
      { t: "Customer wants to pause instead of cancel", d: "medium", when: "Customer wants a break but not a full cancellation.", steps: ["Explain there is no formal pause, but they can downgrade to Free and upgrade later.", "If they agree, set them to Free.", "Otherwise take a message for billing."], capture: ["Account email"] },
      { t: "Customer wants to resubscribe after cancelling", d: "easy", when: "A former customer wants to come back.", steps: ["Verify the account email.", "Confirm the plan they want.", "Take payment, set the tier, and welcome them back."], capture: ["Account email", "Plan", "Payment details"] },
    ],
  },
  {
    category: "AI Chat & Answers",
    scenarios: [
      { t: "AI gave a wrong or outdated answer", d: "medium", when: "Customer is unhappy with an answer's accuracy.", steps: ["Apologize and note the question and the wrong answer.", "Suggest rephrasing or trying a higher tier model.", "Log the example for the support team."], capture: ["Account email", "The question", "What was wrong"] },
      { t: "AI responses are slow", d: "medium", when: "Customer reports lag in replies.", steps: ["Ask them to check their internet connection.", "Suggest refreshing or reopening the app.", "If widespread, flag a possible slowdown."], capture: ["Account email", "Device"], escalate: "Many reports of slowness → tech support as possible incident." },
      { t: "Customer wants to switch the AI model", d: "easy", when: "Customer asks how to change which model answers.", steps: ["Explain the model picker and which models their plan unlocks.", "Walk them to the selector if needed."], capture: ["Account email"] },
      { t: "Customer lost their chat history", d: "medium", when: "Past conversations appear to be missing.", steps: ["Confirm they're logged into the correct account.", "Check they aren't in a guest/incognito session.", "If truly missing, open a support ticket."], capture: ["Account email", "When they last saw the chats"] },
      { t: "Customer wants to export a conversation", d: "easy", when: "Customer wants to save or share a chat.", steps: ["Explain they can copy the conversation text.", "If they need a file export, take a message for support."], capture: ["Account email"] },
    ],
  },
  {
    category: "Voice Assistant",
    scenarios: [
      { t: "Voice assistant won't activate", d: "medium", when: "The voice feature doesn't start listening.", steps: ["Confirm microphone permission is granted in the browser or app.", "Have them tap the mic button to start.", "If it still fails, open a support ticket."], capture: ["Account email", "Device"] },
      { t: "Wake word 'Turbo' isn't responding", d: "medium", when: "The optional wake word doesn't trigger.", steps: ["Explain the wake word is off by default and must be enabled in settings.", "Have them enable it and test in a quiet room."], capture: ["Account email"] },
      { t: "Voice replies aren't spoken aloud", d: "medium", when: "Answers appear as text but no speech plays.", steps: ["Check the device volume and that text-to-speech is on.", "Have them reload and try again."], capture: ["Account email", "Device"] },
      { t: "Microphone permission is blocked", d: "medium", when: "The browser or phone blocked mic access.", steps: ["Walk them to site/app permissions and allow the microphone.", "Have them reload and retry."], capture: ["Account email", "Browser or device"] },
      { t: "Voice keeps hearing the wrong words", d: "easy", when: "Speech recognition is inaccurate.", steps: ["Suggest speaking clearly in a quieter space.", "Recommend a headset mic if available."], capture: ["Account email"] },
    ],
  },
  {
    category: "Code Studio",
    scenarios: [
      { t: "Customer can't open Code Studio", d: "medium", when: "Code Studio won't load for the customer.", steps: ["Confirm their plan or add-on includes Code Studio.", "Have them refresh and try again.", "If still blocked, open a support ticket."], capture: ["Account email", "Plan or add-on"] },
      { t: "Code Studio add-on missing after purchase", d: "complex", when: "Customer paid for the add-on but doesn't see it.", steps: ["Confirm the account email and purchase.", "Have them log out and back in.", "If still missing, escalate to billing/engineering."], capture: ["Account email", "Purchase date"], escalate: "Engineering/billing if the purchase shows but access doesn't." },
      { t: "Customer is out of Code Studio credits", d: "easy", when: "Customer ran out of build credits.", steps: ["Explain how credits work and when they reset.", "Explain how to buy more or enable auto-buy."], capture: ["Account email"] },
      { t: "Long Build Mode won't start", d: "complex", when: "The multi-agent long build won't run.", steps: ["Confirm Long Build Mode is enabled and credits are available.", "Have them retry once.", "If it fails again, open an engineering ticket."], capture: ["Account email", "What they were building"], escalate: "Engineering if builds fail repeatedly." },
      { t: "Customer needs help saving a project", d: "easy", when: "Customer is unsure how to save their work.", steps: ["Explain projects save automatically as files.", "Show them where to find saved projects."], capture: ["Account email"] },
    ],
  },
  {
    category: "Media & Video Studio",
    scenarios: [
      { t: "AI video generation failed", d: "complex", when: "A video render failed or errored.", steps: ["Confirm their plan includes AI video.", "Note the prompt and any error.", "Have them retry once, then escalate if it fails."], capture: ["Account email", "Prompt", "Error message"], escalate: "Engineering for repeated render failures." },
      { t: "Video Studio is locked for the customer", d: "medium", when: "The customer can't access Video Studio.", steps: ["Explain Video Studio is on Research and Enterprise plans.", "Confirm their current plan.", "Offer to upgrade if they want it."], capture: ["Account email", "Current plan"] },
      { t: "Media editor won't load a file", d: "medium", when: "An uploaded media file won't open in the editor.", steps: ["Check the file type and size are supported.", "Have them try a smaller or different file."], capture: ["Account email", "File type and size"] },
      { t: "Exporting an edited video fails", d: "complex", when: "Export or download of an edited video fails.", steps: ["Have them retry the export.", "Check their connection is stable.", "If it keeps failing, open an engineering ticket."], capture: ["Account email"], escalate: "Engineering for repeated export failures." },
      { t: "Customer asks which plan unlocks video", d: "easy", when: "Customer wants to know how to get video features.", steps: ["Explain Research and Enterprise include AI video.", "Offer to upgrade them."], capture: ["Account email"] },
    ],
  },
  {
    category: "AI Scanner & Images",
    scenarios: [
      { t: "Scanner won't read an image", d: "medium", when: "The AI scanner fails to read an uploaded image.", steps: ["Check the image is clear and well lit.", "Have them try a sharper photo.", "If it still fails, open a support ticket."], capture: ["Account email", "What they're scanning"] },
      { t: "Image upload fails", d: "medium", when: "Uploading an image doesn't work.", steps: ["Check the file type and size.", "Have them retry on a stable connection."], capture: ["Account email", "File type and size"] },
      { t: "Scanned text came out wrong", d: "easy", when: "The transcription from a scan is inaccurate.", steps: ["Suggest a clearer, straight-on photo.", "Note the example for support if it's badly wrong."], capture: ["Account email"] },
      { t: "Customer wants to scan a document", d: "easy", when: "Customer asks how to use the scanner.", steps: ["Explain Scanner is free and reads, transcribes, and summarizes images.", "Walk them through uploading a photo."], capture: ["Account email"] },
      { t: "Image generation isn't working", d: "medium", when: "Image generation errors or returns nothing.", steps: ["Confirm their plan supports image generation.", "Have them retry with a simpler prompt.", "Open a ticket if it keeps failing."], capture: ["Account email", "Prompt"] },
    ],
  },
  {
    category: "Crisis Support (Sensitive)",
    scenarios: [
      { t: "Customer asks about the Crisis Support feature", d: "medium", when: "Customer wants to know what Crisis Support is.", steps: ["Explain it's a private, encrypted AI for mental-health support.", "Reassure them it is confidential.", "Answer general questions only."], capture: ["Keep it private — only what's needed."] },
      { t: "Caller sounds distressed or in crisis", d: "complex", when: "The caller seems to be in emotional distress.", steps: ["If they are in immediate danger, advise calling their local emergency number or a crisis hotline now.", "Stay calm and kind; do not counsel them yourself.", "Keep them on the line if they're in danger."], capture: ["Only what's needed — keep it private."], escalate: "Immediately to the on-call/support contact for anything urgent." },
      { t: "Crisis chat won't open", d: "medium", when: "The Crisis Support chat won't load.", steps: ["Have them refresh and retry.", "Confirm they're signed in.", "If still failing, open a support ticket discreetly."], capture: ["Account email"] },
      { t: "Customer is worried about crisis chat privacy", d: "medium", when: "Customer asks how private crisis chats are.", steps: ["Explain crisis chats are encrypted and kept private.", "Reassure them it is separate from normal chat."], capture: ["Keep it private."] },
      { t: "Customer wants crisis hotline numbers", d: "easy", when: "Customer asks for hotline information.", steps: ["Advise their local emergency number for immediate danger.", "Point them to the in-app crisis information page."] },
    ],
  },
  {
    category: "Enterprise & Teams",
    scenarios: [
      { t: "Enterprise code isn't working for a team member", d: "complex", when: "A team member can't redeem the enterprise code.", steps: ["Confirm the code with the account owner.", "Check the code is active and seats remain.", "If valid but failing, escalate to engineering."], capture: ["Owner email", "Team member email", "The code"], escalate: "Engineering if a valid code won't redeem." },
      { t: "Owner wants to add a team member", d: "medium", when: "An Enterprise owner wants to grow their team.", steps: ["Verify the owner's account.", "Share the team code for the new member to redeem.", "Confirm seats are available."], capture: ["Owner email"] },
      { t: "Owner wants to remove a team member", d: "medium", when: "An Enterprise owner wants to remove someone.", steps: ["Verify the owner's account.", "Take the member's email to remove.", "Open a request for support to action it."], capture: ["Owner email", "Member email to remove"] },
      { t: "Team ran out of seats", d: "medium", when: "An Enterprise team has no seats left.", steps: ["Confirm the owner's account.", "Explain how to add more seats.", "Take payment if they want to expand now."], capture: ["Owner email", "Seats needed"], escalate: "Sales for large seat increases." },
      { t: "Customer wants the embeddable AI widget", d: "medium", when: "A business wants the website widget.", steps: ["Confirm they're on a plan that includes the widget.", "Collect their website details.", "Pass to Enterprise/sales for setup help."], capture: ["Company", "Website", "Contact email"], escalate: "Enterprise/sales contact." },
    ],
  },
  {
    category: "Mobile App",
    scenarios: [
      { t: "Android app won't install", d: "medium", when: "Installation from the Play Store fails.", steps: ["Check storage space and a stable connection.", "Have them retry the install.", "If it still fails, open a support ticket."], capture: ["Account email", "Phone model"] },
      { t: "App crashes on open", d: "complex", when: "The app closes immediately on launch.", steps: ["Have them update to the latest version.", "Suggest restarting the phone.", "If it keeps crashing, open an engineering ticket."], capture: ["Account email", "Phone model", "App version"], escalate: "Engineering for repeat crashes." },
      { t: "App is stuck on a white screen", d: "medium", when: "The app loads to a blank screen.", steps: ["Have them check their connection.", "Suggest closing and reopening the app.", "Open a ticket if it persists."], capture: ["Account email", "Phone model"] },
      { t: "App won't update", d: "easy", when: "The app update won't download or install.", steps: ["Check storage and connection.", "Have them retry from the Play Store."], capture: ["Account email"] },
      { t: "Push notifications aren't arriving", d: "medium", when: "The customer isn't getting app notifications.", steps: ["Confirm notifications are allowed for the app.", "Check do-not-disturb is off.", "Have them toggle the setting and test."], capture: ["Account email", "Phone model"] },
    ],
  },
  {
    category: "Technical Errors",
    scenarios: [
      { t: "Customer sees an error message", d: "medium", when: "A specific error appears on screen.", steps: ["Ask them to read the exact error.", "Note what they were doing when it appeared.", "Open a support ticket with the details."], capture: ["Account email", "Exact error message", "What they were doing"] },
      { t: "A page won't load at all", d: "medium", when: "A page stays blank or won't open.", steps: ["Have them refresh and check their connection.", "Try a different browser if possible.", "Open a ticket if it persists."], capture: ["Account email", "Which page"] },
      { t: "A button or feature does nothing", d: "medium", when: "Clicking a control has no effect.", steps: ["Have them refresh the page.", "Confirm their plan includes that feature.", "Open a ticket if it still does nothing."], capture: ["Account email", "Which feature"] },
      { t: "Everything is running very slowly", d: "medium", when: "The whole app feels sluggish.", steps: ["Check their internet speed.", "Suggest closing other tabs or apps.", "Flag if many customers report it."], capture: ["Account email", "Device"], escalate: "Many slowness reports → tech support as a possible incident." },
      { t: "Customer reports a possible outage", d: "complex", when: "Customer says the service seems down.", steps: ["Note exactly what fails and when it started.", "Check if other callers report the same.", "Flag as urgent to tech support."], capture: ["Account email", "What's failing", "Start time"], escalate: "Urgent → tech support immediately." },
    ],
  },
  {
    category: "Privacy & Data",
    scenarios: [
      { t: "Customer wants their data deleted", d: "complex", when: "Customer requests deletion of their data.", steps: ["Verify identity using the account email.", "Explain the data-deletion process and timeline.", "Open a formal privacy request."], capture: ["Account email", "What they want deleted"], escalate: "Privacy/data request → support for formal handling." },
      { t: "Customer wants to delete their account", d: "complex", when: "Customer asks to close their account entirely.", steps: ["Verify identity.", "Confirm they understand it removes their data.", "Open an account-deletion request."], capture: ["Account email", "Reason (optional)"], escalate: "Support to action the deletion." },
      { t: "Customer asks what data is stored", d: "medium", when: "Customer wants to know what is kept about them.", steps: ["Explain at a high level what's stored (account, chats).", "Point them to the privacy policy.", "Take a message for support for specifics."], capture: ["Account email"] },
      { t: "Customer wants a copy of their data", d: "medium", when: "Customer requests an export of their data.", steps: ["Verify identity.", "Open a data-export request for support."], capture: ["Account email"], escalate: "Privacy/data request → support." },
      { t: "Customer has a GDPR or privacy request", d: "complex", when: "Customer cites a privacy law or formal request.", steps: ["Stay neutral and capture the request precisely.", "Do not commit to a timeline yourself.", "Escalate to support for formal handling."], capture: ["Account email", "Nature of the request"], escalate: "Always to support for legal/privacy matters." },
    ],
  },
  {
    category: "Account Management",
    scenarios: [
      { t: "Customer wants to change their name", d: "easy", when: "Customer wants to update the name on the account.", steps: ["Verify the account email.", "Walk them to profile settings to update the name."], capture: ["Account email"] },
      { t: "Customer wants to update their profile", d: "easy", when: "Customer wants to edit profile details.", steps: ["Point them to profile settings.", "Help with any field they're stuck on."], capture: ["Account email"] },
      { t: "Customer wants to merge two accounts", d: "complex", when: "Customer has two accounts and wants them combined.", steps: ["Confirm both account emails.", "Explain merging is handled by support.", "Open a support ticket with both emails."], capture: ["Both account emails"], escalate: "Support — merging is manual." },
      { t: "Customer created a duplicate account by mistake", d: "medium", when: "Customer accidentally made a second account.", steps: ["Confirm which account they want to keep.", "Open a support ticket to close the duplicate."], capture: ["Email to keep", "Email to close"] },
      { t: "Customer wants to change timezone or language", d: "easy", when: "Customer wants to adjust regional settings.", steps: ["Point them to settings for timezone and language.", "Confirm the change applied."], capture: ["Account email"] },
    ],
  },
  {
    category: "Notifications & Email",
    scenarios: [
      { t: "Customer isn't receiving any emails", d: "medium", when: "No TurboAnswer emails are arriving.", steps: ["Confirm the email spelling on file.", "Check spam and that the address isn't full.", "If still missing, open a support ticket."], capture: ["Account email"] },
      { t: "Customer wants to stop marketing emails", d: "easy", when: "Customer wants fewer promotional emails.", steps: ["Point them to the unsubscribe link in any email.", "Confirm transactional emails (receipts) still arrive."], capture: ["Account email"] },
      { t: "Customer wants the weekly digest", d: "easy", when: "Customer asks to receive the weekly digest.", steps: ["Walk them to notification settings.", "Have them enable the weekly digest."], capture: ["Account email"] },
      { t: "Customer didn't get their receipt email", d: "medium", when: "A purchase receipt didn't arrive.", steps: ["Confirm the email on file.", "Check spam.", "Open a billing request to resend the receipt."], capture: ["Account email", "Which purchase"] },
      { t: "Customer wants to change notification settings", d: "easy", when: "Customer wants to adjust what alerts they get.", steps: ["Point them to notification settings.", "Help them toggle the options they want."], capture: ["Account email"] },
    ],
  },
  {
    category: "General & Policy",
    scenarios: [
      { t: "Customer asks about business hours", d: "easy", when: "Customer wants to know when support is open.", steps: ["Share the support hours.", "Offer to take a message if outside hours."] },
      { t: "Customer asks how to contact support", d: "easy", when: "Customer wants support contact options.", steps: ["Share the support email and in-app support.", "Offer to open a ticket for them now."], capture: ["Account email"] },
      { t: "Customer wants to leave feedback", d: "easy", when: "Customer has a suggestion or feedback.", steps: ["Thank them and capture the feedback clearly.", "Let them know it will reach the team."], capture: ["Account email", "The feedback"] },
      { t: "Customer wants to join the beta program", d: "easy", when: "Customer asks to test new features.", steps: ["Point them to the beta application page.", "Take a message if they need help applying."], capture: ["Account email"] },
      { t: "Customer asks if there's a free version", d: "easy", when: "Customer wants to try TurboAnswer for free.", steps: ["Explain the Free plan and what it includes.", "Offer to help them get started."], capture: ["Account email"] },
    ],
  },
];

const STOPWORDS = new Set([
  "the", "a", "an", "to", "of", "for", "and", "or", "on", "in", "is", "it", "my",
  "i", "with", "when", "cant", "can", "not", "how", "do", "does", "their", "they",
  "customer", "wants", "asks", "isnt", "won", "wont", "keeps", "after",
]);

function makeKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
    ),
  );
}

function buildGenerated(target: number): Procedure[] {
  const out: Procedure[] = [];
  for (const cat of CATEGORY_CONFIGS) {
    for (const sc of cat.scenarios) {
      const variants: Array<{ label: string; hint: string } | null> = [null, ...CONTEXTS];
      for (const ctx of variants) {
        if (out.length >= target) return out;
        const title = ctx ? `${sc.t} (${ctx.label})` : sc.t;
        const steps = ctx ? [ctx.hint, ...sc.steps] : sc.steps;
        out.push({
          id: 0,
          title,
          category: cat.category,
          difficulty: sc.d,
          when: sc.when,
          script: sc.script,
          steps,
          capture: sc.capture,
          escalate: sc.escalate,
          never: sc.never,
          keywords: makeKeywords(`${sc.t} ${cat.category} ${ctx?.label ?? ""}`),
        });
      }
    }
  }
  return out;
}

const TOTAL = 1000;

const core: Procedure[] = CORE_PROCEDURES.map((p) => ({
  ...p,
  category: p.category ?? "Call Handling",
  difficulty: p.difficulty ?? "easy",
  keywords: p.keywords ?? makeKeywords(`${p.title} ${p.when}`),
}));

// Final list: 14 core + generated, renumbered 1..1000 so ids are unique.
export const PROCEDURES: Procedure[] = [...core, ...buildGenerated(TOTAL - core.length)]
  .slice(0, TOTAL)
  .map((p, i) => ({ ...p, id: i + 1 }));

export const PROCEDURE_CATEGORIES: string[] = Array.from(
  new Set(PROCEDURES.map((p) => p.category || "Other")),
);

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "complex"];

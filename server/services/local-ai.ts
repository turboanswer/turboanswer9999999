const mathOperations: Record<string, (a: number, b: number) => number> = {
  '+': (a, b) => a + b, '-': (a, b) => a - b,
  '*': (a, b) => a * b, '/': (a, b) => b !== 0 ? a / b : NaN,
  '%': (a, b) => a % b, '^': (a, b) => Math.pow(a, b),
};

function evaluateMath(expr: string): number | null {
  try {
    const cleaned = expr.replace(/[^0-9+\-*/%^().×÷\s]/g, '')
      .replace(/×/g, '*').replace(/÷/g, '/').trim();
    if (!cleaned || cleaned.length > 100) return null;
    const tokens = cleaned.match(/(\d+\.?\d*|[+\-*/%^()])/g);
    if (!tokens) return null;
    const sanitized = tokens.join(' ');
    const result = Function(`"use strict"; return (${sanitized})`)();
    if (typeof result === 'number' && isFinite(result)) return result;
    return null;
  } catch { return null; }
}

function extractMathExpression(msg: string): string | null {
  const patterns = [
    /(?:what(?:'s| is)\s+)(\d[\d+\-*/%^()×÷.\s]+\d)/i,
    /(?:calculate|compute|solve|evaluate)\s+(.+)/i,
    /(\d+\.?\d*\s*[+\-*×÷/%^]\s*\d+\.?\d*(?:\s*[+\-*×÷/%^]\s*\d+\.?\d*)*)/,
    /(\d+)\s+(?:plus|minus|times|multiplied by|divided by|to the power of)\s+(\d+)/i,
  ];
  for (const p of patterns) {
    const m = msg.match(p);
    if (m) return m[1] || m[0];
  }
  const wordMath = msg.match(/(\d+)\s+(plus|minus|times|multiplied\s+by|divided\s+by)\s+(\d+)/i);
  if (wordMath) {
    const ops: Record<string, string> = { 'plus': '+', 'minus': '-', 'times': '*', 'multiplied by': '*', 'divided by': '/' };
    return `${wordMath[1]} ${ops[wordMath[2].toLowerCase()] || '+'} ${wordMath[3]}`;
  }
  return null;
}

const knowledge: Record<string, string[]> = {
  greetings: [
    "Hey! I'm Turbo, your AI assistant. What can I help you with?",
    "Hi there! Ready to help you out. What's on your mind?",
    "Hey! What can I do for you today?",
    "Hello! I'm here and ready to help. Ask me anything!",
    "Hi! Great to see you. What do you need help with?",
  ],
  farewell: [
    "See you later! Come back anytime.",
    "Goodbye! Happy to help anytime you need.",
    "Take care! I'll be here when you need me.",
    "Bye! Have a great day!",
  ],
  thanks: [
    "You're welcome! Happy to help.",
    "No problem! Let me know if you need anything else.",
    "Glad I could help! Anything else?",
    "Anytime! That's what I'm here for.",
  ],
  howAreYou: [
    "I'm doing great, thanks for asking! Ready to help you with whatever you need.",
    "I'm good! Running fast and ready to assist. What can I do for you?",
    "Feeling sharp and ready to go! What's up?",
  ],
  identity: [
    "I'm Turbo, your personal AI assistant! I run completely on this server - no external services needed. I'm built for speed and can help with math, coding, general knowledge, and conversation.",
    "I'm Turbo Answer, a self-hosted AI assistant. I run entirely on your own server with zero external dependencies. Ask me anything!",
  ],
  capabilities: [
    "I can help with: math calculations, coding questions, general knowledge, writing, brainstorming, and conversation. I run 100% locally on your server - no external APIs needed!",
  ],
};

const facts: Array<{patterns: RegExp[], answer: string}> = [
  { patterns: [/first president.*(?:united states|us|usa|america)/i, /who was.*first president/i],
    answer: "The first president of the United States was George Washington. He served from 1789 to 1797 and is often called the 'Father of His Country.'" },
  { patterns: [/capital of.*(?:united states|us|usa|america)/i],
    answer: "The capital of the United States is Washington, D.C. It was established in 1790 and named after George Washington." },
  { patterns: [/capital of france/i], answer: "The capital of France is Paris." },
  { patterns: [/capital of england|capital of.*(?:uk|united kingdom|britain)/i], answer: "The capital of the United Kingdom is London." },
  { patterns: [/capital of japan/i], answer: "The capital of Japan is Tokyo." },
  { patterns: [/capital of china/i], answer: "The capital of China is Beijing." },
  { patterns: [/capital of germany/i], answer: "The capital of Germany is Berlin." },
  { patterns: [/capital of italy/i], answer: "The capital of Italy is Rome." },
  { patterns: [/capital of spain/i], answer: "The capital of Spain is Madrid." },
  { patterns: [/capital of russia/i], answer: "The capital of Russia is Moscow." },
  { patterns: [/capital of canada/i], answer: "The capital of Canada is Ottawa." },
  { patterns: [/capital of australia/i], answer: "The capital of Australia is Canberra." },
  { patterns: [/capital of brazil/i], answer: "The capital of Brazil is Brasilia." },
  { patterns: [/capital of india/i], answer: "The capital of India is New Delhi." },
  { patterns: [/capital of mexico/i], answer: "The capital of Mexico is Mexico City." },
  { patterns: [/capital of south korea|capital of korea/i], answer: "The capital of South Korea is Seoul." },
  { patterns: [/capital of egypt/i], answer: "The capital of Egypt is Cairo." },
  { patterns: [/capital of turkey/i], answer: "The capital of Turkey is Ankara." },
  { patterns: [/capital of argentina/i], answer: "The capital of Argentina is Buenos Aires." },
  { patterns: [/(?:how many|number of) planets/i, /planets.*solar system/i],
    answer: "There are 8 planets in our solar system: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune." },
  { patterns: [/(?:how many|number of) continents/i],
    answer: "There are 7 continents: Africa, Antarctica, Asia, Australia/Oceania, Europe, North America, and South America." },
  { patterns: [/(?:how many|number of) oceans/i],
    answer: "There are 5 oceans: Pacific, Atlantic, Indian, Southern (Antarctic), and Arctic." },
  { patterns: [/speed of light/i],
    answer: "The speed of light in a vacuum is approximately 299,792,458 meters per second (about 186,282 miles per second), or roughly 670,616,629 mph." },
  { patterns: [/speed of sound/i],
    answer: "The speed of sound in air at sea level is approximately 343 meters per second (about 767 mph or 1,235 km/h). It varies with temperature and medium." },
  { patterns: [/(?:what is|define|meaning of)\s+(?:the\s+)?meaning of life/i],
    answer: "That's one of humanity's biggest questions! Philosophically, different traditions offer various answers - from finding purpose and happiness, to connecting with others, to simply experiencing existence. What meaning resonates with you?" },
  { patterns: [/(?:largest|biggest) ocean/i], answer: "The Pacific Ocean is the largest ocean, covering about 63 million square miles - more than all the land on Earth combined." },
  { patterns: [/(?:largest|biggest) country/i], answer: "Russia is the largest country by area (6.6 million square miles). China is the most populous (about 1.4 billion people)." },
  { patterns: [/(?:tallest|highest) mountain/i], answer: "Mount Everest is the tallest mountain, standing at 29,032 feet (8,849 meters) above sea level, located in the Himalayas on the border of Nepal and Tibet." },
  { patterns: [/(?:longest|biggest) river/i], answer: "The Nile River is traditionally considered the longest river at about 4,130 miles (6,650 km), though some measurements suggest the Amazon may be slightly longer." },
  { patterns: [/(?:deepest|depth of).*(?:ocean|sea)/i], answer: "The Mariana Trench in the Pacific Ocean is the deepest point, reaching about 36,000 feet (nearly 11,000 meters) deep at Challenger Deep." },
  { patterns: [/(?:what is|define) (?:the )?internet/i], answer: "The internet is a global network of interconnected computers that communicate using standardized protocols (TCP/IP), enabling the sharing of information, communication, and services worldwide." },
  { patterns: [/(?:what is|define) ai|what is artificial intelligence/i], answer: "Artificial intelligence (AI) is the simulation of human intelligence by computer systems. It includes learning, reasoning, problem-solving, perception, and language understanding. AI ranges from narrow AI (specific tasks) to the theoretical concept of general AI (human-level intelligence)." },
  { patterns: [/who (?:invented|created) (?:the )?(?:internet|world wide web|www)/i], answer: "The internet evolved from ARPANET (1969, funded by the US Department of Defense). Tim Berners-Lee invented the World Wide Web in 1989 at CERN, creating HTML, URLs, and HTTP." },
  { patterns: [/who (?:invented|created) (?:the )?telephone/i], answer: "Alexander Graham Bell is credited with inventing the telephone in 1876, though Antonio Meucci and others also developed similar devices around the same time." },
  { patterns: [/who (?:invented|created) (?:the )?light ?bulb/i], answer: "Thomas Edison is most commonly credited with inventing the practical incandescent light bulb in 1879, though several inventors contributed to its development, including Humphry Davy and Joseph Swan." },
  { patterns: [/who (?:wrote|is the author of) (?:the )?"?harry potter"?/i], answer: "Harry Potter was written by J.K. Rowling. The series of 7 books was published between 1997 and 2007." },
  { patterns: [/(?:what is|how does) photosynthesis/i], answer: "Photosynthesis is the process by which plants, algae, and some bacteria convert sunlight, water, and carbon dioxide into glucose (sugar) and oxygen. The basic equation is: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂" },
  { patterns: [/(?:what is|how does) gravity/i], answer: "Gravity is a fundamental force that attracts objects with mass toward each other. On Earth, gravity accelerates objects at about 9.8 m/s². Einstein's general relativity describes gravity as the curvature of spacetime caused by mass and energy." },
  { patterns: [/(?:what is|define) (?:the )?(?:golden ratio|phi)/i], answer: "The golden ratio (φ) is approximately 1.6180339887. It's found when a line is divided so the ratio of the whole to the larger part equals the ratio of the larger to the smaller part. It appears throughout nature, art, and architecture." },
  { patterns: [/(?:what is|define) pi(?:\s|$)/i, /value of pi/i], answer: "Pi (π) is approximately 3.14159265358979. It's the ratio of a circle's circumference to its diameter and is an irrational number that never ends or repeats." },
  { patterns: [/(?:boiling|freezing) point of water/i], answer: "Water freezes at 0°C (32°F) and boils at 100°C (212°F) at standard atmospheric pressure (sea level)." },
  { patterns: [/(?:what is|explain) (?:the )?(?:theory of )?(?:evolution|natural selection)/i], answer: "Evolution is the process by which species change over time through natural selection. Organisms with traits better suited to their environment survive and reproduce more successfully, passing those traits to offspring. Charles Darwin and Alfred Russel Wallace independently developed this theory." },
  { patterns: [/(?:distance|far).*(?:earth|us).*(?:moon|sun)/i], answer: "The Moon is about 238,855 miles (384,400 km) from Earth. The Sun is about 93 million miles (150 million km) from Earth." },
  { patterns: [/(?:population|people).*(?:earth|world)/i], answer: "The world population is approximately 8 billion people as of 2024." },
  { patterns: [/(?:what is|explain) (?:the )?(?:big bang)/i], answer: "The Big Bang theory is the prevailing cosmological model explaining the origin of the universe. It states that the universe expanded from an extremely hot, dense initial state approximately 13.8 billion years ago and has been expanding ever since." },
];

const codeExamples: Array<{patterns: RegExp[], language: string, code: string, explanation: string}> = [
  { patterns: [/hello world.*python/i, /python.*hello world/i],
    language: "python", code: 'print("Hello, World!")', explanation: "This prints 'Hello, World!' to the console." },
  { patterns: [/hello world.*javascript|javascript.*hello world/i, /hello world.*js\b|js.*hello world/i],
    language: "javascript", code: 'console.log("Hello, World!");', explanation: "This logs 'Hello, World!' to the console." },
  { patterns: [/hello world.*(?:java)(?!script)/i, /(?:java)(?!script).*hello world/i],
    language: "java", code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}', explanation: "A basic Java program that prints 'Hello, World!'." },
  { patterns: [/hello world.*c\+\+|c\+\+.*hello world/i, /hello world.*cpp|cpp.*hello world/i],
    language: "cpp", code: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}', explanation: "A C++ program that outputs 'Hello, World!'." },
  { patterns: [/hello world.*(?:c#|csharp|c sharp)/i, /(?:c#|csharp|c sharp).*hello world/i],
    language: "csharp", code: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}', explanation: "A C# program that prints 'Hello, World!'." },
  { patterns: [/hello world.*(?:ruby)/i, /(?:ruby).*hello world/i],
    language: "ruby", code: 'puts "Hello, World!"', explanation: "This prints 'Hello, World!' in Ruby." },
  { patterns: [/hello world.*(?:go|golang)/i, /(?:go|golang).*hello world/i],
    language: "go", code: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}', explanation: "A Go program that prints 'Hello, World!'." },
  { patterns: [/hello world.*(?:rust)/i, /(?:rust).*hello world/i],
    language: "rust", code: 'fn main() {\n    println!("Hello, World!");\n}', explanation: "A Rust program that prints 'Hello, World!'." },
  { patterns: [/hello world.*(?:typescript|ts)/i, /(?:typescript|ts).*hello world/i],
    language: "typescript", code: 'const message: string = "Hello, World!";\nconsole.log(message);', explanation: "TypeScript hello world with type annotation." },
  { patterns: [/hello world.*(?:swift)/i, /(?:swift).*hello world/i],
    language: "swift", code: 'print("Hello, World!")', explanation: "Swift hello world - clean and simple." },
  { patterns: [/hello world.*(?:kotlin)/i, /(?:kotlin).*hello world/i],
    language: "kotlin", code: 'fun main() {\n    println("Hello, World!")\n}', explanation: "A Kotlin program that prints 'Hello, World!'." },
  { patterns: [/hello world/i],
    language: "python", code: 'print("Hello, World!")', explanation: "Here's a simple Hello World program in Python:" },
  { patterns: [/(?:for|while) loop.*python/i, /python.*(?:for|while) loop/i],
    language: "python", code: '# For loop\nfor i in range(5):\n    print(i)  # Prints 0, 1, 2, 3, 4\n\n# While loop\ncount = 0\nwhile count < 5:\n    print(count)\n    count += 1', explanation: "Python loops: `for` iterates over a range, `while` continues until a condition is false." },
  { patterns: [/(?:for|while) loop.*javascript/i, /javascript.*(?:for|while) loop/i],
    language: "javascript", code: '// For loop\nfor (let i = 0; i < 5; i++) {\n    console.log(i);\n}\n\n// While loop\nlet count = 0;\nwhile (count < 5) {\n    console.log(count);\n    count++;\n}', explanation: "JavaScript loops using for and while." },
  { patterns: [/(?:sort|sorting).*(?:array|list).*python/i],
    language: "python", code: '# Sort a list\nnumbers = [5, 2, 8, 1, 9, 3]\nnumbers.sort()  # In-place: [1, 2, 3, 5, 8, 9]\n\n# Or create a new sorted list\nsorted_nums = sorted([5, 2, 8, 1, 9, 3])\n\n# Sort in reverse\nnumbers.sort(reverse=True)  # [9, 8, 5, 3, 2, 1]', explanation: "Python provides `sort()` (in-place) and `sorted()` (new list) for sorting." },
  { patterns: [/(?:read|open|write).*file.*python/i, /python.*(?:read|open|write).*file/i],
    language: "python", code: '# Read a file\nwith open("file.txt", "r") as f:\n    content = f.read()\n    print(content)\n\n# Write to a file\nwith open("output.txt", "w") as f:\n    f.write("Hello, file!")\n\n# Append to a file\nwith open("output.txt", "a") as f:\n    f.write("\\nMore content")', explanation: "Using `with open()` ensures the file is properly closed after operations." },
  { patterns: [/(?:fibonacci|fib).*python/i, /python.*(?:fibonacci|fib)/i],
    language: "python", code: 'def fibonacci(n):\n    if n <= 1:\n        return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b\n\n# Print first 10 Fibonacci numbers\nfor i in range(10):\n    print(fibonacci(i), end=" ")\n# Output: 0 1 1 2 3 5 8 13 21 34', explanation: "Efficient iterative Fibonacci implementation." },
  { patterns: [/(?:reverse|flip).*string.*python/i, /python.*reverse.*string/i],
    language: "python", code: '# Reverse a string\ntext = "Hello, World!"\nreversed_text = text[::-1]\nprint(reversed_text)  # "!dlroW ,olleH"', explanation: "Python's slice notation `[::-1]` reverses a string efficiently." },
  { patterns: [/(?:class|object|oop).*python/i, /python.*(?:class|object|oop)/i],
    language: "python", code: 'class Dog:\n    def __init__(self, name, breed):\n        self.name = name\n        self.breed = breed\n    \n    def bark(self):\n        return f"{self.name} says Woof!"\n    \n    def __str__(self):\n        return f"{self.name} ({self.breed})"\n\nmy_dog = Dog("Buddy", "Golden Retriever")\nprint(my_dog.bark())  # "Buddy says Woof!"', explanation: "A Python class with constructor, methods, and string representation." },
  { patterns: [/(?:api|fetch|http|request).*javascript/i, /javascript.*(?:api|fetch|http|request)/i],
    language: "javascript", code: '// Fetch API example\nasync function getData() {\n    try {\n        const response = await fetch("https://api.example.com/data");\n        const data = await response.json();\n        console.log(data);\n    } catch (error) {\n        console.error("Error:", error);\n    }\n}\n\ngetData();', explanation: "Using the Fetch API with async/await for HTTP requests." },
  { patterns: [/(?:react|component).*(?:example|how|create)/i],
    language: "jsx", code: 'import { useState } from "react";\n\nfunction Counter() {\n    const [count, setCount] = useState(0);\n    \n    return (\n        <div>\n            <h1>Count: {count}</h1>\n            <button onClick={() => setCount(count + 1)}>\n                Increment\n            </button>\n        </div>\n    );\n}\n\nexport default Counter;', explanation: "A React functional component with useState hook." },
  { patterns: [/(?:sql|database).*(?:select|query|create|insert)/i],
    language: "sql", code: '-- Create a table\nCREATE TABLE users (\n    id SERIAL PRIMARY KEY,\n    name VARCHAR(100) NOT NULL,\n    email VARCHAR(255) UNIQUE NOT NULL,\n    created_at TIMESTAMP DEFAULT NOW()\n);\n\n-- Insert data\nINSERT INTO users (name, email) VALUES (\'John\', \'john@example.com\');\n\n-- Query data\nSELECT * FROM users WHERE name LIKE \'%John%\';', explanation: "Basic SQL operations: creating a table, inserting, and querying data." },
  { patterns: [/(?:html|web ?page).*(?:basic|simple|example|template)/i],
    language: "html", code: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>My Page</title>\n    <style>\n        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }\n        h1 { color: #333; }\n    </style>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n    <p>This is a basic HTML page.</p>\n</body>\n</html>', explanation: "A basic HTML5 template with styling." },
];

const conversationalPatterns: Array<{patterns: RegExp[], responses: string[]}> = [
  { patterns: [/what(?:'s| is) your (?:name|identity)/i, /who are you/i, /what are you/i],
    responses: knowledge.identity },
  { patterns: [/what can you do/i, /what.*(?:abilities|capabilities|features)/i, /help me/i],
    responses: knowledge.capabilities },
  { patterns: [/^(?:hi|hello|hey|yo|sup|what's up|howdy|greetings)[\s!.,?]*$/i, /^(?:hi|hello|hey|yo|sup)\s+(?:there|turbo|buddy|friend)[\s!.,?]*$/i],
    responses: knowledge.greetings },
  { patterns: [/\b(?:bye|goodbye|see you|later|cya|farewell)\b/i],
    responses: knowledge.farewell },
  { patterns: [/\b(?:thanks|thank you|thx|ty|appreciate)\b/i],
    responses: knowledge.thanks },
  { patterns: [/how are you|how(?:'s| is) it going|how do you do/i],
    responses: knowledge.howAreYou },
  { patterns: [/(?:tell me a |do you know a )?joke/i], responses: [
    "Why do programmers prefer dark mode? Because light attracts bugs!",
    "Why did the developer go broke? Because they used up all their cache!",
    "There are only 10 types of people in the world: those who understand binary and those who don't.",
    "A SQL query walks into a bar, sees two tables, and asks... 'Can I JOIN you?'",
    "Why do Java developers wear glasses? Because they can't C#!",
    "What's a programmer's favorite hangout place? Foo Bar!",
  ]},
  { patterns: [/(?:what|when).*(?:day|date|today)/i], responses: [
    `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`,
  ]},
  { patterns: [/(?:what).*(?:time|hour|clock)/i], responses: [
    `The current server time is ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}.`,
  ]},
];

const topicResponses: Array<{patterns: RegExp[], generator: (msg: string) => string}> = [
  { patterns: [/(?:convert|how many)\s+(\d+\.?\d*)\s*(celsius|fahrenheit|c|f)\s+(?:to|in)\s*(celsius|fahrenheit|c|f)/i],
    generator: (msg: string) => {
      const m = msg.match(/(\d+\.?\d*)\s*(celsius|fahrenheit|c|f)\s+(?:to|in)\s*(celsius|fahrenheit|c|f)/i);
      if (!m) return "Please provide a temperature to convert, like: 'convert 100 fahrenheit to celsius'";
      const val = parseFloat(m[1]);
      const from = m[2].toLowerCase().startsWith('c') ? 'C' : 'F';
      const to = m[3].toLowerCase().startsWith('c') ? 'C' : 'F';
      if (from === to) return `${val}°${from} is already in ${from === 'C' ? 'Celsius' : 'Fahrenheit'}!`;
      if (from === 'C') { const f = (val * 9/5) + 32; return `${val}°C = ${f.toFixed(1)}°F`; }
      const c = (val - 32) * 5/9; return `${val}°F = ${c.toFixed(1)}°C`;
    }},
  { patterns: [/(?:convert|how many)\s+(\d+\.?\d*)\s*(km|kilometers?|miles?|mi)\s+(?:to|in)\s*(km|kilometers?|miles?|mi)/i],
    generator: (msg: string) => {
      const m = msg.match(/(\d+\.?\d*)\s*(km|kilometers?|miles?|mi)\s+(?:to|in)\s*(km|kilometers?|miles?|mi)/i);
      if (!m) return "Please specify the conversion.";
      const val = parseFloat(m[1]);
      const fromKm = m[2].toLowerCase().startsWith('k');
      if (fromKm) return `${val} km = ${(val * 0.621371).toFixed(2)} miles`;
      return `${val} miles = ${(val * 1.60934).toFixed(2)} km`;
    }},
  { patterns: [/(?:convert|how many)\s+(\d+\.?\d*)\s*(kg|kilograms?|pounds?|lbs?)\s+(?:to|in)\s*(kg|kilograms?|pounds?|lbs?)/i],
    generator: (msg: string) => {
      const m = msg.match(/(\d+\.?\d*)\s*(kg|kilograms?|pounds?|lbs?)\s+(?:to|in)\s*(kg|kilograms?|pounds?|lbs?)/i);
      if (!m) return "Please specify the conversion.";
      const val = parseFloat(m[1]);
      const fromKg = m[2].toLowerCase().startsWith('k');
      if (fromKg) return `${val} kg = ${(val * 2.20462).toFixed(2)} lbs`;
      return `${val} lbs = ${(val * 0.453592).toFixed(2)} kg`;
    }},
  { patterns: [/(?:define|definition|meaning of|what (?:is|does)\s+(?:the\s+)?word)\s+"?(\w+)"?/i, /what (?:is|does)\s+(\w+)\s+mean/i],
    generator: (msg: string) => {
      return `I'm a self-hosted AI, so I don't have a full dictionary database. However, I can help with many common terms and concepts! Try asking me about specific topics like science, math, technology, or general knowledge.`;
    }},
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSmartResponse(userMessage: string, conversationHistory: Array<{role: string, content: string}>): string {
  const msg = userMessage.trim();
  const lowerMsg = msg.toLowerCase();

  if (msg.length === 0) return "I didn't catch that. Could you say something?";

  const mathExpr = extractMathExpression(msg);
  if (mathExpr) {
    const result = evaluateMath(mathExpr);
    if (result !== null) {
      if (Number.isInteger(result)) return `${result}`;
      return `${parseFloat(result.toFixed(6))}`;
    }
  }

  if (/^(\d+\.?\d*)\s*[+\-*/%^×÷]\s*(\d+\.?\d*)$/.test(msg.trim())) {
    const result = evaluateMath(msg);
    if (result !== null) return `${Number.isInteger(result) ? result : parseFloat(result.toFixed(6))}`;
  }

  for (const ex of codeExamples) {
    for (const p of ex.patterns) {
      if (p.test(msg)) return `${ex.explanation}\n\n\`\`\`${ex.language}\n${ex.code}\n\`\`\``;
    }
  }

  for (const fact of facts) {
    for (const p of fact.patterns) {
      if (p.test(msg)) return fact.answer;
    }
  }

  for (const topic of topicResponses) {
    for (const p of topic.patterns) {
      if (p.test(msg)) return topic.generator(msg);
    }
  }

  for (const conv of conversationalPatterns) {
    for (const p of conv.patterns) {
      if (p.test(msg)) return pickRandom(conv.responses);
    }
  }

  if (/\b(?:write|create|make|build|code|program|script)\b.*\b(?:in|using|with)\s+\w+/i.test(msg)) {
    return `I can help with coding! I have examples for many languages. Try being specific, like:\n- "hello world in python"\n- "for loop in javascript"\n- "fibonacci in python"\n- "sort array in python"\n\nOr ask me about a specific programming concept!`;
  }

  if (/\b(?:how to|how do|how can)\b/i.test(msg)) {
    return generateHowToResponse(msg);
  }

  if (/\b(?:what is|what are|what's|whats)\b/i.test(msg)) {
    return generateWhatIsResponse(msg);
  }

  if (/\b(?:explain|describe|tell me about)\b/i.test(msg)) {
    return generateExplainResponse(msg);
  }

  if (/\b(?:why|reason)\b/i.test(msg)) {
    return generateWhyResponse(msg);
  }

  if (/\?$/.test(msg)) {
    return generateGeneralAnswer(msg, conversationHistory);
  }

  return generateConversationalResponse(msg, conversationHistory);
}

function generateHowToResponse(msg: string): string {
  const topic = msg.replace(/^how (?:to|do|can|would|should)\s+(?:i|you|we)?\s*/i, '').replace(/\?$/, '').trim();
  return `Great question about "${topic}"! Here's what I can tell you:\n\nAs a self-hosted AI, I work best with specific, well-defined questions. For "${topic}", I'd recommend:\n\n1. Break the problem into smaller steps\n2. Start with the basics and build up\n3. Practice with simple examples first\n\nTry asking me something more specific about ${topic}, and I'll do my best to help! I'm especially good with math, coding, and factual questions.`;
}

function generateWhatIsResponse(msg: string): string {
  const topic = msg.replace(/^what(?:'s| is| are)\s+(?:the\s+)?/i, '').replace(/\?$/, '').trim();
  if (topic.length < 2) return "Could you be more specific? What would you like to know about?";
  return `That's a great question about "${topic}"! As a self-hosted AI running locally, my knowledge covers many common topics. I'm especially strong with:\n\n- Math and calculations\n- Programming and coding\n- Science facts and concepts\n- Geography and world knowledge\n\nCould you ask something more specific about ${topic}? I'll give you the most accurate answer I can!`;
}

function generateExplainResponse(msg: string): string {
  const topic = msg.replace(/^(?:explain|describe|tell me about)\s+(?:the\s+)?/i, '').replace(/\?$/, '').trim();
  return `I'd love to explain "${topic}"! As a self-hosted AI, I have built-in knowledge about many topics. Try asking me specific questions like:\n\n- "What is photosynthesis?"\n- "What is gravity?"\n- "How does the internet work?"\n\nThe more specific your question, the better I can answer!`;
}

function generateWhyResponse(msg: string): string {
  return `That's a thoughtful question! I'll do my best to answer. As a self-hosted AI, I can provide factual answers about science, math, geography, and technology. For complex "why" questions, I'll give you what I know and point you in the right direction for deeper research.`;
}

function generateGeneralAnswer(msg: string, history: Array<{role: string, content: string}>): string {
  if (history.length > 0) {
    const lastAssistant = history.filter(m => m.role === 'assistant').slice(-1)[0];
    if (lastAssistant && /\b(yes|yeah|yep|sure|ok|okay)\b/i.test(msg)) {
      return "Got it! What else would you like to know? I'm ready to help with math, coding, facts, or just chat.";
    }
    if (/\b(no|nah|nope|not)\b/i.test(msg)) {
      return "No problem! Feel free to ask me something else. I'm here to help!";
    }
  }
  return `Interesting question! I'll try my best to help. I'm a self-hosted AI, so I'm strongest with math, coding, science facts, and general knowledge. Could you try rephrasing or being more specific? That helps me give you a better answer!`;
}

function generateConversationalResponse(msg: string, history: Array<{role: string, content: string}>): string {
  const responses = [
    `Interesting! Tell me more about what you're thinking.`,
    `I hear you! Is there something specific I can help with?`,
    `That's cool! I'm ready to help with whatever you need - math, coding, facts, you name it.`,
    `Got it! Want me to help with anything specific?`,
    `I appreciate you sharing that! What would you like to explore?`,
  ];
  return pickRandom(responses);
}

export async function generateLocalAIResponse(
  userMessage: string,
  conversationHistory: Array<{role: string, content: string}>,
  userTier: string = "free",
  selectedModel: string = "auto-select",
  userId: string = "",
  userLanguage: string = "en"
): Promise<string> {
  const startTime = Date.now();

  try {
    const response = generateSmartResponse(userMessage, conversationHistory);
    const elapsed = Date.now() - startTime;
    console.log(`[Local AI] Response generated in ${elapsed}ms`);
    return response;
  } catch (error) {
    console.error('[Local AI] Error:', error);
    return "Something went wrong on my end. Could you try rephrasing your question?";
  }
}

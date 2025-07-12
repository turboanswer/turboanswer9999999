import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Brain, Zap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const AI_MODELS = {
  // Core Models (Free & Premium)
  "auto": {
    name: "Auto-Select",
    description: "Intelligent routing to best available model",
    tier: "free",
    speed: "Ultra-Fast",
    color: "blue"
  },
  "research-pro": {
    name: "Research Pro Ultra",
    description: "TIME-INTENSIVE in-depth research with 22-step methodology - unlimited length up to 10M characters",
    tier: "premium",
    speed: "Time-Intensive",
    color: "red",
    isPaid: true
  },
  "conversational": {
    name: "Conversational AI",
    description: "Natural human conversations with personality matching",
    tier: "free",
    speed: "Fast",
    color: "green"
  },
  "emotional": {
    name: "Emotional AI",
    description: "Deep emotional intelligence with empathetic responses",
    tier: "free",
    speed: "Fast",
    color: "purple"
  },
  "gemini-flash": {
    name: "Gemini 2.0 Flash",
    description: "Ultra-fast responses with breakthrough speed",
    tier: "premium",
    speed: "Lightning",
    color: "yellow",
    isPaid: true
  },
  "claude-opus": {
    name: "Claude 3 Opus",
    description: "Advanced reasoning and creative tasks",
    tier: "premium",
    speed: "Medium",
    color: "orange",
    isPaid: true
  },
  "gpt-4": {
    name: "GPT-4",
    description: "Multimodal intelligence and coding expertise",
    tier: "premium",
    speed: "Medium",
    color: "indigo",
    isPaid: true
  },
  "claude-sonnet": {
    name: "Claude 3 Sonnet",
    description: "Balanced performance with detailed analysis",
    tier: "premium",
    speed: "Fast",
    color: "teal",
    isPaid: true
  },
  "gpt-3.5": {
    name: "GPT-3.5 Turbo",
    description: "Fast responses for general queries",
    tier: "free",
    speed: "Fast",
    color: "cyan"
  },
  "gemini-pro": {
    name: "Gemini Pro",
    description: "Multimodal capabilities and research",
    tier: "free",
    speed: "Medium",
    color: "red"
  },
  
  // Specialized Professional AI Models (Premium)
  "creative-genius": {
    name: "Creative Genius AI",
    description: "Innovative creative solutions, artistic concepts, and imaginative storytelling",
    tier: "premium",
    speed: "Creative",
    color: "purple",
    isPaid: true
  },
  "code-architect": {
    name: "Code Architect Pro",
    description: "Advanced programming, system architecture, and technical documentation",
    tier: "premium",
    speed: "Technical",
    color: "green",
    isPaid: true
  },
  "business-strategist": {
    name: "Business Strategist AI",
    description: "Strategic planning, market analysis, and executive decision-making",
    tier: "premium",
    speed: "Strategic",
    color: "blue",
    isPaid: true
  },
  "scientific-researcher": {
    name: "Scientific Researcher",
    description: "Advanced research methodology, data analysis, and academic writing",
    tier: "premium",
    speed: "Research",
    color: "cyan",
    isPaid: true
  },
  "language-master": {
    name: "Language Master AI",
    description: "90+ languages with cultural context and translation expertise",
    tier: "premium",
    speed: "Linguistic",
    color: "orange",
    isPaid: true
  },
  "problem-solver": {
    name: "Problem Solver Pro",
    description: "Complex reasoning, logic puzzles, and systematic solution development",
    tier: "premium",
    speed: "Analytical",
    color: "red",
    isPaid: true
  },
  "medical-advisor": {
    name: "Medical Advisor AI",
    description: "Health information, symptom analysis, and medical research guidance",
    tier: "premium",
    speed: "Medical",
    color: "green",
    isPaid: true
  },
  "financial-analyst": {
    name: "Financial Analyst Pro",
    description: "Investment research, market analysis, and financial planning expertise",
    tier: "premium",
    speed: "Financial",
    color: "emerald",
    isPaid: true
  },
  "legal-consultant": {
    name: "Legal Consultant AI",
    description: "Legal research, document analysis, and regulatory compliance guidance",
    tier: "premium",
    speed: "Legal",
    color: "violet",
    isPaid: true
  },
  "marketing-expert": {
    name: "Marketing Expert AI",
    description: "Brand strategy, content creation, and campaign optimization",
    tier: "premium",
    speed: "Marketing",
    color: "pink",
    isPaid: true
  },
  "data-scientist": {
    name: "Data Scientist Pro",
    description: "Advanced analytics, machine learning, and statistical modeling",
    tier: "premium",
    speed: "Analytics",
    color: "blue",
    isPaid: true
  },
  "cybersecurity-expert": {
    name: "Cybersecurity Expert",
    description: "Threat intelligence, security analysis, and defense strategies",
    tier: "premium",
    speed: "Security",
    color: "red",
    isPaid: true
  },
  "ux-designer": {
    name: "UX Designer Pro",
    description: "User experience design, interface optimization, and design systems",
    tier: "premium",
    speed: "Design",
    color: "purple",
    isPaid: true
  },
  "project-manager": {
    name: "Project Manager AI",
    description: "Agile coordination, team management, and project delivery",
    tier: "premium",
    speed: "Management",
    color: "orange",
    isPaid: true
  },
  "content-creator": {
    name: "Content Creator Pro",
    description: "Strategic storytelling, multimedia content, and audience engagement",
    tier: "premium",
    speed: "Creative",
    color: "indigo",
    isPaid: true
  },
  "ai-ethics-advisor": {
    name: "AI Ethics Advisor",
    description: "Responsible AI development and ethical technology governance",
    tier: "premium",
    speed: "Ethics",
    color: "slate",
    isPaid: true
  },
  "devops-engineer": {
    name: "DevOps Engineer Pro",
    description: "Infrastructure automation, CI/CD, and deployment strategies",
    tier: "premium",
    speed: "DevOps",
    color: "teal",
    isPaid: true
  },
  "sales-expert": {
    name: "Sales Expert AI",
    description: "Revenue optimization, customer acquisition, and sales strategy",
    tier: "premium",
    speed: "Sales",
    color: "green",
    isPaid: true
  },
  "hr-specialist": {
    name: "HR Specialist Pro",
    description: "Talent management, organizational development, and HR strategy",
    tier: "premium",
    speed: "HR",
    color: "amber",
    isPaid: true
  },
  "supply-chain": {
    name: "Supply Chain Expert",
    description: "Logistics optimization, operations efficiency, and supply management",
    tier: "premium",
    speed: "Logistics",
    color: "yellow",
    isPaid: true
  },
  "environmental-scientist": {
    name: "Environmental Scientist",
    description: "Sustainability analysis, environmental impact, and green technology",
    tier: "premium",
    speed: "Environmental",
    color: "green",
    isPaid: true
  },
  "quality-assurance": {
    name: "Quality Assurance Pro",
    description: "Testing excellence, quality management, and defect prevention",
    tier: "premium",
    speed: "Quality",
    color: "blue",
    isPaid: true
  },
  "product-manager": {
    name: "Product Manager Pro",
    description: "Product strategy, roadmap planning, and user experience optimization",
    tier: "premium",
    speed: "Product",
    color: "cyan",
    isPaid: true
  },
  "blockchain-expert": {
    name: "Blockchain Expert",
    description: "Cryptocurrency, decentralized finance, and blockchain technology",
    tier: "premium",
    speed: "Blockchain",
    color: "orange",
    isPaid: true
  },
  "education-specialist": {
    name: "Education Specialist",
    description: "Learning design, curriculum development, and educational technology",
    tier: "premium",
    speed: "Education",
    color: "violet",
    isPaid: true
  },
  "psychology-expert": {
    name: "Psychology Expert",
    description: "Behavioral analysis, mental health insights, and psychological research",
    tier: "premium",
    speed: "Psychology",
    color: "pink",
    isPaid: true
  },
  "architecture-expert": {
    name: "Architecture Expert",
    description: "Building design, structural engineering, and architectural planning",
    tier: "premium",
    speed: "Architecture",
    color: "stone",
    isPaid: true
  },
  "gaming-expert": {
    name: "Gaming Expert",
    description: "Game design, interactive entertainment, and gaming industry analysis",
    tier: "premium",
    speed: "Gaming",
    color: "purple",
    isPaid: true
  },
  "fitness-coach": {
    name: "Fitness Coach Pro",
    description: "Health optimization, fitness training, and wellness coaching",
    tier: "premium",
    speed: "Fitness",
    color: "red",
    isPaid: true
  },
  "travel-expert": {
    name: "Travel Expert",
    description: "Travel planning, destination insights, and tourism optimization",
    tier: "premium",
    speed: "Travel",
    color: "blue",
    isPaid: true
  },
  "social-media": {
    name: "Social Media Expert",
    description: "Social strategy, content virality, and community building",
    tier: "premium",
    speed: "Social",
    color: "pink",
    isPaid: true
  },
  "real-estate": {
    name: "Real Estate Expert",
    description: "Property analysis, market trends, and investment strategies",
    tier: "premium",
    speed: "Real Estate",
    color: "emerald",
    isPaid: true
  },
  "agriculture": {
    name: "Agriculture Expert",
    description: "Crop optimization, sustainable farming, and agricultural technology",
    tier: "premium",
    speed: "Agriculture",
    color: "green",
    isPaid: true
  },
  "aerospace": {
    name: "Aerospace Expert",
    description: "Space technology, aviation engineering, and aerospace design",
    tier: "premium",
    speed: "Aerospace",
    color: "indigo",
    isPaid: true
  },
  "marine-biology": {
    name: "Marine Biology Expert",
    description: "Ocean ecosystems, marine conservation, and aquatic research",
    tier: "premium",
    speed: "Marine",
    color: "blue",
    isPaid: true
  },
  "mega-fusion": {
    name: "Mega Fusion AI",
    description: "Combines 10+ AI models for unprecedented intelligence and reasoning capabilities",
    tier: "premium",
    speed: "Maximum Power",
    color: "gold",
    isPaid: true
  }
};

export default function AISettings() {
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('selectedAIModel') || 'auto';
  });

  useEffect(() => {
    localStorage.setItem('selectedAIModel', selectedModel);
  }, [selectedModel]);

  const freeModels = Object.entries(AI_MODELS).filter(([_, model]) => model.tier === "free");
  const premiumModels = Object.entries(AI_MODELS).filter(([_, model]) => model.tier === "premium");

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case "Lightning":
      case "Ultra-Fast":
        return "bg-green-500";
      case "Fast":
        return "bg-blue-500";
      case "Medium":
        return "bg-yellow-500";
      case "Time-Intensive":
        return "bg-red-500";
      default:
        return "bg-purple-500";
    }
  };

  const getTierColor = (tier: string) => {
    return tier === "free" ? "bg-green-100 text-green-800" : "bg-purple-100 text-purple-800";
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Chat
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-400" />
            <h1 className="text-xl font-semibold">AI Model Settings</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Choose Your AI Assistant</h2>
          <p className="text-gray-400">
            Select from 40 specialized AI models designed for different tasks and expertise areas.
          </p>
        </div>

        <RadioGroup value={selectedModel} onValueChange={setSelectedModel} className="space-y-4">
          {/* Free Models Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-400" />
              Free Models
            </h3>
            <div className="grid gap-4">
              {freeModels.map(([key, model]) => (
                <Card key={key} className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value={key} id={key} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={key} className="cursor-pointer">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-white">{model.name}</span>
                            <Badge variant="secondary" className={getTierColor(model.tier)}>
                              {model.tier}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${getSpeedColor(model.speed)}`} />
                              <span className="text-xs text-gray-400">{model.speed}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-400 leading-relaxed">
                            {model.description}
                          </p>
                        </Label>
                      </div>
                      {selectedModel === key && (
                        <CheckCircle className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Premium Models Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              Premium Models ({premiumModels.length} Specialized Experts)
            </h3>
            <div className="grid gap-4">
              {premiumModels.map(([key, model]) => (
                <Card key={key} className="bg-gray-900 border-gray-700 hover:border-purple-600 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <RadioGroupItem value={key} id={key} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={key} className="cursor-pointer">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-white">{model.name}</span>
                            <Badge variant="secondary" className={getTierColor(model.tier)}>
                              {model.tier}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${getSpeedColor(model.speed)}`} />
                              <span className="text-xs text-gray-400">{model.speed}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-400 leading-relaxed">
                            {model.description}
                          </p>
                        </Label>
                      </div>
                      {selectedModel === key && (
                        <CheckCircle className="h-5 w-5 text-purple-400 mt-1 flex-shrink-0" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </RadioGroup>

        <div className="mt-8 p-4 bg-gray-900 rounded-lg border border-gray-700">
          <h4 className="font-medium text-white mb-2">Current Selection</h4>
          <p className="text-gray-400">
            {selectedModel && AI_MODELS[selectedModel as keyof typeof AI_MODELS] 
              ? `${AI_MODELS[selectedModel as keyof typeof AI_MODELS].name} - ${AI_MODELS[selectedModel as keyof typeof AI_MODELS].description}`
              : "No model selected"}
          </p>
        </div>
      </main>
    </div>
  );
}
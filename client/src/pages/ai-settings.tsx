import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Brain, Zap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const AI_MODELS = {
  "auto": {
    name: "Auto-Select",
    description: "Intelligent routing to best available model",
    tier: "free",
    speed: "Ultra-Fast",
    color: "blue"
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
    color: "yellow"
  },
  "claude-opus": {
    name: "Claude 3 Opus",
    description: "Advanced reasoning and creative tasks",
    tier: "premium",
    speed: "Medium",
    color: "orange"
  },
  "gpt-4": {
    name: "GPT-4",
    description: "Multimodal intelligence and coding expertise",
    tier: "premium",
    speed: "Medium",
    color: "indigo"
  },
  "claude-sonnet": {
    name: "Claude 3 Sonnet",
    description: "Balanced performance with detailed analysis",
    tier: "premium",
    speed: "Fast",
    color: "teal"
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
  }
};

export default function AISettings() {
  const [selectedModel, setSelectedModel] = useState("auto");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load saved preference
    const saved = localStorage.getItem("preferredAIModel");
    if (saved) {
      setSelectedModel(saved);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("preferredAIModel", selectedModel);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "border-blue-500 bg-blue-950",
      green: "border-green-500 bg-green-950",
      purple: "border-purple-500 bg-purple-950",
      yellow: "border-yellow-500 bg-yellow-950",
      orange: "border-orange-500 bg-orange-950",
      indigo: "border-indigo-500 bg-indigo-950",
      teal: "border-teal-500 bg-teal-950",
      cyan: "border-cyan-500 bg-cyan-950",
      red: "border-red-500 bg-red-950"
    };
    return colors[color as keyof typeof colors] || "border-gray-500 bg-gray-950";
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Link href="/home">
            <Button variant="ghost" size="sm" className="mr-4 text-gray-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center">
            <Brain className="h-8 w-8 text-blue-500 mr-3" />
            <h1 className="text-3xl font-bold">AI Model Settings</h1>
          </div>
        </div>

        <p className="text-gray-400 mb-8">Choose your preferred AI model for conversations. Each model has different strengths and capabilities.</p>

        {/* Current Selection */}
        {saved && (
          <div className="mb-6 p-4 bg-green-950 border border-green-500 rounded-lg flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <span className="text-green-300">Settings saved successfully!</span>
          </div>
        )}

        {/* AI Model Selection */}
        <RadioGroup value={selectedModel} onValueChange={setSelectedModel} className="space-y-4">
          {Object.entries(AI_MODELS).map(([key, model]) => (
            <div key={key} className="relative">
              <Label 
                htmlFor={key} 
                className={`block cursor-pointer transition-all hover:scale-[1.02] ${
                  selectedModel === key ? getColorClasses(model.color) : "border-gray-800 bg-gray-900"
                } border rounded-lg p-1`}
              >
                <Card className="bg-transparent border-none shadow-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <RadioGroupItem value={key} id={key} className="mr-3" />
                        <div className="flex items-center">
                          <Zap className={`h-5 w-5 mr-2 text-${model.color}-500`} />
                          <CardTitle className="text-white text-lg">{model.name}</CardTitle>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={model.tier === "premium" ? "default" : "secondary"}>
                          {model.tier}
                        </Badge>
                        <Badge variant="outline" className="border-gray-600">
                          {model.speed}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="ml-8 text-gray-300">
                      {model.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Label>
            </div>
          ))}
        </RadioGroup>

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            Save Settings
          </Button>
          <Link href="/">
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              Start Chat with {AI_MODELS[selectedModel as keyof typeof AI_MODELS]?.name}
            </Button>
          </Link>
        </div>

        {/* Model Information */}
        <Card className="mt-8 bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Model Capabilities</CardTitle>
          </CardHeader>
          <CardContent className="text-gray-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-white mb-2">Free Tier Models</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Auto-Select: Best available model</li>
                  <li>• Conversational AI: Natural conversations</li>
                  <li>• Emotional AI: Empathetic responses</li>
                  <li>• GPT-3.5 Turbo: Fast general queries</li>
                  <li>• Gemini Pro: Research and analysis</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-white mb-2">Premium Models</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Gemini 2.0 Flash: Ultra-fast responses</li>
                  <li>• Claude 3 Opus: Advanced reasoning</li>
                  <li>• GPT-4: Multimodal intelligence</li>
                  <li>• Claude 3 Sonnet: Detailed analysis</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
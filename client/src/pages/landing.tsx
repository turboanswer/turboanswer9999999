import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Zap, Brain, FileText, Globe, Shield, MessageSquare } from "lucide-react";
import { Link } from "wouter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-black/80 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-7 w-7 text-blue-500" />
            <span className="text-xl font-bold">Turbo Answer</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/pricing">
              <Button variant="ghost" className="text-gray-300 hover:text-white">
                Pricing
              </Button>
            </Link>
            <Link href="/support">
              <Button variant="ghost" className="text-gray-300 hover:text-white">
                Support
              </Button>
            </Link>
            <a href="/api/login">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Log In
              </Button>
            </a>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-5xl lg:text-6xl font-serif font-bold leading-tight">
              AI That{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Understands
              </span>{" "}
              You
            </h1>
            <p className="text-lg text-gray-400 max-w-lg">
              Advanced multi-model AI assistant with document analysis, live camera vision, and multilingual support. Get instant, intelligent answers to anything.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="/api/login">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-6">
                  Get Started
                </Button>
              </a>
              <Link href="/business">
                <Button size="lg" variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 text-lg px-8 py-6">
                  For Business
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Shield className="h-4 w-4" /> Free forever plan
              </span>
              <span>No credit card required</span>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="relative rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 ring-1 ring-white/10 hover:scale-[1.02] transition-transform duration-300">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="bg-gray-800 rounded-xl p-3 text-sm text-gray-300">
                    Analyze this contract and summarize the key terms
                  </div>
                </div>
                <div className="flex items-start gap-3 justify-end">
                  <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 rounded-xl p-3 text-sm text-gray-200 max-w-[80%]">
                    I've analyzed the contract. Here are the 5 key terms: 1) Payment terms are Net-30... 2) Liability is capped at...
                  </div>
                  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                    <Brain className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-serif font-bold text-center mb-12">
            Powerful Features
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-gray-900/50 border-gray-800 hover:bg-gray-900 transition-colors">
              <CardContent className="p-6 space-y-3">
                <Brain className="h-10 w-10 text-blue-400" />
                <h3 className="text-xl font-semibold">Multi-Model AI</h3>
                <p className="text-gray-400">
                  Access multiple AI models including Gemini, GPT, and more for the best possible answers.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800 hover:bg-gray-900 transition-colors">
              <CardContent className="p-6 space-y-3">
                <FileText className="h-10 w-10 text-green-400" />
                <h3 className="text-xl font-semibold">Document Analysis</h3>
                <p className="text-gray-400">
                  Upload documents, images, and files for instant AI-powered analysis and insights.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gray-900/50 border-gray-800 hover:bg-gray-900 transition-colors">
              <CardContent className="p-6 space-y-3">
                <Globe className="h-10 w-10 text-purple-400" />
                <h3 className="text-xl font-semibold">Multilingual</h3>
                <p className="text-gray-400">
                  Communicate in any language with automatic detection and native-quality responses.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            <span className="font-semibold">Turbo Answer</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="/privacy-policy" className="hover:text-gray-300">Privacy Policy</Link>
            <Link href="/support" className="hover:text-gray-300">Support</Link>
            <Link href="/business" className="hover:text-gray-300">Business</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

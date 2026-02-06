import { Link } from "wouter";
import { MessageSquare, Settings, Zap, Brain, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { user, logout, isLoggingOut } = useAuth();

  const displayName = user?.firstName || user?.email || "User";

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {user?.profileImageUrl && (
                <img
                  src={user.profileImageUrl}
                  alt={displayName}
                  className="w-10 h-10 rounded-full ring-2 ring-blue-500"
                />
              )}
              <span className="text-gray-400">Welcome, {displayName}</span>
            </div>
            <div className="flex items-center justify-center flex-1">
              <Zap className="h-12 w-12 text-blue-500 mr-3" />
              <h1 className="text-4xl font-bold">Turbo Answer</h1>
            </div>
            <a href="/api/logout">
              <button
                className="flex items-center justify-center p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </a>
          </div>
          <p className="text-gray-400 text-lg">Advanced AI Assistant with Multi-Model Intelligence</p>
        </div>

        <div className="max-w-2xl mx-auto mb-8">
          <div className="space-y-4">
            <Link href="/">
              <Card className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-colors border-0 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-center space-x-4">
                    <MessageSquare className="h-10 w-10 text-white" />
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-white">Start Chatting</h3>
                      <p className="text-blue-100">Begin a conversation with AI</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/ai-settings">
                <Card className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Brain className="h-6 w-6 text-green-400" />
                      <div>
                        <h4 className="font-semibold text-white">AI Settings</h4>
                        <p className="text-sm text-gray-400">Choose AI model</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/employee/dashboard">
                <Card className="bg-gray-900 border-gray-700 hover:border-gray-600 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-6 w-6 text-purple-400" />
                      <div>
                        <h4 className="font-semibold text-white">Admin Panel</h4>
                        <p className="text-sm text-gray-400">Manage users</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Zap className="h-6 w-6 text-yellow-500 mr-2" />
                AI Features
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300">
              <ul className="space-y-2">
                <li>Ultra-fast responses with Gemini 2.0</li>
                <li>Emotional AI with empathy</li>
                <li>Multi-model intelligence</li>
                <li>Voice commands support</li>
                <li>Document analysis</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Settings className="h-6 w-6 text-blue-500 mr-2" />
                Platform Features
              </CardTitle>
            </CardHeader>
            <CardContent className="text-gray-300">
              <ul className="space-y-2">
                <li>Chat history tracking</li>
                <li>User management</li>
                <li>Admin controls</li>
                <li>Subscription system</li>
                <li>Mobile-optimized</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/pricing">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                Pricing
              </Button>
            </Link>
            <Link href="/support">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                Support
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

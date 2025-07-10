import { Link } from "wouter";
import { MessageSquare, Settings, Zap, Brain, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function Home() {
  const queryClient = useQueryClient();

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/logout', {}),
    onSuccess: () => {
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      queryClient.clear();
      window.location.href = '/login';
    },
    onError: () => {
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    },
  });

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Zap className="h-12 w-12 text-blue-500 mr-3" />
            <h1 className="text-4xl font-bold">Turbo Answer</h1>
          </div>
          <p className="text-gray-400 text-lg">Advanced AI Assistant with Multi-Model Intelligence</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-800 hover:border-blue-500 transition-colors">
            <CardHeader>
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-blue-500 mr-3" />
                <CardTitle className="text-white">New Chat</CardTitle>
              </div>
              <CardDescription>Start a conversation with AI</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Start Chatting
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 hover:border-green-500 transition-colors">
            <CardHeader>
              <div className="flex items-center">
                <Brain className="h-8 w-8 text-green-500 mr-3" />
                <CardTitle className="text-white">AI Settings</CardTitle>
              </div>
              <CardDescription>Choose your AI model</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/ai-settings">
                <Button className="w-full bg-green-600 hover:bg-green-700">
                  Configure AI
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 hover:border-purple-500 transition-colors">
            <CardHeader>
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-purple-500 mr-3" />
                <CardTitle className="text-white">Admin Panel</CardTitle>
              </div>
              <CardDescription>Employee management</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/employee/login">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Admin Access
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
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
                <li>• Ultra-fast responses with Gemini 2.0</li>
                <li>• Emotional AI with empathy</li>
                <li>• Multi-model intelligence</li>
                <li>• Voice commands support</li>
                <li>• Document analysis</li>
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
                <li>• Chat history tracking</li>
                <li>• User management</li>
                <li>• Admin controls</li>
                <li>• Subscription system</li>
                <li>• Mobile-optimized</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Navigation */}
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
            <Link href="/register">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                Register
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                Login
              </Button>
            </Link>
          </div>
        </div>

        {/* Logout Button */}
        <div className="fixed bottom-4 right-4">
          <Button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4"
            size="sm"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
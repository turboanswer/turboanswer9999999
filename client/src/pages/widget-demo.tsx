import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Code, Copy, ExternalLink, MessageSquare, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';

export default function WidgetDemo() {
  const [copied, setCopied] = useState(false);

  const integrationCode = `<!-- Turbo Answer AI Widget -->
<script src="https://turbo-answer.replit.app/widget.js"></script>
<script>
  // Optional configuration
  window.TURBO_WIDGET_POSITION = 'bottom-right';
  window.TURBO_WIDGET_THEME = 'dark';
  window.TURBO_WIDGET_COLOR = '#8b5cf6';
  window.TURBO_WIDGET_BUSINESS = 'Your Business';
  window.TURBO_WIDGET_WELCOME = 'Hi! How can I help you today?';
</script>`;

  const simpleCode = `<script src="https://turbo-answer.replit.app/widget.js"></script>`;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Back button */}
        <div className="pt-4">
          <Link href="/">
            <Button variant="ghost" className="text-gray-400 hover:text-white gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center py-4">
          <h1 className="text-4xl font-bold mb-4">Turbo Answer Widget</h1>
          <p className="text-xl text-gray-400">Add AI Assistant to Any Website in 30 Seconds</p>
        </div>

        {/* Quick Start */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-500" />
              Quick Start (1 Line of Code)
            </CardTitle>
            <CardDescription>Copy and paste this into your website's HTML</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-black p-4 rounded-lg overflow-x-auto">
                <code className="text-green-400">{simpleCode}</code>
              </pre>
              <Button
                size="sm"
                onClick={() => copyCode(simpleCode)}
                className="absolute top-2 right-2"
              >
                {copied ? 'Copied!' : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Full Integration */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5 text-blue-500" />
              Full Integration with Customization
            </CardTitle>
            <CardDescription>Customize appearance and behavior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-black p-4 rounded-lg overflow-x-auto">
                <code className="text-green-400">{integrationCode}</code>
              </pre>
              <Button
                size="sm"
                onClick={() => copyCode(integrationCode)}
                className="absolute top-2 right-2"
              >
                {copied ? 'Copied!' : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg">🚀 Instant Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">No registration required. Just add one line of code and your AI assistant is live.</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg">🧠 Mega Fusion AI</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">Powered by 20+ AI models including GPT-4, Claude, and Gemini for maximum intelligence.</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg">🎨 Fully Customizable</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">Match your brand with custom colors, position, and messaging.</p>
            </CardContent>
          </Card>
        </div>

        {/* Platform Support */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle>Works on Every Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-black rounded-lg">
                <p className="font-semibold">WordPress</p>
              </div>
              <div className="p-4 bg-black rounded-lg">
                <p className="font-semibold">Shopify</p>
              </div>
              <div className="p-4 bg-black rounded-lg">
                <p className="font-semibold">Wix</p>
              </div>
              <div className="p-4 bg-black rounded-lg">
                <p className="font-semibold">Squarespace</p>
              </div>
              <div className="p-4 bg-black rounded-lg">
                <p className="font-semibold">React</p>
              </div>
              <div className="p-4 bg-black rounded-lg">
                <p className="font-semibold">Vue</p>
              </div>
              <div className="p-4 bg-black rounded-lg">
                <p className="font-semibold">Angular</p>
              </div>
              <div className="p-4 bg-black rounded-lg">
                <p className="font-semibold">HTML</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Demo */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-500" />
              Live Demo
            </CardTitle>
            <CardDescription>See the widget in action on this page</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 mb-4">
              Look at the bottom-right corner of this page to see the Turbo Answer widget in action. 
              Click on it to start chatting!
            </p>
            <Button 
              onClick={() => {
                const widget = document.getElementById('turbo-widget-button');
                if (widget) widget.click();
              }}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Open Widget Demo
            </Button>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-4">Ready to Add AI to Your Website?</h2>
          <p className="text-gray-400 mb-6">
            Copy the code above and paste it into your website. It's that simple!
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            onClick={() => window.open('https://github.com/yourusername/turbo-answer-widget', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Documentation
          </Button>
        </div>
      </div>

      {/* Add the widget to this demo page */}
      <script dangerouslySetInnerHTML={{ __html: `
        window.TURBO_WIDGET_API = '/api/widget';
        window.TURBO_WIDGET_BUSINESS = 'Turbo Answer Demo';
        window.TURBO_WIDGET_WELCOME = 'Hi! I\'m the Turbo Answer AI. Try asking me anything!';
      ` }} />
    </div>
  );
}
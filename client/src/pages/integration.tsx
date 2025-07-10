import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Code2, Zap, Globe, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Integration() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState("html");
  const { toast } = useToast();

  const copyToClipboard = (code: string, label: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Copied!",
      description: `${label} code copied to clipboard`,
    });
  };

  const integrationCodes = {
    html: {
      title: "HTML/Static Sites",
      code: `<script src="https://turbo-answer-ai.uc.r.appspot.com/widget/turbo-widget.js"></script>
<script>
TurboWidget.init({
    primaryColor: '#3b82f6',
    welcomeMessage: 'Hi! How can I help you?'
});
</script>`,
      description: "Add before closing </body> tag"
    },
    wordpress: {
      title: "WordPress",
      code: `<!-- Add to theme's footer.php before </body> -->
<script src="https://turbo-answer-ai.uc.r.appspot.com/widget/turbo-widget.js"></script>
<script>
TurboWidget.init({
    primaryColor: '<?php echo get_theme_mod('primary_color', '#3b82f6'); ?>',
    welcomeMessage: 'Hi! How can I help you today?'
});
</script>`,
      description: "Add to your theme's footer.php file"
    },
    shopify: {
      title: "Shopify",
      code: `<!-- Add to theme.liquid before </body> -->
<script src="https://turbo-answer-ai.uc.r.appspot.com/widget/turbo-widget.js"></script>
<script>
TurboWidget.init({
    primaryColor: '{{ settings.accent_color }}',
    welcomeMessage: 'Hi! Need help with our products?'
});
</script>`,
      description: "Add to your theme.liquid file"
    },
    react: {
      title: "React/Next.js",
      code: `import { useEffect } from 'react';

export default function Layout({ children }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://turbo-answer-ai.uc.r.appspot.com/widget/turbo-widget.js';
    script.onload = () => {
      window.TurboWidget.init({
        primaryColor: '#3b82f6',
        position: 'bottom-right'
      });
    };
    document.body.appendChild(script);
    
    return () => document.body.removeChild(script);
  }, []);

  return <div>{children}</div>;
}`,
      description: "React component integration"
    }
  };

  const businessExamples = {
    ecommerce: {
      title: "E-commerce Store",
      code: `TurboWidget.init({
    primaryColor: '#10b981',
    welcomeMessage: 'Hi! Need help finding products?',
    position: 'bottom-right',
    size: 'medium'
});`,
      description: "Perfect for product help and customer support"
    },
    saas: {
      title: "SaaS Platform",
      code: `TurboWidget.init({
    primaryColor: '#8b5cf6',
    welcomeMessage: 'Welcome! How can I help you get started?',
    position: 'bottom-left',
    size: 'large'
});`,
      description: "Ideal for user onboarding and feature guidance"
    },
    services: {
      title: "Professional Services",
      code: `TurboWidget.init({
    primaryColor: '#1f2937',
    welcomeMessage: 'Hello! Ask me about our services.',
    theme: 'dark',
    position: 'bottom-right'
});`,
      description: "Great for service inquiries and consultations"
    }
  };

  const advancedCode = `TurboWidget.init({
    // Required for premium features
    apiKey: 'your-api-key-here',
    
    // Appearance
    primaryColor: '#ff6b35',
    theme: 'auto',  // 'light', 'dark', 'auto'
    size: 'medium', // 'small', 'medium', 'large'
    position: 'bottom-left',
    
    // Messages
    welcomeMessage: 'Hi! How can I help your business?',
    
    // Analytics (optional)
    onMessage: function(message, response) {
        gtag('event', 'ai_chat', {
            'message_length': message.length,
            'domain': window.location.hostname
        });
    }
});`;

  const apiCode = `// Programmatic control
TurboWidget.open();
TurboWidget.sendMessage('Hello, I need help with pricing');
TurboWidget.close();

// Event listeners
TurboWidget.on('message', function(data) {
    console.log('User asked:', data.message);
    console.log('AI responded:', data.response);
});

// Custom triggers
document.getElementById('help-button').onclick = function() {
    TurboWidget.open();
};`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <Badge className="mb-4" variant="outline">
            <Code2 className="w-4 h-4 mr-2" />
            Integration Guide
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Add AI to Your Website in 2 Minutes
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Copy, paste, and customize our AI widget for your business. Works with any website platform.
          </p>
        </div>

        {/* Quick Start */}
        <Card className="mb-12 border-0 shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Quick Start (30 Seconds)</CardTitle>
            <CardDescription className="text-base">
              Copy this code and paste it before the closing &lt;/body&gt; tag on your website
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 rounded-lg p-6 relative">
              <Button
                variant="outline"
                size="sm"
                className="absolute top-4 right-4 text-white border-gray-600"
                onClick={() => copyToClipboard(`<script src="https://turbo-answer-ai.uc.r.appspot.com/widget/turbo-widget.js"></script>
<script>
TurboWidget.init({
    primaryColor: '#3b82f6',
    position: 'bottom-right'
});
</script>`, "Quick Start")}
              >
                {copiedCode === "Quick Start" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap overflow-x-auto">
{`<script src="https://turbo-answer-ai.uc.r.appspot.com/widget/turbo-widget.js"></script>
<script>
TurboWidget.init({
    primaryColor: '#3b82f6',
    position: 'bottom-right'
});
</script>`}
              </pre>
            </div>
            <div className="mt-6 text-center">
              <Badge variant="secondary" className="text-sm">
                ✅ That's it! Your AI assistant is now live
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Platform Integration */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Platform-Specific Integration</h2>
          <Tabs value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="wordpress">WordPress</TabsTrigger>
              <TabsTrigger value="shopify">Shopify</TabsTrigger>
              <TabsTrigger value="react">React</TabsTrigger>
            </TabsList>
            
            {Object.entries(integrationCodes).map(([key, example]) => (
              <TabsContent key={key} value={key} className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Globe className="w-5 h-5" />
                        {example.title}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(example.code, example.title)}
                      >
                        {copiedCode === example.title ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </CardTitle>
                    <CardDescription>{example.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
                      <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                        {example.code}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Business Examples */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-8">Business Customization Examples</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {Object.entries(businessExamples).map(([key, example]) => (
              <Card key={key} className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    {example.title}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(example.code, example.title)}
                    >
                      {copiedCode === example.title ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </CardTitle>
                  <CardDescription className="text-sm">{example.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
                      {example.code}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Advanced Configuration */}
        <Card className="mb-12 border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Settings className="w-6 h-6" />
                  Advanced Configuration
                </CardTitle>
                <CardDescription className="text-base">
                  Full customization options with analytics and premium features
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(advancedCode, "Advanced Configuration")}
              >
                {copiedCode === "Advanced Configuration" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
              <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                {advancedCode}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* API Control */}
        <Card className="mb-12 border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Programmatic API Control</CardTitle>
                <CardDescription className="text-base">
                  Control the widget programmatically and listen for events
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(apiCode, "API Control")}
              >
                {copiedCode === "API Control" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
              <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                {apiCode}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Get API Key CTA */}
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white">
          <CardContent className="text-center py-12">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Get your API key for premium features and unlimited conversations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3">
                Get API Key
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3">
                Try Live Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
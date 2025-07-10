import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Code, Palette, Zap, Shield, BarChart3, Users, Globe } from "lucide-react";

export default function Business() {
  const [selectedExample, setSelectedExample] = useState("ecommerce");

  const integrationExamples = {
    ecommerce: {
      title: "E-commerce Store",
      code: `<script src="https://turbo-answer-ai.uc.r.appspot.com/widget/turbo-widget.js"></script>
<script>
TurboWidget.init({
    apiKey: 'your-api-key',
    primaryColor: '#10b981',
    welcomeMessage: 'Hi! Need help finding the perfect product?',
    position: 'bottom-right'
});
</script>`,
      description: "Perfect for product recommendations, order support, and customer service"
    },
    saas: {
      title: "SaaS Platform",
      code: `<script>
TurboWidget.init({
    apiKey: 'your-api-key',
    primaryColor: '#8b5cf6',
    welcomeMessage: 'Welcome! How can I help you get started?',
    position: 'bottom-left',
    size: 'large'
});
</script>`,
      description: "Ideal for user onboarding, feature explanation, and technical support"
    },
    services: {
      title: "Professional Services",
      code: `<script>
TurboWidget.init({
    apiKey: 'your-api-key',
    primaryColor: '#1f2937',
    welcomeMessage: 'Hello! I can answer questions about our services.',
    theme: 'dark'
});
</script>`,
      description: "Great for service inquiries, consultations, and lead qualification"
    }
  };

  const features = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Lightning Fast Setup",
      description: "Add AI to your website in under 2 minutes with a single script tag"
    },
    {
      icon: <Palette className="w-6 h-6" />,
      title: "Brand Customization",
      description: "Match your brand colors, position, and messaging perfectly"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Mobile Responsive",
      description: "Works flawlessly on desktop, tablet, and mobile devices"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Enterprise Security",
      description: "GDPR compliant with secure API authentication"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Analytics Ready",
      description: "Built-in tracking hooks for Google Analytics and custom metrics"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "24/7 Availability",
      description: "Never miss a customer with round-the-clock AI assistance"
    }
  ];

  const useCases = [
    {
      title: "Customer Support",
      description: "24/7 instant responses to common questions and troubleshooting",
      benefits: ["Reduce support tickets by 60%", "Instant problem resolution", "Escalate complex issues to humans"]
    },
    {
      title: "Sales Assistant",
      description: "AI-powered product recommendations and lead qualification",
      benefits: ["Increase conversion rates", "Qualify leads automatically", "Provide instant quotes"]
    },
    {
      title: "Technical Documentation",
      description: "Interactive help with complex technical topics and APIs",
      benefits: ["Reduce developer friction", "Interactive code examples", "Real-time debugging help"]
    },
    {
      title: "Educational Platform",
      description: "Answer questions about courses and guide learning paths",
      benefits: ["Improve course completion", "Personalized learning paths", "24/7 tutoring support"]
    }
  ];

  const pricingTiers = [
    {
      name: "Free Tier",
      price: "$0",
      period: "/month",
      description: "Perfect for small businesses getting started",
      features: [
        "100 conversations/month",
        "Basic customization",
        "Standard AI models",
        "Email support"
      ],
      cta: "Get Started Free",
      popular: false
    },
    {
      name: "Business Plan",
      price: "$29",
      period: "/month",
      description: "Ideal for growing businesses with high traffic",
      features: [
        "Unlimited conversations",
        "Premium AI models (GPT-4, Claude)",
        "Advanced customization",
        "Analytics dashboard",
        "Priority support"
      ],
      cta: "Start Business Plan",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "For large organizations with specific needs",
      features: [
        "Custom AI training",
        "White-label solution",
        "Dedicated account manager",
        "SLA guarantees",
        "On-premise deployment"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <Badge className="mb-4" variant="outline">
            🚀 AI Widget for Business
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Add AI to Any Website in 2 Minutes
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Transform your website with intelligent AI assistance. Reduce support tickets, 
            increase conversions, and provide 24/7 customer help with our embeddable AI widget.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3">
              Try Live Demo
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-3">
              View Integration Guide
            </Button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Turbo Answer AI Widget?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Integration Examples */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Integration Examples</h2>
        <div className="max-w-6xl mx-auto">
          <Tabs value={selectedExample} onValueChange={setSelectedExample}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ecommerce">E-commerce</TabsTrigger>
              <TabsTrigger value="saas">SaaS Platform</TabsTrigger>
              <TabsTrigger value="services">Professional Services</TabsTrigger>
            </TabsList>
            
            {Object.entries(integrationExamples).map(([key, example]) => (
              <TabsContent key={key} value={key} className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="w-5 h-5" />
                      {example.title}
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
      </div>

      {/* Use Cases */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Business Use Cases</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {useCases.map((useCase, index) => (
            <Card key={index} className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">{useCase.title}</CardTitle>
                <CardDescription className="text-base">{useCase.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {useCase.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">Simple, Transparent Pricing</h2>
        <p className="text-center text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
          Choose the plan that fits your business needs. All plans include our core AI features with no hidden fees.
        </p>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingTiers.map((tier, index) => (
            <Card key={index} className={`relative border-0 shadow-lg ${tier.popular ? 'ring-2 ring-blue-500' : ''}`}>
              {tier.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-gray-600 dark:text-gray-300">{tier.period}</span>
                </div>
                <CardDescription className="text-base">{tier.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className={`w-full ${tier.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                  variant={tier.popular ? 'default' : 'outline'}
                >
                  {tier.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white">
          <CardContent className="text-center py-16">
            <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Website?</h2>
            <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
              Join thousands of businesses using AI to improve customer experience and increase conversions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3">
                Get Your API Key
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3">
                Schedule Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
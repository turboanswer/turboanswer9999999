import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Simple() {
  const [copiedCode, setCopiedCode] = useState(false);
  const { toast } = useToast();

  const basicCode = `<script src="https://turbo-answer-ai.uc.r.appspot.com/widget/turbo-widget.js"></script>
<script>TurboWidget.init();</script>`;

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
  };

  const colors = [
    { name: "Blue", value: "#3b82f6" },
    { name: "Green", value: "#10b981" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Red", value: "#ef4444" },
    { name: "Orange", value: "#f97316" },
    { name: "Pink", value: "#ec4899" }
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">
            Add AI to Your Website
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Copy this code. Paste it on your website. Done.
          </p>
        </div>

        {/* Step 1 */}
        <Card className="mb-8 border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-4">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              Copy This Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 rounded-lg p-6 relative">
              <Button
                variant="outline"
                size="sm"
                className="absolute top-4 right-4 text-white border-gray-600"
                onClick={() => copyToClipboard(basicCode)}
              >
                {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <pre className="text-green-400 text-sm font-mono">
{basicCode}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card className="mb-8 border-2 border-green-200">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-4">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              Paste Before &lt;/body&gt;
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Add the code to your website before the closing &lt;/body&gt; tag.
            </p>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card className="mb-12 border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-4">
              <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              That's It!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Your website now has 24/7 AI customer support.
            </p>
          </CardContent>
        </Card>

        {/* Color Options */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-xl">Want to Change the Color?</CardTitle>
            <CardDescription>Click a color to see the code:</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {colors.map((color) => (
                <div
                  key={color.name}
                  className="p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => copyToClipboard(`<script>
TurboWidget.init({
    primaryColor: '${color.value}'
});
</script>`)}
                >
                  <div
                    className="w-8 h-8 rounded mb-2"
                    style={{ backgroundColor: color.value }}
                  ></div>
                  <div className="font-medium">{color.name}</div>
                  <div className="text-sm text-gray-500">{color.value}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              Replace the basic code with the color version.
            </p>
          </CardContent>
        </Card>

        {/* Live Demo */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">See It Working</h2>
            <p className="text-gray-600 mb-6">
              Click the blue chat button in the bottom-right corner to try it.
            </p>
            <Button 
              className="bg-blue-500 hover:bg-blue-600"
              onClick={() => (window as any).TurboWidget?.open()}
            >
              Open Chat Demo
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
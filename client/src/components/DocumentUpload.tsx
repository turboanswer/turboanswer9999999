import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X, CheckCircle, AlertCircle, FileIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface DocumentUploadProps {
  conversationId?: number;
  onAnalysisComplete?: (analysis: any) => void;
  initialFile?: File | null;
}

interface AnalysisOption {
  value: string;
  label: string;
  description: string;
}

export function DocumentUpload({ conversationId, onAnalysisComplete, initialFile }: DocumentUploadProps) {
  const { user } = useAuth();
  const hasReferralPro = !!(user?.referralProUntil && new Date(user.referralProUntil) > new Date());
  const isPremium = !!user && (
    user.isBetaTester ||
    hasReferralPro ||
    ['pro', 'research', 'enterprise', 'owner'].includes((user.subscriptionTier || 'free').toLowerCase())
  );
  const uploadLimitMb = isPremium ? 50 : 20;
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile ?? null);
  const [analysisType, setAnalysisType] = useState("general");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialFile) {
      setSelectedFile(initialFile);
      setAnalysisResult(null);
      setUploadProgress(0);
    }
  }, [initialFile]);
  const { toast } = useToast();

  // Get analysis options
  const { data: analysisOptions = [] } = useQuery<AnalysisOption[]>({
    queryKey: ["/api/analysis-options"],
  });

  // Get supported file types
  const { data: supportedTypes } = useQuery({
    queryKey: ["/api/supported-file-types"],
  });

  // Document analysis mutation
  const analyzeDocumentMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/analyze-document", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to analyze document");
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      setAnalysisResult(result);
      setUploadProgress(100);
      onAnalysisComplete?.(result);
      toast({
        title: "Analysis Complete",
        description: `Successfully analyzed ${result.filename}`,
      });
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > uploadLimitMb * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: `Please select a file smaller than ${uploadLimitMb}MB`,
          variant: "destructive",
        });
        return;
      }

      const allowedTypes = [
        'text/plain', 'application/pdf', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/csv', 'application/json', 'text/markdown', 'text/html',
        'text/xml', 'application/xml', 'application/rtf',
        'image/png', 'image/jpeg', 'image/webp', 'image/gif',
      ];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Unsupported File Type",
          description: "Supported: PDF, DOCX, XLSX, PPTX, TXT, CSV, JSON, MD, HTML, XML, RTF, PNG, JPG, GIF, WEBP",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setAnalysisResult(null);
      setUploadProgress(0);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('analysisType', analysisType);
    if (conversationId) {
      formData.append('conversationId', conversationId.toString());
    }

    setUploadProgress(10);
    analyzeDocumentMutation.mutate(formData);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setAnalysisResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5" />
        <h3 className="font-semibold">Document Analysis</h3>
      </div>

      {/* File Upload Area */}
      <div className="space-y-4">
        {!selectedFile ? (
          <div
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload a document to analyze
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Supported: PDF, DOCX, XLSX, PPTX, TXT, CSV, JSON, MD, HTML, XML, RTF, Images (Max {uploadLimitMb}MB{isPremium ? " — premium tier" : ""})
            </p>
            <Button variant="outline">
              Choose File
            </Button>
          </div>
        ) : (
          <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileIcon className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={removeFile}
                disabled={analyzeDocumentMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept=".txt,.pdf,.doc,.docx,.xlsx,.pptx,.csv,.json,.md,.html,.xml,.rtf,.png,.jpg,.jpeg,.webp,.gif"
          className="hidden"
        />
      </div>

      {/* Analysis Type Selection */}
      {selectedFile && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Analysis Type</label>
          <Select value={analysisType} onValueChange={setAnalysisType}>
            <SelectTrigger>
              <SelectValue placeholder="Select analysis type" />
            </SelectTrigger>
            <SelectContent>
              {analysisOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Upload Progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Analyzing document...</span>
            <span>{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && !analysisResult && (
        <Button
          onClick={handleUpload}
          disabled={analyzeDocumentMutation.isPending}
          className="w-full"
        >
          {analyzeDocumentMutation.isPending ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              Analyzing...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Analyze Document
            </>
          )}
        </Button>
      )}

      {/* Analysis Result */}
      {analysisResult && (
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Analysis Complete</span>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">File:</span> {analysisResult.filename}
              </div>
              <div>
                <span className="font-medium">Type:</span> {analysisResult.analysisType}
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium mb-2">Analysis Result:</h4>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {analysisResult.analysis}
              </div>
            </div>
            
            {analysisResult.contentPreview && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">
                  View document preview
                </summary>
                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono whitespace-pre-wrap">
                  {analysisResult.contentPreview}
                </div>
              </details>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/hooks/use-theme";
import { Link } from "wouter";
import TurboLogo from "@/components/TurboLogo";
import { AlertTriangle, CheckCircle, ArrowLeft, FlaskConical, ChevronRight } from "lucide-react";

const QUESTIONS = [
  {
    id: "q1",
    label: "What is your full name?",
    type: "input",
    placeholder: "John Doe",
  },
  {
    id: "q2",
    label: "What is your email address?",
    type: "input",
    placeholder: "you@example.com",
  },
  {
    id: "q3",
    label: "What is your occupation or field of work?",
    type: "input",
    placeholder: "Software Engineer, Student, Marketing Manager…",
  },
  {
    id: "q4",
    label: "How did you hear about TurboAnswer?",
    type: "select",
    options: ["Social Media", "Friend / Referral", "Search Engine", "Advertisement", "Other"],
  },
  {
    id: "q5",
    label: "How would you rate your experience with AI tools so far?",
    type: "select",
    options: ["Never used one", "Beginner", "Intermediate", "Advanced", "Expert"],
  },
  {
    id: "q6",
    label: "What features are you most excited to test?",
    type: "textarea",
    placeholder: "e.g., Matrix AI, voice commands, document analysis…",
  },
  {
    id: "q7",
    label: "How often would you use TurboAnswer if accepted?",
    type: "select",
    options: ["Daily", "A few times a week", "Weekly", "Occasionally"],
  },
  {
    id: "q8",
    label: "Are you willing to provide detailed written feedback on your experience?",
    type: "select",
    options: ["Yes, absolutely", "Yes, occasionally", "Not sure"],
  },
  {
    id: "q9",
    label: "Do you have any specific problems or use cases you hope TurboAnswer will solve for you?",
    type: "textarea",
    placeholder: "Describe a specific task or challenge you'd use TurboAnswer for…",
  },
  {
    id: "q10",
    label: "Is there anything else you'd like us to know about you or why you'd make a great beta tester?",
    type: "textarea",
    placeholder: "Tell us a bit more about yourself…",
  },
];

export default function BetaApply() {
  const { isDark } = useTheme();
  const [step, setStep] = useState<"form" | "success">("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Record<string, string>>();

  const onSubmit = async (data: Record<string, string>) => {
    setSubmitting(true);
    setError("");
    try {
      const answers: Record<string, string> = {};
      QUESTIONS.forEach((q, i) => {
        if (i >= 2) answers[q.label] = data[q.id] || "";
      });

      const res = await fetch("/api/beta/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data["q1"],
          email: data["q2"],
          answers,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to submit");
      setStep("success");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const bg = isDark ? "bg-[#030014] text-white" : "bg-gray-50 text-gray-900";
  const cardBg = isDark ? "bg-gray-900/80 border-gray-800" : "bg-white border-gray-200";
  const inputStyle = isDark
    ? "bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500"
    : "bg-white border-gray-300 text-gray-900 focus:border-purple-500";

  if (step === "success") {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center p-4`}>
        <div className={`${cardBg} border rounded-2xl p-10 max-w-md w-full text-center shadow-xl`}>
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Application Submitted!</h2>
          <p className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Thank you for applying to the TurboAnswer Beta Testing Program. We'll review your application and send you an email with our decision.
          </p>
          <Link href="/">
            <Button className="bg-purple-600 hover:bg-purple-700 text-white">Back to TurboAnswer</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* Header */}
      <div className={`border-b ${isDark ? "border-white/10 bg-black/40" : "border-gray-200 bg-white"} sticky top-0 z-10 backdrop-blur`}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className={isDark ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-900"}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <div className="flex items-center gap-2 ml-2">
            <TurboLogo size={28} animated={false} />
            <span className="font-bold">TurboAnswer Beta</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Banner */}
        <div className="mb-8 rounded-xl border-2 border-yellow-500/50 bg-yellow-500/10 p-5 flex gap-4 items-start">
          <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-yellow-400 mb-1">Beta Testing Program — Important Notice</p>
            <p className={`text-sm ${isDark ? "text-yellow-100/80" : "text-yellow-800"}`}>
              This is strictly a <strong>beta testing application</strong>. Submitting this form is not a job application and will not affect any employment considerations. We are looking for users to help test and improve TurboAnswer before its full public launch.
            </p>
          </div>
        </div>

        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-600/20 border border-purple-600/40 text-purple-400 text-sm font-medium mb-4">
            <FlaskConical className="w-4 h-4" /> Beta Testing Program
          </div>
          <h1 className="text-4xl font-bold mb-3">Apply to Be a Beta Tester</h1>
          <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"} max-w-xl mx-auto`}>
            Get early access to TurboAnswer's latest features and help us shape the future of AI assistance.
          </p>
        </div>

        {/* Form */}
        <div className={`${cardBg} border rounded-2xl p-8 shadow-lg`}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
            {QUESTIONS.map((q, i) => (
              <div key={q.id}>
                <label className={`block font-medium mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
                  <span className="text-purple-500 font-bold mr-2">{i + 1}.</span>{q.label}
                  <span className="text-red-400 ml-1">*</span>
                </label>
                {q.type === "input" && (
                  <Input
                    {...register(q.id, { required: "This field is required" })}
                    placeholder={q.placeholder}
                    className={`${inputStyle} h-11`}
                  />
                )}
                {q.type === "textarea" && (
                  <Textarea
                    {...register(q.id, { required: "This field is required" })}
                    placeholder={q.placeholder}
                    rows={3}
                    className={`${inputStyle} resize-none`}
                  />
                )}
                {q.type === "select" && (
                  <select
                    {...register(q.id, { required: "This field is required" })}
                    className={`w-full px-3 py-2.5 rounded-md border text-sm ${inputStyle}`}
                    defaultValue=""
                  >
                    <option value="" disabled>Select an option…</option>
                    {q.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}
                {errors[q.id] && (
                  <p className="text-red-400 text-xs mt-1">{(errors[q.id] as any)?.message}</p>
                )}
              </div>
            ))}

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-red-400 text-sm">{error}</div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-base"
            >
              {submitting ? "Submitting…" : (
                <span className="flex items-center gap-2">Submit Application <ChevronRight className="w-4 h-4" /></span>
              )}
            </Button>
          </form>
        </div>

        <p className={`text-center text-sm mt-6 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
          Questions? Contact us at{" "}
          <a href="mailto:support@turboanswer.it.com" className="text-purple-400 hover:underline">support@turboanswer.it.com</a>
        </p>
      </div>
    </div>
  );
}

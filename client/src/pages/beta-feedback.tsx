import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClipboardCheck, Star, ArrowLeft, Sparkles, Crown, Zap, Loader2, CheckCircle2 } from "lucide-react";

export default function BetaFeedback() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [worksWell, setWorksWell] = useState("");
  const [frustrating, setFrustrating] = useState("");
  const [wishedFeature, setWishedFeature] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const submit = useMutation({
    mutationFn: async () => {
      const summary = `Rating: ${rating}/5\n\nWhat works well: ${worksWell}\n\nWhat's frustrating: ${frustrating}\n\nWished feature: ${wishedFeature}`;
      await apiRequest("POST", "/api/beta/feedback", {
        message: summary,
        category: "structured",
        worksWell,
        frustrating,
        wishedFeature,
        rating,
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Thanks for your feedback!", description: "Your input directly shapes Matrix AI." });
    },
    onError: (e: any) => {
      toast({ title: "Could not submit", description: e?.message || "Please try again.", variant: "destructive" });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-6">
        <Card className="max-w-md w-full bg-[#111] border-zinc-800">
          <CardContent className="p-6 text-center">
            <p className="text-zinc-400">Please sign in to access beta feedback.</p>
            <Link href="/login"><Button className="mt-4">Sign in</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user.isBetaTester) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-white p-6">
        <Card className="max-w-md w-full bg-[#111] border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-emerald-400" /> Beta Tester Access Required</CardTitle>
            <CardDescription className="text-zinc-400">This feedback page is for approved beta testers. Apply to join below.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/beta"><Button className="w-full">Apply for Beta Access</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canSubmit = worksWell.trim() && frustrating.trim() && wishedFeature.trim() && rating > 0 && !submit.isPending;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/chat">
          <button className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to chat
          </button>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Beta Tester Feedback</h1>
            <p className="text-sm text-zinc-400">Three quick questions — takes 2 minutes.</p>
          </div>
        </div>

        {/* Beta perks card */}
        <Card className="bg-gradient-to-br from-emerald-950/40 to-zinc-950 border-emerald-900/40 mb-6">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-emerald-400 font-semibold mb-2">Your Beta Perks</p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2"><Crown className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" /><span className="text-zinc-300"><b>Free Pro features</b> — your account is upgraded for the duration of beta.</span></div>
              <div className="flex items-start gap-2"><Sparkles className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" /><span className="text-zinc-300"><b>Early access</b> to new tools before public launch.</span></div>
              <div className="flex items-start gap-2"><Zap className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" /><span className="text-zinc-300"><b>Direct line</b> — your feedback goes straight to the team.</span></div>
              <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" /><span className="text-zinc-300"><b>50% lifetime discount</b> on Pro after beta ends.</span></div>
            </div>
          </CardContent>
        </Card>

        {submitted ? (
          <Card className="bg-[#111] border-emerald-900/50">
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <h2 className="text-xl font-semibold mb-1">Feedback received</h2>
              <p className="text-zinc-400 text-sm mb-6">Thank you. Every response is read by the team.</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => { setSubmitted(false); setWorksWell(""); setFrustrating(""); setWishedFeature(""); setRating(0); }}>Submit another</Button>
                <Button onClick={() => navigate("/chat")}>Back to chat</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-[#111] border-zinc-800">
            <CardContent className="p-6 space-y-6">
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium mb-2">Overall, how is Matrix AI right now?</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => setRating(n)} className="p-1 hover:scale-110 transition" data-testid={`rating-${n}`}>
                      <Star className={`h-7 w-7 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-600"}`} />
                    </button>
                  ))}
                  {rating > 0 && <span className="ml-2 text-sm text-zinc-400">{rating}/5</span>}
                </div>
              </div>

              {/* Question 1 */}
              <div>
                <label className="block text-sm font-medium mb-2">1. What's working great? <span className="text-zinc-500 font-normal">(features you love or use most)</span></label>
                <Textarea value={worksWell} onChange={e => setWorksWell(e.target.value)} placeholder="The thing I keep coming back to is…" rows={3} className="bg-zinc-950 border-zinc-800" data-testid="input-works-well" />
              </div>

              {/* Question 2 */}
              <div>
                <label className="block text-sm font-medium mb-2">2. What's frustrating or broken? <span className="text-zinc-500 font-normal">(bugs, slow spots, confusing UX)</span></label>
                <Textarea value={frustrating} onChange={e => setFrustrating(e.target.value)} placeholder="It got annoying when…" rows={3} className="bg-zinc-950 border-zinc-800" data-testid="input-frustrating" />
              </div>

              {/* Question 3 */}
              <div>
                <label className="block text-sm font-medium mb-2">3. What's one feature you wish Matrix AI had?</label>
                <Textarea value={wishedFeature} onChange={e => setWishedFeature(e.target.value)} placeholder="I'd use this every day if it could…" rows={3} className="bg-zinc-950 border-zinc-800" data-testid="input-wished-feature" />
              </div>

              <Button onClick={() => submit.mutate()} disabled={!canSubmit} className="w-full bg-emerald-600 hover:bg-emerald-500" data-testid="button-submit-feedback">
                {submit.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</> : "Submit Feedback"}
              </Button>
              {!canSubmit && !submit.isPending && (
                <p className="text-xs text-zinc-500 text-center">Please answer all three questions and pick a rating.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

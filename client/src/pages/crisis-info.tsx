import { Link } from "wouter";
import { Heart, Shield, Lock, MessageCircleHeart, Users, Clock, HandHeart, Sparkles, ArrowRight, Phone, Brain, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import turboLogo from "@assets/file_000000007ff071f8a754520ac27c6ba4_1770423239509.png";

export default function CrisisInfo() {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const displayName = user?.firstName || user?.email?.split("@")[0] || "";

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gradient-to-b from-slate-950 via-indigo-950/20 to-slate-950' : 'bg-gradient-to-b from-white via-indigo-50/30 to-white'}`}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Link href={isAuthenticated ? "/home" : "/"}>
            <Button variant="ghost" className={`${isDark ? 'text-indigo-300 hover:bg-indigo-900/30' : 'text-indigo-600 hover:bg-indigo-100'}`}>
              &larr; Back
            </Button>
          </Link>
          <img src={turboLogo} alt="TurboAnswer" className="h-8 w-8" />
        </div>

        <div className="text-center mb-16">
          <div className={`inline-flex p-5 rounded-full mb-6 ${isDark ? 'bg-gradient-to-br from-pink-900/40 to-indigo-900/40' : 'bg-gradient-to-br from-pink-100 to-indigo-100'}`}>
            <HandHeart className={`h-16 w-16 ${isDark ? 'text-pink-400' : 'text-pink-500'}`} />
          </div>
          <h1 className={`text-4xl md:text-5xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Crisis Support
          </h1>
          <p className={`text-xl md:text-2xl mb-2 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
            You're never alone. We're here to listen.
          </p>
          <p className={`text-base max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            A free, private, AI-powered companion for when life gets overwhelming. No judgment, no data sharing, just genuine support whenever you need it.
          </p>
        </div>

        <div className={`rounded-3xl p-8 md:p-12 mb-12 ${isDark ? 'bg-gradient-to-r from-indigo-950/60 to-pink-950/40 border border-indigo-800/30' : 'bg-gradient-to-r from-indigo-50 to-pink-50 border border-indigo-200'}`}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h2 className={`text-2xl md:text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Someone who actually listens
              </h2>
              <p className={`text-base mb-6 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Our Crisis Support isn't just another hotline list. It's a warm, conversational AI companion that truly engages with what you're going through. It asks thoughtful questions, reflects your feelings back to you, and walks through coping strategies together - like talking to a caring friend who's always available.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className={`px-3 py-1.5 rounded-full text-sm ${isDark ? 'bg-pink-900/30 text-pink-300' : 'bg-pink-100 text-pink-700'}`}>Anxiety</span>
                <span className={`px-3 py-1.5 rounded-full text-sm ${isDark ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>Depression</span>
                <span className={`px-3 py-1.5 rounded-full text-sm ${isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>Grief & Loss</span>
                <span className={`px-3 py-1.5 rounded-full text-sm ${isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>Stress & Burnout</span>
                <span className={`px-3 py-1.5 rounded-full text-sm ${isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>Loneliness</span>
                <span className={`px-3 py-1.5 rounded-full text-sm ${isDark ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>Relationships</span>
                <span className={`px-3 py-1.5 rounded-full text-sm ${isDark ? 'bg-rose-900/30 text-rose-300' : 'bg-rose-100 text-rose-700'}`}>Trauma</span>
                <span className={`px-3 py-1.5 rounded-full text-sm ${isDark ? 'bg-cyan-900/30 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>Self-esteem</span>
              </div>
            </div>
            <div className={`flex-shrink-0 p-6 rounded-2xl ${isDark ? 'bg-slate-900/60 border border-indigo-800/20' : 'bg-white border border-indigo-100 shadow-lg'}`}>
              <div className="space-y-3 max-w-xs">
                <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-indigo-600/60 text-white' : 'bg-indigo-500 text-white'}`}>
                  <p className="text-sm">I've been feeling really overwhelmed lately and I don't know what to do...</p>
                </div>
                <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-slate-800 text-indigo-100 border border-indigo-800/30' : 'bg-indigo-50 text-gray-700 border border-indigo-100'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Heart className="h-3 w-3 text-pink-400" />
                    <span className={`text-xs font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>Turbo Crisis Support</span>
                  </div>
                  <p className="text-sm">I hear you, and I'm really glad you reached out. Feeling overwhelmed is exhausting. Can you tell me more about what's been piling up? Sometimes just talking through it can help lighten the load a little.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className={`rounded-2xl p-6 text-center ${isDark ? 'bg-slate-900/60 border border-indigo-800/20' : 'bg-white border border-indigo-100 shadow-sm'}`}>
            <div className={`inline-flex p-3 rounded-full mb-4 ${isDark ? 'bg-green-900/30' : 'bg-green-100'}`}>
              <Lock className={`h-8 w-8 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Military-Grade Privacy</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Every message is encrypted with AES-256-GCM. No admin, no authority, no one can ever read your conversations. Your secrets stay your secrets.
            </p>
          </div>

          <div className={`rounded-2xl p-6 text-center ${isDark ? 'bg-slate-900/60 border border-indigo-800/20' : 'bg-white border border-indigo-100 shadow-sm'}`}>
            <div className={`inline-flex p-3 rounded-full mb-4 ${isDark ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
              <Clock className={`h-8 w-8 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Available 24/7</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No appointments, no waiting rooms, no schedules. Whether it's 3am or lunchtime, your AI companion is always here and ready to listen.
            </p>
          </div>

          <div className={`rounded-2xl p-6 text-center ${isDark ? 'bg-slate-900/60 border border-indigo-800/20' : 'bg-white border border-indigo-100 shadow-sm'}`}>
            <div className={`inline-flex p-3 rounded-full mb-4 ${isDark ? 'bg-pink-900/30' : 'bg-pink-100'}`}>
              <Heart className={`h-8 w-8 ${isDark ? 'text-pink-400' : 'text-pink-600'}`} />
            </div>
            <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>100% Free Forever</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Mental health support should never have a price tag. Crisis Support is completely free for every TurboAnswer user, no subscription required.
            </p>
          </div>
        </div>

        <div className={`rounded-3xl p-8 mb-12 ${isDark ? 'bg-slate-900/40 border border-indigo-800/20' : 'bg-indigo-50/50 border border-indigo-100'}`}>
          <h2 className={`text-2xl font-bold mb-6 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
            How It Helps
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className={`flex-shrink-0 p-2 rounded-lg h-fit ${isDark ? 'bg-indigo-900/30' : 'bg-indigo-100'}`}>
                <MessageCircleHeart className={`h-5 w-5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </div>
              <div>
                <h4 className={`font-semibold mb-1 ${isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>Real Conversations</h4>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Not scripted responses. The AI actually engages with your unique situation, asks follow-up questions, and remembers what you've shared.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className={`flex-shrink-0 p-2 rounded-lg h-fit ${isDark ? 'bg-pink-900/30' : 'bg-pink-100'}`}>
                <Brain className={`h-5 w-5 ${isDark ? 'text-pink-400' : 'text-pink-600'}`} />
              </div>
              <div>
                <h4 className={`font-semibold mb-1 ${isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>Coping Techniques</h4>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Learn breathing exercises, grounding techniques, and practical strategies - introduced one at a time so you're never overwhelmed.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className={`flex-shrink-0 p-2 rounded-lg h-fit ${isDark ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                <EyeOff className={`h-5 w-5 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
              <div>
                <h4 className={`font-semibold mb-1 ${isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>Zero Judgment</h4>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Share anything without fear. There's no moderation on crisis chats, no reports, no records shared with anyone. Complete honesty, complete safety.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className={`flex-shrink-0 p-2 rounded-lg h-fit ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
                <Shield className={`h-5 w-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              </div>
              <div>
                <h4 className={`font-semibold mb-1 ${isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>You're In Control</h4>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Delete any conversation or all your data permanently at any time. Your data, your choice - always.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={`rounded-3xl p-8 md:p-10 text-center mb-12 ${isDark ? 'bg-gradient-to-r from-pink-950/40 to-indigo-950/60 border border-pink-800/20' : 'bg-gradient-to-r from-pink-50 to-indigo-50 border border-pink-200'}`}>
          <HandHeart className={`h-12 w-12 mx-auto mb-4 ${isDark ? 'text-pink-400' : 'text-pink-500'}`} />
          <h2 className={`text-2xl md:text-3xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Ready to talk?
          </h2>
          <p className={`text-base mb-6 max-w-lg mx-auto ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {displayName
              ? `${displayName}, you don't have to go through this alone. Your AI companion is waiting to listen - take the first step whenever you're ready.`
              : "You don't have to go through this alone. Your AI companion is waiting to listen - take the first step whenever you're ready."}
          </p>
          <Link href={isAuthenticated ? "/crisis-support" : "/login"}>
            <Button className="bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white px-8 py-6 text-lg rounded-xl">
              <Heart className="h-5 w-5 mr-2" />
              {isAuthenticated ? "Start a Conversation" : "Sign In to Get Support"}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
          <p className={`text-xs mt-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Free for all users. No subscription needed.
          </p>
        </div>

        <div className={`rounded-2xl p-6 text-center mb-8 ${isDark ? 'bg-amber-950/20 border border-amber-800/20' : 'bg-amber-50 border border-amber-100'}`}>
          <Phone className={`h-5 w-5 mx-auto mb-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <p className={`text-sm ${isDark ? 'text-amber-300/80' : 'text-amber-700'}`}>
            If you or someone you know is in immediate danger, please call <strong>911</strong>. For crisis support by phone, contact the <strong>988 Suicide & Crisis Lifeline</strong> (call or text 988) or the <strong>Crisis Text Line</strong> (text HOME to 741741).
          </p>
          <p className={`text-xs mt-2 ${isDark ? 'text-amber-400/50' : 'text-amber-500'}`}>
            Turbo Crisis Support is an AI companion and not a replacement for professional therapy or emergency services.
          </p>
        </div>
      </div>
    </div>
  );
}

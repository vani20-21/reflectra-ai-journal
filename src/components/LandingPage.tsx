import React, { useState } from 'react';
import { signInWithGoogle } from '../lib/firebase';
import {
  Sparkles,
  Shield,
  Lock,
  Database,
  ArrowRight,
  BookOpen,
  MessageSquare,
  Lightbulb,
  ExternalLink,
  AlertCircle,
  Check,
  Compass,
} from 'lucide-react';

interface LandingPageProps {
  onOpenSecurity: () => void;
  onSimulateDevUser?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenSecurity }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err?.code === 'auth/popup-blocked') {
        setError(
          'Popup was blocked by your browser or iframe security settings. Please allow popups or open this app in a new tab.'
        );
      } else if (err?.code === 'auth/cancelled-popup-request' || err?.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please click below to try again.');
      } else {
        setError(err?.message || 'Failed to complete Google Sign-In.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080A12] text-[#F4F5F9] flex flex-col justify-between font-sans selection:bg-[#7C6CF2]/30 selection:text-white relative overflow-hidden">
      {/* Background Aurora Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-[#7C6CF2]/10 via-[#67D9B0]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-[#7C6CF2]/8 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner */}
      <div className="border-b border-[#272C3D] bg-[#10131F]/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between text-xs relative z-10">
        <div className="flex items-center space-x-2 text-[#9AA1B5]">
          <Shield className="w-4 h-4 text-[#67D9B0]" />
          <span>Tenant Isolation: Entries are encrypted and restricted to your authenticated UID.</span>
        </div>
        <button
          onClick={onOpenSecurity}
          className="text-xs text-[#947CFF] hover:text-[#7C6CF2] font-semibold underline underline-offset-4 cursor-pointer transition-colors"
        >
          View Threat Model & Rules
        </button>
      </div>

      {/* Main Hero & Auth Section */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#7C6CF2]/10 text-[#947CFF] border border-[#7C6CF2]/20 mb-6 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-[#7C6CF2]" />
          <span>Reflectra &bull; Reflect. Realize. Act.</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#F4F5F9] max-w-2xl leading-tight">
          A private space for thoughts, reflections, and deep AI insights.
        </h1>

        {/* Subtitle */}
        <p className="mt-4 text-base sm:text-lg text-[#9AA1B5] max-w-xl font-normal leading-relaxed">
          Write multi-turn journal reflections, brainstorm next steps, and transform journal entries into actionable personal insights with <span className="font-semibold text-[#947CFF]">Reflection &rarr; Action</span>.
        </p>

        {/* Auth Action Box */}
        <div className="mt-10 p-8 bg-[#10131F] border border-[#272C3D] rounded-2xl w-full max-w-md shadow-xl text-left">
          <div className="text-center mb-6">
            <h2 className="text-base font-bold text-[#F4F5F9]">Authenticate to Access Your Journal</h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Google Federated Identity. No passwords stored or transmitted.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-950/40 border border-rose-900/50 text-xs text-rose-200 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span>{error}</span>
                <div className="mt-2">
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-rose-300 hover:text-rose-100 underline font-medium"
                  >
                    <span>Open in new tab</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Primary Sign In Button */}
          <button
            id="google-signin-button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 py-3.5 px-4 rounded-xl bg-[#7C6CF2] hover:bg-[#947CFF] text-white font-medium text-sm transition-all duration-150 shadow-xs shadow-[#7C6CF2]/20 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
                <ArrowRight className="w-4 h-4 text-white/70 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>

          {/* Privacy note */}
          <div className="mt-4 pt-4 border-t border-[#272C3D] flex items-center justify-between text-[11px] text-[#6B7280]">
            <span className="flex items-center space-x-1">
              <Lock className="w-3 h-3 text-[#6B7280]" />
              <span>Owner-bound Firestore path</span>
            </span>
            <span className="text-[#67D9B0] font-semibold">Zero-hardcoding security</span>
          </div>
        </div>

        {/* Feature Highlights Cards */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
          <div className="p-5 bg-[#10131F] border border-[#272C3D] rounded-2xl shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-[#7C6CF2]/10 border border-[#7C6CF2]/20 flex items-center justify-center text-[#947CFF] mb-3 shadow-xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#F4F5F9]">Multi-Turn Reflections</h3>
            <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
              Explore your thoughts continuously. Reflectra maintains conversation history to provide empathetic, context-aware responses.
            </p>
          </div>

          <div className="p-5 bg-[#10131F] border border-[#272C3D] rounded-2xl shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-[#67D9B0]/10 border border-[#67D9B0]/20 flex items-center justify-center text-[#67D9B0] mb-3 shadow-xs">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#F4F5F9]">Strict Data Isolation</h3>
            <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
              Firestore security rules enforce <code className="text-[#947CFF] font-mono text-[11px]">request.auth.uid == userId</code>. Other users cannot access your records.
            </p>
          </div>

          <div className="p-5 bg-[#10131F] border border-[#272C3D] rounded-2xl shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-[#947CFF]/10 border border-[#947CFF]/20 flex items-center justify-center text-[#947CFF] mb-3 shadow-xs">
              <Compass className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[#F4F5F9]">Reflection &rarr; Action</h3>
            <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
              Extract key insights, immediate concrete next actions, and future self-inquiry prompts from your journal reflections.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#272C3D] bg-[#080A12]/90 py-5 px-6 text-center text-xs text-[#6B7280] relative z-10">
        <p>Reflectra &bull; Reflect. Realize. Act. Powered by Google AI and Cloud Firestore.</p>
      </footer>
    </div>
  );
};

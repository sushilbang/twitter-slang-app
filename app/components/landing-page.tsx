"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Play } from 'lucide-react';

export default function LandingPage() {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`
      }
    });

    if (error) {
      console.error("Error signing in:", error.message);
      setError("Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 text-text-main">
        <div className="max-w-4xl mx-auto text-center">
            {/* Header */}
            <h1 className="font-pixel text-4xl md:text-6xl text-primary text-shadow-primary mb-4">
              TWITTER SLANG
            </h1>
            <h2 className="font-pixel text-2xl md:text-4xl text-secondary text-shadow-primary mb-8">
              CONVERTER.EXE
            </h2>

            {/* Tagline */}
            <p className="font-pixel text-lg md:text-xl mb-12 opacity-90">
                🎮 Level up your thoughts — make {'em'} tweet-worthy! 🚀
            </p>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 rounded-lg border-2 border-red-500 bg-red-900/50 text-red-300 max-w-md mx-auto">
                <div className="font-pixel text-sm">⚠️ {error}</div>
              </div>
            )}

            {/* Call to Action Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="font-pixel button-3d text-white font-bold py-4 px-8 rounded-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mx-auto transform hover:scale-105 transition-all duration-200 bg-primary"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  REDIRECTING...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  START - SIGN IN WITH GOOGLE
                </>
              )}
            </button>
        </div>
    </div>
  );
}
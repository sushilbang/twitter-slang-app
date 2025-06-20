"use client";

import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useState } from 'react';

export default function UserProfile({ user }: { user: User }) {
  const supabase = createClient();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      router.refresh(); // Triggers middleware redirect
    } catch (error) {
      console.error("Error signing out:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-4 bg-card p-2 rounded-lg border border-border-main">
      <span className="font-pixel text-xs hidden sm:block">{user.email}</span>
      
      <button 
        onClick={handleSignOut} 
        disabled={isLoading}
        className="flex items-center justify-center p-2 w-8 h-8 rounded-md hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
        title="Sign Out"
      >
        {isLoading ? (
          <div
            className="animate-spin rounded-full h-4 w-4 border-2 border-transparent"
            style={{ borderTopColor: "var(--secondary-accent)", borderRightColor: "var(--secondary-accent)" }}
          ></div>
        ) : (
          <LogOut className="w-4 h-4 text-secondary" />
        )}
      </button>
    </div>
  );
}
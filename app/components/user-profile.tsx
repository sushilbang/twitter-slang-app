"use client";

import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function UserProfile({ user }: { user: User }) {
  const supabase = createClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Refresh the current route. The middleware will detect the user is
    // signed out and redirect them to the homepage.
    router.refresh(); 
  };

  return (
    <div className="flex items-center gap-4 bg-card p-2 rounded-lg border border-border-main">
      <span className="font-pixel text-xs hidden sm:block">{user.email}</span>
      <button 
        onClick={handleSignOut} 
        className="flex items-center justify-center p-2 rounded-md hover:bg-background"
        title="Sign Out"
      >
        <LogOut className="w-4 h-4 text-secondary" />
      </button>
    </div>
  );
}
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TwitterSlangConverter from '@/components/twitter-slang-converter';
import UserProfile from '@/components/user-profile';

export default async function ConverterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // This is server-side protection. If there's no user,
  // redirect them to the homepage before the page even loads.
  if (!user) {
    redirect('/');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('requests_made, requests_limit')
    .eq('id', user.id)
    .single();

  // If for some reason the profile doesn't exist, we can provide defaults
  const usageData = {
    requestsMade: profile?.requests_made ?? 0,
    requestsLimit: profile?.requests_limit ?? 10,
  };

  // If a user exists, render the page and pass the user object
  // to the UserProfile component.
  return (
    <>
      <div className="absolute top-4 right-4 z-10">
        <UserProfile user={user} />
      </div>
      {/* Pass the usage data down as a prop */}
      <TwitterSlangConverter usageData={usageData} />
    </>
  );
}
import { createClient } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { redis } from '@/lib/redis';

const THROTTLE_LIMIT = 6;
const THROTTLE_WINDOW_SECONDS = 60;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing token.' }, { status: 401 });
    }

    const supabaseForUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error: userError } = await supabaseForUser.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
    }

    const userThrottleKey = `throttle:${user.id}`;
    const currentRequests = await redis.get(userThrottleKey);

    if (currentRequests && Number(currentRequests) >= THROTTLE_LIMIT) {
      return NextResponse.json(
        { error: 'You are sending requests too fast. Please wait a moment.' },
        { status: 429 }
      );
    }

    const newCount = await redis.incr(userThrottleKey);
    if (newCount === 1) {
      await redis.expire(userThrottleKey, THROTTLE_WINDOW_SECONDS);
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('requests_made, requests_limit, requests_reset_at')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found. Please contact support.' },
        { status: 500 }
      );
    }

    const now = new Date();
    const resetDate = new Date(profile.requests_reset_at || 0);
    let requestsMade = profile.requests_made;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (resetDate < startOfToday) {
      requestsMade = 0;
      supabaseAdmin
        .from('profiles')
        .update({ requests_made: 0, requests_reset_at: now.toISOString() })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) console.error('Failed to reset daily count:', error.message);
        });
    }

    if (requestsMade >= profile.requests_limit) {
      return NextResponse.json(
        {
          error: `You have reached your daily limit of ${profile.requests_limit} requests.`,
          remaining: 0,
        },
        { status: 429 }
      );
    }

    const { inputText } = await request.json();
    if (!inputText) {
      return NextResponse.json({ error: 'Input text is required.' }, { status: 400 });
    }

    const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Convert this sentence into modern Twitter slang — concise, snappy, and full of Gen Z internet language. The meaning should stay the same, but the vibe should shift to something you'd casually post on the timeline. Only give the converted part. Sentence: "${inputText}" Converted:`;

    const result = await model.generateContent(prompt);
    const slangVersion = result.response.text().trim();

    supabaseAdmin
      .from('profiles')
      .update({ requests_made: requestsMade + 1 })
      .eq('id', user.id)
      .then(({ error }) => {
        if (error) console.error('Failed to update request count:', error.message);
      });

    return NextResponse.json({
      convertedText: slangVersion,
      remaining: profile.requests_limit - (requestsMade + 1),
    });

  } catch (error) {
    const err = error as Error;
    console.error('API Route Global Error:', err.message || error);

    if (err.message?.toLowerCase().includes('quota') || err.message?.includes('exhausted')) {
      return NextResponse.json(
        { error: 'We’re experiencing high demand right now. Please try again later.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: 'An unexpected internal server error occurred.' }, { status: 500 });
  }
}

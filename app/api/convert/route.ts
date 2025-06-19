import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // === STEP 1: AUTHENTICATE THE USER VIA JWT ===
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: Missing token." },
        { status: 401 }
      );
    }

    const supabaseForUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const {
      data: { user },
      error: userError,
    } = await supabaseForUser.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid token." },
        { status: 401 }
      );
    }

    // === STEP 2: FETCH USER PROFILE & CHECK/RESET RATE LIMIT ===
    // We now select 'requests_reset_at' as well
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("requests_made, requests_limit, requests_reset_at")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Critical: Profile not found for user:", user.id);
      return NextResponse.json(
        { error: "User profile not found. Please contact support." },
        { status: 500 }
      );
    }

    const now = new Date();
    // Ensure requests_reset_at is treated as a Date object
    const resetDate = new Date(profile.requests_reset_at || 0);
    let requestsMade = profile.requests_made;

    // Get the start of today (midnight in the server's timezone)
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // Check if the last reset was before the start of today
    if (resetDate < startOfToday) {
      console.log(`New day for user ${user.id}. Resetting request count.`);
      // It's a new day, so we reset the count in our local variable...
      requestsMade = 0;
      // ...and update the database for future requests.
      const { error: resetError } = await supabaseAdmin
        .from("profiles")
        .update({ requests_made: 0, requests_reset_at: now.toISOString() })
        .eq("id", user.id);

      if (resetError) {
        // Log the error but don't block the user's first request of the day
        console.error(
          "Failed to reset daily request count:",
          resetError.message
        );
      }
    }

    // Now we check the potentially updated 'requestsMade' count
    if (requestsMade >= profile.requests_limit) {
      return NextResponse.json(
        {
          error: `You have reached your daily limit of ${profile.requests_limit} free requests. Come back tomorrow or upgrade for more.`,
        },
        { status: 429 } // Too Many Requests
      );
    }

    // === STEP 3: PROCESS THE CONVERSION ===
    const { inputText } = await request.json();
    if (!inputText) {
      return NextResponse.json(
        { error: "Input text is required." },
        { status: 400 }
      );
    }

    const genai = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are a "Twitter Slang Converter" bot. Rewrite the following sentence into a short, punchy, authentic-sounding tweet using modern internet slang. Keep the original meaning. Output ONLY the converted sentence. Original: "${inputText}" Converted:`;

    const result = await model.generateContent(prompt);
    const slangVersion = result.response.text().trim();

    // === STEP 4: INCREMENT THE USER'S REQUEST COUNT using the ADMIN client ===
    // We use our local variable `requestsMade` which may have been reset to 0
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ requests_made: requestsMade + 1 })
      .eq("id", user.id);

    if (updateError) {
      console.error(
        "Failed to update request count for user:",
        user.id,
        updateError.message
      );
    }

    return NextResponse.json({ convertedText: slangVersion });
  } catch (error: any) {
    console.error("An unexpected error occurred in /api/convert:", error);
    const errorMessage = error.message || "";
    if (
      errorMessage.toLowerCase().includes("quota") ||
      errorMessage.toLowerCase().includes("resource has been exhausted")
    ) {
      return NextResponse.json(
        {
          error:
            "We're experiencing high demand right now and have temporarily reached our capacity. Please try again later.",
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}

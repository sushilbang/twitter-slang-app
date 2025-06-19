"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const WORD_LIMIT = 50;

interface UsageData {
  requestsMade: number;
  requestsLimit: number;
}

export default function TwitterSlangConverter({ usageData }: { usageData: UsageData }) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [requestsLeft, setRequestsLeft] = useState(
    usageData.requestsLimit - usageData.requestsMade
  );

  useEffect(() => {
    const placeholderText = "What's on your mind?";
    let i = 0;
    const intervalId = setInterval(() => {
      if (i < placeholderText.length - 1) {
        setPlaceholder((prev) => prev + placeholderText[i]);
        i++;
      } else {
        clearInterval(intervalId);
      }
    }, 50);
    return () => clearInterval(intervalId);
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    // Split the text by spaces/newlines to count words. Filter out empty strings.
    const words = text.split(/\s+/).filter(Boolean);

    if (words.length <= WORD_LIMIT) {
      setInput(text);
      setWordCount(words.length);
    }
    // If the limit is exceeded, we do nothing, so the input doesn't change.
  };

  const handleConvert = async () => {
    if (input.trim() === "") {
      setError("Please enter some text to convert.");
      return;
    }
    setIsLoading(true);
    setError("");
    setOutput("");

    try {
      // 1. Get the user's current session, which contains the access token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // It's good practice to check if the user is somehow not logged in
      if (!token) {
        throw new Error("You must be logged in to perform this action.");
      }

      // 2. Make the API call, but now include the token in the headers
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // This 'Authorization' header is how we securely pass the user's identity
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ inputText: input }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "An unknown error occurred.");
      }

      setOutput(data.convertedText);
      setRequestsLeft(prev => prev - 1);
    } catch (err: any) {
      console.error("Error calling API:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!output.trim() || isLoading) return;

    try {
      await navigator.clipboard.writeText(output);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      setError("Could not copy text to clipboard.");
    }
  };

  const handleTweet = () => {
    if (!output.trim() || isLoading) return;
    const textToTweet = output;
    const encodedText = encodeURIComponent(textToTweet);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    window.open(twitterUrl, "_blank");
  };

  const isOutputEmpty = !output.trim();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 text-text-main">
      <div className="w-full max-w-xl p-6 bg-card rounded-xl border-2 border-border-main text-center glow-border">
        <div className="p-2 rounded border-2 border-border-main mb-6 bg-background">
          <h1 className="font-pixel text-lg text-primary text-shadow-primary">
            {"> Twitter Slang Converter_"}
          </h1>
        </div>

        <p className="font-pixel text-sm opacity-90 mb-6">
          Level up your thoughts — make {"em"} tweet-worthy 🚀
        </p>

        <div className="font-pixel text-xs text-center mb-4 p-2 bg-background/50 border border-border-main rounded-md">
          REQUESTS REMAINING: <span className="text-primary font-bold">{requestsLeft > 0 ? requestsLeft : 0}</span> / {usageData.requestsLimit}
        </div>
        
        <textarea
          value={input}
          // Use our new handler function here
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={isLoading}
          className="w-full min-h-[120px] p-4 mb-2 bg-background border-2 border-border-main rounded focus-glow resize-y text-text-main disabled:opacity-50" // a little less margin-bottom
        />
        {/* Add the word count display below the textarea */}
        <div className="w-full text-right font-pixel text-xs text-text-main/70 mb-4">
          {wordCount}/{WORD_LIMIT} words
        </div>

        <button
          onClick={handleConvert}
          disabled={isLoading || !input.trim()}
          className="font-pixel button-3d bg-primary text-white font-bold py-3 px-6 rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Converting..." : "Convert! >>"}
        </button>

        {error && (
          <div className="mt-4 p-3 rounded border-2 border-red-500 bg-red-900/50 text-red-300 font-pixel text-sm">
            {error}
          </div>
        )}

        <h2 className="font-pixel text-secondary text-md mt-8 mb-2">
          Your Post
        </h2>

        <textarea
          readOnly
          value={output}
          placeholder="Output"
          className="w-full min-h-[120px] p-4 bg-background border-2 border-border-main rounded resize-y text-text-main"
        />

        <div className="flex justify-center gap-4 mt-4">
          <button
            onClick={handleCopy}
            disabled={isOutputEmpty}
            className="font-pixel button-3d bg-secondary text-white py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📋 {copySuccess ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleTweet}
            disabled={isOutputEmpty}
            className="font-pixel button-3d bg-primary text-white py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Post to Twitter
          </button>
        </div>
      </div>
    </div>
  );
}

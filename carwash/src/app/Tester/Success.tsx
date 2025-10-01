'use client'
import { CheckCircle } from "lucide-react";
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Success: React.FC = () => {
  return (
    <Alert className="flex flex-col items-start gap-2 p-3 sm:p-4 bg-green-500 rounded-xl overflow-hidden border-0 text-white w-full shadow-lg animate-in slide-in-from-top-5 duration-300">
      <div className="flex gap-2 items-center w-full">
        <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white flex-shrink-0" />
        <div className="font-bold font-rubik text-white text-sm sm:text-base md:text-lg tracking-tight leading-tight">
          Login successful!
        </div>
      </div>
      <AlertDescription className="text-white/90 text-xs sm:text-sm tracking-tight leading-relaxed pl-7 sm:pl-8">
        Welcome back! Redirecting you now...
      </AlertDescription>
    </Alert>
  );
};

export default Success;
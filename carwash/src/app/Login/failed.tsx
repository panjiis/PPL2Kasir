'use client'
import { Circle as XCircleIcon, XIcon } from "lucide-react";
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// Tambahkan prop onClose
export const Failed: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  // Stop klik di dalam notif agar tidak trigger close
  const handleClickInside = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Alert
      className="flex flex-col items-start gap-2 p-3 sm:p-4 bg-[#db7676] rounded-xl overflow-hidden border-0 text-[#f3e3e3] w-full shadow-lg animate-in slide-in-from-top-5 duration-300 pointer-events-auto"
      onClick={handleClickInside}
    >
      <div className="flex justify-between items-center w-full">
        <div className="flex gap-2 items-center">
          <span className="relative w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center flex-shrink-0">
            <XCircleIcon className="absolute w-full h-full text-[#f3e3e3]" />
            <XIcon className="absolute w-3 h-3 sm:w-4 sm:h-4 text-[#ffffff]" />
          </span>
          <div className="font-bold font-rubik text-[#f3e3e3] text-sm sm:text-base md:text-lg tracking-tight leading-tight">
            Login failed!
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-5 h-5 sm:w-6 sm:h-6 p-0 hover:bg-transparent flex-shrink-0"
          onClick={onClose}
        >
          <XIcon className="w-full h-full text-[#f3e3e3]" />
        </Button>
      </div>
      <AlertDescription className="text-[#f3e3e3] text-xs sm:text-sm tracking-tight leading-relaxed pl-7 sm:pl-8">
        Username and password doesn&apos;t match.
      </AlertDescription>
    </Alert>
  );
};

export default Failed;
'use client'
import { Circle as XCircleIcon,  SearchCheck  } from "lucide-react";
import React from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export const Success: React.FC = () => {
  return (
    <Alert className="flex flex-col items-start gap-2 p-3 sm:p-4 bg-[#1bcf1b] rounded-xl overflow-hidden border-0 text-[#f3e3e3] w-full shadow-lg animate-in slide-in-from-top-5 duration-300">
      <div className="flex justify-between items-center w-full">
        <div className="flex gap-2 items-center">
          <span className="relative w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center flex-shrink-0">
            <XCircleIcon className="absolute w-full h-full text-[#f3e3e3]" />
            <SearchCheck className="absolute w-3 h-3 sm:w-4 sm:h-4 text-[#ffffff]" />
          </span>
          <div className="font-bold font-rubik text-[#f3e3e3] text-sm sm:text-base md:text-lg tracking-tight leading-tight">
            Login Success!
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-5 h-5 sm:w-6 sm:h-6 p-0 hover:bg-transparent flex-shrink-0"
        >
          <SearchCheck className="w-full h-full text-[#f3e3e3]" />
        </Button>
      </div>
      
    </Alert>
  );
};

export default Success;
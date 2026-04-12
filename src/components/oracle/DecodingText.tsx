"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

const GLYPHS = "∀ΞΣΩΔΦΓΨΠΘΛΞ◈⟁⟐⧖⧗⬡⬢⬭⟁◉◎⟡";
const LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

interface DecodingTextProps {
  text: string;
  className?: string;
  speed?: number;
  onComplete?: () => void;
}

export default function DecodingText({ 
  text, 
  className = "", 
  speed = 30,
  onComplete 
}: DecodingTextProps) {
  const [displayText, setDisplayText] = useState("");
  const [isDecoding, setIsDecoding] = useState(true);
  const indexRef = useRef(0);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const decode = () => {
      if (indexRef.current >= text.length) {
        setIsDecoding(false);
        onComplete?.();
        return;
      }
      
      const targetChar = text[indexRef.current];
      let scrambleCount = 0;
      const maxScrambles = 5;
      
      interval = setInterval(() => {
        if (scrambleCount >= maxScrambles) {
          setDisplayText(prev => prev + targetChar);
          indexRef.current++;
          clearInterval(interval);
          decode();
        } else {
          const randomGlyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          const randomLatin = LATIN[Math.floor(Math.random() * LATIN.length)];
          const scramble = Math.random() > 0.5 ? randomGlyph : randomLatin;
          
          setDisplayText(prev => prev.slice(0, indexRef.current) + scramble);
          scrambleCount++;
        }
      }, speed);
    };
    
    decode();
    
    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span 
      className={`${className} ${isDecoding ? 'decoding-active' : ''}`}
      style={{
        textShadow: isDecoding ? '1px 0 0 rgba(255,0,0,0.5), -1px 0 0 rgba(0,255,255,0.5)' : 'none',
        filter: isDecoding ? 'blur(0.3px)' : 'none',
      }}
    >
      {displayText}
      {isDecoding && (
        <span className="inline-block w-[2px] h-[1em] bg-current ml-1 animate-pulse" />
      )}
    </span>
  );
}

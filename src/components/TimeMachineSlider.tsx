'use client';

import React from 'react';
import * as Slider from '@radix-ui/react-slider';
import { History, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface TimeMachineSliderProps {
    currentIndex: number;
    max: number;
    onChange: (index: number) => void;
    label?: string;
    timestamp?: number;
}

export default function TimeMachineSlider({ 
    currentIndex, 
    max, 
    onChange, 
    label,
    timestamp 
}: TimeMachineSliderProps) {
    if (max <= 0) return null;

    return (
        <div className="bg-muted/30 border-t p-3 flex flex-col gap-2 select-none animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Time Machine
                    </span>
                    {label && (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold border border-primary/20">
                            {label}
                        </span>
                    )}
                </div>
                {timestamp && (
                    <span className="text-[10px] font-medium opacity-60">
                        {new Date(timestamp).toLocaleString()}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-4">
                <button 
                    disabled={currentIndex <= 0}
                    onClick={() => onChange(currentIndex - 1)}
                    className="p-1 rounded hover:bg-muted disabled:opacity-20 transition-all active:scale-90"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <Slider.Root
                    className="relative flex items-center select-none touch-none w-full h-5 group"
                    defaultValue={[currentIndex]}
                    value={[currentIndex]}
                    max={max}
                    step={1}
                    onValueChange={([val]) => onChange(val)}
                >
                    <Slider.Track className="bg-primary/10 relative grow rounded-full h-[4px] group-hover:h-[6px] transition-all">
                        <Slider.Range className="absolute bg-primary rounded-full h-full" />
                    </Slider.Track>
                    <Slider.Thumb
                        className="block w-4 h-4 bg-background border-2 border-primary shadow-lg rounded-full hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-transform cursor-grab active:cursor-grabbing"
                        aria-label="History version"
                    />
                </Slider.Root>

                <button 
                    disabled={currentIndex >= max}
                    onClick={() => onChange(currentIndex + 1)}
                    className="p-1 rounded hover:bg-muted disabled:opacity-20 transition-all active:scale-90"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
                
                <div className="flex items-center gap-1 min-w-[45px] justify-end">
                    <span className="text-xs font-black tabular-nums">{currentIndex + 1}</span>
                    <span className="text-[10px] font-bold opacity-30">/</span>
                    <span className="text-[10px] font-bold opacity-30 tabular-nums">{max + 1}</span>
                </div>
            </div>
        </div>
    );
}

"use client";

import React from "react";
import {
  LayoutGrid,
  Trophy,
  Megaphone,
  Search,
  ListTodo,
  Bot,
  Code2,
  Coins,
  Plus,
  Gamepad2,
  Compass,
} from "lucide-react";
import type { BoardCategory } from "@/lib/board/config";

export type NavTabId = "all" | "leaderboards" | BoardCategory | "explore";

interface Props {
  activeTab: NavTabId;
  onSelect: (tab: NavTabId) => void;
  className?: string;
}

interface NavItem {
  id: NavTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "leaderboards", label: "Leaderboards", icon: Trophy },
  { id: "Marketing", label: "Marketing", icon: Megaphone },
  { id: "SEO", label: "SEO", icon: Search },
  { id: "Productivity", label: "Productivity", icon: ListTodo },
  { id: "Agents", label: "Agents", icon: Bot },
  { id: "Developer", label: "Developer", icon: Code2 },
  { id: "Crypto", label: "Crypto", icon: Coins },
  { id: "Other", label: "Other", icon: Plus },
  { id: "Games", label: "Games", icon: Gamepad2 },
  { id: "explore", label: "Explore", icon: Compass },
];

export default function OutbidNav({ activeTab, onSelect, className = "" }: Props) {
  return (
    <nav
      aria-label="Categories and views"
      className={`w-full overflow-x-auto no-scrollbar py-2 ${className}`}
    >
      <div className="mx-auto flex w-max items-center justify-center">
        <div className="flex items-center gap-1 rounded-full border border-line bg-surface/95 p-1.5 shadow-2xl backdrop-blur-md">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  isActive
                    ? "bg-accent text-accent-ink shadow-md shadow-accent/25 font-bold"
                    : "text-muted hover:text-fg hover:bg-raised/60"
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 ${
                    isActive ? "text-accent-ink" : "text-accent"
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}


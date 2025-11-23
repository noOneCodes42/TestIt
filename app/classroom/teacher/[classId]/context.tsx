"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type TabContextType = {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
};

const TabContext = createContext<TabContextType | undefined>(undefined);

export const TabProvider = ({ children }: { children: ReactNode }) => {
  const [currentTab, setCurrentTab] = useState("quiz");

  return (
    <TabContext.Provider value={{ currentTab, setCurrentTab }}>
      {children}
    </TabContext.Provider>
  );
};

export const useTab = () => {
  const ctx = useContext(TabContext);
  if (!ctx) throw new Error("useTab must be used inside TabProvider");
  return ctx;
};

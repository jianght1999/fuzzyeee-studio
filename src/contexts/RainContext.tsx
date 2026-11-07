import { createContext, useContext, useState, type ReactNode } from 'react';

interface RainContextType {
  raining: boolean;
  toggle: () => void;
}

const RainContext = createContext<RainContextType>({ raining: false, toggle: () => {} });

export function useRain() {
  return useContext(RainContext);
}

export function RainProvider({ children }: { children: ReactNode }) {
  // 默认关闭，刷新后重置为关
  const [raining, setRaining] = useState(false);
  const toggle = () => setRaining((r) => !r);

  return (
    <RainContext.Provider value={{ raining, toggle }}>
      {children}
    </RainContext.Provider>
  );
}

import { useCallback, useState } from "react";
import { runSimulation } from "../api/commands";
import type { SimConfig, SimResponse } from "../types/sim";
import { simulationErrorMessage } from "../utils/simulationValidation";

export interface SimulationState {
  result: SimResponse | null;
  isRunning: boolean;
  error: string | null;
  run: (config: SimConfig) => Promise<SimResponse | null>;
  reset: () => void;
}

export function useSimulation(): SimulationState {
  const [result, setResult] = useState<SimResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (config: SimConfig): Promise<SimResponse | null> => {
    setIsRunning(true);
    setError(null);
    try {
      const response = await runSimulation(config);
      setResult(response);
      return response;
    } catch (error) {
      setError(simulationErrorMessage(error));
      setResult(null);
      return null;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const reset = useCallback((): void => {
    setResult(null);
    setError(null);
    setIsRunning(false);
  }, []);

  return { result, isRunning, error, run, reset };
}

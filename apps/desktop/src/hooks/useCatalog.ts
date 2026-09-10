import { useEffect, useState } from "react";
import {
  fetchCalendar,
  fetchStandings,
  fetchTeams,
  fetchTyreModel,
} from "../api/commands";
import type { Race, Standing, Team, TyreModel } from "../types/sim";

export interface CatalogState {
  races: Race[];
  teams: Team[];
  standings: Standing[];
  tyreModel: TyreModel;
  isLoading: boolean;
  error: string | null;
}

const EMPTY: CatalogState = {
  races: [],
  teams: [],
  standings: [],
  tyreModel: {},
  isLoading: true,
  error: null,
};

export function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const [races, teams, standings, tyreModel] = await Promise.all([
          fetchCalendar(),
          fetchTeams(),
          fetchStandings(),
          fetchTyreModel(),
        ]);
        if (!cancelled) {
          setState({
            races,
            teams,
            standings,
            tyreModel,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load catalog";
        if (!cancelled) {
          setState({
            ...EMPTY,
            isLoading: false,
            error: message,
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

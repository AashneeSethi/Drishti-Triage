import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { BackendCase, CreateCaseRequest } from '../types/backend';
import { 
  checkBackendConnection, 
  listBackendCases, 
  createBackendCase,
  type ServiceStatus 
} from '../services/api';
import { CASE_METADATA } from '../data/syntheticCase';

export const BENCHMARK_CASE_ID = 'BENCHMARK';

export interface CaseItem {
  case_id: string;
  title: string;
  default_timezone: string;
  isBenchmark: boolean;
  created_at_utc?: string;
}

interface CaseContextType {
  activeCaseId: string;
  isLiveCase: boolean;
  activeCase: CaseItem;
  cases: CaseItem[];
  backendStatus: ServiceStatus | null;
  isLoadingCases: boolean;
  error: string | null;
  selectCase: (caseId: string) => void;
  createNewCase: (req: CreateCaseRequest) => Promise<BackendCase>;
  refreshCases: () => Promise<void>;
  refreshBackendStatus: () => Promise<ServiceStatus>;
}

const BENCHMARK_CASE: CaseItem = {
  case_id: BENCHMARK_CASE_ID,
  title: `${CASE_METADATA.caseId}: ${CASE_METADATA.operationName} (Synthetic Benchmark)`,
  default_timezone: 'Asia/Kolkata',
  isBenchmark: true
};

const CaseContext = createContext<CaseContextType | undefined>(undefined);

export const CaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCaseId, setActiveCaseId] = useState<string>(() => {
    return localStorage.getItem('drishti_active_case_id') || BENCHMARK_CASE_ID;
  });
  const [cases, setCases] = useState<CaseItem[]>([BENCHMARK_CASE]);
  const [backendStatus, setBackendStatus] = useState<ServiceStatus | null>(null);
  const [isLoadingCases, setIsLoadingCases] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBackendStatus = useCallback(async () => {
    const status = await checkBackendConnection(true);
    setBackendStatus(status);
    return status;
  }, []);

  const refreshCases = useCallback(async () => {
    setIsLoadingCases(true);
    setError(null);
    try {
      const status = await checkBackendConnection();
      setBackendStatus(status);

      if (status.isBackendConnected) {
        const liveCases = await listBackendCases();
        const mappedLive: CaseItem[] = liveCases.map(c => ({
          case_id: c.case_id,
          title: c.title || c.case_id,
          default_timezone: c.default_timezone || 'Asia/Kolkata',
          isBenchmark: false,
          created_at_utc: c.created_at_utc
        }));
        setCases([BENCHMARK_CASE, ...mappedLive]);
      } else {
        setCases([BENCHMARK_CASE]);
      }
    } catch (err) {
      console.warn('Error loading backend cases:', err);
      setError(err instanceof Error ? err.message : 'Could not fetch cases from backend');
      setCases([BENCHMARK_CASE]);
    } finally {
      setIsLoadingCases(false);
    }
  }, []);

  useEffect(() => {
    refreshCases();
  }, [refreshCases]);

  const selectCase = (caseId: string) => {
    setActiveCaseId(caseId);
    localStorage.setItem('drishti_active_case_id', caseId);
  };

  const createNewCase = async (req: CreateCaseRequest): Promise<BackendCase> => {
    setError(null);
    const newCase = await createBackendCase(req);
    await refreshCases();
    selectCase(newCase.case_id);
    return newCase;
  };

  const isLiveCase = activeCaseId !== BENCHMARK_CASE_ID;
  const activeCase = cases.find(c => c.case_id === activeCaseId) || BENCHMARK_CASE;

  return (
    <CaseContext.Provider
      value={{
        activeCaseId,
        isLiveCase,
        activeCase,
        cases,
        backendStatus,
        isLoadingCases,
        error,
        selectCase,
        createNewCase,
        refreshCases,
        refreshBackendStatus
      }}
    >
      {children}
    </CaseContext.Provider>
  );
};

export function useCase(): CaseContextType {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error('useCase must be used within a CaseProvider');
  }
  return context;
}

export interface ShiftReport {
  operatorName: string;
  generalDescription: string;
  machines: Record<string, string>; // MachineName -> Status/Observation
}

export interface DailyProcessReport {
  id: string;             // YYYY-MM-DD
  date: string;           // YYYY-MM-DD
  shifts: {
    shift1: ShiftReport;
    shift2: ShiftReport;
    shift3: ShiftReport;
  };
  createdAt?: number;
  updatedAt?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR' | 'READONLY' | 'PENDING';
  username?: string;
  name?: string;
  createdAt?: number;
}

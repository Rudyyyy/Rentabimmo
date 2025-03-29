export interface AmortizationRow {
  date: string;
  principal: number;
  interest: number;
  total: number;
  remainingBalance: number;
}

export interface AmortizationSchedule {
  schedule: AmortizationRow[];
  deferredInterest: number;
} 
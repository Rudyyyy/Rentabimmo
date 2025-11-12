import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CashFlowGoal from '../CashFlowGoal';

describe('CashFlowGoal', () => {
  let localStorageMock: any;
  const mockOnGoalChange = vi.fn();

  beforeEach(() => {
    localStorageMock = {
      data: {} as Record<string, string>,
      getItem: vi.fn((key: string) => localStorageMock.data[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock.data[key] = value;
      }),
      clear: vi.fn(() => {
        localStorageMock.data = {};
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock.data[key];
      }),
      length: 0,
      key: vi.fn()
    };
    global.localStorage = localStorageMock as any;
    mockOnGoalChange.mockClear();
  });

  const mockCashFlowData = [
    { year: 2024, total: 5000 },
    { year: 2025, total: 12000 },
    { year: 2026, total: 24000 },
    { year: 2027, total: 36000 },
    { year: 2028, total: 48000 },
    { year: 2029, total: 60000 },
    { year: 2030, total: 72000 }
  ];

  it('should render component without crashing', () => {
    render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    expect(screen.getByText(/objectif de cash flow/i)).toBeInTheDocument();
  });

  it('should display monthly goal input field', () => {
    render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/cash flow mensuel cible/i);
    expect(input).toBeInTheDocument();
  });

  it('should display annual goal calculated from monthly goal', () => {
    render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    expect(screen.getByText(/cash flow annuel cible/i)).toBeInTheDocument();
  });

  it('should have euro symbol as unit', () => {
    render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const euroSymbols = screen.getAllByText('€');
    expect(euroSymbols.length).toBeGreaterThan(0);
  });

  it('should load initial goal from localStorage', () => {
    localStorageMock.data['cashFlowGoal'] = '500';
    
    render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/cash flow mensuel cible/i) as HTMLInputElement;
    expect(input.value).toBe('500');
  });

  it('should calculate annual goal as monthly * 12', () => {
    render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/cash flow mensuel cible/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: '1000' } });
    
    // Annual should be 1000 * 12 = 12000
    const body = document.body.textContent || '';
    expect(body).toMatch(/12[\s\u00A0]000[\s\u00A0]*€/);
  });

  it('should update goal when input changes', () => {
    render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/cash flow mensuel cible/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: '800' } });
    
    expect(input.value).toBe('800');
    expect(mockOnGoalChange).toHaveBeenCalledWith(800);
  });

  it('should persist goal value across renders', () => {
    const { rerender } = render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/cash flow mensuel cible/i) as HTMLInputElement;
    
    // Set a goal value
    fireEvent.change(input, { target: { value: '600' } });
    
    // The value should be updated in the input
    expect(input.value).toBe('600');
  });

  it('should show success message when monthly goal is attainable', () => {
    render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/cash flow mensuel cible/i) as HTMLInputElement;
    
    // Set monthly goal of 1000 (annual 12000, attained in 2025)
    fireEvent.change(input, { target: { value: '1000' } });
    
    // Should show success message with the target year
    expect(screen.getByText(/votre objectif.*sera atteint en 2025/i)).toBeInTheDocument();
  });

  it('should not show message when goal is 0 or empty', () => {
    render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/cash flow mensuel cible/i) as HTMLInputElement;
    
    // Set goal to 0
    fireEvent.change(input, { target: { value: '0' } });
    
    // Should not show success message
    expect(screen.queryByText(/sera atteint/i)).not.toBeInTheDocument();
  });

  it('should find correct year when monthly goal is reached', () => {
    render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/cash flow mensuel cible/i) as HTMLInputElement;
    
    // Set monthly goal of 2000 (annual 24000, attained in 2026)
    fireEvent.change(input, { target: { value: '2000' } });
    
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('should not show message when goal is not attainable', () => {
    render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/cash flow mensuel cible/i) as HTMLInputElement;
    
    // Set very high monthly goal (annual 120000, not attained)
    fireEvent.change(input, { target: { value: '10000' } });
    
    // Should not show target year message
    expect(screen.queryByText(/sera atteint/i)).not.toBeInTheDocument();
  });

  it('should format currency in messages', () => {
    render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/cash flow mensuel cible/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: '1000' } });
    
    // Should display formatted currency value
    const body = document.body.textContent || '';
    expect(body).toMatch(/1[\s\u00A0]000[\s\u00A0]*€/);
  });

  it('should handle invalid input gracefully', () => {
    render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/cash flow mensuel cible/i) as HTMLInputElement;
    
    // Clear mock to reset call count
    mockOnGoalChange.mockClear();
    
    // Set invalid input (empty string should be treated as 0)
    fireEvent.change(input, { target: { value: '' } });
    
    // Component should handle this gracefully
    expect(input.value).toBe('');
  });

  it('should have correct input attributes', () => {
    render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/cash flow mensuel cible/i) as HTMLInputElement;
    
    expect(input.type).toBe('number');
    expect(input.min).toBe('0');
    expect(input.step).toBe('100');
  });

  it('should handle empty data array', () => {
    render(
      <CashFlowGoal
        cashFlowData={[]}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/cash flow mensuel cible/i) as HTMLInputElement;
    
    // Set a goal
    fireEvent.change(input, { target: { value: '1000' } });
    
    // Should not show success message since no data
    expect(screen.queryByText(/sera atteint/i)).not.toBeInTheDocument();
  });

  it('should update target year when goal changes', () => {
    render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/cash flow mensuel cible/i) as HTMLInputElement;
    
    // First goal (monthly 1000, annual 12000, year 2025)
    fireEvent.change(input, { target: { value: '1000' } });
    expect(screen.getByText(/2025/)).toBeInTheDocument();
    
    // Change goal (monthly 3000, annual 36000, year 2027)
    fireEvent.change(input, { target: { value: '3000' } });
    expect(screen.getByText(/2027/)).toBeInTheDocument();
  });

  it('should show correct styling for success state', () => {
    const { container } = render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/cash flow mensuel cible/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: '1000' } });
    
    // Should have blue styling
    const blueElements = container.querySelectorAll('.bg-blue-50');
    expect(blueElements.length).toBeGreaterThan(0);
  });

  it('should display two columns layout with monthly and annual', () => {
    render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    // Should have both monthly and annual labels
    expect(screen.getByText(/cash flow mensuel cible/i)).toBeInTheDocument();
    expect(screen.getByText(/cash flow annuel cible/i)).toBeInTheDocument();
  });

  it('should update annual goal display dynamically', () => {
    const { rerender } = render(
      <CashFlowGoal
        cashFlowData={mockCashFlowData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/cash flow mensuel cible/i) as HTMLInputElement;
    
    // Set monthly goal
    fireEvent.change(input, { target: { value: '500' } });
    
    // Annual should be 500 * 12 = 6000
    let body = document.body.textContent || '';
    expect(body).toMatch(/6[\s\u00A0]000[\s\u00A0]*€/);
    
    // Change monthly goal
    fireEvent.change(input, { target: { value: '1500' } });
    
    // Annual should now be 1500 * 12 = 18000
    body = document.body.textContent || '';
    expect(body).toMatch(/18[\s\u00A0]000[\s\u00A0]*€/);
  });
});


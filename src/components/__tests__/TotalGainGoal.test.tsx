import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TotalGainGoal from '../TotalGainGoal';

describe('TotalGainGoal', () => {
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

  const mockTotalGainData = [
    { year: 2024, totalGain: -10000 },
    { year: 2025, totalGain: 5000 },
    { year: 2026, totalGain: 25000 },
    { year: 2027, totalGain: 50000 },
    { year: 2028, totalGain: 75000 },
    { year: 2029, totalGain: 100000 },
    { year: 2030, totalGain: 130000 }
  ];

  it('should render component without crashing', () => {
    render(
      <TotalGainGoal
        totalGainData={mockTotalGainData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    expect(screen.getByText(/objectif de gain total cumulé/i)).toBeInTheDocument();
  });

  it('should display goal input field', () => {
    render(
      <TotalGainGoal
        totalGainData={mockTotalGainData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/gain total cumulé cible/i);
    expect(input).toBeInTheDocument();
  });

  it('should have euro symbol as unit', () => {
    render(
      <TotalGainGoal
        totalGainData={mockTotalGainData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    expect(screen.getByText('€')).toBeInTheDocument();
  });

  it('should load initial goal from localStorage', () => {
    localStorageMock.data['totalGainGoal'] = '50000';
    
    render(
      <TotalGainGoal
        totalGainData={mockTotalGainData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/gain total cumulé cible/i) as HTMLInputElement;
    expect(input.value).toBe('50000');
  });

  it('should update goal when input changes', () => {
    render(
      <TotalGainGoal
        totalGainData={mockTotalGainData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/gain total cumulé cible/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: '75000' } });
    
    expect(input.value).toBe('75000');
    expect(mockOnGoalChange).toHaveBeenCalledWith(75000);
  });

  it('should save goal to localStorage when changed', () => {
    render(
      <TotalGainGoal
        totalGainData={mockTotalGainData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/gain total cumulé cible/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: '60000' } });
    
    expect(localStorage.setItem).toHaveBeenCalledWith('totalGainGoal', '60000');
  });

  it('should show success message when goal is attainable', () => {
    render(
      <TotalGainGoal
        totalGainData={mockTotalGainData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/gain total cumulé cible/i) as HTMLInputElement;
    
    // Set a goal that is attainable (50000 is reached in 2027)
    fireEvent.change(input, { target: { value: '50000' } });
    
    // Should show success message with the target year
    expect(screen.getByText(/votre objectif de.*sera atteint en 2027/i)).toBeInTheDocument();
    expect(screen.getByText(/✅/)).toBeInTheDocument();
  });

  it('should show warning when goal is not attainable', () => {
    render(
      <TotalGainGoal
        totalGainData={mockTotalGainData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/gain total cumulé cible/i) as HTMLInputElement;
    
    // Set a goal that is not attainable (200000 is higher than max)
    fireEvent.change(input, { target: { value: '200000' } });
    
    // Should show warning message
    expect(screen.getByText(/l'objectif.*ne sera pas atteint/i)).toBeInTheDocument();
    expect(screen.getByText(/⚠️/)).toBeInTheDocument();
  });

  it('should not show any message when goal is 0 or empty', () => {
    render(
      <TotalGainGoal
        totalGainData={mockTotalGainData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/gain total cumulé cible/i) as HTMLInputElement;
    
    // Set goal to 0
    fireEvent.change(input, { target: { value: '0' } });
    
    // Should not show any success or warning message
    expect(screen.queryByText(/sera atteint/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ne sera pas atteint/i)).not.toBeInTheDocument();
  });

  it('should find the first year when goal is reached', () => {
    render(
      <TotalGainGoal
        totalGainData={mockTotalGainData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/gain total cumulé cible/i) as HTMLInputElement;
    
    // Set a goal of 25000 (reached in 2026)
    fireEvent.change(input, { target: { value: '25000' } });
    
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('should format currency in messages', () => {
    render(
      <TotalGainGoal
        totalGainData={mockTotalGainData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/gain total cumulé cible/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: '50000' } });
    
    // Should display formatted currency value
    const body = document.body.textContent || '';
    expect(body).toMatch(/50[\s\u00A0]000[\s\u00A0]*€/);
  });

  it('should handle invalid input gracefully', () => {
    render(
      <TotalGainGoal
        totalGainData={mockTotalGainData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/gain total cumulé cible/i) as HTMLInputElement;
    
    // Clear mock to reset call count
    mockOnGoalChange.mockClear();
    
    // Set invalid input (empty string should be treated as 0)
    fireEvent.change(input, { target: { value: '' } });
    
    // Component should handle this gracefully (onChange might be called with 0 or not called at all)
    // The important thing is that it doesn't crash
    expect(input.value).toBe('');
  });

  it('should have correct input attributes', () => {
    render(
      <TotalGainGoal
        totalGainData={mockTotalGainData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/gain total cumulé cible/i) as HTMLInputElement;
    
    expect(input.type).toBe('number');
    expect(input.min).toBe('0');
    expect(input.step).toBe('1000');
  });

  it('should handle empty data array', () => {
    render(
      <TotalGainGoal
        totalGainData={[]}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/gain total cumulé cible/i) as HTMLInputElement;
    
    // Set a goal
    fireEvent.change(input, { target: { value: '50000' } });
    
    // Should show warning since no data
    expect(screen.getByText(/ne sera pas atteint/i)).toBeInTheDocument();
  });

  it('should update target year when goal changes', () => {
    render(
      <TotalGainGoal
        totalGainData={mockTotalGainData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/gain total cumulé cible/i) as HTMLInputElement;
    
    // First goal
    fireEvent.change(input, { target: { value: '25000' } });
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    
    // Change goal
    fireEvent.change(input, { target: { value: '75000' } });
    expect(screen.getByText(/2028/)).toBeInTheDocument();
  });

  it('should show correct styling for success state', () => {
    const { container } = render(
      <TotalGainGoal
        totalGainData={mockTotalGainData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/gain total cumulé cible/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: '50000' } });
    
    // Should have green styling
    const greenElements = container.querySelectorAll('.bg-green-50, .border-green-200');
    expect(greenElements.length).toBeGreaterThan(0);
  });

  it('should show correct styling for warning state', () => {
    const { container } = render(
      <TotalGainGoal
        totalGainData={mockTotalGainData}
        onGoalChange={mockOnGoalChange}
      />
    );
    
    const input = screen.getByLabelText(/gain total cumulé cible/i) as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: '200000' } });
    
    // Should have yellow styling
    const yellowElements = container.querySelectorAll('.bg-yellow-50, .border-yellow-200');
    expect(yellowElements.length).toBeGreaterThan(0);
  });
});


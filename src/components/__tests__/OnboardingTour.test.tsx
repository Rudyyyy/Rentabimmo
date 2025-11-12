import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OnboardingTour from '../OnboardingTour';

describe('OnboardingTour', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    localStorage.clear();
  });

  it('devrait afficher la première étape au montage', () => {
    render(<OnboardingTour onClose={mockOnClose} />);
    
    expect(screen.getByText(/Bienvenue sur Rentab'immo/i)).toBeInTheDocument();
    expect(screen.getByText(/Étape 1 sur 9/i)).toBeInTheDocument();
  });

  it('devrait permettre de naviguer vers l\'étape suivante', () => {
    render(<OnboardingTour onClose={mockOnClose} />);
    
    const nextButton = screen.getByRole('button', { name: /Suivant/i });
    fireEvent.click(nextButton);
    
    expect(screen.getByText(/Ajoutez vos biens immobiliers/i)).toBeInTheDocument();
    expect(screen.getByText(/Étape 2 sur 9/i)).toBeInTheDocument();
  });

  it('devrait permettre de revenir à l\'étape précédente', () => {
    render(<OnboardingTour onClose={mockOnClose} />);
    
    // Aller à la deuxième étape
    const nextButton = screen.getByRole('button', { name: /Suivant/i });
    fireEvent.click(nextButton);
    
    // Revenir à la première étape
    const prevButton = screen.getByRole('button', { name: /Précédent/i });
    fireEvent.click(prevButton);
    
    expect(screen.getByText(/Bienvenue sur Rentab'immo/i)).toBeInTheDocument();
    expect(screen.getByText(/Étape 1 sur 9/i)).toBeInTheDocument();
  });

  it('devrait désactiver le bouton précédent sur la première étape', () => {
    render(<OnboardingTour onClose={mockOnClose} />);
    
    const prevButton = screen.getByRole('button', { name: /Précédent/i });
    expect(prevButton).toBeDisabled();
  });

  it('devrait afficher "Commencer" sur la dernière étape', async () => {
    render(<OnboardingTour onClose={mockOnClose} />);
    
    const nextButton = screen.getByRole('button', { name: /Suivant/i });
    
    // Naviguer jusqu'à la dernière étape (9 étapes)
    for (let i = 0; i < 8; i++) {
      fireEvent.click(nextButton);
    }
    
    await waitFor(() => {
      expect(screen.getByText(/Vous êtes prêt/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Commencer/i })).toBeInTheDocument();
    });
  });

  it('devrait fermer le tour quand on clique sur fermer (X)', () => {
    render(<OnboardingTour onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText(/Fermer/i);
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('devrait fermer le tour quand on clique sur "Passer le guide"', () => {
    render(<OnboardingTour onClose={mockOnClose} />);
    
    const skipButton = screen.getByRole('button', { name: /Passer le guide/i });
    fireEvent.click(skipButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('devrait sauvegarder la préférence "Ne plus afficher" dans localStorage', () => {
    render(<OnboardingTour onClose={mockOnClose} />);
    
    const checkbox = screen.getByRole('checkbox', { name: /Ne plus afficher ce guide/i });
    fireEvent.click(checkbox);
    
    const skipButton = screen.getByRole('button', { name: /Passer le guide/i });
    fireEvent.click(skipButton);
    
    expect(localStorage.getItem('onboarding_completed')).toBe('true');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('ne devrait pas sauvegarder la préférence si la case n\'est pas cochée', () => {
    render(<OnboardingTour onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText(/Fermer/i);
    fireEvent.click(closeButton);
    
    expect(localStorage.getItem('onboarding_completed')).toBeNull();
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('devrait afficher les points clés pour chaque étape', () => {
    render(<OnboardingTour onClose={mockOnClose} />);
    
    expect(screen.getByText(/Points clés/i)).toBeInTheDocument();
    expect(screen.getByText(/Calculez précisément vos gains futurs/i)).toBeInTheDocument();
  });

  it('devrait afficher et mettre à jour l\'indicateur de progression', async () => {
    render(<OnboardingTour onClose={mockOnClose} />);
    
    // Vérifier que l'indicateur d'étape est présent
    expect(screen.getByText(/Étape 1 sur 9/i)).toBeInTheDocument();
    
    // Aller à la deuxième étape
    const nextButton = screen.getByRole('button', { name: /Suivant/i });
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      // Vérifier que l'indicateur a été mis à jour
      expect(screen.getByText(/Étape 2 sur 9/i)).toBeInTheDocument();
    });
    
    // Aller à la troisième étape
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Étape 3 sur 9/i)).toBeInTheDocument();
    });
  });

  it('devrait fermer le tour à la dernière étape quand on clique sur "Commencer"', async () => {
    render(<OnboardingTour onClose={mockOnClose} />);
    
    const nextButton = screen.getByRole('button', { name: /Suivant/i });
    
    // Naviguer jusqu'à la dernière étape
    for (let i = 0; i < 8; i++) {
      fireEvent.click(nextButton);
    }
    
    await waitFor(() => {
      const startButton = screen.getByRole('button', { name: /Commencer/i });
      fireEvent.click(startButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('devrait afficher les 9 étapes avec les bons titres', async () => {
    render(<OnboardingTour onClose={mockOnClose} />);
    
    const expectedTitles = [
      /Bienvenue sur Rentab'immo/i,
      /Ajoutez vos biens immobiliers/i,
      /Renseignez votre acquisition/i,
      /Configurez votre financement/i,
      /Définissez votre location/i,
      /Choisissez votre régime fiscal/i,
      /Visualisez votre rentabilité/i,
      /Définissez vos objectifs/i,
      /Vous êtes prêt/i
    ];
    
    const nextButton = screen.getByRole('button', { name: /Suivant/i });
    
    for (let i = 0; i < expectedTitles.length; i++) {
      await waitFor(() => {
        expect(screen.getByText(expectedTitles[i])).toBeInTheDocument();
      });
      
      if (i < expectedTitles.length - 1) {
        fireEvent.click(nextButton);
      }
    }
  });

  it('devrait cocher/décocher la case "Ne plus afficher"', () => {
    render(<OnboardingTour onClose={mockOnClose} />);
    
    const checkbox = screen.getByRole('checkbox', { name: /Ne plus afficher ce guide/i }) as HTMLInputElement;
    
    expect(checkbox.checked).toBe(false);
    
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);
  });
});


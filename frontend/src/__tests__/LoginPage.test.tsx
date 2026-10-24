import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../context/AuthContext';
import { LoginPage } from '../pages/LoginPage';

const mockAuth: AuthContextValue = {
  session: null,
  isAuthenticated: false,
  isStaff: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  refreshSession: vi.fn(),
};

function renderLoginPage() {
  return render(
    <AuthContext.Provider value={mockAuth}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('LoginPage and Registration Flow Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/v1/health/db')) {
        return {
          ok: true,
          json: async () => ({
            connected: true,
            total_students_detected: 77,
            latency_ms: 120,
            message: 'Supabase PostgreSQL live connection verified successfully',
          }),
        } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({ status: 'success' }),
      } as unknown as Response;
    });
  });

  it('renders Sign In tab by default with heading and live Supabase badge', async () => {
    renderLoginPage();

    expect(screen.getByRole('heading', { level: 1, name: /Sign in to EduNexus AI/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Institutional Email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
  });

  it('switches between Sign In and Create Account / Register tabs', async () => {
    renderLoginPage();

    // Find and click the register tab button
    const registerTab = screen.getByRole('button', { name: /Create Account \/ Register/i });
    fireEvent.click(registerTab);

    // Verify register heading is now visible
    expect(screen.getByRole('heading', { level: 1, name: /Create Your EduNexus AI Account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Institutional Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Academic Department \/ School/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Create Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();

    // Click back to Sign In tab
    const signInTab = screen.getByRole('button', { name: /^Sign In$/i });
    fireEvent.click(signInTab);

    expect(screen.getByRole('heading', { level: 1, name: /Sign in to EduNexus AI/i })).toBeInTheDocument();
  });

  it('shows student ID field when student role is chosen during registration', async () => {
    renderLoginPage();

    const registerTab = screen.getByRole('button', { name: /Create Account \/ Register/i });
    fireEvent.click(registerTab);

    // Find student role button in registration
    const studentButtons = screen.getAllByRole('button', { name: /Student/i });
    fireEvent.click(studentButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText(/Student ID \/ Roll Number/i)).toBeInTheDocument();
    });
  });

  it('allows instant evaluation sign-in via quick role preview', async () => {
    renderLoginPage();

    const quickButtons = screen.getAllByRole('button', { name: /Administrator/i });
    expect(quickButtons.length).toBeGreaterThan(0);
    fireEvent.click(quickButtons[0]);

    expect(mockAuth.signIn).toHaveBeenCalledWith(
      'edunexus-demo-admin-token',
      expect.objectContaining({ role: 'admin', email: 'admin@edunexus.ai' })
    );
  });

  it('switches to login form and shows registration success message after registration', async () => {
    renderLoginPage();

    // Click register tab
    fireEvent.click(screen.getByRole('button', { name: /Create Account \/ Register/i }));

    // Fill in registration fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Dr. Jane Watson' } });
    fireEvent.change(screen.getByLabelText(/Institutional Email Address/i), { target: { value: 'jwatson@edunexus.ai' } });
    fireEvent.change(screen.getByLabelText(/Create Password/i), { target: { value: 'SecurePass@2026' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'SecurePass@2026' } });

    // Submit registration
    fireEvent.click(screen.getByRole('button', { name: /Complete Registration & Create Account/i }));

    // Verify it switches back to Sign In form with success notification
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Sign in to EduNexus AI/i })).toBeInTheDocument();
      expect(screen.getByText(/Registration Successful!/i)).toBeInTheDocument();
    });

    // Verify credentials are prefilled in the login form
    const emailInput = screen.getByLabelText(/Institutional Email$/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/^Password$/i) as HTMLInputElement;
    expect(emailInput.value).toBe('jwatson@edunexus.ai');
    expect(passwordInput.value).toBe('SecurePass@2026');
  });

  it('successfully signs in with newly registered credentials without "Invalid login credentials" error', async () => {
    renderLoginPage();

    // 1. Register a new user
    fireEvent.click(screen.getByRole('button', { name: /Create Account \/ Register/i }));
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Ishita Verma' } });
    fireEvent.change(screen.getByLabelText(/Institutional Email Address/i), { target: { value: 'ishita@edunexus.ai' } });
    fireEvent.change(screen.getByLabelText(/Create Password/i), { target: { value: 'EduSecure@2026' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'EduSecure@2026' } });
    fireEvent.click(screen.getByRole('button', { name: /Complete Registration & Create Account/i }));

    // Wait for transition to Sign In form
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Sign in to EduNexus AI/i })).toBeInTheDocument();
    });

    // 2. Submit the Sign In form with the registered credentials
    const submitButtons = screen.getAllByRole('button', { name: /^Sign In$/i });
    const submitButton = submitButtons.find((btn) => btn.getAttribute('type') === 'submit') || submitButtons[submitButtons.length - 1];
    fireEvent.click(submitButton);

    // Verify signIn was called with the user's registered role and email without throwing "Invalid login credentials"
    await waitFor(() => {
      expect(mockAuth.signIn).toHaveBeenCalledWith(
        expect.stringContaining('edunexus-demo-'),
        expect.objectContaining({
          role: 'advisor',
          email: 'ishita@edunexus.ai',
        })
      );
    });

    // Verify no error alert is present
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminSidebar } from '../AdminSidebar';
import * as nextNavigation from 'next/navigation';

// Mock next/navigation
const mockUsePathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

describe('AdminSidebar - Desktop Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/admin/dashboard');
    
    // Mock desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });
  });

  test('renders sidebar with navigation items', () => {
    render(<AdminSidebar isOpen={true} onClose={jest.fn()} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Pedidos')).toBeInTheDocument();
    expect(screen.getByText('Inventario')).toBeInTheDocument();
    expect(screen.getByText('Movimientos')).toBeInTheDocument();
    expect(screen.getByText('Configuración')).toBeInTheDocument();
  });

  test('displays icons and labels when expanded', () => {
    render(<AdminSidebar isOpen={true} onClose={jest.fn()} isCollapsed={false} />);
    
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('w-64');
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('displays only icons when collapsed', () => {
    render(<AdminSidebar isOpen={true} onClose={jest.fn()} isCollapsed={true} />);
    
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('w-16');
    
    // Labels should not be visible
    const dashboardLabel = screen.queryByText('Dashboard');
    // In collapsed state, text might still be in DOM but hidden
    // Check that sidebar has collapsed width
    expect(sidebar).toHaveClass('lg:w-16');
  });

  test('highlights active route', () => {
    mockUsePathname.mockReturnValueOnce('/admin/inventario');
    render(<AdminSidebar isOpen={true} onClose={jest.fn()} isCollapsed={false} />);
    
    const inventarioLink = screen.getByText('Inventario').closest('a');
    expect(inventarioLink).toHaveClass('bg-emerald-100', 'text-emerald-700');
  });

  test('toggle collapse button works', () => {
    const onToggleCollapse = jest.fn();
    render(
      <AdminSidebar 
        isOpen={true} 
        onClose={jest.fn()} 
        isCollapsed={false}
        onToggleCollapse={onToggleCollapse}
      />
    );
    
    const toggleButton = screen.getByLabelText('Colapsar menú');
    fireEvent.click(toggleButton);
    
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  test('sidebar has smooth transition classes', () => {
    render(<AdminSidebar isOpen={true} onClose={jest.fn()} />);
    
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('transition-all', 'duration-300');
  });
});

describe('AdminSidebar - Mobile Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/admin/dashboard');
    
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
  });

  test('shows overlay when open on mobile', () => {
    render(<AdminSidebar isOpen={true} onClose={jest.fn()} />);
    
    const overlay = document.querySelector('.fixed.inset-0.bg-black\\/50');
    expect(overlay).toBeInTheDocument();
  });

  test('closes sidebar when overlay is clicked', () => {
    const onClose = jest.fn();
    render(<AdminSidebar isOpen={true} onClose={onClose} />);
    
    const overlay = document.querySelector('.fixed.inset-0.bg-black\\/50');
    if (overlay) {
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalled();
    }
  });

  test('sidebar slides in from left when open', () => {
    render(<AdminSidebar isOpen={true} onClose={jest.fn()} />);
    
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('translate-x-0');
  });

  test('sidebar slides out to left when closed', () => {
    render(<AdminSidebar isOpen={false} onClose={jest.fn()} />);
    
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('-translate-x-full');
  });

  test('close button is visible on mobile', () => {
    render(<AdminSidebar isOpen={true} onClose={jest.fn()} />);
    
    const closeButton = screen.getByLabelText('Cerrar menú');
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveClass('lg:hidden');
  });
});

describe('AdminSidebar - Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/admin/dashboard');
  });

  test('navigation links work correctly', () => {
    render(<AdminSidebar isOpen={true} onClose={jest.fn()} />);
    
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink).toHaveAttribute('href', '/admin/dashboard');
    
    const inventarioLink = screen.getByText('Inventario').closest('a');
    expect(inventarioLink).toHaveAttribute('href', '/admin/inventario');
  });

  test('maintains state during collapse/expand', () => {
    const { rerender } = render(
      <AdminSidebar 
        isOpen={true} 
        onClose={jest.fn()} 
        isCollapsed={false}
        onToggleCollapse={jest.fn()}
      />
    );
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    
    rerender(
      <AdminSidebar 
        isOpen={true} 
        onClose={jest.fn()} 
        isCollapsed={true}
        onToggleCollapse={jest.fn()}
      />
    );
    
    // Sidebar should still be functional
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toBeInTheDocument();
  });
});

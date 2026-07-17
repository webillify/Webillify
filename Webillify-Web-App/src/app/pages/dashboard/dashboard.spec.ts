import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { DashboardRepository } from '../../core/data-access/repositories';
import { DashboardSnapshot } from '../../core/domain/models';
import { DashboardPage } from './dashboard';
import { AuthStore } from '../../core/auth/auth.store';

describe('DashboardPage', () => {
  const auth = {
    user: () => ({ displayName: 'Test Owner' }),
    session: () => ({ workspace: { organizationName: 'Test Organization', branchName: 'Main' } }),
  };
  const snapshot: DashboardSnapshot = {
    recentSales: [
      { invoice: 'WBL-0001', customer: 'Walk-in', time: '10:30', amount: 450, status: 'Paid' },
    ],
    salesBars: [25, 75],
  };

  it('loads and renders repository data', async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: auth },
        { provide: DashboardRepository, useValue: { getSnapshot: () => of(snapshot) } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.state().status).toBe('success');
    expect(fixture.componentInstance.recentSales()).toHaveLength(1);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('WBL-0001');
  });

  it('shows a repository error accessibly', async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: auth },
        {
          provide: DashboardRepository,
          useValue: { getSnapshot: () => throwError(() => new Error('Dashboard API unavailable')) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');

    expect(fixture.componentInstance.state().status).toBe('error');
    expect(alert?.textContent).toContain('Dashboard API unavailable');
  });
});

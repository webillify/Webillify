import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProductRepository } from '../../core/data-access/repositories';
import { ProductsPage } from './products';

describe('ProductsPage', () => {
  it('renders an empty state when the repository has no products', async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsPage],
      providers: [{ provide: ProductRepository, useValue: { list: () => of([]) } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProductsPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.state().status).toBe('empty');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'No matching products found',
    );
  });
});

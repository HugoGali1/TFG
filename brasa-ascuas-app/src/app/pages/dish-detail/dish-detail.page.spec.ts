import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DishDetailPage } from './dish-detail.page';

describe('DishDetailPage', () => {
  let component: DishDetailPage;
  let fixture: ComponentFixture<DishDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DishDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

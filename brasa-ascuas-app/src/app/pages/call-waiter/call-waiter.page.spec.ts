import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CallWaiterPage } from './call-waiter.page';

describe('CallWaiterPage', () => {
  let component: CallWaiterPage;
  let fixture: ComponentFixture<CallWaiterPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CallWaiterPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

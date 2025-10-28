import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoutineTracker } from './routine-tracker';

describe('RoutineTracker', () => {
  let component: RoutineTracker;
  let fixture: ComponentFixture<RoutineTracker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoutineTracker]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoutineTracker);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

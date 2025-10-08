import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Emergencyhelp } from './emergencyhelp';

describe('Emergencyhelp', () => {
  let component: Emergencyhelp;
  let fixture: ComponentFixture<Emergencyhelp>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Emergencyhelp]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Emergencyhelp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

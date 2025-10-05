import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mypeople } from './mypeople';

describe('Mypeople', () => {
  let component: Mypeople;
  let fixture: ComponentFixture<Mypeople>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Mypeople]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Mypeople);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

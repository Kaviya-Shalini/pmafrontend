import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMemory } from './add-memory';

describe('AddMemory', () => {
  let component: AddMemory;
  let fixture: ComponentFixture<AddMemory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMemory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddMemory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoContactsComponent } from './photocontact';

describe('Photocontact', () => {
  let component: PhotoContactsComponent;
  let fixture: ComponentFixture<PhotoContactsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoContactsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PhotoContactsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

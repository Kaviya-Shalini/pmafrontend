import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConnectFamilyComponent } from './connectfamily';

describe('Connectfamily', () => {
  let component: ConnectFamilyComponent;
  let fixture: ComponentFixture<ConnectFamilyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConnectFamilyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConnectFamilyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

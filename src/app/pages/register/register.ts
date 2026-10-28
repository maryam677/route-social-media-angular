
import { Component, ChangeDetectorRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, timeout } from 'rxjs';

@Component({
  selector: 'app-register',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  registerForm;
  errorMessage = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      username: [''],
      email: ['', [Validators.required, Validators.email]],
      gender: ['', Validators.required],
      dateOfBirth: ['', Validators.required],
      password: ['', [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/)]],
      rePassword: ['', Validators.required]
    });
  }

  register() {
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid || this.loading) return;

    const data = this.registerForm.getRawValue();

    if (data.password !== data.rePassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.http.post<any>('https://route-posts.routemisr.com/users/signup', data)
      .pipe(
        timeout(15000),
        finalize(() => {
          this.loading = false;
          this.cd.markForCheck();
        })
      )
      .subscribe({
        next: res => {
          if (res.success && res.data?.token) {
            localStorage.setItem('token', res.data.token);
            this.router.navigate(['/home']);
          } else {
            this.errorMessage = 'Registration failed';
          }
          this.cd.markForCheck();
        },
        error: err => {
          this.errorMessage = err.name === 'TimeoutError'
            ? 'Request is taking too long. Please try again.'
            : err.error?.message || 'Something went wrong. Try again.';
          this.cd.markForCheck();
        }
      });
  }
}

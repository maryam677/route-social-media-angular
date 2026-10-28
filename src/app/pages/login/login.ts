
import { Component, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  loading = false;
  errorMessage = '';

  loginForm;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {
    this.loginForm = this.fb.group({
      login: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  login() {
    if (this.loginForm.invalid || this.loading) return;

    this.loading = true;
    this.errorMessage = '';

    this.http.post<any>(
      'https://route-posts.routemisr.com/users/signin',
      this.loginForm.value
    ).pipe(
      timeout(10000),
      finalize(() => {
        this.loading = false;
        this.cd.markForCheck();
      })
    ).subscribe({
      next: res => {
        if (res.data?.token) {
          localStorage.setItem('token', res.data.token);
          this.router.navigate(['/home']);
        } else {
          this.errorMessage = 'incorrect email or password';
        }
        this.cd.markForCheck();
      },
      error: err => {
        this.errorMessage = err.name === 'TimeoutError'
          ? 'Login is taking too long. Please try again.'
          : 'incorrect email or password';
        this.cd.markForCheck();
      }
    });
  }
}

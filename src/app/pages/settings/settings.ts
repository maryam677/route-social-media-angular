
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Navbar } from '../../components/navbar/navbar';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, Navbar],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {
  api = 'https://route-posts.routemisr.com';
  user: any = null;
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!localStorage.getItem('token')) {
      this.router.navigate(['/login']);
      return;
    }
    this.getProfile();
  }

  get headers() {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`
    });
  }

  get validPassword() {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(this.newPassword);
  }

  get canSubmit() {
    return !!this.currentPassword &&
      this.validPassword &&
      this.newPassword === this.confirmPassword &&
      this.currentPassword !== this.newPassword &&
      !this.loading;
  }

  getProfile() {
    this.http.get<any>(`${this.api}/users/profile-data`, {headers: this.headers}).subscribe({
      next: res => {
        this.user = res.data?.user || res.data;
        this.cd.markForCheck();
      }
    });
  }

  changePassword() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    if (!this.validPassword) {
      this.errorMessage = 'Password must include uppercase, lowercase, number and special character';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    if (this.newPassword === this.currentPassword) {
      this.errorMessage = 'New password must be different from current password';
      return;
    }

    if (this.loading) return;
    this.loading = true;

    const data = {
      password: this.currentPassword,
      newPassword: this.newPassword
    };

    this.http.patch<any>(`${this.api}/users/change-password`, data, {headers: this.headers})
      .pipe(finalize(() => {
        this.loading = false;
        this.cd.markForCheck();
      }))
      .subscribe({
        next: res => {
          if (res.success === false) {
            this.errorMessage = res.message || 'Could not change password';
            this.cd.markForCheck();
            return;
          }

          if (res.data?.token) {
            localStorage.setItem('token', res.data.token);
          }

          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          this.successMessage = 'Password updated successfully';
          this.cd.markForCheck();
        },
        error: err => {
          this.errorMessage = 'Could not change password. Check your current password and try again.';
          this.cd.markForCheck();
        }
      });
  }
}

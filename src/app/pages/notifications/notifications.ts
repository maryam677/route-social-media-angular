
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { finalize } from 'rxjs';
import { Navbar } from '../../components/navbar/navbar';

@Component({
  selector: 'app-notifications',
  imports: [DatePipe, Navbar],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class Notifications implements OnInit {
  api = 'https://route-posts.routemisr.com';
  user: any = null;
  notifications: any[] = [];
  activeTab = 'All';
  unreadCount = 0;
  loading = false;
  markingAll = false;
  busyId = '';
  errorMessage = '';

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
    this.getNotifications();
    this.getUnreadCount();
  }

  get headers() {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`
    });
  }

  getProfile() {
    this.http.get<any>(`${this.api}/users/profile-data`, {headers: this.headers}).subscribe({
      next: res => {
        this.user = res.data?.user || res.data;
        this.cd.markForCheck();
      }
    });
  }

  getNotifications() {
    this.loading = true;
    this.errorMessage = '';

    this.http.get<any>(`${this.api}/notifications`, {headers: this.headers}).subscribe({
      next: res => {
        const data = res.data;
        this.notifications = Array.isArray(data) ? data : data?.notifications || [];
        this.loading = false;
        this.cd.markForCheck();
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Could not load notifications';
        this.cd.markForCheck();
      }
    });
  }

  getUnreadCount() {
    this.http.get<any>(`${this.api}/notifications/unread-count`, {headers: this.headers}).subscribe({
      next: res => {
        this.unreadCount = res.data?.unreadCount ?? res.data?.count ?? 0;
        this.cd.markForCheck();
      }
    });
  }

  isRead(notification: any) {
    return notification.isRead === true || notification.read === true;
  }

  get filteredNotifications() {
    if (this.activeTab === 'Unread') {
      return this.notifications.filter(n => !this.isRead(n));
    }
    return this.notifications;
  }

  readNotification(notification: any) {
    if (this.isRead(notification) || this.busyId) return;

    this.busyId = notification._id;
    this.errorMessage = '';

    this.http.patch<any>(`${this.api}/notifications/${notification._id}/read`, {}, {headers: this.headers})
      .pipe(finalize(() => {
        this.busyId = '';
        this.cd.markForCheck();
      }))
      .subscribe({
        next: res => {
          if (res.success === false) {
            this.errorMessage = res.message || 'Could not update notification';
            return;
          }
          notification.isRead = true;
          notification.read = true;
          this.getUnreadCount();
          this.cd.markForCheck();
        },
        error: err => {
          this.errorMessage = err.error?.message || 'Could not update notification';
          this.cd.markForCheck();
        }
      });
  }

  markAllRead() {
    if (this.markingAll || this.unreadCount === 0) return;

    this.markingAll = true;
    this.errorMessage = '';

    this.http.patch<any>(`${this.api}/notifications/read-all`, {}, {headers: this.headers})
      .pipe(finalize(() => {
        this.markingAll = false;
        this.cd.markForCheck();
      }))
      .subscribe({
        next: res => {
          if (res.success === false) {
            this.errorMessage = res.message || 'Could not mark notifications as read';
            return;
          }
          this.notifications.forEach(n => {
            n.isRead = true;
            n.read = true;
          });
          this.unreadCount = 0;
          this.cd.markForCheck();
        },
        error: err => {
          this.errorMessage = err.error?.message || 'Could not mark notifications as read';
          this.cd.markForCheck();
        }
      });
  }
}

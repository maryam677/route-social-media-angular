
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { Navbar } from '../../components/navbar/navbar';

@Component({
  selector: 'app-user-profile',
  imports: [DatePipe, Navbar],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css'
})
export class UserProfile implements OnInit {
  api = 'https://route-posts.routemisr.com';
  user: any = null;
  myAccount: any = null;
  posts: any[] = [];
  userId = '';
  loading = true;
  postsLoading = true;
  errorMessage = '';
  postsError = '';
  followError = '';
  following = false;
  isFollowing = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (!localStorage.getItem('token')) {
      this.router.navigate(['/login']);
      return;
    }

    this.getMyAccount();

    this.route.paramMap.subscribe(params => {
      this.userId = params.get('id') || '';
      this.user = null;
      this.posts = [];
      this.isFollowing = false;

      if (this.userId) {
        this.getUser();
        this.getPosts();
      }
    });
  }

  get headers() {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`
    });
  }

  userImage(user: any) {
    return user?.photo || user?.profilePicture || user?.avatar || user?.image || '';
  }

  getMyAccount() {
    this.http.get<any>(`${this.api}/users/profile-data`, {headers: this.headers}).subscribe({
      next: res => {
        this.myAccount = res.data?.user || res.data;
        this.cd.markForCheck();
      }
    });
  }

  getUser() {
    this.loading = true;
    this.errorMessage = '';
    const id = this.userId;

    this.http.get<any>(`${this.api}/users/${id}/profile`, {headers: this.headers}).subscribe({
      next: res => {
        if (id !== this.userId) return;
        this.user = res.data?.user || res.data?.profile || res.data;

        const status = res.data?.isFollowing ?? this.user?.isFollowing;
        if (typeof status === 'boolean') this.isFollowing = status;

        this.loading = false;
        this.cd.markForCheck();
      },
      error: err => {
        if (id !== this.userId) return;
        this.loading = false;
        this.errorMessage = err.error?.message || 'Could not load profile';
        this.cd.markForCheck();
      }
    });
  }

  getPosts() {
    this.postsLoading = true;
    this.postsError = '';
    const id = this.userId;

    this.http.get<any>(`${this.api}/users/${id}/posts?page=1&limit=20`, {
      headers: this.headers
    }).subscribe({
      next: res => {
        if (id !== this.userId) return;
        const data = res.data;
        const list = Array.isArray(data) ? data : data?.posts || [];
        this.posts = list.map((item: any) => item.post || item);
        this.postsLoading = false;
        this.cd.markForCheck();
      },
      error: err => {
        if (id !== this.userId) return;
        this.postsLoading = false;
        this.postsError = err.error?.message || 'Could not load posts';
        this.cd.markForCheck();
      }
    });
  }

  followUser() {
    if (this.following || !this.userId) return;

    const id = this.userId;
    this.following = true;
    this.followError = '';

    this.http.put<any>(`${this.api}/users/${id}/follow`, {}, {headers: this.headers})
      .pipe(finalize(() => {
        this.following = false;
        this.cd.markForCheck();
      }))
      .subscribe({
        next: res => {
          if (id !== this.userId) return;
          if (res.success === false) {
            this.followError = res.message || 'Could not update follow';
            return;
          }

          const status = res.data?.isFollowing ?? res.data?.following;
          this.isFollowing = typeof status === 'boolean' ? status : !this.isFollowing;
          this.cd.markForCheck();
        },
        error: err => {
          if (id !== this.userId) return;
          this.followError = err.error?.message || 'Could not update follow';
          this.cd.markForCheck();
        }
      });
  }

  originalPost(post: any) {
    const original = post.sharedPost?.post || post.sharedPost ||
      post.originalPost?.post || post.originalPost ||
      post.sharedFrom?.post || post.sharedFrom || post.repostOf;

    return original && typeof original === 'object' ? original : null;
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}

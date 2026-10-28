
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { Navbar } from '../../components/navbar/navbar';

@Component({
  selector: 'app-profile',
  imports: [DatePipe, Navbar],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
  api = 'https://route-posts.routemisr.com';
  user: any = null;
  myPosts: any[] = [];
  savedPosts: any[] = [];
  activeTab = 'My Posts';
  loading = true;
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
    this.loadProfile();
  }

  get headers() {
    return new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`
    });
  }

  get userPhoto() {
    return this.getImage(this.user);
  }

  get followers() {
    const value = this.user?.followersCount ??
      this.user?.followers?.length ?? this.user?.followers;
    return typeof value === 'number' ? value : '—';
  }

  get following() {
    const value = this.user?.followingCount ??
      this.user?.following?.length ?? this.user?.following;
    return typeof value === 'number' ? value : '—';
  }

  get posts() {
    return this.activeTab === 'My Posts' ? this.myPosts : this.savedPosts;
  }

  get totalPosts() {
    return this.user?.postsCount ?? this.user?.postCount ?? this.myPosts.length;
  }

  get totalSaved() {
    return this.user?.bookmarksCount ?? this.savedPosts.length;
  }

  get originalCount() {
    return this.activeTab === 'My Posts' ? this.totalPosts : this.totalSaved;
  }

  getImage(user: any) {
    return user?.photo || user?.profilePicture ||
      user?.avatar || user?.image || '';
  }

  getOriginal(post: any) {
    const original = post.sharedPost?.post || post.sharedPost ||
      post.originalPost?.post || post.originalPost ||
      post.sharedFrom?.post || post.sharedFrom || post.repostOf;

    return original && typeof original === 'object' ? original : null;
  }

  loadProfile() {
    this.loading = true;
    this.errorMessage = '';

    forkJoin({
      profile: this.http.get<any>(`${this.api}/users/profile-data`, {headers: this.headers}),
      posts: this.http.get<any>(`${this.api}/posts/feed?only=me`, {headers: this.headers}),
      saved: this.http.get<any>(`${this.api}/users/bookmarks`, {headers: this.headers})
    }).subscribe({
      next: res => {
        this.user = res.profile.data?.user || res.profile.data;

        const postsData = res.posts.data;
        const savedData = res.saved.data;

        const postList = Array.isArray(postsData) ? postsData : postsData?.posts || [];
        const savedList = Array.isArray(savedData) ? savedData : savedData?.bookmarks || [];

        this.myPosts = postList.map((item: any) => item.post || item);
        this.savedPosts = savedList.map((item: any) => item.post || item);

        this.loading = false;
        this.cd.markForCheck();
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Could not load profile';
        this.cd.markForCheck();
      }
    });
  }

  changeTab(tab: string) {
    this.activeTab = tab;
  }
}

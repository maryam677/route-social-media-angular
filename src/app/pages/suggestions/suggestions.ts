
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { Navbar } from '../../components/navbar/navbar';

@Component({
  selector: 'app-suggestions',
  imports: [FormsModule, RouterLink, Navbar],
  templateUrl: './suggestions.html',
  styleUrl: './suggestions.css'
})
export class Suggestions implements OnInit {
  api = 'https://route-posts.routemisr.com';
  user: any = null;
  friends: any[] = [];
  searchText = '';
  loading = false;
  errorMessage = '';
  followingId = '';
  followingIds = new Set<string>();
  page = 1;
  limit = 20;
  hasMore = true;

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
    this.getFriends();
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

  userImage(user: any) {
    return user?.photo || user?.profilePicture || user?.avatar || user?.image || '';
  }

  getFriends() {
    if (this.loading || !this.hasMore) return;
    this.loading = true;
    this.errorMessage = '';

    this.http.get<any>(`${this.api}/users/suggestions?page=${this.page}&limit=${this.limit}`, {
      headers: this.headers
    }).subscribe({
      next: res => {
        const data = res.data;
        const list = Array.isArray(data) ? data : data?.suggestions || data?.users || data?.results || [];

        const newFriends = list.map((item: any) => {
          const friend = item.user || item;
          return {
            ...friend,
            followersCount: friend.followersCount ?? item.followersCount ??
              friend.followers?.length ?? item.followers?.length ?? null
          };
        });

        this.friends = [
          ...this.friends,
          ...newFriends.filter((friend: any) =>
            !this.friends.some(old => (old._id || old.id) === (friend._id || friend.id))
          )
        ];

        const pagination = res.meta?.pagination;
        if (typeof pagination?.hasNextPage === 'boolean') {
          this.hasMore = pagination.hasNextPage;
        } else if (typeof pagination?.numberOfPages === 'number') {
          this.hasMore = this.page < pagination.numberOfPages;
        } else {
          this.hasMore = newFriends.length === this.limit;
        }

        this.loading = false;
        this.cd.markForCheck();
      },
      error: err => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Could not load suggestions';
        this.cd.markForCheck();
      }
    });
  }

  get filteredFriends() {
    const search = this.searchText.toLowerCase();
    return this.friends.filter(friend =>
      (friend.name || '').toLowerCase().includes(search) ||
      (friend.username || '').toLowerCase().includes(search)
    );
  }

  viewMore() {
    if (this.loading || !this.hasMore) return;
    this.page++;
    this.getFriends();
  }

  followFriend(friend: any) {
    const id = friend._id || friend.id;
    if (!id || this.followingId) return;
    this.followingId = id;
    this.errorMessage = '';

    this.http.put<any>(`${this.api}/users/${id}/follow`, {}, {headers: this.headers})
      .pipe(finalize(() => {
        this.followingId = '';
        this.cd.markForCheck();
      }))
      .subscribe({
        next: res => {
          if (res.success === false) {
            this.errorMessage = res.message || 'Could not update follow';
            return;
          }

          const status = res.data?.isFollowing ?? res.data?.following;
          const followed = typeof status === 'boolean' ? status : !this.followingIds.has(id);

          if (followed) this.followingIds.add(id);
          else this.followingIds.delete(id);

          this.cd.markForCheck();
        },
        error: err => {
          this.errorMessage = err.error?.message || 'Could not update follow';
          this.cd.markForCheck();
        }
      });
  }
}

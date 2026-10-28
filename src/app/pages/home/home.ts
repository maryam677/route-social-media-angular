
import { Component, OnInit, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { finalize, timeout } from 'rxjs';

@Component({
  selector: 'app-home',
  imports: [FormsModule, DatePipe, RouterLink, Navbar],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {
  api = 'https://route-posts.routemisr.com';
  activeTab = 'Feed';
  tabs = [
    {name: 'Feed', icon: 'fa-regular fa-newspaper'},
    {name: 'My Posts', icon: 'fa-solid fa-wand-magic-sparkles'},
    {name: 'Community', icon: 'fa-solid fa-globe'},
    {name: 'Saved', icon: 'fa-regular fa-bookmark'}
  ];

  currentUser: any = null;
  posts: any[] = [];
  loading = false;
  errorMessage = '';
  requestNumber = 0;

  postText = '';
  selectedImage: File | null = null;
  posting = false;
  postError = '';
  emojiOpen = false;
  emojiLoading = false;
  emojiError = '';
  privacyMenu = false;

  friends: any[] = [];
  friendsLoading = false;
  friendsError = '';
  searchText = '';
  followingId = '';
  followingIds = new Set<string>();

  savedIds = new Set<string>();
  likedIds = new Set<string>();
  likeCounts: Record<string, number> = {};
  busyId = '';
  openMenu = '';
  editingId = '';
  editText = '';

  comments: Record<string, any[]> = {};
  commentTexts: Record<string, string> = {};
  commentsOpen: Record<string, boolean> = {};
  commentsLoading: Record<string, boolean> = {};
  commentPosting: Record<string, boolean> = {};
  commentErrors: Record<string, string> = {};

  sharePostData: any = null;
  shareText = '';
  sharing = false;
  shareError = '';

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
    this.getPosts();
    this.getSavedIds();
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
        this.currentUser = res.data?.user || res.data;
        this.cd.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load profile';
        this.cd.markForCheck();
      }
    });
  }

  userImage(user: any) {
    return user?.photo || user?.profilePicture || user?.avatar || user?.image || '';
  }

  getFriends() {
    this.friendsLoading = true;
    this.friendsError = '';
    this.http.get<any>(`${this.api}/users/suggestions?page=1&limit=5`, {headers: this.headers}).subscribe({
      next: res => {
        const data = res.data;
        const list = Array.isArray(data) ? data : data?.users || data?.suggestions || data?.results || [];
        this.friends = list.map((item: any) => {
          const user = item.user || item;
          return {
            ...user,
            followersCount: user.followersCount ?? item.followersCount ??
              user.followers?.length ?? item.followers?.length ?? null
          };
        });
        this.friendsLoading = false;
        this.cd.markForCheck();
      },
      error: err => {
        this.friendsLoading = false;
        this.friendsError = err.error?.message || 'Could not load friends';
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

  followFriend(friend: any) {
    const id = friend._id || friend.id;
    if (!id || this.followingId) return;
    this.followingId = id;
    this.friendsError = '';

    this.http.put<any>(`${this.api}/users/${id}/follow`, {}, {headers: this.headers})
      .pipe(finalize(() => {
        this.followingId = '';
        this.cd.markForCheck();
      }))
      .subscribe({
        next: res => {
          if (res.success === false) {
            this.friendsError = res.message || 'Could not update follow';
            return;
          }
          const status = res.data?.isFollowing ?? res.data?.following;
          const followed = typeof status === 'boolean' ? status : !this.followingIds.has(id);
          if (followed) this.followingIds.add(id);
          else this.followingIds.delete(id);
          this.cd.markForCheck();
        },
        error: err => {
          this.friendsError = err.error?.message || 'Could not update follow';
          this.cd.markForCheck();
        }
      });
  }

  isMyPost(post: any) {
    const myId = this.currentUser?._id || this.currentUser?.id;
    const userId = typeof post.user === 'string'
      ? post.user : post.user?._id || post.user?.id;
    return !!myId && myId === userId;
  }

  changeTab(tab: string) {
    if (tab === this.activeTab) return;
    this.activeTab = tab;
    this.openMenu = '';
    this.editingId = '';
    this.commentsOpen = {};
    this.emojiOpen = false;
    this.getPosts();
  }

  getPosts() {
    const urls: Record<string, string> = {
      'Feed': `${this.api}/posts/feed`,
      'My Posts': `${this.api}/posts/feed?only=me`,
      'Community': `${this.api}/posts/feed?only=all`,
      'Saved': `${this.api}/users/bookmarks`
    };

    const request = ++this.requestNumber;
    this.loading = true;
    this.errorMessage = '';

    this.http.get<any>(urls[this.activeTab], {headers: this.headers}).subscribe({
      next: res => {
        if (request !== this.requestNumber) return;
        const data = res.data;
        const list = Array.isArray(data) ? data : data?.posts || data?.bookmarks || [];
        this.posts = list.map((item: any) => item.post || item);
        this.posts.forEach(post => {
          if (typeof post.likesCount === 'number') this.likeCounts[post._id] = post.likesCount;
          if (typeof post.isLiked === 'boolean') {
            if (post.isLiked) this.likedIds.add(post._id);
            else this.likedIds.delete(post._id);
          }
        });
        this.loading = false;
        this.cd.markForCheck();
      },
      error: err => {
        if (request !== this.requestNumber) return;
        this.loading = false;
        this.posts = [];
        this.errorMessage = err.error?.message || 'Could not load posts';
        this.cd.markForCheck();
      }
    });
  }

  originalPost(post: any) {
    const original = post.sharedPost?.post || post.sharedPost ||
      post.originalPost?.post || post.originalPost ||
      post.sharedFrom?.post || post.sharedFrom ||
      post.repostOf || post.shared?.originalPost || null;
    return original && typeof original === 'object' ? original : null;
  }

  getSavedIds() {
    this.http.get<any>(`${this.api}/users/bookmarks`, {headers: this.headers}).subscribe({
      next: res => {
        const data = res.data;
        const list = Array.isArray(data) ? data : data?.bookmarks || [];
        this.savedIds = new Set(list.map((item: any) => item.post?._id || item._id).filter(Boolean));
        this.cd.markForCheck();
      }
    });
  }

  isSaved(post: any) {
    return this.savedIds.has(post._id);
  }

  savePost(post: any) {
    if (this.busyId) return;
    this.busyId = post._id;
    this.openMenu = '';

    this.http.put<any>(`${this.api}/posts/${post._id}/bookmark`, {}, {headers: this.headers})
      .pipe(finalize(() => {
        this.busyId = '';
        this.cd.markForCheck();
      }))
      .subscribe({
        next: res => {
          if (res.success === false) {
            this.errorMessage = res.message || 'Could not save post';
            return;
          }
          this.getSavedIds();
          if (this.activeTab === 'Saved') this.getPosts();
        },
        error: err => {
          this.errorMessage = err.error?.message || 'Could not save post';
          this.cd.markForCheck();
        }
      });
  }

  chooseImage(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedImage = input.files?.[0] || null;
  }

  toggleEmoji() {
    if (this.emojiOpen) {
      this.emojiOpen = false;
      return;
    }
    if (this.emojiLoading) return;
    this.emojiLoading = true;
    this.emojiError = '';

    import('emoji-picker-element').then(() => {
      this.emojiLoading = false;
      this.emojiOpen = true;
      this.cd.markForCheck();
    }).catch(() => {
      this.emojiLoading = false;
      this.emojiError = 'Could not load emojis';
      this.cd.markForCheck();
    });
  }

  addEmoji(event: Event) {
    const emoji = (event as CustomEvent<{unicode: string}>).detail?.unicode;
    if (emoji) this.postText += emoji;
    this.cd.markForCheck();
  }

  createPost() {
    if ((!this.postText.trim() && !this.selectedImage) || this.posting) return;
    const data = new FormData();
    if (this.postText.trim()) data.append('body', this.postText.trim());
    if (this.selectedImage) data.append('image', this.selectedImage);

    this.posting = true;
    this.postError = '';
    this.emojiOpen = false;

    this.http.post<any>(`${this.api}/posts`, data, {headers: this.headers})
      .pipe(timeout(15000), finalize(() => {
        this.posting = false;
        this.cd.markForCheck();
      }))
      .subscribe({
        next: res => {
          if (res.success === false) {
            this.postError = res.message || 'Could not publish post';
          } else {
            this.postText = '';
            this.selectedImage = null;
            this.getPosts();
          }
          this.cd.markForCheck();
        },
        error: err => {
          this.postError = err.error?.message || 'Could not publish post';
          this.cd.markForCheck();
        }
      });
  }

  toggleMenu(id: string) {
    this.openMenu = this.openMenu === id ? '' : id;
  }

  startEdit(post: any) {
    if (!this.isMyPost(post)) return;
    this.editingId = post._id;
    this.editText = post.body || '';
    this.openMenu = '';
  }

  cancelEdit() {
    this.editingId = '';
    this.editText = '';
  }

  updatePost(post: any) {
    if (!this.isMyPost(post) || !this.editText.trim() || this.busyId) return;
    this.busyId = post._id;
    const data = new FormData();
    data.append('body', this.editText.trim());

    this.http.put<any>(`${this.api}/posts/${post._id}`, data, {headers: this.headers})
      .pipe(finalize(() => {
        this.busyId = '';
        this.cd.markForCheck();
      }))
      .subscribe({
        next: res => {
          if (res.success === false) {
            this.errorMessage = res.message || 'Could not update post';
          } else {
            this.cancelEdit();
            this.getPosts();
          }
          this.cd.markForCheck();
        },
        error: err => {
          this.errorMessage = err.error?.message || 'Could not update post';
          this.cd.markForCheck();
        }
      });
  }

  deletePost(post: any) {
    if (!this.isMyPost(post) || this.busyId) return;
    this.openMenu = '';
    if (!confirm('Are you sure you want to delete this post?')) return;
    this.busyId = post._id;

    this.http.delete<any>(`${this.api}/posts/${post._id}`, {headers: this.headers})
      .pipe(finalize(() => {
        this.busyId = '';
        this.cd.markForCheck();
      }))
      .subscribe({
        next: res => {
          if (res.success === false) {
            this.errorMessage = res.message || 'Could not delete post';
          } else {
            this.posts = this.posts.filter(p => p._id !== post._id);
            this.getSavedIds();
          }
          this.cd.markForCheck();
        },
        error: err => {
          this.errorMessage = err.error?.message || 'Could not delete post';
          this.cd.markForCheck();
        }
      });
  }

  isLiked(post: any) {
    return this.likedIds.has(post._id);
  }

  likePost(post: any) {
    if (this.busyId) return;
    this.busyId = post._id;

    this.http.put<any>(`${this.api}/posts/${post._id}/like`, {}, {headers: this.headers})
      .pipe(finalize(() => {
        this.busyId = '';
        this.cd.markForCheck();
      }))
      .subscribe({
        next: res => {
          if (res.success === false) {
            this.errorMessage = res.message || 'Could not like post';
            return;
          }
          if (res.data?.liked === true) this.likedIds.add(post._id);
          if (res.data?.liked === false) this.likedIds.delete(post._id);
          if (typeof res.data?.likesCount === 'number') this.likeCounts[post._id] = res.data.likesCount;
          this.cd.markForCheck();
        },
        error: err => {
          this.errorMessage = err.error?.message || 'Could not like post';
          this.cd.markForCheck();
        }
      });
  }

  toggleComments(post: any) {
    const id = post._id;
    this.commentsOpen[id] = !this.commentsOpen[id];
    if (this.commentsOpen[id]) this.getComments(id);
  }

  getComments(id: string) {
    this.commentsLoading[id] = true;
    this.commentErrors[id] = '';

    this.http.get<any>(`${this.api}/posts/${id}/comments`, {headers: this.headers}).subscribe({
      next: res => {
        const data = res.data;
        this.comments[id] = Array.isArray(data) ? data : data?.comments || [];
        this.commentsLoading[id] = false;
        this.cd.markForCheck();
      },
      error: err => {
        this.commentsLoading[id] = false;
        this.commentErrors[id] = err.error?.message || 'Could not load comments';
        this.cd.markForCheck();
      }
    });
  }

  addComment(post: any) {
    const id = post._id;
    const text = this.commentTexts[id]?.trim();
    if (!text || this.commentPosting[id]) return;
    const data = new FormData();
    data.append('content', text);

    this.commentPosting[id] = true;
    this.commentErrors[id] = '';

    this.http.post<any>(`${this.api}/posts/${id}/comments`, data, {headers: this.headers})
      .pipe(finalize(() => {
        this.commentPosting[id] = false;
        this.cd.markForCheck();
      }))
      .subscribe({
        next: res => {
          if (res.success === false) {
            this.commentErrors[id] = res.message || 'Could not add comment';
          } else {
            this.commentTexts[id] = '';
            this.getComments(id);
          }
          this.cd.markForCheck();
        },
        error: err => {
          this.commentErrors[id] = err.error?.message || 'Could not add comment';
          this.cd.markForCheck();
        }
      });
  }

  openShare(post: any) {
    this.sharePostData = post;
    this.shareText = '';
    this.shareError = '';
    this.emojiOpen = false;
  }

  closeShare() {
    if (this.sharing) return;
    this.sharePostData = null;
    this.shareText = '';
    this.shareError = '';
  }

  shareNow() {
    if (!this.sharePostData || this.sharing) return;
    const id = this.sharePostData._id;
    const data = this.shareText.trim() ? {body: this.shareText.trim()} : {};

    this.sharing = true;
    this.shareError = '';

    this.http.post<any>(`${this.api}/posts/${id}/share`, data, {headers: this.headers})
      .pipe(timeout(15000), finalize(() => {
        this.sharing = false;
        this.cd.markForCheck();
      }))
      .subscribe({
        next: res => {
          if (res.success === false) {
            this.shareError = res.message || 'Could not share post';
            return;
          }
          this.sharePostData = null;
          this.shareText = '';
          this.activeTab = 'Feed';
          this.getPosts();
          this.cd.markForCheck();
        },
        error: err => {
          this.shareError = err.error?.message || 'Could not share post';
          this.cd.markForCheck();
        }
      });
  }
}


import { Component, Input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  @Input() user: any = null;
  @Input() activePage = '';
  accountMenu = false;

  constructor(private router: Router) {}

  userImage() {
    return this.user?.photo || this.user?.profilePicture || this.user?.avatar || this.user?.image || '';
  }

  logout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}

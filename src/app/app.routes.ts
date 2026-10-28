
import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Register } from './pages/register/register';
import { Home } from './pages/home/home';
import { Profile } from './pages/profile/profile';
import { Notifications } from './pages/notifications/notifications';
import { Suggestions } from './pages/suggestions/suggestions';
import { UserProfile } from './pages/user-profile/user-profile';
import { Settings } from './pages/settings/settings';

export const routes: Routes = [
  {path: '', redirectTo: 'login', pathMatch: 'full'},
  {path: 'login', component: Login},
  {path: 'register', component: Register},
  {path: 'home', component: Home},
  {path: 'profile', component: Profile},
  {path: 'profile/:id', component: UserProfile},
  {path: 'notifications', component: Notifications},
  {path: 'suggestions', component: Suggestions},
  {path: 'settings', component: Settings},
  {path: '**', redirectTo: 'login'}
];

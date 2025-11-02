import { Routes } from '@angular/router';
import { About } from '../pages/about/about';
import { PageNotFound } from '../pages/page-not-found/page-not-found';
import { Home } from '../pages/home/home';
import { New } from '../pages/new/new';
import { Stories } from '../pages/stories/stories';
import { Open } from '../pages/stories/open/open';
import { Read } from '../pages/read/read';
import { BackButtonGuard } from '../core/back-button-guard';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'about', component: About },
    { path: 'new', component: New },
    { path: 'stories', component: Open },
    { path: 'read', component: Read },
    { path: 'stories/:id', component: Stories, canDeactivate: [BackButtonGuard] },
    { path: '**', component: PageNotFound }
];

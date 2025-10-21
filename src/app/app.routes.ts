import { Routes } from '@angular/router';
import { About } from '../pages/about/about';
import { PageNotFound } from '../pages/page-not-found/page-not-found';
import { Home } from '../pages/home/home';
import { New } from '../pages/stories/new/new';
import { Stories } from '../pages/stories/stories';
import { Open } from '../pages/stories/open/open';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'about', component: About },
    { path: 'stories/new', component: New },
    { path: 'stories', component: Open },
    { path: 'stories/:id', component: Stories },
    { path: '**', component: PageNotFound }
];

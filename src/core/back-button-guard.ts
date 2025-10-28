import { Injectable } from '@angular/core';
import { CanDeactivate } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class BackButtonGuard implements CanDeactivate<any> {
  canDeactivate(component: any): boolean {
    return component.canDeactivate ? component.canDeactivate() : true;
  }
}

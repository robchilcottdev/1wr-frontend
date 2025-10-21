import { Component, Input, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';

@Component({
  selector: 'app-actionbar',
  imports:  [RouterLink],
  templateUrl: './actionbar.html'
})

export class ActionBar {
}

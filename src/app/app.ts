import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from '../services/api-service';
import { SocketService } from '../services/socket-service';
import { GlobalModals } from "../global-modals/global-modals";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GlobalModals],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly apiService = inject(ApiService);
  protected readonly socketService = inject(SocketService);
}

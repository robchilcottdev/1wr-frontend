import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from '../services/api-service';
import { SocketService } from '../services/socket-service';
import { GlobalModals } from "../global-modals/global-modals";
import { Connecting } from "../components/connecting/connecting";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GlobalModals, Connecting],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly apiService = inject(ApiService);
  protected readonly socketService = inject(SocketService);

  killConnection(){
    this.socketService.socket.close();
  }
}

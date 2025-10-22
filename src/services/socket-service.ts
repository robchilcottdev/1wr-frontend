import { Injectable } from '@angular/core';
import { SocketMessageType } from '../types';
import { environment } from '../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class SocketService {
  public readonly socket = new WebSocket(environment.webSocketUrl);

  constructor() {    
    // These are for more "global" socket messages - game-specific ones are in stories.ts
    this.socket.addEventListener("error", (event: any) => { alert("Unable to connect to WebSocket server")});

    this.socket.addEventListener("message", (event: any) => {
      const message = JSON.parse(event.data);
      switch (message.type) {
        case SocketMessageType.UserConnected:
          console.log('SocketService: User connected with ID', message.id);
          localStorage.setItem('1wr-id', message.id);          
          break;
        default:
          break;
      }  
    });
  }
}

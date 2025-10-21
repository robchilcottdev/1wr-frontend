import { Injectable } from '@angular/core';
import { SocketMessageType } from '../types';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
//  public socket: WebSocket = new WebSocket("ws://localhost:3000");
public socket: WebSocket = new WebSocket("wss://1wr-fhacb5a7cvdzfcgz.ukwest-01.azurewebsites.net");

  constructor() {
    // These are for more "global" socket messages - game-specific ones are in stories.ts
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

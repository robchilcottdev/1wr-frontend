import { Injectable, signal, inject } from '@angular/core';
import { LocalStorage, SocketMessageType } from '../types';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  public socket!: WebSocket;
  public isConnected = signal<boolean>(false);

  private readonly maxReconnectAttempts: number = 10;
  private readonly pollingInterval: number = 3000;
  private reconnectIntervalId?: number;

  constructor() {    
    this.connect();
  }

  private connect() {
    this.socket = new WebSocket(environment.webSocketUrl);
    
    this.socket.onopen = (data: any) => {
      this.isConnected.set(true);

      if (this.reconnectIntervalId) {
        clearInterval(this.reconnectIntervalId);
        this.reconnectIntervalId = undefined;
      }
    };

    this.socket.onclose = () => {
      console.log("WebSocket connection closed");
      this.isConnected.set(false);
      localStorage.removeItem(LocalStorage.UserId);
      this.attemptReconnect();
    };

    this.socket.onerror = () => {
      this.isConnected.set(false);
    };

    this.socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === SocketMessageType.UserConnected) {
        localStorage.setItem(LocalStorage.UserId, message.id);
        console.log(new Date() + ": WebSocket user connected with id " + message.id);
      }
    };
  }

  attemptReconnect() {
    if (this.reconnectIntervalId) return;

    let attempts = 0;
    this.reconnectIntervalId = setInterval(() => {
      console.log(`Attempting to reconnect: ${++attempts} of ${this.maxReconnectAttempts}`);
      this.connect();
      
      if (attempts >= this.maxReconnectAttempts) {
        clearInterval(this.reconnectIntervalId);
        this.reconnectIntervalId = undefined;
        console.error("Failed to reconnect");
      }
    }, this.pollingInterval) as any;
  }
}
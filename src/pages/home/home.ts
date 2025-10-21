import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TitleBlock } from '../../components/title-block/title-block';
import { ApiService } from '../../services/api-service';

@Component({
  selector: 'app-home',
  imports: [ RouterLink, TitleBlock ],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  protected apiService = inject(ApiService);

  resetAll(){
    this.apiService.resetAll().subscribe({
      next: (data) => {
        console.log("Data:", data);
        alert("All stories reset");
      },
      error: (err) => {
        alert("Error resetting stories: " + err);
      }
    });
  }
}

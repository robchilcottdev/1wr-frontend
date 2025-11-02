import { Component } from '@angular/core';
import { TitleBlock } from "../../components/title-block/title-block";
import { Dock } from '../../components/dock/dock';

@Component({
  selector: 'app-about',
  imports: [TitleBlock, Dock],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class About {

}

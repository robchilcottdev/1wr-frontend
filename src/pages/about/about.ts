import { Component } from '@angular/core';
import { TitleBlock } from "../../components/title-block/title-block";
import { ActionBar } from '../../components/actionbar/actionbar';

@Component({
  selector: 'app-about',
  imports: [TitleBlock, ActionBar],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class About {

}

import { Component } from '@angular/core';
import { TitleBlock } from "../../components/title-block/title-block";
import { ActionBar } from "../../components/actionbar/actionbar";

@Component({
  selector: 'app-page-not-found',
  imports: [TitleBlock, ActionBar],
  templateUrl: './page-not-found.html',
  styleUrl: './page-not-found.css'
})
export class PageNotFound {

}

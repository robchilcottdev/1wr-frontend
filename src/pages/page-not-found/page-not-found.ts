import { Component } from '@angular/core';
import { TitleBlock } from "../../components/title-block/title-block";
import { Dock } from "../../components/dock/dock";

@Component({
  selector: 'app-page-not-found',
  imports: [TitleBlock, Dock],
  templateUrl: './page-not-found.html',
  styleUrl: './page-not-found.css'
})
export class PageNotFound {

}
